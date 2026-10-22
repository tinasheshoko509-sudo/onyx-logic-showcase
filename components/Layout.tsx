
import React, { useState, useEffect, useRef } from 'react';
// Fixed: Use namespace import from react-router-dom to resolve "no exported member" errors in this environment
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useLocation, useNavigate } = ReactRouterDOM as any;

import { TOOLS } from '../constants';
import {
  ChevronRight,
  Menu,
  X,
  Bell,
  Search,
  Settings,
  HelpCircle,
  Activity,
  AlertCircle,
  ExternalLink,
  Zap,
  LogOut,
  Mic,
  MicOff,
  FileText,
  History
} from 'lucide-react';
import { useProtocol } from '../context/ProtocolContext';
import { processVoiceCommand, getModelConfig, getModelChoices, setModelChoice } from '../services/gemini';
import ModelSetting from './ModelSetting';

interface LayoutProps {
  children: React.ReactNode;
  user: { username: string | null; email?: string | null; isPremium: boolean };
  onLogout: () => void;
}

interface SystemNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'success' | 'info' | 'alert';
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Header Actions State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsPinned, setIsNotificationsPinned] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loggingEnabled, setLoggingEnabled] = useState(() => localStorage.getItem('onyx_execution_logging') !== 'false');
  // The two model settings. Empty string means "use whatever the server is configured with".
  const [advancedModel, setAdvancedModel] = useState(() => getModelChoices().advanced || '');
  const [simpleModel, setSimpleModel] = useState(() => getModelChoices().simple || '');
  const [serverModels, setServerModels] = useState<{ advanced: string; simple: string } | null>(null);
  const [runStats, setRunStats] = useState<{ functionName: string; ms: number; inputTokens: number; outputTokens: number; calls: number; costUsd: number | null } | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);
  const apiErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getModelConfig()
      .then(cfg => setServerModels({ advanced: cfg.advancedDefault, simple: cfg.simpleDefault }))
      .catch(() => setServerModels(null));
  }, []);

  // Per-run timing + token usage, broadcast by services/gemini.ts after each call.
  useEffect(() => {
    const onStats = (e: any) => setRunStats(e.detail);
    window.addEventListener('onyx_run_stats' as any, onStats);
    return () => window.removeEventListener('onyx_run_stats' as any, onStats);
  }, []);

  // The old "Mock Core" banner is gone; clear the flag it left in browsers that saw it,
  // so it can never resurface.
  useEffect(() => {
    localStorage.removeItem('onyx_gemini_quota_exceeded');
    localStorage.removeItem('onyx_gemini_quota_error');
  }, []);

  useEffect(() => {
    const handleApiError = (e: any) => {
      const raw: string = e.detail?.message || 'An error occurred.';
      // Simplify long technical messages for the user
      let friendly = raw;
      if (raw.includes('credit balance is too low') || raw.includes('insufficient_quota')) {
        friendly = 'Out of AI credits. Top up your AI provider account (OpenRouter) and try again.';
      } else if (raw.includes('401') || raw.includes('authentication')) {
        friendly = 'Invalid API key. Check LLM_API_KEY in the .env file.';
      } else if (raw.includes('429') || raw.includes('rate limit')) {
        friendly = 'Rate limit reached. Wait a moment and try again.';
      } else if (raw.includes('timed out')) {
        friendly = 'Request timed out. The AI took too long — try again.';
      } else if (raw.length > 120) {
        friendly = raw.substring(0, 120) + '…';
      }
      setApiError(friendly);
      if (apiErrorTimerRef.current) clearTimeout(apiErrorTimerRef.current);
      apiErrorTimerRef.current = setTimeout(() => setApiError(null), 8000);
    };
    window.addEventListener('onyx_api_error' as any, handleApiError);
    return () => {
      window.removeEventListener('onyx_api_error' as any, handleApiError);
      if (apiErrorTimerRef.current) clearTimeout(apiErrorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      setLoggingEnabled(localStorage.getItem('onyx_execution_logging') !== 'false');
    }
  }, [isSettingsOpen]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    { id: '1', title: 'Neural Link Synced', desc: 'Uplink with Global Node V3 successful.', time: '2m ago', type: 'success' },
    { id: '2', title: 'Intelligence Update', desc: 'New specialist protocols detected in registry.', time: '15m ago', type: 'info' },
    { id: '3', title: 'Logic Warning', desc: 'Bifurcation detected in Architect draft #04.', time: '1h ago', type: 'alert' },
  ]);

  const handleVoiceClick = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      // Explicitly request microphone permission to trigger the browser prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed to trigger the permission prompt
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setVoiceFeedback('Microphone permission denied.');
      setTimeout(() => setVoiceFeedback(''), 3000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback('Listening...');
    };
    
    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setVoiceFeedback(`Processing: "${text}"`);
      try {
        const result = await processVoiceCommand(text);
        setVoiceFeedback(result.feedback);
        setTimeout(() => setVoiceFeedback(''), 4000);
        
        if (result.path) {
          navigate(result.path, { state: { extractedInput: result.extractedInput } });
        }
      } catch (err) {
        console.error(err);
        setVoiceFeedback('Error processing command.');
        setTimeout(() => setVoiceFeedback(''), 3000);
      } finally {
        setIsListening(false);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setVoiceFeedback(`Microphone error: ${event.error}`);
      setTimeout(() => setVoiceFeedback(''), 3000);
    };
    
    recognition.onend = () => {
      if (voiceFeedback === 'Listening...') {
        setIsListening(false);
        setVoiceFeedback('');
      }
    };
    
    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setIsListening(false);
    }
  };

  const { triggerDryRun, triggerCommit, status, message } = useProtocol();

  const currentTool = TOOLS.find(t => t.path === location.pathname) || (location.pathname === '/manual' ? { id: 'manual', name: 'System Manual', icon: <FileText size={18} />, path: '/manual' } : TOOLS[0]);

  const handleNavClick = (toolId: string) => {
    if (toolId === 'logout') {
      onLogout();
    }
    setIsSidebarOpen(false);
  };

  const filteredTools = TOOLS.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) && t.id !== 'logout'
  );

  const clearNotifications = () => {
    setNotifications([]);
  };

  const isFixedTool = false;

  const mainRef = useRef<HTMLElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [canScrollMain, setCanScrollMain] = useState(false);

  useEffect(() => {
    const mainEl = mainRef.current;
    const contentEl = mainContentRef.current;
    if (!mainEl || !contentEl) return;
    const checkScrollable = () => setCanScrollMain(mainEl.scrollHeight > mainEl.clientHeight + 40);
    checkScrollable();
    const observer = new ResizeObserver(checkScrollable);
    observer.observe(contentEl);
    window.addEventListener('resize', checkScrollable);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkScrollable);
    };
  }, []);


  // ── Draggable scroll handle (far-right edge) ──────────────────────────────
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [scrollTrackHeight, setScrollTrackHeight] = useState(0);
  const [scrollMetrics, setScrollMetrics] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
  const dragStateRef = useRef<{ startY: number; startScrollTop: number } | null>(null);

  useEffect(() => {
    const mainEl = mainRef.current;
    const trackEl = scrollTrackRef.current;
    if (!mainEl) return;

    const updateScrollMetrics = () => setScrollMetrics({
      scrollTop: mainEl.scrollTop, scrollHeight: mainEl.scrollHeight, clientHeight: mainEl.clientHeight,
    });
    updateScrollMetrics();
    mainEl.addEventListener('scroll', updateScrollMetrics, { passive: true });

    let trackObserver: ResizeObserver | null = null;
    if (trackEl) {
      setScrollTrackHeight(trackEl.clientHeight);
      trackObserver = new ResizeObserver(() => setScrollTrackHeight(trackEl.clientHeight));
      trackObserver.observe(trackEl);
    }

    return () => {
      mainEl.removeEventListener('scroll', updateScrollMetrics);
      trackObserver?.disconnect();
    };
  }, [canScrollMain]);

  const scrollThumbHeight = Math.max(24, scrollTrackHeight > 0 && scrollMetrics.scrollHeight > 0
    ? (scrollMetrics.clientHeight / scrollMetrics.scrollHeight) * scrollTrackHeight
    : scrollTrackHeight);
  const scrollableRange = Math.max(1, scrollMetrics.scrollHeight - scrollMetrics.clientHeight);
  const scrollThumbTop = ((scrollTrackHeight - scrollThumbHeight) * scrollMetrics.scrollTop) / scrollableRange;

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = { startY: e.clientY, startScrollTop: mainRef.current?.scrollTop ?? 0 };
  };

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || !mainRef.current) return;
    const deltaY = e.clientY - dragStateRef.current.startY;
    const trackRange = Math.max(1, scrollTrackHeight - scrollThumbHeight);
    const scrollDelta = (deltaY / trackRange) * scrollableRange;
    mainRef.current.scrollTop = dragStateRef.current.startScrollTop + scrollDelta;
  };

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== scrollTrackRef.current || !mainRef.current || !scrollTrackRef.current) return;
    const rect = scrollTrackRef.current.getBoundingClientRect();
    const clickRatio = (e.clientY - rect.top) / rect.height;
    mainRef.current.scrollTo({ top: clickRatio * scrollableRange, behavior: 'smooth' });
  };

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden text-zinc-900 font-sans relative">
      {/* Mobile Toggle */}
      <button 
        className="md:hidden fixed top-3 left-3 z-50 p-2 glass rounded-md border border-zinc-200"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="absolute top-8 right-8 text-zinc-600 hover:text-[#0070FF] transition-colors"
          >
            <X size={32} />
          </button>
          
          <div className="w-full max-w-2xl space-y-8">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#0070FF] transition-colors" size={24} />
              <input 
                autoFocus
                type="text"
                placeholder="SEARCH PROTOCOLS..."
                className="w-full bg-transparent border-b-2 border-zinc-100 py-6 pl-16 pr-6 text-2xl font-black uppercase tracking-widest focus:outline-none focus:border-[#0070FF] transition-all text-zinc-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-4">
              {filteredTools.length > 0 ? (
                filteredTools.map(tool => (
                  <Link 
                    key={tool.id}
                    to={tool.path}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-4 p-4 glass border border-black/5 rounded-xl hover:border-[#0070FF]/50 transition-all group"
                  >
                    <div className="p-3 glass rounded-lg text-zinc-600 group-hover:text-[#0070FF] transition-colors">
                      {React.cloneElement(tool.icon as React.ReactElement<{ size?: number }>, { size: 20 })}
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-zinc-900">{tool.name}</h5>
                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em]">Protocol Active</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 py-12 text-center opacity-20">
                  <p className="text-[11px] font-black uppercase tracking-[0.5em]">No results found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[100] bg-black/5 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-lg glass border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl neon-bg flex items-center justify-center text-black shadow-xl">
                  <HelpCircle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900">System Support</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em]">Knowledge Base</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-600 hover:text-[#0070FF] transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6 bg-white">
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0070FF]">Quick Start</h4>
                <div className="grid grid-cols-1 gap-3">
                  {(() => {
                    const pool = [
                      { q: 'What does the throughput chart show?', a: 'Your tool usage over time — toggle between LIVE (last hour in 5-min buckets), 7D (daily), and 30D (monthly) views.' },
                      { q: 'What is the Onyx IQ panel?', a: 'It finds your 2 least-used tools and generates AI tips on when to use them — refreshes each session.' },
                      { q: 'What is Logic Integrity on the Dashboard?', a: 'The average audit score across all your Efficiency Auditor runs this session — 100% means no issues found.' },
                      { q: 'How do I pause execution logging?', a: 'Toggle "Database Save" off on the Dashboard — logs stop saving to Firestore until you re-enable it.' },
                      { q: 'What does Registry Priority show?', a: 'Your 3 most-used tools ranked by cycle count — a quick indicator of where your workflow is concentrated.' },
                      { q: 'Can I test an API without writing code?', a: 'Yes — in API Sandbox, paste the URL, select a method, and click "Send & Get Payload Dictionary" for a full AI analysis.' },
                      { q: 'What are the API Sandbox presets?', a: 'Stripe Payment Intent, Slack Webhook Alert, Auth0 Access Token, and SendGrid Email — one click fills the entire form.' },
                      { q: 'What is the difference between AI analysis and Direct HTTP Send?', a: 'AI analysis simulates and explains the request; Direct HTTP Send actually fires it live (CORS restrictions may apply).' },
                      { q: 'What does the Request Variable Dissection table show?', a: 'Every request field broken down by datatype, plain English meaning, and a production-ready mock value.' },
                      { q: 'Can API Scanner handle any documentation URL?', a: 'Yes — paste any public API docs URL and describe your use case; it extracts the relevant endpoints and protocols.' },
                      { q: 'What goes in the directive field of API Scanner?', a: 'Describe what you\'re trying to do — e.g. "send a Slack message when a form is submitted." This focuses the extraction.' },
                      { q: 'What format does the Efficiency Auditor accept?', a: 'JSON workflow topology — paste it directly or import a file. Use the Vector Strategy dropdown to match your workflow type.' },
                      { q: 'What are Optimization Pointers?', a: 'Specific improvement suggestions from the audit — select the ones you want and click SYNC to apply them in a reinforcement cycle.' },
                      { q: 'Can I export an audited workflow to n8n?', a: 'Yes — after the audit, click the share icon to export the optimized topology as n8n-compatible JSON.' },
                      { q: 'What export formats does the Auditor support?', a: 'JSON, TXT, Markdown, PDF, and DOCX — all available from the format dropdown after an audit completes.' },
                      { q: 'What are the three modes in Code Optimizer?', a: 'Refactor (optimize existing code), Synthesis (generate from English), and Auditor (full codebase bug and security scan).' },
                      { q: 'What file types can I import into Code Optimizer?', a: '.js, .jsx, .ts, .tsx, .json, .txt, .html, .py, and .css files are all supported.' },
                      { q: 'What does Code Auditor mode output?', a: 'A Neural Executive Summary, line-level bug diagnostics with remediations, security threats, performance bottlenecks, and an architectural roadmap.' },
                      { q: 'Can Code Optimizer generate code from plain English?', a: 'Yes — use Synthesis mode, describe what you need in the Neural Directive field, and it writes the code.' },
                      { q: 'What is the AI Platform Recommendation feature?', a: 'Describe your workflow goal and it suggests the best platform with a suitability score, complexity rating, and implementation steps.' },
                      { q: 'Can I push a recommendation into the comparison matrix?', a: 'Yes — after a suggestion appears, click "Push to Platform A" or "Push to Platform B" to auto-fill the comparison fields.' },
                      { q: 'What regulations does the Compliance Checker cover?', a: 'GDPR, HIPAA, and SOC2 — it flags risks in your workflow and provides specific remediation steps for each.' },
                      { q: 'What file formats does Compliance Scanner accept?', a: '.json, .txt, .csv, .log, .js, .ts, .py, and .md files can all be imported for scanning.' },
                      { q: 'What authentication types does Credential Assistant cover?', a: 'OAuth2, API Keys, JWT, and Machine-to-Machine (M2M) flows — with step-by-step setup guides and common pitfalls.' },
                      { q: 'Does Credential Assistant show where to get credentials?', a: 'Yes — each prerequisite includes an "Open Site" link pointing you directly to where you obtain it.' },
                      { q: 'What does Multi-Agent Designer output?', a: 'Agent cards with roles, duties, capabilities, and system prompts — plus an orchestration flow with step-by-step workflow.' },
                      { q: 'What is "Simulate Uplink" in Multi-Agent Designer?', a: 'It animates through each workflow step showing which agent activates — useful for validating logic before building.' },
                      { q: 'What is the Discovery tab in New Intelligence?', a: 'A live AI search for any AI tool or automation platform — enter a query and get a detailed research synthesis with citations.' },
                      { q: 'What file formats does Doc Generator accept?', a: '.json, .md, and .txt files — upload one or multiple and it generates a full Functional Specification document.' },
                      { q: 'Can I export a generated document as Word?', a: 'Yes — Doc Generator exports to Markdown, TXT, PDF, and DOCX formats.' },
                      { q: 'What does Error Resolver accept as input?', a: 'Any raw error log, stack trace, or message from any automation platform — it translates it to plain English with fix steps.' },
                      { q: 'Can I navigate from another tool directly to Error Resolver?', a: 'Yes — several tools have a "Send to Error Resolver" action that pre-populates the input automatically.' },
                      { q: 'What does HTTP Builder generate from plain English?', a: 'A full spec: endpoint URL, headers, params, body, cURL command, Axios JS code, n8n JSON node, and a compliance audit.' },
                      { q: 'Does HTTP Builder output n8n-compatible JSON?', a: 'Yes — the n8n JSON tab gives a ready-to-paste node config. It is also noted as Make.com compatible.' },
                      { q: 'What are the HTTP Builder presets?', a: 'Slack Webhook, Shopify Product Sync, and OpenAI Chat Completion — one click fills the prompt field.' },
                      { q: 'What does Workflow Roadmap output?', a: 'A node-by-node sequence with each node\'s name, type, description, and configuration, plus a strategic overview with timeline.' },
                      { q: 'Can I export the Workflow Roadmap?', a: 'Yes — click "Export Protocol Blueprint" to download the roadmap as a JSON file.' },
                      { q: 'How many automation platforms does Node Specialist cover?', a: '10 — n8n, Make.com, Zapier, Workato, Tray.io, Pipedream, Bardeen, Activepieces, Celigo, and IFTTT.' },
                      { q: 'What is the difference between Logic Nodes and Agent Tools?', a: 'Logic Nodes are structural workflow components (IF, Switch, Webhook); Agent Tools are AI-specific (Memory, Vector Store, Calculator).' },
                      { q: 'Does Node Specialist show code schemas?', a: 'Yes — every node has an Overview tab (plain English) and a Schema tab (code configuration block).' },
                      { q: 'What does Payload Morpher output besides the transformed JSON?', a: 'A JS transform script, n8n expression rules, a jq CLI filter command, and a compliance audit — all in separate tabs.' },
                      { q: 'Does Payload Morpher validate my JSON before sending?', a: 'Yes — it parses your input client-side and shows an error immediately if the JSON is invalid, before any API call is made.' },
                      { q: 'What are the Payload Morpher presets?', a: 'Stripe webhook → Slack Card, Typeform submission → Database Format, and HubSpot Contact → Mailchimp Member.' },
                      { q: 'What does Privacy Scanner detect?', a: 'PII (names, emails, phone numbers), exposed API keys, tokens, and other sensitive data inside your automation payloads.' },
                      { q: 'What risk score does Privacy Scanner use?', a: 'A percentage — below 50% is green (low risk), above 50% is red (high risk). It also shows detected leak tags and sanitization logic.' },
                      { q: 'What are the two modes in Prompt Lab?', a: 'Optimize & Rewrite (refine an existing prompt) and Build From Scratch (generate a new prompt from an objective).' },
                      { q: 'Does Prompt Lab support voice input?', a: 'Yes — click the mic button next to any field to dictate your prompt using your microphone.' },
                      { q: 'What are Improvement Pointers in Prompt Lab?', a: 'Tag buttons showing specific refinements — select the ones you want and click "Reinforce Logic" to apply them in another pass.' },
                      { q: 'What does QA Handover generate from a spec?', a: 'A QA Workbook, test scenario vectors with priority ratings, and a runnable test script — all from a plain text or PDF handover doc.' },
                      { q: 'Can QA Handover read PDF files?', a: 'Yes — it extracts text from uploaded PDFs automatically, preserving reading order top-to-bottom.' },
                      { q: 'What priority levels do QA Scenario Vectors use?', a: 'High (red), Medium (amber), and Low (default) — so you can prioritize which test cases to run first.' },
                      { q: 'What is the difference between Workflow Roadmap and Integration Roadmap?', a: 'Workflow Roadmap gives node-by-node steps for a single automation; Integration Roadmap covers multi-stack deployments.' },
                      { q: 'Does the Integration Roadmap show how nodes connect?', a: 'Yes — each node includes a "Connect via Tool/Technology" section showing exactly what bridges it to the next step.' },
                      { q: 'What is the difference between Error Resolver and Logic Troubleshooter?', a: 'Error Resolver translates error messages; Logic Troubleshooter diagnoses structural failures in your workflow\'s branching logic.' },
                      { q: 'What does Logic Troubleshooter output?', a: 'Root cause identification, a specific logic fix directive with code, and a prevention protocol to stop the issue recurring.' },
                      { q: 'Can I export the full User Manual as a PDF?', a: 'Yes — click "Export Manual PDF" for a multi-page formatted document covering all 21 tool sub-systems with steps and tips.' },
                      { q: 'How is the User Manual organized?', a: 'Into 6 categories: Core & Intelligence, Planning & Design, Payload & APIs, Code & Speed, Security & Compliance, and All Tools.' },
                      { q: 'How often does New Intelligence update?', a: 'It performs a live retrieval every time you open it — pulling the latest AI and automation releases from the past 24 hours.' },
                      { q: 'What does "Establish Uplink" do in New Intelligence?', a: 'It triggers a fresh live retrieval of the latest AI tool releases — useful if the auto-load did not complete.' },
                      { q: 'Can I send output from one tool directly into another?', a: 'Yes — Error Resolver, HTTP Builder, Node Roadmap, Payload Morpher, and Prompt Lab all accept pre-populated input from other tools.' },
                      { q: 'Do most tools support drag-and-drop file upload?', a: 'Yes — nearly every tool with a file input supports drag-and-drop in addition to the click-to-upload button.' },
                      { q: 'What keyboard shortcuts does the app support?', a: 'CTRL+ENTER submits in Credential Assistant; CTRL+META+Enter runs Comparison; Enter submits search in Discovery and New Intelligence.' },
                      { q: 'What is the Gain Factor metric on the Dashboard?', a: 'The average efficiency multiplier across all your audit runs — a 4x gain means the optimized workflow is 4 times more efficient.' },
                      { q: 'What is the weekly goal on the Dashboard?', a: 'The Efficiency Pulse tracks progress toward 50 tool uses per week — shown as a percentage on the animated progress bar.' },
                      { q: 'Can I compare more than two tools at once?', a: 'The comparison matrix supports two platforms head-to-head. For broader research, use the AI Platform Recommendation feature instead.' },
                      { q: 'What happens after I select Optimization Pointers in the Auditor?', a: 'Click SYNC and the system runs a reinforcement audit cycle applying only the selected pointers to your topology.' },
                    ];
                    const day = Math.floor(Date.now() / 86400000);
                    const n = pool.length;
                    return [pool[day % n], pool[(day * 3 + 4) % n], pool[(day * 7 + 9) % n]];
                  })().map((item, i) => (
                    <div key={i} className="p-4 glass border border-zinc-100 rounded-xl">
                      <p className="text-[11px] font-black text-zinc-900 mb-1 uppercase tracking-widest">{item.q}</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Version: 4.0.2-Stable</span>
                <button className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest hover:underline">Documentation <ExternalLink size={12} className="inline ml-1" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Preferences Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] bg-black/5 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md glass border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl neon-bg flex items-center justify-center text-black shadow-xl">
                  <Settings size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900">User Settings</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em]">System Preferences</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-600 hover:text-[#0070FF] transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 bg-white overflow-y-auto max-h-[75vh]">
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0070FF]">Privacy & Storage</h4>
                
                <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">Enable Execution Logging</p>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Saves your prompt scenarios and compiler logs durably inside Firebase Firestore. Turn off to avoid consuming database storage quotas.
                    </p>
                  </div>
                  <button
                    id="modal-logging-toggle"
                    onClick={() => {
                      const nextVal = !loggingEnabled;
                      setLoggingEnabled(nextVal);
                      localStorage.setItem('onyx_execution_logging', String(nextVal));
                    }}
                    className={`shrink-0 relative w-10 h-6 rounded-full transition-colors duration-300 cursor-pointer ${loggingEnabled ? 'bg-[#0070FF]' : 'bg-zinc-300'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${loggingEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-black/5">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0070FF]">AI Models</h4>
                  <p className="text-[10px] text-zinc-400 mt-1">Two settings: a stronger model for work that needs careful thinking, a cheaper one for quick jobs. Saved in this browser.</p>
                </div>

                <ModelSetting
                  title="Advanced tasks"
                  description="Reading long documents, planning, diagnosing and checking its own work: Credential Assistant, HTTP Builder, the Roadmaps, Scope & Stack, Error Resolver, Troubleshooter, Auditor, Compliance, Doc Generator, QA Lab, SQL and code tools."
                  defaultModel={serverModels?.advanced ?? null}
                  value={advancedModel}
                  onChange={m => { setAdvancedModel(m); setModelChoice('advanced', m); }}
                />

                <ModelSetting
                  title="Simple tasks"
                  description="Short, quick jobs: Onyx chat, voice commands, dashboard insight, New Intelligence, Skill Finder, Privacy Scanner, Payload Morpher, API Sandbox, and small helper steps inside every tool."
                  defaultModel={serverModels?.simple ?? null}
                  value={simpleModel}
                  onChange={m => { setSimpleModel(m); setModelChoice('simple', m); }}
                />
              </div>

              <div className="space-y-3 pt-4 border-t border-black/5">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0070FF]">Documentation</h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    navigate('/manual');
                  }}
                  className="w-full flex items-center justify-between p-3 bg-zinc-50 hover:bg-blue-50/40 border border-zinc-200 hover:border-[#0070FF]/30 rounded-xl cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-600 group-hover:text-[#0070FF] shrink-0 transition-colors">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 leading-tight">System Manual</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400 group-hover:text-[#0070FF] shrink-0 transition-colors" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    navigate('/execution-logs');
                  }}
                  className="w-full flex items-center justify-between p-3 bg-zinc-50 hover:bg-blue-50/40 border border-zinc-200 hover:border-[#0070FF]/30 rounded-xl cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-white rounded-lg border border-zinc-200 text-zinc-600 group-hover:text-[#0070FF] shrink-0 transition-colors">
                      <History size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 leading-tight">Execution Logs</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400 group-hover:text-[#0070FF] shrink-0 transition-colors" />
                </button>
              </div>

              <div className="space-y-3 pt-4 border-t border-black/5">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Database Connection</h4>
                <div className="flex items-center justify-between text-[10px] font-medium text-zinc-600">
                  <span>Firebase Mode</span>
                  <span className="font-mono text-[9px] font-black uppercase text-[#0070FF] bg-[#0070FF]/5 px-2.5 py-1 rounded-md border border-[#0070FF]/15">
                    Live — Email / Google Auth
                  </span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-black/5 flex justify-end">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 neon-bg text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#0070FF]/10"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Narrowed from 80 to 64 */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 fixed md:relative z-40 w-64 h-full 
        glass border-r border-black/5 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col
      `}>
        <div className="p-6 border-b border-black/5">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 neon-bg rounded-xl flex items-center justify-center font-black text-black text-xl transition-all group-hover:rotate-12 select-none">
              O
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 font-display">Onyx <span className="text-[#0070FF]">Logic</span></h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {TOOLS.map((tool) => {
            const isActive = location.pathname === tool.path;
            const isLogout = tool.id === 'logout';

            if (isLogout) {
              return (
                <button
                  key={tool.id}
                  onClick={() => handleNavClick(tool.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative text-zinc-500 hover:text-red-500 hover:bg-red-500/5 mt-4"
                >
                  <span className="text-zinc-600 group-hover:text-red-500 transition-colors">
                    {React.cloneElement(tool.icon as React.ReactElement<{ size?: number }>, { size: 18 })}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-widest">{tool.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={tool.id}
                to={tool.path}
                onClick={() => handleNavClick(tool.id)}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative
                  ${isActive ? 'bg-zinc-100 text-[#0070FF] font-bold' : 'text-zinc-500 hover:text-[#0070FF] hover:bg-zinc-50'}
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 neon-bg rounded-r-full"></div>
                )}
                <span className={`${isActive ? 'text-[#0070FF]' : 'text-zinc-600 group-hover:text-[#0070FF]'} transition-colors`}>
                  {React.cloneElement(tool.icon as React.ReactElement<{ size?: number }>, { size: 18 })}
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest">{tool.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-black/5 space-y-4">
          <div className="flex items-center gap-3 p-3 glass-blue rounded-xl border border-black/5">
            <div className="w-10 h-10 rounded-lg glass border border-[#0070FF]/30 flex items-center justify-center text-base font-black text-zinc-900 shadow-inner">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate text-zinc-900">{user.username}</p>
              {user.email && <p className="text-[9px] text-zinc-500 truncate">{user.email}</p>}
              <p className="text-[9px] text-[#0070FF] font-black uppercase tracking-widest">{user.isPremium ? 'Prime' : 'Std'}</p>
            </div>
            <button 
              onClick={onLogout} 
              className="text-zinc-600 hover:text-red-500 transition-colors p-2"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Framework */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* API Error Toast */}
        {apiError && (
          <div className="bg-white border-b border-red-200 px-6 py-2.5 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 z-50 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{apiError}</span>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top Header - Reduced height from 20 to 14 */}
        <header className="h-14 glass border-b border-black/5 px-6 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-4 text-sm">
            <Activity size={16} className={`transition-colors ${status === 'processing' ? 'text-blue-500 animate-spin' : status === 'success' ? 'text-emerald-500' : status === 'error' ? 'text-red-500' : 'text-[#0070FF]'}`} />
            <div className="flex flex-col">
              <span className="text-zinc-600 uppercase tracking-widest text-[10px] font-black">Link Active</span>
              {message && (
                <span className={`text-[8px] font-mono uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-300 ${
                  status === 'success' ? 'text-emerald-500' : 
                  status === 'error' ? 'text-red-500' : 
                  'text-[#0070FF]'
                }`}>
                  {message}
                </span>
              )}
            </div>
            <ChevronRight size={14} className="text-zinc-800" />
            <span className="text-zinc-900 uppercase tracking-widest text-[10px] font-black font-display">{currentTool.name}</span>
            {voiceFeedback && (
              <span className="ml-4 text-[10px] font-bold text-[#0070FF] uppercase tracking-widest animate-pulse bg-[#0070FF]/10 px-3 py-1 rounded-full">
                {voiceFeedback}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-4 border-r border-black/5 pr-4">
              <button 
                onClick={handleVoiceClick} 
                className={`transition-colors ${isListening ? 'text-[#0070FF] animate-pulse' : 'text-zinc-600 hover:text-[#0070FF]'}`}
                title="Voice Command"
              >
                {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button onClick={() => setIsSearchOpen(true)} className="text-zinc-600 hover:text-[#0070FF]"><Search size={18} /></button>
              <div className="relative"
                onMouseEnter={() => setIsNotificationsOpen(true)}
                onMouseLeave={() => { if (!isNotificationsPinned) setIsNotificationsOpen(false); }}
              >
                <button
                  onClick={() => {
                    const pinning = !isNotificationsPinned;
                    setIsNotificationsPinned(pinning);
                    setIsNotificationsOpen(pinning);
                  }}
                  className={`relative p-2 rounded-lg transition-all ${isNotificationsOpen ? 'bg-zinc-100 text-[#0070FF]' : 'text-zinc-600 hover:text-[#0070FF] hover:bg-zinc-50'}`}>
                  <Bell size={18} />
                  {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-[#0070FF] rounded-full border border-black shadow-[0_0_5px_#0070FF]"></span>}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 glass border border-black/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[60]">
                    <div className="p-4 border-b border-black/5 flex justify-between items-center bg-zinc-50">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">Notifications</h4>
                      <button onClick={clearNotifications} className="text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-[#0070FF] transition-colors">Clear All</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div key={n.id} className="p-4 border-b border-black/5 hover:bg-white/5 transition-colors group">
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="text-[11px] font-black text-zinc-900 group-hover:text-[#0070FF] transition-colors">{n.title}</h5>
                              <span className="text-[8px] font-black text-zinc-700 uppercase">{n.time}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">{n.desc}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center opacity-20">
                          <Bell size={24} className="mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No new alerts</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setIsSettingsOpen(true)} className="text-zinc-600 hover:text-[#0070FF]" title="System Settings"><Settings size={18} /></button>
              <button onClick={() => setIsHelpOpen(true)} className="text-zinc-600 hover:text-[#0070FF]"><HelpCircle size={18} /></button>
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={triggerDryRun} disabled={status === 'processing'} className="px-4 py-1.5 glass border border-zinc-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#0070FF] transition-all">Dry Run</button>
               <button onClick={triggerCommit} disabled={status === 'processing'} className="px-5 py-1.5 neon-bg text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#0070FF]/10">Commit</button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main ref={mainRef} className={`flex-1 p-5 md:p-8 custom-scrollbar relative overflow-x-hidden flex flex-col ${!isFixedTool ? 'overflow-y-auto' : ''}`}>
          <div ref={mainContentRef} className={`max-w-7xl mx-auto w-full page-transition ${isFixedTool ? 'h-full flex-1' : ''}`}>
            {children}
          </div>
        </main>

        {runStats && (
          <div className="fixed top-16 right-6 z-40 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-zinc-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[11px] font-black text-zinc-900 tabular-nums">
              {(runStats.ms / 1000).toFixed(1)}s
            </span>
            <span className="w-px h-3 bg-zinc-200" />
            <span className="text-[10px] font-semibold text-zinc-500 tabular-nums">
              {runStats.inputTokens.toLocaleString()} in · {runStats.outputTokens.toLocaleString()} out
            </span>
            {runStats.costUsd !== null && (
              <>
                <span className="w-px h-3 bg-zinc-200" />
                <span className="text-[10px] font-black text-emerald-600 tabular-nums" title="Priced at each model's live OpenRouter price">
                  ${runStats.costUsd.toFixed(4)}
                </span>
              </>
            )}
            {runStats.calls > 1 && (
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300">
                {runStats.calls} calls
              </span>
            )}
            <button
              onClick={() => setRunStats(null)}
              title="Dismiss"
              className="ml-0.5 text-zinc-300 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {canScrollMain && (
          <div
            ref={scrollTrackRef}
            onClick={handleTrackClick}
            title="Click or drag to scroll"
            className="fixed right-2 top-1/2 -translate-y-1/2 h-[45vh] w-2.5 z-40 rounded-full bg-zinc-200/60 hover:bg-zinc-300/70 transition-colors cursor-pointer"
          >
            <div
              onPointerDown={handleThumbPointerDown}
              onPointerMove={handleThumbPointerMove}
              onPointerUp={handleThumbPointerUp}
              style={{ height: `${scrollThumbHeight}px`, top: `${scrollThumbTop}px` }}
              className="absolute left-0 w-full rounded-full bg-zinc-400 hover:bg-[#0070FF] active:bg-[#0070FF] transition-colors cursor-grab active:cursor-grabbing touch-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
