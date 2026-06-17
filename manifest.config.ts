import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'APIScope',
  version: '1.2.0',
  description:
    'Capture API requests in a DevTools panel, convert them to cURL/HTTPie/Postman, replay/fuzz, and rewrite API responses with rules.',
  minimum_chrome_version: '116',
  permissions: [
    'storage',
    'tabs',
    'debugger',
    'sidePanel',
    'contextMenus',
    'scripting',
    'alarms',
  ],
  host_permissions: ['<all_urls>'],
  commands: {
    'decode-selection': {
      suggested_key: { default: 'Alt+Shift+D' },
      description: 'Decode the selected text in the side panel',
    },
  },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  devtools_page: 'src/devtools/devtools.html',
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/tamper-main.ts'],
      run_at: 'document_start',
      all_frames: true,
      world: 'MAIN',
    },
    {
      matches: ['<all_urls>'],
      js: ['src/content/tamper-bridge.ts'],
      run_at: 'document_start',
      all_frames: true,
    },
  ],
  background: {
    service_worker: 'src/background/sw.ts',
    type: 'module',
  },
  action: {
    default_title: 'APIScope',
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  web_accessible_resources: [
    {
      resources: [
        'src/panel/index.html',
        'src/viewer/index.html',
        'src/intercept/index.html',
      ],
      matches: ['<all_urls>'],
    },
  ],
})
