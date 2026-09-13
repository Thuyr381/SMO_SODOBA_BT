import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const codeFiles = [
  'google-apps-script/Code.gs',
  'public/Code.gs',
  'public/google-apps-script/Code.gs',
];

const datMonRows = [
  ['id_dat', 'chi_nhanh', 'ten_mon', 'so_luong', 'ghi_chu', 'ngay_dat', 'gio_dat', 'danh_sach_ban', 'so_khach', 'ten_khach', 'ten_ban', 'don_gia', 'thanh_tien', 'id_mon', 'trang_thai_mon'],
  ['S8-20260909-001', 'S8', 'Món A', 2, '', '09/09/2026', '18:00', 'B01', 4, 'Test A', 'B01', 100000, 200000, 'S8-20260909-001-M01', 'ACTIVE'],
  ['S8-20260910-001', 'S8', 'Món B', 1, '', '10/09/2026', '19:00', 'B02', 2, 'Test B', 'B02', 80000, 80000, 'S8-20260910-001-M01', 'ACTIVE'],
  ['S8-20260909-002', 'S8', 'Món C', 1, '', '', '20:00', 'B03', 3, 'Test C', 'B03', 90000, 90000, 'S8-20260909-002-M01', 'ACTIVE'],
  ['S8-20260909-003', 'S8', 'Món đã xóa', 1, '', '09/09/2026', '20:30', 'B04', 2, 'Test D', 'B04', 50000, 50000, 'S8-20260909-003-M01', 'ĐÃ XÓA'],
];

const datBanRows = [
  ['id_dat', 'ngay_dat', 'gio_dat', 'ten_khach', 'sdt', 'so_khach', 'danh_sach_ban', 'yeu_cau_ban', 'dat_mon_truoc', 'dat_coc', 'tien_coc', 'trang_thai', 'nguoi_nhap', 'thoi_gian_nhap', 'ghi_chu'],
  ['S8-20260909-001', '09/09/2026', '18:00', 'Khách A', '0901234567', 4, 'B01', '', 'Có', 'Chuyển khoản', 200000, 'ĐÃ ĐẶT', 'Admin', '09/09/2026 10:00:00', ''],
  ['S8-20260909-002', '09/09/2026', '19:30', 'Khách B', '0912345678', 2, 'B02, B03', '', 'Không', '', 0, 'ĐÃ XÁC NHẬN', 'Admin', '09/09/2026 11:00:00', ''],
];

const configBanRows = [
  ['id', 'ma_ban', 'ten_ban', 'khu_vuc', 'suc_chua', 'toa_do_x', 'toa_do_y', 'trang_thai_ban'],
  ['1', 'B10', 'Bàn 10', 'Khu A', 4, 10, 20, 'BLOCK'],
  ['2', 'B01', 'Bàn 01', 'Khu A', 4, 10, 40, 'ACTIVE'],
];

function createRange(rows, row, column, rowCount, columnCount) {
  const sliced = rows
    .slice(row - 1, row - 1 + rowCount)
    .map((sourceRow) => sourceRow.slice(column - 1, column - 1 + columnCount));
  return {
    getValues: () => sliced,
    getDisplayValues: () => sliced.map((sourceRow) => sourceRow.map((value) => String(value ?? ''))),
    clearContent: () => undefined,
    setValues: () => undefined,
  };
}

function createSheetMock(name, rows) {
  return {
    getName: () => name,
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getDataRange: () => createRange(rows, 1, 1, rows.length, rows[0].length),
    getRange: (row, column, rowCount = 1, columnCount = 1) =>
      createRange(rows, row, column, rowCount, columnCount),
  };
}

