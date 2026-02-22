# AdBlocker Chrome Extension — Implementation Session Prompt

## Session Goal
Implement the AdBlocker Chrome Extension from scratch. This is a full implementation session — all files need to be created. The architecture has been designed; follow it exactly.

Read `CLAUDE.md` first before doing anything else. It contains all project conventions.

## What Exists
- `CLAUDE.md` — project conventions (read this first)
- `.claude/PROMPT.md` — this file
- No source files yet — build everything from scratch

---

## Architecture Summary

| Decision | Choice | Reason |
|---|---|---|
| Build framework | WXT | vite-plugin-web-extension deprecated; CRXJS unmaintained mid-2025 |
| Manifest version | MV3 | Required by Chrome Web Store; MV2 is being retired |
| Network blocking | declarativeNetRequest | MV3 mandatory; blocking webRequest not available in MV3 |
| Cosmetic filtering | Content script CSS injection | Service worker cannot touch DOM |
| Filter conversion | @eyeo/abp2dnr at build time | Runtime conversion blocked by CSP |
| Popup UI | Vanilla TypeScript | 3-4 elements don't need a framework |
| Filter lists | EasyList + EasyPrivacy + uBlock (opt-in) | Industry standard ABP-compatible format |

---

## Directory Structure (Target)
```
AdBlocker/
├── CLAUDE.md
├── wxt.config.ts
├── tsconfig.json
├── package.json
├── .gitignore
├── scripts/
│   ├── fetch-filter-lists.ts      # Downloads filter list .txt files
│   ├── convert-to-dnr.ts          # ABP → DNR JSON via @eyeo/abp2dnr
│   └── generate-cosmetic-css.ts   # Cosmetic ## rules → CSS file
├── filter-lists/
│   └── sources/                   # gitignored — fetched at build time
│       ├── easylist.txt
│       ├── easyprivacy.txt
│       └── ublock-filters.txt
├── public/
│   ├── icons/                     # 16, 32, 48, 128px PNGs
│   ├── rules/                     # generated DNR JSON rulesets
│   │   ├── ruleset-easylist.json
│   │   ├── ruleset-easyprivacy.json
│   │   └── ruleset-ublock.json
│   └── privacy-policy.html
├── assets/styles/
│   ├── popup.css
│   ├── options.css
│   └── cosmetic-hide.css          # generated — generic element hiding
├── entrypoints/
│   ├── background.ts              # service worker
│   ├── content.ts                 # content script for cosmetic filtering
│   ├── popup/
│   │   ├── index.html
│   │   └── index.ts
│   └── options/
│       ├── index.html
│       └── index.ts
└── src/
    ├── types/
    │   └── index.ts               # ExtensionStorage, Message, RulesetId
    ├── constants.ts               # storage keys, ruleset IDs, filter URLs
    └── utils/
        ├── storage.ts             # typed chrome.storage.local wrapper
        ├── messaging.ts           # sendMessage helpers
        ├── stats.ts               # blocked count with debounce
        └── allowlist.ts           # allowlist add/remove with dynamic DNR rules
```

---

## Build Order (Follow Exactly — Do Not Skip Ahead)

### Step 1: Initialize WXT Project
```bash
git init
pnpm dlx wxt@latest init . --template vanilla
pnpm install
pnpm add -D @eyeo/abp2dnr tsx node-fetch @types/node
```
- When WXT prompts for a name, enter: `adblocker`
- When WXT prompts for a template, select: `vanilla` (TypeScript, no framework)

### Step 2: Configure wxt.config.ts
Replace the generated file with:
```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'AdBlocker',
    version: '1.0.0',
    description: 'Fast, privacy-first ad and tracker blocker.',
    permissions: [
      'declarativeNetRequest',
      'declarativeNetRequestFeedback',
      'storage',
      'tabs',
      'scripting',
    ],
    host_permissions: ['<all_urls>'],
    declarative_net_request: {
      rule_resources: [
        { id: 'ruleset-easylist',    enabled: true,  path: 'rules/ruleset-easylist.json' },
        { id: 'ruleset-easyprivacy', enabled: true,  path: 'rules/ruleset-easyprivacy.json' },
        { id: 'ruleset-ublock',      enabled: false, path: 'rules/ruleset-ublock.json' },
      ],
    },
    action: {
      default_popup: 'popup/index.html',
      default_title: 'AdBlocker',
    },
    icons: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  vite: () => ({
    build: { target: 'chrome114' },
  }),
});
```

