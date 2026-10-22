/**
 * Makes any document fit the amount of text Onyx sends to the AI in one request,
 * without blindly cutting off the end.
 *
 * 1. Lossless-ish clean-up first: line endings, runs of spaces and blank lines, and
 *    lines repeated on every page of a PDF (headers, footers, "Page 3 of 12").
 *    Most real documents fit after this step and are sent whole.
 * 2. Only if it is still too big: split into sections (by headings, else paragraphs),
 *    score each one by how much build-relevant detail it holds (requirements, triggers,
 *    integrations, fields, decisions) plus any focus words, and keep the best ones in
 *    their original order. Boilerplate sections (contents, glossary, appendix, legal)
 *    score low. The opening section is always kept because it usually says what the
 *    project is.
 * 3. Every left-out section is named in place, so the AI knows it exists, and the
 *    caller gets the list so the user can be told.
 */

export type FitResult = {
  text: string;
  trimmed: boolean;
  originalChars: number;
  /** Length after clean-up, before any sections were left out. */
  cleanedChars: number;
  keptChars: number;
  omittedSections: string[];
};

const SIGNAL = /\b(must|shall|should|required?|requirements?|needs? to|trigger(?:s|ed)?|when|if|then|webhook|api|endpoint|integrat\w*|sync\w*|send|create|update|write|read|field|tag|pipeline|stage|schedule|daily|weekly|hourly|deliverables?|scope|pending|tbd|todo|decision|risk|error|fail\w*|retry|notify|email|sms|crm|database|sheet|table|record|contact|lead|workflow|scenario|node|module|step)\b/gi;
const BOILERPLATE = /(table of contents|^contents$|revision history|change ?log|document history|glossary|appendix|references|bibliography|legal|terms (and|&) conditions|privacy policy|copyright|acknowledg|disclaimer|signature|sign-?off)/i;
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'into', 'you', 'your', 'are', 'how', 'what', 'can', 'will', 'all', 'any', 'not', 'but', 'was', 'were', 'has', 'have']);

type Section = { heading: string; text: string };

