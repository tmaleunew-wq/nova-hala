const puppeteer = require('puppeteer-core');
const fs = require('fs');

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
    console.log('Navigating to http://localhost:8080/ ...');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });

    // Close template picker if open
    const closeBtn = await page.$('button[title*="Zavrieť"], button[aria-label*="Zavrieť"], button:has(svg.lucide-x)');
    if (closeBtn) {
      await closeBtn.click();
      console.log('Closed template picker.');
    }
    await new Promise(r => setTimeout(r, 1000));

    // Switch to Otvory mode
    const navButtons = await page.$$('header nav button');
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        console.log('Switched to Otvory mode.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot 1: Clean walls without floating static discs
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_openings_clean.png' });
    console.log('1. Saved screenshot_openings_clean.png (Clean view without static + discs)');

    // Click on the 3D canvas on the front wall
    // Front wall is roughly in the center-left area
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    const clickX = box.x + box.width * 0.45;
    const clickY = box.y + box.height * 0.55;
    console.log(`Clicking wall at (${clickX}, ${clickY}) ...`);
    await page.mouse.click(clickX, clickY);

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_wall_context_menu.png' });
    console.log('2. Saved screenshot_wall_context_menu.png (Wall context menu)');

    // Check if context menu or opening panel is visible
    const popoverButtons = await page.$$('button');
    let addedWindow = false;
    for (const b of popoverButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Okno')) {
        await b.click();
        console.log('Clicked "+ Okno" in context menu.');
        addedWindow = true;
        break;
      }
    }

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_window_added.png' });
    console.log('3. Saved screenshot_window_added.png (Window added with panel)');

    // Save opening if panel is open
    const saveBtn = await page.$('button:has-text("Uložiť prvok"), button');
    const allButtons = await page.$$('button');
    for (const b of allButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Uložiť prvok')) {
        await b.click();
        console.log('Clicked "Uložiť prvok".');
        break;
      }
    }

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_after_save.png' });
    console.log('4. Saved screenshot_after_save.png (Saved opening in 3D wall)');

    await browser.close();
    console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error in test:', err);
    process.exit(1);
  }
})();
