function formatTimeMs(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export class UIFacade {
  constructor(doc) {
    this.doc = doc;

    this.overlay = doc.getElementById("startOverlay");
    this.cameraError = doc.getElementById("cameraError");
    this.toast = doc.getElementById("toast");

    this.startButton = doc.getElementById("startButton");
    this.demoButton = doc.getElementById("demoButton");
    this.toggleDemoButton = doc.getElementById("toggleDemoButton");
    this.restartButton = doc.getElementById("restartButton");

    this.sensitivityRange = doc.getElementById("sensitivityRange");
    this.sensitivityValue = doc.getElementById("sensitivityValue");

    this.trackingState = doc.getElementById("trackingState");
    this.latencyState = doc.getElementById("latencyState");
    this.fpsState = doc.getElementById("fpsState");
    this.backendState = doc.getElementById("backendState");
    this.sessionState = doc.getElementById("sessionState");
    this.webcamState = doc.getElementById("webcamState");

    this.leaderboardList = doc.getElementById("leaderboardList");
    this.leaderboardEmpty = doc.getElementById("leaderboardEmpty");

    this.toastTimeoutId = null;
  }

  bindHandlers(handlers) {
    this.startButton.addEventListener("click", handlers.onStartCamera);
    this.demoButton.addEventListener("click", handlers.onStartDemo);
    this.toggleDemoButton.addEventListener("click", handlers.onToggleDemo);
    this.restartButton.addEventListener("click", handlers.onRestart);
    this.sensitivityRange.addEventListener("input", (event) => {
      handlers.onSensitivity(Number(event.target.value));
    });
    window.addEventListener("keydown", handlers.onKeyDown);
  }

  setOverlayVisible(visible) {
    this.overlay.classList.toggle("visible", visible);
  }

  setSensitivity(valuePct) {
    this.sensitivityValue.textContent = `${Math.round(valuePct)}%`;
    this.sensitivityRange.value = String(Math.round(valuePct));
  }

  setDemoButton(isDemoMode) {
    this.toggleDemoButton.textContent = `Modo demo: ${isDemoMode ? "ON" : "OFF"}`;
  }

  showCameraError(message) {
    this.cameraError.hidden = false;
    this.cameraError.textContent = message;
  }

  hideCameraError() {
    this.cameraError.hidden = true;
  }

  updateMetrics(metrics) {
    this.trackingState.textContent = metrics.trackingText;
    this.latencyState.textContent =
      typeof metrics.latencyMs === "number" ? `${Math.round(metrics.latencyMs)} ms` : "-- ms";
    this.fpsState.textContent =
      typeof metrics.fps === "number" ? `${Math.round(metrics.fps)}` : "--";
    this.backendState.textContent = metrics.backendStatusText;
    this.webcamState.textContent = metrics.webcamStatusText;
    this.sessionState.textContent = metrics.sessionStatusText;
  }

  updateLeaderboard(entries) {
    this.leaderboardList.innerHTML = "";
    if (!entries || entries.length === 0) {
      this.leaderboardEmpty.hidden = false;
      return;
    }

    this.leaderboardEmpty.hidden = true;
    const fragment = this.doc.createDocumentFragment();
    for (const entry of entries) {
      const item = this.doc.createElement("li");
      item.textContent =
        `${entry.playerScore} x ${entry.aiScore} | ${entry.winner.toUpperCase()} | ${formatTimeMs(entry.durationMs)}`;
      fragment.appendChild(item);
    }
    this.leaderboardList.appendChild(fragment);
  }

  showToast(message) {
    if (!message) {
      return;
    }
    this.toast.textContent = message;
    this.toast.classList.add("visible");

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      this.toast.classList.remove("visible");
      this.toastTimeoutId = null;
    }, 2100);
  }
}
