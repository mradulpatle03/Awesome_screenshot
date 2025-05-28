import React, { useState } from "react";

export default function Popup() {
  const [countdown, setCountdown] = useState(0);
  const [isCapturingDelay, setIsCapturingDelay] = useState(false);

  // done
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
  // done
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
  // done
  const handleSelectedArea = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { action: "startAreaCapture" });
    });
  };

  // partially done 
  const handleFullPageCapture = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { action: "startFullPageCapture" });
    });
  };
  
  // currently working
  const handleDesktopCapture = () => {
    console.log("[DEBUG] Starting desktop capture...");
  
    chrome.desktopCapture.chooseDesktopMedia(
      ["screen", "window", "tab"],
      async (streamId) => {
        console.log("[DEBUG] chooseDesktopMedia returned streamId:", streamId);
  
        if (!streamId) {
          alert("Desktop capture was canceled or failed.");
          return;
        }
  
        try {
          const constraints = {
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: streamId,
                maxWidth: 10000,
                maxHeight: 10000,
              },
            },
          };
  
          console.log("[DEBUG] Requesting getUserMedia with constraints:", constraints);
  
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("[DEBUG] Stream acquired successfully:", stream);
  
          const video = document.createElement("video");
          video.srcObject = stream;
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;
          video.style.position = "fixed";
          video.style.top = "-10000px";
          document.body.appendChild(video);
  
          video.addEventListener("loadedmetadata", () => {
            console.log("[DEBUG] Video loaded metadata. Dimensions:", video.videoWidth, video.videoHeight);
  
            video.play().then(() => {
              console.log("[DEBUG] Video started playing.");
  
              requestAnimationFrame(() => {
                const width = video.videoWidth;
                const height = video.videoHeight;
  
                if (!width || !height) {
                  console.error("[ERROR] Could not determine video size.");
                  alert("Could not determine video size.");
                  stream.getTracks().forEach((t) => t.stop());
                  video.remove();
                  return;
                }
  
                console.log("[DEBUG] Capturing frame from video:", width, height);
  
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, width, height);
  
                stream.getTracks().forEach((t) => t.stop());
                video.remove();
  
                canvas.toBlob((blob) => {
                  if (!blob) {
                    console.error("[ERROR] Failed to create screenshot blob.");
                    alert("Failed to capture the screen.");
                    return;
                  }
  
                  console.log("[DEBUG] Screenshot blob created, preparing download...");
  
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "desktop_capture.png";
                  a.click();
                  URL.revokeObjectURL(url);
                }, "image/png");
              });
            }).catch((err) => {
              console.error("[ERROR] Failed to play video:", err);
              alert("Video playback failed.");
            });
          });
  
          video.addEventListener("error", (e) => {
            console.error("[ERROR] Video element error:", e);
            alert("An error occurred with the video element.");
          });
  
        } catch (err) {
          console.error("[ERROR] getUserMedia failed:", err);
          alert("Failed to access screen: " + err.message);
        }
      }
    );
  };
  
  
  
  const handleAnnotateLocal = () => {};
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
        <button
          onClick={handleSignIn}
          className="w-full border border-blue-600 text-white rounded-lg p-3 bg-blue-600 hover:bg-blue-700 shadow-lg transition duration-300 ease-in-out font-semibold focus:outline-none focus:ring-4 focus:ring-blue-400"
          aria-label="Sign in"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
