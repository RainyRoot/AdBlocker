import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const COSMETIC_TMP  = join(process.cwd(), 'filter-lists', 'cosmetic-selectors.json');
const STYLES_DIR    = join(process.cwd(), 'assets', 'styles');
const OUT_CSS       = join(STYLES_DIR, 'cosmetic-hide.css');
const MAX_BYTES     = 1_000_000; // 1 MB limit

mkdirSync(STYLES_DIR, { recursive: true });

const selectors: string[] = JSON.parse(readFileSync(COSMETIC_TMP, 'utf8'));

if (selectors.length === 0) {
  writeFileSync(OUT_CSS, '/* Generated — no cosmetic selectors */\n', 'utf8');
  console.log('No cosmetic selectors found.');
  process.exit(0);
}

const header = '/* Generated — do not edit manually */\n';
const suffix = ' { display: none !important; }\n';

// Build CSS incrementally, respecting the size budget
const kept: string[] = [];
let byteCount = Buffer.byteLength(header, 'utf8');

for (const sel of selectors) {
  const chunk = Buffer.byteLength(sel + ',\n', 'utf8');
  if (byteCount + chunk + Buffer.byteLength(suffix, 'utf8') > MAX_BYTES) {
    console.warn(`⚠ Size limit reached at ${kept.length} selectors — truncating.`);
    break;
  }
  kept.push(sel);
  byteCount += chunk;
}

const css = header + kept.join(',\n') + suffix;
writeFileSync(OUT_CSS, css, 'utf8');

const kb = (Buffer.byteLength(css, 'utf8') / 1024).toFixed(1);
console.log(`✓ cosmetic-hide.css  ${kb} KB  (${kept.length} selectors)`);
