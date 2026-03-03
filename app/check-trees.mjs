import { chromium } from 'playwright';

const pages = [
  { team: 'ATL', slug: 'cj-mccollum' },
  { team: 'ATL', slug: 'corey-kispert' },
  { team: 'BOS', slug: 'jayson-tatum' },
  { team: 'CLE', slug: 'dennis-schroder' },
  { team: 'CLE', slug: 'donovan-mitchell' },
  { team: 'MIN', slug: 'rudy-gobert' },
  { team: 'NOP', slug: 'saddiq-bey' },
  { team: 'POR', slug: 'deni-avdija' },
  { team: 'SAS', slug: 'deaaron-fox' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });

for (const p of pages) {
  const page = await ctx.newPage();
  try {
    await page.goto(`http://localhost:3456/team/${p.team}?player=${p.slug}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `/tmp/tree-${p.team.toLowerCase()}-${p.slug}.png`, fullPage: true });
    console.log(`✅ ${p.team}/${p.slug}`);
  } catch(e) {
    console.log(`❌ ${p.team}/${p.slug}: ${e.message.slice(0,100)}`);
  }
  await page.close();
}
await browser.close();
