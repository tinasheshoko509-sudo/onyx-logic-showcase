
import React, { useState, useEffect, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { readDocumentAsText } from '../../utils/readDocument';
import { scanPrivacy } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { Loader2, Lock, ShieldAlert, Wrench, Zap, Upload, FileText } from 'lucide-react';

const PrivacyScanner: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [dataStr, setDataStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!dataStr) throw new Error('NO_PAYLOAD: Data structure required for privacy scan.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_AUDIT: Completed privacy audit required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAction();
      }
    });
  }, [dataStr, result, onAction, registerActions]);

  const handleScan = async () => {
    if (!dataStr) return;
    setError(null);
    setLoading(true);
    try {
      const data = await scanPrivacy(dataStr);
      setResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The privacy scan could not be completed. Please try again.'));
    } finally {
      setLoading(false);
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
      .then(setDataStr)
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

  // Older responses returned leaks as plain strings; normalise to { issue, fix }.
  type Severity = 'high' | 'medium' | 'low';
  const leaks: { issue: string; fix?: string; severity: Severity }[] = (result?.leaks ?? []).map((l: any) => {
    if (typeof l === 'string') return { issue: l, severity: 'low' as Severity };
    const s = String(l?.severity ?? '').toLowerCase();
    return { issue: l?.issue ?? '', fix: l?.fix, severity: (['high', 'medium', 'low'].includes(s) ? s : 'low') as Severity };
  });

  // Overall rating = the worst leak found, so the same payload always gets the same rating.
  const rating: Severity | 'none' = leaks.length === 0 ? 'none'
    : leaks.some(l => l.severity === 'high') ? 'high'
    : leaks.some(l => l.severity === 'medium') ? 'medium' : 'low';
  const worst = leaks.find(l => l.severity === rating);
  const ratingInfo = {
    none:   { label: 'No Risk Found', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', why: 'No personal data or secrets were detected.' },
    low:    { label: 'Risk: Low',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', why: 'Only internal IDs or mildly sensitive data were found.' },
    medium: { label: 'Risk: Medium',  cls: 'bg-amber-50 text-amber-700 border-amber-200',       why: 'Personal contact details are exposed' },
    high:   { label: 'Risk: High',    cls: 'bg-red-50 text-red-700 border-red-200',             why: 'Secrets or financial/ID data are exposed' },
  }[rating];
  const ratingReason = worst && rating !== 'low' ? `${ratingInfo.why} (e.g. ${worst.issue}).` : ratingInfo.why;
  const severityDot: Record<Severity, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Payload Data Security</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Privacy <span className="text-[#0070FF]">Scanner</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Detect and sanitize PII or sensitive keys in automation payloads and JSON structures.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl transition-all duration-500 bg-gradient-to-br from-white to-blue-50/10 space-y-6">
          <div className="flex justify-between items-center px-1">
            <label className="block text-[10px] font-bold text-zinc-650 uppercase tracking-widest">Payload Data (JSON / Text)</label>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[9px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
            >
              <Upload size={10} /> Import File
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json,.txt,.csv,.log,.docx,.pdf" 
              onChange={handleFileChange} 
            />
          </div>

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-xl transition-all ${isDragging ? 'ring-2 ring-dashed ring-[#0070FF] bg-[#0070FF]/5' : ''}`}
          >
            <textarea 
              className="w-full h-64 bg-white border border-zinc-200 rounded-xl p-4 text-black font-mono text-xs focus:border-[#0070FF] outline-none resize-none transition-all placeholder:text-zinc-400"
              placeholder='{ "user": "John Doe", "email": "john@example.com", "apiKey": "sk-..." } or drag and drop your .json/.txt/.log file here'
              value={dataStr}
              onChange={(e) => setDataStr(e.target.value)}
            />
            {isDragging && (
              <div className="absolute inset-0 bg-white/90 rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none">
                <FileText className="text-[#0070FF] animate-bounce" size={32} />
                <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop payload file here</span>
              </div>
            )}
          </div>

          <button 
            onClick={handleScan}
            disabled={loading || !dataStr}
            className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 font-display"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Run Privacy Audit'}
          </button>
          <ErrorNotice message={error} onClose={() => setError(null)} />
        </div>

        <div>
          {result ? (
            <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-6 animate-in zoom-in-95 duration-500 bg-gradient-to-br from-white to-blue-50/10 text-zinc-900">
              <div className="flex justify-between items-center border-b border-[#0070FF]/15 pb-4">
                <h3 className="text-lg font-black uppercase tracking-tight">Audit Results</h3>
                <div className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ratingInfo.cls}`}>
                   {ratingInfo.label}
                </div>
              </div>
              <p className="text-sm text-zinc-700 -mt-2">
                <span className="font-semibold">Why:</span> {ratingReason}
                <span className="block text-xs text-zinc-500 mt-1">Rating is set by the most serious leak found: High = secrets, keys, card/bank or ID numbers · Medium = names, emails, phones, addresses · Low = internal IDs.</span>
              </p>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-red-650 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" /> Detected Leaks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {leaks.length > 0 ? (
                    leaks.map((leak, i) => (
                      <span key={i} className="px-3 py-1 bg-red-50 border border-red-150 rounded-lg text-[10px] text-red-700 font-mono font-bold uppercase tracking-tight">
                         <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${severityDot[leak.severity]}`} />{i + 1}. {leak.issue} · {leak.severity}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 italic">No leaked PII or sensitive keys flagged.</span>
                  )}
                </div>
              </div>

              {leaks.some(l => l.fix) && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={16} className="text-[#0070FF]" /> How to Fix
                  </h4>
                  <ol className="space-y-2">
                    {leaks.map((leak, i) => leak.fix && (
                      <li key={i} className="flex gap-3 bg-blue-50/40 border border-[#0070FF]/15 p-3 rounded-xl text-sm text-zinc-800 leading-relaxed">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#0070FF] text-white text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                        <span><span className="font-semibold">{leak.issue}:</span> {leak.fix}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-650 p-8 text-center bg-blue-50/5 min-h-[400px]">
              <Lock size={48} className="mb-4 opacity-30 text-[#0070FF] animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-800">Scanner Standby</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyScanner;
