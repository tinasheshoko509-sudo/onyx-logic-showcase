
import React, { useState } from 'react';
import { Shield, Lightbulb, BarChart3, Copy, Check } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import AuditFindingsList from '../components/AuditFindingsList';
import { normalizeFindings } from '../utils/auditScore';
const { Link } = ReactRouterDOM as any;

interface StoredAudit {
  score: number;
  scoreBreakdown?: string;
  scenario: string;
  findings: unknown[]; // old audits stored plain strings; normalizeFindings handles both
  recommendations: string[];
  correctedTopology: string;
  timestamp: number;
}

const SCENARIO_LABELS: Record<string, string> = {
  'lead-gen': 'Lead Generation',
  'data-sync': 'SaaS Data Sync',
  'ecommerce': 'E-commerce Logic',
  'customer-support': 'AI Support Bot',
  'custom': 'Custom Logic',
};

const LastAudit: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const raw = localStorage.getItem('onyx_last_audit');
  let audit: StoredAudit | null = null;
  if (raw) {
    try { audit = JSON.parse(raw); } catch {}
  }

  const copyTopology = () => {
    if (!audit) return;
    navigator.clipboard.writeText(audit.correctedTopology).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!audit) {
    return (
      <div className="space-y-8 pb-12 animate-in fade-in duration-700">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#0070FF]" />
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-none font-display">
              Last <span className="text-[#0070FF]">Audit</span>
            </h2>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
            Most Recent Efficiency Auditor Run
          </p>
        </header>
        <div className="text-center py-20 border border-dashed border-zinc-200 rounded-2xl space-y-4">
          <BarChart3 size={40} className="mx-auto text-zinc-200" />
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">No audit run yet</p>
          <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
            Run the Efficiency Auditor to see your results here.
          </p>
          <Link
            to="/auditor"
            className="inline-block mt-2 px-5 py-2.5 bg-[#0070FF] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#005ACC] transition-colors"
          >
            Open Auditor
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(audit.timestamp).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const scoreColor = audit.score >= 80 ? 'text-emerald-500' : audit.score >= 60 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = audit.score >= 80 ? 'bg-emerald-50 border-emerald-200' : audit.score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#0070FF]" />
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-none font-display">
              Last <span className="text-[#0070FF]">Audit</span>
            </h2>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
            {SCENARIO_LABELS[audit.scenario] ?? audit.scenario} · {date}
          </p>
        </div>
        <Link
          to="/auditor"
          className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-[#0070FF]/30 text-[#0070FF] hover:bg-[#0070FF]/5 transition-colors"
        >
          Run New Audit
        </Link>
      </header>

      {/* Score */}
      <div className={`flex items-center gap-6 p-6 rounded-2xl border ${scoreBg}`}>
        <div className={`text-6xl font-semibold tracking-tight ${scoreColor}`}>
          {audit.score}<span className="text-2xl"> / 100</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-700">Logic Integrity Score</p>
          {audit.scoreBreakdown && <p className="text-xs font-mono text-zinc-600 mt-1">{audit.scoreBreakdown}</p>}
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
            {audit.score >= 80 ? 'Strong — minimal structural issues' : audit.score >= 60 ? 'Moderate — optimizations recommended' : 'Critical — significant issues found'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Findings */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-xl space-y-4">
          <AuditFindingsList findings={normalizeFindings(audit.findings)} />
        </div>

        {/* Recommendations */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-xl space-y-4">
          <h3 className="flex items-center gap-2 text-[10px] font-black text-[#0070FF] uppercase tracking-[0.4em]">
            <Lightbulb size={16} /> Optimization Pointers
          </h3>
          {audit.recommendations.length === 0 ? (
            <p className="text-[11px] text-zinc-400 italic">No recommendations.</p>
          ) : (
            <div className="space-y-2">
              {audit.recommendations.map((r, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="text-[9px] font-black text-[#0070FF] mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-[12px] font-bold text-zinc-600 leading-snug">{r}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Corrected topology */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Optimized Output</h3>
          <button
            onClick={copyTopology}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${
              copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="bg-zinc-900 text-emerald-400 font-mono text-[11px] p-4 rounded-xl overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar border border-zinc-800">
          <pre className="whitespace-pre-wrap">{(() => {
            try { return JSON.stringify(JSON.parse(audit.correctedTopology), null, 2); }
            catch { return audit.correctedTopology; }
          })()}</pre>
        </div>
      </div>
    </div>
  );
};

export default LastAudit;