### Step 3: Type Definitions — src/types/index.ts
```typescript
export interface ExtensionStorage {
  enabled: boolean;
  allowlist: string[];
  blockedCount: number;
  cosmeticRules: Record<string, string[]>;
  customRules: string;
}

export type RulesetId = 'ruleset-easylist' | 'ruleset-easyprivacy' | 'ruleset-ublock';

export type MessageType =
  | 'GET_STATS'
  | 'TOGGLE_ENABLED'
  | 'TOGGLE_DOMAIN'
  | 'GET_RULESET_STATUS';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface StatsResponse {
  blockedCount: number;
  enabled: boolean;
}

export interface RulesetStatusResponse {
  enabledRulesets: RulesetId[];
}
```

### Step 4: Constants — src/constants.ts
```typescript
export const STORAGE_KEYS = {
  ENABLED: 'enabled',
  ALLOWLIST: 'allowlist',
  BLOCKED_COUNT: 'blockedCount',
  COSMETIC_RULES: 'cosmeticRules',
  CUSTOM_RULES: 'customRules',
} as const;

export const RULESET_IDS = {
  EASYLIST: 'ruleset-easylist',
  EASYPRIVACY: 'ruleset-easyprivacy',
  UBLOCK: 'ruleset-ublock',
} as const;

export const FILTER_URLS = {
  EASYLIST: 'https://easylist.to/easylist/easylist.txt',
  EASYPRIVACY: 'https://easylist.to/easylist/easyprivacy.txt',
  UBLOCK: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
} as const;

// DNR rule ID ranges — must not overlap
export const RULE_ID_RANGES = {
  EASYLIST_START: 1,
  EASYLIST_END: 24_999,
  EASYPRIVACY_START: 25_000,
  EASYPRIVACY_END: 29_999,
  UBLOCK_START: 30_000,
  UBLOCK_END: 54_999,
  ALLOWLIST_START: 100_000,
  ALLOWLIST_END: 100_999,
  CUSTOM_START: 101_000,
  CUSTOM_END: 131_000,
} as const;
```

### Step 5: Shared Utilities

**src/utils/storage.ts** — typed chrome.storage.local wrapper:
```typescript
import type { ExtensionStorage } from '../types/index.js';

export async function storageGet<K extends keyof ExtensionStorage>(
  key: K
): Promise<ExtensionStorage[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as ExtensionStorage[K] | undefined;
}

export async function storageSet<K extends keyof ExtensionStorage>(
  key: K,
  value: ExtensionStorage[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
```

**src/utils/messaging.ts** — sendMessage helper:
```typescript
import type { Message } from '../types/index.js';

export function sendMessage<T>(msg: Message): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}
```

**src/utils/stats.ts** — debounced blocked count increment:
```typescript
import { storageGet, storageSet } from './storage.js';

let pending = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export function incrementBlockedCount(): void {
  pending++;
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    const current = (await storageGet('blockedCount')) ?? 0;
    await storageSet('blockedCount', current + pending);
    pending = 0;
  }, 1000);
}
```

**src/utils/allowlist.ts** — allowlist domain management:
```typescript
import { storageGet, storageSet } from './storage.js';
import { RULE_ID_RANGES } from '../constants.js';

function getAllowlistRuleId(domain: string): number {
  // deterministic ID from domain hash, within ALLOWLIST range
  let hash = 0;
  for (const char of domain) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const range = RULE_ID_RANGES.ALLOWLIST_END - RULE_ID_RANGES.ALLOWLIST_START;
  return RULE_ID_RANGES.ALLOWLIST_START + (hash % range);
}

export async function addToAllowlist(domain: string): Promise<void> {
  const list = (await storageGet('allowlist')) ?? [];
  if (list.includes(domain)) return;
  await storageSet('allowlist', [...list, domain]);
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: getAllowlistRuleId(domain),
      priority: 1000,
      action: { type: 'allow' },
      condition: { requestDomains: [domain] },
    }],
    removeRuleIds: [],
  });
}

export async function removeFromAllowlist(domain: string): Promise<void> {
  const list = (await storageGet('allowlist')) ?? [];
  await storageSet('allowlist', list.filter(d => d !== domain));
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [],
    removeRuleIds: [getAllowlistRuleId(domain)],
  });
}

export async function isAllowlisted(domain: string): Promise<boolean> {
  const list = (await storageGet('allowlist')) ?? [];
  return list.includes(domain);
}
```

### Step 6: Build Scripts

**scripts/fetch-filter-lists.ts:**
- Download EasyList, EasyPrivacy, and uBlock filter `.txt` files using `node-fetch`
- Save to `filter-lists/sources/`
- Log file size after each download

**scripts/convert-to-dnr.ts:**
- Read each `.txt` file line by line
- Call `@eyeo/abp2dnr`'s `convertFilter()` on each filter line
- Separate network rules (write as DNR JSON to `public/rules/ruleset-*.json`) from cosmetic rules (`##` selector lines — write separately for the CSS generator)
- Assign IDs from the range constants in `src/constants.ts`
- Log total rule count and skipped lines per list

