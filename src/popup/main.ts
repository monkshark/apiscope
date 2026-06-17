import { UPDATE_STORAGE_KEY, type UpdateInfo } from '../core/update'

const versionEl = document.getElementById('version')
if (versionEl) versionEl.textContent = `v${chrome.runtime.getManifest().version}`

const updateEl = document.getElementById('update')
const updateVersionEl = document.getElementById('update-version')
const updateLink = document.getElementById('update-link')
chrome.storage.local.get(UPDATE_STORAGE_KEY, (res) => {
  const info = res[UPDATE_STORAGE_KEY] as UpdateInfo | undefined
  if (!info?.available || !updateEl) return
  if (updateVersionEl) updateVersionEl.textContent = info.latestVersion
  updateEl.style.display = 'flex'
  updateLink?.addEventListener('click', () => {
    chrome.tabs.create({ url: info.url })
    window.close()
  })
})

const decoderBtn = document.getElementById('decoder')
const viewerBtn = document.getElementById('viewer')
const interceptBtn = document.getElementById('intercept')

decoderBtn?.addEventListener('click', async () => {
  const win = await chrome.windows.getCurrent()
  if (win.id != null) await chrome.sidePanel.open({ windowId: win.id })
  window.close()
})

viewerBtn?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/viewer/index.html') })
  window.close()
})

interceptBtn?.addEventListener('click', () => {
  chrome.windows.create({
    url: chrome.runtime.getURL('src/intercept/index.html'),
    type: 'popup',
    width: 960,
    height: 720,
  })
  window.close()
})
