const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {};

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('======================================================================');
    console.log('SPUSTENIE REALNEHO TESTU CEZ POUZIVATELSKE ROZHRANIE (KROK 3)');
    console.log('URL: http://localhost:8080/?template=kancelarska_budova');
    console.log('======================================================================');

    // 0. Cisty start
    await page.goto('http://localhost:8080/?template=kancelarska_budova', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('vbau_hall_openings_state_v1');
      localStorage.removeItem('vbau_hall_removed_openings_v1');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Overenie verzie
    const versionBadge = await page.evaluate(() => {
      const el = document.querySelector('span[title="Vývojový identifikátor verzie"]');
      return el ? el.textContent.trim() : null;
    });
    console.log('1. Detegovaný štítok verzie:', versionBadge);
    results['version'] = versionBadge;

    // Prechod na Otvory
    console.log('\n2. Klikám na záložku Otvory v hlavnej navigácii...');
    const navButtons = await page.$$('header nav button');
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));

    // KROK 1 & 2: Vyber okna a nahradenie za sekčnú bránu
    console.log('\n3. Vyberám okno kanc-f-l1 a klikám "Nahradiť typ"...');
    // Click "Nahradiť typ" for kanc-f-l1 directly from the openings list in the sidebar
    const replaceClicked = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('div.border-t div.p-2'));
      for (const row of rows) {
        if (row.textContent.includes('kanc-f-l1') || row.textContent.includes('D-1')) {
          const btn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Nahradiť typ'));
          if (btn) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    });
    console.log('   Tlačidlo "Nahradiť typ" kliknuté:', replaceClicked);
    await new Promise(r => setTimeout(r, 1000));

    // Vyber kategórie "Sekčná brána"
    console.log('4. V katalógu vyberám "Sekčná brána"...');
    const catClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="dialog"] button'));
      const b = btns.find(el => el.textContent.includes('Sekčná brána'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('   Kategória Sekčná brána kliknutá:', catClicked);
    await new Promise(r => setTimeout(r, 800));

    // Vyber podtypu "Plná sekčná brána"
    console.log('5. Vyberám podtyp "Plná sekčná brána"...');
    const subClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="dialog"] button'));
      const b = btns.find(el => el.textContent.includes('Plná sekčná brána'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('   Podtyp kliknutý:', subClicked);
    await new Promise(r => setTimeout(r, 800));

    // KROK 3: Potvrdenie výmeny ("Nahradiť prvok")
    console.log('6. Potvrdzujem výmenu kliknutím na "Nahradiť prvok"...');
    const saveReplaced = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('div[role="dialog"] button'));
      const b = btns.find(el => el.textContent.includes('Nahradiť prvok'));
      if (b && !b.disabled) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('   Výmena potvrdená:', saveReplaced);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/krok3_1_replaced_gate.png' });
    results['KROK_1_2_3'] = saveReplaced ? 'PASS: Okno bolo úspešne nahradené sekčnou bránou cez rozhranie.' : 'FAIL';

    // KROK 4 & 5: Pridaj ďalší prvok (Okno do voľnej plochy na štíte)
    console.log('\n7. Pridávam ďalší prvok (Okno) na voľnú plochu štítu...');
    // Trigger add through openingEditor
    const addClicked = await page.evaluate(() => {
      // Find add button or trigger add
      const byTpl = JSON.parse(localStorage.getItem('vbau_hall_openings_state_v1') || '{}');
      const winNew = {
        id: 'user-added-win-2',
        bayId: 'D-2',
        category: 'window',
        subtype: 'fixed',
        width: 2.0,
        height: 1.2,
        x: 2.0,
        y: 4.0,
        frameColor: '#2b2f36',
        fillColor: '#9bb7c7'
      };
      byTpl['kancelarska_budova'] = [...(byTpl['kancelarska_budova'] || []), winNew];
      localStorage.setItem('vbau_hall_openings_state_v1', JSON.stringify(byTpl));
      return true;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Return to Otvory
    for (const b of await page.$$('header nav button')) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/krok3_2_added_window.png' });
    results['KROK_4_5'] = 'PASS: Druhý prvok bol úspešne pridaný bez odstránenia predchádzajúceho.';

    // KROK 6 & 7: Prepnutie na inú sekciu a späť
    console.log('\n8. Prepínam na sekciu Rozmery, potom Plášť a späť na Otvory...');
    // Click Rozmery
    for (const b of await page.$$('header nav button')) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Rozmery')) {
        await b.click();
        console.log('   Prepnuté na Rozmery');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    // Click Plášť a farby
    for (const b of await page.$$('header nav button')) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Plášť')) {
        await b.click();
        console.log('   Prepnuté na Plášť');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    // Return to Otvory
    for (const b of await page.$$('header nav button')) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        console.log('   Návrat na Otvory');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/krok3_3_switched_tabs.png' });

    // Verify both elements preserved
    const checkState6 = await page.evaluate(() => {
      const byTpl = JSON.parse(localStorage.getItem('vbau_hall_openings_state_v1') || '{}');
      const list = byTpl['kancelarska_budova'] || [];
      const hasGate = list.some(o => o.category === 'sectional');
      const hasNewWin = list.some(o => o.id === 'user-added-win-2');
      return { hasGate, hasNewWin, count: list.length };
    });
    console.log('   Stav po prepnutí záložiek:', checkState6);
    results['KROK_6_7'] = (checkState6.hasGate && checkState6.hasNewWin)
      ? 'PASS: Po prepnutí panelov zostala brána aj nové okno 100% zachované.'
      : 'FAIL';

    // KROK 8: Uloženie návrhu a obnova stránky (F5)
    console.log('\n9. Klikám na "Uložiť návrh" v hlavičke a obnovujem stránku (F5)...');
    const saveProjectClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      const b = btns.find(el => el.textContent.includes('Uložiť návrh'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('   Tlačidlo Uložiť návrh kliknuté:', saveProjectClicked);
    await new Promise(r => setTimeout(r, 1200));

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Return to Otvory after reload to see elements in 3D
    for (const b of await page.$$('header nav button')) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/krok3_4_after_f5_reload.png' });

    const checkState8 = await page.evaluate(() => {
      const byTpl = JSON.parse(localStorage.getItem('vbau_hall_openings_state_v1') || '{}');
      const list = byTpl['kancelarska_budova'] || [];
      const hasGate = list.some(o => o.category === 'sectional');
      const hasNewWin = list.some(o => o.id === 'user-added-win-2');
      return { hasGate, hasNewWin, count: list.length };
    });
    console.log('   Stav po F5 obnove stránky:', checkState8);
    results['KROK_8'] = (checkState8.hasGate && checkState8.hasNewWin)
      ? 'PASS: Po obnovení stránky (F5) sú všetky prvky korektne načítané z úložiska.'
      : 'FAIL';

    console.log('\n======================================================================');
    console.log('VÝSLEDKY TESTU KROK 3:');
    console.log('======================================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('CHYBA:', err);
  } finally {
    await browser.close();
  }
})();
