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
    this.baseWidth = canvasElement.width;
    this.baseHeight = canvasElement.height;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    this.syncCanvasResolution();
    window.addEventListener("resize", () => this.syncCanvasResolution());
  }

  syncCanvasResolution() {
    const width = Math.floor(this.baseWidth * this.dpr);
    const height = Math.floor(this.baseHeight * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(state, cameraActive) {
    const width = this.baseWidth;
    const height = this.baseHeight;

    this.drawFrame(width, height, state?.tracked ?? false);

    if (cameraActive && this.video.readyState >= 2) {
      this.drawMirroredVideo(width, height);
    } else {
      this.drawOfflinePlaceholder(width, height);
    }

    if (state?.tracked && Array.isArray(state.landmarks) && state.landmarks.length > 0) {
      this.drawHandSkeleton(state.landmarks, width, height);
    }

    this.drawHudLines(width, height);
  }

  drawMirroredVideo(width, height) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.video, 0, 0, width, height);
    ctx.restore();

    ctx.fillStyle = "rgba(2, 26, 38, 0.14)";
    ctx.fillRect(0, 0, width, height);
  }

  drawOfflinePlaceholder(width, height) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(6, 34, 52, 0.9)");
    gradient.addColorStop(1, "rgba(3, 19, 30, 1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(155, 196, 216, 0.82)";
    ctx.textAlign = "center";
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.fillText("CAMERA OFFLINE", width / 2, height / 2 - 4);
    ctx.fillStyle = "rgba(155, 196, 216, 0.62)";
    ctx.font = "500 11px 'JetBrains Mono', monospace";
    ctx.fillText("Inicie com camera para visualizar o espelho", width / 2, height / 2 + 16);
  }

  drawHandSkeleton(landmarks, width, height) {
    const ctx = this.ctx;
    const toScreen = (lm) => ({
      x: (1 - lm.x) * width,
      y: lm.y * height,
    });

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(142, 241, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(130, 220, 255, 0.75)";
    ctx.shadowBlur = 8;

    for (const [a, b] of HAND_CONNECTIONS) {
      const from = landmarks[a];
      const to = landmarks[b];
      if (!from || !to) {
        continue;
      }
      const p0 = toScreen(from);
      const p1 = toScreen(to);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i += 1) {
      const p = toScreen(landmarks[i]);
      const isCore = i === 0 || i === 5 || i === 9 || i === 13 || i === 17;
      ctx.beginPath();
      ctx.fillStyle = isCore ? "rgba(255, 175, 106, 0.95)" : "rgba(143, 241, 255, 0.95)";
      ctx.arc(p.x, p.y, isCore ? 3.6 : 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFrame(width, height, tracked) {
    const ctx = this.ctx;
    const color = tracked ? "rgba(143, 241, 255, 0.7)" : "rgba(143, 241, 255, 0.35)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }

  drawHudLines(width, height) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(143, 241, 255, 0.15)";
    ctx.lineWidth = 1;
    for (let y = 24; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
