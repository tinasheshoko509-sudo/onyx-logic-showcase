import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuditFinding } from '../utils/auditScore';

/** Efficiency Auditor findings: strengths in green, problems (bottlenecks) in red with severity. */
const AuditFindingsList: React.FC<{ findings: AuditFinding[] }> = ({ findings }) => {
  const good = findings.filter(f => f.type === 'good');
  const bad = findings
    .filter(f => f.type === 'bad')
    .sort((a, b) => (a.severity === 'major' ? 0 : 1) - (b.severity === 'major' ? 0 : 1));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] flex items-center gap-2 px-1">
          <CheckCircle2 size={18} /> Strengths
        </h4>
        {good.length === 0 ? (
          <p className="text-xs text-zinc-500 italic px-1">No strengths were identified.</p>
        ) : (
          <div className="space-y-2">
            {good.map((f, i) => (
              <div key={i} className="text-[13px] text-emerald-900 pl-4 pr-3 border-l-4 border-emerald-500 py-2.5 bg-emerald-50 rounded-r-xl leading-relaxed">{f.text}</div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] flex items-center gap-2 px-1">
          <AlertCircle size={18} /> Neural Bottlenecks
        </h4>
        {bad.length === 0 ? (
          <p className="text-xs text-zinc-500 italic px-1">No problems found.</p>
        ) : (
          <div className="space-y-2">
            {bad.map((f, i) => (
              <div key={i} className="text-[13px] text-red-900 pl-4 pr-3 border-l-4 border-red-500 py-2.5 bg-red-50 rounded-r-xl leading-relaxed">
                <span className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${f.severity === 'major' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
                  {f.severity === 'major' ? 'Major' : 'Minor'}
                </span>
                {f.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditFindingsList;
