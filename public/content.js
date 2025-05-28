// done
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "startAreaCapture") return;

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.2)",
    cursor: "crosshair",
    zIndex: 999999,
  });
  document.body.appendChild(overlay);

  let startX, startY, endX, endY;
  const selectionBox = document.createElement("div");
  Object.assign(selectionBox.style, {
    position: "absolute",
    border: "2px dashed #000",
    backgroundColor: "rgba(255,255,255,0.3)",
    pointerEvents: "none",
  });
  overlay.appendChild(selectionBox);

  const onMouseDown = (e) => {
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e) => {
    endX = e.clientX;
    endY = e.clientY;
    const rect = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };
    Object.assign(selectionBox.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };

  const onMouseUp = () => {
    overlay.removeEventListener("mousemove", onMouseMove);
    overlay.removeEventListener("mouseup", onMouseUp);

    const rect = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
    };

    // Hide the selection box before capture!
    overlay.style.display = "none";

    // Capture the tab
    chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
      if (!response?.success || !response?.image) {
        console.error("Failed to capture visible tab.");
        // Clean up
        document.body.removeChild(overlay);
        return;
      }

      const scale = window.devicePixelRatio;
      const img = new Image();
      img.src = response.image;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          rect.x * scale,
          rect.y * scale,
          rect.width * scale,
          rect.height * scale,
          0,
          0,
          rect.width * scale,
          rect.height * scale
        );

        canvas.toBlob((blob) => {
          if (!blob) {
            console.error(
              "Failed to create blob. The canvas might be empty or tainted."
            );
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "selected_area.png";
          a.click();
          URL.revokeObjectURL(url);
        }, "image/png");

        // Clean up overlay
        document.body.removeChild(overlay);
      };
    });
  };

  overlay.addEventListener("mousedown", onMouseDown);
});

////////////

// partially done
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startFullPageCapture") {
    const html = document.documentElement;
    const totalHeight = html.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollStep = viewportHeight;
    const totalScrolls = Math.ceil(totalHeight / scrollStep);
    const captures = [];
  
    let currentIndex = 0;
  
    // === 1. Hide fixed/sticky elements ===
    const hiddenElements = [];
    const allElements = Array.from(document.querySelectorAll("body *"));
    allElements.forEach((el) => {
      const style = getComputedStyle(el);
      const position = style.position;
      if (position === "fixed" || position === "sticky") {
        el.setAttribute("data-capture-hidden", "true");
        hiddenElements.push(el);
        el.style.visibility = "hidden";
      }
    });
  
    const captureScroll = () => {
      const scrollY = currentIndex * scrollStep;
      window.scrollTo(0, scrollY);
  
      requestAnimationFrame(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
            if (!response?.image) {
              console.error("Capture failed at scroll index", currentIndex);
              return;
            }
  
            captures.push({ image: response.image, y: window.scrollY });
  
            currentIndex++;
            if (currentIndex < totalScrolls) {
              captureScroll();
            } else {
              window.scrollTo(0, 0); // Reset scroll
              restoreHiddenElements(); // Restore headers
              stitchCaptures(captures, totalHeight, window.innerWidth);
            }
          });
        }, 350); // Wait for layout/render
      });
    };
  
    const restoreHiddenElements = () => {
      hiddenElements.forEach((el) => {
        el.style.visibility = "";
        el.removeAttribute("data-capture-hidden");
      });
    };
  
    const stitchCaptures = (captures, fullHeight, width) => {
      const scale = window.devicePixelRatio;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = fullHeight * scale;
  
      const ctx = canvas.getContext("2d");
      let loaded = 0;
  
      captures.forEach((cap) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            0,
            cap.y * scale,
            img.width,
            img.height
          );
          loaded++;
          if (loaded === captures.length) {
            canvas.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "full_page.png";
              a.click();
              URL.revokeObjectURL(url);
            }, "image/png");
          }
        };
        img.src = cap.image;
      });
    };
  
    captureScroll();
    return;
  }
  
});

