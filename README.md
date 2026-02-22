# AdBlocker

A fast, privacy-first ad and tracker blocker for Chrome/Chromium. Built with [WXT](https://wxt.dev) and Manifest V3's `declarativeNetRequest` API — no background page sniffing, no runtime network requests.

## Features

- Blocks ads and trackers via EasyList and EasyPrivacy (bundled at build time)
- Optional uBlock extended filters (opt-in from Options)
- Per-domain allowlist — pause blocking on specific sites
- Custom rules textarea — add your own URL filters
- Blocked request counter
- Cosmetic hiding of ad placeholders via injected CSS

## Building

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Install dependencies

```bash
pnpm install
```

### Full build

```bash
pnpm build
```

This runs three steps in sequence:

1. **`pnpm fetch-filters`** — downloads EasyList, EasyPrivacy, and uBlock filter lists
2. **`pnpm convert-filters`** — converts ABP filter syntax to DNR JSON rules + cosmetic CSS
3. **`wxt build`** — bundles the extension to `.output/chrome-mv3/`

### Development

```bash
pnpm dev
```

Starts WXT in watch mode with hot reload.

### Type checking

```bash
pnpm typecheck
```

## Loading in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `.output/chrome-mv3/`

## Project structure

```
entrypoints/
  background.ts        # Service worker — rule matching, message routing
  content.ts           # Cosmetic CSS injection at document_start
  popup/               # Toolbar popup (HTML + TS)
  options/             # Options page (HTML + TS)
src/
  types/index.ts       # Shared TypeScript interfaces
  constants.ts         # Rule ID ranges, ruleset IDs, filter URLs
  utils/
    storage.ts         # Typed chrome.storage.local wrappers
    messaging.ts       # chrome.runtime.sendMessage wrapper
    stats.ts           # Debounced blocked-count persistence
    allowlist.ts       # Dynamic DNR allowlist rules
scripts/
  fetch-filter-lists.ts    # Downloads .txt filter lists
  convert-to-dnr.ts        # ABP → DNR JSON conversion
  generate-cosmetic-css.ts # Deduplicates cosmetic selectors → CSS
  generate-icons.ts        # Generates placeholder PNG icons
public/
  icons/               # Extension icons (16, 32, 48, 128px)
  privacy-policy.html
assets/styles/
  popup.css
  options.css
```

## Rule budget

| Ruleset     | Limit  | Default |
|-------------|--------|---------|
| EasyList    | 24,999 | enabled |
| EasyPrivacy | 4,999  | enabled |
| uBlock      | 24,999 | disabled (opt-in) |
| Allowlist   | 1,000  | dynamic |
| Custom      | 30,000 | dynamic |

## Privacy

No data is collected or transmitted. See [public/privacy-policy.html](public/privacy-policy.html).
