const REQUEST_TIMEOUT_MS = 1800;

async function requestWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || "Erro na requisicao de API.");
      error.status = response.status;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

export class BackendClient {
  constructor(baseUrl = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  async health() {
    return requestWithTimeout(`${this.baseUrl}/health`);
  }

  async fetchLeaderboard(limit = 7) {
    return requestWithTimeout(`${this.baseUrl}/leaderboard?limit=${encodeURIComponent(limit)}`);
  }

  async submitSession(session) {
    return requestWithTimeout(`${this.baseUrl}/sessions`, {
      method: "POST",
      body: JSON.stringify(session),
    });
  }
}
