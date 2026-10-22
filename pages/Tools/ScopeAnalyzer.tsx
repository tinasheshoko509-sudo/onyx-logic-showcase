
import React, { useState, useEffect, useRef } from 'react';
import { analyzeScope, analyzeToolStack, analyzeEdgeCases } from '../../services/gemini';
import { readDocumentAsText, DOCUMENT_ACCEPT } from '../../utils/readDocument';
import { useProtocol } from '../../context/ProtocolContext';
import InputNotice from '../../components/InputNotice';
import { friendlyError } from '../../components/ErrorNotice';
import {
  Loader2, Target, CheckCircle, XCircle,
  ClipboardList, Upload, FileText, Download, Clock,
  Layers, ArrowRight, AlertTriangle, RefreshCw,
} from 'lucide-react';

interface Deliverable {
  name: string;
  description: string;
}

interface PendingItem {
  title: string;
  description: string;
}

interface ScopeResult {
  projectName: string;
  summary: string;
  deliverables: Deliverable[];
  inScope: string[];
  outOfScope: string[];
  pendingItems: PendingItem[];
  inputNote?: string;
}

interface ToolAlternative {
  name: string;
  description: string;
  keyDifference: string;
  /** The web search result this alternative was found in. */
  sourceTitle?: string;
  sourceUrl?: string;
  /** The product's own website (only set when the site name matches the product). */
  websiteUrl?: string;
}

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

interface ToolEntry {
  name: string;
  role: string;
  alternatives: ToolAlternative[];
  /** false = the AI listed it but the name is nowhere in the document (checked on the server). */
  namedInDocument?: boolean;
  /** Plain-English reason the alternatives list is empty. */
  alternativesNote?: string;
}

const EMPTY_ALTS = 'No direct alternatives for this tool in this context.';

// Older saved results have no namedInDocument flag; treat those as named.
const namedTools = (s: { tools?: ToolEntry[] } | null) => (s?.tools || []).filter(t => t.namedInDocument !== false);
const suggestedTools = (s: { tools?: ToolEntry[] } | null) => (s?.tools || []).filter(t => t.namedInDocument === false);
const SUGGESTED_HEADING = 'Suggested by the AI — not named in your document';

interface StackResult {
  tools: ToolEntry[];
  inputNote?: string;
}

interface EdgeCase {
  scenario: string;
  category: string;
  likelihood: 'High' | 'Medium' | 'Low';
  impact: string;
  recommendation: string;
}

interface EdgeCaseResult {
  edgeCases: EdgeCase[];
  inputNote?: string;
}

type OutputTab = 'scope' | 'stack' | 'edgecases';

const LIKELIHOOD_CLASSES: Record<string, string> = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

/** Shown inside a tab when that one section failed (timed out, etc.) while the
 * others may have succeeded — lets the user retry just this section instead of
 * losing every result and re-running (and re-paying for) all three. */
