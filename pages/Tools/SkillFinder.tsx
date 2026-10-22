import React, { useState, useEffect } from 'react';
import { searchSkills, explainSkillScripts } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { Loader2, Puzzle, Search, Star, ExternalLink, ShieldAlert, Clock, BadgeCheck, FileCode, CheckCircle2, HelpCircle } from 'lucide-react';

// Skill Finder: type a task, get real Claude skills from GitHub that match it.
// Every result is a real SKILL.md found by GitHub search; the AI only ranks them.

type Skill = {
  repo: string; path: string; url: string; commit: string; name: string; description: string;
  stars: number; pushedAt: string | null; official: boolean;
  relevance: 'High' | 'Medium'; whatItDoes: string; whyItFits: string;
  copiesHidden: number;
  scripts: { status: 'none' | 'has-scripts' | 'unknown'; files: string[]; total: number };
};
type Result = { keywords: string; totalFound: number; copiesHidden: number; skills: Skill[] };
type Explained = {
  loading: boolean; error?: string; skipped?: number;
  scripts?: Array<{ file: string; whatItDoes: string; touches: string[]; watchOutFor: string | null }>;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return 'unknown';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
  return `${Math.floor(days / 365)} year${days < 730 ? '' : 's'} ago`;
};

const SkillFinder: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explained, setExplained] = useState<Record<string, Explained>>({});
  const { registerActions } = useProtocol();

  const handleExplain = async (s: Skill) => {
    const key = s.url;
    setExplained(prev => ({ ...prev, [key]: { loading: true } }));
    try {
      const data = await explainSkillScripts(s.repo, s.commit, s.path);
      setExplained(prev => ({ ...prev, [key]: { loading: false, scripts: data.scripts, skipped: data.skipped } }));
    } catch (err: any) {
      setExplained(prev => ({ ...prev, [key]: { loading: false, error: err?.message || 'Could not explain the scripts. Please try again.' } }));
    }
  };

  useEffect(() => {
    registerActions({
      dryRun: async () => { if (!task.trim()) throw new Error('NO_TASK: Describe the task first.'); },
      commit: async () => { if (!result) throw new Error('NO_RESULT: Run a search first.'); onAction(); },
    });
  }, [task, result, onAction, registerActions]);

  const handleSearch = async () => {
    if (!task.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setExplained({});
    try {
      const data = await searchSkills(task.trim());
      setResult(data);
      onAction();
    } catch (err: any) {
      setError(err?.message || 'The search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Puzzle size={16} className="text-[#0070FF]" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-sans">Claude Skill Discovery</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4 text-zinc-900">
          Skill <span className="text-[#0070FF]">Finder</span>
        </h2>
        <p className="text-zinc-650 text-xl max-w-3xl font-sans leading-relaxed">
          Describe a task and Onyx finds ready-made Claude skills on GitHub that do it — real skills only, ranked by how well they fit.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans px-1 block">What do you want Claude to do?</label>
            <textarea
              className="w-full h-36 bg-white border border-black/10 rounded-xl p-5 text-black text-sm focus:outline-none focus:border-[#0070FF]/50 transition-all placeholder:text-zinc-400 resize-none font-mono leading-relaxed"
              placeholder="e.g. Turn a PDF report into a slide deck, or review n8n workflow JSON for errors..."
              value={task}
              onChange={e => setTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSearch(); } }}
            />
            <button
              onClick={handleSearch}
              disabled={!task.trim() || loading}
              className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] shadow-lg disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-display"
            >
              {loading
                ? <><Loader2 className="animate-spin" size={16} /> Searching GitHub... (about 30 seconds)</>
                : <><Search size={16} /> Find Skills</>}
            </button>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-[11px] font-semibold flex items-start gap-2">
                <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="glass p-6 rounded-2xl border border-black/5 shadow-xl space-y-2">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans">How it works</h4>
            <p className="text-xs text-zinc-650 leading-relaxed font-medium">
              Onyx searches public GitHub projects for Claude skill files (SKILL.md), reads what each skill says it does, and ranks the ones that fit your task. Stars and last-updated dates come straight from GitHub.
            </p>
            <p className="text-xs text-zinc-650 leading-relaxed font-medium">
              These are other people's skills. Read a skill before installing it — skills can include instructions and scripts that run on your machine.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[900px] pr-1">
          {result ? (
            result.skills.length === 0 ? (
              <div className="glass p-8 rounded-2xl border border-black/5 text-center space-y-2">
                <p className="text-sm font-bold text-zinc-800">No matching skills found.</p>
                <p className="text-xs text-zinc-500">Searched GitHub for “{result.keywords}”. Try describing the task differently, in fewer words.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <p className="text-[11px] text-zinc-500 px-1">
                  {result.skills.length} best match{result.skills.length === 1 ? '' : 'es'} from {result.totalFound.toLocaleString()} skill files on GitHub for “{result.keywords}”, plus Anthropic's official collection.
                  {result.copiesHidden > 0 && ` ${result.copiesHidden} cop${result.copiesHidden === 1 ? 'y' : 'ies'} of the same skills hidden.`}
                </p>
                {result.skills.map((s, i) => (
                  <div key={i} className="glass p-5 rounded-2xl border border-black/5 shadow-xl space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-zinc-900 break-words flex items-center gap-2 flex-wrap">
                          {s.name}
                          {s.official && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#0070FF]/10 border-[#0070FF]/30 text-[#0070FF]">
                              <BadgeCheck size={11} /> Official · Anthropic
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-500 break-all">{s.repo}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.relevance === 'High' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        {s.relevance} match
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed font-medium">{s.whatItDoes}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed"><span className="font-semibold text-zinc-600">Why it fits:</span> {s.whyItFits}</p>
                    {s.scripts.status === 'has-scripts' ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                        <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                          <FileCode size={13} /> Includes {s.scripts.total} script file{s.scripts.total === 1 ? '' : 's'}{s.path === 'SKILL.md' ? ' in this repository' : ''} — review before installing
                        </p>
                        <p className="text-[11px] text-amber-900/80 leading-relaxed">
                          Scripts are programs Claude can run on your computer when it uses this skill. Open them on GitHub and make sure you understand what they do first.
                        </p>
                        <p className="text-[10px] font-mono text-amber-900/70 break-all">
                          {s.scripts.files.join(', ')}{s.scripts.total > s.scripts.files.length ? ` + ${s.scripts.total - s.scripts.files.length} more` : ''}
                        </p>
                        {(() => {
                          const ex = explained[s.url];
                          if (!ex) return (
                            <button onClick={() => handleExplain(s)} className="mt-1 px-3 py-1.5 bg-white border border-amber-300 hover:border-amber-500 rounded-lg text-[10px] font-black uppercase tracking-wider text-amber-800 transition-colors">
                              Explain these scripts
                            </button>
                          );
                          if (ex.loading) return (
                            <p className="mt-1 text-[11px] text-amber-800 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Reading the scripts... (about 30 seconds)</p>
                          );
                          if (ex.error) return (
                            <p className="mt-1 text-[11px] text-red-700">{ex.error} <button onClick={() => handleExplain(s)} className="underline font-semibold">Try again</button></p>
                          );
                          return (
                            <div className="mt-2 space-y-2">
                              {ex.scripts!.map((sc, j) => (
                                <div key={j} className="p-2.5 bg-white border border-amber-200 rounded-lg space-y-1">
                                  <p className="text-[11px] font-mono font-bold text-zinc-800 break-all">{sc.file}</p>
                                  <p className="text-[11px] text-zinc-700 leading-relaxed">{sc.whatItDoes}</p>
                                  {sc.touches?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {sc.touches.map((t, k) => (
                                        <span key={k} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-600">{t}</span>
                                      ))}
                                    </div>
                                  )}
                                  {sc.watchOutFor && (
                                    <p className="text-[11px] text-red-700 leading-relaxed"><span className="font-bold">Watch out:</span> {sc.watchOutFor}</p>
                                  )}
                                </div>
                              ))}
                              {!!ex.skipped && <p className="text-[10px] text-amber-900/70">{ex.skipped} more script file{ex.skipped === 1 ? '' : 's'} not explained — open them on GitHub.</p>}
                              <p className="text-[10px] text-amber-900/80 leading-relaxed italic">
                                This is an AI summary to help you understand the scripts. It can miss things, and a harmful script can be written to look harmless — it does not replace reviewing the code yourself or trusting the source.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    ) : s.scripts.status === 'none' ? (
                      <p className="text-[11px] text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={12} /> No script files — instructions only.</p>
                    ) : (
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5"><HelpCircle size={12} /> Couldn't check for scripts (repository too large). Review it on GitHub before installing.</p>
                    )}
                    {s.copiesHidden > 0 && (
                      <p className="text-[11px] text-zinc-500">{s.copiesHidden} cop{s.copiesHidden === 1 ? 'y' : 'ies'} of this skill in other repositories hidden{s.official ? ' — this is the original' : ''}.</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1"><Star size={12} className="text-amber-500" /> {s.stars.toLocaleString()} {s.stars === 1 ? 'star' : 'stars'}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> Updated {timeAgo(s.pushedAt)}</span>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-[#0070FF] hover:underline">
                        Open on GitHub <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="h-full border-2 border-dashed border-black/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 p-12 text-center glass min-h-[400px]">
              <Puzzle size={40} className="opacity-10 text-[#0070FF] mb-6" />
              <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2 text-black">No search yet</p>
              <p className="text-xs text-zinc-550 max-w-xs leading-relaxed font-sans font-medium">
                Describe a task on the left and Onyx will find Claude skills that already do it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillFinder;
