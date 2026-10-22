import React, { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Download, Copy, Check, Loader2, Code, FileJson, Info, ShieldAlert } from 'lucide-react';
import { generateFunctionalSpec } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { readDocumentAsText } from '../../utils/readDocument';
import { friendlyError } from '../../components/ErrorNotice';
import InputNotice from '../../components/InputNotice';
import { markdownToPlainText, buildPdfBlob, buildDocxBlob } from '../../utils/specExport';
import ReactMarkdown from 'react-markdown';

type ExportFormat = 'md' | 'pdf' | 'docx' | 'txt';

const FILE_NAMES: Record<ExportFormat, string> = {
  md: 'functional_spec.md',
  txt: 'functional_spec.txt',
  pdf: 'functional_spec.pdf',
  docx: 'functional_spec.docx',
};

const DocGenerator: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [files, setFiles] = useState<Array<{ name: string; content: string; type: string; size: number }>>([]);
  const [result, setResult] = useState<string | null>(null);
  const [inputNote, setInputNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('md');
  const [uploadMode, setUploadMode] = useState<'single' | 'multi'>('single');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // The file for the selected format, built once and shared by the preview and the download
  // so what you see is exactly what you get.
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  const [previewText, setPreviewText] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { registerActions } = useProtocol();

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    let url: string | null = null;
    setExportError(null);
    setExportBlob(null);
    setPdfUrl(null);

    const build = async () => {
      setExportBusy(true);
      try {
        if (exportFormat === 'md') {
          setExportBlob(new Blob([result], { type: 'text/markdown' }));
        } else if (exportFormat === 'txt') {
          const text = markdownToPlainText(result);
          if (cancelled) return;
          setPreviewText(text);
          setExportBlob(new Blob([text], { type: 'text/plain' }));
        } else if (exportFormat === 'pdf') {
          const blob = buildPdfBlob(result);
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setExportBlob(blob);
        } else {
          const blob = await buildDocxBlob(result);
          // Preview by reading the generated Word file back, so the preview shows
          // the real file's contents rather than a separate rendering of the Markdown.
          const mammoth = await import('mammoth');
          const { value } = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
          if (cancelled) return;
          setPreviewHtml(value);
          setExportBlob(blob);
        }
      } catch (e: any) {
        console.error(`${exportFormat} export failed:`, e);
        if (!cancelled) setExportError(`Couldn't create the ${exportFormat.toUpperCase()} version: ${e?.message || 'unknown error'}. Markdown and Text still work.`);
      } finally {
        if (!cancelled) setExportBusy(false);
      }
    };
    build();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [result, exportFormat]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (uploadedFiles.length === 0) return;
    setUploadError(null);

    let newFiles;
    try {
      newFiles = await Promise.all(
        uploadedFiles.map(async (file) => ({
          name: file.name,
          // .docx and .pdf need a parser; reading them raw gives the model binary noise.
          content: await readDocumentAsText(file),
          type: file.type || 'text/plain',
          size: file.size,
        }))
      );
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to read that file.');
      return;
    }

    if (uploadMode === 'single') {
      setFiles([newFiles[0]]);
    } else {
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const generateDocs = async () => {
    if (files.length === 0) return;
    setStatus('processing');
    setGenerateError(null);
    setInputNote(null);
    setMessage('Analyzing files & generating specification...');
    onAction();

    try {
      const response = await generateFunctionalSpec(files);
      setResult(response.document);
      setInputNote(response.inputNote || null);
      setStatus('success');
      setMessage('Functional specification generated successfully.');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      // Show a real error instead of a fake placeholder document, so a failed run
      // is never mistaken for a real spec.
      setResult(null);
      setGenerateError(
        `The document couldn't be generated: ${friendlyError(error, 'Something went wrong.')} Nothing was created.`
      );
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadOutput = () => {
    if (!exportBlob) return;
    const url = URL.createObjectURL(exportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE_NAMES[exportFormat];
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 font-display flex items-center gap-3">
            <div className="w-10 h-10 neon-bg rounded-xl flex items-center justify-center text-black">
              <FileText size={20} />
            </div>
            Onyx Doc <span className="text-[#0070FF]">Generator</span>
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-2">
            Convert project files (JSON/MD/DOCX/PDF/TXT) to Functional Specification documents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-black/5 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0070FF] flex items-center gap-2">
                <Upload size={16} /> 1. Upload Project Source Files
              </h3>
              <div className="flex items-center gap-1 bg-black/5 p-1 rounded-lg">
                <button 
                  onClick={() => {
                    setUploadMode('single');
                    if (files.length > 1) setFiles([files[0]]);
                  }} 
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors ${uploadMode === 'single' ? 'bg-white text-[#0070FF] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Single File
                </button>
                <button 
                  onClick={() => setUploadMode('multi')} 
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors ${uploadMode === 'multi' ? 'bg-white text-[#0070FF] shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Multi-File
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-zinc-200 hover:border-[#0070FF]/50 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-white/50 group"
              >
                <div className="p-3 bg-zinc-100 group-hover:bg-blue-50 rounded-full transition-colors text-zinc-500 group-hover:text-[#0070FF]">
                  <Upload size={24} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-zinc-700">Click to upload or drag & drop</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">JSON, MD, TXT, DOCX, PDF ({uploadMode === 'multi' ? 'Multiple allowed' : 'Single file only'})</p>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json,.md,.txt,.docx,.pdf"
                multiple={uploadMode === 'multi'}
                onChange={handleFileUpload}
              />

              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-[11px] font-semibold flex items-start gap-2">
                  <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {generateError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-[11px] font-semibold flex items-start gap-2">
                  <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{generateError}</span>
                </div>
              )}

              {files.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 glass border border-black/5 rounded-xl text-[11px] font-bold text-zinc-700">
                      <div className="flex items-center gap-2 truncate">
                        {file.name.endsWith('.json') ? <FileJson size={14} className="text-[#0070FF] shrink-0" /> : <Code size={14} className="text-zinc-500 shrink-0" />}
                        <span className="truncate">{file.name}</span>
                        <span className="text-[9px] text-zinc-400 uppercase">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded-md shrink-0">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={generateDocs}
                disabled={files.length === 0 || status === 'processing'}
                className="w-full py-4 neon-bg text-black rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#0070FF]/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 font-display"
              >
                {status === 'processing' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                {status === 'processing' ? 'Synthesizing...' : 'Generate Documentation'}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-[#0070FF]/5 border border-[#0070FF]/20 rounded-2xl flex gap-3 text-[#0070FF]">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold leading-relaxed">
              Upload multiple JSON topologies or logic files to synthesize a single holistic Functional Spec Document. Excellent for QA handovers and project archivation.
            </p>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-black/5 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0070FF] flex items-center gap-2">
              <Check size={16} /> 2. Generated Output
            </h3>
            
            {result && (
              <div className="flex items-center gap-2">
                <select 
                  className="bg-transparent border border-black/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 py-1.5 outline-none cursor-pointer focus:border-[#0070FF]/50"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                >
                  <option value="md">Markdown (.md)</option>
                  <option value="txt">Text (.txt)</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="docx">Word (.docx)</option>
                </select>
                <button
                  onClick={handleDownloadOutput}
                  disabled={!exportBlob || exportBusy}
                  className="px-3 py-2 rounded-lg glass border border-black/10 text-zinc-600 hover:text-black hover:border-[#0070FF]/30 transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                  title={`Download ${FILE_NAMES[exportFormat]}`}
                >
                  {exportBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  .{exportFormat}
                </button>
                <button onClick={copyToClipboard} className={`p-2 rounded-lg border transition-colors ${copied ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'glass border-black/10 text-zinc-500 hover:text-black hover:border-[#0070FF]/30'}`}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}
          </div>

          {result && inputNote && (
            <div className="mb-4">
              <InputNotice note={inputNote} />
            </div>
          )}

          <div className="flex-1 bg-white border border-black/5 rounded-xl p-6 overflow-y-auto custom-scrollbar shadow-inner relative">
            {status === 'processing' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#0070FF] bg-white/80 backdrop-blur-sm z-10">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synthesizing Architecture...</p>
              </div>
            ) : null}

            {result ? (
              exportError ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-xs font-semibold flex items-start gap-2">
                  <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{exportError}</span>
                </div>
              ) : exportBusy && exportFormat !== 'md' ? (
                <div className="h-full flex flex-col items-center justify-center text-[#0070FF]">
                  <Loader2 size={28} className="animate-spin mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Building {exportFormat.toUpperCase()} preview...</p>
                </div>
              ) : exportFormat === 'txt' ? (
                <pre className="whitespace-pre-wrap font-mono text-[12px] text-zinc-800 leading-relaxed">{previewText}</pre>
              ) : exportFormat === 'pdf' && pdfUrl ? (
                <iframe src={pdfUrl} title="PDF preview" className="w-full h-full min-h-[600px] rounded-lg border border-black/5" />
              ) : exportFormat === 'docx' ? (
                <div
                  className="prose prose-sm max-w-none font-serif"
                  // HTML produced by mammoth from our own generated Word file; mammoth escapes all text content.
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <div className="prose prose-sm max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-[#0070FF] prose-code:text-[#0070FF] prose-code:bg-[#0070FF]/5 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50">
                <FileText size={48} className="mb-4 text-zinc-300" />
                <p className="text-[11px] font-black uppercase tracking-widest text-center">Output will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocGenerator;
