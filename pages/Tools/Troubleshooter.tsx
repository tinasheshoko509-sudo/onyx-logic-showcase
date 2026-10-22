
import React, { useState, useEffect, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { readDocumentAsText } from '../../utils/readDocument';
import { troubleshootLogic } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { Loader2, Bug, Lightbulb, CheckSquare, Zap, Upload, FileText } from 'lucide-react';

const Troubleshooter: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!problem) throw new Error('NO_DELTA: Failed logic branch required for resolution.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_RESOLUTION: Completed logic fix required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAction();
      }
    });
  }, [problem, result, onAction, registerActions]);

  const handleTroubleshoot = async () => {
    if (!problem) return;
    setError(null);
    setLoading(true);
    try {
      const data = await troubleshootLogic(problem);
      setResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The problem could not be analysed. Please try again.'));
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
      .then(setProblem)
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
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Logic Debug Node</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Logic <span className="text-[#0070FF]">Troubleshooter</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Identify and resolve structural failures and logical bifurcations in complex automation chains.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 space-y-6 shadow-xl bg-gradient-to-br from-white to-blue-50/10">
          <div className="flex justify-between items-center px-1">
            <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Failed Logic Branch / Error Log</label>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[9px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded animate-fade-in"
            >
              <Upload size={10} /> Import File
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json,.txt,.csv,.log,.js,.ts,.py,.docx,.pdf" 
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
              className="w-full h-48 bg-white border border-zinc-200 rounded-xl p-4 text-black font-mono text-xs focus:border-[#0070FF] outline-none resize-none transition-all placeholder:text-zinc-400"
              placeholder="e.g. Iteration fails on the 5th item when the array contains a null value... or drag and drop your .txt/.log/.json files here"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
            {isDragging && (
              <div className="absolute inset-0 bg-white/90 rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none">
                <FileText className="text-[#0070FF] animate-bounce" size={32} />
                <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop error logs here</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleTroubleshoot}
            disabled={loading || !problem}
            className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 font-display"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Resolve Logic Delta'}
          </button>
          <ErrorNotice message={error} onClose={() => setError(null)} />
        </div>

        <div>
          {result ? (
            <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-6 animate-in zoom-in-95 duration-500 bg-gradient-to-br from-white to-blue-50/10">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-red-650 uppercase tracking-widest flex items-center gap-2">
                  <Bug size={16} className="text-red-500" /> Root Cause Detected
                </h4>
                <p className="text-[13px] text-zinc-850 bg-red-50/20 p-4 rounded-xl border border-red-100 font-semibold leading-relaxed italic">"{result.rootCause}"</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest flex items-center gap-2">
                  <Lightbulb size={16} className="text-blue-550" /> Logic Fix Directive
                </h4>
                <div className="bg-zinc-50 border border-[#0070FF]/15 p-5 rounded-xl font-mono text-[11px] text-zinc-800 leading-relaxed shadow-inner">
                  {result.logicFix}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                  <CheckSquare size={16} className="text-emerald-500" /> Prevention Protocol
                </h4>
                <p className="text-[11px] text-emerald-800 italic bg-emerald-50/30 p-4 rounded-xl border border-emerald-100 font-bold uppercase tracking-tight">{result.preventionTip}</p>
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-650 p-12 text-center bg-blue-50/5 min-h-[400px]">
              <Bug size={48} className="mb-4 opacity-30 text-[#0070FF] animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-800">Debugger IDLE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Troubleshooter;
