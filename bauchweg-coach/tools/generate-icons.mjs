// Rendert public/icons/icon.svg als PNG in den benötigten Größen.
// Aufruf: node tools/generate-icons.mjs
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = await readFile(path.join(root, 'public/icons/icon.svg'), 'utf8');

const sizes = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 180, file: 'apple-touch-icon.png' },
];

// In der Remote-Umgebung liegt ein vorinstalliertes Chromium unter /opt/pw-browsers.
import { existsSync } from 'node:fs';
const executablePath = existsSync('/opt/pw-browsers/chromium')
  ? '/opt/pw-browsers/chromium'
  : undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
for (const { size, file } of sizes) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>*{margin:0}</style><div style="width:${size}px;height:${size}px">${svg.replace(
      '<svg ',
      `<svg width="${size}" height="${size}" `,
    )}</div>`,
  );
  await page.screenshot({
    path: path.join(root, 'public/icons', file),
    omitBackground: true,
  });
  await page.close();
  console.log(`erzeugt: ${file} (${size}px)`);
}
await browser.close();
