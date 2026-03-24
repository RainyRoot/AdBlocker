# Installation

## Prerequisites

- **Node.js** 18 or later — [nodejs.org](https://nodejs.org/)
- **pnpm** — `npm install -g pnpm` (or via [pnpm.io](https://pnpm.io/installation))
- A **Chromium-based browser** (Chrome, Brave, Edge, etc.)

## Build from Source

### 1. Clone the repository

```bash
git clone https://github.com/RainyRoot/AdBlocker.git
cd AdBlocker
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Build the extension

```bash
pnpm build
```

This performs three steps automatically:

1. **Fetch filter lists** — Downloads the latest EasyList, EasyPrivacy, and uBlock Origin filter lists
2. **Convert to DNR** — Translates AdBlock Plus syntax into Manifest V3 `declarativeNetRequest` JSON rules and generates cosmetic hiding CSS
3. **Bundle** — WXT compiles the extension to `.output/chrome-mv3/`

### 4. Load in Chrome

1. Open `chrome://extensions` in your browser
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` directory

The AdBlocker icon should appear in your toolbar.

### 5. Create a distributable ZIP (optional)

```bash
pnpm build:prod
```

This builds and then creates a `.zip` file ready for Chrome Web Store submission.

## Development Mode

For active development with hot reload:

```bash
pnpm dev
```

WXT starts in watch mode — changes to source files rebuild automatically. The extension reloads in the browser when you click the reload button on `chrome://extensions`.

## Docker Build

Build the extension in a container for reproducible builds:

```bash
docker pull ghcr.io/rainyroot/adblocker:latest

# Copy the built extension to your local machine
docker run --rm -v $(pwd)/dist:/out ghcr.io/rainyroot/adblocker:latest
```

### Build the Docker image locally

```bash
docker build -t adblocker .
docker run --rm -v $(pwd)/dist:/out adblocker
```

Then load `dist/chrome-mv3/` as an unpacked extension in Chrome.

## Updating Filter Lists

To refresh the bundled filter lists to the latest versions:

```bash
pnpm fetch-filters
pnpm convert-filters
pnpm build
```

Reload the extension in `chrome://extensions` after rebuilding.
