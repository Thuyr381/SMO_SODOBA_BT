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

function createContext() {
  const cacheStore = new Map();
  const propertyStore = new Map();
  const sheet = {
    getName: () => 'DATMON',
    getLastRow: () => datMonRows.length,
    getLastColumn: () => datMonRows[0].length,
    getDataRange: () => createRange(datMonRows, 1, 1, datMonRows.length, datMonRows[0].length),
    getRange: (row, column, rowCount = 1, columnCount = 1) =>
      createRange(datMonRows, row, column, rowCount, columnCount),
  };
  const spreadsheet = {
    getSheetByName: (name) => (name === 'DATMON' ? sheet : null),
    getSheets: () => [sheet],
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
  ],
}, null, 2));
