
import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { assessWorkflowArchitecture, generateNodeRoadmap, generateWorkflowJSON } from '../../services/gemini';
import { readDocumentAsText, DOCUMENT_ACCEPT } from '../../utils/readDocument';
import type {
  WorkflowArchitectureDecision, WorkflowArchitectureWorkflow, WorkflowGenerationContext, WorkflowRoadmap, Platform
} from '../../types';
import {
  Loader2, Zap, Download, Key, ChevronDown, ChevronUp,
  ArrowDown, Upload, FileText, GitBranch, Terminal, Table2,
  Info, AlertTriangle, RefreshCw, CheckCircle2
} from 'lucide-react';
import InputNotice from '../../components/InputNotice';
import { checkN8nWorkflow } from '../../utils/n8nNodeCheck';
import { checkMakeBlueprint, cleanMakeBlueprint } from '../../utils/makeModuleCheck';

const PHASE_COLORS = [
  { bg: 'bg-blue-600',    light: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-600 text-white' },
  { bg: 'bg-violet-600',  light: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-600 text-white' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-600 text-white' },
  { bg: 'bg-amber-500',   light: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-500 text-white' },
  { bg: 'bg-rose-600',    light: 'bg-rose-50',     border: 'border-rose-200',    text: 'text-rose-700',    badge: 'bg-rose-600 text-white' },
  { bg: 'bg-teal-600',    light: 'bg-teal-50',     border: 'border-teal-200',    text: 'text-teal-700',    badge: 'bg-teal-600 text-white' },
];

const PHASE_HEX = ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#e11d48', '#0d9488'];
const START_HEX = '#059669';
const END_HEX = '#3f3f46';

const PLATFORM_LABELS: Record<Platform, string> = { n8n: 'n8n', ghl: 'GoHighLevel', make: 'Make.com' };

const PLATFORM_TAGLINE: Record<Platform, string> = {
  n8n:  'a complete phased node-by-node build guide — plus an n8n workflow JSON ready to import',
  ghl:  'a complete phased step-by-step build guide — GHL has no importable workflow JSON format, so this is a manual build guide only',
  make: 'a complete phased module-by-module build guide — plus a best-effort Make.com blueprint JSON ready to import (verify flagged modules after import)',
};

const CREDENTIAL_COLUMN_LABEL: Record<Platform, string> = {
  n8n: 'n8n Type', ghl: 'Connection / Integration', make: 'Make.com Connection',
};

const RELATIONSHIP_LABELS: Record<Platform, Record<string, string>> = {
  n8n:  { standalone: 'Standalone', parent: 'Parent', child: 'Subworkflow' },
  make: { standalone: 'Standalone', parent: 'Parent', child: 'Subscenario' },
  ghl:  { standalone: 'Standalone', parent: 'Parent', child: 'Tag-Triggered' },
};

const RELATIONSHIP_BADGE_CLASSES: Record<string, string> = {
  standalone: 'bg-zinc-200 text-zinc-600',
  parent: 'bg-blue-100 text-blue-700',
  child: 'bg-violet-100 text-violet-700',
};

// ── Overview table row ─────────────────────────────────────────────────────────
const OverviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <tr className="border-b border-zinc-100 last:border-0">
    <td className="py-3 px-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap w-44">{label}</td>
    <td className="py-3 px-5 text-sm text-zinc-700 font-medium">{value}</td>
  </tr>
);

// ── Node card (roadmap view) ───────────────────────────────────────────────────
const NodeCard: React.FC<{ node: any; phaseColor: typeof PHASE_COLORS[0]; isLast: boolean }> = ({ node, phaseColor, isLast }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="relative">
      <div className={`bg-white border ${expanded ? 'border-zinc-200' : 'border-zinc-100'} rounded-2xl shadow-sm overflow-hidden`}>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-50/50 transition-colors"
        >
          <div className="flex items-center gap-4 min-w-0">
            <span className={`w-9 h-9 rounded-xl ${phaseColor.badge} text-sm font-black flex items-center justify-center shrink-0 tabular-nums`}>
              {node.nodeNumber}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-zinc-900 text-base leading-tight">{node.nodeName}</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate">{node.stepType}</p>
            </div>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-zinc-400 shrink-0 ml-4" />
            : <ChevronDown size={16} className="text-zinc-400 shrink-0 ml-4" />}
        </button>

        {expanded && (
          <div className="border-t border-zinc-100">
            <div className={`px-5 py-4 ${phaseColor.light} border-b ${phaseColor.border}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest ${phaseColor.text} mb-1.5`}>In Plain English</p>
              <p className="text-sm font-semibold text-zinc-800 leading-relaxed">{node.inPlainEnglish}</p>
            </div>

            <div className="divide-y divide-zinc-50">
              <div className="px-5 py-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Input</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{node.input}</p>
              </div>

              <div className="px-5 py-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Output</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{node.output}</p>
              </div>

              {node.parameters?.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2.5 flex items-center gap-1.5">
                    <Table2 size={10} /> Parameters
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] border border-zinc-100 rounded-xl overflow-hidden">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                          <th className="px-4 py-2 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest w-2/5">Field</th>
                          <th className="px-4 py-2 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {node.parameters.map((p: any, j: number) => (
                          <tr key={j} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-2.5 font-mono font-semibold text-blue-700 text-[11px]">{p.field}</td>
                            <td className="px-4 py-2.5 text-zinc-600 font-medium">{p.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {node.expressions?.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2.5 flex items-center gap-1.5">
                    <Terminal size={10} /> Expressions
                  </p>
                  <div className="space-y-2">
                    {node.expressions.map((e: any, j: number) => (
                      <div key={j} className="bg-zinc-950 rounded-xl p-3.5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">{e.field}</p>
                        <code className="text-emerald-400 font-mono text-[12px] block leading-relaxed break-all">{e.expression}</code>
                        {e.note && <p className="text-[10px] text-zinc-500 italic mt-2">{e.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {node.branches?.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2.5 flex items-center gap-1.5">
                    <GitBranch size={10} /> Branch Logic
                  </p>
                  <div className="space-y-2">
                    {node.branches.map((b: any, j: number) => (
                      <div key={j} className={`rounded-xl border-l-[3px] px-4 py-3 ${j === 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-zinc-50 border-zinc-300'}`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${j === 0 ? 'text-emerald-700' : 'text-zinc-500'}`}>{b.label}</p>
                        <code className="text-[11px] font-mono text-zinc-700 block mb-1">{b.condition}</code>
                        <p className="text-[10px] text-zinc-500">→ {b.leadsTo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {node.note && (
                <div className="px-5 py-3 bg-amber-50/60 border-t border-amber-100">
                  <p className="text-[12px] text-amber-800 leading-relaxed">
                    <span className="font-black">Note: </span>{node.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isLast && (
        <div className="flex justify-center py-1">
          <ArrowDown size={14} className="text-zinc-300" />
        </div>
      )}
    </div>
  );
};

// ── Visual flowchart ─────────────────────────────────────────────────────────
// Ribbon-style flow: each Start/node/End box is connected to the next by a
// curved gradient ribbon (SVG bezier path) that shifts color as it crosses
// from one phase's color into the next. Positions are measured from the DOM
// after render so the curves always match actual box positions/sizes.
const FlowChart: React.FC<{ result: any }> = ({ result }) => {
  const phases: any[] = result?.phases || [];
  const totalNodes = phases.reduce((acc: number, p: any) => acc + (p.nodes?.length || 0), 0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [ribbons, setRibbons] = useState<{ id: string; d: string; from: string; to: string }[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  const flatColors = useMemo(() => {
    const colors: string[] = [START_HEX];
    phases.forEach((phase: any, pi: number) => {
      const hex = PHASE_HEX[pi % PHASE_HEX.length];
      (phase.nodes || []).forEach(() => colors.push(hex));
    });
    colors.push(END_HEX);
    return colors;
  }, [phases]);

  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const measure = () => {
      const containerRect = containerEl.getBoundingClientRect();
      const items = Array.from(containerEl.querySelectorAll<HTMLElement>('[data-flow-item]'));
      const nextRibbons: { id: string; d: string; from: string; to: string }[] = [];
      for (let i = 0; i < items.length - 1; i++) {
        const a = items[i].getBoundingClientRect();
        const b = items[i + 1].getBoundingClientRect();
        const ax = a.left + a.width / 2 - containerRect.left;
        const ay = a.bottom - containerRect.top;
        const bx = b.left + b.width / 2 - containerRect.left;
        const by = b.top - containerRect.top;
        const midY = (ay + by) / 2;
        nextRibbons.push({
          id: `ribbon-${i}`,
          d: `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`,
          from: flatColors[i] ?? START_HEX,
          to: flatColors[i + 1] ?? END_HEX,
        });
      }
      setRibbons(nextRibbons);
      setSvgSize({ width: containerEl.scrollWidth, height: containerEl.scrollHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerEl);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [flatColors]);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <GitBranch size={11} /> Visual Flowchart
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{totalNodes} nodes · {phases.length} phases</p>
        </div>
      </div>

      <div className="p-8 overflow-x-auto">
        <div ref={containerRef} className="relative flex flex-col items-center min-w-[300px]">

          {svgSize.width > 0 && svgSize.height > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={svgSize.width}
              height={svgSize.height}
              style={{ overflow: 'visible' }}
            >
              <defs>
                {ribbons.map(r => (
                  <linearGradient key={r.id} id={r.id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={r.from} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={r.to} stopOpacity={0.55} />
                  </linearGradient>
                ))}
              </defs>
              {ribbons.map(r => (
                <path key={r.id} d={r.d} fill="none" stroke={`url(#${r.id})`} strokeWidth={28} strokeLinecap="round" />
              ))}
            </svg>
          )}

          {/* START */}
          <div
            data-flow-item
            className="relative z-10 w-28 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-lg"
            style={{ background: START_HEX }}
          >
            Start
          </div>

          {phases.map((phase: any, phaseIdx: number) => {
            const color = PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
            const colorHex = PHASE_HEX[phaseIdx % PHASE_HEX.length];
            return (
              <React.Fragment key={phaseIdx}>
                <div className="relative z-10 h-6" />

                {/* Phase banner */}
                <div className={`relative z-10 ${color.badge} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm mb-3`}>
                  Phase {phaseIdx + 1} — {phase.phaseName}
                </div>

                {(phase.nodes || []).map((node: any, nodeIdx: number) => (
                  <div
                    key={nodeIdx}
                    data-flow-item
                    className="relative z-10 w-80 rounded-2xl p-5 shadow-lg text-white my-4"
                    style={{ background: `linear-gradient(135deg, ${colorHex}, ${colorHex}cc)` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white/20 text-xs font-black flex items-center justify-center shrink-0 tabular-nums">
                        {node.nodeNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base leading-tight">{node.nodeName}</p>
                        <p className="text-[10px] font-mono text-white/70 mt-0.5 truncate">{node.stepType}</p>
                      </div>
                    </div>

                    {node.inPlainEnglish && (
                      <p className="text-[11px] text-white/85 mt-3 leading-relaxed">{node.inPlainEnglish}</p>
                    )}

                    {node.branches?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5">
                        {node.branches.map((b: any, j: number) => (
                          <div key={j} className="flex items-start gap-2 text-[10px] rounded-lg px-2.5 py-1.5 bg-white/10">
                            <span className="font-black shrink-0">{b.label}</span>
                            <span className="font-medium truncate">→ {b.leadsTo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </React.Fragment>
            );
          })}

          {/* END */}
          <div
            data-flow-item
            className="relative z-10 w-28 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-lg mt-3"
            style={{ background: END_HEX }}
          >
            End
          </div>

        </div>
      </div>
    </div>
  );
};

// ── Export helpers ──────────────────────────────────────────────────────────────
const triggerDownload = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

const slugify = (name: string) => (name || 'workflow').replace(/\s+/g, '-').toLowerCase();

const buildRoadmapMarkdown = (wf: WorkflowRoadmap): string => {
  const lines: string[] = [`# ${wf.workflowName}`];
  if (wf.subtitle) lines.push(`_${wf.subtitle}_`);
  lines.push('');
  if (wf.plainEnglishSummary) { lines.push(wf.plainEnglishSummary); lines.push(''); }

  if (wf.overview) {
    const ov = wf.overview;
    lines.push('## Workflow Overview');
    if (ov.trigger) lines.push(`- **Trigger:** ${ov.trigger}`);
    if (ov.output) lines.push(`- **Output:** ${ov.output}`);
    if (ov.deduplication) lines.push(`- **Deduplication:** ${ov.deduplication}`);
    if (ov.errorHandling) lines.push(`- **Error Handling:** ${ov.errorHandling}`);
    if (ov.estimatedBuildTime) lines.push(`- **Est. Build Time:** ${ov.estimatedBuildTime}`);
    if (ov.totalNodes) lines.push(`- **Total Nodes:** ${ov.totalNodes}`);
    if (ov.totalPhases) lines.push(`- **Total Phases:** ${ov.totalPhases}`);
    lines.push('');
  }

  (wf.phases || []).forEach(phase => {
    lines.push(`## Phase ${phase.phaseNumber} — ${phase.phaseName}`);
    if (phase.phaseIntro) { lines.push(phase.phaseIntro); lines.push(''); }
    (phase.nodes || []).forEach(node => {
      lines.push(`### ${node.nodeNumber}. ${node.nodeName}`);
      lines.push(`\`${node.stepType}\``);
      lines.push('');
      lines.push(`**In Plain English:** ${node.inPlainEnglish}`);
      lines.push('');
      lines.push(`**Input:** ${node.input}`);
      lines.push('');
      lines.push(`**Output:** ${node.output}`);
      lines.push('');
      if ((node.parameters || []).length > 0) {
        lines.push('**Parameters:**');
        node.parameters.forEach(p => lines.push(`- \`${p.field}\`: ${p.value}`));
        lines.push('');
      }
      if ((node.expressions || []).length > 0) {
        lines.push('**Expressions:**');
        node.expressions.forEach(e => lines.push(`- \`${e.field}\`: \`${e.expression}\`${e.note ? ` — ${e.note}` : ''}`));
        lines.push('');
      }
      if ((node.branches || []).length > 0) {
        lines.push('**Branch Logic:**');
        node.branches.forEach(b => lines.push(`- **${b.label}:** \`${b.condition}\` → ${b.leadsTo}`));
        lines.push('');
      }
      if (node.note) { lines.push(`> **Note:** ${node.note}`); lines.push(''); }
    });
  });

  if ((wf.credentialsNeeded || []).length > 0) {
    lines.push('## Credentials Needed');
    wf.credentialsNeeded.forEach(c => {
      lines.push(`- **${c.credential}** (\`${c.credentialIdentifier}\`) — ${c.whereToGetIt} _(used in nodes: ${c.usedInNodes})_`);
    });
  }
  return lines.join('\n');
};

const buildFlowchartMarkdown = (wf: WorkflowRoadmap): string => {
  const lines: string[] = [`# ${wf.workflowName} — Flow Sequence`, '', 'START', ''];
  (wf.phases || []).forEach(phase => {
    lines.push(`## Phase ${phase.phaseNumber} — ${phase.phaseName}`);
    (phase.nodes || []).forEach(node => {
      lines.push(`- **${node.nodeNumber}. ${node.nodeName}** (\`${node.stepType}\`)`);
      (node.branches || []).forEach(b => {
        lines.push(`  - ${b.label}: \`${b.condition}\` → ${b.leadsTo}`);
      });
    });
    lines.push('');
  });
  lines.push('END');
  return lines.join('\n');
};

const exportRoadmapPdf = async (wf: WorkflowRoadmap, onError: (msg: string) => void) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;
    const lh = 6.5;
    const pageH = 278;
    const L = 14;
    const W = 182;

    const guard = (needed = 16) => { if (y + needed > pageH) { doc.addPage(); y = 20; } };
    const wrap = (text: string, x: number, w: number, indent = 0) => {
      doc.splitTextToSize(String(text || ''), w - indent).forEach((line: string) => {
        guard();
        doc.text(line, x + indent, y);
        y += lh;
      });
    };

    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(wf.workflowName, L, y); y += 8;
    if (wf.subtitle) { doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.text(wf.subtitle, L, y); y += 8; }

    if (wf.plainEnglishSummary) {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      wrap(wf.plainEnglishSummary, L, W); y += 4;
    }

    if (wf.overview) {
      guard(20);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Workflow Overview', L, y); y += 7;
      doc.setFontSize(9);
      const ov = wf.overview;
      const rows: [string, string | undefined][] = [
        ['Trigger', ov.trigger], ['Output', ov.output], ['Deduplication', ov.deduplication],
        ['Error Handling', ov.errorHandling], ['Est. Build Time', ov.estimatedBuildTime],
        ['Total Nodes', ov.totalNodes ? String(ov.totalNodes) : undefined],
        ['Total Phases', ov.totalPhases ? String(ov.totalPhases) : undefined],
      ];
      rows.forEach(([label, value]) => {
        if (!value) return;
        guard();
        doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, L, y);
        doc.setFont('helvetica', 'normal');
        wrap(value, L + 34, W - 34);
      });
      y += 3;
    }

    (wf.phases || []).forEach(phase => {
      doc.addPage(); y = 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(`Phase ${phase.phaseNumber} — ${phase.phaseName}`, L, y); y += 8;
      if (phase.phaseIntro) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
        wrap(phase.phaseIntro, L, W); y += 3;
      }
      (phase.nodes || []).forEach(node => {
        guard(24);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(`${node.nodeNumber}. ${node.nodeName}`, L, y); y += lh;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(node.stepType, L, y); y += lh;
        doc.setFontSize(9);
        wrap(node.inPlainEnglish, L, W, 2); y += 1;
        guard(); doc.setFont('helvetica', 'bold'); doc.text('Input:', L, y); y += lh;
        doc.setFont('helvetica', 'normal'); wrap(node.input, L, W, 4);
        guard(); doc.setFont('helvetica', 'bold'); doc.text('Output:', L, y); y += lh;
        doc.setFont('helvetica', 'normal'); wrap(node.output, L, W, 4);
        if (node.note) {
          guard();
          doc.setFont('helvetica', 'italic');
          wrap(`Note: ${node.note}`, L, W, 4);
        }
        y += 3;
      });
    });

    if ((wf.credentialsNeeded || []).length > 0) {
      doc.addPage(); y = 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('Credentials Needed', L, y); y += 8;
      wf.credentialsNeeded.forEach(c => {
        guard(20);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(`${c.credential} (${c.credentialIdentifier})`, L, y); y += lh;
        doc.setFont('helvetica', 'normal');
        wrap(c.whereToGetIt, L, W, 4);
        y += 2;
      });
    }

    doc.save(`${slugify(wf.workflowName)}-roadmap.pdf`);
  } catch (err) {
    console.error('Roadmap PDF export failed:', err);
    onError('PDF export failed. Try Markdown instead.');
  }
};

const exportFlowchartPdf = async (wf: WorkflowRoadmap, onError: (msg: string) => void) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;
    const lh = 6.5;
    const pageH = 278;
    const L = 14;
    const W = 182;

    const guard = (needed = 16) => { if (y + needed > pageH) { doc.addPage(); y = 20; } };
    const wrap = (text: string, x: number, w: number, indent = 0) => {
      doc.splitTextToSize(String(text || ''), w - indent).forEach((line: string) => {
        guard();
        doc.text(line, x + indent, y);
        y += lh;
      });
    };

    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(`${wf.workflowName} — Flow Sequence`, L, y); y += 10;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('START', L, y); y += lh + 2;

    (wf.phases || []).forEach(phase => {
      guard(16);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text(`Phase ${phase.phaseNumber} — ${phase.phaseName}`, L, y); y += lh + 1;
      (phase.nodes || []).forEach(node => {
        guard();
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.text(`${node.nodeNumber}. ${node.nodeName} (${node.stepType})`, L + 4, y); y += lh;
        (node.branches || []).forEach(b => {
          guard();
          doc.setFont('helvetica', 'italic');
          wrap(`${b.label}: ${b.condition} -> ${b.leadsTo}`, L + 8, W - 8);
        });
      });
      y += 2;
    });

    guard();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('END', L, y);

    doc.save(`${slugify(wf.workflowName)}-flowchart.pdf`);
  } catch (err) {
    console.error('Flowchart PDF export failed:', err);
    onError('PDF export failed. Try Markdown instead.');
  }
};

// ── Workflow panel — one workflow's roadmap/flowchart/exports/JSON ─────────────
const WorkflowPanel: React.FC<{
  workflow: WorkflowRoadmap;
  platform: Platform;
  view: 'roadmap' | 'flowchart';
  setView: (v: 'roadmap' | 'flowchart') => void;
  exportedJson: any;
  loadingJson: boolean;
  onGenerateJson: () => void;
  onError: (msg: string) => void;
}> = ({ workflow, platform, view, setView, exportedJson, loadingJson, onGenerateJson, onError }) => {
  const jsonLabel = platform === 'make' ? 'Make.com Blueprint' : 'n8n JSON';
  const nodeCheck = useMemo(
    () => (platform === 'n8n' && exportedJson ? checkN8nWorkflow(exportedJson) : null),
    [platform, exportedJson]
  );
  const checkErrors = nodeCheck?.issues.filter(i => i.severity === 'error').length || 0;
  const makeCheck = useMemo(
    () => (platform === 'make' && exportedJson ? checkMakeBlueprint(exportedJson) : null),
    [platform, exportedJson]
  );
  const [showVerified, setShowVerified] = useState(false);
  // Make downloads drop the AI's own "_confidence"/"_notes" fields; the panel shows them instead.
  const downloadJson = platform === 'make' && exportedJson ? cleanMakeBlueprint(exportedJson) : exportedJson;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Title + action bar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-zinc-900">{workflow.workflowName}</h3>
          {workflow.subtitle && <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{workflow.subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">

          {/* View toggle */}
          <div className="flex bg-zinc-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setView('roadmap')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${view === 'roadmap' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Roadmap
            </button>
            <button
              onClick={() => setView('flowchart')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${view === 'flowchart' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              <GitBranch size={11} /> Flowchart
            </button>
          </div>

          <button
            onClick={() => { view === 'flowchart' ? exportFlowchartPdf(workflow, onError) : exportRoadmapPdf(workflow, onError); }}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:border-zinc-400 transition-colors"
          >
            <Download size={13} /> Export PDF
          </button>
          <button
            onClick={() => triggerDownload(
              view === 'flowchart' ? buildFlowchartMarkdown(workflow) : buildRoadmapMarkdown(workflow),
              `${slugify(workflow.workflowName)}-${view}.md`,
              'text/markdown'
            )}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:border-zinc-400 transition-colors"
          >
            <FileText size={13} /> Export MD
          </button>

          {platform !== 'ghl' && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={exportedJson ? () => triggerDownload(JSON.stringify(downloadJson, null, 2), `${slugify(workflow.workflowName)}-${platform}.json`, 'application/json') : onGenerateJson}
                disabled={loadingJson}
                className="flex items-center gap-2 px-4 py-2.5 neon-bg text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {loadingJson
                  ? <><Loader2 className="animate-spin" size={13} /> Building JSON...</>
                  : exportedJson
                    ? <><Download size={13} /> Download {jsonLabel}</>
                    : <><Zap size={13} /> Generate {jsonLabel}</>}
              </button>
              {platform === 'make' && !exportedJson && (
                <p className="text-[10px] text-amber-600 max-w-[220px] text-right leading-snug">
                  Some module names may be AI estimates. After generating, Onyx lists which modules are verified and which to swap manually.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── NODE CHECK (n8n JSON vs n8n's real node list) ── */}
      {nodeCheck && (
        nodeCheck.issues.length === 0 ? (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800">All {nodeCheck.checkedCount} nodes checked: every node type and version is real, and every connection points at a real node.</p>
              <p className="text-[11px] text-emerald-700/80 mt-1">Checked against {nodeCheck.listSource}. Node settings themselves are not checked, so still test the workflow after import.</p>
            </div>
          </div>
        ) : (
          <div className={`p-4 rounded-2xl border ${checkErrors ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${checkErrors ? 'text-red-600' : 'text-amber-600'}`} />
              <div className="space-y-2 min-w-0">
                <p className={`text-sm font-bold ${checkErrors ? 'text-red-800' : 'text-amber-800'}`}>
                  {checkErrors
                    ? `${checkErrors} problem${checkErrors === 1 ? '' : 's'} found in ${nodeCheck.checkedCount} nodes. Fix these before importing, or regenerate the JSON.`
                    : `${nodeCheck.issues.length} thing${nodeCheck.issues.length === 1 ? '' : 's'} to check in ${nodeCheck.checkedCount} nodes.`}
                </p>
                <ul className="space-y-1.5">
                  {nodeCheck.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-zinc-700 leading-relaxed">
                      <span className={`font-black uppercase text-[9px] tracking-wider mr-2 ${issue.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                        {issue.severity === 'error' ? 'Problem' : 'Check'}
                      </span>
                      <span className="font-semibold">{issue.nodeName}:</span> {issue.message}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-zinc-500">Checked against {nodeCheck.listSource}.</p>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── MODULE CHECK (Make blueprint vs real exported blueprints) ── */}
      {makeCheck && (() => {
        const needsAttention = makeCheck.modules.filter(m => m.status !== 'verified');
        const verified = makeCheck.modules.filter(m => m.status === 'verified');
        const bad = makeCheck.counts.problem + makeCheck.problems.length;
        const tone = bad ? 'red' : needsAttention.length ? 'amber' : 'emerald';
        const box = { red: 'bg-red-50 border-red-200', amber: 'bg-amber-50 border-amber-200', emerald: 'bg-emerald-50 border-emerald-200' }[tone];
        const head = { red: 'text-red-800', amber: 'text-amber-800', emerald: 'text-emerald-800' }[tone];
        const label: Record<string, { text: string; cls: string }> = {
          problem: { text: 'Problem', cls: 'text-red-600' },
          swap: { text: 'Swap manually', cls: 'text-amber-600' },
          'version-unconfirmed': { text: 'Check version', cls: 'text-amber-600' },
        };
        return (
          <div className={`p-4 rounded-2xl border ${box}`}>
            <div className="flex items-start gap-3">
              {tone === 'emerald'
                ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                : <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${tone === 'red' ? 'text-red-600' : 'text-amber-600'}`} />}
              <div className="space-y-2 min-w-0 flex-1">
                <p className={`text-sm font-bold ${head}`}>
                  {verified.length} of {makeCheck.modules.length} modules verified as real Make modules.
                  {needsAttention.length > 0 && ` ${needsAttention.length} need${needsAttention.length === 1 ? 's' : ''} your attention after import.`}
                </p>
                {(needsAttention.length > 0 || makeCheck.problems.length > 0) && (
                  <ul className="space-y-1.5">
                    {needsAttention.map((m, i) => (
                      <li key={i} className="text-xs text-zinc-700 leading-relaxed">
                        <span className={`font-black uppercase text-[9px] tracking-wider mr-2 ${label[m.status].cls}`}>{label[m.status].text}</span>
                        <span className="font-semibold">Module {m.id} · {m.module}{m.version !== null ? ` v${m.version}` : ''}:</span> {m.message}
                        {m.aiNote && <span className="block text-[11px] text-zinc-500 mt-0.5">AI's own note: {m.aiNote}</span>}
                      </li>
                    ))}
                    {makeCheck.problems.map((p, i) => (
                      <li key={`p${i}`} className="text-xs text-zinc-700 leading-relaxed">
                        <span className="font-black uppercase text-[9px] tracking-wider mr-2 text-red-600">Problem</span>{p}
                      </li>
                    ))}
                  </ul>
                )}
                {verified.length > 0 && (
                  <div>
                    <button onClick={() => setShowVerified(v => !v)} className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 underline">
                      {showVerified ? 'Hide' : 'Show'} the {verified.length} verified module{verified.length === 1 ? '' : 's'}
                    </button>
                    {showVerified && (
                      <ul className="mt-1.5 space-y-0.5">
                        {verified.map((m, i) => (
                          <li key={i} className="text-[11px] text-emerald-800">✓ Module {m.id} · {m.module} v{m.version}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-zinc-500">
                  Checked against real exported Make blueprints (your own, public ones, and Make's official examples). Module settings are not checked. The downloaded file has the AI's confidence notes removed.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── FLOWCHART VIEW ── */}
      {view === 'flowchart' && (
        <FlowChart result={workflow} />
      )}

      {/* ── ROADMAP VIEW ── */}
      {view === 'roadmap' && (
        <div className="space-y-10">

          {workflow.plainEnglishSummary && (
            <div className="bg-[#0070FF]/5 border border-[#0070FF]/15 rounded-2xl p-6">
              <p className="text-base text-zinc-700 leading-relaxed font-medium">{workflow.plainEnglishSummary}</p>
            </div>
          )}

          {workflow.overview && (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Workflow Overview</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {workflow.overview.trigger           && <OverviewRow label="Trigger"          value={workflow.overview.trigger} />}
                    {workflow.overview.output            && <OverviewRow label="Output"           value={workflow.overview.output} />}
                    {workflow.overview.deduplication     && <OverviewRow label="Deduplication"    value={workflow.overview.deduplication} />}
                    {workflow.overview.errorHandling     && <OverviewRow label="Error Handling"   value={workflow.overview.errorHandling} />}
                    {workflow.overview.estimatedBuildTime && <OverviewRow label="Est. Build Time" value={workflow.overview.estimatedBuildTime} />}
                    {workflow.overview.totalNodes        && <OverviewRow label={platform === 'ghl' ? 'Total Steps' : platform === 'make' ? 'Total Modules' : 'Total Nodes'} value={String(workflow.overview.totalNodes)} />}
                    {workflow.overview.totalPhases       && <OverviewRow label="Total Phases"     value={String(workflow.overview.totalPhases)} />}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {workflow.phases?.map((phase: any, pi: number) => {
            const color = PHASE_COLORS[pi % PHASE_COLORS.length];
            return (
              <div key={pi} className="space-y-4">
                <div className={`${color.bg} rounded-2xl px-6 py-5`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Phase {phase.phaseNumber}</p>
                  <h4 className="text-lg font-black text-white leading-tight">{phase.phaseName}</h4>
                  {phase.phaseIntro && <p className="text-sm text-white/80 mt-2 leading-relaxed font-medium">{phase.phaseIntro}</p>}
                </div>
                <div className="pl-4 border-l-2 border-zinc-100 ml-1">
                  {phase.nodes?.map((node: any, ni: number) => (
                    <NodeCard key={ni} node={node} phaseColor={color} isLast={ni === phase.nodes.length - 1} />
                  ))}
                </div>
              </div>
            );
          })}

          {workflow.credentialsNeeded?.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-amber-100 bg-amber-50">
                <div className="flex items-center gap-2">
                  <Key size={12} className="text-amber-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Credentials Needed</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">Credential</th>
                      <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">{CREDENTIAL_COLUMN_LABEL[platform]}</th>
                      <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">Where to Get It</th>
                      <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">Used in Nodes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {workflow.credentialsNeeded.map((cred: any, i: number) => (
                      <tr key={i} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-semibold text-zinc-900">{cred.credential}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{cred.credentialIdentifier}</td>
                        <td className="px-4 py-3 text-zinc-600">{cred.whereToGetIt}</td>
                        <td className="px-4 py-3 text-zinc-500 font-mono text-[10px]">{cred.usedInNodes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const NodeRoadmap: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [projectDoc, setProjectDoc] = useState('');
  const [platform, setPlatform] = useState<Platform>('n8n');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [view, setView] = useState<'roadmap' | 'flowchart'>('roadmap');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [architecture, setArchitecture] = useState<WorkflowArchitectureDecision | null>(null);
  const [roadmaps, setRoadmaps] = useState<Record<string, WorkflowRoadmap>>({});
  const [roadmapErrors, setRoadmapErrors] = useState<Record<string, string>>({});
  // "Part of your document was left out" notes, kept apart from the result objects so they
  // never reach exports or get forwarded back to the server with the roadmap.
  const [architectureNote, setArchitectureNote] = useState<string | undefined>(undefined);
  const [roadmapNotes, setRoadmapNotes] = useState<Record<string, string | undefined>>({});
  const [exportedJsonByWorkflow, setExportedJsonByWorkflow] = useState<Record<string, any>>({});
  const [loadingJsonFor, setLoadingJsonFor] = useState<string | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    try {
      setProjectDoc(await readDocumentAsText(file));
    } catch (err: any) {
      setError(err?.message || 'Failed to read that file.');
    }
  };

  const buildWorkflowContext = (
    wf: WorkflowArchitectureWorkflow,
    allWorkflows: WorkflowArchitectureWorkflow[]
  ): WorkflowGenerationContext => ({
    workflowName: wf.workflowName,
    purpose: wf.purpose,
    trigger: wf.trigger,
    relationship: wf.relationship,
    relatedWorkflowId: wf.relatedWorkflowId,
    relatedWorkflowName: wf.relatedWorkflowId
      ? allWorkflows.find(w => w.workflowId === wf.relatedWorkflowId)?.workflowName ?? null
      : null,
    relationshipReason: wf.relationshipReason,
  });

  const handleGenerate = async () => {
    if (!projectDoc.trim()) return;
    setLoading(true);
    setError(null);
    setArchitecture(null);
    setRoadmaps({});
    setRoadmapErrors({});
    setArchitectureNote(undefined);
    setRoadmapNotes({});
    setExportedJsonByWorkflow({});
    setActiveWorkflowId(null);
    setView('roadmap');
    try {
      setGenProgress({ current: 0, total: 1, label: 'Assessing workflow architecture...' });
      const { inputNote: archNote, ...decisionData } = await assessWorkflowArchitecture(projectDoc, platform);
      const decision = decisionData as WorkflowArchitectureDecision;
      setArchitecture(decision);
      setArchitectureNote(archNote);
      setActiveWorkflowId(decision.workflows[0]?.workflowId ?? null);

      const isMulti = decision.workflows.length > 1;
      for (let i = 0; i < decision.workflows.length; i++) {
        const wf = decision.workflows[i];
        setGenProgress({ current: i + 1, total: decision.workflows.length, label: `Generating ${wf.workflowName} (${i + 1} of ${decision.workflows.length})...` });
        try {
          const ctx = isMulti ? buildWorkflowContext(wf, decision.workflows) : undefined;
          const { inputNote, ...data } = await generateNodeRoadmap(projectDoc, platform, ctx);
          setRoadmaps(prev => ({ ...prev, [wf.workflowId]: data as WorkflowRoadmap }));
          setRoadmapNotes(prev => ({ ...prev, [wf.workflowId]: inputNote }));
        } catch (err: any) {
          setRoadmapErrors(prev => ({ ...prev, [wf.workflowId]: err?.message || 'Generation failed for this workflow.' }));
        }
      }
      onAction();
    } catch (err: any) {
      setError(err?.message || 'Architecture assessment failed.');
    } finally {
      setLoading(false);
      setGenProgress(null);
    }
  };

  const handleRegenerateWorkflow = async (workflowId: string) => {
    if (!architecture) return;
    const wf = architecture.workflows.find(w => w.workflowId === workflowId);
    if (!wf) return;
    setRoadmapErrors(prev => {
      const next = { ...prev };
      delete next[workflowId];
      return next;
    });
    setGenProgress({ current: 1, total: 1, label: `Regenerating ${wf.workflowName}...` });
    try {
      const isMulti = architecture.workflows.length > 1;
      const ctx = isMulti ? buildWorkflowContext(wf, architecture.workflows) : undefined;
      const { inputNote, ...data } = await generateNodeRoadmap(projectDoc, platform, ctx);
      setRoadmaps(prev => ({ ...prev, [workflowId]: data as WorkflowRoadmap }));
      setRoadmapNotes(prev => ({ ...prev, [workflowId]: inputNote }));
    } catch (err: any) {
      setRoadmapErrors(prev => ({ ...prev, [workflowId]: err?.message || 'Generation failed for this workflow.' }));
    } finally {
      setGenProgress(null);
    }
  };

  const handleGenerateJson = async (workflowId: string) => {
    const wf = roadmaps[workflowId];
    if (!wf || !architecture) return;
    setLoadingJsonFor(workflowId);
    try {
      const archWf = architecture.workflows.find(w => w.workflowId === workflowId);
      const isMulti = architecture.workflows.length > 1;
      const ctx = archWf && isMulti ? buildWorkflowContext(archWf, architecture.workflows) : undefined;
      const data = await generateWorkflowJSON(wf, platform, ctx);
      setExportedJsonByWorkflow(prev => ({ ...prev, [workflowId]: data }));
    } catch (err: any) {
      setError(err?.message || 'JSON generation failed.');
    } finally {
      setLoadingJsonFor(null);
    }
  };

  const activeWorkflow = activeWorkflowId ? roadmaps[activeWorkflowId] : null;
  const activeWorkflowError = activeWorkflowId ? roadmapErrors[activeWorkflowId] : null;
  const isMultiWorkflow = (architecture?.workflows.length || 0) > 1;
  const activeInputNote = (activeWorkflowId && roadmapNotes[activeWorkflowId]) || architectureNote;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Zap size={16} className="text-[#0070FF] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Node-by-Node Generator</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none">
          Workflow <span className="text-[#0070FF]">Roadmap</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">
          Paste your 3DX or project document and get {PLATFORM_TAGLINE[platform]}.
          {' '}The tool also decides whether your project needs one workflow or several, and explains why.
        </p>
      </header>

      {/* Input */}
      <div
        className={`bg-white p-6 rounded-2xl border shadow-lg space-y-4 transition-all ${isDragging ? 'border-[#0070FF] ring-2 ring-dashed ring-[#0070FF] bg-blue-50/20' : 'border-zinc-200'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Project Document</label>
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-100 rounded-xl p-1 gap-1">
              {(['n8n', 'ghl', 'make'] as Platform[]).map(p => (
                <button
                  key={p}
                  disabled={loading}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none ${platform === p ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#0070FF] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Upload size={10} /> Import File
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={DOCUMENT_ACCEPT}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {isDragging && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <FileText className="text-[#0070FF] animate-bounce" size={28} />
            <span className="text-xs font-bold text-[#0070FF] uppercase tracking-wider">Drop your project document here</span>
          </div>
        )}

        <textarea
          className="w-full h-52 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-black text-sm focus:outline-none focus:border-[#0070FF] transition-all resize-y placeholder:text-zinc-400"
          placeholder="Paste your 3DX project document, delivery brief, or workflow description here — or drag and drop a .txt, .md, .docx, or .pdf file..."
          value={projectDoc}
          onChange={(e) => setProjectDoc(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3">
          {loading && genProgress && (
            <span className="text-[11px] font-semibold text-zinc-500">{genProgress.label}</span>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading || !projectDoc.trim()}
            className="px-6 neon-bg text-black font-black py-3 rounded-xl flex items-center gap-2 hover:scale-[1.01] active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none font-display"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Zap size={14} /> Generate Roadmap</>}
          </button>
        </div>
      </div>

      {/* Architecture assessment failure */}
      {error && !architecture && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
            >
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        </div>
      )}

      {architecture && (
        <div className="space-y-6 animate-in fade-in duration-500">

          <InputNotice note={activeInputNote} />

          {/* JSON generation error (surfaced globally since it can happen on any tab) */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Reasoning banner */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 flex gap-3">
            <Info size={16} className="text-[#0070FF] shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {isMultiWorkflow ? `Split into ${architecture.workflows.length} workflows` : 'Single workflow'}
              </p>
              <p className="text-sm text-zinc-700 leading-relaxed">{architecture.reasoning}</p>
              {isMultiWorkflow && (
                <ul className="text-xs text-zinc-500 space-y-1 pt-1">
                  {architecture.workflows.filter(w => w.relationship !== 'standalone' && w.relatedWorkflowId).map(w => {
                    const related = architecture.workflows.find(x => x.workflowId === w.relatedWorkflowId);
                    return (
                      <li key={w.workflowId}>
                        <span className="font-semibold text-zinc-700">{w.workflowName}</span>
                        {' — '}{w.relationship === 'child' ? 'called by' : 'calls'} <span className="font-semibold text-zinc-700">{related?.workflowName}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Tab bar (multi-workflow only) */}
          {isMultiWorkflow && (
            <div className="flex flex-wrap gap-2">
              {architecture.workflows.map(wf => {
                const isActive = wf.workflowId === activeWorkflowId;
                const hasError = !!roadmapErrors[wf.workflowId];
                return (
                  <button
                    key={wf.workflowId}
                    onClick={() => setActiveWorkflowId(wf.workflowId)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${isActive ? 'bg-white border-[#0070FF] text-zinc-900 shadow-sm' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
                  >
                    {hasError && <AlertTriangle size={12} className="text-red-500" />}
                    {wf.workflowName}
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${RELATIONSHIP_BADGE_CLASSES[wf.relationship]}`}>
                      {RELATIONSHIP_LABELS[platform][wf.relationship]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active workflow content */}
          {activeWorkflowError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-red-700 font-medium">{activeWorkflowError}</p>
                <button
                  onClick={() => activeWorkflowId && handleRegenerateWorkflow(activeWorkflowId)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <RefreshCw size={11} /> Regenerate this workflow
                </button>
              </div>
            </div>
          ) : activeWorkflow ? (
            <WorkflowPanel
              workflow={activeWorkflow}
              platform={platform}
              view={view}
              setView={setView}
              exportedJson={activeWorkflowId ? exportedJsonByWorkflow[activeWorkflowId] : null}
              loadingJson={loadingJsonFor === activeWorkflowId}
              onGenerateJson={() => activeWorkflowId && handleGenerateJson(activeWorkflowId)}
              onError={setError}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-medium">{genProgress?.label || 'Generating...'}</span>
            </div>
          ) : null}

        </div>
      )}
    </div>
  );
};

export default NodeRoadmap;
