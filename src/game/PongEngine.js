import { GAME_CONFIG } from "../config/gameConfig.js";
import { approach, clamp, randomFromRange } from "../utils/math.js";

export class PongEngine {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.width = config.canvas.width;
    this.height = config.canvas.height;
    this.fixedStep = config.physics.fixedStep;
    this.maxFrameTime = config.physics.maxFrameTime;
    this.accumulator = 0;

    this.playerTargetYNormalized = 0.5;
    this.playerControlMode = "auto";
    this.roundResetTimerMs = 0;

    this.playerScore = 0;
    this.aiScore = 0;
    this.lastScorer = null;
    this.playerPaddleY = 0;
    this.aiPaddleY = 0;
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: config.ball.radius,
      speed: config.ball.initialSpeed,
    };

    this.resetMatch();
  }

  resetMatch() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerPaddleY = (this.height - this.config.paddle.height) / 2;
    this.aiPaddleY = (this.height - this.config.paddle.height) / 2;
    this.roundResetTimerMs = this.config.ball.resetDelayMs;
    this.lastScorer = null;
    this.resetBall(Math.random() > 0.5 ? 1 : -1);
  }

  setPlayerInput(mode, normalizedY = 0.5) {
    this.playerControlMode = mode;
    this.playerTargetYNormalized = clamp(normalizedY, 0, 1);
  }

  update(deltaSec) {
    const clampedDelta = Math.min(deltaSec, this.maxFrameTime);
    this.accumulator += clampedDelta;

    while (this.accumulator >= this.fixedStep) {
      this.step(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }
  }

  step(dt) {
    this.updatePlayerPaddle(dt);
    this.updateAiPaddle(dt);

    if (this.roundResetTimerMs > 0) {
      this.roundResetTimerMs -= dt * 1000;
      return;
    }

    this.updateBall(dt);
    this.handleWallCollisions();
    this.handlePaddleCollisions();
    this.handleScoring();
  }

  updatePlayerPaddle(dt) {
    const paddleSpan = this.height - this.config.paddle.height;
    let targetY = this.playerTargetYNormalized * paddleSpan;

    if (this.playerControlMode === "auto") {
      targetY = this.ball.y - this.config.paddle.height / 2;
    }

    const speed = this.playerControlMode === "auto" ? this.config.playerAssist.autoTrackSpeed : this.config.paddle.maxSpeed;
    this.playerPaddleY = approach(this.playerPaddleY, clamp(targetY, 0, paddleSpan), speed * dt);
  }

  updateAiPaddle(dt) {
    const paddleSpan = this.height - this.config.paddle.height;
    const predictedY = this.ball.y + this.ball.vy * this.config.ai.anticipationFactor;
    const targetY = predictedY - this.config.paddle.height / 2;
    this.aiPaddleY = approach(
      this.aiPaddleY,
      clamp(targetY, 0, paddleSpan),
      this.config.ai.reactionSpeed * dt
    );
  }

  updateBall(dt) {
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
  }

  handleWallCollisions() {
    const radius = this.config.ball.radius;

    if (this.ball.y - radius <= 0) {
      this.ball.y = radius;
      this.ball.vy = Math.abs(this.ball.vy);
    } else if (this.ball.y + radius >= this.height) {
      this.ball.y = this.height - radius;
      this.ball.vy = -Math.abs(this.ball.vy);
    }
  }

  handlePaddleCollisions() {
    const { width: paddleWidth, height: paddleHeight, margin } = this.config.paddle;
    const radius = this.config.ball.radius;
    const leftX = margin;
    const rightX = this.width - margin - paddleWidth;

    const collideWithPaddle = (paddleX, paddleY, directionSign) => {
      const withinY = this.ball.y + radius >= paddleY && this.ball.y - radius <= paddleY + paddleHeight;
      const withinX =
        this.ball.x + radius >= paddleX && this.ball.x - radius <= paddleX + paddleWidth;

      if (!withinX || !withinY) {
        return false;
      }

      const relativeImpact = clamp((this.ball.y - (paddleY + paddleHeight / 2)) / (paddleHeight / 2), -1, 1);
      const bounceAngle = relativeImpact * this.config.ball.maxDeflectionRad;
      const nextSpeed = Math.min(
        this.config.ball.maxSpeed,
        this.ball.speed + this.config.ball.accelerationPerHit
      );

      this.ball.speed = nextSpeed;
      this.ball.vx = Math.cos(bounceAngle) * nextSpeed * directionSign;
      this.ball.vy = Math.sin(bounceAngle) * nextSpeed;
      this.ball.x = directionSign > 0 ? paddleX + paddleWidth + radius : paddleX - radius;
      return true;
    };

    if (this.ball.vx < 0) {
      collideWithPaddle(leftX, this.playerPaddleY, 1);
    } else if (this.ball.vx > 0) {
      collideWithPaddle(rightX, this.aiPaddleY, -1);
    }
  }

  handleScoring() {
    const radius = this.config.ball.radius;

    if (this.ball.x + radius < 0) {
      this.aiScore += 1;
      this.lastScorer = "ai";
      this.startNextRound(1);
    } else if (this.ball.x - radius > this.width) {
      this.playerScore += 1;
      this.lastScorer = "player";
      this.startNextRound(-1);
    }
  }

  startNextRound(initialDirection) {
    this.roundResetTimerMs = this.config.ball.resetDelayMs;
    this.resetBall(initialDirection);
  }

  resetBall(initialDirection) {
    const angle = randomFromRange(-this.config.ball.maxDeflectionRad * 0.6, this.config.ball.maxDeflectionRad * 0.6);
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    this.ball.radius = this.config.ball.radius;
    this.ball.speed = this.config.ball.initialSpeed;
    this.ball.vx = Math.cos(angle) * this.ball.speed * initialDirection;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
  }

  getSnapshot() {
    return {
      width: this.width,
      height: this.height,
      playerPaddleY: this.playerPaddleY,
      aiPaddleY: this.aiPaddleY,
      paddle: this.config.paddle,
      ball: { ...this.ball },
      score: {
        player: this.playerScore,
        ai: this.aiScore,
      },
      roundResetTimerMs: Math.max(0, this.roundResetTimerMs),
      controlMode: this.playerControlMode,
      lastScorer: this.lastScorer,
    };
  }
}
