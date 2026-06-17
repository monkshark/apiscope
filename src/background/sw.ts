import type {
  BgToUi,
  HeaderEntry,
  PausedEdit,
  PausedItem,
  UiToBg,
} from '../core/intercept-types'
import { encodeUtf8ToBase64, decodeBase64ToUtf8 } from '../core/b64'
import {
  fetchLatestRelease,
  computeUpdate,
  UPDATE_STORAGE_KEY,
} from '../core/update'

interface RequestPausedParams {
  requestId: string
  request: {
    url: string
    method: string
    headers: Record<string, string>
    postData?: string
  }
  resourceType: string
  responseStatusCode?: number
  responseHeaders?: HeaderEntry[]
}

interface Pending {
  tabId: number
  phase: 'request' | 'response'
  status: number
  respHeaders: HeaderEntry[]
  bodyBase64: string
}

const DECODE_MENU_ID = 'apiscope-decode'
const DECODE_PENDING_KEY = 'decode:pending'
const UPDATE_ALARM = 'check-update'
const UPDATE_PERIOD_MINUTES = 1440

async function runUpdateCheck(): Promise<void> {
  try {
    const latest = await fetchLatestRelease()
    const info = computeUpdate(
      chrome.runtime.getManifest().version,
      latest,
      Date.now(),
    )
    if (info) await chrome.storage.local.set({ [UPDATE_STORAGE_KEY]: info })
  } catch {
    void 0
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: DECODE_MENU_ID,
      title: 'Decode selection',
      contexts: ['selection'],
    })
  })
  chrome.alarms.create(UPDATE_ALARM, { periodInMinutes: UPDATE_PERIOD_MINUTES })
  void runUpdateCheck()
})

chrome.runtime.onStartup.addListener(() => {
  void runUpdateCheck()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM) void runUpdateCheck()
})

function storePending(text: string): void {
  void chrome.storage.session.set({
    [DECODE_PENDING_KEY]: { text, nonce: Date.now() },
  })
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== DECODE_MENU_ID || tab?.id == null) return
  void chrome.sidePanel.open({ tabId: tab.id })
  storePending(info.selectionText ?? '')
})

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'decode-selection') return
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    if (tab?.id == null) return
    void chrome.sidePanel.open({ tabId: tab.id })
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id, allFrames: true },
        func: () => window.getSelection()?.toString() ?? '',
      },
      (results) => {
        if (chrome.runtime.lastError) {
          storePending('')
          return
        }
        const text =
          results
            ?.map((r) => (typeof r.result === 'string' ? r.result : ''))
            .find((t) => t.trim().length > 0) ?? ''
        storePending(text)
      },
    )
  })
})

let port: chrome.runtime.Port | null = null
let attachedTab: number | null = null
let enabled = false
let filter = ''
const pending = new Map<string, Pending>()

function send(msg: BgToUi): void {
  port?.postMessage(msg)
}

function debuggee(tabId: number): chrome.debugger.Debuggee {
  return { tabId }
}

function command(
  tabId: number,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.debugger.sendCommand(debuggee(tabId), method, params, (result) =>
      resolve(result),
    )
  })
}

function matchesFilter(url: string): boolean {
  if (!filter.trim()) return true
  try {
    return new RegExp(filter).test(url)
  } catch {
    return true
  }
}

function headersToArray(headers: Record<string, string>): HeaderEntry[] {
  return Object.entries(headers).map(([name, value]) => ({
    name,
    value: String(value),
  }))
}

function stripBodyHeaders(headers: HeaderEntry[]): HeaderEntry[] {
  return headers.filter((h) => {
    const n = h.name.toLowerCase()
    return n !== 'content-length' && n !== 'content-encoding'
  })
}

async function onRequestStage(
  tabId: number,
  params: RequestPausedParams,
): Promise<void> {
  if (!enabled || !matchesFilter(params.request.url)) {
    await command(tabId, 'Fetch.continueRequest', { requestId: params.requestId })
    return
  }
  const item: PausedItem = {
    id: params.requestId,
    phase: 'request',
    url: params.request.url,
    method: params.request.method,
    resourceType: params.resourceType,
    headers: headersToArray(params.request.headers),
    body: params.request.postData ?? '',
    base64: false,
  }
  pending.set(params.requestId, {
    tabId,
    phase: 'request',
    status: 0,
    respHeaders: [],
    bodyBase64: '',
  })
  send({ type: 'paused', item })
}

