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
      width: 400,
      height: 300,
      top: 100,
      left: 100,
      focused: true
    });
  }
});