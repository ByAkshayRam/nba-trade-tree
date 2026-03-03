import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });

await page.goto('http://localhost:3456/team/ATL', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Scroll to bottom to see the Explore More Teams grid
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);

await page.screenshot({ path: 'public/cards/custom/explore-grid-preview.png', fullPage: false });
console.log('Explore grid screenshot saved');

// Also screenshot a tree node to show clickable trade partner
await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(1000);
await page.screenshot({ path: 'public/cards/custom/tree-links-preview.png', fullPage: false });
console.log('Tree links screenshot saved');

await browser.close();
