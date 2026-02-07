import { GAME_CONFIG } from "../config/gameConfig.js";
import { PongEngine } from "../game/PongEngine.js";
import { CanvasRenderer } from "../render/CanvasRenderer.js";
import { WebcamMirrorRenderer } from "../render/WebcamMirrorRenderer.js";
import { BackendClient } from "../services/BackendClient.js";
import { GestureController } from "../vision/GestureController.js";
import { UIFacade } from "./UIFacade.js";

export class AppController {
  constructor(doc) {
    this.doc = doc;

    this.canvas = doc.getElementById("gameCanvas");
    this.webcamCanvas = doc.getElementById("webcamCanvas");
    this.video = doc.getElementById("cameraFeed");

    this.engine = new PongEngine(GAME_CONFIG);
    this.renderer = new CanvasRenderer(this.canvas, GAME_CONFIG.canvas);
    this.webcamRenderer = new WebcamMirrorRenderer(this.webcamCanvas, this.video);
    this.gesture = new GestureController(this.video);
    const apiBaseUrl =
      typeof window !== "undefined" && window.PONG_API_BASE_URL
        ? window.PONG_API_BASE_URL
        : "http://127.0.0.1:8787/api/v1";
    this.backend = new BackendClient(apiBaseUrl);
    this.ui = new UIFacade(doc);

    this.running = false;
    this.cameraStarted = false;
    this.demoMode = false;
    this.backendAvailable = false;

    this.lastFrameTime = 0;
    this.lastTrackedAt = 0;
    this.latestTracking = this.gesture.getState();

    this.fpsValue = null;
    this.fpsAccumulator = 0;
    this.fpsFrames = 0;

    this.sessionSubmitted = false;
    this.sessionStatusText = "Sessao pronta";
    this.startingCamera = false;
    this.backendProbeTimerId = null;
  }

  init() {
    this.bindEvents();
    this.ui.setSensitivity(this.gesture.getSensitivity());
    this.ui.setDemoButton(this.demoMode);
    this.renderFrame();

    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    void this.bootstrapBackend();
    this.backendProbeTimerId = window.setInterval(() => {
      void this.syncBackendStatus();
    }, 15_000);
  }

  bindEvents() {
    this.ui.bindHandlers({
      onStartCamera: () => {
        void this.startWithCamera();
      },
      onStartDemo: () => this.startDemoMode(),
      onToggleDemo: () => {
        void this.toggleDemoMode();
      },
      onRestart: () => this.restartMatch(),
      onSensitivity: (value) => this.handleSensitivityChange(value),
      onKeyDown: (event) => this.handleKeyDown(event),
    });

    window.addEventListener("beforeunload", () => {
      if (this.backendProbeTimerId) {
        clearInterval(this.backendProbeTimerId);
      }
      this.gesture.stop();
    });
  }

  async bootstrapBackend() {
    await this.syncBackendStatus();
    await this.refreshLeaderboard();
  }

  async syncBackendStatus() {
    try {
      await this.backend.health();
      this.backendAvailable = true;
      if (this.sessionStatusText === "API offline") {
        this.ui.showToast("API reconectada.");
      }
      if (!this.running) {
        this.sessionStatusText = "API conectada";
      }
    } catch {
      this.backendAvailable = false;
      if (!this.running) {
        this.sessionStatusText = "API offline";
      }
    }
  }

  async startWithCamera() {
    if (this.startingCamera) {
      return;
    }

    this.startingCamera = true;
    this.ui.hideCameraError();

    try {
      await this.gesture.start();
      this.cameraStarted = true;
      this.running = true;
      this.demoMode = false;
      this.ui.setOverlayVisible(false);
      this.sessionStatusText = "Camera ativa";
      this.ui.showToast("Camera iniciada com sucesso.");
    } catch (error) {
      this.cameraStarted = false;
      this.running = true;
      this.demoMode = true;
      this.ui.setOverlayVisible(false);
      this.ui.showCameraError(
        `Camera indisponivel. Rodando em modo demo automatico. Detalhe: ${error.message}`
      );
      this.sessionStatusText = "Modo demo automatico";
      this.ui.showToast("Falha na camera. Modo demo ativado.");
    } finally {
      this.startingCamera = false;
      this.ui.setDemoButton(this.demoMode);
    }
  }

  startDemoMode() {
    this.running = true;
    this.demoMode = true;
    this.ui.setOverlayVisible(false);
    this.ui.setDemoButton(this.demoMode);
    this.sessionStatusText = "Modo demo ativo";
    this.ui.showToast("Demo automatico iniciado.");
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
      this.ui.setOverlayVisible(false);
    }

