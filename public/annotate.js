const canvas = new fabric.Canvas("c", {
  isDrawingMode: false,
  backgroundColor: "white",
});

let undoStack = [];
let currentColor = "#ff0000";
let currentWidth = 3;
let activeTool = null;

document.addEventListener("DOMContentLoaded", () => {
  function loadImageWithRetry(retries = 5) {
    console.log("Starting image load...");
    chrome.storage.local.get("annotatedImageData", (data) => {
      console.log("Data retrieved from storage:", data);
      const imageData = data.annotatedImageData;
      if (!imageData) {
        console.error("No image data found.");
        alert("No image found. Please try again.");
        return;
      }
      console.log("Image data found, proceeding to load...");

      fabric.Image.fromURL(
        imageData,
        (img) => {
          if (!img) {
            alert("Failed to load the image. Please try again.");
            return;
          }

          const ratio = img.width / img.height;
          const maxWidth = window.innerWidth;
          const toolbarHeight =
            document.getElementById("toolbar").offsetHeight || 0;
          const maxHeight = window.innerHeight - toolbarHeight;

          let width = maxWidth;
          let height = width / ratio;

          if (height > maxHeight) {
            height = maxHeight;
            width = height * ratio;
          }

          canvas.setWidth(width);
          canvas.setHeight(height);

          img.set({
            left: 0,
            top: 0,
            scaleX: width / img.width,
            scaleY: height / img.height,
            selectable: false,
            evented: false,
          });

          originalImage = img;
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        },
        { crossOrigin: "anonymous" }
      );
    });
  }

  loadImageWithRetry();
});

document.getElementById("drawColor").oninput = (e) => {
  currentColor = e.target.value;
  if (canvas.isDrawingMode) canvas.freeDrawingBrush.color = currentColor;
};

document.getElementById("drawWidth").oninput = (e) => {
  currentWidth = parseInt(e.target.value);
  if (canvas.isDrawingMode) canvas.freeDrawingBrush.width = currentWidth;
};

function deactivateAllTools() {
  activeTool = null;
  canvas.isDrawingMode = false;
  canvas.selection = true;
  canvas.defaultCursor = "default";

  // Remove all special event handlers
  canvas.off("mouse:down");
  canvas.off("mouse:move");
  canvas.off("mouse:up");
}

function setActiveTool(toolName) {
  deactivateAllTools();
  activeTool = toolName;
}

document.getElementById("draw").onclick = () => {
  if (activeTool === "draw") {
    deactivateAllTools();
  } else {
    setActiveTool("draw");
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.color = currentColor;
    canvas.freeDrawingBrush.width = currentWidth;
  }
};

document.getElementById("undo").onclick = () => {
  const last = canvas.getObjects().pop();
  if (last) {
    undoStack.push(last);
    canvas.remove(last);
    canvas.renderAll();
  }
};

document.getElementById("redo").onclick = () => {
  if (undoStack.length > 0) {
    const obj = undoStack.pop();
    canvas.add(obj);
    canvas.renderAll();
  }
};

document.getElementById("clear").onclick = () => {
  canvas.getObjects().forEach((obj) => {
    if (obj !== canvas.backgroundImage) canvas.remove(obj);
  });
  canvas.renderAll();
  deactivateAllTools();
};

document.getElementById("rect").onclick = () => {
  setActiveTool("rect");
  const rect = new fabric.Rect({
    left: 100,
    top: 100,
    width: 100,
    height: 60,
    fill: "transparent",
    stroke: currentColor,
    strokeWidth: currentWidth,
    selectable: true,
  });
  canvas.add(rect).setActiveObject(rect);
  deactivateAllTools();
};

document.getElementById("circle").onclick = () => {
  setActiveTool("circle");
  const circle = new fabric.Circle({
    left: 150,
    top: 150,
    radius: 40,
    fill: "transparent",
    stroke: currentColor,
    strokeWidth: currentWidth,
    selectable: true,
  });
  canvas.add(circle).setActiveObject(circle);
  deactivateAllTools();
};

document.getElementById("arrow").onclick = () => {
  setActiveTool("arrow");
  const line = new fabric.Line([50, 100, 200, 100], {
    stroke: currentColor,
    strokeWidth: currentWidth,
    selectable: true,
  });

  const triangle = new fabric.Triangle({
    left: 200,
    top: 100,
    originX: "center",
    originY: "center",
    angle: 90,
    width: 10,
    height: 10,
    fill: currentColor,
    selectable: true,
  });

  const group = new fabric.Group([line, triangle], {
    left: 50,
    top: 100,
    selectable: true,
  });

  canvas.add(group).setActiveObject(group);
  deactivateAllTools();
};

document.getElementById("text").onclick = () => {
  setActiveTool("text");
  const text = new fabric.IText("Text", {
    left: 50,
    top: 50,
    fill: currentColor,
    fontSize: 24,
    selectable: true,
  });
  canvas.add(text).setActiveObject(text);
  deactivateAllTools();
};

// Variables for crop and highlight modes
let cropRect;
let isCropping = false;
let isHighlighting = false;
const highlightColor = "rgba(255, 255, 0, 0.3)"; // semi-transparent yellow

