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

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[DIAG]') || text.includes('error') || text.includes('Error')) {
        console.log('BROWSER CONSOLE:', text);
      }
    });

    console.log('--- REPRODUKCIA KROKOV A AZ F V PREHLIADACI ---');
    await page.goto('http://localhost:8080/?template=kancelarska_budova', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // KROK 0: Prechod na Otvory
    console.log('Krok 0: Aktivujem rezim Otvory...');
    const navButtons = await page.$$('header nav button');
    for (const b of navButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/reproduce_step0_otvory.png' });

    // Inspect openings in state
    const openings0 = await page.evaluate(() => {
      const byTpl = JSON.parse(localStorage.getItem('vbau_hall_openings_state_v1') || '{}');
      const rem = JSON.parse(localStorage.getItem('vbau_hall_removed_openings_v1') || '{}');
      return { byTpl, rem };
    });
    console.log('Pociatocny localStorage:', openings0);

    // KROK A: Vyber existujuce okno
    console.log('\nKrok A: Klikam na existujuce okno (kanc-f-l1)...');
    // Let's inspect what elements exist in the DOM or Three scene
    const clickRes = await page.evaluate(() => {
      // Find canvas and dispatch click at window coordinates
      return { ok: true };
    });

    console.log('Krok A hotovy.');
  } catch (err) {
    console.error('CHYBA:', err);
  } finally {
    await browser.close();
  }
})();
