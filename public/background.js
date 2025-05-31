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
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "chooseDesktopMedia") {
//     chrome.desktopCapture.chooseDesktopMedia(
//       ["screen", "window", "tab"],
//       (streamId) => {
//         if (!streamId) {
//           sendResponse({ success: false });
//         } else {
//           sendResponse({ success: true, streamId });
//         }
//       }
//     );
//     return true; // Keep message channel open
//   }

//   if (request.action === "captureVisibleTab") {
//     chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
//       if (chrome.runtime.lastError || !image) {
//         sendResponse({ success: false });
//       } else {
//         sendResponse({ success: true, image });
//       }
//     });
//     return true;
//   }
// });

// annotate
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
      if (chrome.runtime.lastError || !image) {
        sendResponse({ success: false });
      } else {
        sendResponse({ success: true, image });
      }
    });
    return true;
  }
});



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openAnnotateTab") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("annotate.html") + `?image=${encodeURIComponent(request.imageData)}`
    });
    sendResponse({ success: true });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getScreenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, function(dataUrl) {
      sendResponse({ dataUrl });
    });
    return true; // Indicates async response
  }
});