document.getElementById("crop").onclick = () => {
  deactivateAllTools();
  isCropping = true;
  canvas.selection = false;
  canvas.defaultCursor = "crosshair";

  let startX, startY;

  cropRect = new fabric.Rect({
    fill: "rgba(0,0,0,0.3)",
    originX: "left",
    originY: "top",
    stroke: "red",
    strokeDashArray: [5, 5],
    opacity: 1,
    visible: false,
    selectable: false,
  });
  canvas.add(cropRect);

  canvas.on("mouse:down", function (opt) {
    if (!isCropping) return;
    const pointer = canvas.getPointer(opt.e);
    startX = pointer.x;
    startY = pointer.y;
    cropRect.set({
      left: startX,
      top: startY,
      width: 0,
      height: 0,
      visible: true,
    });
    canvas.renderAll();
  });

  canvas.on("mouse:move", function (opt) {
    if (!isCropping || !cropRect.visible) return;
    const pointer = canvas.getPointer(opt.e);
    let width = pointer.x - startX;
    let height = pointer.y - startY;

    if (width < 0) {
      cropRect.set({ left: pointer.x, width: Math.abs(width) });
    } else {
      cropRect.set({ width: width });
    }
    if (height < 0) {
      cropRect.set({ top: pointer.y, height: Math.abs(height) });
    } else {
      cropRect.set({ height: height });
    }
    canvas.renderAll();
  });

  canvas.on("mouse:up", function () {
    if (!isCropping) return;

    if (cropRect.width < 5 || cropRect.height < 5) {
      // too small, cancel
      canvas.remove(cropRect);
      cropRect = null;
      isCropping = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.off("mouse:down");
      canvas.off("mouse:move");
      canvas.off("mouse:up");
      return;
    }

    // Crop the canvas to cropRect bounds
    const left = cropRect.left;
    const top = cropRect.top;
    const width = cropRect.width;
    const height = cropRect.height;

    const croppedDataUrl = canvas.toDataURL({
      left: left,
      top: top,
      width: width,
      height: height,
    });

    fabric.Image.fromURL(croppedDataUrl, (img) => {
      canvas.clear();
      canvas.setWidth(width);
      canvas.setHeight(height);
      img.set({ left: 0, top: 0 });
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

      // Reset crop state
      isCropping = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.off("mouse:down");
      canvas.off("mouse:move");
      canvas.off("mouse:up");
    });
  });
};

document.getElementById("resize").onclick = () => {
  deactivateAllTools();

  const newWidth = parseInt(
    prompt("Enter new width in pixels:", canvas.getWidth())
  );
  if (!newWidth || newWidth <= 0) return alert("Invalid width!");
  const newHeight = parseInt(
    prompt("Enter new height in pixels:", canvas.getHeight())
  );
  if (!newHeight || newHeight <= 0) return alert("Invalid height!");

  // Resize canvas and scale background image and objects
  const bg = canvas.backgroundImage;
  if (bg) {
    const scaleX = newWidth / canvas.getWidth();
    const scaleY = newHeight / canvas.getHeight();

    bg.scaleX *= scaleX;
    bg.scaleY *= scaleY;
    bg.left *= scaleX;
    bg.top *= scaleY;

    canvas.setWidth(newWidth);
    canvas.setHeight(newHeight);

    canvas.getObjects().forEach((obj) => {
      obj.scaleX *= scaleX;
      obj.scaleY *= scaleY;
      obj.left *= scaleX;
      obj.top *= scaleY;
      obj.setCoords();
    });

    canvas.renderAll();
  } else {
    canvas.setWidth(newWidth);
    canvas.setHeight(newHeight);
    canvas.renderAll();
  }
};

// Highlight tool with exclusive activation
document.getElementById("highlight").onclick = () => {
  if (activeTool === "highlight") {
    // Deactivate highlight tool
    deactivateAllTools();
  } else {
    setActiveTool("highlight");
    isHighlighting = true;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair";

    let rect,
      startX,
      startY,
      isDown = false;

    canvas.on("mouse:down", function (opt) {
      if (activeTool !== "highlight") return;
      isDown = true;
      const pointer = canvas.getPointer(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      rect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: highlightColor,
        selectable: false,
        evented: false,
        rx: 6,
        ry: 6,
      });
      canvas.add(rect);
    });

    canvas.on("mouse:move", function (opt) {
      if (!isDown || activeTool !== "highlight") return;
      const pointer = canvas.getPointer(opt.e);
      let width = pointer.x - startX;
      let height = pointer.y - startY;

      if (width < 0) {
        rect.set({ left: pointer.x, width: Math.abs(width) });
      } else {
        rect.set({ width: width });
      }
      if (height < 0) {
        rect.set({ top: pointer.y, height: Math.abs(height) });
      } else {
        rect.set({ height: height });
      }
      canvas.renderAll();
    });

    canvas.on("mouse:up", function () {
      if (activeTool !== "highlight") return;
      isDown = false;
      if (rect.width < 5 || rect.height < 5) {
        canvas.remove(rect);
      }
      rect = null;
    });
  }
};

document.getElementById("download").onclick = () => {
  const link = document.createElement("a");
  link.download = "annotated-image.png";
  link.href = canvas.toDataURL({ format: "png" });
  link.click();
};