function createContext() {
  const cacheStore = new Map();
  const propertyStore = new Map();
  const datmonSheet = createSheetMock('DATMON', datMonRows);
  const datbanSheet = createSheetMock('DATBAN', datBanRows);
  const configSheet = createSheetMock('CONFIG_BAN', configBanRows);

  const sheetMap = {
    DATMON: datmonSheet,
    DATBAN: datbanSheet,
    CONFIG_BAN: configSheet,
  };

  const spreadsheet = {
    getSheetByName: (name) => sheetMap[name] ?? null,
    getSheets: () => Object.values(sheetMap),
  };
  const cache = {
    get: (key) => cacheStore.get(key) ?? null,
    put: (key, value) => cacheStore.set(key, value),
  };
  const properties = {
    getProperty: (key) => propertyStore.get(key) ?? null,
    setProperty: (key, value) => propertyStore.set(key, value),
  };

  const context = vm.createContext({
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    CacheService: { getScriptCache: () => cache },
    PropertiesService: { getScriptProperties: () => properties },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_algorithm, value) =>
        [...crypto.createHash('sha256').update(String(value), 'utf8').digest()].map((byte) =>
          byte > 127 ? byte - 256 : byte
        ),
      newBlob: (value) => ({ getBytes: () => [...Buffer.from(String(value), 'utf8')] }),
      formatDate: (date) => new Date(date).toISOString(),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        text,
        setMimeType() { return this; },
      }),
    },
  });

  return { context, spreadsheet, propertyStore };
}

for (const codeFile of codeFiles) {
  const source = await fs.readFile(codeFile, 'utf8');
  const { context, spreadsheet, propertyStore } = createContext();
  vm.runInContext(source, context, { filename: codeFile });

  context.putSodobaCachedJson('datmon', 'date:2026-09-09', [{ id_mon: 'cached' }], 15);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getSodobaCachedJson('datmon', 'date:2026-09-09', false))),
    [{ id_mon: 'cached' }],
    `${codeFile}: cache read/write`
  );
  assert.equal(context.getSodobaCachedJson('datmon', 'date:2026-09-09', true), null, `${codeFile}: force refresh`);

  const revisionBefore = propertyStore.get('SODOBA_DYNAMIC_CACHE_REVISION') ?? '0';
  context.invalidateSodobaDynamicCache();
  const revisionAfter = propertyStore.get('SODOBA_DYNAMIC_CACHE_REVISION');
  assert.notEqual(revisionAfter, revisionBefore, `${codeFile}: cache invalidation`);
  assert.equal(context.getSodobaCachedJson('datmon', 'date:2026-09-09', false), null, `${codeFile}: stale cache inaccessible`);

  const allMenus = context.getAllActiveMenusFromDatMon(spreadsheet, { date: 'ALL' });
  const menusForDate = context.getAllActiveMenusFromDatMon(spreadsheet, { date: '2026-09-09' });
  const menusForId = context.getAllActiveMenusFromDatMon(spreadsheet, { idDats: 'S8-20260910-001' });
  assert.equal(allMenus.length, 3, `${codeFile}: soft-deleted menu excluded`);
  assert.equal(menusForDate.length, 2, `${codeFile}: date filter with ID fallback`);
  assert.deepEqual(
    Array.from(menusForId, (item) => item.id_dat),
    ['S8-20260910-001'],
    `${codeFile}: booking ID filter`
  );

  const mutationResult = context.mutationJsonOutput(spreadsheet, { action: 'UPDATE_MENU', defer_views: true }, { status: 'success' });
  const parsedMutation = JSON.parse(mutationResult.text);
  assert.equal(parsedMutation.views_deferred, true, `${codeFile}: deferred VIEW response`);

  // Kiểm thử action TEST_CONNECTION siêu tốc
  const testConnOutput = context.doGet({ parameter: { action: 'TEST_CONNECTION', date: '09/09/2026' } });
  const parsedTestConn = JSON.parse(testConnOutput.text);
  assert.equal(parsedTestConn.status, 'success', `${codeFile}: test connection status`);
  assert.equal(parsedTestConn.counts.totalBookings, 2, `${codeFile}: bookings count`);
  assert.equal(parsedTestConn.counts.totalDatMon, 3, `${codeFile}: datMon count`);
  assert.equal(parsedTestConn.statusMap['10'], 'inactive', `${codeFile}: locked table status`);
  assert.equal(parsedTestConn.statusMap['1'], 'booked', `${codeFile}: booked table status`);
  assert.equal(parsedTestConn.statusMap['B01'], 'booked', `${codeFile}: booked table formatted key`);
}

console.log(JSON.stringify({
  passed: true,
  filesChecked: codeFiles.length,
  assertions: [
    'cache read/write',
    'force refresh bypass',
    'cache invalidation',
    'DATMON date filter',
    'DATMON booking filter',
    'soft-delete compatibility',
    'deferred VIEW response',
    'TEST_CONNECTION fast all-in-one check',
  ],
}, null, 2));
