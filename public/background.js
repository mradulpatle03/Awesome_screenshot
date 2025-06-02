chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // visible part done
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


// working 