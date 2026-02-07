import test from "node:test";
import assert from "node:assert/strict";
import { GAME_CONFIG } from "../src/config/gameConfig.js";
import { PongEngine } from "../src/game/PongEngine.js";

function buildConfig() {
  return {
    ...GAME_CONFIG,
    match: {
      ...GAME_CONFIG.match,
      winningScore: 2,
    },
  };
}

test("motor finaliza partida ao atingir pontuacao alvo", () => {
  const engine = new PongEngine(buildConfig());
  engine.roundResetTimerMs = 0;

  engine.ball.x = engine.width + engine.config.ball.radius + 2;
  engine.handleScoring();
  assert.equal(engine.playerScore, 1);
  assert.equal(engine.matchOver, false);

  engine.ball.x = engine.width + engine.config.ball.radius + 2;
  engine.handleScoring();
  assert.equal(engine.playerScore, 2);
  assert.equal(engine.matchOver, true);
  assert.equal(engine.winner, "player");
  assert.equal(engine.ball.vx, 0);
  assert.equal(engine.ball.vy, 0);
});

test("snapshot retorna estado de match completo", () => {
  const engine = new PongEngine(buildConfig());
  const snapshot = engine.getSnapshot();

  assert.equal(snapshot.match.winningScore, 2);
  assert.equal(snapshot.match.over, false);
  assert.ok(Number.isFinite(snapshot.match.elapsedMs));
});
