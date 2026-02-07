export class CanvasRenderer {
  constructor(canvasElement, dimensions) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.width = dimensions.width;
    this.height = dimensions.height;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    this.syncCanvasResolution();
    window.addEventListener("resize", () => this.syncCanvasResolution());
  }

  syncCanvasResolution() {
    const requiredWidth = Math.floor(this.width * this.dpr);
    const requiredHeight = Math.floor(this.height * this.dpr);
    if (this.canvas.width !== requiredWidth || this.canvas.height !== requiredHeight) {
      this.canvas.width = requiredWidth;
      this.canvas.height = requiredHeight;
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(snapshot, overlays) {
    this.drawBackground();
    this.drawMiddleLine();
    this.drawPaddles(snapshot);
    this.drawBall(snapshot.ball);
    this.drawScore(snapshot.score);
    this.drawModeBadge(snapshot.controlMode, overlays.demoModeActive);
    this.drawHandIndicator(overlays);
    this.drawRoundCountdown(snapshot.roundResetTimerMs);
  }

  drawBackground() {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#00131f");
    gradient.addColorStop(1, "#022236");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.strokeStyle = "rgba(168, 225, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let y = 32; y < this.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMiddleLine() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(235, 245, 255, 0.24)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(this.width / 2, 18);
    ctx.lineTo(this.width / 2, this.height - 18);
    ctx.stroke();
    ctx.restore();
  }

  drawPaddles(snapshot) {
    const ctx = this.ctx;
    const paddle = snapshot.paddle;
    const leftX = paddle.margin;
    const rightX = this.width - paddle.margin - paddle.width;

    ctx.fillStyle = "#9cf6ff";
    ctx.fillRect(leftX, snapshot.playerPaddleY, paddle.width, paddle.height);

    ctx.fillStyle = "#ffb067";
    ctx.fillRect(rightX, snapshot.aiPaddleY, paddle.width, paddle.height);
  }

  drawBall(ball) {
    const ctx = this.ctx;
    const radius = Number.isFinite(ball.radius) ? ball.radius : 9;
    ctx.save();
    ctx.fillStyle = "#f5fbff";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#8de6ff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawScore(score) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#f3fcff";
    ctx.textAlign = "center";
    ctx.font = "700 62px 'JetBrains Mono', monospace";
    ctx.fillText(String(score.player), this.width * 0.38, 78);
    ctx.fillText(String(score.ai), this.width * 0.62, 78);
    ctx.restore();
  }

  drawModeBadge(controlMode, demoModeActive) {
    const ctx = this.ctx;
    const text = demoModeActive
      ? "MODO DEMO"
      : controlMode === "gesture"
        ? "CONTROLE GESTUAL"
        : "AUTO ASSIST";

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(this.width / 2 - 120, this.height - 48, 240, 30);
    ctx.fillStyle = "#eaf9ff";
    ctx.textAlign = "center";
    ctx.font = "600 14px 'Sora', sans-serif";
    ctx.fillText(text, this.width / 2, this.height - 28);
    ctx.restore();
  }

  drawHandIndicator(overlays) {
    if (!overlays.showHandIndicator) {
      return;
    }

    const indicatorY = overlays.handY * this.height;
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "rgba(156, 246, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, indicatorY);
    ctx.lineTo(this.width * 0.35, indicatorY);
    ctx.stroke();

    ctx.fillStyle = "#9cf6ff";
    ctx.beginPath();
    ctx.arc(18, indicatorY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawRoundCountdown(roundResetTimerMs) {
    if (roundResetTimerMs <= 0) {
      return;
    }

    const seconds = (roundResetTimerMs / 1000).toFixed(1);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
    ctx.fillRect(this.width / 2 - 120, this.height / 2 - 26, 240, 50);
    ctx.fillStyle = "#f8fdff";
    ctx.textAlign = "center";
    ctx.font = "600 20px 'Sora', sans-serif";
    ctx.fillText(`Novo saque em ${seconds}s`, this.width / 2, this.height / 2 + 8);
    ctx.restore();
  }
}
