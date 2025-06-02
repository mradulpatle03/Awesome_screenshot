(async () => {
    try {
      const streamId = await new Promise((resolve, reject) => {
        chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab"], (id) => {
          if (!id) reject("User cancelled");
          else resolve(id);
        });
      });
  
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: streamId,
          },
        },
      });
  
      const video = document.createElement("video");
      video.srcObject = stream;
  
      video.onloadedmetadata = () => {
        video.play();
  
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
        const image = canvas.toDataURL("image/png");
        stream.getTracks().forEach((t) => t.stop());
  
        // Auto-download
        const a = document.createElement("a");
        a.href = image;
        a.download = "desktop_capture.png";
        a.click();
  
        setTimeout(() => {
          window.close();
        }, 1000);
      };
    } catch (err) {
      console.error("Capture failed:", err);
      alert("Screen capture failed.");
      window.close();
    }
  })();
  