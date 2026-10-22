
import React, { useState, useRef, useEffect } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { readDocumentAsText } from '../../utils/readDocument';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { runAudit, reinforcementAuditCycle, generateIntegrationCode } from '../../services/gemini';
import { convertTopologyToN8N } from '../../services/n8nConverter';
import { useProtocol } from '../../context/ProtocolContext';
import { AuditResult } from '../../types';
import { normalizeFindings, MAJOR_PENALTY, MINOR_PENALTY } from '../../utils/auditScore';
import AuditFindingsList from '../../components/AuditFindingsList';
import { 
  Loader2, 
  AlertCircle, 
  BarChart3, 
  Upload, 
  X,
  FileCode,
  CornerDownLeft,
  Copy, 
  Check,
  Download,
  Lightbulb,
  Zap,
  Braces,
  ChevronDown,
  RefreshCw,
  Target,
  Terminal,
  Layers,
  ArrowRight,
  Share2
} from 'lucide-react';

const SCENARIOS = [
  { id: 'lead-gen', name: 'Lead Generation', icon: <ArrowRight size={14} /> },
  { id: 'data-sync', name: 'SaaS Data Sync', icon: <Layers size={14} /> },
  { id: 'ecommerce', name: 'E-commerce Logic', icon: <ArrowRight size={14} /> },
  { id: 'customer-support', name: 'AI Support Bot', icon: <ArrowRight size={14} /> },
  { id: 'custom', name: 'Custom Logic', icon: <Terminal size={14} /> },
];

const Auditor: React.FC<{ onAction: (metrics?: { score?: number; gain?: number }, input?: string, output?: string) => void }> = ({ onAction }) => {
  const [workflow, setWorkflow] = useState('');
  const [scenario, setScenario] = useState('lead-gen');
  const [loading, setLoading] = useState(false);
  const [reinforcing, setReinforcing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPointers, setSelectedPointers] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'txt' | 'md' | 'pdf' | 'docx'>('json');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!workflow) throw new Error('NO_REGISTRY: Workflow topology required for audit.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_AUDIT: Completed audit required for protocol commit.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAction({ score: result.score }, `Scenario: ${scenario}\nWorkflow:\n${workflow}`, JSON.stringify(result, null, 2));
      }
    });
  }, [workflow, result, onAction, registerActions, scenario]);

  const handleAudit = async () => {
    if (!workflow || loading) return;
    setError(null);
    setLoading(true);
    setSelectedPointers([]);
    try {
      const data = await runAudit(workflow, scenario);
      setResult(data);
      localStorage.setItem('onyx_last_audit', JSON.stringify({ ...data, scenario, timestamp: Date.now() }));
      onAction({ score: data.score }, `Scenario: ${scenario}\nWorkflow:\n${workflow}`, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The audit could not be completed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOptimizations = async () => {
    if (!result || selectedPointers.length === 0 || reinforcing) return;
    setError(null);
    setReinforcing(true);
    try {
      const data = await reinforcementAuditCycle(result.correctedTopology, selectedPointers, scenario);
      const updatedResult = {
        ...result,
        correctedTopology: data.updatedTopology,
        score: data.newScore,
        scoreBreakdown: data.scoreBreakdown,
        findings: data.findings?.length ? data.findings : result.findings,
        recommendations: result.recommendations.filter(r => !selectedPointers.includes(r))
      };
      setResult(updatedResult);
      setSelectedPointers([]);
      onAction({ score: data.newScore }, `Optimizations Applied: ${selectedPointers.join(', ')}\nScenario: ${scenario}\nOriginal Topology:\n${workflow}`, JSON.stringify(updatedResult, null, 2));
    } catch (err) {
      console.error("SYNC_FAULT:", err);
      setError(friendlyError(err, 'The selected optimizations could not be applied. Please try again.'));
    } finally {
      setReinforcing(false);
    }
  };

  const togglePointer = (pointer: string) => {
    setSelectedPointers(prev => 
      prev.includes(pointer) ? prev.filter(p => p !== pointer) : [...prev, pointer]
    );
  };

  const formatJson = (jsonStr: string) => {
    try {
      const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return jsonStr;
    }
  };

  const handleDownloadN8N = () => {
    if (!result) return;
    try {
      const topologyObj = JSON.parse(result.correctedTopology);
      const n8nData = convertTopologyToN8N(topologyObj);
      downloadBlob(JSON.stringify(n8nData, null, 2), 'optimized_topology_n8n.json');
    } catch (e) {
      console.error("N8N_CONVERSION_FAULT:", e);
      setError(friendlyError(e, 'The workflow could not be converted to n8n format.'));
    }
  };

  const handleDownloadOutput = async (format: 'json' | 'txt' | 'md' | 'pdf' | 'docx') => {
  if (!result) return;
  const contentStr = typeof result.correctedTopology === 'string' ? result.correctedTopology : JSON.stringify(result.correctedTopology, null, 2);
  const formattedContent = formatJson(contentStr);

  if (format === 'json') {
    downloadBlob(formattedContent, 'optimized_output.json', 'application/json');
  } else if (format === 'txt') {
    downloadBlob(formattedContent, 'optimized_output.txt', 'text/plain');
  } else if (format === 'md') {
    const mdContent = `# Optimized Output\n\n\`\`\`\n${formattedContent}\n\`\`\``;
    downloadBlob(mdContent, 'optimized_output.md', 'text/markdown');
  } else if (format === 'pdf') {
    try {
      const doc = new jsPDF();
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      
      const splitText = doc.splitTextToSize(formattedContent, 180);
      let y = 10;
      for (let i = 0; i < splitText.length; i++) {
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
        doc.text(splitText[i], 10, y);
        y += 5;
      }
      doc.save('optimized_output.pdf');
    } catch (e) {
      console.error("PDF generation failed:", e);
      setError(friendlyError(e, 'The PDF could not be created. Try another format such as JSON or Markdown.'));
    }
  } else if (format === 'docx') {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: formattedContent.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({ text: line, font: "Courier New", size: 20 })
                ]
              })
            ),
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'optimized_output.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("DOCX generation failed:", e);
      setError(friendlyError(e, 'The Word document could not be created. Try another format such as JSON or Markdown.'));
    }
  }
};

