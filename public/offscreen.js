chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "triggerDesktopCapture") {
      chrome.desktopCapture.chooseDesktopMedia(
        ["screen", "window", "tab"],
        (streamId) => {
          if (!streamId) {
            console.error("User cancelled screen share.");
            return;
          }
  
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: streamId,
                maxWidth: 4000,
                maxHeight: 4000
              }
            }
          }).then((stream) => {
            const video = document.createElement("video");
            video.srcObject = stream;
            video.play();
  
            video.onloadedmetadata = () => {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
  
              const ctx = canvas.getContext("2d");
              ctx.drawImage(video, 0, 0);
  
              canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "desktop_capture.png";
                a.click();
                URL.revokeObjectURL(url);
                stream.getTracks().forEach(t => t.stop());
              }, "image/png");
            };
          }).catch((err) => {
            console.error("getUserMedia failed:", err);
          });
        }
      );
    }
  });
  