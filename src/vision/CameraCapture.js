export class CameraCapture {
  constructor(videoElement, onFrame, options = {}) {
    if (typeof window.Camera === "undefined") {
      throw new Error("MediaPipe Camera Utils nao encontrado.");
    }

    this.videoElement = videoElement;
    this.onFrame = onFrame;
    this.width = options.width ?? 640;
    this.height = options.height ?? 360;
    this.camera = new window.Camera(this.videoElement, {
      width: this.width,
      height: this.height,
      onFrame: this.onFrame,
    });
    this.started = false;
  }

  async start() {
    if (this.started) {
      return;
    }
    await this.camera.start();
    this.started = true;
  }

  stop() {
    if (!this.started) {
      return;
    }
    if (typeof this.camera.stop === "function") {
      this.camera.stop();
    }
    this.started = false;
  }
}