const downloadBlob = (content: string, filename: string, type: string = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    readDocumentAsText(file)
      .then(setWorkflow)
      .catch(err => { console.error('File read failed:', err); setError(friendlyError(err, 'The file could not be read. Try pasting the text instead.')); });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-8">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Efficiency Audit Core</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Efficiency <span className="text-[#0070FF]">Auditor</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Neural logic scan and iterative structural optimization for high-precision workflows.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-xl relative overflow-hidden group">
            <div className="mb-6 space-y-3">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] px-1 block">Vector Strategy</label>
              <div className="relative">
                <select 
                  className="w-full glass border border-black/10 rounded-xl p-4 text-black font-bold text-sm uppercase tracking-widest focus:border-[#0070FF]/50 outline-none appearance-none cursor-pointer bg-black/5"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  {SCENARIOS.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white text-black">{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0070FF] pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Registry Input</label>
                <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] hover:text-black bg-[#0070FF]/5 px-3 py-1 rounded-lg border border-[#0070FF]/20">
                  Sync File
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </div>
              <textarea 
                className="w-full h-48 bg-white border border-black/5 rounded-xl p-6 text-sm focus:outline-none focus:border-[#0070FF] transition-all resize-none font-mono leading-relaxed custom-scrollbar"
                placeholder="// Paste system configuration, workflow JSON, or code to audit..."
                value={workflow}
                onChange={(e) => { setWorkflow(e.target.value); if (fileName) setFileName(null); }}
              />
            </div>

            <button 
              onClick={handleAudit}
              disabled={loading || !workflow}
              className="mt-6 w-full neon-bg text-black font-black py-5 rounded-xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all text-sm uppercase tracking-[0.3em] shadow-lg font-display"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'INITIATE AUDIT'}
            </button>
            <ErrorNotice message={error} onClose={() => setError(null)} />
          </div>

          {result && (
            <div className="bg-white p-6 rounded-2xl border border-blue-500/20 shadow-xl space-y-6 animate-in slide-in-from-left-2 duration-700">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-black uppercase tracking-tight text-black flex items-center gap-3"><Lightbulb size={20} className="text-blue-500" /> Optimization Pointers</h4>
                {selectedPointers.length > 0 && (
                  <button onClick={handleSyncOptimizations} disabled={reinforcing} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    {reinforcing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} SYNC
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {result.recommendations.map((p, i) => {
                  const isSelected = selectedPointers.includes(p);
                  return (
                    <div key={i} onClick={() => togglePointer(p)} className={`flex gap-3 items-center p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-500/10 border-blue-500/40' : 'bg-black/5 border-black/5 hover:border-blue-500/40'}`}>
                       <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-800'}`}>
                         {isSelected && <Check size={10} className="text-black font-black" />}
                       </div>
                       <p className={`text-[13px] font-bold leading-tight ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>{p}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[1000px] pr-2 custom-scrollbar">
          {result ? (
            <div className="bg-white p-8 rounded-2xl border border-[#0070FF]/20 shadow-xl space-y-8 animate-in zoom-in-95 duration-700">
              <div className="flex items-center justify-between border-b border-black/5 pb-6">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Diagnostics</h3>
                  <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] mt-1">{scenario.replace(/-/g, ' ')} vector</p>
                </div>
                <div className="bg-white border border-black/10 px-4 py-2 rounded-xl flex items-baseline gap-1.5 shadow-inner">
                   <span className="text-3xl font-black text-black">{result.score}</span>
                   <span className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest">/ 100</span>
                </div>
              </div>
              <div className="-mt-4 text-xs text-zinc-600 bg-zinc-50 border border-black/5 rounded-xl p-3">
                <span className="font-semibold text-zinc-800">How this score is worked out:</span> start at 100, take off {MAJOR_PENALTY} for each major problem (can break things, lose data or expose secrets) and {MINOR_PENALTY} for each minor one (slow, wasteful or messy).
                {result.scoreBreakdown && <span className="block mt-1 font-mono text-zinc-800">{result.scoreBreakdown}</span>}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h4 className="flex items-center gap-2 text-[#0070FF] font-black text-[10px] uppercase tracking-[0.4em]"><Zap size={18} className="neon-accent animate-pulse" /> Optimized Output</h4>
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-transparent border border-black/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 py-1.5 outline-none cursor-pointer focus:border-[#0070FF]/50"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                    >
                      <option value="json">JSON</option>
                      <option value="txt">TXT</option>
                      <option value="md">MD</option>
                      <option value="pdf">PDF</option>
                      <option value="docx">DOCX</option>
                    </select>
                    <button onClick={handleDownloadN8N} title="Export to n8n" className="p-2 rounded-lg glass border border-black/10 text-[#0070FF] hover:text-black"><Share2 size={16} /></button>
                    <button onClick={() => handleDownloadOutput(exportFormat)} className="p-2 rounded-lg glass border border-black/10 text-zinc-500 hover:text-black"><Download size={16} /></button>
                    <button onClick={() => copyToClipboard(formatJson(result.correctedTopology))} className={`p-2 rounded-lg border ${copied ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'glass border-black/10 text-zinc-500 hover:text-black'}`}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
                  </div>
                </div>
                <div className="bg-blue-50/50 border border-[#0070FF]/25 p-5 rounded-xl font-mono text-[11px] text-[#0050C0] leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner group">
                   <pre className="whitespace-pre-wrap">{formatJson(result.correctedTopology)}</pre>
                </div>
              </div>

              <AuditFindingsList findings={normalizeFindings(result.findings)} />

              <div className="pt-6 border-t border-black/5">
                <button onClick={() => setResult(null)} className="w-full py-4 glass border border-black/10 text-zinc-600 rounded-xl hover:text-black text-[10px] font-black uppercase tracking-[0.4em] transition-all">RESET CYCLE</button>
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-black/5 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-800 p-12 text-center min-h-[500px] glass">
              <BarChart3 size={56} className="opacity-10 text-[#0070FF] mb-6" />
              <p className="text-[14px] uppercase tracking-[0.6em] font-black text-zinc-700">Neural Buffer IDLE</p>
              <p className="text-sm max-w-sm opacity-40 uppercase tracking-widest mt-4">Awaiting structural logic for high-precision auditing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auditor;
