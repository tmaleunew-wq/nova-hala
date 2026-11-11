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
    console.log('1. Navigating to configurator...');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    // Select KANCELÁRSKA BUDOVA in template picker
    console.log('2. Selecting KANCELÁRSKA BUDOVA template...');
    const cards = await page.$$('div, button');
    let templateSelected = false;
    for (const card of cards) {
      const text = await page.evaluate(el => el.textContent, card);
      if (text && text.includes('KANCELÁRSKA BUDOVA') && text.includes('so skladom')) {
        // find a clickable button or card inside
        const btn = await card.$('button');
        if (btn) {
          await btn.click();
          templateSelected = true;
          break;
        } else {
          await card.click();
          templateSelected = true;
          break;
        }
      }
    }
    if (!templateSelected) {
      // Look for any button with Vybrať halu for kancelarska
      const allBtns = await page.$$('button');
      for (const b of allBtns) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text && text.includes('Vybrať halu')) {
          await b.click();
          templateSelected = true;
          break;
        }
      }
    }
    console.log('Template selected:', templateSelected);
    await new Promise(r => setTimeout(r, 2000));

    // Switch to Otvory mode
    console.log('3. Switching to Otvory mode...');
    const navButtons = await page.$$('header nav button');
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 1: Otvory mode with visible "+" hotspots
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_hotspots_visible.png' });
    console.log('Saved screenshot_kanc_hotspots_visible.png');

    // Click on empty wall or plus hotspot to open the full catalog
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    // Click on front facade wall
    const clickX = box.x + box.width * 0.45;
    const clickY = box.y + box.height * 0.52;
    console.log(`4. Clicking on wall / hotspot at (${clickX}, ${clickY}) ...`);
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot 2: Full catalog modal open (showing categories)
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_full_catalog_modal.png' });
    console.log('Saved screenshot_full_catalog_modal.png');

    // Verify categories listed
    const panelTitle = await page.evaluate(() => {
      const title = document.querySelector('#opening-panel-title');
      return title ? title.textContent : null;
    });
    console.log('Opening panel title:', panelTitle);

    // Click on "Personálne dvere" category in catalog
    const catButtons = await page.$$('div[role="dialog"] button');
    let pickedCat = false;
    for (const b of catButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Personálne dvere')) {
        await b.click();
        pickedCat = true;
        console.log('Selected category: Personálne dvere');
        break;
      }
    }

    await new Promise(r => setTimeout(r, 1200));

    // Select subtype (e.g. Plné dvere or Presklené)
    const subtypeButtons = await page.$$('div[role="dialog"] button');
    for (const b of subtypeButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && (text.includes('Presklené') || text.includes('Plné'))) {
        await b.click();
        console.log('Selected subtype:', text.trim());
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 3: Parameters step with collision check
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_door_params.png' });
    console.log('Saved screenshot_kanc_door_params.png');

    // If collision, click recommended position
    const snapBtn = await page.$$('button');
    for (const b of snapBtn) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Odporúčaná pozícia')) {
        await b.click();
        console.log('Clicked snap to valid position!');
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
        console.log('Clicked Uložiť prvok');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot 4: Door added to office building
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_door_saved.png' });
    console.log('Saved screenshot_kanc_door_saved.png');

    // Click on the existing window to test selection
    console.log('5. Clicking existing window to test selection and action bar...');
    // Left upper window on front wall is around (box.x + box.width * 0.38, box.y + box.height * 0.48)
    const winClickX = box.x + box.width * 0.38;
    const winClickY = box.y + box.height * 0.48;
    await page.mouse.click(winClickX, winClickY);
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_window_selected.png' });
    console.log('Saved screenshot_kanc_window_selected.png');

    // Click "Uložiť návrh" to verify project persistence button
    const saveProjectBtns = await page.$$('button');
    for (const b of saveProjectBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Uložiť návrh')) {
        await b.click();
        console.log('Clicked Uložiť návrh button.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_project_saved.png' });
    console.log('Saved screenshot_kanc_project_saved.png');

    await browser.close();
    console.log('TEST COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
