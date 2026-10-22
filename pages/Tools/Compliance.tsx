
import React, { useState, useEffect, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { readDocumentAsText } from '../../utils/readDocument';
import { checkCompliance } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle, Zap, Upload, FileText } from 'lucide-react';

const Compliance: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [workflow, setWorkflow] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!workflow) throw new Error('NO_PROCESS: Process description required for compliance scan.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_SCAN: Completed compliance audit required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAction();
      }
    });
  }, [workflow, result, onAction, registerActions]);

  const handleCheck = async () => {
    if (!workflow) return;
    setError(null);
    setLoading(true);
    try {
      const data = await checkCompliance(workflow);
      setResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The compliance scan could not be completed. Please try again.'));
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
      .then(setWorkflow)
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Policy Scan Engine</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Compliance <span className="text-[#0070FF]">Checker</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Scan for GDPR, HIPAA, and SOC2 risks in your automated data flows and logic branches.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white p-6 rounded-2xl border ${isDragging ? 'border-[#0070FF] bg-[#0070FF]/5 shadow-2xl ring-2 ring-dashed ring-[#0070FF]' : 'border-[#0070FF]/25 shadow-xl'} transition-all duration-300 bg-gradient-to-br from-white to-blue-50/10 space-y-6 relative`}
        >
          <div className="flex justify-between items-center px-1">
            <label className="block text-[10px] font-bold text-zinc-650 uppercase tracking-widest">Process Description / Policy Space</label>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[9px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
            >
              <Upload size={10} /> Import Process File
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json,.txt,.csv,.log,.js,.ts,.py,.md,.docx,.pdf" 
              onChange={handleFileChange} 
            />
          </div>

          {isDragging && (
            <div className="absolute inset-x-0 top-14 bottom-0 bg-white/95 rounded-b-2xl flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
              <FileText className="text-[#0070FF] animate-bounce" size={32} />
              <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop process specs or text files here</span>
            </div>
          )}

          <textarea 
            className="w-full h-48 bg-white border border-zinc-200 rounded-xl p-4 text-black text-sm focus:border-[#0070FF] outline-none resize-none transition-all placeholder:text-zinc-400"
            placeholder="Describe how data moves, where it's stored, and who has access, or drag and drop your workflow document here..."
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
          />

          <button 
            onClick={handleCheck}
            disabled={loading || !workflow}
            className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 font-display"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Execute Compliance Scan'}
          </button>
          <ErrorNotice message={error} onClose={() => setError(null)} />
        </div>

        <div>
          {result ? (
            <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-6 animate-in zoom-in-95 duration-500 bg-gradient-to-br from-white to-blue-50/10">
              <div className="flex items-center justify-between border-b border-[#0070FF]/15 pb-4">
                <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900">Audit Status</h3>
                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg ${
                  result.complianceLevel.toLowerCase().includes('high') || 
                  result.complianceLevel.toLowerCase().includes('pass') || 
                  result.complianceLevel.toLowerCase().includes('safe') || 
                  result.complianceLevel.toLowerCase().includes('compliant')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {result.complianceLevel}
                </span>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-red-650 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" /> Potential Risks
                </h4>
                <ul className="space-y-2">
                  {result.risks.map((risk: string, i: number) => (
                    <li key={i} className="text-xs text-zinc-800 bg-red-50/20 p-4 rounded-xl border border-red-100 font-semibold leading-relaxed italic">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-emerald-650 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" /> Remediation Steps
                </h4>
                <div className="space-y-2">
                  {result.remediationSteps.map((step: string, i: number) => (
                    <div key={i} className="text-xs text-zinc-700 pl-4 border-l-2 border-emerald-500/30 py-3 bg-emerald-50/20 rounded-r-xl border-t border-b border-r border-emerald-100/40 font-semibold leading-relaxed">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-650 p-8 text-center bg-blue-50/5 min-h-[400px]">
              <ShieldCheck size={48} className="mb-4 opacity-30 text-[#0070FF] animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-800">System Ready</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Compliance;
