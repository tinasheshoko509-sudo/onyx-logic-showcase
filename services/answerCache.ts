// Saved answers.
//
// Researching a platform's docs takes 30-60 seconds. The same question (or the same platform and
// action asked another way) often comes up again, so finished work is kept for 7 days and reused:
// docs change slowly, and 7 days is short enough that changes are picked up. The user can always
// ask for a fresh answer ("Check again"), which skips the saved copy and replaces it.
//
// One small file per saved answer under .onyx-cache/answers/<kind>/, named by a hash of its key,
// so a big entry (research keeps page text) never means rewriting one huge file. A broken or
// unreadable file just counts as "not saved"; the cache never fails a request.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export const ANSWER_TTL_MS = 7 * 24 * 3600_000;
const ROOT = join(process.cwd(), '.onyx-cache', 'answers');
const MAX_FILES_PER_KIND = 300;

type Saved<T> = { at: number; key: string; data: T };

// A fingerprint of the code that builds answers. Any change to it (a fix) retires every answer
// saved before, so a saved answer never repeats a mistake that has since been fixed.
const CODE_VERSION = (() => {
  const h = createHash('sha256');
  for (const f of ['gemini_server.ts', 'researchAgent.ts', 'specReader.ts', 'completeness.ts', 'answerCache.ts']) {
    try { h.update(readFileSync(join(process.cwd(), 'services', f))); } catch { h.update(f); }
  }
  return h.digest('hex').slice(0, 12);
})();

const fileFor = (kind: string, key: string) =>
  join(ROOT, kind.replace(/[^a-z0-9-]/gi, ''), `${createHash('sha256').update(`${CODE_VERSION}|${key}`).digest('hex').slice(0, 32)}.json`);

/** The saved answer for this key and when it was saved, or null (missing, expired or unreadable). */
export function getSaved<T>(kind: string, key: string): { data: T; savedAt: number } | null {
  try {
    const s = JSON.parse(readFileSync(fileFor(kind, key), 'utf8')) as Saved<T>;
    if (s.key !== `${CODE_VERSION}|${key}` || Date.now() - s.at > ANSWER_TTL_MS) return null;
    return { data: s.data, savedAt: s.at };
  } catch { return null; }
}

export function putSaved<T>(kind: string, key: string, data: T): void {
  try {
    const file = fileFor(kind, key);
    const dir = join(file, '..');
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify({ at: Date.now(), key: `${CODE_VERSION}|${key}`, data } satisfies Saved<T>));
    // Keep the folder small: drop expired files, then the oldest beyond the limit.
    const files = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({ f, t: statSync(join(dir, f)).mtimeMs }));
    const now = Date.now();
    const keep = files.filter(x => now - x.t <= ANSWER_TTL_MS || (unlinkSync(join(dir, x.f)), false)).sort((a, b) => b.t - a.t);
    for (const x of keep.slice(MAX_FILES_PER_KIND)) unlinkSync(join(dir, x.f));
  } catch { /* saving is an optimisation only */ }
}

/** Same question asked with different spacing or capitals counts as the same question. */
export const normalizeQuestion = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[?.!]+$/, '').trim();
