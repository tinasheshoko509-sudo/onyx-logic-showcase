
import React, { useState, useEffect } from 'react';
import { searchCommunity } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { Loader2, MessageSquare, Users2, AlertTriangle, Lightbulb, Tag, Globe } from 'lucide-react';

const PLATFORMS = [
  { id: 'n8n',           label: 'n8n',           url: 'community.n8n.io'             },
  { id: 'make',          label: 'Make.com',           url: 'community.make.com'           },
  { id: 'github',        label: 'GitHub',         url: 'github.com/discussions'       },
  { id: 'reddit',        label: 'Reddit',         url: 'reddit.com/r/automation'      },
] as const;
// Only platforms with a publicly searchable community are listed. Closebot, GoHighLevel,
// Vapi (Discord), Claude and the free-text "Other" option were removed: they have no
// public forum that can be searched, so answers for them could only ever be AI memory.

type TractionLevel = 'High' | 'Medium' | 'Low';

type Result = {
  summary: string;
  solutions: { title: string; detail: string; traction: TractionLevel }[];
  pitfalls: string[];
  proTips: string[];
  relatedTopics: string[];
};

const TRACTION: Record<TractionLevel, { label: string; color: string; bg: string; border: string }> = {
  High:   { label: 'High traction',   color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  Medium: { label: 'Mid traction',    color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200'   },
  Low:    { label: 'Low traction',    color: 'text-zinc-500',    bg: 'bg-zinc-50',     border: 'border-zinc-200'    },
};

const Community: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [platform, setPlatform]               = useState<string>('n8n');
  const [topic, setTopic]                   = useState('');
  const [loading, setLoading]                 = useState(false);
  const [result, setResult]                   = useState<Result | null>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!topic.trim()) throw new Error('NO_TOPIC: A topic or question is required.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_RESULT: Completed community search required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAction();
      },
    });
  }, [topic, result, onAction, registerActions]);

  const handleSearch = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const p = PLATFORMS.find(p => p.id === platform)!;
      const data = await searchCommunity(p.label, topic, p.url);
      setResult(data);
      onAction();
    } catch (err) {
      console.error('Community search failed.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearch();
    }
  };

  const canSubmit      = topic.trim().length > 0 && !loading;
  const activePlatform = PLATFORMS.find(p => p.id === platform)!;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare size={16} className="text-[#0070FF] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-sans">Community Intelligence Layer</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4 text-zinc-900">
          Community <span className="text-[#0070FF]">Intel</span>
        </h2>
        <p className="text-zinc-650 text-xl max-w-3xl font-sans leading-relaxed">
          Surface what platform communities actually say about any topic — covering the n8n and Make forums, GitHub Discussions, and Reddit.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Left: Input ────────────────────────────────── */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.01] group-hover:opacity-[0.03] transition-opacity pointer-events-none">
              <MessageSquare size={120} className="text-[#0070FF]" />
            </div>

            {/* Platform grid */}
            <div className="space-y-3 relative z-10">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans px-1 block">Platform</label>
              <div className="grid grid-cols-4 gap-2">
                {PLATFORMS.map(p => {
                  const active = platform === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`py-2.5 px-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        active
                          ? 'bg-[#0070FF] border-[#0070FF] text-white shadow-md'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:border-[#0070FF]/40 hover:text-zinc-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest px-1">
                Community: {activePlatform.url}
              </p>
            </div>

            {/* Topic input */}
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans px-1 block">Topic or Question</label>
              <textarea
                className="w-full h-36 bg-white border border-black/10 rounded-xl p-5 text-black text-sm focus:outline-none focus:border-[#0070FF]/50 transition-all duration-300 placeholder:text-zinc-400 resize-none font-mono leading-relaxed"
                placeholder="e.g. Best way to handle webhook retries, or rate limiting with HTTP modules..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest text-right px-1">
                CTRL + ENTER to execute
              </p>
            </div>

            <button
              onClick={handleSearch}
              disabled={!canSubmit}
              className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 text-xs uppercase tracking-[0.4em] shadow-lg disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-display"
            >
              {loading ? (
                <div className="flex items-center gap-3 font-display">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="uppercase tracking-[0.2em] font-display">Scanning Community...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 uppercase tracking-[0.3em] font-display">
                  <Globe size={16} /> Search Community
                </div>
              )}
            </button>
          </div>

          {/* Info card */}
          <div className="glass p-6 rounded-2xl border border-black/5 flex gap-4 items-start shadow-xl">
            <div className="p-3 bg-[#0070FF]/10 rounded-xl text-[#0070FF] shrink-0 border border-[#0070FF]/20 shadow-inner mt-0.5">
              <Users2 size={20} />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1 font-sans">Community Intelligence</h4>
              <p className="text-xs text-zinc-650 leading-relaxed font-sans font-medium">
                Covers public communities only — the n8n and Make forums, GitHub Discussions, and Reddit — distilled into ranked solutions, pitfalls, and practical tips.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Results ──────────────────────────────── */}
        <div className="overflow-y-auto max-h-[900px] pr-1">
          {result ? (
            <div className="space-y-5 animate-in zoom-in-95 duration-300">

              {/* Community Pulse */}
              <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-5 bg-[#0070FF] rounded-full shadow-[0_0_10px_#0070FF]" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 font-sans">Community Pulse</h3>
                  <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-zinc-400 font-mono">{activePlatform.label}</span>
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed italic font-medium">"{result.summary}"</p>
                <div className="mt-4 flex items-center gap-3 text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0070FF] animate-pulse" />
                  Community synthesis complete
                </div>
              </div>

              {/* Top Solutions */}
              <div className="glass p-6 rounded-2xl border border-black/5 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10B981]" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 font-sans">Top Solutions</h3>
                </div>
                <div className="space-y-3">
                  {result.solutions.map((s, i) => {
                    const t = TRACTION[s.traction] ?? TRACTION.Low;
                    return (
                      <div key={i} className="flex gap-4 p-4 glass border border-black/5 rounded-xl hover:border-[#0070FF]/15 hover:bg-[#0070FF]/5 transition-all items-start">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 font-extrabold text-xs flex items-center justify-center shrink-0 border border-emerald-500/25 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <p className="text-xs font-black text-zinc-900">{s.title}</p>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${t.bg} ${t.border} ${t.color}`}>
                              {t.label}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 font-medium leading-relaxed">{s.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Community Warnings */}
              {result.pitfalls.length > 0 && (
                <div className="glass p-5 rounded-2xl border border-black/5 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-red-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 font-sans">Community Warnings</h3>
                  </div>
                  <div className="space-y-2">
                    {result.pitfalls.map((p, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-red-50/60 border border-red-100 rounded-xl items-start">
                        <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-700 font-medium leading-relaxed">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Power User Tips */}
              {result.proTips.length > 0 && (
                <div className="glass p-5 rounded-2xl border border-black/5 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-amber-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 font-sans">Power User Tips</h3>
                  </div>
                  <div className="space-y-2">
                    {result.proTips.map((tip, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-amber-50/60 border border-amber-100 rounded-xl items-start">
                        <Lightbulb size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-700 font-medium leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Topics */}
              {result.relatedTopics.length > 0 && (
                <div className="glass p-5 rounded-2xl border border-black/5 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Tag size={12} className="text-zinc-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 font-sans">Related Topics</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.relatedTopics.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-zinc-100 hover:bg-[#0070FF]/10 hover:text-[#0070FF] text-zinc-600 rounded-lg border border-zinc-200 hover:border-[#0070FF]/30 transition-all cursor-default"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-black/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 p-12 text-center glass min-h-[500px]">
              <MessageSquare size={40} className="opacity-10 text-[#0070FF] mb-6 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2 text-black">Community Scanner Idle</p>
              <p className="text-xs text-zinc-550 max-w-xs leading-relaxed font-sans font-medium">
                Select a platform, enter your topic or question, then scan the community for synthesized insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;
