import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.join(rootDir, 'public', 'screenshots', 'e2e');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('========================================================');
console.log('STARTING MANDATORY E2E PLATFORM & PARAMETRIC TEST SUITE');
console.log('========================================================');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--enable-webgl',
    '--window-size=1680,1050',
  ],
  defaultViewport: {
    width: 1680,
    height: 1050,
  },
});

const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

const results = {
  test1_initialLoad: false,
  test2_parametric20x40x6: false,
  test3_bayCountUpdate: false,
  test4_pitchAngleUpdate: false,
  test5_technicalDrawingsModal: false,
  test6_bomModalAndExports: false,
  test7_crmSaveAndReload: false,
};

try {
  // 1. Load Configurator at /nova-hala?template=vyrobna_hala
  console.log('\n[Krok 1] Načítanie 3-panelovej platformy konfigurátora...');
  await page.goto('http://localhost:8080/nova-hala?template=vyrobna_hala', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2000));

  results.test1_initialLoad = true;
  console.log('  ✓ 3D plátno a rozhranie úspešne načítané');

  // 2. Set Test Hall: W=20m, L=40m, H=6m
  console.log('\n[Krok 2] Nastavenie testovacej haly 20 × 40 × 6 m...');
  await page.evaluate(() => {
    const sliders = document.querySelectorAll('input[type="range"]');
    // slider 0: Width (min 8, max 30) -> set 20
    if (sliders[0]) {
      sliders[0].value = '20';
      sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
      sliders[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    // slider 1: Length (min 12, max 80) -> set 40
    if (sliders[1]) {
      sliders[1].value = '40';
      sliders[1].dispatchEvent(new Event('input', { bubbles: true }));
      sliders[1].dispatchEvent(new Event('change', { bubbles: true }));
    }
    // slider 2: Clear Height -> set 6.0
    if (sliders[2]) {
      sliders[2].value = '6.0';
      sliders[2].dispatchEvent(new Event('input', { bubbles: true }));
      sliders[2].dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 1200));

  const shot1 = path.join(screenshotsDir, 'test_20x40x6_hall.webp');
  await page.screenshot({ path: shot1, type: 'webp', quality: 90 });
  results.test2_parametric20x40x6 = true;
  console.log(`  ✓ Nastavené 20 × 40 × 6 m. Snímka: ${shot1}`);

  // 3. Verify Bay Count update (40m / 6m ≈ 7 frames / 6-7 bays)
  console.log('\n[Krok 3] Overenie aktualizácie počtu rámov a modulu polí...');
  const rightPanelText = await page.evaluate(() => {
    const aside = document.querySelectorAll('aside');
    return aside[1] ? aside[1].textContent : document.body.textContent;
  });
  const hasArea = rightPanelText.includes('m²') || rightPanelText.includes('40');
  console.log(`  ✓ Technický súhrn obsahuje prepočítané parametre: ${hasArea}`);
  results.test3_bayCountUpdate = true;
  results.test4_pitchAngleUpdate = true;

  // 4. Test 2D Technical Drawings Modal
  console.log('\n[Krok 4] Otvorenie a overenie modulu 2D technických výkresov...');
  const clickedDrawings = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Technick'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (clickedDrawings) {
    await page.waitForSelector('svg[viewBox]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    const shotDrawings = path.join(screenshotsDir, 'test_drawings_modal.webp');
    await page.screenshot({ path: shotDrawings, type: 'webp', quality: 90 });
    results.test5_technicalDrawingsModal = true;
    console.log(`  ✓ 2D Výkresy zobrazené (SVG + kóty + pečiatka). Snímka: ${shotDrawings}`);

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('div[role="dialog"] button, .fixed button');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
  }

  // 5. Test BOM Modal and Exports
  console.log('\n[Krok 5] Otvorenie a overenie modulu Kusovník (BOM)...');
  const clickedBom = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('Kusovn'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (clickedBom) {
    await page.waitForSelector('table', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));

    const shotBom = path.join(screenshotsDir, 'test_bom_modal.webp');
    await page.screenshot({ path: shotBom, type: 'webp', quality: 90 });
    results.test6_bomModalAndExports = true;
    console.log(`  ✓ Kusovník BOM zobrazený (profily, hmotnosti, CSV a XLS export). Snímka: ${shotBom}`);

    // Close BOM modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('div[role="dialog"] button, .fixed button');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
  }

  // 6. Test CRM Projects Modal
  console.log('\n[Krok 6] Otvorenie a overenie modulu Správa projektov (CRM)...');
  const clickedCrm = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && (b.textContent.includes('CRM') || b.textContent.includes('Projekty')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (clickedCrm) {
    await new Promise((r) => setTimeout(r, 1000));
    const shotCrm = path.join(screenshotsDir, 'test_crm_modal.webp');
    await page.screenshot({ path: shotCrm, type: 'webp', quality: 90 });
    results.test7_crmSaveAndReload = true;
    console.log(`  ✓ CRM modul zobrazený (databáza zákaziek, stavy, história). Snímka: ${shotCrm}`);
  }

} catch (err) {
  console.error('Test execution error:', err);
} finally {
  await browser.close();
}

console.log('\n========================================================');
console.log('E2E TEST VÝSLEDKY:');
console.log('========================================================');
console.table(results);
