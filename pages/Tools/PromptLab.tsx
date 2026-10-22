import React, { useState, useEffect } from 'react';
import { refinePrompt, reinforcePrompt, generatePromptFromScratch } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { useLocation } from 'react-router-dom';
import { 
  Loader2, 
  Beaker, 
  Copy, 
  Check,
  Terminal, 
  AlertCircle, 
  Lightbulb, 
  CheckCircle2,
  CornerDownLeft,
  Target,
  Sparkles,
  Zap,
  RefreshCw,
  PlusCircle,
  Cpu,
  Mic,
  MicOff
} from 'lucide-react';

const PromptLab: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const location = useLocation();
  const [mode, setMode] = useState<'refine' | 'generate'>('refine');
  const [rawPrompt, setRawPrompt] = useState('');
  const [desiredOutput, setDesiredOutput] = useState('');
  const [scratchObjective, setScratchObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [reinforcing, setReinforcing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [adjustText, setAdjustText] = useState('');
  const [lastChanges, setLastChanges] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Voice-to-Text Speech Recognition states
  const [isRecordingRaw, setIsRecordingRaw] = useState(false);
  const [isRecordingScratch, setIsRecordingScratch] = useState(false);
  const [isRecordingDesired, setIsRecordingDesired] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      setRecognition(rec);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [recognition]);

  const stopAllRecording = () => {
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    setIsRecordingRaw(false);
    setIsRecordingScratch(false);
    setIsRecordingDesired(false);
  };

  const startRecording = (field: 'rawPrompt' | 'scratchObjective' | 'desiredOutput') => {
    if (!recognition) return;

    let initialText = '';
    if (field === 'rawPrompt') initialText = rawPrompt;
    else if (field === 'scratchObjective') initialText = scratchObjective;
    else if (field === 'desiredOutput') initialText = desiredOutput;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const activeText = initialText + (initialText && !initialText.endsWith(' ') ? ' ' : '') + finalTranscript + interimTranscript;
      
      if (field === 'rawPrompt') setRawPrompt(activeText);
      else if (field === 'scratchObjective') setScratchObjective(activeText);
      else if (field === 'desiredOutput') setDesiredOutput(activeText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      stopAllRecording();
    };

    recognition.onend = () => {
      setIsRecordingRaw(false);
      setIsRecordingScratch(false);
      setIsRecordingDesired(false);
    };

    if (field === 'rawPrompt') {
      setIsRecordingRaw(true);
      setIsRecordingScratch(false);
      setIsRecordingDesired(false);
    } else if (field === 'scratchObjective') {
      setIsRecordingRaw(false);
      setIsRecordingScratch(true);
      setIsRecordingDesired(false);
    } else if (field === 'desiredOutput') {
      setIsRecordingRaw(false);
      setIsRecordingScratch(false);
      setIsRecordingDesired(true);
    }

    try {
      recognition.stop();
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
    }
  };

  const { registerActions } = useProtocol();

  useEffect(() => {
    if (location.state?.extractedInput) {
      if (mode === 'refine') {
        setRawPrompt(location.state.extractedInput);
      } else {
        setScratchObjective(location.state.extractedInput);
      }
    }
  }, [location.state]);

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (mode === 'refine' && !rawPrompt) throw new Error('NO_INPUT: Experimental prompt required.');
        if (mode === 'generate' && !scratchObjective) throw new Error('NO_INPUT: Objective required.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_RESULT: Refined protocol required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1000));
        onAction();
      }
    });
  }, [rawPrompt, scratchObjective, mode, result, onAction, registerActions]);

  const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const runInitial = async (call: () => Promise<any>) => {
    setLoading(true);
    setResult(null);
    setError(null);
    setLastChanges([]);
    setAdjustText('');
    try {
      const data = await call();
      if (!data?.refinedPrompt) throw new Error('The AI returned an empty prompt. Please try again.');
      setResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = () => {
    if (!rawPrompt || loading) return;
    runInitial(() => refinePrompt(rawPrompt, desiredOutput || 'Make the prompt clear, reliable and easy for the AI to follow'));
  };

  const handleGenerateFromScratch = () => {
    if (!scratchObjective || loading) return;
    runInitial(() => generatePromptFromScratch(scratchObjective));
  };

  const handleAdjust = async () => {
    if (!result || !adjustText.trim() || reinforcing) return;
    setReinforcing(true);
    setError(null);
    try {
      const goal = mode === 'refine' ? (desiredOutput || 'Improve the prompt') : scratchObjective;
      const data = await reinforcePrompt(result.refinedPrompt, adjustText.trim(), goal);
      if (!data?.refinedPrompt) throw new Error('The AI returned an empty prompt. Your previous version is unchanged — please try again.');
      setResult({ ...result, refinedPrompt: data.refinedPrompt });
      setLastChanges(Array.isArray(data.changes) ? data.changes : []);
      setAdjustText('');
      onAction();
    } catch (err) {
      console.error(err);
      setError(errMsg(err));
    } finally {
      setReinforcing(false);
    }
  };

  // Older response shape used weaknesses/improvementPointers.
  const issues: string[] = result?.issues ?? result?.weaknesses ?? [];
  const applied: string[] = result?.improvementsApplied ?? result?.improvementPointers ?? [];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <Zap size={16} className="text-[#0070FF] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Neural Prompt Laboratory</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
            Prompt Engineering <span className="text-[#0070FF]">Lab</span>
          </h2>
          <p className="text-zinc-600 text-xl max-w-3xl">Neural diagnostic and structural refinement for high-precision block directives.</p>
        </div>

        <div className="glass p-1 rounded-xl border border-black/5 flex w-full md:w-80 h-10 overflow-hidden shrink-0">
          <button 
            onClick={() => { setMode('refine'); setResult(null); }} 
            className={`flex-grow rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${mode === 'refine' ? 'bg-[#0070FF] text-white shadow-lg' : 'text-zinc-500 hover:text-black'}`}
          >
            <RefreshCw size={12} /> Optimize & Rewrite
          </button>
          <button 
            onClick={() => { setMode('generate'); setResult(null); }} 
            className={`flex-grow rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${mode === 'generate' ? 'bg-[#0070FF] text-white shadow-lg' : 'text-zinc-500 hover:text-black'}`}
          >
            <PlusCircle size={12} /> Build From Scratch
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Inputs */}
        <div className="bg-white p-8 rounded-2xl border border-[#0070FF]/25 shadow-xl transition-all duration-500 bg-gradient-to-br from-white to-blue-50/10 space-y-6">
          {mode === 'refine' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] block">Experimental Pre-existing Prompt</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => isRecordingRaw ? stopAllRecording() : startRecording('rawPrompt')}
                      className={`flex items-center justify-center w-7 h-7 rounded-full transition-all shadow-sm border cursor-pointer ${
                        isRecordingRaw 
                          ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                          : 'bg-zinc-50 hover:bg-blue-50/60 border-zinc-200 hover:border-[#0070FF]/30 text-zinc-500 hover:text-[#0070FF]'
                      }`}
                      title={isRecordingRaw ? "Stop Voice" : "Speak Requirement"}
                    >
                      {isRecordingRaw ? <MicOff size={12} /> : <Mic size={12} />}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea 
                    className="w-full h-36 bg-white border border-zinc-200 rounded-xl p-5 text-black text-sm focus:border-[#0070FF] focus:ring-1 focus:ring-[#0070FF] outline-none resize-y transition-all placeholder:text-zinc-400"
                    placeholder="Paste your existing prompt here. E.g., 'Check this typescript code and send a summary...'"
                    value={rawPrompt}
                    onChange={(e) => setRawPrompt(e.target.value)}
                  />
                  {isRecordingRaw && (
                    <div className="absolute right-4 bottom-4 flex items-center gap-1 bg-red-100 border border-red-200 px-2 py-1 rounded-md text-[9px] font-bold text-red-600 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span> Listening Core...
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] block">Correction Objective / Target Goal</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => isRecordingDesired ? stopAllRecording() : startRecording('desiredOutput')}
                      className={`flex items-center justify-center w-7 h-7 rounded-full transition-all shadow-sm border cursor-pointer ${
                        isRecordingDesired 
                          ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                          : 'bg-zinc-50 hover:bg-blue-50/60 border-zinc-200 hover:border-[#0070FF]/30 text-zinc-500 hover:text-[#0070FF]'
                      }`}
                      title={isRecordingDesired ? "Stop Voice" : "Speak Goal"}
                    >
                      {isRecordingDesired ? <MicOff size={12} /> : <Mic size={12} />}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    className="w-full bg-white border border-zinc-200 rounded-xl py-4 pl-12 pr-6 text-black text-sm focus:border-[#0070FF] focus:ring-1 focus:ring-[#0070FF] outline-none transition-all placeholder:text-zinc-400"
                    placeholder="E.g., Ensure the output is strictly structured JSON and handles edge cases."
                    value={desiredOutput}
                    onChange={(e) => setDesiredOutput(e.target.value)}
                  />
                  <Target size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  {isRecordingDesired && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-red-100 border border-red-200 px-2 py-1 rounded-md text-[9px] font-bold text-red-600 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span> Listening...
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleRefine} 
                disabled={loading || !rawPrompt} 
                className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] shadow-lg disabled:opacity-50 transition-all font-display"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <><Beaker size={16} /> Optimize & Correct Prompt</>}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] block">Prompt Objective / What do you need?</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => isRecordingScratch ? stopAllRecording() : startRecording('scratchObjective')}
                      className={`flex items-center justify-center w-7 h-7 rounded-full transition-all shadow-sm border cursor-pointer ${
                        isRecordingScratch 
                          ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                          : 'bg-zinc-50 hover:bg-blue-50/60 border-zinc-200 hover:border-[#0070FF]/30 text-zinc-500 hover:text-[#0070FF]'
                      }`}
                      title={isRecordingScratch ? "Stop Voice" : "Speak Requirement"}
                    >
                      {isRecordingScratch ? <MicOff size={12} /> : <Mic size={12} />}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea 
                    className="w-full h-44 bg-white border border-zinc-200 rounded-xl p-5 text-black text-sm focus:border-[#0070FF] focus:ring-1 focus:ring-[#0070FF] outline-none resize-y transition-all placeholder:text-zinc-400"
                    placeholder="Describe your ideal prompt in simple English. E.g., 'I want a code reviewer tool that checks git diffs for potential runtime bugs, and formats suggestions in a clear markdown table with severity tags.'"
                    value={scratchObjective}
                    onChange={(e) => setScratchObjective(e.target.value)}
                  />
                  {isRecordingScratch && (
                    <div className="absolute right-4 bottom-4 flex items-center gap-1 bg-red-100 border border-red-200 px-2 py-1 rounded-md text-[9px] font-bold text-red-600 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span> Listening Core...
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleGenerateFromScratch} 
                disabled={loading || !scratchObjective} 
                className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] shadow-lg disabled:opacity-50 transition-all font-display"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <><Cpu size={16} /> Synthesize Brand New Prompt</>}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Results */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}
          {result ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              {/* What was wrong */}
              {issues.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-red-200 space-y-3 shadow-lg bg-red-50/5">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] flex items-center gap-2 px-1">
                    <AlertCircle size={16} /> {mode === 'refine' ? 'What Was Wrong' : 'Assumptions Made'}
                  </h4>
                  <ul className="space-y-2 pl-1">
                    {issues.map((w, i) => (
                      <li key={i} className="text-sm text-zinc-700 pl-3 border-l-2 border-red-500 py-1 leading-relaxed">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optimized Protocol */}
              <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 space-y-6 shadow-xl bg-gradient-to-tr from-white to-blue-50/5">
                <div className="flex justify-between items-center px-1 gap-2 flex-wrap">
                  <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.4em] flex items-center gap-2">
                    <CheckCircle2 size={16} /> Optimized System Protocol Output
                  </h4>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(result.refinedPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                    className="text-[10px] font-black uppercase text-[#0070FF] hover:text-white hover:bg-[#0070FF] transition-all flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-[#0070FF]/15"
                  >
                    {copied ? 'Copied!' : 'Clone To Clipboard'}
                  </button>
                </div>

                <div className="bg-blue-50/10 border border-[#0070FF]/15 p-6 rounded-xl text-[13px] text-zinc-800 leading-relaxed font-mono whitespace-pre-wrap select-all shadow-inner">
                  {result.refinedPrompt}
                </div>

                {result.explanation && (
                  <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-lg text-xs text-zinc-600 leading-relaxed">
                    <span className="font-bold text-zinc-800 uppercase tracking-widest text-[9px] block mb-1.5">Logic Explanation:</span>
                    {result.explanation}
                  </div>
                )}

                {applied.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block px-1">Already Built Into This Prompt</label>
                    <ul className="space-y-1.5">
                      {applied.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-zinc-700 leading-relaxed">
                          <Check size={14} className="text-emerald-600 shrink-0 mt-1" /> <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lastChanges.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
                    <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">Changed In Your Last Adjustment</span>
                    {lastChanges.map((c, i) => (
                      <p key={i} className="text-sm text-amber-900 leading-relaxed">• {c}</p>
                    ))}
                  </div>
                )}

                {/* Custom re-adjustment */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block px-1 pt-3">Re-adjust In Your Own Words</label>
                  <textarea
                    className="w-full h-24 bg-white border border-zinc-200 rounded-xl p-4 text-black text-sm focus:border-[#0070FF] focus:ring-1 focus:ring-[#0070FF] outline-none resize-y placeholder:text-zinc-400"
                    placeholder="E.g. 'Make it friendlier and shorter', 'Always reply in Spanish', 'Remove the part about JSON — I want a plain paragraph'"
                    value={adjustText}
                    onChange={(e) => setAdjustText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdjust(); }}
                  />
                  <button
                    onClick={handleAdjust}
                    disabled={reinforcing || !adjustText.trim()}
                    className="w-full py-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    {reinforcing ? <><Loader2 className="animate-spin" size={14} /> Adjusting — this can take up to a minute…</> : <><Sparkles size={14} className="text-amber-400" /> Re-adjust Prompt</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-600 p-12 text-center min-h-[460px] bg-blue-50/5">
              <Beaker size={48} className="mb-4 opacity-30 text-[#0070FF] animate-pulse" />
              <p className="text-[11px] uppercase tracking-[0.4em] font-black text-zinc-800">Synthesizer Idle</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-2">
                {mode === 'refine' 
                  ? 'Input a raw prompt and its desired objective on the left pane to run diagnostics and structural refinement'
                  : 'Type what you want to achieve on the left pane and see a production-ready AI block directive generated'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptLab;
