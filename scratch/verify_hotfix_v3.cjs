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

    await page.goto('http://localhost:8080/?template=kancelarska_budova', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Verify version badge
    const badgeText = await page.evaluate(() => {
      const el = document.querySelector('header span[title="Vývojový identifikátor verzie"]');
      return el ? el.textContent.trim() : null;
    });
    console.log('Verzia:', badgeText);

    // Switch to Otvory
    for (const b of await page.$$('header nav button')) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Otvory')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: 'C:/Users/Uzivatel/.gemini/antigravity/brain/f4b89c5d-0c33-407d-bd0d-be1c343bcd88/screenshot_hotfix_v3_clean.png' });
    console.log('Screenshot uložený: screenshot_hotfix_v3_clean.png');

  } catch (err) {
    console.error('CHYBA:', err);
  } finally {
    await browser.close();
  }
})();