const isHeading = (line: string) => {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  if (/^#{1,6}\s+\S/.test(t)) return true;                                   // Markdown
  if (/^(\d+(\.\d+)*|[IVX]+|[A-Z])[.)]\s+\S/.test(t) && t.length <= 80 && !/[.;]$/.test(t)) return true; // 1. / 2.3 / IV. / A)
  if (/^[A-Z0-9][A-Z0-9 &/,:()'-]{3,}$/.test(t) && /[A-Z]{3}/.test(t)) return true; // ALL CAPS line
  if (t.length <= 60 && /:$/.test(t) && !/^[-*•]/.test(t)) return true;       // "Triggers:"
  return false;
};

const clean = (raw: string) => {
  let text = raw.replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').replace(/ +\n/g, '\n');
  text = text.replace(/^\s*(page \d+( of \d+)?|\d+ ?\/ ?\d+|- ?\d+ ?-)\s*$/gim, '');
  // Page headers/footers repeat on every page of a PDF. Skip for code/JSON, where
  // identical lines are meaningful.
  if (!/^\s*[[{]/.test(text)) {
    const lines = text.split('\n');
    const counts = new Map<string, number>();
    for (const l of lines) { const k = l.trim(); if (k.length >= 8 && k.length <= 120) counts.set(k, (counts.get(k) || 0) + 1); }
    const seen = new Set<string>();
    text = lines.filter(l => {
      const k = l.trim();
      if ((counts.get(k) || 0) < 4) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).join('\n');
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
};

const splitSections = (text: string, pieceSize = 2500): Section[] => {
  const sections: Section[] = [];
  let cur: Section = { heading: '', text: '' };
  for (const line of text.split('\n')) {
    if (isHeading(line) && cur.text.trim()) { sections.push(cur); cur = { heading: line.trim().replace(/^#+\s*/, ''), text: '' }; }
    else if (isHeading(line) && !cur.heading) cur.heading = line.trim().replace(/^#+\s*/, '');
    cur.text += line + '\n';
  }
  if (cur.text.trim()) sections.push(cur);

  // Break oversized sections (or a heading-less document) into paragraph-sized pieces.
  const out: Section[] = [];
  for (const s of sections) {
    if (s.text.length <= pieceSize * 1.5) { out.push(s); continue; }
    let buf = '', n = 0;
    const flush = () => { if (buf.trim()) out.push({ heading: n++ ? `${s.heading || 'Untitled part'} (continued)` : s.heading, text: buf }); buf = ''; };
    for (const para of s.text.split(/\n\n/)) {
      if (buf.length + para.length > pieceSize && buf) flush();
      if (para.length > pieceSize) { for (let i = 0; i < para.length; i += pieceSize) { buf = para.slice(i, i + pieceSize); flush(); } }
      else buf += para + '\n\n';
    }
    flush();
  }
  return out;
};

export function fitDocument(raw: string, maxChars: number, focus = ''): FitResult {
  const originalChars = raw.length;
  const text = clean(raw);
  if (text.length <= maxChars) return { text, trimmed: false, originalChars, cleanedChars: text.length, keptChars: text.length, omittedSections: [] };

  const sections = splitSections(text);
  const focusWords = [...new Set((focus.toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) || []).filter(w => !STOP.has(w)))];
  const lows = sections.map(s => s.text.toLowerCase());
  const idf = new Map(focusWords.map(w => {
    const df = lows.filter(l => l.includes(w)).length;
    return [w, df ? Math.log((sections.length + 1) / df) : 0];
  }));

  const scored = sections.map((s, i) => {
    const len = Math.max(200, s.text.length);
    let score = ((s.text.match(SIGNAL) || []).length / len) * 1000;          // detail density
    score += (s.text.match(/https?:\/\/|\b[A-Z]{2,}_[A-Z_]+\b|\{\{.*?\}\}|"\w+":/g) || []).length * 0.3; // URLs, IDs, field refs
    for (const w of focusWords) if (lows[i].includes(w)) score += 2 * (idf.get(w) || 0);
    const letters = (s.text.match(/\p{L}/gu) || []).length / len;
    if (BOILERPLATE.test(s.heading)) score *= 0.2;
    if (letters < 0.4) score *= 0.5;                                          // mostly dots/numbers (a TOC)
    return { i, score };
  });

  // Room for the "left out" markers so the result never exceeds maxChars.
  const budget = maxChars - Math.min(4000, sections.length * 70);
  const keep = new Set<number>([0]);
  let used = sections[0].text.length;
  for (const { i } of [...scored].sort((a, b) => b.score - a.score)) {
    if (keep.has(i)) continue;
    if (used + sections[i].text.length > budget) continue;
    keep.add(i);
    used += sections[i].text.length;
  }

  const omittedSections: string[] = [];
  const parts: string[] = [];
  let gap: string[] = [];
  const closeGap = () => {
    if (!gap.length) return;
    const names = gap.filter(Boolean);
    parts.push(`[… ${gap.length} part${gap.length > 1 ? 's' : ''} of the document left out to fit${names.length ? `: ${names.map(n => `"${n}"`).join(', ')}` : ''} …]\n`);
    gap = [];
  };
  sections.forEach((s, i) => {
    if (keep.has(i)) { closeGap(); parts.push(s.text); }
    else {
      const name = s.heading.replace(/ \(continued\)$/, '').slice(0, 60);
      gap.push(name);
      if (name && !omittedSections.includes(name)) omittedSections.push(name);
    }
  });
  closeGap();

  const out = parts.join('\n').slice(0, maxChars);
  return { text: out, trimmed: true, originalChars, cleanedChars: text.length, keptChars: out.length, omittedSections };
}

/** Plain-English note for the user when a document had to be trimmed; '' when it was sent whole. */
export function trimNotice(r: FitResult): string {
  if (!r.trimmed) return '';
  const pct = Math.max(1, Math.round((r.keptChars / r.cleanedChars) * 100));
  const list = r.omittedSections.slice(0, 6).map(s => `"${s}"`).join(', ');
  const more = r.omittedSections.length > 6 ? ` and ${r.omittedSections.length - 6} more` : '';
  return `Your document is too long to send to the AI in one go, so Onyx kept the most detailed ${pct}% and left out the rest${list ? ` (${list}${more})` : ''}. Check the result covers those parts, or run them separately.`;
}
