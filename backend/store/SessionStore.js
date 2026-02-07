import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.playerScore !== a.playerScore) {
      return b.playerScore - a.playerScore;
    }
    if (a.aiScore !== b.aiScore) {
      return a.aiScore - b.aiScore;
    }
    return a.durationMs - b.durationMs;
  });
}

export class SessionStore {
  constructor(filePath, maxEntries = 1000) {
    this.filePath = filePath;
    this.maxEntries = maxEntries;
    this.sessions = [];
    this.loaded = false;
  }

  async init() {
    if (this.loaded) {
      return;
    }

    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true });

    try {
      const raw = await readFile(this.filePath, "utf8");
      const data = JSON.parse(raw);
      this.sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    } catch {
      this.sessions = [];
      await this.persist();
    }

    this.loaded = true;
  }

  getLeaderboard(limit) {
    return sortLeaderboard(this.sessions).slice(0, limit);
  }

  getAll() {
    return [...this.sessions];
  }

  async add(entry) {
    this.sessions.push(entry);
    if (this.sessions.length > this.maxEntries) {
      this.sessions.splice(0, this.sessions.length - this.maxEntries);
    }
    await this.persist();
  }

  async persist() {
    const tmpFile = `${this.filePath}.tmp`;
    const payload = JSON.stringify({ sessions: this.sessions }, null, 2);
    await writeFile(tmpFile, payload, "utf8");
    await rename(tmpFile, this.filePath);
  }
}
