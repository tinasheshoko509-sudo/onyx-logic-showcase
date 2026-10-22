
import React, { useState, useEffect } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { explainAutomationNode } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { 
  BookOpen, 
  Monitor, 
  ChevronDown, 
  Loader2, 
  Sparkles, 
  Zap, 
  Terminal, 
  FileSearch,
  Activity,
  Cpu,
  Layers,
  Wand2,
  Copy,
  Check,
  Braces,
  Info
} from 'lucide-react';

const BUILDERS = [
  "n8n.io", "Make.com (Integromat)", "Zapier", "Workato", "Tray.io", 
  "Pipedream", "Bardeen", "Activepieces", "Celigo", "IFTTT"
];

const CORE_NODES_BY_BUILDER: Record<string, string[]> = {
  "n8n.io": [
    "Webhook", "HTTP Request", "Code (JS/Python)", "Schedule", "Merge", "Filter", "Switch", "If", 
    "Set / Edit Fields", "Execute Workflow", "Wait", "Stop", "Error Trigger", "Crypto", "Compression",
    "Read/Write Binary File", "Extract from File", "HTML", "XML", "JSON", "RSS Feed"
  ].sort(),
  "Make.com (Integromat)": [
    "Webhooks", "HTTP / Web Service", "Iterator", "Aggregator", "Router", "Tools (Set/Get variable)", 
    "Data store", "JSON Parser", "XML Parser"
  ],
  "Zapier": [
    "Webhooks by Zapier", "Formatter by Zapier", "Filter by Zapier", "Paths", 
    "Delay", "Schedule", "Webhooks (Legacy)"
  ],
  "Workato": [
    "Triggers (Real-time/Polling)", "Actions", "If/Else Logic", "Repeat / Loop", "Error Handling", 
    "Callable Recipes", "Lookup Tables", "On-prem Agent", "API Platform"
  ],
  "Tray.io": [
    "Trigger (Webhook/Form)", "HTTP Client", "Boolean Logic", "Loop Helper", "Data Storage", 
    "Error Handler", "Connector SDK", "Text Helper", "Date Helper"
  ],
  "Pipedream": [
    "HTTP / Webhook Trigger", "Cron / Schedule", "SQL / Database Step", "Data Stores", "Egress / Event Export"
  ],
  "Bardeen": [
    "Scraper", "Background Scraper", "Schedule Trigger", "Shortcut Trigger", "If/Else Logic"
  ],
  "Activepieces": [
    "Webhook Trigger", "Schedule Trigger", "Branch (If/Else)", "Loop"
  ],
  "Celigo": [
    "Flow Trigger", "Export (Source)", "Import (Destination)", "Mapping", "Transformations", 
    "Lookup", "Hooks (Pre/Post)", "Integration App logic", "Handlebars Expressions"
  ],
  "IFTTT": [
    "Applets", "Triggers (IF)", "Actions (THEN)", "Multiple Actions", "Pro+ Delay", "Queries", "Webhook Web Request"
  ]
};

const AGENT_TOOLS_BY_BUILDER: Record<string, string[]> = {
  "n8n.io": [
    "Think Tool", "AI Agent", "AI Chain", "AI Memory", "AI Tool (Custom)", "Wikipedia Tool", "Google Search Tool", 
    "Calculator Tool", "Wolfram Alpha Tool", "SerpApi Tool", "Slack (Agent Protocol)", "Gmail (Agent Protocol)", 
    "Airtable (Agent Protocol)", "AI Text Splitter", "AI Document Loader", "AI Vector Store"
  ].sort(),
  "Make.com (Integromat)": [
    "OpenAI (Functions)", "Anthropic (Tools)", "Google Search Tool", "Wikipedia Tool", "Custom Tool Builder", "Vector Store (Pinecone)", "JSON Tool"
  ],
  "Zapier": [
    "AI Actions (by Zapier)", "Code by Zapier (Agent Sandbox)", "ChatGPT App Tool", "Google Search by Zapier", "Search in Slack", "Search in Gmail"
  ],
  "Workato": [
    "Workbot (Agent UI)", "AI Search Tool", "Recipe Tool (Callable)", "Data Table Lookup Tool", "LLM Connector Tool"
  ],
  "Tray.io": [
    "Script Tool (Node.js)", "HTTP Client Tool", "AI Text Processing Tool", "Data Storage Tool", "Search Connector Tool"
  ],
  "Pipedream": [
    "Node.js Code Tool", "Python Code Tool", "OpenAI Assistant Tool", "Pinecone Tool", "DeepSearch Tool"
  ],
  "Bardeen": [
    "Scraper Tool", "Search Tool", "AI Summarizer Tool", "LinkedIn Scraper Tool", "Google Sheets Search Tool"
  ],
  "Activepieces": [
    "OpenAI Tool", "Code Tool (Node.js)", "Google Search Tool", "Wikipedia Tool", "Airtable Tool"
  ],
  "Celigo": [
    "AI Transformation Hook", "Lookup Tool", "Mapping Logic Tool", "HTTP Header Injector Tool"
  ],
  "IFTTT": [
    "Filter Code (TypeScript Tool)", "Query Tool", "AI Summary Action", "Webhook Fetch Tool"
  ]
};

