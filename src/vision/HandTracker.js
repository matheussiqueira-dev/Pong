export class HandTracker {
  constructor(onResults) {
    if (typeof window.Hands === "undefined") {
      throw new Error("MediaPipe Hands nao encontrado.");
    }

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.55,
    });

    this.hands.onResults(onResults);
  }

  async sendFrame(videoElement) {
    await this.hands.send({ image: videoElement });
  }
}
