# AdBlocker

A fast, privacy-first ad and tracker blocker for Chrome and Chromium browsers. Built with [WXT](https://wxt.dev) and Manifest V3's `declarativeNetRequest` API all blocking rules are compiled at build time, so there's no background page network sniffing and zero runtime overhead. 

## Features

- **EasyList + EasyPrivacy** - Industry-standard filter lists bundled at build time
- **uBlock Extended Filters** - Optional additional rules (opt-in from the options page)
- **Per-Domain Allowlist** - Pause blocking on specific sites with one click
- **Custom Rules** - Add your own URL patterns via the options page
- **Blocked Request Counter** - See how many ads and trackers have been stopped
- **Cosmetic Filtering** - Hides ad placeholders and empty frames via injected CSS
- **Zero Data Collection** - No telemetry, no analytics, no network requests from the extension itself

## Installation

Since the extension is not yet on the Chrome Web Store, you load it manually. It takes about 2 minutes and works exactly the same as any store extension after that.

### Step 1  Download

Go to [Releases](https://github.com/RainyRoot/AdBlocker/releases) and download the latest `adblocker-*.zip`.

### Step 2  Unzip

Extract the zip to a **permanent folder** somewhere you won't accidentally delete it (e.g. `Documents/AdBlocker`). Chrome loads the extension directly from that folder, so if you delete or move it, the extension breaks.

### Step 3  Load in Chrome

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the folder you just unzipped

The AdBlocker icon will appear in your toolbar. Done.

Works in Chrome, Brave, Edge, Arc, and any other Chromium-based browser.

> **"Disable developer mode extensions" popup**  Chrome may show this warning when it starts. Just click **Keep extensions** every time. This only appears because the extension wasn't installed from the store; it does not affect how the extension works.

## Daily Use

Once loaded, AdBlocker runs automatically in the background you don't need to do anything. Every request to an ad or tracker domain is blocked before it even loads.

**Toolbar icon**  Click the AdBlocker icon in your toolbar to:
- See how many requests have been blocked on the current page
- Pause blocking for the current site (allowlist toggle)
- Re-enable blocking after pausing

**Options page** — Right-click the icon and choose **Options** (or go to `chrome://extensions`, find AdBlocker, and click **Details > Extension options**) to:
- Enable the optional uBlock Extended filter list for more aggressive blocking
- Add custom URL patterns to block
- Manage your per-site allowlist

**Blocking is silent**  There's no notification for every blocked ad. The counter in the popup shows the total. Pages just load faster and cleaner.

### Build from Source

```bash
git clone https://github.com/RainyRoot/AdBlocker.git
cd AdBlocker
pnpm install
pnpm build
```

Then load `.output/chrome-mv3/` as an unpacked extension in Chrome. See [INSTALL.md](INSTALL.md) for detailed instructions and [USAGE.md](USAGE.md) for configuration options.

## Publishing to the Chrome Web Store

If you want to self-host or fork this extension and publish it yourself:

1. Build the submission zip:
   ```bash
   pnpm build:prod
   ```
   This creates `.output/adblocker-*.zip`.

2. Register as a Chrome developer at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) (one-time $5 fee).

3. Click **New Item**, upload the zip, and fill in the store listing:
   - At least 1 screenshot (1280x800 or 640x400)
   - A 440x280 promo tile
   - Description and category (Productivity > Tools)
   - Privacy policy URL (the repo includes `public/privacy-policy.html`)

4. Submit for review. Google typically reviews within 1-3 business days.

> **Host permissions note:** Because the extension uses `host_permissions: ["<all_urls>"]` to block requests on all sites, the store listing will require a justification. Explain that this permission is required for `declarativeNetRequest` to intercept and block network requests on any domain.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | [WXT](https://wxt.dev) (Manifest V3) |
| Language | TypeScript |
| Blocking | `declarativeNetRequest` API (static + dynamic rules) |
| Filter Lists | EasyList, EasyPrivacy, uBlock Origin filters |
| Build Scripts | tsx (TypeScript execution) |
| Package Manager | pnpm |

## Project Structure

```
AdBlocker/
├── entrypoints/
│   ├── background.ts         # Service worker (counter, rule management)
│   ├── content.ts            # Content script (cosmetic filtering)
│   ├── popup/                # Browser action popup UI
│   └── options/              # Extension options page
├── scripts/
│   ├── fetch-filter-lists.ts # Downloads EasyList, EasyPrivacy, uBlock filters
│   ├── convert-to-dnr.ts     # Converts ABP syntax → DNR JSON rules
│   └── generate-cosmetic-css.ts # Extracts cosmetic hiding rules → CSS
├── src/
│   ├── constants.ts          # Rule IDs, storage keys, filter URLs
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Allowlist, messaging, stats, storage helpers
├── public/                   # Icons and privacy policy
├── assets/styles/            # Popup and options page CSS
├── wxt.config.ts             # WXT + manifest configuration
└── package.json
```

## Rule Budget

Chrome's `declarativeNetRequest` API enforces per-extension rule limits:

| Ruleset | Limit | Default |
|---------|-------|---------|
| EasyList | 24,999 | Enabled |
| EasyPrivacy | 4,999 | Enabled |
| uBlock Extended | 24,999 | Disabled (opt-in) |
| Allowlist | 1,000 | Dynamic |
| Custom Rules | 30,000 | Dynamic |

## Docker

Build the extension inside a container (useful for CI or reproducible builds):

```bash
docker pull ghcr.io/rainyroot/adblocker:latest

# Extract the built extension
docker run --rm -v $(pwd)/dist:/out ghcr.io/rainyroot/adblocker:latest
```

The built extension will be in `dist/chrome-mv3/`.

## Privacy

No data is collected or transmitted. The extension operates entirely locally. See [privacy-policy.html](public/privacy-policy.html) for the full privacy policy.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `pnpm typecheck` before committing
4. Open a pull request
