
import React, { useState, useEffect } from 'react';
import { scanApiDocumentation } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import SavedAnswerNotice from '../../components/SavedAnswerNotice';
import RunProgress from '../../components/RunProgress';
import {
  Loader2, Link as LinkIcon, Globe, Copy, Check, Download, ExternalLink,
  KeyRound, AlertTriangle, MessageSquareText, FileText, SearchX, Route, ListChecks,
} from 'lucide-react';

// Docu-Scanner: ask a question about an API; the answer comes only from its real docs
// (pasted text, the page itself, or a search of that docs site). Output layout matches
// the Scope & Stack Analyzer.

type Param = { name: string; location: string; required: boolean; description: string };
type Endpoint = { method: string; path: string; purpose: string; parameters: Param[]; example: string };
type ScanResult = {
  found: boolean;
  sourceMode: 'pasted' | 'page' | 'search' | 'site' | 'none';
  answer: string;
  keyPoints: string[];
  endpoints: Endpoint[];
  authentication: string;
  watchOuts: string[];
  sources: Array<{ title: string; url: string }>;
  answeredBy?: Array<{ title: string; url: string }>;
  problem?: 'invalid-url' | 'private' | 'unreachable' | 'not-found' | 'blocked' | 'not-text' | 'empty';
  /** Set when this is a saved answer (kept 7 days): when it was first built. */
  savedAt?: number;
};

// Why the link itself couldn't be read, in plain English. canPaste = pasting the text would help.
const PROBLEM_TEXT: Record<string, { title: string; body: string; canPaste: boolean }> = {
  'invalid-url': { title: "That isn't a web address", body: 'Check the link, for example https://docs.example.com/page.', canPaste: true },
  private: { title: 'Private address', body: 'Onyx only reads public websites, not local or company-network addresses.', canPaste: true },
  unreachable: { title: "Couldn't reach that website", body: "The site didn't respond or doesn't exist. Check the address for typos.", canPaste: true },
  'not-found': { title: "That page doesn't exist", body: 'The website says this page was not found (404). The link may be old or mistyped.', canPaste: true },
  blocked: { title: 'The website blocked Onyx', body: 'This site blocks automated readers or needs you to log in.', canPaste: true },
  'not-text': { title: "That link isn't a documentation page", body: 'It points to an image, video or download file, which Onyx can\'t read. Use the link of the docs page itself.', canPaste: false },
  empty: { title: "Couldn't read this page", body: "The page loads its content in a way Onyx can't read.", canPaste: true },
};

// Shown above an answer when the given link failed but other pages on the site answered.
const PROBLEM_NOTICE: Record<string, string> = {
  'not-found': "The link you gave doesn't exist (404), so this answer comes from other pages on the same site.",
  blocked: 'The page you gave blocked Onyx, so this answer comes from other pages on the same site.',
  empty: "The page you gave couldn't be read, so this answer comes from other pages on the same site.",
  unreachable: "The page you gave didn't respond, so this answer comes from other pages on the same site.",
};

const METHOD_CLASSES: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-[#0058CC] border-blue-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
};

const SOURCE_LABEL: Record<string, string> = {
  pasted: 'From the docs text you pasted',
  page: 'From the documentation page',
  search: 'That page blocked Onyx, so this comes from other pages on the same site. For the exact wording, paste the page text.',
  site: 'Onyx started at your page and followed it to the pages that answer this — see Sources for the exact pages',
};

