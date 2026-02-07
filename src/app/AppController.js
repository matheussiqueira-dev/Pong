import { GAME_CONFIG } from "../config/gameConfig.js";
import { PongEngine } from "../game/PongEngine.js";
import { CanvasRenderer } from "../render/CanvasRenderer.js";
import { GestureController } from "../vision/GestureController.js";

export class AppController {
  constructor(doc) {
    this.doc = doc;
    this.canvas = doc.getElementById("gameCanvas");
    this.video = doc.getElementById("cameraFeed");

    this.overlay = doc.getElementById("startOverlay");
    this.cameraError = doc.getElementById("cameraError");
    this.trackingState = doc.getElementById("trackingState");
    this.latencyState = doc.getElementById("latencyState");
    this.sensitivityRange = doc.getElementById("sensitivityRange");
    this.sensitivityValue = doc.getElementById("sensitivityValue");

    this.startButton = doc.getElementById("startButton");
    this.demoButton = doc.getElementById("demoButton");
    this.toggleDemoButton = doc.getElementById("toggleDemoButton");
    this.restartButton = doc.getElementById("restartButton");

    this.engine = new PongEngine(GAME_CONFIG);
    this.renderer = new CanvasRenderer(this.canvas, GAME_CONFIG.canvas);
    this.gesture = new GestureController(this.video);

    this.running = false;
    this.cameraStarted = false;
    this.demoMode = false;
    this.lastFrameTime = 0;
    this.lastTrackedAt = 0;
    this.latestTracking = this.gesture.getState();
  }

  init() {
    this.bindEvents();
    this.renderFrame(performance.now());
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  bindEvents() {
    this.startButton.addEventListener("click", () => this.startWithCamera());
    this.demoButton.addEventListener("click", () => this.startDemoMode());
    this.toggleDemoButton.addEventListener("click", () => {
      this.toggleDemoMode();
    });
    this.restartButton.addEventListener("click", () => this.engine.resetMatch());

    this.sensitivityRange.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      this.gesture.setSensitivity(value);
      this.sensitivityValue.textContent = `${Math.round(this.gesture.getSensitivity())}%`;
    });

    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "d") {
        this.toggleDemoMode();
      } else if (event.key.toLowerCase() === "r") {
        this.engine.resetMatch();
      } else if ((event.key === "Enter" || event.key === " ") && !this.running) {
        this.startWithCamera();
      }
    });
  }

  async startWithCamera() {
    this.cameraError.hidden = true;
    try {
      await this.gesture.start();
      this.cameraStarted = true;
      this.running = true;
      this.demoMode = false;
      this.overlay.classList.remove("visible");
      this.updateDemoButtonLabel();
    } catch (error) {
      this.cameraStarted = false;
      this.running = true;
      this.demoMode = true;
      this.overlay.classList.remove("visible");
      this.cameraError.hidden = false;
      this.cameraError.textContent =
        `Camera indisponivel. Rodando em modo demo automatico. Detalhe: ${error.message}`;
      this.updateDemoButtonLabel();
    }
  }

  startDemoMode() {
    this.running = true;
    this.demoMode = true;
    this.overlay.classList.remove("visible");
    this.updateDemoButtonLabel();
  }

  async toggleDemoMode() {
    const nextMode = !this.demoMode;
    if (!nextMode && !this.cameraStarted) {
      await this.startWithCamera();
      return;
    }

    this.demoMode = nextMode;
    if (!this.running) {
      this.running = true;
      this.overlay.classList.remove("visible");
    }
    this.updateDemoButtonLabel();
  }

  updateDemoButtonLabel() {
    this.toggleDemoButton.textContent = `Modo demo: ${this.demoMode ? "ON" : "OFF"}`;
  }

  gameLoop(timestamp) {
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
    }

    const deltaSec = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;

    if (this.running) {
      this.resolveInput();
      this.engine.update(deltaSec);
    }

    this.renderFrame(timestamp);
    requestAnimationFrame((nextTimestamp) => this.gameLoop(nextTimestamp));
  }

  resolveInput() {
    const tracking = this.gesture.getState();
    this.latestTracking = tracking;

    if (tracking.tracked) {
      this.lastTrackedAt = performance.now();
    }

    const trackingFresh = performance.now() - this.lastTrackedAt <= GAME_CONFIG.playerAssist.fallbackDelayMs;

    if (this.demoMode) {
      this.engine.setPlayerInput("auto", 0.5);
      return;
    }

    if (this.cameraStarted && trackingFresh) {
      this.engine.setPlayerInput("gesture", tracking.normalizedY);
    } else {
      this.engine.setPlayerInput("auto", tracking.normalizedY);
    }
  }

  renderFrame() {
    const snapshot = this.engine.getSnapshot();
    const showIndicator = !this.demoMode && this.cameraStarted && this.latestTracking.tracked;

    this.renderer.render(snapshot, {
      handY: this.latestTracking.normalizedY,
      showHandIndicator: showIndicator,
      demoModeActive: this.demoMode,
    });

    this.updateHud(snapshot.controlMode);
  }

  updateHud(controlMode) {
    if (this.demoMode) {
      this.trackingState.textContent = "Modo demo automatico";
    } else if (!this.cameraStarted) {
      this.trackingState.textContent = "Camera nao iniciada";
    } else if (this.latestTracking.tracked) {
      this.trackingState.textContent = "Mao detectada";
    } else if (controlMode === "auto") {
      this.trackingState.textContent = "Sem mao (assistido)";
    } else {
      this.trackingState.textContent = "Aguardando mao";
    }

    if (typeof this.latestTracking.latencyMs === "number") {
      this.latencyState.textContent = `${Math.round(this.latestTracking.latencyMs)} ms`;
    } else {
      this.latencyState.textContent = "-- ms";
    }
  }
}
