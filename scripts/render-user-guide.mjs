import { chromium } from '/tmp/sodoba-browser-tools/node_modules/playwright-core/index.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const rootDir = process.cwd();
const htmlPath = path.join(rootDir, 'docs', 'HUONG_DAN_SU_DUNG_SMO_SODOBA.html');
const pdfPath = path.join(rootDir, 'docs', 'HUONG_DAN_SU_DUNG_SMO_SODOBA.pdf');

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve, reject) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', reject, { once: true });
            })
      )
    );
  });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#64748b;text-align:center;font-family:Arial,sans-serif">SMO SODOBA S8 • Hướng dẫn sử dụng • Trang <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    margin: { top: '13mm', right: '14mm', bottom: '15mm', left: '14mm' },
  });

  console.log(pdfPath);
} finally {
  await browser.close();
}
