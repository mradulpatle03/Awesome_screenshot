// visible part + delay done
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // (visible part + after delay) done
  if (request.action === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
      if (chrome.runtime.lastError || !image) {
        sendResponse({ success: false });
        return;
      }
      sendResponse({ success: true, image });
    });
    return true;
  }
});

//  desktop capture 80% done
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startDesktopCapture') {
    chrome.windows.create({
      url: chrome.runtime.getURL('capture.html'),
      type: 'popup',
      width: 500,
      height: 500,
      top: 100,
      left: 100,
      focused: true
    });
  }
});


// signin
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Handle token store
  if (message.type === "store_token_awesome_screenshot" && message.token) {
    chrome.storage.sync.set({ auth_token_awesome_screenshot: message.token }, () => {
      console.log("Token stored successfully:", message.token);
      sendResponse({ status: "stored" });
    });
    return true; // Keep port open for async
  }
});