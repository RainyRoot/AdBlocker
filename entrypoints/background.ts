import { defineBackground } from 'wxt/utils/define-background';
import { storageGet, storageSet } from '~/src/utils/storage';
import { incrementBlockedCount } from '~/src/utils/stats';
import { addToAllowlist, removeFromAllowlist, isAllowlisted } from '~/src/utils/allowlist';
import { RULESET_IDS } from '~/src/constants';
import type { Message, StatsResponse, RulesetStatusResponse, RulesetId } from '~/src/types/index';

async function handleMessage(msg: Message): Promise<unknown> {
  switch (msg.type) {
    case 'GET_STATS': {
      const blockedCount = (await storageGet('blockedCount')) ?? 0;
      const enabled = (await storageGet('enabled')) ?? true;
      const response: StatsResponse = { blockedCount, enabled };
      return response;
    }
    case 'TOGGLE_ENABLED': {
      const current = (await storageGet('enabled')) ?? true;
      const next = !current;
      await storageSet('enabled', next);
      if (next) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: [RULESET_IDS.EASYLIST, RULESET_IDS.EASYPRIVACY],
          disableRulesetIds: [RULESET_IDS.UBLOCK],
        });
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: [],
          disableRulesetIds: [RULESET_IDS.EASYLIST, RULESET_IDS.EASYPRIVACY, RULESET_IDS.UBLOCK],
        });
      }
      return { enabled: next };
    }
    case 'TOGGLE_DOMAIN': {
      const domain = msg.payload as string;
      const allowlisted = await isAllowlisted(domain);
      if (allowlisted) {
        await removeFromAllowlist(domain);
      } else {
        await addToAllowlist(domain);
      }
      return { allowlisted: !allowlisted };
    }
    case 'GET_RULESET_STATUS': {
      const enabledRulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
      const response: RulesetStatusResponse = { enabledRulesets: enabledRulesets as RulesetId[] };
      return response;
    }
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== 'install') return;
    try {
      await storageSet('enabled', true);
      await storageSet('allowlist', []);
      await storageSet('blockedCount', 0);
      await storageSet('cosmeticRules', {});
      await storageSet('customRules', '');
    } catch (err) {
      console.error('[background] onInstalled init failed:', err);
    }
  });

  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(() => {
    incrementBlockedCount();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message as Message)
      .then(sendResponse)
      .catch((err: unknown) => {
        console.error('[background] handleMessage error:', err);
        sendResponse(null);
      });
    return true;
  });
});
