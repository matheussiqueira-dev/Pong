import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApiServer } from "../backend/server.js";

test("API registra sessao e retorna leaderboard", async () => {
  const tmpDirectory = await mkdtemp(path.join(os.tmpdir(), "pong-api-"));
  const dataFile = path.join(tmpDirectory, "sessions.json");
  const api = createApiServer({
    host: "127.0.0.1",
    port: 0,
    dataFilePath: dataFile,
    corsOrigins: ["http://127.0.0.1:5173"],
  });

  try {
    const address = await api.start();
    const baseUrl = `http://${address.host}:${address.port}/api/v1`;

    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);

    const createResponse = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerScore: 7,
        aiScore: 4,
        winner: "player",
        durationMs: 89_000,
        controlMode: "gesture",
        trackingLatencyMs: 33,
      }),
    });
    assert.equal(createResponse.status, 201);

    const leaderboardResponse = await fetch(`${baseUrl}/leaderboard?limit=5`);
    assert.equal(leaderboardResponse.status, 200);
    const leaderboardPayload = await leaderboardResponse.json();
    assert.equal(leaderboardPayload.data.entries.length, 1);
    assert.equal(leaderboardPayload.data.entries[0].playerScore, 7);
  } finally {
    await api.stop();
    await rm(tmpDirectory, { recursive: true, force: true });
  }
});

test("API valida payload de sessao", async () => {
  const tmpDirectory = await mkdtemp(path.join(os.tmpdir(), "pong-api-"));
  const dataFile = path.join(tmpDirectory, "sessions.json");
  const api = createApiServer({
    host: "127.0.0.1",
    port: 0,
    dataFilePath: dataFile,
  });

  try {
    const address = await api.start();
    const baseUrl = `http://${address.host}:${address.port}/api/v1`;

    const invalidResponse = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerScore: -1,
        aiScore: 2,
        winner: "draw",
        durationMs: -10,
        controlMode: "x",
      }),
    });
    assert.equal(invalidResponse.status, 422);
  } finally {
    await api.stop();
    await rm(tmpDirectory, { recursive: true, force: true });
  }
});
