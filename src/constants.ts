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

// DNR rule ID ranges — must not overlap across static + dynamic rulesets
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
