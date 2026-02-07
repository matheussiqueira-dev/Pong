import { TRACKING_CONFIG } from "../config/gameConfig.js";
import { clamp } from "../utils/math.js";
import { CameraCapture } from "./CameraCapture.js";
import { HandTracker } from "./HandTracker.js";

export class GestureController {
  constructor(videoElement, config = TRACKING_CONFIG) {
    this.videoElement = videoElement;
    this.config = config;

    this.camera = null;
    this.handTracker = null;
    this.isRunning = false;
    this.isProcessing = false;

    this.sensitivityPct = 100;
    this.lastTrackedAt = 0;
    this.lastFrameSentAt = 0;

    this.rawY = 0.5;
    this.smoothedY = 0.5;
    this.outputY = 0.5;
    this.tracked = false;
    this.latestLandmarks = [];

    this.latencySamples = [];
    this.avgLatencyMs = null;
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.handTracker = new HandTracker((results) => {
      this.handleResults(results);
    });

    this.camera = new CameraCapture(this.videoElement, async () => {
      if (!this.isRunning || this.isProcessing) {
        return;
      }

      this.isProcessing = true;
      this.lastFrameSentAt = performance.now();
      try {
        await this.handTracker.sendFrame(this.videoElement);
      } finally {
        this.isProcessing = false;
      }
    });

    this.isRunning = true;
    await this.camera.start();
  }

  stop() {
    this.isRunning = false;
    this.tracked = false;
    if (this.camera) {
      this.camera.stop();
    }
  }

  setSensitivity(valuePct) {
    this.sensitivityPct = clamp(
      Number(valuePct),
      this.config.minSensitivityPct,
      this.config.maxSensitivityPct
    );
  }

  getSensitivity() {
    return this.sensitivityPct;
  }

  getState() {
    const visibleRecently = performance.now() - this.lastTrackedAt <= this.config.visibleTimeoutMs;
    return {
      tracked: visibleRecently && this.tracked,
      normalizedY: this.outputY,
      rawY: this.rawY,
      latencyMs: this.avgLatencyMs,
      landmarks: this.latestLandmarks,
    };
  }

  handleResults(results) {
    const now = performance.now();
    this.recordLatency(now);

    const landmarks = results.multiHandLandmarks?.[0];
    if (!landmarks) {
      this.tracked = false;
      this.latestLandmarks = [];
      return;
    }

    const palmIndices = [0, 5, 9, 13, 17];
    let sumY = 0;
    for (const index of palmIndices) {
      sumY += landmarks[index].y;
    }

    const detectedY = clamp(sumY / palmIndices.length, 0, 1);
    const sensitivityScale = this.sensitivityPct / 100;
    const centeredY = clamp(0.5 + (detectedY - 0.5) * sensitivityScale, 0, 1);
    const normalizedSensitivity = (this.sensitivityPct - this.config.minSensitivityPct) /
      (this.config.maxSensitivityPct - this.config.minSensitivityPct);
    const smoothingAlpha =
      this.config.smoothingAlphaRange.min +
      (this.config.smoothingAlphaRange.max - this.config.smoothingAlphaRange.min) * normalizedSensitivity;
    const deadZone =
      this.config.deadZoneRange.max -
      (this.config.deadZoneRange.max - this.config.deadZoneRange.min) * normalizedSensitivity;

    this.rawY = detectedY;
    this.smoothedY += (centeredY - this.smoothedY) * smoothingAlpha;

    if (Math.abs(this.smoothedY - this.outputY) > deadZone) {
      this.outputY = this.smoothedY;
    }

    this.tracked = true;
    this.lastTrackedAt = now;
    this.latestLandmarks = landmarks.map((landmark) => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
    }));
  }

  recordLatency(now) {
    if (!this.lastFrameSentAt) {
      return;
    }

    const sample = now - this.lastFrameSentAt;
    if (!Number.isFinite(sample) || sample <= 0) {
      return;
    }

    this.latencySamples.push(sample);
    if (this.latencySamples.length > this.config.latencyWindowSize) {
      this.latencySamples.shift();
    }

    const total = this.latencySamples.reduce((acc, value) => acc + value, 0);
    this.avgLatencyMs = total / this.latencySamples.length;
  }
}
