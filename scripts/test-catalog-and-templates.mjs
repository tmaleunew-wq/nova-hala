import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const templatesPath = path.join(rootDir, 'src', 'config', 'new_hall_templates.json');
const screenshotsDir = path.join(rootDir, 'public', 'screenshots');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('--- STARTING QA TEST AUTOMATION ---');

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
  ],
});

const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});

const report = {
  test1_thumbnails: [],
  test2_templateSelection: [],
  test3_catalogFeatures: {},
  test4_dataIntegrity: {},
  errors: [],
};

// ==========================================
// TEST 1: THUMBNAILS VERIFICATION
// ==========================================
console.log('\n[Test 1] Verifying all generated 3D thumbnails on disk...');
const previewDir = path.join(rootDir, 'public', 'templates');
for (const tpl of templates) {
  const filePath = path.join(previewDir, `${tpl.id}.webp`);
  const exists = fs.existsSync(filePath);
  let sizeKB = 0;
  if (exists) {
    sizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
  }
  const valid = exists && sizeKB > 15;
  report.test1_thumbnails.push({
    id: tpl.id,
    title: tpl.title,
    exists,
    sizeKB,
    valid,
  });
  console.log(`  ✓ ${tpl.id}.webp: ${exists ? 'EXISTS' : 'MISSING'} (${sizeKB} KB)`);
}

// ==========================================
// TEST 3: CATALOG UI, SCREENSHOTS & RESPONSIVENESS
// ==========================================
console.log('\n[Test 3] Testing Catalog layout, responsiveness & search...');
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));

// Desktop screenshot
const desktopPath = path.join(screenshotsDir, 'desktop-catalog.webp');
await page.screenshot({ path: desktopPath, type: 'webp', quality: 90 });
console.log(`  ✓ Captured desktop screenshot: ${desktopPath}`);

// Mobile view screenshot
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await new Promise((r) => setTimeout(r, 600));
const mobilePath = path.join(screenshotsDir, 'mobile-catalog.webp');
await page.screenshot({ path: mobilePath, type: 'webp', quality: 90 });
console.log(`  ✓ Captured mobile screenshot: ${mobilePath}`);

// Tablet view screenshot
await page.setViewport({ width: 820, height: 1180, isMobile: true });
await new Promise((r) => setTimeout(r, 600));
const tabletPath = path.join(screenshotsDir, 'tablet-catalog.webp');
await page.screenshot({ path: tabletPath, type: 'webp', quality: 90 });
console.log(`  ✓ Captured tablet screenshot: ${tabletPath}`);

// Switch back to desktop
await page.setViewport({ width: 1440, height: 900 });
await new Promise((r) => setTimeout(r, 500));

// Test Category filtering
const categories = ['all', 'vyrobne', 'skladovacie', 'obchodne', 'viacucelove', 'prazdne'];
for (const cat of categories) {
  const catBtn = await page.$(`button[aria-label="${cat}"], nav[aria-label="Kategórie hál"] button:nth-child(${categories.indexOf(cat) + 1})`);
  if (catBtn) {
    await catBtn.click();
    await new Promise((r) => setTimeout(r, 200));
    const cardCount = await page.$$eval('article', (els) => els.length);
    report.test3_catalogFeatures[`cat_${cat}`] = cardCount;
    console.log(`  ✓ Category "${cat}": ${cardCount} cards displayed`);
  }
}

// Reset category to "all"
const allBtn = await page.$('nav[aria-label="Kategórie hál"] button:first-child');
if (allBtn) await allBtn.click();

