const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Test replaceOpening: Loading Kancelárska budova...');
    await page.goto('http://localhost:8080/?template=kancelarska_budova', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // Open Otvory
    const navButtons = await page.$$('header nav button');
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Verify localStorage has default or custom state
    const stateCheck = await page.evaluate(() => {
      const openingsKey = localStorage.getItem('vbau_hall_openings_state_v1');
      return {
        hasLocalStorage: !!openingsKey,
        data: openingsKey ? JSON.parse(openingsKey) : null
      };
    });
    console.log('LocalStorage state on load:', stateCheck);

    // Click on canvas to select opening
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();

    // Click right on front wall center:
    console.log('Clicking on front wall entrance door...');
    await page.mouse.click(box.x + box.width * 0.50, box.y + box.height * 0.65);
    await new Promise(r => setTimeout(r, 1000));

    // Check if CAD action bar or modal is open
    const openBar = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      const hasReplace = btns.some(t => t.includes('Nahradiť'));
      const hasEdit = btns.some(t => t.includes('Upraviť'));
      const hasChangeType = btns.some(t => t.includes('Zmeniť'));
      return { btns, hasReplace, hasEdit, hasChangeType };
    });
    console.log('CAD Action Bar / Modal status:', openBar);

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_replace_test_direct.png' });
    console.log('Screenshot saved: screenshot_replace_test_direct.png');

  } catch (err) {
    console.error('Error in direct replace test:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
