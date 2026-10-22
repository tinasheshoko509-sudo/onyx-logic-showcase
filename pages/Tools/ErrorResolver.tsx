
import React, { useState, useEffect, useRef } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { resolveWorkflowError, resolveWorkflowErrorFromImage } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { useLocation } from 'react-router-dom';
import {
  Loader2,
  Terminal,
  CornerDownLeft,
  ShieldAlert,
  LifeBuoy,
  Zap,
  ImagePlus,
  X,
} from 'lucide-react';


const ErrorResolver: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const location = useLocation();
  const [errorInput, setErrorInput]     = useState('');
  const [imageBase64, setImageBase64]   = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName]       = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<{ translation: string; technicalContext: string; remediation: { step: string; confidence: 'certain' | 'likely' | 'possible' }[] } | null>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    if (location.state?.extractedInput) {
      setErrorInput(location.state.extractedInput);
    }
  }, [location.state]);

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!errorInput.trim() && !imageBase64) throw new Error('NO_SIGIL: An error message or screenshot is required.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_TRANSLATION: Completed resolution required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAction();
      }
    });
  }, [errorInput, imageBase64, result, onAction, registerActions]);

  const handleResolve = async () => {
    if ((!errorInput.trim() && !imageBase64) || loading) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      let data;
      if (imageBase64) {
        data = await resolveWorkflowErrorFromImage(imageBase64, imageMimeType, errorInput);
      } else {
        data = await resolveWorkflowError(errorInput);
      }
      setResult(data);
      onAction();
    } catch (err) {
      console.error('Resolution engine failed.', err);
      setError(friendlyError(err, 'The error could not be decoded. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleResolve();
    }
  };

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // dataUrl is "data:image/png;base64,XXXX..." — extract just the base64 part
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setImageMimeType(file.type);
      setImagePreview(dataUrl);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    setImageName('');
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) loadImage(file);
  };

  const canSubmit = (errorInput.trim().length > 0 || imageBase64 !== null) && !loading;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Zap size={16} className="text-[#0070FF] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-sans">Neural Debugger Uplink</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4 text-zinc-900">
          Error <span className="text-[#0070FF]">Resolver</span>
        </h2>
        <p className="text-zinc-650 text-xl max-w-3xl font-sans leading-relaxed">
          Neural translation of technical builder errors and log sigils into plain, actionable English directives.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`glass p-6 rounded-2xl border shadow-2xl space-y-6 relative overflow-hidden group transition-all duration-200 ${
              isDragging ? 'border-[#0070FF]/50 ring-2 ring-dashed ring-[#0070FF]/40 bg-[#0070FF]/5' : 'border-black/5'
            }`}
          >
            <div className="absolute top-0 right-0 p-6 opacity-[0.01] group-hover:opacity-[0.03] transition-opacity pointer-events-none">
              <Terminal size={120} className="text-[#0070FF]" />
            </div>

            {isDragging && (
              <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
                <ImagePlus size={32} className="text-[#0070FF] animate-bounce" />
                <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop screenshot here</span>
              </div>
            )}

            <div className="space-y-4 relative z-10">
              {/* Text input */}
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans">
                  Error Message
                </label>
              </div>
              <div className="relative group/input">
                <textarea
                  className="w-full h-40 bg-white border border-black/10 rounded-xl p-5 text-black text-sm focus:outline-none focus:border-[#0070FF]/50 transition-all duration-300 placeholder:text-zinc-400 resize-none font-mono leading-relaxed"
                  placeholder="Paste your error here (e.g. 429 Too Many Requests, Node execution timeout, etc.)"
                  value={errorInput}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setErrorInput(e.target.value)}
                />
                <button
                  onClick={handleResolve}
                  disabled={!canSubmit}
                  className="absolute bottom-4 right-4 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-550 hover:text-[#0070FF] hover:border-[#0070FF]/50 transition-all backdrop-blur-sm disabled:opacity-20 cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CornerDownLeft size={16} />}
                </button>
              </div>

              {/* Screenshot upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-100" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">or</span>
                  <div className="flex-1 h-px bg-zinc-100" />
                </div>

                {imagePreview ? (
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <img
                      src={imagePreview}
                      alt="Error screenshot"
                      className="w-16 h-12 object-cover rounded-lg border border-zinc-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-zinc-800 truncate">{imageName}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Screenshot ready</p>
                    </div>
                    <button
                      onClick={clearImage}
                      className="p-1.5 hover:bg-red-50 hover:text-red-500 text-zinc-400 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-zinc-300 hover:border-[#0070FF]/50 hover:bg-[#0070FF]/5 rounded-xl text-xs font-black text-zinc-400 hover:text-[#0070FF] transition-all uppercase tracking-wider"
                  >
                    <ImagePlus size={15} /> Upload Error Screenshot
                  </button>
                )}
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest text-center">
                Execute via CTRL + ENTER · You can use text, a screenshot, or both
              </p>
            </div>

            <button
              onClick={handleResolve}
              disabled={!canSubmit}
              className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 text-xs uppercase tracking-[0.4em] shadow-lg disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-display"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="uppercase tracking-[0.2em] font-display">
                    {imageBase64 ? 'Reading Screenshot...' : 'Translating...'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 uppercase tracking-[0.3em] font-display">
                  <Zap size={16} /> Decode Signal
                </div>
              )}
            </button>
            <ErrorNotice message={error} onClose={() => setError(null)} />
          </div>

          <div className="glass p-6 rounded-2xl border border-black/5 flex gap-4 items-start shadow-xl">
            <div className="p-3 bg-[#0070FF]/10 rounded-xl text-[#0070FF] shrink-0 border border-[#0070FF]/20 shadow-inner mt-0.5">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1 font-sans">Diagnostic Mode</h4>
              <p className="text-xs text-zinc-650 leading-relaxed font-sans font-medium">
                Paste the raw error message, upload a screenshot, or both. Works with errors from <span className="text-black font-semibold">n8n</span>, <span className="text-black font-semibold">Make.com</span>, <span className="text-black font-semibold">Zapier</span>, and any other tool.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[900px] pr-1">
          {result ? (
            <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden min-h-[500px]">
              <div className="absolute top-0 right-0 p-8 opacity-[0.01] pointer-events-none">
                <ShieldAlert size={250} className="text-[#0070FF]" />
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-6 bg-[#0070FF] rounded-full shadow-[0_0_10px_#0070FF]"></div>
                  <h3 className="text-base font-black uppercase tracking-widest text-zinc-900 font-sans">Plain English Translation</h3>
                </div>
                <div className="glass p-5 rounded-xl border border-black/5 hover:border-[#0070FF]/10 transition-all duration-300">
                  <p className="text-zinc-750 text-sm leading-relaxed italic font-medium text-justify">
                    "{result.translation}"
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0070FF] animate-pulse"></div>
                    Neural Translation Layer Integrity Verified
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_#10B981]"></div>
                  <h3 className="text-base font-black uppercase tracking-widest text-zinc-900 font-sans">Remediation Steps</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {result.remediation.map((item, i) => {
                    const conf = item.confidence ?? 'possible';
                    const badge = conf === 'certain'
                      ? { label: 'Certain',  bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/25' }
                      : conf === 'likely'
                      ? { label: 'Likely',   bg: 'bg-amber-500/10',   text: 'text-amber-600',   border: 'border-amber-500/25'   }
                      : { label: 'Possible', bg: 'bg-zinc-500/10',    text: 'text-zinc-500',    border: 'border-zinc-400/25'    };
                    return (
                      <div key={i} className="flex gap-4 p-4 glass border border-black/5 rounded-xl hover:border-[#0070FF]/15 hover:bg-[#0070FF]/5 transition-all group/item items-start">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 font-extrabold text-xs flex items-center justify-center shrink-0 border border-emerald-500/25 group-hover/item:bg-[#0070FF] group-hover/item:text-white group-hover/item:border-[#0070FF] transition-all mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <p className="text-xs text-zinc-700 font-sans font-medium tracking-tight leading-relaxed">{item.step}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-black/5 relative z-10">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Terminal size={12} className="text-[#0070FF]" /> Technical Dossier Context
                </h4>
                <pre className="text-xs text-emerald-400 font-mono bg-zinc-950 p-4 rounded-xl border border-zinc-900 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                  {result.technicalContext}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-black/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 p-12 text-center glass min-h-[500px]">
              <LifeBuoy size={40} className="opacity-10 text-[#0070FF] mb-6 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2 text-black">Neural Debugger Idle</p>
              <p className="text-xs text-zinc-550 max-w-xs leading-relaxed font-sans font-medium">
                Paste an error, upload a screenshot, or both — then decode the signal for a plain-English resolution.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorResolver;