const SectionError: React.FC<{ message: string; retrying: boolean; onRetry: () => void }> = ({ message, retrying, onRetry }) => (
  <div className="p-4 rounded-xl border border-red-200 bg-red-50 space-y-3">
    <p className="text-xs text-red-700 font-semibold">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
    >
      {retrying ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
      {retrying ? 'Retrying…' : 'Retry this section'}
    </button>
  </div>
);

const ScopeAnalyzer: React.FC<{ onAction: (...args: any[]) => void }> = ({ onAction }) => {
  const [inputText, setInputText]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<ScopeResult | null>(null);
  const [stackResult, setStackResult] = useState<StackResult | null>(null);
  const [edgeCaseResult, setEdgeCaseResult] = useState<EdgeCaseResult | null>(null);
  // Each of the 3 sections runs as an independent AI call, so each gets its own
  // error — one timing out must not throw away the other two, which may have
  // already succeeded (and been paid for).
  const [scopeError, setScopeError]       = useState<string | null>(null);
  const [stackError, setStackError]       = useState<string | null>(null);
  const [edgeCaseError, setEdgeCaseError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<Record<OutputTab, boolean>>({ scope: false, stack: false, edgecases: false });
  const [activeTab, setActiveTab]     = useState<OutputTab>('scope');
  const [error, setError]             = useState<string | null>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!inputText.trim()) throw new Error('NO_DOCUMENT: A project document is required.');
      },
      commit: async () => {
        if (!result) throw new Error('NO_RESULT: Complete an analysis before committing.');
        await new Promise(resolve => setTimeout(resolve, 800));
        onAction();
      },
    });
  }, [inputText, result, onAction, registerActions]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStackResult(null);
    setEdgeCaseResult(null);
    setScopeError(null);
    setStackError(null);
    setEdgeCaseError(null);

    // allSettled (not all): one section timing out must not discard the other two.
    const [scopeR, stackR, edgeR] = await Promise.allSettled([
      analyzeScope(inputText),
      analyzeToolStack(inputText),
      analyzeEdgeCases(inputText),
    ]);

    if (scopeR.status === 'fulfilled') setResult(scopeR.value);
    else setScopeError(friendlyError(scopeR.reason, 'The project scope could not be analysed. Please try again.'));

    if (stackR.status === 'fulfilled') setStackResult(stackR.value);
    else setStackError(friendlyError(stackR.reason, 'The tool stack could not be analysed. Please try again.'));

    if (edgeR.status === 'fulfilled') setEdgeCaseResult(edgeR.value);
    else setEdgeCaseError(friendlyError(edgeR.reason, 'The edge cases could not be analysed. Please try again.'));

    // Land on the first tab that actually has something to show.
    setActiveTab(scopeR.status === 'fulfilled' ? 'scope' : stackR.status === 'fulfilled' ? 'stack' : 'edgecases');

    if (scopeR.status === 'fulfilled' || stackR.status === 'fulfilled' || edgeR.status === 'fulfilled') {
      onAction('scope-analyzer', inputText, JSON.stringify({
        scope: scopeR.status === 'fulfilled' ? scopeR.value : null,
        stack: stackR.status === 'fulfilled' ? stackR.value : null,
        edgeCases: edgeR.status === 'fulfilled' ? edgeR.value : null,
      }));
    }
    setLoading(false);
  };

  /** Re-runs a single failed section without touching the other two. */
  const retrySection = async (section: OutputTab) => {
    if (!inputText.trim()) return;
    setRetrying(r => ({ ...r, [section]: true }));
    try {
      if (section === 'scope') {
        setScopeError(null);
        setResult(await analyzeScope(inputText));
      } else if (section === 'stack') {
        setStackError(null);
        setStackResult(await analyzeToolStack(inputText));
      } else {
        setEdgeCaseError(null);
        setEdgeCaseResult(await analyzeEdgeCases(inputText));
      }
    } catch (err: any) {
      const msg = friendlyError(err, 'Retry failed. Please try again.');
      if (section === 'scope') setScopeError(msg);
      else if (section === 'stack') setStackError(msg);
      else setEdgeCaseError(msg);
    } finally {
      setRetrying(r => ({ ...r, [section]: false }));
    }
  };

  const readFile = async (file: File) => {
    try {
      setInputText(await readDocumentAsText(file));
      setError(null);
    } catch (err: any) {
      setError(friendlyError(err, 'The file could not be read. Try pasting the text instead.'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  // ── Exports ───────────────────────────────────────────────────────────────────

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = window.document.createElement('a');
    a.href     = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const slug = () => result ? result.projectName.replace(/\s+/g, '-').toLowerCase() : 'scope';

  const buildScopeMarkdown = () => {
    if (!result) return '';
    const lines: string[] = [
      `# ${result.projectName}`,
      `## Project Results & Deliverables`,
      result.summary,
      '',
    ];
    (result.deliverables || []).forEach((d, i) => {
      lines.push(`### ${i + 1}. ${d.name}`);
      lines.push(d.description);
      lines.push('');
    });
    lines.push('## Project Scope');
    lines.push('This project is purely about:');
    (result.inScope || []).forEach(s => lines.push(`- ${s}`));
    lines.push('');
    lines.push('## Out of Scope');
    (result.outOfScope || []).forEach(s => lines.push(`- ${s}`));
    if ((result.pendingItems || []).length > 0) {
      lines.push('');
      lines.push('## Pending / TBD');
      (result.pendingItems || []).forEach(p => {
        lines.push(`### ${p.title}`);
        lines.push(p.description);
        lines.push('');
      });
    }
    return lines.join('\n');
  };

  const buildStackMarkdown = () => {
    if (!stackResult) return '';
    const lines: string[] = ['## Stack Alternatives', ''];
    namedTools(stackResult).forEach(t => {
      lines.push(`### ${t.name}`);
      lines.push(`**Role:** ${t.role}`);
      lines.push('');
      if ((t.alternatives || []).length > 0) {
        lines.push('**Alternatives:**');
        t.alternatives.forEach(a => {
          lines.push(`- **${a.name}**${a.websiteUrl ? ` ([${hostOf(a.websiteUrl)}](${a.websiteUrl}))` : ''} — ${a.description} *(${a.keyDifference})*${a.sourceUrl ? ` — Source: [${a.sourceTitle || a.sourceUrl}](${a.sourceUrl})` : ''}`);
        });
      } else {
        lines.push(`*${t.alternativesNote || EMPTY_ALTS}*`);
      }
      lines.push('');
    });
    const suggested = suggestedTools(stackResult);
    if (suggested.length) {
      lines.push(`### ${SUGGESTED_HEADING}`, '');
      suggested.forEach(t => lines.push(`- **${t.name}** — ${t.role}`));
      lines.push('');
    }
    return lines.join('\n');
  };

  const buildEdgeCasesMarkdown = () => {
    if (!edgeCaseResult) return '';
    const lines: string[] = ['## Production Edge Cases', ''];
    (edgeCaseResult.edgeCases || []).forEach((ec, i) => {
      lines.push(`### ${i + 1}. ${ec.scenario}`);
      lines.push(`**Category:** ${ec.category} | **Likelihood:** ${ec.likelihood}`);
      lines.push('');
      lines.push(`**Impact if unhandled:** ${ec.impact}`);
      lines.push('');
      lines.push(`**Recommendation:** ${ec.recommendation}`);
      lines.push('');
    });
    return lines.join('\n');
  };

  const exportMarkdown = () => {
    if (!result) return;
    const content = buildScopeMarkdown()
      + (stackResult ? '\n\n' + buildStackMarkdown() : '')
      + (edgeCaseResult ? '\n\n' + buildEdgeCasesMarkdown() : '');
    triggerDownload(content, `${slug()}.md`, 'text/markdown');
  };

  const exportTxt = () => {
    if (!result) return;
    const lines: string[] = [
      result.projectName.toUpperCase(),
      'PROJECT RESULTS & DELIVERABLES',
      '='.repeat(60),
      result.summary,
      '',
    ];
    (result.deliverables || []).forEach((d, i) => {
      lines.push(`${i + 1}. ${d.name}`);
      lines.push(d.description);
      lines.push('');
    });
    lines.push('PROJECT SCOPE');
    lines.push('This project is purely about:');
    (result.inScope || []).forEach(s => lines.push(`  • ${s}`));
    lines.push('');
    lines.push('OUT OF SCOPE');
    (result.outOfScope || []).forEach(s => lines.push(`  • ${s}`));
    if ((result.pendingItems || []).length > 0) {
      lines.push('');
      lines.push('PENDING / TBD');
      (result.pendingItems || []).forEach(p => {
        lines.push(`  ${p.title}`);
        lines.push(`  ${p.description}`);
        lines.push('');
      });
    }
    if (stackResult && (stackResult.tools || []).length > 0) {
      lines.push('');
      lines.push('STACK ALTERNATIVES');
      lines.push('='.repeat(60));
      namedTools(stackResult).forEach(t => {
        lines.push(`${t.name.toUpperCase()}`);
        lines.push(`Role: ${t.role}`);
        if ((t.alternatives || []).length > 0) {
          lines.push('Alternatives:');
          t.alternatives.forEach(a => {
            lines.push(`  • ${a.name} — ${a.description}`);
            lines.push(`    Trade-off: ${a.keyDifference}`);
            if (a.websiteUrl) lines.push(`    Website: ${a.websiteUrl}`);
            if (a.sourceUrl) lines.push(`    Source: ${a.sourceUrl}`);
          });
        } else {
          lines.push(`  ${t.alternativesNote || EMPTY_ALTS}`);
        }
        lines.push('');
      });
      const suggested = suggestedTools(stackResult);
      if (suggested.length) {
        lines.push(SUGGESTED_HEADING.toUpperCase());
        suggested.forEach(t => lines.push(`  • ${t.name} — ${t.role}`));
        lines.push('');
      }
    }
    if (edgeCaseResult && (edgeCaseResult.edgeCases || []).length > 0) {
      lines.push('');
      lines.push('PRODUCTION EDGE CASES');
      lines.push('='.repeat(60));
      edgeCaseResult.edgeCases.forEach((ec, i) => {
        lines.push(`${i + 1}. ${ec.scenario}`);
        lines.push(`  Category: ${ec.category} | Likelihood: ${ec.likelihood}`);
        lines.push(`  Impact: ${ec.impact}`);
        lines.push(`  Recommendation: ${ec.recommendation}`);
        lines.push('');
      });
    }
    triggerDownload(lines.join('\n'), `${slug()}.txt`, 'text/plain');
  };

  const exportPdf = async () => {
    if (!result) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc  = new jsPDF();
      let y      = 20;
      const lh   = 6.5;
      const pageH = 278;
      const L    = 14;
      const W    = 182;

      const guard = (needed = 16) => { if (y + needed > pageH) { doc.addPage(); y = 20; } };
      const wrap  = (text: string, x: number, w: number, indent = 0) => {
        doc.splitTextToSize(String(text || ''), w - indent).forEach((line: string) => {
          guard();
          doc.text(line, x + indent, y);
          y += lh;
        });
      };

      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text(result.projectName, L, y); y += 10;

      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Project Results & Deliverables', L, y); y += 7;
      doc.setFontSize(9); doc.setFont('helvetica', 'italic');
      wrap(result.summary, L, W); y += 4;

      (result.deliverables || []).forEach((d, i) => {
        guard(20);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(`${i + 1}. ${d.name}`, L, y); y += lh + 1;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        wrap(d.description, L, W, 4); y += 3;
      });

      guard(16);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Project Scope', L, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('This project is purely about:', L, y); y += lh + 1;
      (result.inScope || []).forEach(s => { guard(); doc.text(`• ${s}`, L + 4, y); y += lh; });
      y += 3;

      guard(16);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Out of Scope', L, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      (result.outOfScope || []).forEach(s => { guard(); doc.text(`• ${s}`, L + 4, y); y += lh; });

      if ((result.pendingItems || []).length > 0) {
        y += 4;
        guard(16);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text('Pending / TBD', L, y); y += 7;
        (result.pendingItems || []).forEach(p => {
          guard(16);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
          doc.text(p.title, L, y); y += lh + 1;
          doc.setFont('helvetica', 'normal');
          wrap(p.description, L, W, 4); y += 3;
        });
      }

      if (stackResult && (stackResult.tools || []).length > 0) {
        doc.addPage(); y = 20;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
        doc.text('Stack Alternatives', L, y); y += 10;

        namedTools(stackResult).forEach(t => {
          guard(24);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
          doc.text(t.name, L, y); y += lh + 1;
          doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
          wrap(`Role: ${t.role}`, L, W, 4); y += 2;

          (t.alternatives || []).forEach(a => {
            guard(20);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text(`  • ${a.name}`, L, y); y += lh;
            doc.setFont('helvetica', 'normal');
            wrap(a.description, L, W, 8);
            doc.setFont('helvetica', 'italic');
            wrap(`Trade-off: ${a.keyDifference}`, L, W, 8);
            doc.setFont('helvetica', 'normal');
            if (a.websiteUrl) wrap(`Website: ${a.websiteUrl}`, L, W, 8);
            if (a.sourceUrl) wrap(`Source: ${a.sourceUrl}`, L, W, 8);
            y += 2;
          });
          if ((t.alternatives || []).length === 0) {
            doc.setFont('helvetica', 'italic');
            wrap(t.alternativesNote || EMPTY_ALTS, L, W, 4);
          }
          y += 4;
        });

        const suggested = suggestedTools(stackResult);
        if (suggested.length) {
          guard(20);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
          doc.text(SUGGESTED_HEADING, L, y); y += lh + 1;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
          suggested.forEach(t => wrap(`• ${t.name} — ${t.role}`, L, W, 4));
        }
      }

      if (edgeCaseResult && (edgeCaseResult.edgeCases || []).length > 0) {
        doc.addPage(); y = 20;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
        doc.text('Production Edge Cases', L, y); y += 10;

        edgeCaseResult.edgeCases.forEach((ec, i) => {
          guard(24);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
          doc.text(`${i + 1}. ${ec.scenario}`, L, y); y += lh + 1;
          doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
          wrap(`Category: ${ec.category}  |  Likelihood: ${ec.likelihood}`, L, W, 4); y += 1;
          doc.setFont('helvetica', 'normal');
          wrap(`Impact: ${ec.impact}`, L, W, 4);
          wrap(`Recommendation: ${ec.recommendation}`, L, W, 4);
          y += 3;
        });
      }

      doc.save(`${slug()}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('PDF export failed. Try Markdown or TXT instead.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const hasOutput = result !== null || stackResult !== null || edgeCaseResult !== null
    || scopeError !== null || stackError !== null || edgeCaseError !== null;
  // All three sections read the same document, so one note covers them all.
  const inputNote = result?.inputNote || stackResult?.inputNote || edgeCaseResult?.inputNote;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Target size={16} className="text-[#0070FF] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Project Intelligence</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Scope &amp; Stack <span className="text-[#0070FF]">Analyzer</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">
          Paste or upload a 3DX or Node-by-Node document to generate a structured scope definition and tool stack alternatives in one pass.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Input panel ── */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white p-6 rounded-2xl border ${
            isDragging
              ? 'border-[#0070FF] bg-[#0070FF]/5 shadow-2xl ring-2 ring-dashed ring-[#0070FF]'
              : 'border-[#0070FF]/25 shadow-xl'
          } transition-all duration-300 bg-gradient-to-br from-white to-blue-50/10 space-y-6 relative`}
        >
          <div className="flex justify-between items-center px-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Project Document
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[9px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
            >
              <Upload size={10} /> Import File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json,.txt,.md,.pdf,.csv,.docx"
              onChange={handleFileChange}
            />
          </div>

          {isDragging && (
            <div className="absolute inset-x-0 top-14 bottom-0 bg-white/95 rounded-b-2xl flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
              <FileText className="text-[#0070FF] animate-bounce" size={32} />
              <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">
                Drop your document here
              </span>
            </div>
          )}

          <textarea
            className="w-full h-56 bg-white border border-zinc-200 rounded-xl p-4 text-black text-sm focus:border-[#0070FF] outline-none resize-none transition-all placeholder:text-zinc-400"
            placeholder="Paste your 3DX document, Node-by-Node build spec, or project brief here — or drag and drop a file..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
            className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 font-display"
          >
            {loading
              ? <><Loader2 className="animate-spin" size={16} /> Analyzing…</>
              : 'Analyze Scope & Stack'
            }
          </button>
        </div>

        {/* ── Output panel ── */}
        <div>
          {hasOutput ? (
            <div className="bg-white rounded-2xl border border-[#0070FF]/25 shadow-xl animate-in zoom-in-95 duration-500 bg-gradient-to-br from-white to-blue-50/10 overflow-hidden">

              {/* Tab bar + exports */}
              <div className="flex items-center justify-between px-6 pt-5 pb-0 gap-3 flex-wrap border-b border-zinc-100">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('scope')}
                    className={`px-4 py-2 rounded-t-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'scope'
                        ? 'bg-[#0070FF] text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    <ClipboardList size={11} /> Project Scope
                    {scopeError && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="This section failed" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('stack')}
                    className={`px-4 py-2 rounded-t-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'stack'
                        ? 'bg-[#0070FF] text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    <Layers size={11} /> Stack Alternatives
                    {stackError && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="This section failed" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('edgecases')}
                    className={`px-4 py-2 rounded-t-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'edgecases'
                        ? 'bg-[#0070FF] text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    <AlertTriangle size={11} /> Edge Cases
                    {edgeCaseError && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="This section failed" />}
                  </button>
                </div>
                <div className="flex gap-2 pb-2">
                  <button type="button" onClick={exportMarkdown} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-zinc-200 rounded-lg hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex items-center gap-1">
                    <Download size={9} /> MD
                  </button>
                  <button type="button" onClick={exportTxt} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-zinc-200 rounded-lg hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex items-center gap-1">
                    <Download size={9} /> TXT
                  </button>
                  <button type="button" onClick={exportPdf} className="text-[9px] font-black uppercase tracking-wider px-2 py-1 border border-zinc-200 rounded-lg hover:border-[#0070FF] hover:text-[#0070FF] transition-colors flex items-center gap-1">
                    <Download size={9} /> PDF
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-7 max-h-[72vh] overflow-y-auto">

                <InputNotice note={inputNote} />

                {/* ── Project Scope tab ── */}
                {activeTab === 'scope' && scopeError && (
                  <SectionError message={scopeError} retrying={retrying.scope} onRetry={() => retrySection('scope')} />
                )}
                {activeTab === 'scope' && result && (
                  <>
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 leading-tight">
                      {result.projectName}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2 mb-1">
                          <ClipboardList size={13} className="text-[#0070FF]" /> Project Results &amp; Deliverables
                        </h4>
                        <p className="text-xs text-zinc-500 italic">{result.summary}</p>
                      </div>
                      {(result.deliverables || []).length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No deliverables identified.</p>
                      ) : (
                        <div className="space-y-3">
                          {(result.deliverables || []).map((d, i) => (
                            <div key={i} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/40">
                              <p className="text-xs font-black text-zinc-900 mb-1.5">{i + 1}.&nbsp;{d.name}</p>
                              <p className="text-xs text-zinc-600 leading-relaxed">{d.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle size={13} className="text-emerald-500" /> Project Scope
                      </h4>
                      <p className="text-xs text-zinc-500">This project is purely about:</p>
                      {(result.inScope || []).length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No scope items identified.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(result.inScope || []).map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 font-semibold">
                              <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>{s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                        <XCircle size={13} className="text-red-400" /> Out of Scope
                      </h4>
                      {(result.outOfScope || []).length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No exclusions identified.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(result.outOfScope || []).map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 font-semibold">
                              <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {(result.pendingItems || []).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                          <Clock size={13} className="text-amber-500" /> Pending / TBD
                        </h4>
                        <div className="space-y-2">
                          {(result.pendingItems || []).map((p, i) => (
                            <div key={i} className="p-4 rounded-xl border border-amber-100 bg-amber-50/20 border-l-2 border-l-amber-400">
                              <p className="text-xs font-black text-zinc-800 mb-0.5">{p.title}</p>
                              <p className="text-xs text-zinc-600 leading-relaxed">{p.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Stack Alternatives tab ── */}
                {activeTab === 'stack' && stackError && (
                  <SectionError message={stackError} retrying={retrying.stack} onRetry={() => retrySection('stack')} />
                )}
                {activeTab === 'stack' && !stackError && (
                  <>
                    {namedTools(stackResult).length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No tools are named in the document.</p>
                    ) : (
                      <div className="space-y-6">
                        {namedTools(stackResult).map((tool, i, named) => (
                          <div key={i} className="space-y-3">
                            <div className="flex items-start gap-3 flex-wrap">
                              <span className="text-sm font-black text-zinc-900">{tool.name}</span>
                              {/* Roles are often a full sentence, so this is a wrapped text box rather than a
                                  one-line uppercase pill (which overlapped its lines when it wrapped). */}
                              <p className="w-full text-xs font-semibold leading-relaxed px-3 py-2 bg-[#0070FF]/10 text-[#0058CC] rounded-xl border border-[#0070FF]/20">
                                {tool.role}
                              </p>
                            </div>

                            {(tool.alternatives || []).length === 0 ? (
                              <p className="text-xs text-zinc-400 italic pl-1">{tool.alternativesNote || EMPTY_ALTS}</p>
                            ) : (
                              <div className="space-y-2 pl-1">
                                {(tool.alternatives || []).map((alt, j) => (
                                  <div key={j} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <ArrowRight size={11} className="text-[#0070FF] flex-shrink-0" />
                                      <span className="text-xs font-black text-zinc-900">{alt.name}</span>
                                      {alt.websiteUrl && (
                                        <a href={alt.websiteUrl} target="_blank" rel="noopener noreferrer"
                                          className="text-[11px] font-semibold text-[#0070FF] hover:underline">
                                          {hostOf(alt.websiteUrl)} ↗
                                        </a>
                                      )}
                                    </div>
                                    <p className="text-xs text-zinc-600 leading-relaxed pl-4">{alt.description}</p>
                                    <p className="text-xs text-zinc-700 font-semibold pl-4 italic">
                                      <span className="font-black not-italic text-zinc-800">Trade-off:</span> {alt.keyDifference}
                                    </p>
                                    {alt.sourceUrl && (
                                      <p className="text-[11px] text-zinc-500 pl-4">
                                        Recommended in:{' '}
                                        <a href={alt.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#0070FF] hover:underline break-all">
                                          {alt.sourceTitle || alt.sourceUrl}
                                        </a>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {i < named.length - 1 && (
                              <div className="border-b border-zinc-100" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {suggestedTools(stackResult).length > 0 && (
                      <div className="mt-8 p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3">
                        <div>
                          <p className="text-xs font-black text-zinc-700">{SUGGESTED_HEADING}</p>
                          <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                            The AI thinks the project may need these, but the document never names them. Treat them as ideas to confirm, not decisions.
                          </p>
                        </div>
                        <ul className="space-y-2">
                          {suggestedTools(stackResult).map((tool, i) => (
                            <li key={i} className="text-xs text-zinc-600 leading-relaxed">
                              <span className="font-black text-zinc-700">{tool.name}</span> — {tool.role}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* ── Edge Cases tab ── */}
                {activeTab === 'edgecases' && edgeCaseError && (
                  <SectionError message={edgeCaseError} retrying={retrying.edgecases} onRetry={() => retrySection('edgecases')} />
                )}
                {activeTab === 'edgecases' && !edgeCaseError && (
                  <>
                    {!edgeCaseResult || (edgeCaseResult.edgeCases || []).length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No edge cases identified in the document.</p>
                    ) : (
                      <div className="space-y-3">
                        {(edgeCaseResult.edgeCases || []).map((ec, i) => (
                          <div key={i} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/40 space-y-2">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <p className="text-xs font-black text-zinc-900">{i + 1}.&nbsp;{ec.scenario}</p>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${LIKELIHOOD_CLASSES[ec.likelihood] || LIKELIHOOD_CLASSES.Low}`}>
                                {ec.likelihood}
                              </span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#0070FF]/10 text-[#0070FF] rounded-full border border-[#0070FF]/20 inline-block">
                              {ec.category}
                            </span>
                            <p className="text-xs text-zinc-600 leading-relaxed"><span className="font-bold text-zinc-700">Impact:</span> {ec.impact}</p>
                            <p className="text-xs text-zinc-600 leading-relaxed"><span className="font-bold text-zinc-700">Recommendation:</span> {ec.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-blue-50/5 min-h-[400px]">
              <Target size={48} className="mb-4 opacity-30 text-[#0070FF] animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-800">Scope &amp; Stack Engine Ready</p>
              <p className="text-xs text-zinc-400 mt-2">Paste or upload a document to begin</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ScopeAnalyzer;
