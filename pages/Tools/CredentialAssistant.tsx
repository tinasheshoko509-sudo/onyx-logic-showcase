
import React, { useState, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import SavedAnswerNotice from '../../components/SavedAnswerNotice';
import RunProgress from '../../components/RunProgress';
import { readDocumentAsText } from '../../utils/readDocument';
import { getCredentialAssistance } from '../../services/gemini';
import { 
  Loader2, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  ListTodo,
  Sparkles,
  Info,
  CornerDownLeft,
  Upload,
  FileText
} from 'lucide-react';

interface SetupStep {
  title: string;
  instruction: string;
  /** Exact values to copy (header format, web address, command), one per line. */
  technical?: string;
}

interface CommonPitfall {
  issue: string;
  solution: string;
}

interface Prerequisite {
  name: string;
  description: string;
  link: string;
}

interface CredentialResult {
  /** false = no official docs could be found or read; `notice` says why. */
  found?: boolean;
  platform?: string;
  connectTo?: string;
  credentialName: string;
  prerequisites: Prerequisite[];
  setupSteps: SetupStep[];
  commonPitfalls: CommonPitfall[];
  /** What the user asked about that the docs don't explain. */
  notCovered?: string;
  /** The official documentation pages the guide was written from. */
  sources?: Array<{ title: string; url: string }>;
  notice?: string;
  /** One guide per platform named in the request (the request can name several). */
  guides?: CredentialResult[];
  /** Set when this is a saved answer (kept 7 days): when it was first built. */
  savedAt?: number;
}

const CredentialAssistant: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CredentialResult | null>(null);
  const [active, setActive] = useState(0);
  // A request naming several platforms comes back with one guide each; the tabs pick which shows.
  const guides = response?.guides?.length ? response.guides : response ? [response] : [];
  const result = guides[Math.min(active, guides.length - 1)] || null;
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // fresh: skip the saved answer and research again ("Check again").
  const handleProcess = async (fresh = false) => {
    if (!description.trim() || loading) return;
    setError(null);
    setLoading(true);
    setResponse(null);
    try {
      const data = await getCredentialAssistance(description, { fresh });
      setResponse(data); setActive(0);
      onAction();
    } catch (err) {
      console.error("NEURAL_BIFURCATION: Credential resolution failed.", err);
      setError(friendlyError(err, 'The credential guide could not be generated. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleProcess();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    readDocumentAsText(file)
      .then(setDescription)
      .catch(err => { console.error('File read failed:', err); setError(friendlyError(err, 'The file could not be read. Try pasting the text instead.')); });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Access Protocol Architect</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Credential <span className="text-[#0070FF]">Assistant</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Neural guidance for complex authentication flows. Resolve prerequisites and implementation steps instantly.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white p-6 rounded-2xl border ${isDragging ? 'border-[#0070FF] bg-[#0070FF]/5 shadow-2xl ring-2 ring-dashed ring-[#0070FF]' : 'border-[#0070FF]/25 shadow-xl'} transition-all duration-300 bg-gradient-to-br from-white to-blue-50/10 space-y-6 relative overflow-hidden`}
          >
            {isDragging && (
              <div className="absolute inset-x-0 top-0 bottom-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
                <FileText className="text-[#0070FF] animate-bounce" size={32} />
                <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop spec or credential file here</span>
              </div>
            )}

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em]">
                  Describe Authentication Type
                </label>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[9px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
                >
                  <Upload size={10} /> Import Spec File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".json,.txt,.csv,.log,.js,.ts,.py,.md,.docx,.pdf" 
                  onChange={handleFileChange} 
                />
              </div>

              <div className="relative group/input font-sans">
                <textarea 
                  className="w-full h-48 bg-white border border-zinc-200 rounded-xl p-4 text-zinc-800 text-sm focus:border-[#0070FF] outline-none transition-all placeholder:text-zinc-400 resize-none leading-relaxed font-semibold"
                  placeholder="Describe your authentication setup needs or drop a spec document here. e.g. I need to set up a Google Service Account for BigQuery access..."
                  value={description}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <button 
                  onClick={() => handleProcess()}
                  disabled={loading || !description.trim()}
                  className="absolute bottom-4 right-4 p-2 bg-blue-50 border border-blue-150 rounded-lg text-[#0070FF] hover:bg-blue-100 disabled:opacity-50 disabled:bg-zinc-100 disabled:text-zinc-400 transition-all shadow-sm"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CornerDownLeft size={16} />}
                </button>
              </div>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest text-center">Resolve protocol via CTRL + ENTER</p>
            </div>

            <button 
              onClick={() => handleProcess()}
              disabled={loading || !description.trim()}
              className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 font-display"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <><Sparkles size={16} /> Generate Guide</>
              )}
            </button>
            <ErrorNotice message={error} onClose={() => setError(null)} />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl bg-gradient-to-br from-white to-blue-50/10 flex gap-4 items-start">
            <div className="p-3 bg-blue-50 border border-blue-150 rounded-xl text-[#0070FF] shrink-0">
               <ShieldCheck size={18} />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Protocol Validation</h4>
               <p className="text-xs text-zinc-700 leading-relaxed font-semibold">
                 Every guide is written from the platform's own documentation, with links checked to load. Covers <span className="text-zinc-900 font-extrabold text-[#0070FF]">OAuth2</span>, <span className="text-zinc-900 font-extrabold text-[#0070FF]">API Keys</span>, <span className="text-zinc-900 font-extrabold text-[#0070FF]">JWT</span>, and <span className="text-zinc-900 font-extrabold text-[#0070FF]">M2M</span> authentications.
               </p>
            </div>
          </div>
        </div>

        {/* min-w-0: a grid column otherwise grows to fit its widest line and spills off screen. */}
        <div className="space-y-8 max-h-[1200px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 min-w-0">
          {response && <SavedAnswerNotice savedAt={response.savedAt} onRefresh={() => handleProcess(true)} busy={loading} />}
          {guides.length > 1 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-500">Your request names {guides.length} platforms — one guide each:</p>
              <div className="flex flex-wrap gap-2">
                {guides.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${i === active
                      ? 'bg-[#0070FF] text-white border-[#0070FF] shadow-sm'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-[#0070FF]/40'}`}
                  >
                    {g.platform || `Guide ${i + 1}`}{g.found === false ? ' (no guide)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          {result && result.found === false ? (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-sm font-black text-zinc-800">No guide{result.platform ? ` for ${result.platform}` : ''}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">{result.notice}</p>
                </div>
              </div>
              {(result.sources || []).length > 0 && (
                <div className="pl-7 space-y-1">
                  <p className="text-[11px] font-bold text-zinc-500">Pages checked:</p>
                  {(result.sources || []).map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#0070FF] hover:underline break-all">{s.title || s.url}</a>
                  ))}
                </div>
              )}
              <button
                onClick={() => setResponse(null)}
                className="w-full py-3 bg-white hover:bg-zinc-50 text-[#0070FF] rounded-xl font-black text-[10px] uppercase tracking-widest border border-zinc-200"
              >
                Try another request
              </button>
            </div>
          ) : result ? (
            <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-6 animate-in zoom-in-95 duration-500 bg-gradient-to-br from-white to-blue-50/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                  <Key size={250} className="text-[#0070FF]" />
               </div>

              <div className="space-y-4 relative z-10">
                {/* Stacked label + title: the old side-by-side all-caps title wrapped into a tall
                    block next to its label once real credential names (often long) came back. */}
                <div className="border-b border-[#0070FF]/15 pb-4 space-y-2 font-sans">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Credential you'll set up</span>
                  <h3 className="text-xl font-bold text-zinc-900 leading-snug">{result.credentialName}</h3>
                  {result.platform && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-[#0058CC]">{result.platform}</span>
                      {result.connectTo && (
                        <>
                          <ArrowRight size={12} className="text-zinc-400" />
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] font-bold text-zinc-700">{result.connectTo}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {(result.sources || []).length > 0 && (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1.5">
                    <p className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5">
                      <ShieldCheck size={13} /> Written only from the official documentation:
                    </p>
                    {(result.sources || []).map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-emerald-700 hover:underline break-all pl-5">
                        {s.title || s.url}
                      </a>
                    ))}
                  </div>
                )}

                {result.notCovered && (
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span><span className="font-black">Not in the docs:</span> {result.notCovered}</span>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                    <ListTodo size={14} className="text-blue-500" /> Prerequisites
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {result.prerequisites.map((item, i) => {
                      const name = typeof item === 'object' && item ? (item as any).name : String(item);
                      const description = typeof item === 'object' && item ? (item as any).description : '';
                      const link = typeof item === 'object' && item ? (item as any).link : '';
                      return (
                        <div key={i} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-[#0070FF]/25 hover:bg-blue-50/5 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 font-sans">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0070FF] text-[10px] font-bold shrink-0">
                                {i + 1}
                              </span>
                              <h5 className="text-sm font-bold text-zinc-950 break-words">{name}</h5>
                            </div>
                            {description && (
                              <p className="text-sm text-zinc-600 leading-relaxed pl-7 [overflow-wrap:anywhere]">
                                {description}
                              </p>
                            )}
                          </div>
                          {link && (
                            <a 
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex self-start md:self-center items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-[#0070FF] border border-blue-200 hover:border-[#0070FF] rounded-xl text-[10px] font-black text-[#0070FF] hover:text-white uppercase tracking-wider cursor-pointer transition-all shrink-0 shadow-sm"
                            >
                              <span>Open Site</span>
                              <ArrowRight size={10} className="shrink-0" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10 border-t border-[#0070FF]/15 pt-4">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                   <CheckCircle2 size={14} className="text-[#0070FF]" /> Setup Steps
                </h4>
                <div className="space-y-3">
                   {result.setupSteps.map((step, i) => (
                     <div key={i} className="flex gap-4 p-4 bg-white border border-[#0070FF]/15 rounded-xl hover:border-[#0070FF]/35 hover:shadow-sm transition-all group/item items-start">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-[#0070FF] font-black text-xs shrink-0">
                           {i + 1}
                        </div>
                        {/* min-w-0 + anywhere-wrapping: without them a long web address or header
                            value pushed the text past the card edge. */}
                        <div className="space-y-2 min-w-0 flex-1">
                           <h5 className="text-sm font-bold text-zinc-900 leading-snug break-words">{step.title}</h5>
                           <p className="text-sm text-zinc-700 leading-relaxed [overflow-wrap:anywhere]">
                             {step.instruction}
                           </p>
                           {step.technical && (
                             <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 space-y-1">
                               <div className="flex items-center justify-between gap-2">
                                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Copy this</span>
                                 <button
                                   onClick={() => navigator.clipboard?.writeText(step.technical || '').catch(() => {})}
                                   className="text-[10px] font-bold text-[#0070FF] hover:underline"
                                 >
                                   Copy
                                 </button>
                               </div>
                               <pre className="text-[11px] font-mono text-zinc-800 whitespace-pre-wrap [overflow-wrap:anywhere]">{step.technical}</pre>
                             </div>
                           )}
                        </div>
                     </div>
                   ))}
                </div>
              </div>

              {result.commonPitfalls.length > 0 && <div className="space-y-4 relative z-10 border-t border-[#0070FF]/15 pt-4">
                <h4 className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                   <AlertTriangle size={14} className="text-red-500" /> Common Pitfalls
                </h4>
                <div className="space-y-3">
                   {result.commonPitfalls.map((pitfall, i) => (
                     <div key={i} className="p-4 bg-red-50/20 border border-red-100 rounded-xl space-y-2 hover:border-red-200 transition-all">
                        <div className="flex items-start gap-2.5">
                           <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                           <p className="text-sm font-bold text-red-700 min-w-0 [overflow-wrap:anywhere]">{pitfall.issue}</p>
                        </div>
                        {pitfall.solution && (
                          <div className="flex items-start gap-2 pl-6">
                             <Info size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                             <p className="text-sm text-zinc-700 leading-relaxed min-w-0 [overflow-wrap:anywhere]">{pitfall.solution}</p>
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              </div>}

              <div className="pt-4 border-t border-[#0070FF]/15">
                 <button 
                  onClick={() => setResponse(null)}
                  className="w-full py-4 bg-white hover:bg-zinc-50 text-[#0070FF] rounded-xl hover:text-[#005ACC] transition-all font-black text-[10px] uppercase tracking-widest border border-zinc-200 shadow-sm"
                >
                  New Resolution Cycle
                </button>
              </div>
            </div>
          ) : loading ? (
            <RunProgress functionName="getCredentialAssistance" active={loading} />
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-650 p-8 text-center bg-blue-50/5 min-h-[500px]">
              <div className="relative mb-6 group">
                <div className="w-24 h-24 rounded-2xl border border-[#0070FF]/15 flex items-center justify-center bg-white transition-all hover:scale-110">
                  <Terminal size={40} className="text-[#0070FF]/30 animate-pulse" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#0070FF]/10 rounded-xl flex items-center justify-center text-[#0070FF] opacity-65 font-bold">
                   <Zap size={16} />
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-[0.4em] font-black mb-4 text-zinc-800">Protocol Architect IDLE</p>
              <p className="text-[10px] max-w-xs text-zinc-500 uppercase tracking-[0.1em] leading-relaxed font-bold">
                Enter an authentication setup directive to initiate the specialist-grade blueprint synthesis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CredentialAssistant;
