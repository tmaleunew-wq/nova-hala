import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const templatesPath = path.join(rootDir, 'src', 'config', 'new_hall_templates.json');
const outputDir = path.join(rootDir, 'public', 'templates');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

console.log(`Found ${templates.length} templates. Starting browser...`);

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
    '--ignore-gpu-blocklist',
  ],
  defaultViewport: {
    width: 1400,
    height: 1000,
    deviceScaleFactor: 1,
  },
});

const page = await browser.newPage();
const results = [];

for (const tpl of templates) {
  console.log(`\nRendering 3D preview for: ${tpl.title} (${tpl.id})...`);
  
  const url = `http://localhost:8080/render-previews?template=${tpl.id}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  await page.waitForSelector(`#preview-canvas-wrapper[data-ready="true"][data-template="${tpl.id}"]`, {
    timeout: 30000,
  });

  await new Promise((r) => setTimeout(r, 650));

  const wrapper = await page.$('#preview-canvas-wrapper');
  if (!wrapper) {
    throw new Error(`Wrapper element not found for ${tpl.id}`);
  }

  const outputPath = path.join(outputDir, `${tpl.id}.webp`);
  
  await wrapper.screenshot({
    path: outputPath,
    type: 'webp',
    quality: 92,
  });

  const stat = fs.statSync(outputPath);
  console.log(`Saved: ${outputPath} (${(stat.size / 1024).toFixed(1)} KB)`);
  results.push({ id: tpl.id, title: tpl.title, sizeKB: (stat.size / 1024).toFixed(1), success: stat.size > 5000 });
}

await browser.close();

console.log('\n--- ALL 10 PREVIEWS GENERATED SUCCESSFULLY ---');
console.table(results);
