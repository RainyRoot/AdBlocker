# AdBlocker Extension — Project Conventions

## Repository
- Initialize Git on project start: `git init && git add . && git commit -m "init"`
- Commit frequently with descriptive messages
- Ask before pushing to any remote

## Technology Stack
- Language: TypeScript (strict mode, no `any`)
- Package manager: pnpm (never npm or yarn)
- Build framework: WXT (wraps Vite internally)
- Extension target: Chrome/Chromium, Manifest V3
- Node scripts: run with `tsx` (not `ts-node`)

## Project Structure Rules
- Extension entrypoints → `entrypoints/` (WXT auto-discovers)
- Shared utilities → `src/` (WXT auto-imports)
- Build-time Node.js scripts → `scripts/`
- Generated files (DNR JSON, cosmetic CSS) → `public/rules/` and `assets/styles/`
- Never manually edit generated files — regenerate via `pnpm convert-filters`
- Filter list `.txt` sources are gitignored; run `pnpm fetch-filters` to download

## TypeScript
- `strict: true` in tsconfig
- No `any` — use `unknown` then narrow
- All `chrome.*` API calls typed via `@types/chrome`
- Use `ExtensionStorage` interface (`src/types/index.ts`) for all storage access
- All inter-component messages use the `Message` type from `src/types/index.ts`

## Chrome Extension MV3 Rules
- Background logic ONLY in `entrypoints/background.ts` (service worker)
- Service worker cannot access DOM — no `document`, `window`, `localStorage`
- Use `declarativeNetRequest` for all network blocking — never `webRequest`
- Dynamic rules (allowlist, custom) via `chrome.declarativeNetRequest.updateDynamicRules()`

## Permissions
- Never add permissions beyond: `declarativeNetRequest`, `declarativeNetRequestFeedback`, `storage`, `tabs`, `scripting`
- `host_permissions: <all_urls>` — required for ad blocking

## Rule Count Budget
- EasyList: target < 25,000 rules
- EasyPrivacy: target < 8,000 rules
- uBlock: disabled by default (user opt-in)
- Dynamic rules: 5,000 for custom rules, 1,000 for allowlist
- Total enabled static rules must not exceed 30,000 at once

## Build Pipeline
- Filter lists fetched at **build time**, never at runtime
- Build order: `fetch-filters` → `convert-filters` → `wxt build`
- `pnpm build` runs all steps in order
- Conversion uses `@eyeo/abp2dnr` to produce DNR JSON from ABP filter syntax

## Popup & Options Pages
- Vanilla TypeScript — no React, Vue, or other framework
- Communicate with background ONLY via `chrome.runtime.sendMessage`
- All settings persist to `chrome.storage.local` via typed wrapper

## Code Style
- Single quotes, 2-space indentation, semicolons
- `async/await` over raw Promises
- Wrap all `chrome.*` calls in try/catch; log errors with `console.error`

## Chrome Web Store Requirements
- Privacy policy at `public/privacy-policy.html`
- Icons at 16, 32, 48, 128px in `public/icons/`
- Store screenshots (1280x800) in `store/screenshots/`
