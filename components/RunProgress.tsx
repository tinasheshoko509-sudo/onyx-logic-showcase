import React, { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';

/**
 * Live list of what a long request is doing ("Searching…", "Reading apidocs.callrail.com…"),
 * from the 'onyx_progress' events services/gemini.ts sends while a request runs. Shows only
 * while `active` is true, for the named server function.
 */
const RunProgress: React.FC<{ functionName: string; active: boolean }> = ({ functionName, active }) => {
  const [steps, setSteps] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const onStep = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.functionName !== functionName || d.done) return;
      if (Array.isArray(d.steps) && d.steps.length) setSteps(d.steps);
    };
    window.addEventListener('onyx_progress', onStep);
    return () => window.removeEventListener('onyx_progress', onStep);
  }, [functionName]);

  useEffect(() => {
    if (!active) { setSteps([]); setSeconds(0); return; }
    const t0 = Date.now();
    const timer = setInterval(() => setSeconds(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;
  const shown = steps.slice(-6);
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/20 shadow-xl space-y-3" aria-live="polite">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-700">Working on it</p>
        <span className="text-[11px] font-mono text-zinc-500">{seconds}s</span>
      </div>
      {shown.length === 0 ? (
        <p className="text-xs text-zinc-500 flex items-center gap-2"><Loader2 size={13} className="animate-spin text-[#0070FF]" /> Starting…</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((s, i) => {
            const last = i === shown.length - 1;
            return (
              <li key={`${steps.length - shown.length + i}-${s}`} className={`text-xs flex items-start gap-2 [overflow-wrap:anywhere] ${last ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}`}>
                {last ? <Loader2 size={13} className="animate-spin text-[#0070FF] shrink-0 mt-0.5" /> : <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />}
                <span>{s}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-zinc-400">New questions take about a minute: Onyx reads the platform's own docs before answering. Repeat questions are instant.</p>
    </div>
  );
};

export default RunProgress;
