
import React, { useState, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { readDocumentAsText } from '../../utils/readDocument';
import { compareTools, suggestIdealTool } from '../../services/gemini';
import { Loader2, Zap, Scale, CornerDownLeft, Upload, FileText, ArrowRightLeft, ShieldCheck, Check, Sparkles, Send, Cpu } from 'lucide-react';

const Comparison: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [toolA, setToolA] = useState('');
  const [toolB, setToolB] = useState('');
  const [useCase, setUseCase] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recommendation engine state variables
  const [searchGoal, setSearchGoal] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestionResult, setSuggestionResult] = useState<any>(null);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [suggestError, setSuggestError] = useState('');

  const handleSuggest = async () => {
    if (!searchGoal.trim() || suggestLoading) return;
    setSuggestLoading(true);
    setSuggestError('');
    setSuggestionResult(null);
    try {
      const data = await suggestIdealTool(searchGoal);
      setSuggestionResult(data);
      setSelectedMatchIndex(0);
      if (onAction) onAction();
    } catch (err: any) {
      console.error(err);
      setSuggestError(err?.message || 'Could not compute dynamic tool recommendation. Please inspect system connection tokens or describe your goal with more details.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!toolA || !toolB || loading) return;
    setError(null);
    setLoading(true);
    try {
      const data = await compareTools(toolA, toolB, useCase);
      setResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The comparison could not be run. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCompare();
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
      .then(setUseCase)
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Market Intelligence Core</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Tool <span className="text-[#0070FF]">Comparison</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl leading-relaxed">Analyze the structural advantages and logical capabilities of competing automation stacks.</p>
      </header>

      {/* 1. AI Recommendation Engine */}
      <div className="bg-white p-8 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-6 bg-gradient-to-br from-white to-blue-50/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10 opacity-60" />
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-[#0070FF] animate-bounce" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 font-sans">Option I: Automated Tool Finder & Rationale</span>
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight leading-none mb-2 font-sans">
            AI Platform Recommendation
          </h3>
          <p className="text-xs text-zinc-500 font-sans font-semibold leading-relaxed">
            Describe your targeted business workflow, budget bounds, custom rules, or deployment limits below, and Onyx will instantly pinpoint the perfect integration server.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative font-sans">
            <textarea
              className="w-full bg-white border border-zinc-200 rounded-xl p-4 pr-12 text-zinc-900 text-xs font-semibold focus:border-[#0070FF] focus:ring-1 focus:ring-[#0070FF] outline-none h-24 resize-none transition-all placeholder:text-zinc-400 leading-relaxed"
              placeholder="e.g. 'I need a fast, low-code tool that can handle heavy webhooks from Stripe and synchronize them with PostgreSQL with minimal hosting costs.'"
              value={searchGoal}
              onChange={(e) => setSearchGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSuggest();
                }
              }}
            />
            <button
              onClick={handleSuggest}
              disabled={suggestLoading || !searchGoal.trim()}
              className="absolute bottom-3.5 right-3.5 p-2.5 bg-[#0070FF] hover:bg-[#005ACC] text-white rounded-xl disabled:opacity-40 transition-all shadow-md cursor-pointer flex items-center justify-center animate-out"
              title="Get AI Platform Suggestion"
            >
              {suggestLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest font-sans">E.g., Try:</span>
            {[
              "High-volume Shopify orders synced to Postgres",
              "Self-hosted automation server with Zero node-based costs",
              "Connect a dynamic AI model to answer email tickets"
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchGoal(preset);
                  setSuggestionResult(null);
                }}
                className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 hover:border-[#0070FF]/40 hover:bg-[#0070FF]/5 text-zinc-650 hover:text-[#0070FF] text-[10px] font-semibold transition-all rounded-lg cursor-pointer flex items-center gap-1 shadow-sm font-sans"
              >
                <Cpu size={10} />
                {preset}
              </button>
            ))}
          </div>

          {suggestError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-sans font-semibold leading-relaxed">
              {suggestError}
            </div>
          )}

          {/* Render Result Card */}
          {suggestionResult && suggestionResult.recommendations && (
            <div className="border border-blue-200/60 rounded-xl overflow-hidden shadow-sm bg-white animate-in slide-in-from-top-4 duration-300">
              {/* Tabs selector */}
              <div className="grid grid-cols-3 bg-zinc-50 border-b border-zinc-200 divide-x divide-zinc-200/70">
                {suggestionResult.recommendations.map((rec: any, idx: number) => {
                  const isActive = selectedMatchIndex === idx;
                  const rankLabels = ["Primary Choice", "Secondary Fit", "Alternative Option"];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMatchIndex(idx)}
                      className={`py-3.5 px-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-white border-b-2 border-b-[#0070FF]' 
                          : 'hover:bg-zinc-150/40'
                      }`}
                    >
                      <span className={`text-[8px] font-black uppercase tracking-wider ${isActive ? 'text-[#0070FF]' : 'text-zinc-400'}`}>
                        {rankLabels[idx]}
                      </span>
                      <span className={`text-xs font-bold leading-normal truncate max-w-full px-1 ${isActive ? 'text-zinc-950 font-black' : 'text-zinc-650'}`}>
                        {rec.recommendedTool}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold mt-0.5 ${isActive ? 'text-emerald-600' : 'text-zinc-500'}`}>
                        {rec.suitabilityScore}% Match
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Desk */}
              {(() => {
                const activeRec = suggestionResult.recommendations[selectedMatchIndex];
                if (!activeRec) return null;
                return (
                  <div className="p-6 bg-white space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-150 pb-4">
                      <div>
                        <span className="text-[9px] font-black text-[#0070FF] uppercase tracking-widest block font-sans">AI OPTIMUM PREFERENCE #{selectedMatchIndex + 1}</span>
                        <h4 className="text-2xl font-black text-[#0070FF] uppercase tracking-tight">{activeRec.recommendedTool}</h4>
                        <p className="text-[10px] text-zinc-400 font-sans tracking-wide mt-0.5">Complexity Rating: {activeRec.estimatedComplexity}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-sans">Suitability Score</span>
                          <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 mt-1 block">
                            {activeRec.suitabilityScore}% Match
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200/55">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-mono mb-1.5">Executive Fit Summary</span>
                      <p className="text-xs text-zinc-700 leading-relaxed font-semibold italic">"{activeRec.shortSummary}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-sans">Why This Beats Competitors</span>
                        <ul className="space-y-2">
                          {activeRec.rationale?.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-zinc-700 flex items-start gap-2.5 font-semibold animate-in fade-in-50">
                              <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 font-bold text-[9px] mt-0.5">✔</span>
                              <span className="leading-tight">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2.5">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-sans font-sans">Strategic Execution Steps</span>
                        <ol className="space-y-2">
                          {activeRec.implementationSteps?.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-zinc-700 flex items-start gap-2.5 font-semibold animate-in fade-in-50">
                              <span className="w-4 h-4 rounded-md bg-[#0070FF]/5 text-[#0070FF] border border-[#0070FF]/15 flex items-center justify-center shrink-0 font-bold text-[9px] mt-0.5 font-mono">{i + 1}</span>
                              <span className="leading-tight">{item}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-150 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest font-sans">Quick Action integrations</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setToolA(activeRec.recommendedTool);
                            setTimeout(() => {
                              const matrixAnchor = document.getElementById('platform-comparison-anchor');
                              if (matrixAnchor) {
                                matrixAnchor.scrollIntoView({ behavior: 'smooth' });
                              }
                            }, 50);
                          }}
                          className="px-4 py-2.5 bg-[#0070FF] hover:bg-[#005ACC] text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 hover:scale-[1.02] shadow-md transition-all cursor-pointer font-sans"
                        >
                          <ArrowRightLeft size={12} /> Set as Platform A to compare
                        </button>

                        <button
                          onClick={() => {
                            setToolB(activeRec.recommendedTool);
                            setTimeout(() => {
                              const matrixAnchor = document.getElementById('platform-comparison-anchor');
                              if (matrixAnchor) {
                                matrixAnchor.scrollIntoView({ behavior: 'smooth' });
                              }
                            }, 50);
                          }}
                          className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 hover:scale-[1.02] shadow-sm transition-all cursor-pointer font-sans"
                        >
                          <ArrowRightLeft size={12} /> Set as Platform B
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Comparative Matrix Header */}
      <div id="platform-comparison-anchor" className="space-y-2 pt-6 border-t border-zinc-200">
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-[#0070FF]" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-sans">Option II: Interactive Comparative Matrix</span>
        </div>
        <p className="text-zinc-650 text-lg max-w-2xl font-sans leading-relaxed">Compare side-by-side technical parameters, speed capabilities, and pricing frameworks of any automation stacks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white p-6 rounded-2xl border ${isDragging ? 'border-[#0070FF] bg-[#0070FF]/5 shadow-2xl ring-2 ring-dashed ring-[#0070FF]' : 'border-[#0070FF]/25 shadow-xl'} transition-all duration-300 bg-gradient-to-br from-white to-blue-50/10 space-y-6 relative overflow-hidden`}
        >
          {isDragging && (
            <div className="absolute inset-x-0 top-0 bottom-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
              <FileText className="text-[#0070FF] animate-bounce" size={32} />
              <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop use case details or specs here</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em] mb-2 px-1">Platform A</label>
              <input 
                className="w-full bg-white border border-zinc-200 rounded-xl p-4 text-zinc-900 text-sm font-semibold focus:border-[#0070FF] outline-none transition-all placeholder:text-zinc-400"
                placeholder="e.g. Make.com"
                value={toolA}
                onChange={(e) => setToolA(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em] mb-2 px-1">Platform B</label>
              <input 
                className="w-full bg-white border border-zinc-200 rounded-xl p-4 text-zinc-900 text-sm font-semibold focus:border-[#0070FF] outline-none transition-all placeholder:text-zinc-400"
                placeholder="e.g. Zapier"
                value={toolB}
                onChange={(e) => setToolB(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <label className="block text-[10px] font-bold text-zinc-655 uppercase tracking-[0.2em]">Specific Use Case</label>
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

            <div className="relative group font-sans">
              <textarea 
                className="w-full bg-white border border-zinc-200 rounded-xl p-4 text-zinc-800 text-sm focus:border-[#0070FF] outline-none h-32 resize-none transition-all placeholder:text-zinc-400 leading-relaxed font-semibold"
                placeholder="Describe yours or drop a spec document here. e.g. Processing 10k leads/mo with complex branch conditions..."
                value={useCase}
                onKeyDown={handleKeyDown}
                onChange={(e) => setUseCase(e.target.value)}
              />
              <button 
                onClick={handleCompare}
                disabled={loading || !toolA || !toolB}
                className="absolute bottom-3 right-3 p-2 bg-blue-50 border border-blue-150 rounded-lg text-[#0070FF] hover:bg-blue-100 disabled:opacity-50 disabled:bg-zinc-100 disabled:text-zinc-400 transition-all shadow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CornerDownLeft size={16} />}
              </button>
            </div>
          </div>

          <button 
            onClick={handleCompare}
            disabled={loading || !toolA || !toolB}
            className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 font-display"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Scale size={16} /> Run Comparison Engine</>}
          </button>
          <ErrorNotice message={error} onClose={() => setError(null)} />
        </div>

        <div>
          {result ? (
            <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-6 animate-in zoom-in-95 duration-300 bg-gradient-to-br from-white to-blue-50/10">
              <div className="text-center border-b border-[#0070FF]/15 pb-4">
                <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 block mb-1 font-black">Recommended Architecture</span>
                <h3 className="text-2xl font-black text-[#0070FF] tracking-tight uppercase">{result.winner}</h3>
              </div>

              <div className="space-y-3">
                {result.comparisonPoints?.map((point: any, i: number) => (
                  <div key={i} className="bg-white border border-[#0070FF]/15 p-4 rounded-xl shadow-sm hover:border-[#0070FF]/35 transition-all">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">{point.feature}</p>
                    <div className="grid grid-cols-2 gap-4 items-start text-xs">
                      <div className="pr-2 border-r border-[#0070FF]/10">
                        <span className="text-[9px] text-[#0070FF] block uppercase font-black mb-1 select-all">{toolA || "Tool A"}</span>
                        <span className="text-zinc-800 font-semibold leading-relaxed block">{point.toolAVal}</span>
                      </div>
                      <div className="pl-2">
                        <span className="text-[9px] text-indigo-600 block uppercase font-black mb-1 select-all">{toolB || "Tool B"}</span>
                        <span className="text-zinc-800 font-semibold leading-relaxed block">{point.toolBVal}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50/20 rounded-xl border border-amber-100/40">
                <h4 className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-amber-500" /> Final Neural Verdict
                </h4>
                <p className="text-xs italic text-zinc-700 leading-relaxed font-semibold">"{result.verdict}"</p>
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-650 p-8 text-center bg-blue-50/5 min-h-[400px]">
              <Scale size={48} className="opacity-30 text-[#0070FF] mb-6 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-800">Awaiting Parameters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comparison;
