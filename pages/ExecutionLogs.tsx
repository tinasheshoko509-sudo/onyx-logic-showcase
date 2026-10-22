
import React, { useState, useEffect } from 'react';
import { History, Database, Terminal } from 'lucide-react';
import { subscribeToExecutionLogs, deleteOldExecutionLogs, ExecutionLogItem, auth } from '../services/firebase';

const ExecutionLogs: React.FC = () => {
  const [dbLogs, setDbLogs] = useState<ExecutionLogItem[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [loggingEnabled, setLoggingEnabled] = useState(() => localStorage.getItem('onyx_execution_logging') !== 'false');

  useEffect(() => {
    deleteOldExecutionLogs(30);
    const unsubscribe = subscribeToExecutionLogs((logs) => {
      setDbLogs(logs);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-[#0070FF]" />
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-none font-display">
            Execution <span className="text-[#0070FF]">Logs</span>
          </h2>
        </div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
          Real-Time Verification Stream • Secured by Firebase Firestore
        </p>
      </header>

      <div className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-xl overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => {
                const nextVal = !loggingEnabled;
                setLoggingEnabled(nextVal);
                localStorage.setItem('onyx_execution_logging', String(nextVal));
              }}
              className="flex items-center justify-between sm:justify-start gap-3 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-2 rounded-xl border border-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
              title={loggingEnabled ? 'Click to Pause Recording Executions' : 'Click to Resume Recording Executions'}
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                Database Save: {loggingEnabled ? 'Active' : 'Paused'}
              </span>
              <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 ${loggingEnabled ? 'bg-[#0070FF]' : 'bg-zinc-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-300 ${loggingEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </div>
            </button>

            <div className="flex items-center gap-3 bg-[#0070FF]/5 pl-3 pr-4 py-2 rounded-xl border border-[#0070FF]/10 whitespace-nowrap">
              <div className={`w-2 h-2 rounded-full ${loggingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></div>
              <span className="text-[9px] font-black uppercase text-[#0070FF] tracking-widest">
                {loggingEnabled ? `UPLINK SYNCED: ...${auth.currentUser?.uid?.substring(0, 6) || ''}` : 'UPLINK STANDBY'}
              </span>
            </div>
          </div>
        </div>

        {dbLogs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-100 rounded-xl space-y-3">
            <History size={32} className="mx-auto text-zinc-300" />
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">
              {loggingEnabled ? 'No executions recorded yet' : 'Telemetry Saving Paused'}
            </p>
            <p className="text-[10px] text-zinc-400 max-w-md mx-auto leading-relaxed">
              {loggingEnabled
                ? 'Activate tools like Efficiency Auditor or JS Code Refactor to save prompt context and generated outputs to your private cloud storage.'
                : 'Historical execution logging is disabled. Toggle it above to resume saving audit-ready logs to Firestore.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {!loggingEnabled && (
              <div className="p-3.5 bg-amber-50/50 border border-amber-200/50 rounded-xl flex items-center justify-between text-amber-800 text-[9px] uppercase font-bold tracking-wider animate-in fade-in duration-300 gap-2">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Telemetry logging is currently paused. New executions will not be synced to Firestore.
                </span>
                <button
                  onClick={() => {
                    setLoggingEnabled(true);
                    localStorage.setItem('onyx_execution_logging', 'true');
                  }}
                  className="text-amber-900 border-b border-dashed border-amber-950 font-black hover:text-[#0070FF] transition-colors whitespace-nowrap shrink-0"
                >
                  Enable Saving
                </button>
              </div>
            )}
            {dbLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const formattedTime = new Date(log.timestamp).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
              });
              return (
                <div
                  key={log.id}
                  className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'border-[#0070FF] bg-[#0070FF]/2' : 'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50/50'
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id || null)}
                    className="flex justify-between items-center p-4 cursor-pointer gap-4 select-none"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                        <Terminal size={16} className="text-zinc-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-zinc-900 truncate">{log.toolName}</span>
                          {log.score !== undefined && (
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100">
                              score: {log.score}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                          ID: #{log.id?.substring(4, 12)} • {log.username}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-zinc-400 font-mono">{formattedTime}</span>
                      <p className="text-[8px] font-semibold text-[#0070FF] uppercase tracking-widest mt-1">
                        {isExpanded ? 'Collapse' : 'Details'}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50 p-4 space-y-4 animate-in slide-in-from-top-1 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                            Telemetry Inputs Passed
                          </label>
                          <div className="bg-zinc-900 text-zinc-300 font-mono text-[11px] p-3 rounded-lg overflow-x-auto max-h-[200px] custom-scrollbar border border-zinc-800">
                            {log.input}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                            Generated Synthesis Response
                          </label>
                          <div className="bg-zinc-900 text-emerald-400 font-mono text-[11px] p-3 rounded-lg overflow-x-auto max-h-[200px] custom-scrollbar border border-zinc-800">
                            {log.output}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionLogs;
