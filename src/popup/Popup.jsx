import React, { useState } from "react";

export default function Popup() {
  const [countdown, setCountdown] = useState(0);
  const [isCapturingDelay, setIsCapturingDelay] = useState(false);

  // visible part done (background.js)
  const handleVisibleCapture = () => {
    chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
      if (response?.image) {
        // Automatically download the image
        const link = document.createElement("a");
        link.href = response.image;
        link.download = "visible_capture.png";
        link.click();
      } else {
        alert("Failed to capture the visible tab.");
      }
    });
  };
  // visible part after delay done (background.js)
  const handleVisibleAfterDelay = () => {
    const delaySeconds = 3; // Change this as needed
    setCountdown(delaySeconds);
    setIsCapturingDelay(true);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsCapturingDelay(false);

          // Trigger capture
          chrome.runtime.sendMessage(
            { action: "captureVisibleTab" },
            (response) => {
              if (response?.image) {
                const link = document.createElement("a");
                link.href = response.image;
                link.download = "visible_after_delay.png";
                link.click();
              } else {
                alert("Failed to capture the visible tab after delay.");
              }
            }
          );
        }
        return prev - 1;
      });
    }, 1000);
  };
  // selected area done (content.js)
  const handleSelectedArea = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { action: "startAreaCapture" });
    });
  };
  // annotate local done (annotate.html , annotate.js , fabric.min.js)
  const handleAnnotateLocal = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const imageData = e.target.result;

        // Save to storage, THEN open tab
        chrome.storage.local.set({ annotatedImageData: imageData }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving image:", chrome.runtime.lastError);
            return;
          }
          console.log("Image data saved successfully.");
          // Only open new tab AFTER image is saved
          chrome.tabs.create({ url: chrome.runtime.getURL("annotate.html") });
          window.close(); // close popup
        });
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };
  // working ...partially (content.js)
  const handleFullPageCapture = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { action: "startFullPageCapture" });
    });
  };

  // done by VPb
  const handleDesktopCapture = () => {
    
  };
  
  const handleSignIn = () => {};

  return (
    <div className="min-w-[450px] w-auto p-5 font-sans text-sm space-y-5 border border-gray-300 rounded-2xl shadow-lg bg-gradient-to-br from-white via-blue-50 to-blue-100">
      <div className="text-center text-lg font-bold text-blue-800 border border-blue-200 rounded-lg py-3 bg-blue-100 shadow-sm select-none">
        Capture
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          className="w-full border border-blue-300 rounded-lg p-3 bg-white hover:bg-blue-100 text-blue-700 font-semibold shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={handleVisibleCapture}
          aria-label="Capture visible part"
        >
          Visible part
        </button>
        <button
          className="w-full border border-blue-300 rounded-lg p-3 bg-white hover:bg-blue-100 text-blue-700 font-semibold shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={handleSelectedArea}
          aria-label="Capture selected area"
        >
          Selected area
        </button>
      </div>

      <div className="flex justify-center">
        <button
          className="w-[50%] border border-blue-300 rounded-lg p-3 bg-white hover:bg-blue-100 text-blue-700 font-semibold shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={handleFullPageCapture}
          aria-label="Capture full page"
        >
          Full page
        </button>
      </div>

      <div className="space-y-4">
        <button
          className={`w-full border border-indigo-300 rounded-lg p-3 ${
            isCapturingDelay
              ? "bg-indigo-200 text-indigo-400"
              : "bg-white hover:bg-indigo-100 text-indigo-700"
          } font-medium shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400`}
          onClick={handleVisibleAfterDelay}
          aria-label="Capture visible part after delay"
          disabled={isCapturingDelay}
        >
          {isCapturingDelay
            ? `Capturing in ${countdown}...`
            : "Visible part after delay"}
        </button>

        <button
          className="w-full border border-indigo-300 rounded-lg p-3 bg-white hover:bg-indigo-100 text-indigo-700 font-medium shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onClick={handleDesktopCapture}
          aria-label="Capture entire screen and app window"
        >
          Entire screen & app window
        </button>
        <button
          className="w-full border border-purple-300 rounded-lg p-3 bg-white hover:bg-purple-100 text-purple-700 font-medium shadow-sm transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400"
          onClick={handleAnnotateLocal}
          aria-label="Annotate local image"
        >
          Annotate local
        </button>
      </div>

      <div className="pt-5">
        <a href="https://explified-home.web.app/login" target="_blank">
          <button
            onClick={handleSignIn}
            className="w-full border border-blue-600 text-white rounded-lg p-3 bg-blue-600 hover:bg-blue-700 shadow-lg transition duration-300 ease-in-out font-semibold focus:outline-none focus:ring-4 focus:ring-blue-400"
            aria-label="Sign in"
          >
            Sign in
          </button>
        </a>
      </div>
    </div>
  );
}
