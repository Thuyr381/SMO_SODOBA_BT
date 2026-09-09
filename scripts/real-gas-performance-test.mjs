import { chromium } from '/tmp/sodoba-browser-tools/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_TEST_URL || 'http://127.0.0.1:3010/';
const gasUrl = 'https://script.google.com/macros/s/AKfycbyG8nYCc2yh76JOxqySSVn6adi9KInPF8vE0ibxOQU704GIGgDa837mD8KI6nOSLRua/exec';
const resultPath = new URL('../docs/real-gas-performance-results.json', import.meta.url);
const apiRequests = [];
const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
});
await context.addInitScript(() => {
  if (!sessionStorage.getItem('sodoba_real_gas_test_started')) {
    localStorage.clear();
    sessionStorage.setItem('sodoba_real_gas_test_started', 'true');
  }
});

const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('request', (request) => {
  if (!request.url().startsWith(gasUrl)) return;
  const url = new URL(request.url());
  apiRequests.push({
    method: request.method(),
    action: url.searchParams.get('action') || 'STATUS_AND_BOOKINGS',
    date: url.searchParams.get('date'),
  });
});

function rootRequest(request) {
  let root = request;
  while (root.redirectedFrom()) root = root.redirectedFrom();
  return root;
}

function isFinalGasResponse(response, expectedAction) {
  if (response.status() !== 200) return false;
  const root = rootRequest(response.request());
  if (!root.url().startsWith(gasUrl)) return false;
  const rootUrl = new URL(root.url());
  const action = rootUrl.searchParams.get('action') || 'STATUS_AND_BOOKINGS';
  return action === expectedAction;
}

async function findOccupiedTableId() {
  const cards = page.locator('button[id^="table-card-"]');
  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const title = (await cards.nth(index).getAttribute('title')) || '';
    if (title.includes('Khách:')) {
      return (await cards.nth(index).getAttribute('id')).replace('table-card-', '');
    }
  }
  return null;
}

const result = {
  executedAt: new Date().toISOString(),
  mode: 'Real GAS, read-only UI flow',
  endpointConfigured: true,
  measurements: {},
  requestSummary: {},
  consoleErrors,
  pageErrors,
};

try {
  const initialStart = performance.now();
  const initialResponsePromise = page.waitForResponse((response) =>
    isFinalGasResponse(response, 'STATUS_AND_BOOKINGS')
  );
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await initialResponsePromise;
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button[id^="table-card-"]')].some((element) =>
      element.getAttribute('title')?.includes('Khách:')
    )
  );
  result.measurements.initialDataReadyMs = Math.round(performance.now() - initialStart);

  const occupiedTableId = await findOccupiedTableId();
  if (!occupiedTableId) throw new Error('Không tìm thấy bàn đang có khách để đo modal chi tiết.');

  const menuResponsePromise = page.waitForResponse(
    (response) => isFinalGasResponse(response, 'GET_MENUS'),
    { timeout: 30_000 }
  );
  const modalStart = performance.now();
  await page.locator(`#table-card-${occupiedTableId}`).click();
  await page.locator('#table-detail-modal-card').waitFor({ state: 'visible' });
  result.measurements.detailModalVisibleMs = Math.round(performance.now() - modalStart);
  const menuApiStart = performance.now();
  await menuResponsePromise;
  result.measurements.menuApiRemainingMs = Math.round(performance.now() - menuApiStart);
  await page.locator('#btn-close-table-detail').click();

  const bookingViewStart = performance.now();
  await page.locator('#nav-tab-bookings').click();
  await page.locator('#booking-list-view').waitFor({ state: 'visible' });
  result.measurements.bookingViewVisibleMs = Math.round(performance.now() - bookingViewStart);

  // Chờ GET DATMON nền hoàn tất để ghi nhận trọn vẹn request, không thao tác ghi dữ liệu.
  await page.waitForResponse(
    (response) => isFinalGasResponse(response, 'GET_ALL_DATMON'),
    { timeout: 30_000 }
  );

  // Lần tải lại có cache: đo thời gian dữ liệu cũ sẵn sàng và để GET nền hoàn tất riêng biệt.
  const warmResponsePromise = page.waitForResponse(
    (response) => isFinalGasResponse(response, 'STATUS_AND_BOOKINGS'),
    { timeout: 30_000 }
  );
  const warmStart = performance.now();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button[id^="table-card-"]')].some((element) =>
      element.getAttribute('title')?.includes('Khách:')
    )
  );
  result.measurements.warmCacheDataReadyMs = Math.round(performance.now() - warmStart);
  await warmResponsePromise;
  result.measurements.warmBackgroundSyncFinishedMs = Math.round(performance.now() - warmStart);

  const counts = {};
  apiRequests.forEach(({ method, action }) => {
    const key = `${method} ${action}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  result.requestSummary = counts;
  result.assertions = {
    oneCombinedGetPerPageLoad: counts['GET STATUS_AND_BOOKINGS'] === 2,
    noRedundantBookingsGet: !counts['GET GET_BOOKINGS'],
    datMonReadScopedToSelectedDate: apiRequests.some(
      ({ method, action, date }) => method === 'GET' && action === 'GET_ALL_DATMON' && Boolean(date)
    ),
    noBusinessWriteRequests: !apiRequests.some(({ method }) => method === 'POST'),
    noPageErrors: pageErrors.length === 0,
  };
  result.passed = Object.values(result.assertions).every(Boolean);
} catch (error) {
  result.passed = false;
  result.error = error instanceof Error ? error.message : String(error);
} finally {
  await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
