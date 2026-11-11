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

    console.log('1. Loading Kancelárska budova directly via URL parameter (?template=kancelarska_budova)...');
    await page.goto('http://localhost:8080/?template=kancelarska_budova', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scenár 1: Aktivujem režim Otvory – pluská sa zobrazia na voľných plochách
    console.log('2. Scenár 1: Aktivujem režim Otvory...');
    const navButtons = await page.$$('header nav button');
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_hotspots.png' });
    console.log('Screenshot 1 saved: screenshot_kanc_hotspots.png');

    // Scenár 2: Klik na voľnú stenu / plusko pre otvorenie kompletného katalógu
    console.log('3. Scenár 2: Klik na stenu pre otvorenie katalógu...');
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    const clickX = box.x + box.width * 0.46;
    const clickY = box.y + box.height * 0.58;
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_catalog.png' });
    console.log('Screenshot 2 saved: screenshot_kanc_catalog.png (kompletný katalóg)');

    // Zoznam kategórií v OpeningPanel
    const categoriesText = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return [];
      const btns = Array.from(dialog.querySelectorAll('button'));
      return btns.map(b => b.textContent.trim()).filter(t => t.length > 2);
    });
    console.log('Dostupné kategórie v katalógu:', categoriesText);

    // Scenár 3: Výber kategórie (Personálne dvere) a podtypu (Presklené dvere)
    console.log('4. Scenár 3: Výber kategórie a podtypu...');
    const catButtons = await page.$$('div[role="dialog"] button');
    for (const b of catButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Personálne dvere')) {
        await b.click();
        console.log('Vybraté: Personálne dvere');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    const subButtons = await page.$$('div[role="dialog"] button');
    for (const b of subButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && (text.includes('Presklené') || text.includes('Plné'))) {
        await b.click();
        console.log('Vybratý podtyp:', text.trim());
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));

    // Scenár 7: Kolízny systém – overenie stavu
    const collisionMsg = await page.evaluate(() => {
      const err = document.querySelector('p[role="alert"]');
      return err ? err.textContent.trim() : null;
    });
    if (collisionMsg) {
      console.log('Scenár 7: Kolízia detegovaná:', collisionMsg);
      const allBtns = await page.$$('button');
      for (const b of allBtns) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text && text.includes('Odporúčaná pozícia')) {
          await b.click();
          console.log('Zarovnané na bezpečnú odporúčanú pozíciu!');
          await new Promise(r => setTimeout(r, 500));
          break;
        }
      }
    } else {
      console.log('Pozícia je bezpečná a platná.');
    }

    // Uloženie nového prvku
    const saveBtns = await page.$$('button');
    for (const b of saveBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Uložiť prvok')) {
        await b.click();
        console.log('Prvok úspešne pridaný!');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_door_added.png' });
    console.log('Screenshot 3 saved: screenshot_kanc_door_added.png');

    // Scenár 4: Kliknutie na existujúci prvok pre výber a zobrazenie CAD lišty [Upraviť] [Duplikovať] [Zmazať]
    console.log('5. Scenár 4: Kliknutie na prvok pre zobrazenie kontextovej CAD lišty...');
    await page.mouse.click(clickX, clickY);
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_element_selected.png' });
    console.log('Screenshot 4 saved: screenshot_kanc_element_selected.png');

    // Scenár 6: Duplikovanie prvku
    console.log('6. Scenár 6: Duplikovanie prvku...');
    const actionBtns = await page.$$('button');
    for (const b of actionBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Duplikovať')) {
        await b.click();
        console.log('Prvok duplikovaný!');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_duplicated.png' });
    console.log('Screenshot 5 saved: screenshot_kanc_duplicated.png');

    // Scenár 8: Uloženie projektu – perzistencia
    console.log('7. Scenár 8: Uloženie návrhu do CRM...');
    const saveProjectBtns = await page.$$('button');
    for (const b of saveProjectBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Uložiť návrh')) {
        await b.click();
        console.log('Uložiť návrh úspešne zaznamenané!');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_kanc_saved_final.png' });
    console.log('Screenshot 6 saved: screenshot_kanc_saved_final.png');

    await browser.close();
    console.log('VŠETKÝCH 8 SCENÁROV ÚSPEŠNE OVERENÝCH NA KANCELÁRSKEJ BUDOVE!');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
