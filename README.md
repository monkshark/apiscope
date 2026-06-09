한국어: [README.ko.md](./README.ko.md)

# API Inspector

A Chromium DevTools panel extension that automatically captures a page's API calls, then lets you filter them, mask secrets, and convert them to cURL / HTTPie. Local-only, with no network-interception permission.

> Think of it as the DevTools Network tab's "Copy as cURL" — supercharged with search, masking, conversion, diffing, history, and export.

## What it's for

A tool for developers to quickly look at, organize, and share the API requests (XHR/fetch) a web page exchanges in the background. The browser's built-in DevTools Network tab shows requests, but its search, organization, conversion, sharing, and documentation are weak. This extension fills that gap.

Typical flow:

1. You hit a bug during QA → open the API Inspector tab in F12
2. Reproduce the bug; the API requests it triggers are captured and organized automatically
3. Right-click the problematic request → "Copy as cURL" (auth tokens are masked automatically)
4. Hand it to a backend developer → they reproduce the exact request on the server

Useful for:

- Backend / full-stack developers — API debugging, request reproduction, cURL/Postman conversion
- QA engineers — capture the exact request needed to reproduce a bug and share it
- Frontend developers — quickly see which APIs a page actually calls
- Anyone who works with APIs — share requests safely without leaking tokens (auto masking)

Key differentiators: (1) safe sharing via automatic token masking, (2) regex and full-text body search, (3) cURL/HTTPie/Postman conversion plus auto-generated endpoint docs, (4) HAR import so you can analyze someone else's traffic in the same view, (5) a minimal-permission design that uses the DevTools API instead of network interception.

## Features

- DevTools panel — integrated as an "API Inspector" tab inside F12
- Filters — regex (URL), method, status class, hide static assets, full-text body search
- Auto masking — `Authorization` / `Cookie` / `*-token` / query tokens are hidden on display and in exports
- Convert — cURL (multiline, multipart/form) · HTTPie · Postman Collection. An optional placeholder mode swaps credentials for `$AUTH_TOKEN` / `{{AUTH_TOKEN}}` variables, so a shared command stays runnable (the recipient fills in their own value) without exposing the real token.
- Diff — compare two requests (status / query / headers / body)
- History — IndexedDB persistence; survives reopening DevTools
- HAR import — load HAR files with response bodies restored inline
- Endpoint docs — auto-generate Markdown documentation
- JSON tree view — collapsible tree for request/response bodies
- Minimal permissions — only `storage`; no `webRequest` or host permissions (uses the DevTools API, not network interception)

## Security and privacy

The whole point of the masking feature is safe sharing. The DevTools "Copy as cURL" copies your `Authorization: Bearer ...` token verbatim — paste that into Slack and you have leaked a credential. API Inspector is built to prevent exactly that.

- Fully local — nothing ever leaves the browser. No backend, no analytics, no third-party requests.
- Automatic secret masking — `Authorization`, `Cookie`, and `*-token` headers plus `token` / `key` / `password` query params are masked both in the UI and in every export (cURL / HTTPie / Postman).
- Sensitive-data masking in bodies — request/response bodies, headers, and query values are also scanned for and redacted of credit card numbers (Luhn-validated, last 4 kept), emails, JWTs, bearer tokens, and Korean resident registration numbers. Share a request or response without leaking PII.
- Minimal permissions — only `storage`. No `webRequest`, no host permissions, no content scripts. Traffic is read through the official DevTools API, not by intercepting the network.
- Auditable — the masking and conversion logic are pure functions covered by unit tests, so what gets redacted is verifiable.

## Tech stack

Vite 6 · CRXJS 2 · React 19 · TypeScript (strict) · Tailwind 4 · Zustand · @tanstack/react-virtual · Vitest

Core logic (`src/core/`) is split into pure functions that do not depend on browser APIs and is verified by unit tests. The UI is verified with component tests (@testing-library/react) on jsdom with a mocked `chrome.devtools`.

## Tests

- Unit — the `src/core/` pure functions: normalize / mask / filter / convert / diff / har / postman / markdown
- Component — simulate `chrome.devtools.network` events and assert the panel captures, filters, masks, converts, copies, and lazy-loads response bodies (`tests/components/`)

```bash
npm test
```

## Development

```bash
npm install
npm run dev      # HMR dev build (watches dist/)
npm run build    # type-check + production build
npm test         # Vitest
```

## Load in the browser

1. Run `npm run dev` or `npm run build`
2. `chrome://extensions` → enable Developer mode
3. Load unpacked → select the `dist` folder
4. Open F12 on any page → API Inspector tab
5. Reload the page to start capturing (only requests made while DevTools is open are captured)

## Structure

```
src/
├─ devtools/      DevTools panel registration
├─ panel/         React panel UI (FilterBar / RequestList / DetailPanel / ...)
│  ├─ store/      Zustand state
│  └─ hooks/      network capture · response body lazy load
├─ core/          pure logic (tested)
│  ├─ normalize   HAR → CapturedRequest
│  ├─ mask        sensitive header/query masking
│  ├─ filter      filter engine
│  └─ convert/    cURL · HTTPie conversion
└─ types.ts
```
