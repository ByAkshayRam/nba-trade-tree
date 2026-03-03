import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

await page.goto('http://localhost:3456/admin/chain-builder', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

await page.fill('input[type="password"]', 'rosterdna-admin-2026');
await page.click('button:has-text("Enter")');
await page.waitForTimeout(3000);

await page.selectOption('select', 'DAL');
await page.waitForTimeout(2000);
await page.click('text=Marvin Bagley III');
await page.waitForTimeout(2000);
await page.click('button:has-text("L→R")');
await page.waitForTimeout(300);
await page.click('button:has-text("3:2")');
await page.waitForTimeout(300);
await page.click('button:has-text("JPEG")');
await page.waitForTimeout(3000);

const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
  page.click('button:has-text("Export 1")')
]);
if (download) {
  const path = await download.path();
  const fs = await import('fs');
  fs.copyFileSync(path, 'public/cards/custom/bagley-chain-exported.jpg');
  console.log('Bagley JPEG exported');
}

await browser.close();
