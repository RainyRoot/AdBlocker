import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'AdBlocker',
    version: '1.0.0',
    description: 'Fast, privacy-first ad and tracker blocker.',
    permissions: [
      'declarativeNetRequest',
      'declarativeNetRequestFeedback',
      'storage',
      'tabs',
      'scripting',
    ],
    host_permissions: ['<all_urls>'],
    declarative_net_request: {
      rule_resources: [
        { id: 'ruleset-easylist',    enabled: true,  path: 'rules/ruleset-easylist.json' },
        { id: 'ruleset-easyprivacy', enabled: true,  path: 'rules/ruleset-easyprivacy.json' },
        { id: 'ruleset-ublock',      enabled: false, path: 'rules/ruleset-ublock.json' },
      ],
    },
    action: {
      default_popup: 'popup/index.html',
      default_title: 'AdBlocker',
    },
    icons: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  vite: () => ({
    build: { target: 'chrome114' },
  }),
});
