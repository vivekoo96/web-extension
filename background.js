chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const busBookingWebsites = ['ourbus.com/booknow', 'wanderu.com']
    const url = new URL(tab.url)

    if (busBookingWebsites.some((site) => url.hostname.includes(site))) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ['content.js'],
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              'Script injection failed: ',
              chrome.runtime.lastError.message
            )
          }
        }
      )
    }
  }
})
