/**
 * ABP filter list → Chrome Declarative Net Request JSON converter.
 * Pure TypeScript, no native dependencies.
 *
 * Handles:
 *   - Network blocking rules:  ||example.com^  |https://...  bare patterns
 *   - Exception rules:         @@||example.com^
 *   - Options:                 $domain=,third-party,script,image,xmlhttprequest,stylesheet,font,media,websocket,ping
 *   - Cosmetic rules:          ##selector  (extracted for CSS generator)
 *   - Skips:                   comments, element-hiding exceptions, unsupported options
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── Types ──────────────────────────────────────────────────────────────────

interface DnrRule {
  id: number;
  priority: number;
  action: { type: string };
  condition: {
    urlFilter?: string;
    regexFilter?: string;
    isUrlFilterCaseSensitive?: boolean;
    resourceTypes?: string[];
    excludedResourceTypes?: string[];
    domainType?: string;
    requestDomains?: string[];
    excludedRequestDomains?: string[];
    initiatorDomains?: string[];
    excludedInitiatorDomains?: string[];
  };
}

interface ConversionResult {
  rules: DnrRule[];
  cosmeticSelectors: string[];
  skipped: number;
  errors: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const RESOURCE_TYPE_MAP: Record<string, string> = {
  script:           'script',
  image:            'image',
  stylesheet:       'stylesheet',
  object:           'object',
  xmlhttprequest:   'xmlhttprequest',
  media:            'media',
  font:             'font',
  websocket:        'websocket',
  ping:             'ping',
  subdocument:      'sub_frame',
  document:         'main_frame',
  other:            'other',
};

const ALL_RESOURCE_TYPES = Object.values(RESOURCE_TYPE_MAP);

// ── Option parser ──────────────────────────────────────────────────────────

interface ParsedOptions {
  thirdParty?: boolean;       // true = third-party only, false = first-party only
  domains?: string[];         // ~domain = excluded, plain = included
  excludedDomains?: string[];
  resourceTypes?: string[];
  excludedResourceTypes?: string[];
  isException: boolean;
  unsupported: boolean;
}

function parseOptions(optStr: string, isException: boolean): ParsedOptions {
  const result: ParsedOptions = { isException, unsupported: false };
  const includedTypes: string[] = [];
  const excludedTypes: string[] = [];
  const includedDomains: string[] = [];
  const excludedDomains: string[] = [];

  for (const opt of optStr.split(',')) {
    const o = opt.trim().toLowerCase();
    if (!o) continue;

    if (o === 'third-party')  { result.thirdParty = true;  continue; }
    if (o === '~third-party') { result.thirdParty = false; continue; }
    if (o === 'first-party')  { result.thirdParty = false; continue; }
    if (o === '~first-party') { result.thirdParty = true;  continue; }

    if (o.startsWith('domain=')) {
      for (const d of o.slice(7).split('|')) {
        if (d.startsWith('~')) excludedDomains.push(d.slice(1));
        else includedDomains.push(d);
      }
      continue;
    }

    // Unsupported options that cannot be expressed in DNR
    if (['sitekey', 'rewrite', 'csp', 'webrtc', 'generichide',
         'genericblock', 'elemhide', 'content', 'popunder', 'popup'].includes(o)) {
      result.unsupported = true;
      return result;
    }

    const negated = o.startsWith('~');
    const typeName = negated ? o.slice(1) : o;
    const dnrType = RESOURCE_TYPE_MAP[typeName];
    if (dnrType) {
      if (negated) excludedTypes.push(dnrType);
      else includedTypes.push(dnrType);
    }
    // unknown options: skip silently (e.g. "important", "redirect", etc.)
  }

  if (includedTypes.length)  result.resourceTypes         = includedTypes;
  if (excludedTypes.length)  result.excludedResourceTypes = excludedTypes;
  if (includedDomains.length)  result.domains         = includedDomains;
  if (excludedDomains.length)  result.excludedDomains = excludedDomains;

  return result;
}

// ── URL pattern → DNR urlFilter ───────────────────────────────────────────

function abpPatternToDnr(pattern: string): string | null {
  // Regex filters are not safe to convert without Chrome's isRegexSupported
  if (pattern.startsWith('/') && pattern.endsWith('/')) return null;

  // DNR urlFilter syntax is close to ABP — just needs a few adjustments:
  // ABP '^' (separator) → DNR '^' (already compatible)
  // ABP '||' (domain anchor) → DNR '||' (already compatible)
  // ABP '|' (start anchor) → DNR '|' (already compatible)
  // ABP '*' (wildcard) → DNR '*' (already compatible)

  // Reject patterns that are suspiciously short (would block too broadly)
  if (pattern.replace(/[|^*]/g, '').length < 4) return null;

  return pattern;
}

// ── Core converter ─────────────────────────────────────────────────────────

function convertLine(line: string, nextId: number): {
  rule?: DnrRule;
  cosmetic?: string;
  skip?: true;
  error?: true;
} {
  const trimmed = line.trim();

  // Skip blanks, comments, and metadata headers
  if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
    return { skip: true };
  }

  // ── Cosmetic filters ──
  // Generic:      ##.selector
  // Domain-bound: example.com##.selector
  // Exception:    #@#  (skip — we can't undo cosmetic rules per-domain in a CSS file)
  if (trimmed.includes('#@#')) return { skip: true };
  const cosmeticMatch = trimmed.match(/^[^#]*##(.+)$/);
  if (cosmeticMatch) {
    const selector = cosmeticMatch[1].trim();
    // Skip scriptlets and extended CSS (uBlock-specific, not safe to inject)
    if (selector.startsWith('+js(') || selector.startsWith('##') ||
        selector.startsWith(':') && !selector.startsWith(':not') &&
        !selector.startsWith(':is') && !selector.startsWith(':has')) {
      return { skip: true };
    }
    return { cosmetic: selector };
  }

  // ── Network filters ──
  const isException = trimmed.startsWith('@@');
  const raw = isException ? trimmed.slice(2) : trimmed;

  // Split off options
  const dollarIdx = raw.lastIndexOf('$');
  let pattern = raw;
  let opts: ParsedOptions = { isException, unsupported: false };

  if (dollarIdx !== -1) {
    const optStr = raw.slice(dollarIdx + 1);
    // Make sure '$' isn't inside a regex or URL (heuristic: no '/' after '$')
    if (!optStr.includes('/')) {
      pattern = raw.slice(0, dollarIdx);
      opts = parseOptions(optStr, isException);
      if (opts.unsupported) return { skip: true };
    }
  }

  const urlFilter = abpPatternToDnr(pattern);
  if (!urlFilter) return { skip: true };

  const condition: DnrRule['condition'] = { urlFilter };

  if (opts.thirdParty === true)  condition.domainType = 'thirdParty';
  if (opts.thirdParty === false) condition.domainType = 'firstParty';

  if (opts.resourceTypes)         condition.resourceTypes         = opts.resourceTypes;
  if (opts.excludedResourceTypes) condition.excludedResourceTypes = opts.excludedResourceTypes;

  if (opts.domains)         condition.initiatorDomains         = opts.domains;
  if (opts.excludedDomains) condition.excludedInitiatorDomains = opts.excludedDomains;

  // Default block rules without resource types get all sub-resource types
  // (excludes main_frame to avoid breaking navigation)
  if (!condition.resourceTypes && !isException) {
    condition.excludedResourceTypes = ['main_frame'];
  }

  const rule: DnrRule = {
    id: nextId,
    priority: isException ? 2 : 1,
    action: { type: isException ? 'allow' : 'block' },
    condition,
  };

  return { rule };
}

// ── Per-list conversion ────────────────────────────────────────────────────

function convertList(
  txtPath: string,
  startId: number,
  maxRules: number
): ConversionResult {
  const text = readFileSync(txtPath, 'utf8');
  const lines = text.split('\n');
  const rules: DnrRule[] = [];
  const cosmeticSelectors: string[] = [];
  let skipped = 0;
  let errors = 0;
  let nextId = startId;

  for (const line of lines) {
    if (rules.length >= maxRules) {
      console.warn(`  ⚠ Rule limit ${maxRules} reached, stopping early`);
      break;
    }
    try {
      const result = convertLine(line, nextId);
      if (result.skip)    { skipped++; continue; }
      if (result.error)   { errors++;  continue; }
      if (result.cosmetic) { cosmeticSelectors.push(result.cosmetic); skipped++; continue; }
      if (result.rule)    { rules.push(result.rule); nextId++; }
    } catch {
      errors++;
    }
  }

  return { rules, cosmeticSelectors, skipped, errors };
}

// ── Main ───────────────────────────────────────────────────────────────────

const RULES_DIR = join(process.cwd(), 'public', 'rules');
const SOURCES_DIR = join(process.cwd(), 'filter-lists', 'sources');
const COSMETIC_TMP = join(process.cwd(), 'filter-lists', 'cosmetic-selectors.json');

mkdirSync(RULES_DIR, { recursive: true });

const lists = [
  { name: 'easylist',    file: 'easylist.txt',       ruleset: 'ruleset-easylist',    startId: 1,      maxRules: 24_999 },
  { name: 'easyprivacy', file: 'easyprivacy.txt',    ruleset: 'ruleset-easyprivacy', startId: 25_000, maxRules: 4_999  },
  { name: 'ublock',      file: 'ublock-filters.txt', ruleset: 'ruleset-ublock',      startId: 30_000, maxRules: 24_999 },
];

const allCosmeticSelectors: string[] = [];

for (const list of lists) {
  const txtPath = join(SOURCES_DIR, list.file);
  console.log(`Converting ${list.name}...`);

  const { rules, cosmeticSelectors, skipped, errors } = convertList(txtPath, list.startId, list.maxRules);

  const outPath = join(RULES_DIR, `${list.ruleset}.json`);
  writeFileSync(outPath, JSON.stringify(rules, null, 2), 'utf8');
  allCosmeticSelectors.push(...cosmeticSelectors);

  console.log(`  ✓ ${rules.length} DNR rules  |  ${cosmeticSelectors.length} cosmetic  |  ${skipped} skipped  |  ${errors} errors`);
}

// Deduplicate and save cosmetic selectors for CSS generator
const unique = [...new Set(allCosmeticSelectors)];
writeFileSync(COSMETIC_TMP, JSON.stringify(unique), 'utf8');
console.log(`\nSaved ${unique.length} unique cosmetic selectors.`);
