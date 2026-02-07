export const GAME_CONFIG = {
  canvas: {
    width: 960,
    height: 540,
  },
  physics: {
    fixedStep: 1 / 120,
    maxFrameTime: 1 / 20,
  },
  paddle: {
    width: 16,
    height: 104,
    margin: 26,
    maxSpeed: 940,
  },
  ball: {
    radius: 9,
    initialSpeed: 390,
    maxSpeed: 940,
    accelerationPerHit: 24,
    maxDeflectionRad: 0.68,
    resetDelayMs: 650,
  },
  ai: {
    reactionSpeed: 620,
    anticipationFactor: 0.12,
  },
  playerAssist: {
    fallbackDelayMs: 850,
    autoTrackSpeed: 680,
  },
  match: {
    winningScore: 7,
    leaderboardLimit: 7,
  },
};

export const TRACKING_CONFIG = {
  minSensitivityPct: 60,
  maxSensitivityPct: 160,
  latencyWindowSize: 20,
  smoothingAlphaRange: {
    min: 0.14,
    max: 0.36,
  },
  deadZoneRange: {
    min: 0.0022,
    max: 0.0060,
  },
  visibleTimeoutMs: 140,
};
