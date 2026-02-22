import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1500, height: 500 });
await page.goto('file:///home/ubuntu/nba-acquisition-tree/app/public/cards/custom/twitter-header.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ 
  path: '/home/ubuntu/nba-acquisition-tree/app/public/cards/custom/twitter-header.png',
  fullPage: false 
});
console.log('✅ Header saved to public/cards/custom/twitter-header.png');
await browser.close();