const NodeSpecialist: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [kbBuilder, setKbBuilder] = useState(BUILDERS[0]);
  const [kbNode, setKbNode] = useState(CORE_NODES_BY_BUILDER[BUILDERS[0]][0]);
  const [kbTool, setKbTool] = useState(AGENT_TOOLS_BY_BUILDER[BUILDERS[0]][0]);
  const [activeType, setActiveType] = useState<'node' | 'tool'>('node');
  const [kbLoading, setKbLoading] = useState(false);
  const [kbResult, setKbResult] = useState<{ explanation: string, useCases: string[], configSchema?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dossierTab, setDossierTab] = useState<'overview' | 'schema'>('overview');

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        setKbLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setKbLoading(false);
      },
      commit: async () => {
        if (!kbResult) throw new Error('NO_DOSSIER: Completed knowledge resolution required for commit.');
        await new Promise(resolve => setTimeout(resolve, 1000));
        onAction();
      }
    });
  }, [kbResult, onAction, registerActions]);

  useEffect(() => {
    setKbNode(CORE_NODES_BY_BUILDER[kbBuilder][0]);
    setKbTool(AGENT_TOOLS_BY_BUILDER[kbBuilder][0]);
    setKbResult(null); 
  }, [kbBuilder]);

  const handleResolveKnowledge = async () => {
    const targetName = activeType === 'node' ? kbNode : kbTool;
    if (!kbBuilder || !targetName || kbLoading) return;
    
    setError(null);
    setKbLoading(true);
    setKbResult(null);
    try {
      const data = await explainAutomationNode(kbBuilder, targetName);
      setKbResult(data);
      onAction();
    } catch (err) {
      console.error("NEURAL_LINK_FAULT: Knowledge resolution failed.", err);
      setError(friendlyError(err, 'The explanation could not be loaded. Please try again.'));
    } finally {
      setKbLoading(false);
    }
  };

  const copyProtocol = () => {
    if (!kbResult) return;
    const text = dossierTab === 'overview' ? kbResult.explanation : kbResult.configSchema || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Agentic Implementation Blueprints</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Node <span className="text-[#0070FF]">Specialist</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Expert desk reference for complex automation nodes, agent tools, and logic structures across all major ecosystems.</p>
      </header>

      <div className="glass p-6 rounded-2xl border border-black/5 space-y-8 shadow-2xl relative overflow-hidden group">
        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-[#0070FF]/10 flex items-center justify-center text-[#0070FF] border border-[#0070FF]/20">
                <Monitor size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-black">Reference <span className="neon-accent">Desk</span></h3>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.3em] px-1">Ecosystem</label>
              <div className="relative group/sel">
                <select value={kbBuilder} onChange={(e) => setKbBuilder(e.target.value)} className="w-full glass border border-black/10 rounded-lg p-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-700 outline-none appearance-none cursor-pointer">
                  {BUILDERS.map(b => <option key={b} value={b} className="bg-white text-black">{b}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 group-hover/sel:text-[#0070FF] pointer-events-none transition-colors" />
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-[8px] font-black uppercase tracking-[0.3em] px-1 transition-colors ${activeType === 'node' ? 'text-[#0070FF]' : 'text-zinc-700'}`}>Logic Node</label>
              <div className="relative group/sel">
                <select value={kbNode} onChange={(e) => { setKbNode(e.target.value); setActiveType('node'); }} className={`w-full glass border rounded-lg p-2.5 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer transition-all ${activeType === 'node' ? 'border-[#0070FF]/50 text-black' : 'border-black/10 text-zinc-500'}`}>
                  {CORE_NODES_BY_BUILDER[kbBuilder].map(t => <option key={t} value={t} className="bg-white text-black">{t}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 group-hover/sel:text-[#0070FF] pointer-events-none transition-colors" />
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-[8px] font-black uppercase tracking-[0.3em] px-1 transition-colors ${activeType === 'tool' ? 'text-blue-500' : 'text-zinc-700'}`}>Agent Tool</label>
              <div className="relative group/sel">
                <select value={kbTool} onChange={(e) => { setKbTool(e.target.value); setActiveType('tool'); }} className={`w-full glass border rounded-lg p-2.5 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer transition-all ${activeType === 'tool' ? 'border-blue-500/50 text-black' : 'border-black/10 text-zinc-500'}`}>
                  {AGENT_TOOLS_BY_BUILDER[kbBuilder].map(t => <option key={t} value={t} className="bg-white text-black">{t}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 group-hover/sel:text-blue-500 pointer-events-none transition-colors" />
              </div>
            </div>

            <button onClick={handleResolveKnowledge} disabled={kbLoading} className="px-6 h-[42px] neon-bg text-black font-black rounded-lg text-[9px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md btn-futuristic flex items-center justify-center gap-2">
              {kbLoading ? <Loader2 size={12} className="animate-spin" /> : <><Sparkles size={14} /> Resolve</>}
            </button>
          </div>
          {error && <div className="mt-3"><ErrorNotice message={error} onClose={() => setError(null)} /></div>}
        </div>

        {kbResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-700 pt-6 border-t border-black/5">
             <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                     <button onClick={() => setDossierTab('overview')} className={`text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-md transition-all ${dossierTab === 'overview' ? 'bg-black/5 text-black border border-black/10' : 'text-zinc-600'}`}>Overview</button>
                     <button onClick={() => setDossierTab('schema')} className={`text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-md transition-all ${dossierTab === 'schema' ? 'bg-black/5 text-black border border-black/10' : 'text-zinc-600'}`}>Schema</button>
                  </div>
                  <button onClick={copyProtocol} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-white/5 text-zinc-500 hover:text-black border border-black/5'}`}>
                    {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? 'Synced' : 'Clone'}
                  </button>
                </div>

                <div className="bg-black/5 border border-black/5 p-6 rounded-2xl relative group hover:border-black/10 overflow-hidden min-h-[200px]">
                   {dossierTab === 'overview' ? (
                     <p className="text-zinc-800 text-sm leading-relaxed italic font-medium">"{kbResult.explanation}"</p>
                   ) : (
                     <div className="animate-in fade-in duration-500">
                        <pre className="text-emerald-500/80 font-mono text-[10px] leading-relaxed bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 overflow-x-auto">
                           {kbResult.configSchema || "// schema pending..."}
                        </pre>
                     </div>
                   )}
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.5em]">Implementations</h4>
                <div className="space-y-2">
                  {kbResult.useCases.map((uc, i) => (
                    <div key={i} className="flex gap-4 p-4 glass border border-black/5 rounded-xl hover:bg-emerald-500/5 transition-all group/item">
                       <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black text-[10px] shrink-0 group-hover/item:bg-emerald-500 group-hover/item:text-black">
                          {i + 1}
                       </div>
                       <p className="text-[11px] text-zinc-500 group-hover/item:text-zinc-800 transition-colors font-bold leading-relaxed">{uc}</p>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-800 gap-4 border-t border-black/5 pt-8">
             <FileSearch size={40} className="opacity-10" />
             <p className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-700">Reference Desk Idle</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeSpecialist;
