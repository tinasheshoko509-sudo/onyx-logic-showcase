// Live progress for long requests.
//
// The screen gives each request a random id. While the request runs, the code reports plain
// steps ("Searching CallRail's website…", "Reading apidocs.callrail.com…") under that id, and
// the screen asks for them every second or two (GET /api/progress/:id) to show what's happening.
// Steps are short descriptions only — never keys, page text or user data — and are dropped a few
// minutes after the request ends.

import { AsyncLocalStorage } from 'node:async_hooks';

const current = new AsyncLocalStorage<string>();
const runs = new Map<string, { steps: string[]; at: number; done: boolean }>();
const KEEP_MS = 5 * 60_000;
const MAX_STEPS = 40;

export const isRunId = (id: unknown): id is string => typeof id === 'string' && /^[a-z0-9-]{16,64}$/i.test(id);

/** Runs fn with progress reported under runId (no-op without a valid id). */
export async function withProgress<T>(runId: unknown, fn: () => Promise<T>): Promise<T> {
  if (!isRunId(runId)) return fn();
  runs.set(runId, { steps: [], at: Date.now(), done: false });
  try { return await current.run(runId, fn); }
  finally { const r = runs.get(runId); if (r) { r.done = true; r.at = Date.now(); } }
}

/** Report one step of the request in progress. Repeats of the last step are ignored. */
export function progress(step: string): void {
  const id = current.getStore();
  if (!id) return;
  const r = runs.get(id);
  if (!r || r.steps[r.steps.length - 1] === step) return;
  r.steps.push(step.slice(0, 160));
  if (r.steps.length > MAX_STEPS) r.steps.splice(0, r.steps.length - MAX_STEPS);
  r.at = Date.now();
  // Forget finished requests after a while.
  for (const [k, v] of runs) if (v.done && Date.now() - v.at > KEEP_MS) runs.delete(k);
}

export function readProgress(runId: string): { steps: string[]; done: boolean } | null {
  const r = runs.get(runId);
  return r ? { steps: [...r.steps], done: r.done } : null;
}
