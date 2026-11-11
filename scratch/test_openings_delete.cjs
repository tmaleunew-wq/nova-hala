const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });

    const closeBtn = await page.$('button[title*="Zavrieť"], button[aria-label*="Zavrieť"], button:has(svg.lucide-x)');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Otvory mode
    const navButtons = await page.$$('header nav button');
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Add window on wall
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    const clickX = box.x + box.width * 0.35;
    const clickY = box.y + box.height * 0.58;
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1200));

    // Click Okno
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Okno')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));

    // Snap if collision
    const snapBtn = await page.$$('button');
    for (const b of snapBtn) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Odporúčaná pozícia')) {
        await b.click();
        await new Promise(r => setTimeout(r, 500));
        break;
      }
    }

    // Save
    const saveBtns = await page.$$('button');
    for (const b of saveBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Uložiť prvok')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Select window
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1200));

    // Click Delete
    const deleteBtns = await page.$$('button');
    for (const b of deleteBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Zmazať')) {
        await b.click();
        console.log('Clicked "Zmazať" button.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_window_deleted_restored.png' });
    console.log('Saved screenshot_window_deleted_restored.png');

    await browser.close();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
