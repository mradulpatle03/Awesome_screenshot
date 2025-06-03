window.addEventListener('load', () => {
  const sources = ['screen', 'window', 'tab'];
  chrome.desktopCapture.chooseDesktopMedia(sources, streamId => {
    if (!streamId) {
      window.close();
      return;
    }

    setTimeout(() => { // ⏳ Wait for popup to disappear
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        }
      })
      .then(stream => {
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;

        video.onloadedmetadata = () => {
          video.play();

          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');

          // ⏳ Another short wait to ensure no popup flashes
          setTimeout(() => {
            ctx.drawImage(video, 0, 0);
            stream.getTracks().forEach(t => t.stop());

            canvas.toBlob(blob => {
              if (!blob) {
                alert("Failed to capture.");
              } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'desktop_capture.png';
                a.click();
                URL.revokeObjectURL(url);
              }
              window.close();
            }, 'image/png');
          }, 200); // Extra delay before drawing
        };
      })
      .catch(err => {
        console.error(err);
        alert('Error: ' + err.message);
        window.close();
      });
    }, 300); // Delay after share dialog (ensures popup is closed)
  });
});



