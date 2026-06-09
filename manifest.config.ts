import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'API Inspector',
  version: '1.0.0',
  description:
    'Capture API requests in a DevTools panel and convert them to cURL/HTTPie/Postman. Local-only, no network interception permission.',
  minimum_chrome_version: '116',
  permissions: ['storage'],
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  devtools_page: 'src/devtools/devtools.html',
  background: {
    service_worker: 'src/background/sw.ts',
    type: 'module',
  },
  action: {
    default_title: 'API Inspector — open viewer',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  web_accessible_resources: [
    {
      resources: ['src/panel/index.html', 'src/viewer/index.html'],
      matches: ['<all_urls>'],
    },
  ],
})
