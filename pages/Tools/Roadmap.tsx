
import React, { useState, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { readDocumentAsText } from '../../utils/readDocument';
import { generateRoadmap } from '../../services/gemini';
import { Loader2, Map, Milestone, Calendar, Zap, Upload, FileText, Link, Cog, Database, Cpu, Layers } from 'lucide-react';

const Roadmap: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!goal) return;
    setError(null);
    setLoading(true);
    try {
      const data = await generateRoadmap(goal);
      setResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The roadmap could not be generated. Please try again.'));
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
      .then(setGoal)
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
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Strategic Blueprint Gen</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Integration <span className="text-[#0070FF]">Roadmap</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Step-by-step technical blueprints for complex, multi-stack automation deployments.</p>
      </header>

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white p-6 rounded-2xl border ${isDragging ? 'border-[#0070FF] bg-[#0070FF]/5 shadow-2xl ring-2 ring-dashed ring-[#0070FF]' : 'border-[#0070FF]/25 shadow-xl'} transition-all duration-300 bg-gradient-to-br from-white to-blue-50/10 mb-8 relative`}
      >
        <div className="flex justify-between items-center mb-3 px-1">
          <label className="block text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em]">Core Integration Goal</label>
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

        {isDragging && (
          <div className="absolute inset-x-0 top-12 bottom-0 bg-white/95 rounded-b-2xl flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
            <FileText className="text-[#0070FF] animate-bounce" size={32} />
            <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop integration specs or files here</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <textarea 
            className="flex-1 bg-white border border-zinc-200 rounded-xl p-4 text-black text-sm focus:outline-none focus:border-[#0070FF] transition-all placeholder:text-zinc-400 min-h-[48px] h-20 resize-y"
            placeholder="e.g. Syncing Salesforce with Snowflake via custom n8n instance... or drag and drop your project description document here"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <button 
            onClick={handleGenerate}
            disabled={loading || !goal}
            className="px-6 bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 h-fit md:self-end font-display"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Synthesize Roadmap'}
          </button>
        </div>
        {error && <div className="mt-3"><ErrorNotice message={error} onClose={() => setError(null)} /></div>}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900">Node Connection Map</h3>
               <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase font-bold">
                 <Calendar size={12} className="text-[#0070FF]" /> Est. {result.estimatedTimeline}
               </div>
            </div>
            
            <div className="space-y-6 relative pl-6 border-l-2 border-[#0070FF]/25">
               {result.nodes?.map((node: any, i: number) => (
                <div key={i} className="relative group">
                  <div className="absolute -left-[34px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0070FF] bg-white flex items-center justify-center text-[8px] font-bold text-[#0070FF] shadow-[0_0_8px_rgba(0,112,255,0.2)]">
                    {i + 1}
                  </div>
                  
                  <div className="bg-white border border-[#0070FF]/15 hover:border-[#0070FF]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-wide">
                        {node.nodeName}
                      </h4>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 bg-blue-50 text-[#0070FF] rounded-full uppercase tracking-wider border border-blue-100">
                        {node.nodeType || "Connector"}
                      </span>
                    </div>

                    <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 p-3.5 rounded-xl flex items-start gap-2.5">
                      <Link size={14} className="text-[#0070FF] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest block">Connect via Tool / Technology</span>
                        <p className="text-[12px] font-extrabold text-zinc-900 mt-0.5 select-all">
                          {node.connectedTool}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Integrator Purpose</span>
                      <p className="text-xs text-zinc-700 leading-relaxed font-semibold">
                        {node.purpose}
                      </p>
                    </div>

                    {node.configuration && (
                      <div className="bg-zinc-50 border border-zinc-250 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                          <Cog size={11} className="text-zinc-400" /> Connection Parameters
                        </span>
                        <p className="text-[11px] font-mono text-zinc-650 leading-relaxed whitespace-pre-line">
                          {node.configuration}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl h-fit sticky top-6 bg-gradient-to-br from-white to-blue-50/10 space-y-4">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
              <Milestone size={16} className="text-[#0070FF]" /> Strategic Blueprint Overview
            </h4>
            <div className="space-y-4">
               <div className="p-4 rounded-xl bg-blue-50/30 border border-[#0070FF]/15">
                 <p className="text-[12px] text-zinc-700 leading-relaxed italic font-semibold">
                   "{result.summary || "This dynamic blueprint maps connection protocols and parameters. Set up each identified connector with credentials specified in parameters."}"
                 </p>
               </div>
               <button 
                 onClick={() => {
                   const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = 'integration-roadmap.json';
                   a.click();
                   URL.revokeObjectURL(url);
                 }}
                 className="w-full py-4 bg-[#0070FF] hover:bg-[#005ACC] text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg"
               >
                 Export Protocol Blueprint
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmap;
