import http from "node:http";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { getServerConfig } from "./config.js";
import { SessionStore } from "./store/SessionStore.js";

function jsonResponse(res, statusCode, payload, corsHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders,
  });
  res.end(body);
}

function buildCorsHeaders(origin, allowedOrigins) {
  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-demo-token",
    Vary: "Origin",
  };
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;

    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error("Payload excedeu o limite permitido."));
        req.destroy();
        return;
      }
      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON invalido."));
      }
    });

    req.on("error", reject);
  });
}

function validateSessionPayload(payload) {
  const errors = [];
  const validWinner = payload.winner === "player" || payload.winner === "ai";

  if (!Number.isInteger(payload.playerScore) || payload.playerScore < 0 || payload.playerScore > 99) {
    errors.push("playerScore deve ser inteiro entre 0 e 99.");
  }
  if (!Number.isInteger(payload.aiScore) || payload.aiScore < 0 || payload.aiScore > 99) {
    errors.push("aiScore deve ser inteiro entre 0 e 99.");
  }
  if (!validWinner) {
    errors.push("winner deve ser 'player' ou 'ai'.");
  }
  if (!Number.isInteger(payload.durationMs) || payload.durationMs < 0 || payload.durationMs > 3_600_000) {
    errors.push("durationMs deve ser inteiro entre 0 e 3.600.000.");
  }
  if (typeof payload.controlMode !== "string" || payload.controlMode.length < 2 || payload.controlMode.length > 24) {
    errors.push("controlMode deve ser string entre 2 e 24 caracteres.");
  }
  if (
    payload.trackingLatencyMs !== null &&
    payload.trackingLatencyMs !== undefined &&
    (!Number.isInteger(payload.trackingLatencyMs) || payload.trackingLatencyMs < 0 || payload.trackingLatencyMs > 10_000)
  ) {
    errors.push("trackingLatencyMs invalido.");
  }

  return errors;
}

function createRateLimiter(config) {
  const buckets = new Map();

  return {
    check(ip) {
      const now = Date.now();
      const entry = buckets.get(ip);

      if (!entry || now - entry.startAt > config.rateLimitWindowMs) {
        buckets.set(ip, { startAt: now, count: 1 });
        return { allowed: true, remaining: config.rateLimitMaxRequests - 1 };
      }

      entry.count += 1;
      if (entry.count > config.rateLimitMaxRequests) {
        return { allowed: false, remaining: 0 };
      }

      return { allowed: true, remaining: config.rateLimitMaxRequests - entry.count };
    },
  };
}

function logRequest(req, statusCode, durationMs) {
  const entry = {
    level: "info",
    ts: new Date().toISOString(),
    method: req.method,
    path: req.url,
    statusCode,
    durationMs: Number(durationMs.toFixed(2)),
  };
  console.log(JSON.stringify(entry));
}

export function createApiServer(overrides = {}) {
  const config = getServerConfig(overrides);
  const store = new SessionStore(config.dataFilePath);
  const rateLimiter = createRateLimiter(config);

  const server = http.createServer(async (req, res) => {
    const startAt = performance.now();
    const origin = req.headers.origin;
    const corsHeaders = buildCorsHeaders(origin, config.corsOrigins);
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    const finish = (statusCode, payload) => {
      logRequest(req, statusCode, performance.now() - startAt);
      return jsonResponse(res, statusCode, payload, corsHeaders);
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const ip = req.socket.remoteAddress || "unknown";
    const limit = rateLimiter.check(ip);
    if (!limit.allowed) {
      finish(429, {
        error: {
          code: "rate_limit",
          message: "Muitas requisicoes. Tente novamente em instantes.",
        },
      });
      return;
    }

    try {
      await store.init();

      if (req.method === "GET" && url.pathname === "/api/v1/health") {
        finish(200, {
          data: {
            status: "ok",
            apiVersion: config.apiVersion,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/v1/config") {
        finish(200, {
          data: {
            apiVersion: config.apiVersion,
            leaderboardMaxLimit: config.leaderboardMaxLimit,
            trackingVisibilityPreserved: true,
          },
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/v1/leaderboard") {
        const rawLimit = Number(url.searchParams.get("limit") || config.leaderboardMaxLimit);
        const limitValue = Math.max(1, Math.min(config.leaderboardMaxLimit, Math.floor(rawLimit)));
        finish(200, {
          data: {
            entries: store.getLeaderboard(limitValue),
          },
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/v1/sessions") {
        finish(200, {
          data: {
            entries: store.getAll(),
          },
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/v1/sessions") {
        if (config.apiWriteKey) {
          const key = req.headers["x-demo-token"];
          if (key !== config.apiWriteKey) {
            finish(401, {
              error: {
                code: "unauthorized",
                message: "Credenciais invalidas para escrita.",
              },
            });
            return;
          }
        }

        const payload = await readJsonBody(req, config.maxBodyBytes);
        const errors = validateSessionPayload(payload);
        if (errors.length > 0) {
          finish(422, {
            error: {
              code: "validation_error",
              message: "Payload invalido.",
              details: errors,
            },
          });
          return;
        }

        const entry = {
          id: randomUUID(),
          playerScore: payload.playerScore,
          aiScore: payload.aiScore,
          winner: payload.winner,
          durationMs: payload.durationMs,
          controlMode: payload.controlMode,
          trackingLatencyMs:
            payload.trackingLatencyMs === null || payload.trackingLatencyMs === undefined
              ? null
              : payload.trackingLatencyMs,
          createdAt: new Date().toISOString(),
        };

        await store.add(entry);

        finish(201, {
          data: entry,
        });
        return;
      }

      finish(404, {
        error: {
          code: "not_found",
          message: "Rota nao encontrada.",
        },
      });
    } catch (error) {
      finish(500, {
        error: {
          code: "internal_error",
          message: error?.message || "Erro interno no servidor.",
        },
      });
    }
  });

  return {
    config,
    store,
    server,
    async start() {
      await store.init();
      return new Promise((resolve) => {
        server.listen(config.port, config.host, () => {
          const address = server.address();
          const runtimePort =
            address && typeof address === "object" ? address.port : config.port;
          console.log(
            JSON.stringify({
              level: "info",
              ts: new Date().toISOString(),
              message: `API online em http://${config.host}:${runtimePort}`,
            })
          );
          resolve({
            host: config.host,
            port: runtimePort,
          });
        });
      });
    },
    async stop() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

const executedFile = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === executedFile) {
  const api = createApiServer();
  api.start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
