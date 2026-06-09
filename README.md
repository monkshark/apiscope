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

## Example: handing a failing request to a backend developer

You hit a 403 on the frontend and need a backend developer to reproduce it.

1. Open F12 → API Inspector and reproduce the request.
2. Select it → Convert tab. Turn on `mask`, then turn on `$ placeholder`.
3. Copy the result and paste it into Slack or a ticket:

```bash
curl 'https://api.company.com/orders/123' \
  -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-raw '{"qty":2}'
```

No real token is included, so nothing is leaked. The recipient supplies their own credential and runs it as-is:

```bash
export AUTH_TOKEN="their-own-token"
# paste the curl above
```

Which mode to use:

- Debugging alone (you need the real values) — mask off
- Sharing where the recipient must run it too — mask on + placeholder on
- Sharing just the shape, not meant to run — mask on, placeholder off (`***MASKED***`)
- Postman collaboration (team manages tokens as variables) — placeholder on → `{{AUTH_TOKEN}}`

## Features

- DevTools panel — integrated as an "API Inspector" tab inside F12
- Filters — regex (URL), method, status class, hide static assets, full-text body search
- Auto masking — `Authorization` / `Cookie` / `*-token` / query tokens are hidden on display and in exports
- Convert — cURL (multiline, multipart/form) · HTTPie · Postman Collection. An optional placeholder mode swaps credentials for `$AUTH_TOKEN` / `{{AUTH_TOKEN}}` variables, so a shared command stays runnable (the recipient fills in their own value) without exposing the real token.
- Diff — compare two requests (status / query / headers / body)
- Edit & resend — in the DevTools panel, edit a captured request (method/URL/headers/body), substitute `{{variables}}`, and resend it through the inspected page's own session (no extra permissions, no CORS issues); the response is compared against the original
- Variables — define `{{KEY}}` values once and reuse them when resending
- Tools — built-in encoder/decoder (Base64 / URL / Hex / JWT) and hashes (MD5 / SHA-1 / SHA-256), plus a regex scan across all captured response bodies (e.g., to surface `flag{...}`)
- Response search — regex highlight within a response body
- Fuzz — Intruder-style: mark a spot with `§...§`, supply a payload list, and replay through the page session; results table flags length/status outliers (for authorized wargames/CTF only)
- Export / Import — round-trips both ways. Export to Postman Collection, HAR, session JSON (re-importable), or Markdown docs; import auto-detects HAR, Postman Collection, or session JSON and restores response bodies inline (Markdown is export-only)
- Standalone viewer — click the toolbar icon to open a full-tab viewer that imports and analyzes HAR/session files without DevTools (live capture stays in the DevTools panel)
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
