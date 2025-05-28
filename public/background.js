chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // done
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

// currently working on







