import { storageGet, storageSet } from './storage.js';
import { RULE_ID_RANGES } from '../constants.js';

function getAllowlistRuleId(domain: string): number {
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
