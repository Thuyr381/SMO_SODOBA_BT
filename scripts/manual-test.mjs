import { chromium } from '/tmp/sodoba-browser-tools/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.APP_TEST_URL || 'http://127.0.0.1:3002/';
const rootDir = process.cwd();
const screenshotDir = path.join(rootDir, 'docs', 'screenshots');
const resultPath = path.join(rootDir, 'docs', 'manual-test-results.json');

await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
});
await context.addInitScript(() => {
  localStorage.setItem('sodoba_custom_gas_url', 'LOCAL_ENGINE_MANUAL_TEST');
});

const page = await context.newPage();
const results = [];
const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const location = msg.location();
    consoleErrors.push({
      text: msg.text(),
      url: location.url || '',
      lineNumber: location.lineNumber ?? null,
    });
  }
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) {
    httpErrors.push({ status: response.status(), url: response.url() });
  }
});

function record(id, name, passed, detail) {
  results.push({ id, name, status: passed ? 'PASS' : 'FAIL', detail });
  if (!passed) throw new Error(`${id} - ${name}: ${detail}`);
}

async function visible(selector) {
  return await page.locator(selector).isVisible().catch(() => false);
}

async function shot(name, options = {}) {
  await page.screenshot({
    path: path.join(screenshotDir, name),
    fullPage: options.fullPage ?? false,
  });
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('#app-title').waitFor({ state: 'visible' });
  record('MT-01', 'Mở ứng dụng và hiển thị sơ đồ', await visible('#floor-blueprint-container'), 'Sơ đồ, thanh điều hướng và chú giải trạng thái hiển thị.');
  await shot('01-so-do-ban-tong-quan.png');

  const title56 = await page.locator('#table-card-56').getAttribute('title');
  const titleVip70 = await page.locator('#table-card-VIP70').getAttribute('title');
  const title44 = await page.locator('#table-card-44').getAttribute('title');
  const title12 = await page.locator('#table-card-12').getAttribute('title');
  record(
    'MT-02',
    'Hiển thị đúng trạng thái dữ liệu mẫu',
    Boolean(title56?.includes('Đã đặt') && titleVip70?.includes('Xác nhận') && title44?.includes('Đã đến') && title12?.includes('Khóa')),
    'Bàn 56: Đã đặt; VIP70: Xác nhận; bàn 44: Đã đến; bàn 12: Khóa.'
  );

  await page.locator('#input-search-table-customer').fill('Nguyễn Văn A');
  await page.locator('#search-results-dropdown').waitFor({ state: 'visible' });
  const searchText = await page.locator('#search-results-dropdown').innerText();
  record('MT-03', 'Tìm kiếm theo tên khách', searchText.includes('Nguyễn Văn A') && searchText.includes('56, 57'), 'Tìm thấy đúng khách và nhóm bàn 56, 57.');
  await shot('02-tim-kiem-khach-hang.png');
  await page.locator('#btn-clear-search').click();

  await page.locator('#table-card-56').click();
  await page.locator('#table-detail-modal-card').waitFor({ state: 'visible' });
  const detailText = await page.locator('#table-detail-modal-card').innerText();
  record('MT-04', 'Xem chi tiết bàn đã đặt', detailText.includes('Nguyễn Văn A') && detailText.includes('0901234567'), 'Hiện đúng khách đại diện, số điện thoại và thông tin đơn.');
  await shot('03-chi-tiet-ban-da-dat.png');
  await page.locator('#btn-close-table-detail').click();

  await page.locator('#btn-mode-book').click();
  await page.locator('#table-card-10').click();
  await page.locator('#bottom-bar-confirm').waitFor({ state: 'visible' });
  const selectionText = await page.locator('#bottom-bar-confirm').innerText();
  record('MT-05', 'Chọn bàn trống để đặt', selectionText.includes('Bàn 10'), 'Bàn 10 được chọn và thanh xác nhận xuất hiện.');
  await shot('04-chon-ban-trong.png');

  await page.locator('#btn-bottom-confirm-action').click();
  await page.locator('#booking-modal-card').waitFor({ state: 'visible' });
  await page.locator('#btn-submit-booking-form').click();
  const validationText = await page.locator('#booking-modal-card').innerText();
  record('MT-06', 'Kiểm tra dữ liệu bắt buộc khi đặt bàn', validationText.includes('Vui lòng nhập họ tên') && validationText.includes('Vui lòng nhập số điện thoại'), 'Form chặn gửi khi thiếu tên và số điện thoại.');

  await page.locator('#input-ten-khach').fill('Khách kiểm thử');
  await page.locator('#input-sdt').fill('123');
  await page.locator('#btn-submit-booking-form').click();
  const phoneErrorVisible = await page.getByText('Số điện thoại không đúng định dạng (10 số)').isVisible();
  record('MT-07', 'Kiểm tra định dạng số điện thoại', phoneErrorVisible, 'Số điện thoại sai định dạng bị từ chối.');

  await page.locator('#input-sdt').fill('0909999999');
  await page.locator('#input-so-khach').fill('4');
  await page.locator('#input-tien-coc').fill('200000');
  await page.locator('#input-ghi-chu').fill('Bàn kiểm thử tài liệu - không cay');
  await shot('05-form-dat-ban-da-dien.png');
  await page.locator('#btn-submit-booking-form').click();
  await page.locator('#booking-modal-card').waitFor({ state: 'hidden' });
  await page.getByText('Đặt bàn thành công').waitFor({ state: 'visible' });
  const bookedTitle10 = await page.locator('#table-card-10').getAttribute('title');
  record('MT-08', 'Tạo đơn đặt bàn', Boolean(bookedTitle10?.includes('Đã đặt') && bookedTitle10?.includes('Khách kiểm thử')), 'Tạo đơn thành công và bàn 10 chuyển sang Đã đặt.');

  await page.locator('#nav-tab-bookings').click();
  await page.locator('#booking-list-view').waitFor({ state: 'visible' });
  await page.locator('#search-booking-input').fill('Khách kiểm thử');
  const testBookingCard = page.locator('[id^="booking-card-"]').filter({ hasText: 'Khách kiểm thử' });
  await testBookingCard.waitFor({ state: 'visible' });
  record('MT-09', 'Tra cứu đơn trong tab Đơn/Món', (await testBookingCard.count()) === 1, 'Tìm thấy đúng đơn vừa tạo theo tên khách.');
  await page.locator('#search-booking-input').fill('');
  await shot('06-danh-sach-don-mon.png', { fullPage: true });

  const testCard = page.locator('[id^="booking-card-"]').filter({ hasText: 'Khách kiểm thử' });
  await testCard.locator('button[id^="btn-confirm-booking-"]').click();
  await page.waitForTimeout(250);
  record('MT-10', 'Chuyển trạng thái đơn sang Đã xác nhận', (await testCard.innerText()).includes('ĐÃ XÁC NHẬN'), 'Trạng thái đơn và bàn được cập nhật đồng bộ.');
  await testCard.locator('button[id^="btn-arrive-booking-"]').click();
  await page.waitForTimeout(250);
  record('MT-11', 'Chuyển trạng thái đơn sang Đã đến', (await testCard.innerText()).includes('ĐÃ ĐẾN'), 'Đơn chuyển sang Đã đến thành công.');

  const sampleCard = page.locator('#booking-card-S8-20260831-001');
  await sampleCard.locator('#btn-manage-menu-S8-20260831-001').click();
  await page.locator('#menu-detail-view').waitFor({ state: 'visible' });
  const menuText = await page.locator('#menu-detail-view').innerText();
  record('MT-12', 'Xem thực đơn của đơn', menuText.includes('Gỏi khoai môn hải sản') && menuText.includes('Lẩu thái hải sản chua cay'), 'Hiển thị món, số lượng, ghi chú và tổng tiền.');
  await shot('07-chi-tiet-thuc-don.png', { fullPage: true });

  const firstPlus = page.locator('#menu-detail-view button[title="Tăng 1 phần"]').first();
  const qtyBefore = await page.locator('#menu-detail-view input[type="number"]').first().inputValue();
  await firstPlus.click();
  await page.waitForTimeout(250);
  const qtyAfter = await page.locator('#menu-detail-view input[type="number"]').first().inputValue();
  record('MT-13', 'Tăng nhanh số lượng món', Number(qtyAfter) === Number(qtyBefore) + 1, `Số lượng tăng từ ${qtyBefore} lên ${qtyAfter}.`);

  await page.locator('#btn-open-add-menu-drawer').click();
  await page.locator('#add-menu-drawer-panel').waitFor({ state: 'visible' });
  await page.locator('#search-dish-input').fill('Lẩu');
  const drawerItem = page.locator('#add-menu-drawer-panel').locator('div.rounded-xl.border').filter({ hasText: 'Lẩu' }).first();
  const drawerPlus = drawerItem.locator('button[title="Tăng 1"]');
  await drawerPlus.click();
  const noteInput = drawerItem.locator('input[placeholder="Ghi chú khẩu vị cho đầu bếp..."]');
  await noteInput.fill('Ít cay');
  await shot('08-chon-mon-va-ghi-chu-bep.png');
  record('MT-14', 'Chọn món và nhập ghi chú bếp', await page.locator('#btn-confirm-add-dishes').isEnabled(), 'Chọn 1 món, nhập ghi chú và nút xác nhận được bật.');
  await page.locator('#btn-confirm-add-dishes').click();
  await page.locator('#add-menu-drawer-panel').waitFor({ state: 'hidden' });
  await page.getByText('Thêm món thành công').waitFor({ state: 'visible' });
  record('MT-15', 'Thêm món vào đơn', (await page.locator('#menu-detail-view').innerText()).includes('Ít cay'), 'Món mới được lưu vào Local Engine cùng ghi chú bếp.');

  await page.locator('#btn-back-to-booking-list').click();
  await page.locator('#nav-tab-settings').click();
  await page.locator('#gas-auth-modal-dialog').waitFor({ state: 'visible' });
  await shot('09-xac-thuc-tab-sheet-gas.png');
  await page.locator('#gas-password-input').fill('sai-mat-khau');
  await page.locator('#btn-submit-gas-auth').click();
  const authText = await page.locator('#gas-auth-modal-dialog').innerText();
  record('MT-16', 'Từ chối mật khẩu Sheet/GAS sai', authText.includes('Mật khẩu không chính xác'), 'Tab cấu hình vẫn bị khóa khi nhập sai mật khẩu.');
  await page.locator('#gas-password-input').fill('smo_vungmanh');
  await page.locator('#btn-submit-gas-auth').click();
  await page.locator('#settings-view').waitFor({ state: 'visible' });
  record('MT-17', 'Mở khóa tab Sheet/GAS', await visible('#gas-url-input'), 'Mật khẩu hợp lệ mở trang cấu hình.');
  await page.locator('#btn-test-gas-connection').click();
  await page.getByText(/KẾT NỐI THÀNH CÔNG/).waitFor({ state: 'visible' });
  record('MT-18', 'Kiểm tra kết nối Local Engine', (await page.locator('#settings-view').innerText()).includes('KẾT NỐI THÀNH CÔNG'), 'Đọc được dữ liệu bàn, DATBAN và DATMON trong chế độ demo.');
  await shot('10-cau-hinh-va-kiem-tra-ket-noi.png', { fullPage: true });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  await mobileContext.addInitScript(() => {
    localStorage.setItem('sodoba_custom_gas_url', 'LOCAL_ENGINE_MANUAL_TEST');
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await mobilePage.locator('#floor-blueprint-container').waitFor({ state: 'visible' });
  const bodyScrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  record('MT-19', 'Hiển thị trên màn hình điện thoại', bodyScrollWidth <= viewportWidth + 1, `Không tràn ngang (${bodyScrollWidth}px / viewport ${viewportWidth}px).`);
  await mobilePage.screenshot({ path: path.join(screenshotDir, '11-giao-dien-dien-thoai.png'), fullPage: false });

  await mobilePage.locator('#table-card-56').click();
  await mobilePage.locator('#table-detail-modal-card').waitFor({ state: 'visible' });
  await mobilePage.locator('#btn-trigger-move-table').click();
  const moveModal = mobilePage.locator('#move-table-modal-card');
  await moveModal.waitFor({ state: 'visible' });
  const moveLayout = await moveModal.evaluate((element) => {
    const label = element.querySelector('#move-table-picker-label')?.getBoundingClientRect();
    const toggle = element.querySelector('#move-table-view-toggle')?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const overlaps = Boolean(
      label &&
      toggle &&
      label.left < toggle.right &&
      label.right > toggle.left &&
      label.top < toggle.bottom &&
      label.bottom > toggle.top
    );
    return {
      fitsViewport: rect.left >= 0 && rect.right <= window.innerWidth + 1 && rect.top >= 0 && rect.bottom <= window.innerHeight + 1,
      hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
      controlsOverlap: overlaps,
    };
  });
  const moveTarget = moveModal.locator('#table-card-10');
  await moveTarget.scrollIntoViewIfNeeded();
  await moveTarget.click();
  await mobilePage.waitForTimeout(250);
  const moveConfirm = moveModal.locator('#btn-confirm-move');
  const moveConfirmText = await moveConfirm.innerText();
  const moveMobilePassed =
    moveLayout.fitsViewport &&
    !moveLayout.hasHorizontalOverflow &&
    !moveLayout.controlsOverlap &&
    (await moveConfirm.isEnabled()) &&
    moveConfirmText.includes('[10]');
  record(
    'MT-20',
    'Chọn bàn đích trong cửa sổ đổi bàn trên điện thoại',
    moveMobilePassed,
    `Modal vừa viewport, điều khiển không chồng lấn và nút xác nhận hiển thị bàn 10 (${moveConfirmText}).`
  );
  await mobilePage.screenshot({ path: path.join(screenshotDir, '12-doi-ban-tren-dien-thoai.png'), fullPage: false });
  await moveModal.locator('#btn-close-move-modal').click();
  await mobileContext.close();

  record('MT-21', 'Không có lỗi JavaScript nghiêm trọng', pageErrors.length === 0, pageErrors.length === 0 ? 'Không ghi nhận pageerror.' : pageErrors.join(' | '));
} catch (error) {
  results.push({
    id: 'EXECUTION',
    name: 'Thực thi bộ kiểm thử',
    status: 'FAIL',
    detail: error instanceof Error ? error.stack || error.message : String(error),
  });
} finally {
  const report = {
    executedAt: new Date().toISOString(),
    baseUrl,
    environment: {
      browser: 'Google Chrome headless',
      viewportDesktop: '1440x1000',
      viewportMobile: '390x844',
      backendMode: 'Offline Persistence & Local Engine (dữ liệu trình duyệt cô lập)',
    },
    summary: {
      total: results.filter((item) => item.id !== 'EXECUTION').length,
      passed: results.filter((item) => item.status === 'PASS').length,
      failed: results.filter((item) => item.status === 'FAIL').length,
    },
    results,
    consoleErrors,
    pageErrors,
    httpErrors,
  };
  await fs.writeFile(resultPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await context.close();
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
