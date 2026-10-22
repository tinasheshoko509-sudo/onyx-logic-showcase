import React, { useEffect, useRef, useState } from 'react';
import { getModelInfo, findModels, type ModelInfo, type ModelMatch } from '../services/gemini';

/**
 * One model setting in the settings panel ("Advanced tasks" or "Simple tasks").
 * Shows the model in use with its live price. Type a plain description ("gemini 3.8",
 * "sonnet", "kimi") and matching models from OpenRouter's live list appear to pick from;
 * an exact model ID still works. Nothing unknown is ever saved, so a typo can't break
 * every request.
 */
interface Props {
  title: string;
  description: string;
  /** What the server runs when nothing is chosen. */
  defaultModel: string | null;
  /** The saved choice, '' for the default. */
  value: string;
  onChange: (model: string) => void;
}

const priceText = (pIn: number | null | undefined, pOut: number | null | undefined) =>
  pIn != null && pOut != null ? `$${pIn.toFixed(2)} in / $${pOut.toFixed(2)} out per million tokens` : '';
const price = (m: ModelInfo | null) => (m ? priceText(m.priceIn, m.priceOut) || (m.found ? 'price varies per request' : '') : '');

export default function ModelSetting({ title, description, defaultModel, value, onChange }: Props) {
  const inUse = value || defaultModel || '';
  const [draft, setDraft] = useState('');
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [matches, setMatches] = useState<ModelMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState('');
  const asked = useRef('');

  useEffect(() => {
    if (!inUse) return;
    let live = true;
    getModelInfo([inUse]).then(r => { if (live) setInfo(r[0] || null); }).catch(() => {});
    return () => { live = false; };
  }, [inUse]);

  // Search as you type (short pause first, so each keystroke isn't a request).
  useEffect(() => {
    const q = draft.trim();
    setProblem('');
    if (q.length < 2) { setMatches([]); return; }
    const timer = setTimeout(() => {
      asked.current = q;
      setSearching(true);
      findModels(q)
        .then(r => { if (asked.current === q) setMatches(Array.isArray(r) ? r : []); })
        .catch(() => { if (asked.current === q) setMatches([]); })
        .finally(() => { if (asked.current === q) setSearching(false); });
    }, 400);
    return () => clearTimeout(timer);
  }, [draft]);

  const choose = (id: string) => {
    setDraft('');
    setMatches([]);
    setProblem('');
    onChange(id === defaultModel ? '' : id);
  };

  // Enter / Save: one clear match (or an exact ID) is saved; several ask the user to pick.
  const apply = async () => {
    const q = draft.trim();
    if (!q) return;
    const list = asked.current === q && !searching ? matches : await findModels(q).catch(() => [] as ModelMatch[]);
    const exact = list.find(m => m.id.toLowerCase() === q.toLowerCase().replace(/\s+/g, ''));
    if (exact) return choose(exact.id);
    if (list.length === 1) return choose(list[0].id);
    // Only one model matches every word exactly ("glm 5.3 flash", not "flashx"): that one.
    const whole = list.filter(m => m.exactWords);
    if (whole.length === 1) return choose(whole[0].id);
    setMatches(list);
    setProblem(list.length ? 'Several models match — click the one you want.' : `No model on OpenRouter matches "${q}". Try fewer words, e.g. "gemini" or "sonnet". Nothing was changed.`);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">{title}</p>
        <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">{description}</p>
      </div>

      <div className={`p-3 rounded-xl border ${!value ? 'border-[#0070FF]/40 bg-[#0070FF]/5' : 'border-zinc-200 bg-zinc-50'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{value ? 'Your choice' : 'Default'}</p>
            <p className="text-[11px] font-black text-zinc-900 truncate mt-0.5">{inUse ? (info?.name || inUse.split('/').pop()) : 'Loading…'}</p>
            {inUse && <p className="text-[9px] text-zinc-400 font-mono truncate mt-0.5">{inUse}</p>}
            {price(info) && <p className="text-[9px] text-zinc-500 mt-0.5">{price(info)}</p>}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { setProblem(''); onChange(''); }}
              className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-zinc-200 text-zinc-500 hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex-shrink-0 cursor-pointer"
            >
              Reset to default
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') { setDraft(''); setMatches([]); } }}
          placeholder='type a model, e.g. "gemini 3.8" or "sonnet"'
          spellCheck={false}
          className="flex-1 min-w-0 bg-white border border-zinc-200 rounded-lg px-2.5 py-2 text-[11px] text-zinc-800 focus:border-[#0070FF] outline-none transition-colors placeholder:text-zinc-300"
        />
        <button
          type="button"
          onClick={apply}
          disabled={!draft.trim()}
          className="text-[9px] font-black uppercase tracking-widest px-3 rounded-lg bg-[#0070FF] text-white hover:bg-[#005ACC] transition-colors disabled:opacity-30 flex-shrink-0 cursor-pointer"
        >
          Save
        </button>
      </div>

      {draft.trim().length >= 2 && (searching || matches.length > 0) && (
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {searching && !matches.length && <p className="px-3 py-2 text-[10px] text-zinc-400">Searching OpenRouter's models…</p>}
          {matches.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => choose(m.id)}
              className="w-full text-left px-3 py-2 border-b last:border-b-0 border-zinc-100 hover:bg-[#0070FF]/5 transition-colors cursor-pointer"
            >
              <p className="text-[11px] font-bold text-zinc-900 truncate">{m.name}</p>
              <p className="text-[9px] text-zinc-500 truncate"><span className="font-mono">{m.id}</span>{priceText(m.priceIn, m.priceOut) ? ` · ${priceText(m.priceIn, m.priceOut)}` : ''}</p>
            </button>
          ))}
        </div>
      )}
      {problem && <p className="text-[10px] text-red-600 leading-snug">{problem}</p>}
    </div>
  );
}
