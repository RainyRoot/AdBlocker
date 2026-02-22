import { defineContentScript } from 'wxt/utils/define-content-script';
import { storageGet } from '~/src/utils/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    const hostname = location.hostname;
    if (!hostname) return;

    try {
      const cosmeticRules = await storageGet('cosmeticRules');
      const selectors = cosmeticRules?.[hostname];
      if (!selectors || selectors.length === 0) return;

      const style = document.createElement('style');
      style.textContent = `${selectors.join(',\n')} { display: none !important; }`;
      document.documentElement.appendChild(style);
    } catch (err) {
      console.error('[content] cosmetic injection failed:', err);
    }
  },
});