const APIScanner: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [url, setUrl] = useState('');
  const [useCase, setUseCase] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [scannedWholeSite, setScannedWholeSite] = useState(false); // box state at the time of the last scan
  const [wholeSite, setWholeSite] = useState(() => { try { return localStorage.getItem('onyx_docscan_wholesite') !== '0'; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem('onyx_docscan_wholesite', wholeSite ? '1' : '0'); } catch { /* storage unavailable */ } }, [wholeSite]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { registerActions } = useProtocol();
  const hasSource = !!url.trim() || pasted.trim().length >= 50;

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!hasSource) throw new Error('NO_SOURCE: Add a documentation URL or paste the docs text.');
        if (!useCase.trim()) throw new Error('NO_QUESTION: Type what you want to know.');
      },
      commit: async () => {
        if (!result) throw new Error('NO_RESULT: Run a scan first.');
        onAction();
      },
    });
  }, [hasSource, useCase, result, onAction, registerActions]);

  // fresh: skip the saved answer and research again ("Check again").
  const handleScan = async (fresh = false) => {
    if (!hasSource || !useCase.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await scanApiDocumentation(url.trim(), useCase.trim(), showPaste ? pasted : '', wholeSite, { fresh }));
      setScannedWholeSite(wholeSite);
      onAction();
    } catch (err: any) {
      setError(err?.message || 'The scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const answeredBy = result?.answeredBy || [];
  const otherSources = (result?.sources || []).filter(s => !answeredBy.some(a => a.url === s.url));

  // ── Exports ──────────────────────────────────────────────────────────────────
  const buildMarkdown = () => {
    if (!result) return '';
    const l: string[] = [`# ${useCase}`, '', result.answer, ''];
    if (result.keyPoints?.length) { l.push('## Key points'); result.keyPoints.forEach(k => l.push(`- ${k}`)); l.push(''); }
    if (result.authentication) l.push('## Authentication', result.authentication, '');
    result.endpoints.forEach(e => {
      l.push(`## ${e.method} ${e.path}`, e.purpose, '');
      if (e.parameters.length) {
        l.push('| Name | Where | Required | Meaning |', '|---|---|---|---|');
        e.parameters.forEach(p => l.push(`| ${p.name} | ${p.location} | ${p.required ? 'Yes' : 'No'} | ${p.description} |`));
        l.push('');
      }
      if (e.example) l.push('```', e.example, '```', '');
    });
    if (result.watchOuts.length) { l.push('## Watch out for'); result.watchOuts.forEach(w => l.push(`- ${w}`)); l.push(''); }
    if (answeredBy.length) { l.push('## Answer found on'); answeredBy.forEach(s => l.push(`- ${s.title}: ${s.url}`)); l.push(''); }
    if (otherSources.length) { l.push(answeredBy.length ? '## Also checked' : '## Sources'); otherSources.forEach(s => l.push(`- ${s.title}: ${s.url}`)); }
    return l.join('\n');
  };

  const download = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `docu-scan.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(href), 100);
  };

  const exportTxt = () => download(buildMarkdown().replace(/[#*`|]/g, '').replace(/^-{3}.*$/gm, ''), 'txt', 'text/plain');

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(9);
      doc.splitTextToSize(buildMarkdown().replace(/[*`]/g, ''), 182).forEach((line: string) => {
        if (y > 278) { doc.addPage(); y = 20; }
        const heading = line.startsWith('#');
        doc.setFont('helvetica', heading ? 'bold' : 'normal');
        doc.text(line.replace(/^#+\s*/, ''), 14, y);
        y += heading ? 8 : 5.5;
      });
      doc.save('docu-scan.pdf');
    } catch {
      setError('PDF export failed. Try Markdown or TXT instead.');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <LinkIcon size={16} className="text-[#0070FF]" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Documentation Reader</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Onyx Docu-<span className="text-[#0070FF]">Scanner</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">
          Ask a question about any product's documentation — API endpoints, licensing, terms or pricing — and get the answer from the real pages, laid out clearly.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Input panel ── */}
        <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl bg-gradient-to-br from-white to-blue-50/10 space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Documentation URL</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-black text-sm focus:border-[#0070FF] outline-none transition-all placeholder:text-zinc-400"
                placeholder="https://docs.github.com/en/rest/issues/issues"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPaste(s => !s)}
              className="text-[10px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 px-1"
            >
              <FileText size={11} /> {showPaste ? 'Hide pasted text' : 'Or paste the docs text instead'}
            </button>
            {showPaste && (
              <div className="space-y-1">
                <textarea
                  className="w-full h-40 bg-white border border-zinc-200 rounded-xl p-4 text-black text-xs font-mono focus:border-[#0070FF] outline-none resize-y placeholder:text-zinc-400"
                  placeholder="Open the docs page in your browser, select all (Ctrl + A), copy and paste it here."
                  value={pasted}
                  onChange={e => setPasted(e.target.value)}
                />
                <p className="text-[10px] text-zinc-500 px-1">Use this when a page can't be read directly. When text is pasted, it is used instead of the URL.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">What do you want to know?</label>
            <textarea
              className="w-full h-28 bg-white border border-zinc-200 rounded-xl p-4 text-black text-sm focus:border-[#0070FF] outline-none resize-none transition-all placeholder:text-zinc-400"
              placeholder="e.g. How do I create a new issue?"
              value={useCase}
              onChange={e => setUseCase(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleScan(); } }}
            />
          </div>

          <label className="flex items-start gap-2.5 px-1 cursor-pointer select-none">
            <input type="checkbox" checked={wholeSite} onChange={e => setWholeSite(e.target.checked)} className="mt-0.5 accent-[#0070FF]" />
            <span className="text-xs text-zinc-700">
              <span className="font-semibold">Search the whole website if this page doesn't answer</span>
              <span className="block text-[10px] text-zinc-500">Only pages on that product's own site are used. Adds about 10–20 seconds when it's needed.</span>
            </span>
          </label>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 font-semibold">{error}</div>}

          <button
            onClick={() => handleScan()}
            disabled={loading || !hasSource || !useCase.trim()}
            className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 font-display"
          >
            {loading ? <><Loader2 className="animate-spin" size={16} /> Reading the docs…</> : 'Scan Documentation'}
          </button>
        </div>

        {/* ── Output panel ── */}
        <div className="space-y-4">
          {result && <SavedAnswerNotice savedAt={result.savedAt} onRefresh={() => handleScan(true)} busy={loading} />}
          {result && !result.found && result.sourceMode === 'site' ? (
            // Whole site searched and the thing isn't there: a real "not mentioned", not a failure.
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-500">
              <h3 className="text-sm font-black text-zinc-800 flex items-center gap-2"><SearchX size={16} className="text-zinc-500" /> Not mentioned anywhere on their site</h3>
              <p className="text-xs text-zinc-700 leading-relaxed">{result.answer}</p>
              {result.sources.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pages checked</h4>
                  {result.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 p-3 rounded-xl border border-zinc-100 hover:border-[#0070FF]/30 text-xs text-zinc-600 hover:text-[#0070FF] transition-all">
                      <span className="truncate">{s.title}</span><ExternalLink size={12} className="shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : result && !result.found && result.sourceMode === 'none' ? (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-xl p-6 space-y-3 animate-in zoom-in-95 duration-500">
              <h3 className="text-sm font-black text-amber-800 flex items-center gap-2"><SearchX size={16} />
                {(PROBLEM_TEXT[result.problem || 'empty'] || PROBLEM_TEXT.empty).title}
              </h3>
              <p className="text-xs text-zinc-700 leading-relaxed">
                {(PROBLEM_TEXT[result.problem || 'empty'] || PROBLEM_TEXT.empty).body}
                {scannedWholeSite && result.problem !== 'not-text' && result.problem !== 'private' && result.problem !== 'invalid-url' && ' A search of the rest of the site found nothing useful either.'}
                {' '}Nothing has been guessed.
              </p>
              {(PROBLEM_TEXT[result.problem || 'empty'] || PROBLEM_TEXT.empty).canPaste && (
                <p className="text-xs text-zinc-700 leading-relaxed">
                  <span className="font-bold">What to do:</span> open the page in your browser, select all (Ctrl + A), copy it, and use <span className="font-semibold">"Or paste the docs text instead"</span>.
                </p>
              )}
            </div>
          ) : result && !result.found ? (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-xl p-6 space-y-3 animate-in zoom-in-95 duration-500">
              <h3 className="text-sm font-black text-amber-800 flex items-center gap-2"><SearchX size={16} />
                This page doesn't answer this
              </h3>
              <p className="text-xs text-zinc-700 leading-relaxed">
                {result.answer || 'The documentation text did not contain an answer to your question. Nothing has been guessed.'}
              </p>
              {result.sourceMode !== 'none' && result.sourceMode !== 'pasted' && !scannedWholeSite && (
                <p className="text-xs text-[#0058CC] leading-relaxed px-3 py-2 bg-[#0070FF]/10 rounded-xl border border-[#0070FF]/20">
                  Only this one page was checked. Tick <span className="font-semibold">"Search the whole website"</span> and scan again to check the rest of their site.
                </p>
              )}
              {(result.sourceMode === 'none' || result.sourceMode === 'pasted' || scannedWholeSite) && (
                <p className="text-xs text-zinc-700 leading-relaxed">
                  <span className="font-bold">What to do:</span> open the page in your browser, select all (Ctrl + A), copy it, and use <span className="font-semibold">"Or paste the docs text instead"</span>. Or try the URL of the exact page for this topic.
                </p>
              )}
            </div>
          ) : result ? (
            <div className="bg-white rounded-2xl border border-[#0070FF]/25 shadow-xl animate-in zoom-in-95 duration-500 bg-gradient-to-br from-white to-blue-50/10 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap border-b border-zinc-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{SOURCE_LABEL[result.sourceMode]}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => copyText('all', buildMarkdown())} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-zinc-200 rounded-lg hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex items-center gap-1">
                    {copied === 'all' ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
                  </button>
                  <button type="button" onClick={() => download(buildMarkdown(), 'md', 'text/markdown')} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-zinc-200 rounded-lg hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex items-center gap-1"><Download size={9} /> MD</button>
                  <button type="button" onClick={exportTxt} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-zinc-200 rounded-lg hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex items-center gap-1"><Download size={9} /> TXT</button>
                  <button type="button" onClick={exportPdf} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-zinc-200 rounded-lg hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex items-center gap-1"><Download size={9} /> PDF</button>
                </div>
              </div>

              <div className="p-6 space-y-7 max-h-[72vh] overflow-y-auto">
                {result.problem && PROBLEM_NOTICE[result.problem] && (
                  <p className="text-xs text-amber-900 leading-relaxed px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">{PROBLEM_NOTICE[result.problem]}</p>
                )}
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquareText size={13} className="text-[#0070FF]" /> The answer
                  </h4>
                  <p className="text-sm text-zinc-800 leading-relaxed">{result.answer}</p>
                  {answeredBy.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Answer found on</p>
                      {answeredBy.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 text-xs font-semibold text-emerald-800 transition-all">
                          <span className="truncate">{s.title}</span><ExternalLink size={12} className="shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {result.keyPoints?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                      <ListChecks size={13} className="text-emerald-500" /> What the docs state
                    </h4>
                    <ul className="space-y-1.5">
                      {result.keyPoints.map((k, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 font-semibold leading-relaxed">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>{k}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.authentication && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                      <KeyRound size={13} className="text-[#0070FF]" /> Authentication
                    </h4>
                    <p className="text-xs font-semibold leading-relaxed px-3 py-2 bg-[#0070FF]/10 text-[#0058CC] rounded-xl border border-[#0070FF]/20 whitespace-pre-wrap">{result.authentication}</p>
                  </div>
                )}

                {result.endpoints.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                      <Route size={13} className="text-[#0070FF]" /> Endpoints
                    </h4>
                    {result.endpoints.map((e, i) => (
                      <div key={i} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/40 space-y-3">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${METHOD_CLASSES[e.method?.toUpperCase()] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>{e.method}</span>
                          <code className="text-xs font-mono font-bold text-zinc-900 break-all">{e.path}</code>
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed">{e.purpose}</p>

                        {e.parameters.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-[9px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                                  <th className="py-1.5 pr-3">Name</th><th className="py-1.5 pr-3">Where</th><th className="py-1.5 pr-3">Required</th><th className="py-1.5">Meaning</th>
                                </tr>
                              </thead>
                              <tbody>
                                {e.parameters.map((p, j) => (
                                  <tr key={j} className="border-b border-zinc-100 align-top">
                                    <td className="py-1.5 pr-3 font-mono font-semibold text-zinc-900">{p.name}</td>
                                    <td className="py-1.5 pr-3 text-zinc-500">{p.location}</td>
                                    <td className="py-1.5 pr-3">{p.required ? <span className="font-bold text-red-600">Yes</span> : <span className="text-zinc-400">No</span>}</td>
                                    <td className="py-1.5 text-zinc-600">{p.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {e.example && (
                          <div className="relative">
                            <pre className="p-3 pr-16 bg-white border border-zinc-200 rounded-lg text-[11px] font-mono text-zinc-700 whitespace-pre-wrap break-words">{e.example}</pre>
                            <button onClick={() => copyText(`ex${i}`, e.example)} className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-500 hover:text-[#0070FF]">
                              {copied === `ex${i}` ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {result.watchOuts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={13} className="text-amber-500" /> Watch out for
                    </h4>
                    <div className="space-y-2">
                      {result.watchOuts.map((w, i) => (
                        <div key={i} className="p-3 rounded-xl border border-amber-100 bg-amber-50/20 border-l-2 border-l-amber-400 text-xs text-zinc-700 leading-relaxed">{w}</div>
                      ))}
                    </div>
                  </div>
                )}

                {otherSources.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{answeredBy.length > 0 ? 'Also checked' : 'Sources'}</h4>
                    {otherSources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 p-3 rounded-xl border border-zinc-100 hover:border-[#0070FF]/30 text-xs text-zinc-600 hover:text-[#0070FF] transition-all">
                        <span className="truncate">{s.title}</span><ExternalLink size={12} className="shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : loading ? (
            <RunProgress functionName="scanApiDocumentation" active={loading} />
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-blue-50/5 min-h-[400px]">
              <LinkIcon size={48} className="mb-4 opacity-30 text-[#0070FF]" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-800">Ready to scan</p>
              <p className="text-xs text-zinc-400 mt-2">Add a docs URL (or paste the docs text) and ask a question</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIScanner;
