import '~/assets/styles/popup.css';
import { sendMessage } from '~/src/utils/messaging';
import { storageGet } from '~/src/utils/storage';
import type { StatsResponse } from '~/src/types/index';

async function getCurrentDomain(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    return new URL(tab.url).hostname || null;
  } catch {
    return null;
  }
}

async function init(): Promise<void> {
  const domain = await getCurrentDomain();

  const domainEl = document.getElementById('current-domain') as HTMLParagraphElement;
  const countEl = document.getElementById('blocked-count') as HTMLSpanElement;
  const toggleBtn = document.getElementById('toggle-enabled') as HTMLButtonElement;
  const allowlistBtn = document.getElementById('btn-allowlist') as HTMLButtonElement;
  const optionsBtn = document.getElementById('btn-options') as HTMLButtonElement;

  domainEl.textContent = domain ?? '(no page)';

  // Load stats
  try {
    const stats = await sendMessage<StatsResponse>({ type: 'GET_STATS' });
    countEl.textContent = stats.blockedCount.toLocaleString();
    toggleBtn.setAttribute('aria-pressed', String(stats.enabled));
    toggleBtn.textContent = stats.enabled ? 'Enabled' : 'Disabled';
  } catch (err) {
    console.error('[popup] GET_STATS failed:', err);
  }

  // Load initial allowlist state for this domain
  if (domain) {
    try {
      const allowlist = (await storageGet('allowlist')) ?? [];
      allowlistBtn.textContent = allowlist.includes(domain)
        ? 'Resume on this site'
        : 'Pause on this site';
    } catch (err) {
      console.error('[popup] allowlist read failed:', err);
    }
  } else {
    allowlistBtn.disabled = true;
  }

  // Toggle extension on/off
  toggleBtn.addEventListener('click', async () => {
    try {
      const res = await sendMessage<{ enabled: boolean }>({ type: 'TOGGLE_ENABLED' });
      toggleBtn.setAttribute('aria-pressed', String(res.enabled));
      toggleBtn.textContent = res.enabled ? 'Enabled' : 'Disabled';
    } catch (err) {
      console.error('[popup] TOGGLE_ENABLED failed:', err);
    }
  });

  // Toggle allowlist for current domain
  allowlistBtn.addEventListener('click', async () => {
    if (!domain) return;
    try {
      const res = await sendMessage<{ allowlisted: boolean }>({
        type: 'TOGGLE_DOMAIN',
        payload: domain,
      });
      allowlistBtn.textContent = res.allowlisted ? 'Resume on this site' : 'Pause on this site';
    } catch (err) {
      console.error('[popup] TOGGLE_DOMAIN failed:', err);
    }
  });

  // Open options page
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

init().catch((err: unknown) => console.error('[popup] init failed:', err));