**scripts/generate-cosmetic-css.ts:**
- Read the cosmetic selectors extracted in the previous step
- Deduplicate selectors
- Output `assets/styles/cosmetic-hide.css`:
  ```css
  /* Generated — do not edit manually */
  selector1,
  selector2 { display: none !important; }
  ```
- Warn and truncate if output exceeds 1MB

### Step 7: Service Worker — entrypoints/background.ts

```typescript
import { defineBackground } from 'wxt/sandbox';
import { incrementBlockedCount } from '../src/utils/stats.js';
import { addToAllowlist, removeFromAllowlist, isAllowlisted } from '../src/utils/allowlist.js';
import { storageGet, storageSet } from '../src/utils/storage.js';
import { RULESET_IDS } from '../src/constants.js';
import type { Message, StatsResponse, RulesetStatusResponse } from '../src/types/index.js';

export default defineBackground(() => {
  // Initialize storage on install
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      await chrome.storage.local.set({
        enabled: true,
        allowlist: [],
        blockedCount: 0,
        cosmeticRules: {},
        customRules: '',
      });
    }
  });

  // Count blocked requests
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(() => {
    incrementBlockedCount();
  });

  // Message routing
  chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
    handleMessage(msg).then(sendResponse).catch(console.error);
    return true; // required for async response
  });
});

async function handleMessage(msg: Message): Promise<unknown> {
  switch (msg.type) {
    case 'GET_STATS': {
      const blockedCount = (await storageGet('blockedCount')) ?? 0;
      const enabled = (await storageGet('enabled')) ?? true;
      return { blockedCount, enabled } satisfies StatsResponse;
    }
    case 'TOGGLE_ENABLED': {
      const enabled = (await storageGet('enabled')) ?? true;
      const next = !enabled;
      await storageSet('enabled', next);
      const allRulesets = Object.values(RULESET_IDS);
      if (next) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: allRulesets,
          disableRulesetIds: [],
        });
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: [],
          disableRulesetIds: allRulesets,
        });
      }
      return { enabled: next };
    }
    case 'TOGGLE_DOMAIN': {
      const domain = msg.payload as string;
      const allowlisted = await isAllowlisted(domain);
      if (allowlisted) {
        await removeFromAllowlist(domain);
      } else {
        await addToAllowlist(domain);
      }
      return { allowlisted: !allowlisted };
    }
    case 'GET_RULESET_STATUS': {
      const enabledRulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
      return { enabledRulesets } satisfies RulesetStatusResponse;
    }
    default:
      throw new Error(`Unknown message type: ${(msg as Message).type}`);
  }
}
```

### Step 8: Content Script — entrypoints/content.ts

```typescript
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main() {
    const hostname = window.location.hostname;
    const result = await chrome.storage.local.get('cosmeticRules');
    const cosmeticRules = result['cosmeticRules'] as Record<string, string[]> | undefined;
    const siteRules = cosmeticRules?.[hostname] ?? [];
    if (siteRules.length === 0) return;
    const style = document.createElement('style');
    style.textContent = siteRules.join(', ') + ' { display: none !important; }';
    document.documentElement.appendChild(style);
  },
});
```

Note: the generic `cosmetic-hide.css` is injected via the `content_scripts.css` field in the manifest (WXT handles this). The content script above handles site-specific rules only.

### Step 9: Popup — entrypoints/popup/

**index.html** skeleton:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AdBlocker</title>
  <link rel="stylesheet" href="/assets/styles/popup.css">
</head>
<body>
  <div id="app">
    <header>
      <img src="/icons/icon48.png" alt="AdBlocker" width="32" height="32">
      <h1>AdBlocker</h1>
    </header>
    <section class="stats">
      <span id="blocked-count">–</span>
      <label>ads blocked</label>
    </section>
    <section class="controls">
      <div class="toggle-row">
        <label for="toggle-enabled">Enabled</label>
        <button id="toggle-enabled" class="toggle" aria-pressed="true"></button>
      </div>
      <div class="domain-row">
        <span id="current-domain"></span>
        <button id="btn-allowlist">Pause on this site</button>
      </div>
    </section>
    <footer>
      <button id="btn-options">Settings</button>
    </footer>
  </div>
  <script type="module" src="./index.ts"></script>
</body>
</html>
```

**index.ts** — pure TypeScript, no framework:
- Query current tab domain via `chrome.tabs.query({ active: true, currentWindow: true })`
- Send `GET_STATS` to background, update `#blocked-count` and toggle button state
- `#toggle-enabled` click → send `TOGGLE_ENABLED`, update aria-pressed and icon
- `#btn-allowlist` click → send `TOGGLE_DOMAIN` with domain, update button label
- `#btn-options` click → `chrome.runtime.openOptionsPage()`

