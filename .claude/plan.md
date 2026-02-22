# AdBlocker — Implementation Plan

Stack: WXT + TypeScript (strict) + pnpm + Chrome MV3 + declarativeNetRequest

---

## Step 1: Init project
```bash
git init
pnpm dlx wxt@latest init . --template vanilla
pnpm install
pnpm add -D @eyeo/abp2dnr tsx node-fetch @types/node
```
Name: `adblocker`, template: `vanilla`

---

## Step 2: Config files
- **wxt.config.ts** — manifest name/version/description, permissions (`declarativeNetRequest`, `declarativeNetRequestFeedback`, `storage`, `tabs`, `scripting`), `host_permissions: <all_urls>`, 3 DNR rule_resources (easylist+easyprivacy enabled, ublock disabled), popup action, icons 16/32/48/128
- **tsconfig.json** — strict:true, moduleResolution:bundler, target:ES2020
- **package.json scripts** — `dev`, `build` (fetch→convert→wxt build), `build:prod`, `fetch-filters`, `convert-filters`, `typecheck`, `postinstall: wxt prepare`
- **.gitignore** — `node_modules/ .output/ filter-lists/sources/ public/rules/ assets/styles/cosmetic-hide.css *.zip`

---

## Step 3: Types & constants
**src/types/index.ts** — `ExtensionStorage` interface (enabled, allowlist, blockedCount, cosmeticRules, customRules), `RulesetId` union, `MessageType` union (GET_STATS, TOGGLE_ENABLED, TOGGLE_DOMAIN, GET_RULESET_STATUS), `Message`, `StatsResponse`, `RulesetStatusResponse`

**src/constants.ts** — `STORAGE_KEYS`, `RULESET_IDS`, `FILTER_URLS` (easylist/easyprivacy/ublock CDN URLs), `RULE_ID_RANGES` (easylist:1-24999, easyprivacy:25000-29999, ublock:30000-54999, allowlist:100000-100999, custom:101000-131000)

---

## Step 4: Shared utilities
- **src/utils/storage.ts** — `storageGet<K>(key)` / `storageSet<K>(key, val)` typed wrappers for `chrome.storage.local`
- **src/utils/messaging.ts** — `sendMessage<T>(msg: Message): Promise<T>`
- **src/utils/stats.ts** — `incrementBlockedCount()` with 1s debounce, accumulates pending count then writes to storage atomically
- **src/utils/allowlist.ts** — `addToAllowlist`, `removeFromAllowlist`, `isAllowlisted`; domain→rule ID via hash (`hash = (hash*31 + charCode) >>> 0`) within ALLOWLIST range; dynamic DNR rules use `priority: 1000`

---

## Step 5: Build scripts
**scripts/fetch-filter-lists.ts** — fetch EasyList, EasyPrivacy, uBlock `.txt` via node-fetch → save to `filter-lists/sources/`, log sizes

**scripts/convert-to-dnr.ts** — for each filter list: read line-by-line, call `convertFilter(line)` from `@eyeo/abp2dnr`, collect `.rules` (DNR) vs cosmetic (`##` lines), assign IDs from RULE_ID_RANGES, write `public/rules/ruleset-*.json`, save cosmetic selectors to temp JSON for next script

**scripts/generate-cosmetic-css.ts** — read cosmetic selectors temp file, deduplicate, write `assets/styles/cosmetic-hide.css` (`selector1, selector2 { display: none !important; }`), warn+truncate if >1MB

---

## Step 6: Background service worker
**entrypoints/background.ts** — `defineBackground(() => { ... })`
- `onInstalled`: init storage defaults (enabled:true, allowlist:[], blockedCount:0, cosmeticRules:{}, customRules:'')
- `declarativeNetRequest.onRuleMatchedDebug`: call `incrementBlockedCount()`
- `runtime.onMessage`: route to `handleMessage(msg)`, `return true` for async
- `handleMessage`: switch on `msg.type` → GET_STATS / TOGGLE_ENABLED (updateEnabledRulesets all on/off) / TOGGLE_DOMAIN (add/remove allowlist) / GET_RULESET_STATUS

---

## Step 7: Content script
**entrypoints/content.ts** — `defineContentScript({ matches:['<all_urls>'], runAt:'document_start' })` — read `cosmeticRules[hostname]` from storage, if any inject `<style>` with `selectors { display:none !important }` into `document.documentElement`

---

## Step 8: Popup
**entrypoints/popup/index.html** — header (icon48 + h1), stats section (`#blocked-count`), controls (toggle button `#toggle-enabled` + `#btn-allowlist` + `#current-domain`), footer (`#btn-options`)

**entrypoints/popup/index.ts** — `tabs.query` for domain → `GET_STATS` → update count + toggle aria-pressed; toggle click → `TOGGLE_ENABLED`; allowlist btn → `TOGGLE_DOMAIN` + update label; options btn → `openOptionsPage()`

---

## Step 9: Options page
**entrypoints/options/index.html** — 4 sections: Filter Lists (3 checkboxes), Allowlist (list + add/remove), Custom Rules (textarea + save), Stats (count + reset btn)

**entrypoints/options/index.ts** — on load: `getEnabledRulesets()` → check boxes; checkbox change → `updateEnabledRulesets()`; allowlist save → sync storage + dynamic DNR; custom rules save → parse lines + `updateDynamicRules()` with IDs in CUSTOM range; reset → set blockedCount:0

---

## Step 10: Assets & finish
- **public/icons/** — generate placeholder PNGs (icon16/32/48/128.png) programmatically via script or any valid PNGs
- **assets/styles/popup.css** + **options.css** — minimal styling
- **public/privacy-policy.html** — no data collected, filters bundled at build time, no third-party sharing
- Run `pnpm fetch-filters && pnpm convert-filters && pnpm build`, verify `.output/chrome-mv3/` has manifest.json + background.js + content.js + popup/ + options/ + rules/ + icons/
- Commit: `git add` all non-generated files → `git commit -m 'feat: initial AdBlocker extension implementation'`
