const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Otváram http://localhost:8080/?template=kancelarska_budova ...');
    await page.goto('http://localhost:8080/?template=kancelarska_budova', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const badge = await page.evaluate(() => {
      const el = document.querySelector('span[title="Vývojový identifikátor verzie"]');
      return el ? el.textContent.trim() : null;
    });

    console.log('Nájdený štítok verzie:', badge);
    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_fresh_server_version.png' });
    console.log('Snímka uložená: screenshot_fresh_server_version.png');
  } catch (err) {
    console.error('Chyba pri overení:', err);
  } finally {
    await browser.close();
  }
})();
