import fetch from 'node-fetch';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SOURCES_DIR = join(process.cwd(), 'filter-lists', 'sources');

const LISTS = [
  { name: 'easylist',       url: 'https://easylist.to/easylist/easylist.txt' },
  { name: 'easyprivacy',    url: 'https://easylist.to/easylist/easyprivacy.txt' },
  { name: 'ublock-filters', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt' },
];

mkdirSync(SOURCES_DIR, { recursive: true });

for (const list of LISTS) {
  console.log(`Fetching ${list.name}...`);
  try {
    const res = await fetch(list.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const outPath = join(SOURCES_DIR, `${list.name}.txt`);
    writeFileSync(outPath, text, 'utf8');
    const kb = (Buffer.byteLength(text, 'utf8') / 1024).toFixed(1);
    console.log(`  ✓ ${list.name}.txt  ${kb} KB  (${text.split('\n').length} lines)`);
  } catch (err) {
    console.error(`  ✗ Failed to fetch ${list.name}: ${err}`);
    process.exit(1);
  }
}

console.log('\nAll filter lists downloaded.');
