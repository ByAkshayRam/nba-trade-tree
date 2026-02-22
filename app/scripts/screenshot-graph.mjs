import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3456/team/BOS';
const output = process.argv[3] || 'public/cards/custom/bos-vucevic-graph.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3200, height: 2000 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(4000);

// Hide roster sidebar, header, search, and other non-graph elements to isolate the graph
await page.evaluate(() => {
  // Hide everything except the graph container
  const style = document.createElement('style');
  style.textContent = `
    /* Hide non-graph elements */
    nav, header, footer, [class*="roster"], [class*="Roster"],
    [class*="search"], [class*="Search"], [class*="sidebar"], [class*="Sidebar"],
    [class*="TradePartners"], [class*="tradePartners"] { display: none !important; }
    /* Add RosterDNA watermark */
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
      content: 'Trade Chain Intelligence';
      position: fixed;
      bottom: 10px;
      right: 32px;
      font-family: Inter, system-ui, sans-serif;
      font-size: 8px;
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

// Find the graph/react-flow container and screenshot just that
const graphEl = await page.$('.react-flow, [class*="react-flow"], [class*="ReactFlow"], canvas, [class*="graph"], [class*="Graph"], [class*="tree-container"], [class*="TreeContainer"]');

if (graphEl) {
  await graphEl.screenshot({ path: output });
  console.log('Graph element screenshot saved to', output);
} else {
  // Fallback: full page
  await page.screenshot({ path: output, fullPage: true });
  console.log('Full page screenshot (no graph element found) saved to', output);
}

await browser.close();
