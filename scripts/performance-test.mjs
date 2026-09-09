import { chromium } from '/tmp/sodoba-browser-tools/node_modules/playwright-core/index.mjs';

const baseUrl = process.env.APP_TEST_URL || 'http://127.0.0.1:3010/';
const gasUrl = 'https://script.google.com/macros/s/performance-test/exec';
const today = new Date().toISOString().slice(0, 10);
const requests = [];

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
});

await context.addInitScript((url) => {
  localStorage.clear();
  localStorage.setItem('sodoba_custom_gas_url', url);
}, gasUrl);

const page = await context.newPage();
await page.route('https://script.google.com/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const body = request.postDataJSON?.() || null;
  requests.push({ method: request.method(), action: url.searchParams.get('action') || body?.action || 'STATUS', body });

  if (request.method() === 'POST') {
    await new Promise((resolve) => setTimeout(resolve, body?.action === 'UPDATE_VIEWS' ? 40 : 100));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        body?.action === 'UPDATE_VIEWS'
          ? { status: 'success' }
          : { status: 'success', updatedCount: 1, views_deferred: body?.defer_views === true }
      ),
    });
    return;
  }

  if (url.searchParams.get('action') === 'GET_MENUS') {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: [] }),
    });
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'success',
      statusMap: { 1: 'booked' },
      bookings: [
        {
          id_dat: 'S8-PERF-001',
          ngay_dat: today,
          gio_dat: '18:00',
          ten_khach: 'Khách đo hiệu năng',
          sdt: '0901234567',
          so_khach: 4,
          tien_coc: 0,
          ghi_chu: '',
          danh_sach_ban: ['1'],
          nguoi_nhap: 'Kiểm thử',
          trang_thai: 'ĐÃ ĐẶT',
        },
      ],
    }),
  });
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.locator('#table-card-1').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#table-card-1')?.getAttribute('title')?.includes('Đã đặt'));

  const modalStart = performance.now();
  await page.locator('#table-card-1').click();
  await page.locator('#table-detail-modal-card').waitFor({ state: 'visible' });
  const modalOpenMs = Math.round(performance.now() - modalStart);
  await page.locator('#btn-close-table-detail').click();

  await page.locator('#btn-mode-confirm').click();
  await page.locator('#table-card-1').click();
  await page.locator('#btn-bottom-confirm-action').click();
  await page.waitForTimeout(500);

  const initialStatusGets = requests.filter((item) => item.method === 'GET' && item.action === 'STATUS').length;
  const redundantBookingGets = requests.filter((item) => item.action === 'GET_BOOKINGS').length;
  const mutationPosts = requests.filter((item) => item.method === 'POST' && item.action === 'UPDATE_STATUS');
  const viewPosts = requests.filter((item) => item.method === 'POST' && item.action === 'UPDATE_VIEWS');

  const assertions = {
    oneInitialCombinedGet: initialStatusGets === 1,
    noRedundantBookingGet: redundantBookingGets === 0,
    detailModalDoesNotWaitForMenus: modalOpenMs < 300,
    oneMutationPost: mutationPosts.length === 1,
    mutationRequestsDeferredViews: mutationPosts[0]?.body?.defer_views === true,
    oneBackgroundViewRefresh: viewPosts.length === 1,
  };
  const passed = Object.values(assertions).every(Boolean);
  console.log(JSON.stringify({ passed, modalOpenMs, requests, assertions }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
