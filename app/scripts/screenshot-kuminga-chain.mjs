import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 2 });

// Navigate to ATL team page
await page.goto('http://localhost:3456/team/ATL', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Click on Kuminga in the roster to expand his chain
const kumingaNode = await page.locator('text=Jonathan Kuminga').first();
if (kumingaNode) {
  await kumingaNode.click();
  await page.waitForTimeout(2000);
}

// Hide UI chrome, isolate graph
await page.evaluate(() => {
  const style = document.createElement('style');
  style.textContent = `
    nav, header, footer, [class*="roster"], [class*="Roster"],
    [class*="search"], [class*="Search"], [class*="sidebar"], [class*="Sidebar"],
    [class*="TradePartners"], [class*="tradePartners"],
    [class*="WhatsNew"], [class*="whatsnew"] { display: none !important; }
    body::after {
      content: 'RosterDNA';
      position: fixed;
      bottom: 24px;
      right: 32px;
      font-family: Inter, system-ui, sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: rgba(255,255,255,0.5);
      letter-spacing: 1px;
      z-index: 99999;
    }
    body::before {
      content: '@RosterDNA';
      position: fixed;
      bottom: 10px;
      right: 32px;
      font-family: Inter, system-ui, sans-serif;
      font-size: 9px;
      font-weight: 600;
      color: rgba(34,211,238,0.5);
      letter-spacing: 2px;
      text-transform: uppercase;
      z-index: 99999;
    }
  `;
  document.head.appendChild(style);
});
await page.waitForTimeout(500);

// Screenshot the graph
const graphEl = await page.$('.react-flow, [class*="react-flow"], [class*="ReactFlow"]');
if (graphEl) {
  await graphEl.screenshot({ path: 'public/cards/custom/atl-kuminga-chain.png' });
  console.log('Kuminga chain screenshot saved');
} else {
  await page.screenshot({ path: 'public/cards/custom/atl-kuminga-chain.png', fullPage: false });
  console.log('Full page fallback screenshot saved');
}

await browser.close();
