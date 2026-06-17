const PANEL_PAGE = 'src/panel/index.html'

chrome.devtools.panels.create('APIScope', '', PANEL_PAGE)
