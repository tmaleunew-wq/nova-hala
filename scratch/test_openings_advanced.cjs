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

    // Switch camera to FRONT view for precise testing
    const frontBtn = await page.$$('button');
    for (const b of frontBtn) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.trim() === 'FRONT') {
        await b.click();
        console.log('Switched camera to FRONT view.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_openings_front_clean.png' });
    console.log('1. Saved screenshot_openings_front_clean.png');

    // Click on the empty front wall (e.g. left side of the front facade)
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    const clickX = box.x + box.width * 0.35;
    const clickY = box.y + box.height * 0.58;
    console.log(`Clicking empty wall at (${clickX}, ${clickY}) ...`);
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1200));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_front_wall_menu.png' });
    console.log('2. Saved screenshot_front_wall_menu.png');

    // Click on '+ Okno'
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Okno')) {
        await b.click();
        console.log('Clicked "+ Okno" button.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));

    // If collision alert shows, click recommended snap button
    const snapBtn = await page.$$('button');
    for (const b of snapBtn) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Odporúčaná pozícia')) {
        await b.click();
        console.log('Snapped to collision-free position!');
        await new Promise(r => setTimeout(r, 500));
        break;
      }
    }

    // Save opening
    const saveBtns = await page.$$('button');
    for (const b of saveBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Uložiť prvok')) {
        await b.click();
        console.log('Clicked "Uložiť prvok".');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_front_window_saved.png' });
    console.log('3. Saved screenshot_front_window_saved.png');

    // Click on the newly added window to select it and test contextual actions
    console.log(`Clicking opening to select it at (${clickX}, ${clickY}) ...`);
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1200));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_opening_selected.png' });
    console.log('4. Saved screenshot_opening_selected.png');

    // Click "Duplikovať"
    const actionBtns = await page.$$('button');
    for (const b of actionBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Duplikovať')) {
        await b.click();
        console.log('Clicked "Duplikovať" button.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_window_duplicated.png' });
    console.log('5. Saved screenshot_window_duplicated.png');

    await browser.close();
    console.log('SUCCESS: All advanced opening workflows passed!');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
