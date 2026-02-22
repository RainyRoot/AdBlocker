import '~/assets/styles/options.css';
import { storageGet, storageSet } from '~/src/utils/storage';
import { addToAllowlist, removeFromAllowlist } from '~/src/utils/allowlist';
import { RULESET_IDS, RULE_ID_RANGES } from '~/src/constants';

const { ResourceType } = chrome.declarativeNetRequest;
const ALL_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
  ResourceType.MAIN_FRAME, ResourceType.SUB_FRAME, ResourceType.STYLESHEET,
  ResourceType.SCRIPT, ResourceType.IMAGE, ResourceType.FONT, ResourceType.OBJECT,
  ResourceType.XMLHTTPREQUEST, ResourceType.PING, ResourceType.MEDIA,
  ResourceType.WEBSOCKET, ResourceType.OTHER,
];

// --- Filter lists ---

async function initFilterLists(): Promise<void> {
  const cbEasylist = document.getElementById('cb-easylist') as HTMLInputElement;
  const cbEasyprivacy = document.getElementById('cb-easyprivacy') as HTMLInputElement;
  const cbUblock = document.getElementById('cb-ublock') as HTMLInputElement;

  const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
  cbEasylist.checked = enabled.includes(RULESET_IDS.EASYLIST);
  cbEasyprivacy.checked = enabled.includes(RULESET_IDS.EASYPRIVACY);
  cbUblock.checked = enabled.includes(RULESET_IDS.UBLOCK);

  async function toggle(id: string, checked: boolean): Promise<void> {
    try {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: checked ? [id] : [],
        disableRulesetIds: checked ? [] : [id],
      });
    } catch (err) {
      console.error('[options] updateEnabledRulesets failed:', err);
    }
  }

  cbEasylist.addEventListener('change', () => toggle(RULESET_IDS.EASYLIST, cbEasylist.checked));
  cbEasyprivacy.addEventListener('change', () => toggle(RULESET_IDS.EASYPRIVACY, cbEasyprivacy.checked));
  cbUblock.addEventListener('change', () => toggle(RULESET_IDS.UBLOCK, cbUblock.checked));
}

// --- Allowlist ---

async function initAllowlist(): Promise<void> {
  const listEl = document.getElementById('allowlist-items') as HTMLUListElement;
  const input = document.getElementById('allowlist-input') as HTMLInputElement;
  const addBtn = document.getElementById('btn-add-domain') as HTMLButtonElement;

  async function render(): Promise<void> {
    const domains = (await storageGet('allowlist')) ?? [];
    listEl.innerHTML = '';
    for (const domain of domains) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = domain;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', async () => {
        try {
          await removeFromAllowlist(domain);
          await render();
        } catch (err) {
          console.error('[options] removeFromAllowlist failed:', err);
        }
      });
      li.appendChild(span);
      li.appendChild(removeBtn);
      listEl.appendChild(li);
    }
  }

  await render();

  addBtn.addEventListener('click', async () => {
    const domain = input.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return;
    try {
      await addToAllowlist(domain);
      input.value = '';
      await render();
    } catch (err) {
      console.error('[options] addToAllowlist failed:', err);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.click();
  });
}

// --- Custom rules ---

function parseCustomRules(text: string): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let id = RULE_ID_RANGES.CUSTOM_START;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('!') || line.includes('##') || line.includes('#@#')) continue;
    if (id > RULE_ID_RANGES.CUSTOM_END) break;
    rules.push({
      id: id++,
      priority: 1,
      action: { type: 'block' },
      condition: { urlFilter: line, resourceTypes: ALL_RESOURCE_TYPES },
    });
  }
  return rules;
}

async function initCustomRules(): Promise<void> {
  const textarea = document.getElementById('custom-rules-textarea') as HTMLTextAreaElement;
  const saveBtn = document.getElementById('btn-save-rules') as HTMLButtonElement;
  const statusEl = document.getElementById('custom-rules-status') as HTMLSpanElement;

  textarea.value = (await storageGet('customRules')) ?? '';

  saveBtn.addEventListener('click', async () => {
    const text = textarea.value;
    const newRules = parseCustomRules(text);
    try {
      const existing = await chrome.declarativeNetRequest.getDynamicRules();
      const existingCustomIds = existing
        .filter(r => r.id >= RULE_ID_RANGES.CUSTOM_START && r.id <= RULE_ID_RANGES.CUSTOM_END)
        .map(r => r.id);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingCustomIds,
        addRules: newRules,
      });
      await storageSet('customRules', text);
      statusEl.textContent = `Saved ${newRules.length} rule(s).`;
    } catch (err) {
      console.error('[options] custom rules save failed:', err);
      statusEl.textContent = 'Error saving rules.';
    }
  });
}

// --- Stats ---

async function initStats(): Promise<void> {
  const countEl = document.getElementById('stats-count') as HTMLElement;
  const resetBtn = document.getElementById('btn-reset-stats') as HTMLButtonElement;

  countEl.textContent = ((await storageGet('blockedCount')) ?? 0).toLocaleString();

  resetBtn.addEventListener('click', async () => {
    try {
      await storageSet('blockedCount', 0);
      countEl.textContent = '0';
    } catch (err) {
      console.error('[options] reset stats failed:', err);
    }
  });
}

// --- Init ---

async function init(): Promise<void> {
  await Promise.all([
    initFilterLists(),
    initAllowlist(),
    initCustomRules(),
    initStats(),
  ]);
}

init().catch((err: unknown) => console.error('[options] init failed:', err));
