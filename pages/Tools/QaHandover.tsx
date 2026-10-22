import React, { useState, useRef } from 'react';
import { generateQaTestScript } from '../../services/gemini';
import { readDocumentAsText } from '../../utils/readDocument';
import InputNotice from '../../components/InputNotice';
import { 
  Loader2, 
  Beaker, 
  ShieldAlert, 
  Zap,
  Upload, 
  FileText, 
  ClipboardCheck, 
  ArrowRight,
  Sparkles,
  Layers,
  Check,
  Play
} from 'lucide-react';

const MarkdownWorkbookRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const renderedElements: React.JSX.Element[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      renderedElements.push(
        <div key={`table-${key}`} className="my-6 overflow-x-auto border border-black/5 rounded-xl shadow-md glass">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black/5 border-b border-black/5">
                {tableHeaders.map((h, i) => (
                  <th key={i} className="p-4 font-black text-zinc-800 uppercase tracking-wider font-sans">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-sans">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#0070FF]/5 transition-all text-zinc-800">
                  {row.map((cell, cIdx) => {
                    const txt = cell.trim();
                    const isPass = txt.includes('✅') || txt === 'Pass/Confirmed:' || txt.startsWith('Pass') || txt.startsWith('✓') || txt === '✓';
                    const isFail = txt.includes('❌');
                    const isWarn = txt.includes('⚠️');
                    return (
                      <td key={cIdx} className="p-4 leading-relaxed font-medium">
                        {isPass ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-550/10 px-2.5 py-0.5 rounded border border-emerald-500/20 uppercase text-[9px] font-black tracking-wide">
                            {txt}
                          </span>
                        ) : isFail ? (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-550/10 px-2.5 py-0.5 rounded border border-red-500/20 uppercase text-[9px] font-black tracking-wide">
                            {txt}
                          </span>
                        ) : isWarn ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-555/10 px-2.5 py-0.5 rounded border border-amber-500/20 uppercase text-[9px] font-black tracking-wide">
                            {txt}
                          </span>
                        ) : txt === 'CRITICAL' ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-500/15 px-2.5 py-0.5 rounded border border-rose-500/20 uppercase text-[9px] font-black tracking-wide">
                            CRITICAL
                          </span>
                        ) : txt === 'HIGH' ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-500/20 uppercase text-[9px] font-black tracking-wide">
                            HIGH
                          </span>
                        ) : txt === 'MEDIUM' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-500/15 px-2.5 py-0.5 rounded border border-blue-500/20 uppercase text-[9px] font-black tracking-wide">
                            MEDIUM
                          </span>
                        ) : (
                          txt
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return '';
    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-zinc-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-black/5 rounded text-[10px] font-mono font-bold text-[#0070FF]">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-zinc-800">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line is a table divider or row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1);
      
      const isSeparator = cells.every(c => {
        const cleaned = c.trim().replace(/:/g, '');
        return cleaned.length > 0 && cleaned.split('').every(ch => ch === '-');
      });
      
      if (isSeparator) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable(String(i));
      }
    }

    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h1 key={i} className="text-xl font-bold text-black tracking-tight mt-8 mb-4 font-sans uppercase border-b border-black/10 pb-2">
          {renderFormattedText(trimmed.substring(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h2 key={i} className="text-sm font-bold text-black tracking-tight mt-6 mb-3 font-sans uppercase flex items-center gap-2 border-b border-black/5 pb-1.5">
          <div className="w-1 h-3.5 bg-[#0070FF] rounded-full text-[#0070FF]" />
          {renderFormattedText(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3 key={i} className="text-xs font-black text-[#0070FF] tracking-widest mt-4 mb-2 font-sans uppercase">
          {renderFormattedText(trimmed.substring(4))}
        </h3>
      );
    } else if (trimmed.startsWith('⚠️') || trimmed.startsWith('> ')) {
      const textOnly = trimmed.replace(/^[⚠️>\s]+/, '');
      renderedElements.push(
        <div key={i} className="my-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 shadow-md">
          <span className="text-base shrink-0">⚠️</span>
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest font-sans mb-1">Critical Rollout Gate Warning</p>
            <p className="text-xs text-zinc-800 leading-relaxed font-sans font-semibold">{renderFormattedText(textOnly)}</p>
          </div>
        </div>
      );
    } else {
      // Check if it is a list bullet (e.g. starting with - [x], * [ ], - , * , •, ✓)
      const bulletMatch = trimmed.match(/^([✓•\-*])\s+(\[[ xX]\])?\s*(.*)$/);
      if (bulletMatch) {
        const hasCheckbox = !!bulletMatch[2];
        const isChecked = hasCheckbox && (bulletMatch[2].includes('x') || bulletMatch[2].includes('X'));
        const textContent = bulletMatch[3];

        renderedElements.push(
          <div key={i} className="flex items-start gap-2.5 my-1.5 pl-2">
            {hasCheckbox ? (
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                isChecked 
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600' 
                  : 'bg-black/5 border-black/10 text-transparent'
              }`}>
                {isChecked && <Check size={10} className="stroke-[3]" />}
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
            )}
            <p className="text-xs text-zinc-700 leading-relaxed font-medium font-sans">
              {renderFormattedText(textContent)}
            </p>
          </div>
        );
      } else if (trimmed === '') {
        continue;
      } else {
        renderedElements.push(
          <p key={i} className="text-xs text-zinc-650 leading-relaxed font-sans font-medium my-1.5">
            {renderFormattedText(trimmed)}
          </p>
        );
      }
    }
  }

  if (inTable) {
    flushTable('end');
  }

  return <div className="space-y-2.5 max-w-full pb-6">{renderedElements}</div>;
};

const QaHandover: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [handoverDoc, setHandoverDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'workbook' | 'scenarios' | 'script'>('workbook');

  // Load pdfjs-dist via script tag dynamically
  const loadPdfJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        try {
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            reject(new Error('PDF parser library loaded but global pdfjsLib is undefined'));
            return;
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          resolve(pdfjsLib);
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => reject(new Error('Failed to load PDF parser library'));
      document.head.appendChild(script);
    });
  };

  const handleGenerate = async () => {
    if (!handoverDoc.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await generateQaTestScript(handoverDoc);
      setResult(data);
      if (onAction) onAction();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to compile handover testing script. Ensure valid specification characters or supply a less complex blueprint schema.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWorkbook = () => {
    if (!result?.markdownWorkbook) return;
    const element = document.createElement("a");
    const file = new Blob([result.markdownWorkbook], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${result.projectName?.replace(/\s+/g, '_') || "Onyx_QA_Workbook"}_QA_Workbook.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    setErrorMsg('');
    const isDocPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    if (isDocPdf) {
      setIsParsingPdf(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        try {
          const pdfjsLib = await loadPdfJS() as any;
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Sort items by vertical position descending (top to bottom), then by horizontal position ascending
            const items = [...textContent.items];
            items.sort((a: any, b: any) => {
              if (!a.transform || !b.transform) return 0;
              const yDiff = b.transform[5] - a.transform[5];
              if (Math.abs(yDiff) > 5) return yDiff; // top first
              return a.transform[4] - b.transform[4]; // left to right
            });

            let pageText = '';
            let lastY: number | null = null;
            for (const item of items) {
              if (lastY !== null && item.transform && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
              }
              pageText += item.str + ' ';
              if (item.transform) lastY = item.transform[5];
            }
            fullText += pageText.trim() + '\n\n';
          }
          const cleanedText = fullText.trim();
          if (cleanedText) {
            setHandoverDoc(cleanedText);
          } else {
            setErrorMsg('PDF file parsed successfully, but no readable text content was detected.');
          }
        } catch (err: any) {
          console.error(err);
          setErrorMsg('Failed to parse PDF file. Please copy-paste the text content directly instead.');
        } finally {
          setIsParsingPdf(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      readDocumentAsText(file)
        .then(setHandoverDoc)
        .catch(err => setErrorMsg(err?.message || 'Failed to read that file.'));
    }
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <ClipboardCheck size={16} className="text-[#0070FF] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Auto Handover QA Engineer</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Onyx <span className="text-[#0070FF]">QA Lab</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl leading-relaxed">
          Upload handovers, specifications, or blueprint files. Onyx instantly structures functional test cases, and QA checklists.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: Input & controls */}
        <div className="space-y-6">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-6 rounded-2xl border transition-all duration-300 relative space-y-6 ${
              isDragging 
                ? 'border-[#0070FF] bg-[#0070FF]/5 shadow-2xl scale-[1.01]' 
                : 'glass border-black/5 shadow-xl'
            }`}
          >
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-zinc-650 uppercase tracking-[0.4em]">Handover Spec Sheet</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] hover:text-black bg-[#0070FF]/5 hover:bg-[#0070FF]/10 px-3 py-1.5 rounded-lg border border-[#0070FF]/20 transition-all cursor-pointer"
              >
                Upload File
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".txt,.md,.json,.pdf,.csv,.docx"
              />
            </div>

            <div className="relative">
              <textarea
                className="w-full h-80 bg-white border border-black/5 rounded-xl p-6 text-black text-sm focus:outline-none focus:border-[#0070FF] transition-all resize-none font-sans leading-relaxed custom-scrollbar placeholder:text-zinc-400"
                placeholder="# Project Handover Template&#10;System describes dynamic microservice, event broker hooks, databases, auth requirements, or custom rules..."
                value={handoverDoc}
                onChange={(e) => setHandoverDoc(e.target.value)}
                disabled={isParsingPdf}
              />
              {isParsingPdf && (
                <div className="absolute inset-0 bg-white/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-[#0070FF]" size={24} />
                  <div className="text-center">
                    <p className="text-xs font-bold text-zinc-900 font-sans">Extracting PDF layout & text</p>
                    <p className="text-[10px] text-zinc-400 font-semibold font-sans mt-0.5">Please wait, converting document pages...</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !handoverDoc.trim()}
              className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all text-xs uppercase tracking-[0.4em] shadow-lg disabled:opacity-40 cursor-pointer font-display"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Analyzing Specification...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> GENERATE QA TEST PLAN
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-xs font-sans font-semibold leading-relaxed flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Side: Render Result Desk or Placeholder */}
        <div className="overflow-y-auto max-h-[900px] pr-1">
          {(!result && !loading) ? (
            <div className="h-full border-2 border-dashed border-black/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 p-12 text-center glass min-h-[500px]">
              <ClipboardCheck size={40} className="opacity-10 text-[#0070FF] mb-6" />
              <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2">Neural QA Sandbox Idle</p>
              <p className="text-xs text-zinc-550 max-w-xs leading-relaxed font-sans font-medium">
                Upload or paste a project specification workflow to instantly produce professional engineering audit vectors.
              </p>
            </div>
          ) : loading ? (
            <div className="h-full border border-black/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 p-12 text-center glass min-h-[400px] space-y-4">
              <Loader2 size={40} className="text-[#0070FF] animate-spin" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2">Refining Testing Scripts</p>
                <p className="text-xs text-zinc-550 max-w-xs leading-relaxed font-sans font-medium">
                  Studying boundaries, state-machines, network payloads, and compiling standard automation blocks.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <InputNotice note={result.inputNote} />

              {/* Project Header details card */}
              <div className="p-6 glass border border-[#0070FF]/20 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#0070FF] rounded-full blur-[80px] -z-10 opacity-5" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-4">
                  <div>
                    <span className="text-[9px] font-black text-[#0070FF] uppercase tracking-[0.3em] block mb-1">Project Scoped</span>
                    <h3 className="text-2xl font-semibold text-black tracking-tight leading-none">{result.projectName}</h3>
                  </div>
                  <div>
                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-black/5 text-zinc-850 rounded-lg inline-block border border-black/5">
                      {result.platform}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] block mb-1.5">System Digest</span>
                  <p className="text-sm text-zinc-650 leading-relaxed font-sans font-medium">{result.description}</p>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-black/5 gap-2">
                {[
                  { id: 'workbook', label: '📋 QA Workbook' },
                  { id: 'scenarios', label: '🔍 Scenario Vectors' },
                  { id: 'script', label: '✅ Checklist' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 pb-3 text-[11px] font-black uppercase tracking-widest text-center border-b-2 transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'border-[#0070FF] text-[#0070FF]'
                        : 'border-transparent text-zinc-400 hover:text-black'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content 1: Full Workbook */}
              {activeTab === 'workbook' && (
                <div className="space-y-4 animate-in fade-in-40 duration-200">
                  <div className="flex items-center justify-between border-b border-black/5 pb-3">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] block px-1">
                      Complete Quality Audit Dossier
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadWorkbook}
                      className="px-3.5 py-2 bg-black text-white hover:bg-black/90 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer font-sans"
                    >
                      <FileText size={12} /> Export Markdown (.md)
                    </button>
                  </div>
                  <div className="p-8 glass rounded-2xl border border-black/5 shadow-2xl overflow-x-hidden min-h-[400px]">
                    <MarkdownWorkbookRenderer content={result.markdownWorkbook || ""} />
                  </div>
                </div>
              )}

              {/* Tab Content 2: Interactive Scenarios */}
              {activeTab === 'scenarios' && (
                <div className="space-y-4 animate-in fade-in-40 duration-200">
                  <div className="flex items-center gap-2.5 px-1 pb-2">
                    <Layers size={14} className="text-[#0070FF]" />
                    <span className="text-[10px] font-black text-zinc-650 uppercase tracking-[0.3em] block font-sans">Isolated Testing Vectors</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {result.testScenarios?.map((sc: any, idx: number) => {
                      const priorityColor = 
                        sc.priority?.toLowerCase() === 'high' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                        sc.priority?.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-black/5 text-zinc-650 border-black/5';
  
                      return (
                        <div key={idx} className="p-5 glass rounded-xl border border-black/5 hover:border-[#0070FF]/25 space-y-4 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-sm font-semibold text-black tracking-tight leading-snug">{sc.title}</h4>
                              <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border ${priorityColor} shrink-0`}>
                                {sc.priority}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 leading-relaxed font-sans font-medium">{sc.description}</p>
                          </div>
                          
                          <div className="pt-4 mt-4 border-t border-black/5">
                            <span className="text-[9px] font-black text-[#0070FF] uppercase tracking-[0.3em] block mb-1">Expected Asset / Assert</span>
                            <span className="text-xs text-black leading-normal block font-semibold font-sans italic">"{sc.expectedResult}"</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Content 3: Runner code / Manual actions */}
              {activeTab === 'script' && (
                <div className="space-y-6 animate-in fade-in-40 duration-200">
                  {/* QA Check list */}
                  <div className="p-6 glass rounded-2xl border border-black/5 space-y-4 shadow-xl">
                    <span className="text-[10px] font-black text-zinc-550 uppercase tracking-[0.3em] block px-1">Verification Checklist</span>
                    <div className="space-y-3">
                      {result.verificationChecklist?.map((check: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-4">
                          <div className="w-5 h-5 rounded-full bg-[#0070FF]/10 text-[#0070FF] border border-[#0070FF]/25 flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={10} className="font-extrabold" />
                          </div>
                          <span className="text-sm text-zinc-700 leading-relaxed font-medium font-sans">{check}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QaHandover;
