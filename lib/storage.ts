"use client";

import type { ExamConfig, ExamPaper, ExamResult, ExamSession } from "./types";

const KEY = {
  config: "ibps.config.v1",
  paper: "ibps.paper.v1",
  session: "ibps.session.v1",
  history: "ibps.history.v1",
} as const;

const HISTORY_LIMIT = 50;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — the app stays usable for this session */
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const storage = {
  getConfig: () => read<ExamConfig>(KEY.config),
  setConfig: (c: ExamConfig) => write(KEY.config, c),

  getPaper: () => read<ExamPaper>(KEY.paper),
  setPaper: (p: ExamPaper) => write(KEY.paper, p),
  clearPaper: () => remove(KEY.paper),

  getSession: () => read<ExamSession>(KEY.session),
  setSession: (s: ExamSession) => write(KEY.session, s),
  clearSession: () => remove(KEY.session),

  getHistory: (): ExamResult[] => read<ExamResult[]>(KEY.history) ?? [],
  getResult: (id: string): ExamResult | null =>
    (read<ExamResult[]>(KEY.history) ?? []).find((r) => r.id === id) ?? null,
  saveResult: (result: ExamResult) => {
    const list = read<ExamResult[]>(KEY.history) ?? [];
    const next = [result, ...list.filter((r) => r.id !== result.id)].slice(
      0,
      HISTORY_LIMIT,
    );
    write(KEY.history, next);
  },
  deleteResult: (id: string) => {
    const list = read<ExamResult[]>(KEY.history) ?? [];
    write(
      KEY.history,
      list.filter((r) => r.id !== id),
    );
  },
  clearHistory: () => remove(KEY.history),

  wipe: () => {
    Object.values(KEY).forEach(remove);
  },
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
