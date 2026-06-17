import { TAMPER_STORAGE_KEY, type TamperRule } from '../core/tamper'

let current: TamperRule[] = []

function push(): void {
  window.postMessage(
    { __apiScopeTamper: 'rules', rules: current.filter((r) => r.enabled) },
    '*',
  )
}

window.addEventListener('message', (e) => {
  if (e.source !== window) return
  const data = e.data as { __apiScopeTamper?: string }
  if (data && data.__apiScopeTamper === 'ready') push()
})

chrome.storage.local.get(TAMPER_STORAGE_KEY).then((stored) => {
  current = (stored[TAMPER_STORAGE_KEY] as TamperRule[]) ?? []
  push()
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  const change = changes[TAMPER_STORAGE_KEY]
  if (!change) return
  current = (change.newValue as TamperRule[]) ?? []
  push()
})
