# Usage

## Basic Usage

After installing the extension, it starts blocking ads and trackers immediately using the bundled EasyList and EasyPrivacy filter lists.

### Popup

Click the AdBlocker icon in your browser toolbar to see:

- **On/Off toggle** — Enable or disable blocking globally
- **Blocked count** — Total number of blocked requests
- **Allowlist this site** — Quickly add the current domain to the allowlist

### Options Page

Right-click the AdBlocker icon → **Options** (or navigate to the extension's options page) to access advanced settings:

- **Enable/disable filter lists** — Toggle EasyList, EasyPrivacy, and uBlock Extended independently
- **Allowlist management** — View, add, and remove allowlisted domains
- **Custom rules** — Add your own URL filter patterns

## Filter Lists

### Enabled by Default

- **EasyList** — Blocks ads on most websites (banners, pop-ups, video ads)
- **EasyPrivacy** — Blocks tracking scripts, analytics, and fingerprinting

### Optional

- **uBlock Extended** — Additional rules from uBlock Origin's filter set. Enable this from the options page for more aggressive blocking. Uses an additional ~25,000 rule slots.

## Custom Rules

You can add your own blocking rules in the options page. Rules follow a simplified URL pattern syntax:

```
# Block a specific domain
||example-ads.com^

# Block a specific path on any domain
*/tracking/pixel.gif

# Block requests containing a pattern
*doubleclick*
```

Custom rules are stored as dynamic `declarativeNetRequest` rules and take effect immediately.

## Allowlist

To disable blocking on a specific site:

1. **Quick method** — Click the AdBlocker icon while on the site and toggle "Allow this site"
2. **Manual method** — Go to Options → Allowlist → Add the domain (e.g., `example.com`)

Allowlisted domains bypass all filter lists including custom rules.

## Cosmetic Filtering

Beyond network-level blocking, AdBlocker also hides ad placeholders and empty containers on web pages via CSS injection. This prevents the "blank space where an ad used to be" effect on many sites.

Cosmetic rules are extracted from the filter lists at build time and injected as CSS by the content script.

## Updating Filter Lists

The filter lists are bundled at build time and don't auto-update. To get the latest filters:

1. Pull the latest code: `git pull`
2. Rebuild: `pnpm build`
3. Go to `chrome://extensions` and click the reload button on AdBlocker

## Troubleshooting

### A site is broken with AdBlocker enabled

Some sites detect ad blockers or rely on scripts that get blocked. Try:

1. Add the site to your allowlist (click the icon → "Allow this site")
2. If the issue persists with allowlisting, check if a custom rule is causing it

### The blocked count seems too low

Make sure all desired rulesets are enabled in Options. By default, only EasyList and EasyPrivacy are active. Enabling uBlock Extended will catch additional requests.

### Extension shows "Errors" on chrome://extensions

If you see errors after loading the unpacked extension, try:

1. Rebuild: `pnpm build`
2. Remove and re-load the extension from `.output/chrome-mv3/`
3. Make sure you ran `pnpm install` and have all dependencies
