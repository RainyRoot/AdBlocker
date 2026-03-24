# AdBlocker

A fast, privacy-first ad and tracker blocker for Chrome and Chromium browsers. Built with [WXT](https://wxt.dev) and Manifest V3's `declarativeNetRequest` API — all blocking rules are compiled at build time, so there's no background page network sniffing and zero runtime overhead.

## Features

- **EasyList + EasyPrivacy** — Industry-standard filter lists bundled at build time
- **uBlock Extended Filters** — Optional additional rules (opt-in from the options page)
- **Per-Domain Allowlist** — Pause blocking on specific sites with one click
- **Custom Rules** — Add your own URL patterns via the options page
- **Blocked Request Counter** — See how many ads and trackers have been stopped
- **Cosmetic Filtering** — Hides ad placeholders and empty frames via injected CSS
- **Zero Data Collection** — No telemetry, no analytics, no network requests from the extension itself

## Quick Start

```bash
git clone https://github.com/RainyRoot/AdBlocker.git
cd AdBlocker
pnpm install
pnpm build
```

Then load `.output/chrome-mv3/` as an unpacked extension in Chrome. See [INSTALL.md](INSTALL.md) for detailed instructions and [USAGE.md](USAGE.md) for configuration options.

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