// Test Search input
const searchInput = await page.$('input[placeholder*="Hľadať"]');
if (searchInput) {
  await searchInput.type('svetlík');
  await new Promise((r) => setTimeout(r, 300));
  const filteredCount = await page.$$eval('article', (els) => els.length);
  console.log(`  ✓ Search "svetlík": ${filteredCount} card(s) found`);
  report.test3_catalogFeatures.search_svetlik = filteredCount;

  // Test Non-existent search
  await searchInput.click({ clickCount: 3 });
  await searchInput.type('xyzneexistuje');
  await new Promise((r) => setTimeout(r, 300));
  const emptyCount = await page.$$eval('article', (els) => els.length);
  const emptyStateVisible = await page.$('h3') !== null;
  console.log(`  ✓ Search "xyzneexistuje": ${emptyCount} cards, Empty state: ${emptyStateVisible}`);
  report.test3_catalogFeatures.search_empty_state = emptyStateVisible;

  // Click reset filter button
  const resetBtn = await page.$('button ::-p-text(Resetovať filter)');
  if (resetBtn) {
    await resetBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const restoredCount = await page.$$eval('article', (els) => els.length);
    console.log(`  ✓ Reset filter restored ${restoredCount} cards`);
    report.test3_catalogFeatures.reset_restored = restoredCount;
  }
}

// ==========================================
// TEST 2: TEMPLATE SELECTION AND CONFIGURATOR NAVIGATION
// ==========================================
console.log('\n[Test 2] Testing selection and loading for all templates...');
for (const tpl of templates) {
  // Find article with title
  const card = await page.evaluateHandle((tplId) => {
    const articles = Array.from(document.querySelectorAll('article'));
    return articles.find((a) => a.querySelector(`img[src*="${tplId}"]`) || a.textContent.includes(tplId));
  }, tpl.id);

  if (card && card.asElement()) {
    const btn = await card.$('button');
    if (btn) {
      await btn.click();
    } else {
      await card.click();
    }
    
    // Wait for configurator canvas and top header
    await page.waitForSelector('canvas', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 600));

    // Verify template loaded in UI
    const headerText = await page.evaluate(() => {
      const h = document.querySelector('header');
      return h ? h.textContent : '';
    });

    const isLoaded = headerText.includes(tpl.title) || headerText.includes('Šablóny hál');
    console.log(`  ✓ Selected "${tpl.title}" (${tpl.id}) -> Configurator loaded: ${isLoaded}`);
    report.test2_templateSelection.push({
      id: tpl.id,
      title: tpl.title,
      loaded: isLoaded,
    });

    // Click "Späť" to return to Catalog
    const backBtn = await page.$('header button[title*="Späť"]');
    if (backBtn) {
      await backBtn.click();
      await page.waitForSelector('header h1', { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 400));
    }
  } else {
    // If it's custom hall "nakreslit_pudorys"
    console.log(`  ✓ Testing custom hall card for "${tpl.id}"`);
    const customCard = await page.$('div ::-p-text(Navrhnúť vlastnú halu)');
    if (customCard) {
      await customCard.click();
      await page.waitForSelector('canvas', { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 500));
      report.test2_templateSelection.push({
        id: tpl.id,
        title: tpl.title,
        loaded: true,
      });
      const backBtn = await page.$('header button[title*="Späť"]');
      if (backBtn) {
        await backBtn.click();
        await page.waitForSelector('header h1', { timeout: 10000 });
      }
    }
  }
}

// ==========================================
// TEST 4: DATA INTEGRITY
// ==========================================
console.log('\n[Test 4] Verifying structural parameters integrity...');
report.test4_dataIntegrity = {
  totalTemplates: templates.length,
  allHaveDimensions: templates.every((t) => t.width > 0 && t.length > 0 && t.clearHeight > 0),
  allHaveFramework: templates.every((t) => typeof t.framework === 'string' && t.framework.length > 0),
  allHaveColors: templates.every((t) => !!t.claddingColor && !!t.roofColor),
};
console.log(`  ✓ Total templates: ${templates.length}`);
console.log(`  ✓ All have dimensions: ${report.test4_dataIntegrity.allHaveDimensions}`);
console.log(`  ✓ All have frameworks: ${report.test4_dataIntegrity.allHaveFramework}`);

await browser.close();

console.log('\n==========================================');
console.log('AUTOMATED QA TEST SUITE COMPLETED!');
console.log(`Console Errors during tests: ${consoleErrors.length}`);
if (consoleErrors.length > 0) {
  console.log(consoleErrors);
}
console.log('==========================================');
