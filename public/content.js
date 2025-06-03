// selected area done
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

// full page capture done
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startFullPageCapture") {
    //  ── 1. Locate the “best” scrollable container ────────────────────────────────────────
    function findMainScrollContainer() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const centerX = vw / 2;
      const centerY = vh / 2;

      // Start with a fallback of <html> or <body>
      let bestCandidate = document.scrollingElement || document.documentElement;
      let maxScore = 0;

      document.querySelectorAll("body *").forEach((el) => {
        const style = getComputedStyle(el);
        const hasScrollY = el.scrollHeight > el.clientHeight + 50;
        const overflowY = style.overflowY;

        // Must be scrollable in Y
        if (!hasScrollY || !(overflowY === "scroll" || overflowY === "auto")) {
          return;
        }

        const rect = el.getBoundingClientRect();

        // Skip elements that are too narrow or too short
        if (rect.width < vw * 0.4 || rect.height < vh * 0.3) {
          return;
        }

        // Semantic boost if this is <main>, <article>, <section>, or [role="main"]
        let semanticBoost = 1;
        const tag = el.tagName.toLowerCase();
        if (["main", "article", "section"].includes(tag) || el.getAttribute("role") === "main") {
          semanticBoost = 3;
        }

        // Compute distance from viewport center
        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;
        const distanceToCenter = Math.hypot(elCenterX - centerX, elCenterY - centerY);
        const centerScore = 1 / (distanceToCenter + 1); // avoid divide by zero

        // Width ratio penalty (narrow elements get penalized)
        const widthRatio = rect.width / vw;   // e.g. sidebar ~0.2, main ~0.6
        const widthPenalty = widthRatio;      // so narrower means smaller

        // Size score: height matters more, width matters some
        const heightRatio = rect.height / vh;
        const sizeScore = heightRatio + 0.5 * widthRatio;

        // FINAL SCORE = (sizeScore × centerScore × widthPenalty) + semanticBoost
        const finalScore = sizeScore * centerScore * widthPenalty + semanticBoost;

        if (finalScore > maxScore) {
          maxScore = finalScore;
          bestCandidate = el;
        }
      });

      return bestCandidate;
    }

    const scrollContainer = findMainScrollContainer();
    const totalScrollHeight = scrollContainer.scrollHeight;
    const visibleHeight = scrollContainer.clientHeight;
    const scrollStep = visibleHeight;
    const totalScrolls = Math.ceil(totalScrollHeight / scrollStep);

    //  ── 2. Hide any fixed/sticky elements that might overlap during capture ─────────────
    const hiddenElements = [];
    document.querySelectorAll("body *").forEach((el) => {
      const style = getComputedStyle(el);
      const pos = style.position;
      const zIndex = parseInt(style.zIndex) || 0;
      if ((pos === "fixed" || pos === "sticky") && zIndex >= 10) {
        const prevStyles = {
          visibility: el.style.visibility,
          opacity: el.style.opacity,
          pointerEvents: el.style.pointerEvents,
          transform: el.style.transform,
        };
        el.setAttribute("data-capture-hidden", JSON.stringify(prevStyles));
        hiddenElements.push(el);
        el.style.visibility = "hidden";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.transform = "none";
      }
    });

    //  ── 3. Scroll & capture each “page” of the container ──────────────────────────────────
    const captures = [];
    let currentIndex = 0;

    const captureScroll = () => {
      const scrollY = currentIndex * scrollStep;
      scrollContainer.scrollTo(0, scrollY);

      requestAnimationFrame(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
            if (!response?.image) {
              console.error("Capture failed at scroll index", currentIndex);
              return;
            }

            captures.push({ image: response.image, y: scrollY });
            currentIndex++;

            if (currentIndex < totalScrolls) {
              captureScroll();
            } else {
              // When done, scroll back to top and restore hidden elements
              scrollContainer.scrollTo(0, 0);
              hiddenElements.forEach((el) => {
                const prev = JSON.parse(el.getAttribute("data-capture-hidden"));
                if (prev) {
                  el.style.visibility = prev.visibility;
                  el.style.opacity = prev.opacity;
                  el.style.pointerEvents = prev.pointerEvents;
                  el.style.transform = prev.transform;
                }
                el.removeAttribute("data-capture-hidden");
              });
              stitchCaptures(captures, totalScrollHeight, scrollContainer.clientWidth);
            }
          });
        }, 400); // allow layout to settle
      });
    };

    //  ── 4. Stitch all captured images into one big canvas ─────────────────────────────────
    const stitchCaptures = (captures, fullHeight, width) => {
      const scale = window.devicePixelRatio;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = fullHeight * scale;
      const ctx = canvas.getContext("2d");

      let loadedCount = 0;
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
          loadedCount++;
          if (loadedCount === captures.length) {
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

    // Kick off the scroll-and-capture sequence
    captureScroll();
    return; // end of listener
  }
});