    this.ui.setDemoButton(this.demoMode);
    this.sessionStatusText = this.demoMode ? "Modo demo ativo" : "Controle gestual ativo";
    this.ui.showToast(this.demoMode ? "Modo demo ON." : "Modo demo OFF.");
  }

  restartMatch() {
    void this.submitSessionIfNeeded(this.engine.getSnapshot());
    this.engine.resetMatch();
    this.sessionSubmitted = false;
    this.sessionStatusText = "Partida reiniciada";
    this.ui.showToast("Partida reiniciada.");
  }

  handleSensitivityChange(value) {
    this.gesture.setSensitivity(value);
    this.ui.setSensitivity(this.gesture.getSensitivity());
  }

  handleKeyDown(event) {
    const key = event.key.toLowerCase();

    if (key === "d") {
      void this.toggleDemoMode();
      return;
    }

    if (key === "r") {
      this.restartMatch();
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && !this.running) {
      void this.startWithCamera();
    }
  }

  gameLoop(timestamp) {
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
    }

    const deltaSec = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    this.updateFps(deltaSec);

    if (this.running) {
      this.resolveInput();
      this.engine.update(deltaSec);
      void this.submitSessionIfNeeded(this.engine.getSnapshot());
    }

    this.renderFrame();
    requestAnimationFrame((nextTimestamp) => this.gameLoop(nextTimestamp));
  }

  updateFps(deltaSec) {
    this.fpsAccumulator += deltaSec;
    this.fpsFrames += 1;

    if (this.fpsAccumulator >= 0.45) {
      this.fpsValue = this.fpsFrames / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }
  }

  resolveInput() {
    this.latestTracking = this.gesture.getState();

    if (this.latestTracking.tracked) {
      this.lastTrackedAt = performance.now();
    }

    const trackingFresh =
      performance.now() - this.lastTrackedAt <= GAME_CONFIG.playerAssist.fallbackDelayMs;

    if (this.demoMode) {
      this.engine.setPlayerInput("auto", 0.5);
      return;
    }

    if (this.cameraStarted && trackingFresh) {
      this.engine.setPlayerInput("gesture", this.latestTracking.normalizedY);
    } else {
      this.engine.setPlayerInput("auto", this.latestTracking.normalizedY);
    }
  }

  async submitSessionIfNeeded(snapshot) {
    if (!snapshot.match.over || this.sessionSubmitted) {
      return;
    }

    this.sessionSubmitted = true;
    this.sessionStatusText = "Partida finalizada";

    if (!this.backendAvailable) {
      this.ui.showToast("API offline. Sessao nao registrada.");
      return;
    }

    const payload = {
      playerScore: snapshot.score.player,
      aiScore: snapshot.score.ai,
      winner: snapshot.match.winner,
      durationMs: Math.round(snapshot.match.elapsedMs),
      controlMode: this.demoMode ? "demo" : snapshot.controlMode,
      trackingLatencyMs:
        typeof this.latestTracking.latencyMs === "number"
          ? Math.round(this.latestTracking.latencyMs)
          : null,
    };

    try {
      await this.backend.submitSession(payload);
      this.sessionStatusText = "Sessao registrada";
      this.ui.showToast("Partida registrada no leaderboard.");
      await this.refreshLeaderboard();
    } catch {
      this.sessionStatusText = "Falha ao salvar sessao";
      this.ui.showToast("Falha ao salvar sessao na API.");
    }
  }

  async refreshLeaderboard() {
    if (!this.backendAvailable) {
      this.ui.updateLeaderboard([]);
      return;
    }

    try {
      const payload = await this.backend.fetchLeaderboard(GAME_CONFIG.match.leaderboardLimit);
      this.ui.updateLeaderboard(payload?.data?.entries ?? []);
    } catch {
      this.backendAvailable = false;
      this.ui.updateLeaderboard([]);
    }
  }

  renderFrame() {
    const snapshot = this.engine.getSnapshot();
    const showHandIndicator = !this.demoMode && this.cameraStarted && this.latestTracking.tracked;

    this.renderer.render(snapshot, {
      handY: this.latestTracking.normalizedY,
      showHandIndicator,
      demoModeActive: this.demoMode,
    });

    this.webcamRenderer.render(this.latestTracking, this.cameraStarted);
    this.updateHud(snapshot.controlMode);
  }

  updateHud(controlMode) {
    let trackingText = "Aguardando mao";

    if (this.demoMode) {
      trackingText = "Modo demo automatico";
    } else if (!this.cameraStarted) {
      trackingText = "Camera nao iniciada";
    } else if (this.latestTracking.tracked) {
      trackingText = "Mao detectada";
    } else if (controlMode === "auto") {
      trackingText = "Sem mao (assistido)";
    }

    const webcamStatusText = !this.cameraStarted
      ? "OFFLINE"
      : this.latestTracking.tracked
        ? "TRACKING"
        : "ON AIR";

    this.ui.updateMetrics({
      trackingText,
      latencyMs: this.latestTracking.latencyMs,
      fps: this.fpsValue,
      backendStatusText: this.backendAvailable ? "Online" : "Offline",
      webcamStatusText,
      sessionStatusText: this.sessionStatusText,
    });
  }
}