async function onResponseStage(
  tabId: number,
  params: RequestPausedParams,
): Promise<void> {
  if (!enabled || !matchesFilter(params.request.url)) {
    await command(tabId, 'Fetch.continueResponse', {
      requestId: params.requestId,
    })
    return
  }
  const got = (await command(tabId, 'Fetch.getResponseBody', {
    requestId: params.requestId,
  })) as { body: string; base64Encoded: boolean } | undefined
  const bodyBase64 = got
    ? got.base64Encoded
      ? got.body
      : encodeUtf8ToBase64(got.body)
    : ''
  let text = ''
  let base64 = false
  try {
    text = decodeBase64ToUtf8(bodyBase64)
  } catch {
    text = bodyBase64
    base64 = true
  }
  const respHeaders = params.responseHeaders ?? []
  pending.set(params.requestId, {
    tabId,
    phase: 'response',
    status: params.responseStatusCode ?? 200,
    respHeaders,
    bodyBase64,
  })
  const item: PausedItem = {
    id: params.requestId,
    phase: 'response',
    url: params.request.url,
    method: params.request.method,
    resourceType: params.resourceType,
    status: params.responseStatusCode ?? 200,
    headers: respHeaders,
    body: text,
    base64,
  }
  send({ type: 'paused', item })
}

function onEvent(
  source: chrome.debugger.Debuggee,
  method: string,
  params?: object,
): void {
  if (method !== 'Fetch.requestPaused' || source.tabId == null) return
  const p = params as RequestPausedParams
  if (p.responseStatusCode != null || p.responseHeaders != null) {
    void onResponseStage(source.tabId, p)
  } else {
    void onRequestStage(source.tabId, p)
  }
}

async function resolveItem(
  id: string,
  action: 'forward' | 'drop',
  edit?: PausedEdit,
): Promise<void> {
  const item = pending.get(id)
  if (!item) return
  pending.delete(id)
  const { tabId } = item

  if (action === 'drop') {
    await command(tabId, 'Fetch.failRequest', {
      requestId: id,
      errorReason: 'Aborted',
    })
    send({ type: 'resolved', id })
    return
  }

  if (item.phase === 'request') {
    const overrides: Record<string, unknown> = { requestId: id }
    if (edit?.url) overrides.url = edit.url
    if (edit?.method) overrides.method = edit.method
    if (edit?.headers) overrides.headers = edit.headers
    if (edit?.body != null) overrides.postData = encodeUtf8ToBase64(edit.body)
    await command(tabId, 'Fetch.continueRequest', overrides)
    send({ type: 'resolved', id })
    return
  }

  const body =
    edit?.body != null ? encodeUtf8ToBase64(edit.body) : item.bodyBase64
  const headers = stripBodyHeaders(edit?.headers ?? item.respHeaders)
  await command(tabId, 'Fetch.fulfillRequest', {
    requestId: id,
    responseCode: edit?.status ?? item.status,
    responseHeaders: headers,
    body,
  })
  send({ type: 'resolved', id })
}

async function attach(tabId: number): Promise<void> {
  if (attachedTab != null) await detach('reattach')
  await new Promise<void>((resolve, reject) => {
    chrome.debugger.attach(debuggee(tabId), '1.3', () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  }).catch((e: Error) => {
    send({ type: 'error', message: e.message })
    throw e
  })
  attachedTab = tabId
  await command(tabId, 'Fetch.enable', {
    patterns: [
      { urlPattern: '*', requestStage: 'Request' },
      { urlPattern: '*', requestStage: 'Response' },
    ],
  })
  send({ type: 'attached', tabId })
}

async function detach(reason: string): Promise<void> {
  const tabId = attachedTab
  attachedTab = null
  pending.clear()
  if (tabId != null) {
    await new Promise<void>((resolve) => {
      chrome.debugger.detach(debuggee(tabId), () => {
        void chrome.runtime.lastError
        resolve()
      })
    })
  }
  send({ type: 'detached', reason })
}

chrome.debugger.onEvent.addListener(onEvent)
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === attachedTab) {
    attachedTab = null
    pending.clear()
    send({ type: 'detached', reason: 'external' })
  }
})

chrome.runtime.onConnect.addListener((p) => {
  if (p.name !== 'intercept') return
  port = p
  p.onMessage.addListener((msg: UiToBg) => {
    if (msg.type === 'attach') void attach(msg.tabId)
    else if (msg.type === 'detach') void detach('user')
    else if (msg.type === 'setConfig') {
      enabled = msg.enabled
      filter = msg.filter
    } else if (msg.type === 'resolve') {
      void resolveItem(msg.id, msg.action, msg.edit)
    }
  })
  p.onDisconnect.addListener(() => {
    port = null
    void detach('ui-closed')
  })
})
