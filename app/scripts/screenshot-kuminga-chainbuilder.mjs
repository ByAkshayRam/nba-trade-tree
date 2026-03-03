import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

await page.goto('http://localhost:3456/admin/chain-builder', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Login
await page.fill('input[type="password"]', 'rosterdna-admin-2026');
await page.click('button:has-text("Enter")');
await page.waitForTimeout(3000);

// Select ATL
await page.selectOption('select', 'ATL');
await page.waitForTimeout(2000);

// Click Kuminga
await page.click('text=Jonathan Kuminga');
await page.waitForTimeout(2000);

// Set horizontal layout L→R and 3:2 aspect
await page.click('button:has-text("L→R")');
await page.waitForTimeout(500);
await page.click('button:has-text("3:2")');
await page.waitForTimeout(3000);

// Screenshot just the chain preview area (below the toolbar)
await page.screenshot({ path: 'public/cards/custom/kuminga-chain-landscape.png', fullPage: false });
console.log('Landscape screenshot saved');

// Also use the built-in export
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
  page.click('button:has-text("Export 1")')
]);
if (download) {
  const path = await download.path();
  console.log('Export downloaded to:', path);
  const fs = await import('fs');
  fs.copyFileSync(path, 'public/cards/custom/kuminga-chain-exported.png');
  console.log('Exported PNG copied');
} else {
  console.log('No download triggered');
}

await browser.close();
