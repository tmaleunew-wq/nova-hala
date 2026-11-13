const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('==============================================================');
    console.log('KROK 3: REALNE POUZIVATELSKE TESTOVANIE CEZ ROZHRANIE');
    console.log('URL: http://localhost:8080/?template=kancelarska_budova');
    console.log('==============================================================');

    await page.goto('http://localhost:8080/?template=kancelarska_budova', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Overenie verzie v hlavicke
    const versionText = await page.evaluate(() => {
      const el = document.querySelector('span[title="Vývojový identifikátor verzie"]');
      return el ? el.textContent.trim() : null;
    });
    console.log('1. Detegovany verzionovaci identifikator:', versionText);

    // KROK 0: Kliknutie na zalozku "Otvory" v navigacii
    console.log('\n2. Klikam na zalozku Otvory v hlavnej navigacii...');
    const navButtons = await page.$$('header nav button');
    let otvoryClicked = false;
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        otvoryClicked = true;
        break;
      }
    }
    console.log('   Zalozka Otvory kliknuta:', otvoryClicked);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/krok3_step0_otvory.png' });

    // KROK 1: Kliknutie na existujuce okno (kanc-f-l1) v 3D scene
    console.log('\n3. Hladam presne 2D suradnice okna kanc-f-l1 na obrazovke...');
    const windowCoords = await page.evaluate(() => {
      // Find canvas
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      
      // We can use Three.js scene from R3F canvas
      // In Three.js, front wall gable center is at x=0, z=-18. Bay D-1 is at x=-6, y=2.2, z=-18.05
      // With default camera [-35, 18, -42] looking at [0, 2.9, 0],
      // the front wall is visible on the right half of the canvas.
      return {
        canvasLeft: rect.left,
        canvasTop: rect.top,
        canvasWidth: rect.width,
        canvasHeight: rect.height
      };
    });
    console.log('   Canvas rect:', windowCoords);

    // Let's inspect all interactive opening hitboxes in the React tree or scene
    // To trigger opening selection cleanly through user action:
    console.log('\n4. Aktivujem vyber otvoru a klikam "Nahradit typ"...');
    // We can click the opening by triggering its onPointerUp/click via fiber or dispatching click
    const selectRes = await page.evaluate(() => {
      // Find opening hitbox by searching the Three scene or triggering openingEditor
      // Let's see if we have opening hitboxes in DOM or React fiber
      return { ready: true };
    });

  } catch (err) {
    console.error('CHYBA:', err);
  } finally {
    await browser.close();
  }
})();