### Step 10: Options Page — entrypoints/options/

**index.html** sections:
1. Filter Lists — checkboxes for each ruleset (EasyList on by default, EasyPrivacy on by default, uBlock off by default)
2. Allowlist — textarea listing allowlisted domains, Save button, Remove buttons
3. Custom Rules — textarea for user-defined ABP filter lines
4. Stats — total blocked count, Reset button

**index.ts:**
- On load: `chrome.declarativeNetRequest.getEnabledRulesets()` → check ruleset checkboxes
- Ruleset checkbox change → `chrome.declarativeNetRequest.updateEnabledRulesets()`
- Allowlist textarea: read from `chrome.storage.local.allowlist`, save changes and sync dynamic DNR rules
- Custom rules textarea: on Save, parse each line and apply as dynamic DNR rules (use `chrome.declarativeNetRequest.updateDynamicRules()`)
- Stats reset: set `blockedCount = 0` in storage

### Step 11: Icons
Create placeholder icons at `public/icons/`:
- `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
- `icon-disabled.png` (greyed out version for when extension is paused)

If no design tool is available, generate simple solid-color PNGs programmatically with a build script or use any valid PNG files for now.

### Step 12: Privacy Policy
Create `public/privacy-policy.html` with content stating:
- No personal data is collected
- All filter lists are bundled with the extension — no runtime network requests
- No data is shared with third parties
- Contact information (placeholder)

### Step 13: package.json Scripts
Ensure `package.json` contains:
```json
{
  "scripts": {
    "dev": "wxt",
    "build": "pnpm run fetch-filters && pnpm run convert-filters && wxt build",
    "build:prod": "pnpm run build && wxt zip",
    "fetch-filters": "tsx scripts/fetch-filter-lists.ts",
    "convert-filters": "tsx scripts/convert-to-dnr.ts && tsx scripts/generate-cosmetic-css.ts",
    "typecheck": "tsc --noEmit",
    "postinstall": "wxt prepare"
  }
}
```

### Step 14: .gitignore
```
node_modules/
.output/
filter-lists/sources/
public/rules/
assets/styles/cosmetic-hide.css
*.zip
```

### Step 15: Run the Build
```bash
pnpm fetch-filters
pnpm convert-filters
pnpm build
```
Verify `.output/chrome-mv3/` exists with `manifest.json`, `background.js`, `content.js`, `popup/`, `options/`, `rules/`, `icons/`.

### Step 16: Validate in Chrome
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" → select `.output/chrome-mv3/`
4. Visit a site with ads → check DevTools Network tab for blocked requests (shown as cancelled)
5. Open popup → verify count displays and toggle works
6. Open options → verify ruleset toggles and allowlist save

### Step 17: Commit
```bash
git add CLAUDE.md wxt.config.ts tsconfig.json package.json pnpm-lock.yaml \
  src/ entrypoints/ scripts/ public/icons/ public/privacy-policy.html \
  assets/styles/popup.css assets/styles/options.css .gitignore
git commit -m 'feat: initial AdBlocker extension implementation'
```
Do NOT add generated files (`public/rules/`, `assets/styles/cosmetic-hide.css`, `filter-lists/sources/`).

---

## Key Implementation Notes

### @eyeo/abp2dnr Usage
```typescript
import { convertFilter } from '@eyeo/abp2dnr';

const result = await convertFilter(filterLine);
// result.rules — DNR rule objects to add to the ruleset JSON
// result.errors — any parse errors (log and skip)
```

### Async Message Response Pattern (Background)
```typescript
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(console.error);
  return true; // MUST return true to keep channel open for async response
});
```

### Allowlist Priority
Allowlist dynamic rules must have `priority: 1000` or higher. Static DNR blocking rules default to priority 1. Without higher priority, the allow rule won't override the block rules.

### Cosmetic CSS Size
If `cosmetic-hide.css` exceeds 1MB: deduplicate selectors, then prioritize EasyList over uBlock selectors, then drop low-frequency selectors.

### DNR Rule ID Uniqueness
Rule IDs must be unique across all rulesets (static + dynamic combined).
- EasyList static: IDs 1–24,999
- EasyPrivacy static: IDs 25,000–29,999
- uBlock static: IDs 30,000–54,999
- Allowlist dynamic: IDs 100,000–100,999
- Custom rules dynamic: IDs 101,000–131,000

---

## When Complete
- All files created and building without errors
- Extension loads in Chrome with no service worker errors
- Popup and options page are functional
- At least one ad request is visibly blocked in DevTools Network
- All code committed to git (ask before pushing)
