const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export class WebcamMirrorRenderer {
  constructor(canvasElement, videoElement) {
    this.canvas = canvasElement;
    this.video = videoElement;
    this.ctx = canvasElement.getContext("2d");
    this.width = canvasElement.width;
    this.height = canvasElement.height;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    this.syncCanvasResolution();
    window.addEventListener("resize", () => this.syncCanvasResolution());
  }

  syncCanvasResolution() {
    const width = Math.floor(this.width * this.dpr);
    const height = Math.floor(this.height * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(state, cameraActive) {
    if (cameraActive && this.video.readyState >= 2) {
      this.drawMirroredVideo();
    } else {
      this.drawOfflineFrame();
    }

    this.drawOverlayGrid();

    if (state?.tracked && Array.isArray(state.landmarks) && state.landmarks.length > 0) {
      this.drawSkeleton(state.landmarks);
    }
  }

  drawMirroredVideo() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.video, 0, 0, this.width, this.height);
    ctx.restore();
    ctx.fillStyle = "rgba(3, 29, 46, 0.16)";
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawOfflineFrame() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "rgba(4, 26, 40, 0.93)");
    gradient.addColorStop(1, "rgba(1, 16, 25, 0.95)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "rgba(168, 209, 229, 0.82)";
    ctx.textAlign = "center";
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.fillText("CAMERA OFFLINE", this.width / 2, this.height / 2 - 2);
  }

  drawOverlayGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(143, 239, 255, 0.17)";
    ctx.lineWidth = 1;
    for (let y = 20; y < this.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSkeleton(landmarks) {
    const ctx = this.ctx;
    const toScreen = (point) => ({
      x: (1 - point.x) * this.width,
      y: point.y * this.height,
    });

    ctx.save();
    ctx.strokeStyle = "rgba(141, 242, 255, 0.86)";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(124, 224, 255, 0.76)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (const [from, to] of HAND_CONNECTIONS) {
      const start = landmarks[from];
      const end = landmarks[to];
      if (!start || !end) {
        continue;
      }
      const p0 = toScreen(start);
      const p1 = toScreen(end);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    for (let index = 0; index < landmarks.length; index += 1) {
      const point = toScreen(landmarks[index]);
      const isPalmAnchor = index === 0 || index === 5 || index === 9 || index === 13 || index === 17;
      ctx.fillStyle = isPalmAnchor ? "rgba(245, 177, 113, 0.95)" : "rgba(144, 243, 255, 0.95)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, isPalmAnchor ? 3.2 : 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
