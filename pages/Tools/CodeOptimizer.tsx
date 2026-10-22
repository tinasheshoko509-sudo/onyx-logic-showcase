
import React, { useState, useEffect, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { readDocumentAsText } from '../../utils/readDocument';
import { refactorCode, generateCode, analyzeAppCode, explainCode } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { CodeRefactorResult, CodeAnalysisResult } from '../../types';
import {
  Loader2,
  Copy,
  Check,
  Terminal,
  AlertTriangle,
  Sparkles,
  Info,
  Cpu,
  Zap,
  Upload,
  FileText,
  ShieldAlert,
  Bug,
  Lightbulb,
  FileCheck,
  Award,
  ChevronRight,
  Activity,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface CodeExplainResult {
  summary: string;
  steps: { label: string; description: string }[];
  inputs: string;
  outputs: string;
  sideEffects: string;
}

type Mode = 'refactor' | 'generate' | 'analyze' | 'explain';

const CodeOptimizer: React.FC<{ onAction: (metrics?: { gain?: number }, input?: string, output?: string) => void }> = ({ onAction }) => {
  const [mode, setMode]                       = useState<Mode>('refactor');
  const [inputCode, setInputCode]             = useState('');
  const [objective, setObjective]             = useState('');
  const [symptoms, setSymptoms]               = useState('');
  const [loading, setLoading]                 = useState(false);
  const [result, setResult]                   = useState<CodeRefactorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult]   = useState<CodeAnalysisResult | null>(null);
  const [explainResult, setExplainResult]     = useState<CodeExplainResult | null>(null);
  const [copied, setCopied]                   = useState(false);
  const [isDragging, setIsDragging]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (mode === 'refactor' && !inputCode) throw new Error('NO_SOURCE: JavaScript input required for refactor.');
        if (mode === 'generate' && !objective) throw new Error('NO_DIRECTIVE: Objective required for synthesis.');
        if (mode === 'analyze' && !inputCode) throw new Error('NO_SOURCE: Source code required for analysis.');
        if (mode === 'explain' && !inputCode) throw new Error('NO_SOURCE: Code to explain is required.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (mode === 'analyze') {
          if (!analysisResult) throw new Error('NO_ANALYSIS: Complete an audit first.');
          await new Promise(resolve => setTimeout(resolve, 1500));
          onAction({ gain: 8.5 }, `Mode: ${mode}\nSymptoms: ${symptoms}\nInput:\n${inputCode.slice(0, 1000)}`, JSON.stringify(analysisResult, null, 2));
        } else if (mode === 'explain') {
          if (!explainResult) throw new Error('NO_RESULT: Explain code first.');
          await new Promise(resolve => setTimeout(resolve, 1500));
          onAction(undefined, `Mode: explain\nInput:\n${inputCode.slice(0, 1000)}`, JSON.stringify(explainResult, null, 2));
        } else {
          if (!result) throw new Error('NO_SYNTHESIS: Complete optimization first.');
          await new Promise(resolve => setTimeout(resolve, 1500));
          onAction({ gain: parseFloat(result.complexityScore) || undefined }, `Mode: ${mode}\nObjective: ${objective}\nInput:\n${inputCode.slice(0, 1000)}`, JSON.stringify(result, null, 2));
        }
      }
    });
  }, [mode, inputCode, objective, symptoms, result, analysisResult, explainResult, onAction, registerActions]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setResult(null);
    setAnalysisResult(null);
    setExplainResult(null);
  };

  const handleExecute = async () => {
    if (mode === 'refactor' && (!inputCode || !objective)) return;
    if (mode === 'generate' && !objective) return;
    if ((mode === 'analyze' || mode === 'explain') && !inputCode) return;
    if (loading) return;

    setError(null);
    setLoading(true);
    setResult(null);
    setAnalysisResult(null);
    setExplainResult(null);
    try {
      if (mode === 'refactor') {
        const data = await refactorCode(inputCode, objective);
        setResult(data);
        onAction({ gain: parseFloat(data.complexityScore) || undefined }, `Mode: ${mode}\nObjective: ${objective}\nInput:\n${inputCode}`, JSON.stringify(data, null, 2));
      } else if (mode === 'generate') {
        const data = await generateCode(objective);
        setResult(data);
        onAction({ gain: parseFloat(data.complexityScore) || undefined }, `Mode: ${mode}\nObjective: ${objective}`, JSON.stringify(data, null, 2));
      } else if (mode === 'analyze') {
        const data = await analyzeAppCode(inputCode, symptoms);
        setAnalysisResult(data);
        onAction({ gain: 8.5 }, `Mode: ${mode}\nSymptoms: ${symptoms || 'General Audit'}\nInput:\n${inputCode}`, JSON.stringify(data, null, 2));
      } else {
        const data = await explainCode(inputCode);
        setExplainResult(data);
        onAction(undefined, `Mode: explain\nInput:\n${inputCode}`, JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The code could not be processed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.refactoredCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const readFile = (file: File) => {
    readDocumentAsText(file)
      .then(setInputCode)
      .catch(err => { console.error('File read failed:', err); setError(friendlyError(err, 'The file could not be read. Try pasting the text instead.')); });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const headerLabel = mode === 'refactor' ? 'Refactor' : mode === 'generate' ? 'Synthesis' : mode === 'explain' ? 'Decode' : 'Audit Engine';
  const isCodeInputMode = mode === 'refactor' || mode === 'analyze' || mode === 'explain';
  const executeDisabled = loading || (
    mode === 'refactor' ? (!inputCode || !objective) :
    mode === 'generate' ? !objective :
    !inputCode
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-[#0070FF] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Neural Logic Synthesis & Diagnostics</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
            Neural JS <span className="text-[#0070FF]">{headerLabel}</span>
          </h2>
          <p className="text-zinc-650 text-xl max-w-3xl leading-relaxed">
            {mode === 'analyze'
              ? 'Upload or paste your full codebase. Our scanner traces execution lines, identifying hidden bugs, security risks, and performance bottlenecks.'
              : mode === 'explain'
              ? 'Paste any JavaScript — from an n8n Code node, a codebase, or anywhere else — and get a plain-English breakdown of exactly what it does, decoded step by step.'
              : 'Inject raw JavaScript for multi-layer logic optimization or synthesize high-performance code from English directives.'}
          </p>
        </div>
        <div className="flex bg-zinc-100 p-1.5 rounded-xl border border-zinc-200 shrink-0 h-fit self-start md:self-end">
          <button type="button" onClick={() => switchMode('refactor')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${mode === 'refactor' ? 'bg-[#0070FF] text-white shadow-md' : 'text-zinc-650 hover:text-zinc-900 font-bold'}`}>
            Refactor
          </button>
          <button type="button" onClick={() => switchMode('generate')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${mode === 'generate' ? 'bg-[#0070FF] text-white shadow-md' : 'text-zinc-650 hover:text-zinc-900 font-bold'}`}>
            Synthesis
          </button>
          <button type="button" onClick={() => switchMode('analyze')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${mode === 'analyze' ? 'bg-[#0070FF] text-white shadow-md' : 'text-zinc-650 hover:text-zinc-900 font-bold'}`}>
            Auditor
          </button>
          <button type="button" onClick={() => switchMode('explain')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${mode === 'explain' ? 'bg-[#0070FF] text-white shadow-md' : 'text-zinc-650 hover:text-zinc-900 font-bold'}`}>
            Decode
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Column */}
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white p-6 rounded-2xl border ${isDragging ? 'border-[#0070FF] bg-[#0070FF]/5 shadow-2xl ring-2 ring-dashed ring-[#0070FF]' : 'border-[#0070FF]/25 shadow-xl'} transition-all duration-300 bg-gradient-to-br from-white to-blue-50/10 space-y-6 relative overflow-hidden`}
          >
            {isDragging && (
              <div className="absolute inset-x-0 top-0 bottom-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
                <FileText className="text-[#0070FF] animate-bounce" size={32} />
                <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop code files here</span>
              </div>
            )}

            {isCodeInputMode && (
              <div>
                <div className="flex justify-between items-center mb-3 px-1">
                  <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em] block">
                    {mode === 'analyze' ? 'App Codebase / Full Code' : mode === 'explain' ? 'Code to Decode' : 'Raw Source Input'}
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[9px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors"
                  >
                    <Upload size={10} /> Import Code File
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".js,.jsx,.ts,.tsx,.json,.txt,.html,.py,.css,.docx,.pdf" onChange={handleFileChange} />
                </div>
                <textarea
                  className="w-full h-80 bg-white border border-zinc-200 rounded-xl p-4 text-zinc-800 text-xs font-mono focus:border-[#0070FF] outline-none resize-none transition-all placeholder:text-zinc-400 leading-relaxed"
                  placeholder={
                    mode === 'analyze'
                      ? 'Paste the entire code for your app here, or drop multiple text modules/files...'
                      : mode === 'explain'
                      ? 'Paste any JavaScript here — from a code node, a script, or a project...'
                      : 'paste(javascript_code_here) => refactor(); or drop code file here...'
                  }
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                />
                <div className="text-[10px] text-zinc-500 font-mono mt-1 text-right">
                  {inputCode ? `${inputCode.length.toLocaleString()} characters` : '0 characters'}
                </div>
              </div>
            )}

            {mode === 'generate' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em] block">Neural Directive / Specification</label>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="text-[9px] font-black uppercase tracking-wider text-[#0070FF] hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded transition-colors">
                    <Upload size={10} /> Import Spec File
                  </button>
                </div>
                <textarea
                  className="w-full h-48 bg-white border border-zinc-200 rounded-xl p-4 text-zinc-800 text-sm focus:border-[#0070FF] outline-none resize-none transition-all placeholder:text-zinc-400 leading-relaxed font-semibold"
                  placeholder="e.g. Create a modular custom react custom hook that fetches a user profile and sets up automatic localstorage synchronizer caching with full retry..."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
            )}

            {mode === 'refactor' && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em] block px-1">Optimization Objective</label>
                <textarea
                  className="w-full h-32 bg-white border border-zinc-200 rounded-xl p-4 text-zinc-800 text-sm focus:border-[#0070FF] outline-none transition-all placeholder:text-zinc-400 resize-none leading-relaxed font-semibold"
                  placeholder="e.g. Optimize for memory footprints and sequential rendering speed..."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
            )}

            {mode === 'analyze' && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-[0.2em] block px-1">Observed Symptoms / User Notes (Optional)</label>
                <textarea
                  className="w-full h-32 bg-white border border-zinc-200 rounded-xl p-4 text-zinc-800 text-sm focus:border-[#0070FF] outline-none transition-all placeholder:text-zinc-400 resize-none leading-relaxed font-semibold"
                  placeholder="e.g. The app enters an infinite loop of re-renders when I try to save..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
            )}

            <button
              onClick={handleExecute}
              disabled={executeDisabled}
              className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 cursor-pointer font-display"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span>{mode === 'explain' ? 'Decoding...' : mode === 'analyze' ? 'Reconstructing Call Tree & Scanning...' : 'Compiling Optimization Flights...'}</span>
                </div>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>
                    {mode === 'explain' ? 'Decode This Code' : mode === 'analyze' ? 'Execute Complete Neural Audit' : 'Execute Optimization'}
                  </span>
                </>
              )}
            </button>
            <ErrorNotice message={error} onClose={() => setError(null)} />
          </div>
        </div>

        {/* Output Column */}
        <div className="overflow-y-auto max-h-[1000px] pr-1 space-y-6">
          {loading ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-[#0070FF]/20 flex flex-col items-center justify-center text-center space-y-6 py-24 min-h-[500px]">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100/40 rounded-full blur-xl animate-pulse"></div>
                <Loader2 className="animate-spin text-[#0070FF] relative z-10" size={48} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-800">
                  {mode === 'explain' ? 'Decoding Your Code' : 'Executing De-lineation Logic'}
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                  {mode === 'explain'
                    ? 'Parsing control flow, identifying inputs and outputs, and writing a plain-language decode.'
                    : 'Parsing control scopes, analyzing import integrity, scanning logic state flow, and checking for API leakage variables.'}
                </p>
              </div>
              <div className="flex bg-zinc-50 border border-zinc-200/60 p-3 rounded-xl gap-2 text-[10px] font-mono text-zinc-650 tracking-tight items-center justify-center max-w-xs uppercase">
                <Terminal size={14} className="text-[#0070FF]" />
                <span>{mode === 'explain' ? 'Onyx Core: decoding logic structure' : 'Onyx Core: scanning structural AST'}</span>
              </div>
            </div>

          ) : mode === 'explain' && explainResult ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">

              {/* Summary */}
              <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl bg-gradient-to-br from-white to-blue-50/10 space-y-4">
                <div className="flex items-center gap-2 border-b border-[#0070FF]/15 pb-4">
                  <BookOpen size={18} className="text-[#0070FF]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">What This Code Does</h3>
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed font-semibold">{explainResult.summary}</p>
              </div>

              {/* Step-by-step */}
              <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                  <ChevronRight size={16} className="text-[#0070FF]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Step-by-Step Walkthrough</h3>
                </div>
                <div className="space-y-3">
                  {(explainResult.steps || []).map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-[10px] font-black text-white bg-[#0070FF] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <span className="text-xs font-black text-zinc-900">{step.label} — </span>
                        <span className="text-xs text-zinc-600 leading-relaxed">{step.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inputs / Outputs / Side effects */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xl space-y-5">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 border-b border-zinc-100 pb-4">Data Flow</h3>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight size={11} className="text-emerald-500" /> Inputs
                  </span>
                  <p className="text-xs text-zinc-700 leading-relaxed font-semibold pl-4">{explainResult.inputs}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-[#0070FF] uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight size={11} className="text-[#0070FF]" /> Outputs
                  </span>
                  <p className="text-xs text-zinc-700 leading-relaxed font-semibold pl-4">{explainResult.outputs}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight size={11} className="text-amber-500" /> Side Effects
                  </span>
                  <p className="text-xs text-zinc-700 leading-relaxed font-semibold pl-4">{explainResult.sideEffects}</p>
                </div>
              </div>
            </div>

          ) : mode === 'analyze' && analysisResult ? (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl bg-gradient-to-br from-white to-blue-50/10 space-y-4">
                <div className="flex items-center justify-between border-b border-[#0070FF]/15 pb-4">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-[#0070FF]" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Neural Executive Summary</h3>
                  </div>
                  <span className="text-[9px] font-extrabold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full uppercase tracking-wider border border-emerald-100">
                    Audit Status: Done
                  </span>
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed font-semibold">{analysisResult.overview}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-xl bg-gradient-to-br from-white to-red-50/5 space-y-6">
                <div className="flex items-center justify-between border-b border-red-150 pb-4">
                  <div className="flex items-center gap-2">
                    <Bug size={18} className="text-red-500 animate-pulse" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-650">Bugs & Code Anomalies Detected</h3>
                  </div>
                  <span className="text-[10px] font-black bg-red-50 text-red-650 px-2.5 py-0.5 rounded-full border border-red-100">
                    {analysisResult.bugs.length} Issues
                  </span>
                </div>
                <div className="space-y-6">
                  {analysisResult.bugs.length > 0 ? (
                    analysisResult.bugs.map((bug, index) => (
                      <div key={index} className="space-y-3 pb-6 border-b border-zinc-100 last:border-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-zinc-900 text-white font-bold px-2 py-0.5 rounded">{bug.linePointer}</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                              bug.severity === 'High' ? 'bg-red-50 border-red-200 text-red-600'
                              : bug.severity === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-600'
                              : 'bg-blue-50 border-blue-200 text-blue-600'
                            }`}>
                              Severity: {bug.severity}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-800 font-semibold leading-relaxed">
                          <span className="font-bold text-zinc-900 block mb-0.5">Underlying Failure:</span>{bug.issue}
                        </p>
                        <div className="space-y-1 bg-zinc-950 p-4 rounded-xl border border-zinc-850 font-mono text-xs shadow-inner">
                          <div className="flex justify-between items-center text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">
                            <span className="flex items-center gap-1"><Terminal size={10} /> Remediation Corrective Guidance</span>
                          </div>
                          <pre className="text-[11px] text-zinc-200 whitespace-pre-wrap leading-relaxed select-all">{bug.remediation}</pre>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500">
                      <FileCheck className="text-emerald-500 mb-2" size={32} />
                      <p className="text-xs font-semibold">Zero logical defects or active bugs were caught.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-yellow-200 shadow-xl bg-gradient-to-br from-white to-yellow-50/5 space-y-4">
                <div className="flex items-center justify-between border-b border-yellow-150 pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-amber-600" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Security Threat Exposure</h3>
                  </div>
                  <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-100">
                    {analysisResult.securityIssues.length} Vulnerabilities
                  </span>
                </div>
                <div className="space-y-4">
                  {analysisResult.securityIssues.length > 0 ? (
                    analysisResult.securityIssues.map((sec, index) => (
                      <div key={index} className="p-4 bg-amber-50/45 border border-yellow-200/50 rounded-xl space-y-2">
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">{sec.component}</span>
                        <p className="text-xs text-zinc-800 font-semibold leading-relaxed"><span className="font-bold text-zinc-900">Issue: </span>{sec.threat}</p>
                        <p className="text-[11px] text-emerald-800 leading-relaxed italic bg-emerald-50/50 p-2.5 rounded border border-emerald-100 font-semibold">
                          <strong className="text-emerald-900 not-italic block mb-0.5">Secure Resolution:</strong>{sec.resolution}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 italic text-center py-2">No security gaps detected in code.</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-indigo-205 shadow-xl bg-gradient-to-br from-white to-indigo-50/5 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-150 pb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={18} className="text-indigo-600" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700">Performance & Efficiency</h3>
                  </div>
                  <span className="text-[10px] font-black bg-indigo-50 text-indigo-750 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {analysisResult.performanceIssues.length} Findings
                  </span>
                </div>
                <div className="space-y-4">
                  {analysisResult.performanceIssues.length > 0 ? (
                    analysisResult.performanceIssues.map((perf, index) => (
                      <div key={index} className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-xl space-y-2">
                        <span className="text-[11px] font-mono bg-indigo-900 text-white font-bold px-2 py-0.5 rounded">{perf.location}</span>
                        <p className="text-xs text-zinc-800 font-semibold leading-relaxed"><span className="font-bold text-zinc-900">Symptom: </span>{perf.symptom}</p>
                        <p className="text-xs text-indigo-805 leading-relaxed bg-white/70 p-2.5 rounded border border-indigo-100 font-semibold">
                          <strong className="text-indigo-900 block mb-0.5">Optimization fix:</strong>{perf.fix}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 italic text-center py-2">No heavy performance leakages found.</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-150 pb-4">
                  <Lightbulb size={18} className="text-[#0070FF]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Architectural & Structural Roadmap</h3>
                </div>
                <div className="space-y-3">
                  {analysisResult.architecturalSuggestions.map((sug, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <ChevronRight size={14} className="text-[#0070FF] shrink-0 mt-0.5" />
                      <p className="text-xs text-zinc-700 leading-relaxed font-semibold">{sug}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          ) : result ? (
            <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl space-y-6 animate-in zoom-in-95 duration-300 bg-gradient-to-br from-white to-blue-50/10">
              <div className="flex justify-between items-center border-b border-[#0070FF]/15 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900">Optimization Output</h3>
                  {result.complexityScore && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-blue-50 text-[#0070FF] rounded-full uppercase tracking-wider border border-blue-100 ml-0.5">
                      Complexity Score: {result.complexityScore}
                    </span>
                  )}
                </div>
                <button onClick={copyCode}
                  className={`p-2 rounded-lg border ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-250' : 'bg-blue-50 hover:bg-blue-100 border-[#0070FF]/20 text-[#0070FF]'} transition-all`}>
                  {copied ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"><Check size={14} /> Copied</div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"><Copy size={14} /> Copy Code</div>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-[#0070FF] font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={14} /> Optimized Source Code
                </h4>
                <div className="relative font-mono bg-zinc-950 border border-zinc-850 p-4 rounded-xl leading-relaxed max-h-[400px] overflow-y-auto shadow-inner select-all">
                  <pre className="text-[11px] text-zinc-100 whitespace-pre-wrap leading-relaxed select-all">{result.refactoredCode}</pre>
                </div>
              </div>

              {result.explanation && (
                <div className="space-y-2">
                  <h4 className="text-amber-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} className="text-amber-600" /> Refactoring Summary
                  </h4>
                  <div className="text-xs text-zinc-700 leading-relaxed font-semibold bg-amber-50/20 border border-amber-100/40 p-4 rounded-xl italic">
                    {result.explanation}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-red-750 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" /> Improvement Analysis
                </h4>
                <div className="space-y-2">
                  {result.analysis && result.analysis.length > 0 ? (
                    result.analysis.map((item, i) => (
                      <div key={i} className="text-xs text-zinc-800 font-semibold leading-relaxed pl-4 border-l-2 border-red-500 bg-red-50/20 p-4 rounded-r-xl border-t border-b border-r border-red-100/40 italic">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500 italic">No syntax issues or functional risks detected.</p>
                  )}
                </div>
              </div>
            </div>

          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-650 p-12 text-center bg-blue-50/5 min-h-[500px]">
              <Cpu size={48} className="opacity-30 text-[#0070FF] mb-4 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-800">
                {mode === 'analyze' ? 'Audit Buffer Ready' : mode === 'explain' ? 'Code Decoder Ready' : 'Optimization Buffer Ready'}
              </p>
              <p className="text-xs text-zinc-500 max-w-xs mt-2">
                {mode === 'explain'
                  ? 'Paste any JavaScript above — from a code node, a script, or a codebase — to get a plain-English decode of what it does.'
                  : mode === 'analyze'
                  ? 'Paste details or drag your source files here.'
                  : 'Enter code or specification directives above, then trigger neural compilation.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeOptimizer;
