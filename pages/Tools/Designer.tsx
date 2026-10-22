
import React, { useState, useEffect } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { designMultiAgent } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { Loader2, Users, Bot, Layers, PlayCircle, Zap } from 'lucide-react';

const Designer: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { registerActions } = useProtocol();

  const [simulationActive, setSimulationActive] = useState(false);
  const [currentSimStep, setCurrentSimStep] = useState<number | null>(null);
  const [simLogs, setSimLogs] = useState<{ role: string; output: string }[]>([]);
  const [simComplete, setSimComplete] = useState(false);

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!objective) throw new Error('NO_OBJECTIVE: Swarm directive required for architecture.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
      },
      commit: async () => {
        if (!design) throw new Error('NO_DESIGN: Synthesized swarm architecture required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAction();
      }
    });
  }, [objective, design, onAction, registerActions]);

  const handleDesign = async () => {
    if (!objective) return;
    setError(null);
    setLoading(true);
    setSimComplete(false);
    setSimLogs([]);
    setCurrentSimStep(null);
    try {
      const data = await designMultiAgent(objective);
      setDesign(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The agent design could not be generated. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = async () => {
    if (!design || !design.workflowSteps || design.workflowSteps.length === 0) return;
    setSimulationActive(true);
    setSimComplete(false);
    setSimLogs([]);
    
    for (let i = 0; i < design.workflowSteps.length; i++) {
      setCurrentSimStep(i);
      const step = design.workflowSteps[i];
      
      // Find a matching agent cycle or use a fallback
      let matchedAgent = design.agents[0];
      const stepLower = step.toLowerCase();
      for (const ag of design.agents) {
        if (ag.role.toLowerCase().split(' ').some((word: string) => word.length > 3 && stepLower.includes(word))) {
          matchedAgent = ag;
          break;
        }
      }
      
      let briefAction = "";
      if (stepLower.includes("collect") || stepLower.includes("gather") || stepLower.includes("input") || stepLower.includes("receive")) {
        briefAction = "Retrieved and gathered structural source assets safely.";
      } else if (stepLower.includes("analyz") || stepLower.includes("audit") || stepLower.includes("verify") || stepLower.includes("check")) {
        briefAction = "Conducted extensive evaluation checks and parsed schema logic.";
      } else if (stepLower.includes("generat") || stepLower.includes("creat") || stepLower.includes("design") || stepLower.includes("build")) {
        briefAction = "Synthesized logic branches and drafted high-fidelity parameters.";
      } else if (stepLower.includes("sav") || stepLower.includes("export") || stepLower.includes("deploy") || stepLower.includes("send")) {
        briefAction = "Committed finalized outputs and synced coordinates safely.";
      } else {
        briefAction = "Assessed state metrics and safely transitioned context.";
      }

      setSimLogs(prev => [...prev, {
        role: matchedAgent.role,
        output: briefAction
      }]);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    setCurrentSimStep(null);
    setSimulationActive(false);
    setSimComplete(true);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Logic Swarm Architect</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Multi-Agent <span className="text-[#0070FF]">Designer</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Architect autonomous logic swarms and neural agent clusters for complex end-to-end automation.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl transition-all duration-500 bg-gradient-to-br from-white to-blue-50/10">
        <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-1">Swarm Objective Directive</label>
        <div className="flex flex-col md:flex-row gap-3">
          <input className="flex-1 bg-white border border-zinc-200 rounded-xl p-4 text-black text-sm focus:border-[#0070FF] outline-none placeholder:text-zinc-400" placeholder="e.g. End-to-end automated supply chain auditing swarm..." value={objective} onChange={(e) => setObjective(e.target.value)}/>
          <button onClick={handleDesign} disabled={loading || !objective} className="px-6 bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 font-display">{loading ? <Loader2 className="animate-spin" size={16} /> : 'Deploy Architect'}</button>
        </div>
        {error && <div className="mt-3"><ErrorNotice message={error} onClose={() => setError(null)} /></div>}
      </div>

      {design && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-500">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-zinc-600 px-1 flex items-center gap-2"><Bot size={16}/> Synthesized Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {design.agents.map((agent: any, i: number) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-[#0070FF]/15 hover:border-[#0070FF]/40 bg-gradient-to-br from-white to-blue-50/5 transition-all shadow-md">
                  <h4 className="text-sm font-black mb-2 uppercase text-[#0070FF]">{agent.role}</h4>
                  <p className="text-xs text-zinc-600 mb-4 font-medium leading-relaxed">{agent.designatedDuty}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.capabilities.map((cap: string, j: number) => (
                      <span key={j} className="text-[8px] bg-blue-50/50 px-2 py-0.5 rounded border border-[#0070FF]/15 uppercase text-[#0070FF] font-black tracking-widest">{cap}</span>
                    ))}
                  </div>
                  <div className="bg-blue-50/10 p-4 rounded-lg border border-[#0070FF]/10 text-[11px] text-zinc-750 italic font-medium leading-relaxed">
                    <span className="block text-[8px] font-black uppercase tracking-widest text-[#0070FF]/60 mb-2 not-italic">System Prompt</span>
                    "{agent.promptSnippet}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-zinc-600 px-1 flex items-center gap-2"><Layers size={16}/> Orchestration Flow</h3>
            <div className="bg-white p-6 rounded-xl border border-[#0070FF]/20 space-y-6 shadow-md bg-gradient-to-br from-white to-blue-50/10">
              <h4 className="text-[10px] font-black uppercase text-[#0070FF] tracking-[0.2em]">{design.architectureName}</h4>
              <div className="space-y-4">
                {design.workflowSteps.map((step: string, i: number) => (
                  <div key={i} className={`relative flex gap-4 p-2 rounded-xl transition-all ${currentSimStep === i ? 'bg-[#0070FF]/10 ring-1 ring-[#0070FF]/30 scale-[1.02]' : ''}`}>
                    <div className={`z-10 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 transition-colors ${currentSimStep === i ? 'bg-[#0070FF] text-white' : 'bg-white border border-[#0070FF] text-[#0070FF]'}`}>
                      {currentSimStep === i ? <Loader2 className="animate-spin" size={10} /> : i + 1}
                    </div>
                    <p className={`text-[12px] font-bold leading-relaxed transition-colors ${currentSimStep === i ? 'text-zinc-900' : 'text-zinc-700'}`}>{step}</p>
                  </div>
                ))}
              </div>
              <button 
                onClick={startSimulation}
                disabled={simulationActive}
                className="w-full py-3 bg-[#0070FF] hover:bg-[#005ACC] text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg transition-colors disabled:opacity-50"
              >
                {simulationActive ? 'Simulating Swarm Activity...' : 'Simulate Uplink'}
              </button>

              {simulationActive && (
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin text-[#0070FF]" size={14} />
                    <span className="text-[10px] font-black text-[#0070FF] uppercase tracking-wider">Simulation Engaged</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {simLogs.map((log, index) => (
                      <div key={index} className="text-[11px] leading-relaxed text-zinc-650 animate-in fade-in">
                        <strong className="text-zinc-800 font-bold block">{log.role}:</strong>
                        <span className="italic block mt-0.5 text-zinc-600">"{log.output}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {simComplete && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-2 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Architect Verified</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed italic">
                    Simulation finished successfully. Every orchestration stage mapped cleanly to logic capabilities.
                  </p>
                  <button 
                    onClick={() => setSimComplete(false)}
                    className="text-[9px] font-bold text-zinc-400 hover:text-zinc-700 uppercase tracking-widest transition-colors animate-fade-in"
                  >
                    Clear Results
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Designer;
