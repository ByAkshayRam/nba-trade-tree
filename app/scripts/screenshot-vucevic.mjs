import { chromium } from 'playwright';

const output = process.argv[2] || 'public/cards/custom/bos-vucevic-chain-export.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3200, height: 2000 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:3456/team/BOS', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

// Click Vucevic in the ROSTER SIDEBAR (the target/roster nodes on left side)
// These are the react-flow nodes with type="target" that show player name
const clicked = await page.evaluate(() => {
  const nodes = document.querySelectorAll('.react-flow__node');
  for (const node of nodes) {
    const text = node.textContent || '';
    // Target/roster nodes contain the player name and have ROSTER type styling
    if (text.includes('Nikola Vucevic') && node.classList.toString().includes('target')) {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return 'clicked target node';
    }
  }
  // Fallback: click any node with Vucevic
  for (const node of document.querySelectorAll('.react-flow__node')) {
    if ((node.textContent || '').includes('Nikola Vucevic')) {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return 'clicked fallback node: ' + node.className;
    }
  }
  return 'not found';
});
console.log('Click result:', clicked);
await page.waitForTimeout(3000);

// Now aggressively hide all UI chrome
await page.evaluate(() => {
  const style = document.createElement('style');
  style.textContent = `
    /* Hide ALL react-flow panels (controls, minimap, attribution) */
    .react-flow__panel,
    .react-flow__controls,
    .react-flow__minimap,
    .react-flow__attribution { display: none !important; }

    /* Hide the node count / tracing info box (top-left) and share button (top-right) */
    .react-flow ~ .absolute.top-4.left-4,
    .react-flow ~ .absolute.top-4.right-16,
    .absolute.top-4.left-4,
    .absolute.top-4.right-16 { display: none !important; }

    /* Hide any buttons/overlays */
    [class*="tap-to"], [class*="tapTo"],
    [class*="overlay"], [class*="Overlay"] { display: none !important; }

    /* Hide the tracing bar / info bar at bottom */
    [class*="tracing"], [class*="Tracing"],
    [class*="selected-info"], [class*="SelectedInfo"] { display: none !important; }

    /* Hide any absolute/fixed positioned elements inside react-flow except our injected ones */
    .react-flow > div[style*="position: absolute"]:not(.rdna-injected),
    .react-flow > div[style*="position: fixed"]:not(.rdna-injected) { }
  `;
  document.head.appendChild(style);

  // Manually find and hide panels
  document.querySelectorAll('.react-flow__panel').forEach(el => el.remove());

  // Remove the node count box (top-left) and share button (top-right) by finding them
  const graphParent = document.querySelector('.react-flow')?.parentElement;
  if (graphParent) {
    graphParent.querySelectorAll(':scope > .absolute').forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('nodes') || text.includes('edges') || text.includes('tracing') || text.includes('share')) {
        el.remove();
      }
    });
  }

  // Find any buttons or share elements inside the react-flow container
  const rf = document.querySelector('.react-flow');
  if (rf) {
    // Remove all button elements that aren't part of nodes
    rf.querySelectorAll(':scope > div > button, :scope > button').forEach(el => el.remove());
    
    // Look for share/export buttons by text content
    rf.querySelectorAll('button, a').forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('share') || text.includes('export') || text.includes('download') || text.includes('zoom')) {
        el.style.display = 'none';
      }
    });
  }

  // Add Vucevic header with headshot
  if (rf) {
    const header = document.createElement('div');
    header.className = 'rdna-injected';
    header.style.cssText = 'position: absolute; top: 16px; left: 20px; z-index: 100;';
    header.innerHTML = `
      <div style="
        display: flex; align-items: center; gap: 14px;
        background: rgba(10,10,15,0.92); border: 1px solid rgba(34,211,238,0.25);
        border-radius: 14px; padding: 12px 22px 12px 12px;
        backdrop-filter: blur(12px); box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      ">
        <img src="http://localhost:3456/cards/custom/vucevic-headshot.png"
          style="width: 56px; height: 56px; border-radius: 50%; border: 2.5px solid #22d3ee; object-fit: cover; object-position: top center;" />
        <div>
          <div style="font-family: Inter, system-ui, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #22d3ee; margin-bottom: 2px;">
            The Longest Active Chain in the NBA
          </div>
          <div style="font-family: Inter, system-ui, sans-serif; font-size: 24px; font-weight: 900; color: white; line-height: 1.1;">
            Nikola Vucevic
          </div>
          <div style="font-family: Inter, system-ui, sans-serif; font-size: 11px; color: #94a3b8; margin-top: 3px;">
            11 levels deep · 26 years · Origin: Jérôme Moïso (2000)
          </div>
        </div>
      </div>
    `;
    rf.appendChild(header);

    // Add RosterDNA watermark bottom right
    const watermark = document.createElement('div');
    watermark.className = 'rdna-injected';
    watermark.style.cssText = 'position: absolute; bottom: 20px; right: 28px; z-index: 100; text-align: right;';
    watermark.innerHTML = `
      <div style="font-family: Inter, system-ui, sans-serif; font-size: 22px; font-weight: 800; color: rgba(255,255,255,0.55); letter-spacing: 0.5px;">
        RosterDNA
      </div>
      <div style="font-family: Inter, system-ui, sans-serif; font-size: 9px; font-weight: 600; color: rgba(34,211,238,0.45); letter-spacing: 2px; text-transform: uppercase; margin-top: 2px;">
        Trade Chain Intelligence
      </div>
    `;
    rf.appendChild(watermark);
  }
});

await page.waitForTimeout(1500);

// Screenshot just the react-flow container
const graphEl = await page.$('.react-flow');
if (graphEl) {
  await graphEl.screenshot({ path: output });
  console.log('Graph screenshot saved to', output);
} else {
  await page.screenshot({ path: output, fullPage: true });
  console.log('Fallback screenshot saved to', output);
}

await browser.close();
