import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseOrigins(value) {
  if (!value) {
    return ["http://127.0.0.1:5173", "http://localhost:5173"];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getServerConfig(overrides = {}) {
  return {
    host: overrides.host ?? process.env.API_HOST ?? "127.0.0.1",
    port: Number(overrides.port ?? process.env.API_PORT ?? 8787),
    corsOrigins: overrides.corsOrigins ?? parseOrigins(process.env.API_CORS_ORIGINS),
    rateLimitWindowMs: Number(overrides.rateLimitWindowMs ?? process.env.API_RATE_WINDOW_MS ?? 60_000),
    rateLimitMaxRequests: Number(overrides.rateLimitMaxRequests ?? process.env.API_RATE_MAX ?? 120),
    maxBodyBytes: Number(overrides.maxBodyBytes ?? process.env.API_MAX_BODY_BYTES ?? 16_384),
    apiWriteKey: overrides.apiWriteKey ?? process.env.API_WRITE_KEY ?? "",
    leaderboardMaxLimit: Number(overrides.leaderboardMaxLimit ?? process.env.API_LEADERBOARD_LIMIT ?? 10),
    dataFilePath:
      overrides.dataFilePath ??
      process.env.API_DATA_FILE ??
      path.join(__dirname, "data", "sessions.json"),
    apiVersion: "v1",
  };
}
