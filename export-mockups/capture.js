const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const mockups = [
    { name: 'option-a-story', width: 1080, height: 1080 },
    { name: 'option-b-player-story', width: 1080, height: 1920 },
    { name: 'option-c-stat-card', width: 1200, height: 675 },
    { name: 'option-d-instagram-portrait', width: 1080, height: 1350 },
    { name: 'option-e-twitter-landscape', width: 1350, height: 1080 },
  ];
  
  for (const mockup of mockups) {
    console.log(`Capturing ${mockup.name}...`);
    const page = await browser.newPage();
    await page.setViewport({ 
      width: mockup.width + 80, 
      height: mockup.height + 80,
      deviceScaleFactor: 2
    });
    
    const filePath = path.join(__dirname, `${mockup.name}.html`);
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });
    
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find the card element and screenshot it
    const card = await page.$('.card');
    if (card) {
      await card.screenshot({
        path: path.join(__dirname, `${mockup.name}.png`),
        type: 'png'
      });
      console.log(`✓ Saved ${mockup.name}.png`);
    }
    
    await page.close();
  }
  
  await browser.close();
  console.log('\nAll mockups captured!');
}

capture().catch(console.error);
