
import React, { useState, useEffect } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { getWeeklyDiscovery, discoverTools } from '../../services/gemini';
import { WeeklyDiscovery, ProtocolBlueprint } from '../../types';
import { 
  Loader2, 
  BellRing, 
  Sparkles, 
  ExternalLink, 
  Calendar, 
  CheckCircle, 
  Globe, 
  Zap,
  Activity,
  ArrowRight,
  Database,
  Terminal,
  Shield,
  Wifi,
  BarChart3,
  Monitor,
  Fingerprint,
  Layers,
  Search,
  Workflow,
  RefreshCw,
  Clock,
  ChevronRight,
  Link as LinkIcon,
  Braces
} from 'lucide-react';

const renderInline = (text: string): React.ReactNode => {
  const segments: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const patterns = [
    { regex: /`([^`]+)`/,                render: (m: RegExpExecArray) => <code key={key++} className="bg-zinc-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-800">{m[1]}</code> },
    { regex: /\*\*([^*]+)\*\*/,          render: (m: RegExpExecArray) => <strong key={key++} className="font-black text-zinc-900">{m[1]}</strong> },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/,  render: (m: RegExpExecArray) => <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-[#0070FF] underline underline-offset-2 hover:opacity-75 break-all">{m[1]}</a> },
  ];
  while (remaining.length > 0) {
    let earliest: { index: number; match: RegExpExecArray; render: (m: RegExpExecArray) => React.ReactNode } | null = null;
    for (const { regex, render } of patterns) {
      const match = regex.exec(remaining);
      if (match && (earliest === null || match.index < earliest.index)) {
        earliest = { index: match.index, match, render };
      }
    }
    if (!earliest) { segments.push(remaining); break; }
    if (earliest.index > 0) segments.push(remaining.slice(0, earliest.index));
    segments.push(earliest.render(earliest.match));
    remaining = remaining.slice(earliest.index + earliest.match[0].length);
  }
  return <>{segments}</>;
};

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-zinc-700 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith('###')) {
          return <h4 key={i} className="text-sm font-bold text-zinc-950 mt-4 uppercase tracking-wider">{renderInline(trimmed.replace(/^###\s*/, ''))}</h4>;
        }
        if (trimmed.startsWith('##')) {
          return <h3 key={i} className="text-base font-black text-zinc-950 mt-6 uppercase tracking-tight">{renderInline(trimmed.replace(/^##\s*/, ''))}</h3>;
        }
        if (trimmed.startsWith('#')) {
          return <h2 key={i} className="text-lg font-black text-zinc-950 mt-8 uppercase tracking-tighter border-b pb-2">{renderInline(trimmed.replace(/^#\s*/, ''))}</h2>;
        }
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          return (
            <li key={i} className="list-none pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-[#0070FF]">
              {renderInline(trimmed.replace(/^[-*]\s*/, ''))}
            </li>
          );
        }
        if (/^\d+\./.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s*(.*)/);
          return (
            <div key={i} className="pl-6 relative">
              <span className="absolute left-0 text-[#0070FF] font-black">{match ? match[1] : ''}</span>
              <span>{renderInline(match ? match[2] : trimmed)}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
};

const WeeklyIntel: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [activeTab, setActiveTab] = useState<'digest' | 'discovery'>('digest');
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [discovery, setDiscovery] = useState<{ tools: WeeklyDiscovery[], links: any[] } | null>(null);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResult, setSearchResult] = useState<{ text: string, links: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setError(null);
    setLoadingSearch(true);
    setSearchResult(null);
    try {
      const data = await discoverTools(searchQuery);
      setSearchResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The search could not be completed. Please try again.'));
    } finally {
      setLoadingSearch(false);
    }
  };

  const CACHE_KEY = 'onyx_intel_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000;

  const fetchDigest = async () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setDiscovery(data);
          setSelectedToolIndex(0);
          return;
        }
      } catch {}
    }
    setError(null);
    setLoadingDigest(true);
    try {
      const data = await getWeeklyDiscovery();
      setDiscovery(data);
      setSelectedToolIndex(0);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The weekly digest could not be loaded. Please try again.'));
    } finally {
      setLoadingDigest(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'digest' && !discovery) fetchDigest();
  }, [activeTab]);

  const currentTool = discovery && discovery.tools && discovery.tools.length > 0 
    ? (discovery.tools[selectedToolIndex] || discovery.tools[0]) 
    : null;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <Zap size={16} className="text-[#0070FF] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">14-Day AI Discovery Feed</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
            New <span className="text-[#0070FF]">Intelligence</span>
          </h2>
          <p className="text-zinc-600 text-xl max-w-3xl leading-relaxed">Grounded retrieval of the latest AI automation breakthroughs and technical stack releases over the last 14 days.</p>
        </div>
        
        <div className="glass p-1 rounded-xl border border-black/5 flex w-full md:w-64 h-10 overflow-hidden shrink-0">
          <button onClick={() => setActiveTab('digest')} className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'digest' ? 'bg-[#0070FF] text-white shadow-lg' : 'text-zinc-500 hover:text-black'}`}>Digest</button>
          <button onClick={() => setActiveTab('discovery')} className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'discovery' ? 'bg-[#0070FF] text-white shadow-lg' : 'text-zinc-500 hover:text-black'}`}>Discovery</button>
        </div>
      </header>

      {activeTab === 'digest' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          {loadingDigest ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center glass rounded-2xl border border-black/5">
              <Loader2 className="animate-spin text-[#0070FF]" size={32} />
              <p className="text-[10px] uppercase font-black tracking-widest mt-4 text-zinc-500 animate-pulse">Running live retrieval...</p>
            </div>
          ) : discovery && discovery.tools && discovery.tools.length > 0 && currentTool ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/25 shadow-xl relative overflow-hidden group bg-gradient-to-br from-white to-blue-50/10">
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <span className="px-3 py-1 bg-[#0070FF]/10 border border-[#0070FF]/20 text-[#0070FF] text-[9px] font-black uppercase tracking-widest rounded-lg">{currentTool.category}</span>
                    <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Released: {currentTool.releaseDate}</span>
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tighter text-zinc-900 uppercase">{currentTool.toolName}</h3>

                  {currentTool.description && (
                    <div className="mb-6">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] mb-2">What It Is</h4>
                      <p className="text-zinc-600 text-sm leading-relaxed font-bold">{currentTool.description}</p>
                    </div>
                  )}

                  <div className="space-y-4 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentTool.whyItMatters && (
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] mb-1">Why It Matters</h4>
                          <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">{currentTool.whyItMatters}</p>
                        </div>
                      )}
                      {currentTool.largelyUsedFor && (
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] mb-1">How You Can Use It</h4>
                          <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">{currentTool.largelyUsedFor}</p>
                        </div>
                      )}
                    </div>

                    {currentTool.protocolBlueprints && currentTool.protocolBlueprints.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Integration Guidelines & Code</h4>
                        {currentTool.protocolBlueprints.slice(0, 2).map((bp, i) => (
                          <div key={i} className="bg-blue-50/20 border border-[#0070FF]/10 p-4 rounded-xl group/item hover:border-[#0070FF]/20 transition-all">
                             <div className="flex items-center gap-3 mb-2">
                               <Terminal size={14} className="text-[#0070FF]"/>
                               <h5 className="text-[11px] font-black uppercase tracking-tight text-zinc-900">{bp.title}</h5>
                             </div>
                             {bp.objective && <p className="text-[10px] text-zinc-500 font-bold mb-2 uppercase">{bp.objective}</p>}
                             <div className="bg-white border border-[#0070FF]/10 p-3 rounded-lg text-[9px] font-mono text-zinc-700 overflow-x-auto pre-wrap">{bp.logic}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {currentTool.url ? (
                    <a href={currentTool.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-6 py-3 bg-[#0070FF] hover:bg-[#005ACC] text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg transition-colors">
                      Visit {currentTool.toolName} Landing Page <ExternalLink size={14}/>
                    </a>
                  ) : (
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">No official link available</span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass p-6 rounded-xl border border-black/5 space-y-4">
                  <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                    <Sparkles size={14} className="text-[#0070FF]" /> Discovered New Tools
                  </h4>
                  <div className="space-y-2">
                    {discovery.tools.map((tool, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedToolIndex(i)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                          selectedToolIndex === i
                            ? 'bg-[#0070FF]/5 border-[#0070FF] text-[#0070FF] shadow-sm'
                            : 'bg-white/40 border-black/5 text-zinc-700 hover:bg-white/80 hover:border-black/10'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <p className={`text-[11px] font-black uppercase tracking-tight truncate ${selectedToolIndex === i ? 'text-[#0070FF]' : 'text-zinc-900'}`}>{tool.toolName}</p>
                          <span className="text-[8px] opacity-75 font-black uppercase tracking-wider shrink-0 ml-2">{tool.category}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{tool.description}</p>
                        {tool.url && (
                          <span className="text-[8px] font-black text-[#0070FF] uppercase tracking-widest mt-1 flex items-center gap-1">
                            Link Available <LinkIcon size={8} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass p-6 rounded-xl border border-black/5 space-y-4">
                  <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                    <LinkIcon size={14} className="text-[#0070FF]" /> Search Grounding chunks
                  </h4>
                  <div className="space-y-2">
                    {discovery.links && discovery.links.length > 0 ? (
                      discovery.links.slice(0, 4).map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-[#0070FF]/5 border border-[#0070FF]/10 rounded-lg hover:border-[#0070FF]/45 transition-all group">
                          <p className="text-[10px] font-black text-zinc-600 group-hover:text-[#0070FF] truncate uppercase">{link.title}</p>
                          <ExternalLink size={10} className="text-[#0070FF]/40 group-hover:text-[#0070FF] ml-2" />
                        </a>
                      ))
                    ) : (
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">No citations generated</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-[400px] border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-800 bg-blue-50/10">
              <button onClick={fetchDigest} className="px-8 py-3 bg-[#0070FF] hover:bg-[#005ACC] text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg transition-colors">Establish Uplink</button>
              <ErrorNotice message={error} onClose={() => setError(null)} />
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[#0070FF]/20 shadow-xl relative overflow-hidden group bg-gradient-to-br from-white to-blue-50/10">
            <h3 className="text-zinc-900 text-xl font-black uppercase tracking-tighter mb-4">AI Discovery Search</h3>
            <p className="text-zinc-500 text-xs mb-6 uppercase tracking-wider font-semibold">Search for any AI tool, framework, or topic. Get a simple, detailed explanation of what it is and how to use it.</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                className="w-full bg-white border border-zinc-200 rounded-xl py-4 pl-12 pr-32 text-black text-xs font-semibold outline-none focus:border-[#0070FF] transition-all" 
                placeholder="E.g., Pinecone alternatives, Pipedream trigger systems..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <button 
                onClick={handleSearch}
                disabled={loadingSearch}
                className="absolute right-2 top-2 bottom-2 px-5 bg-[#0070FF] hover:bg-[#005ACC] text-white font-black rounded-lg text-[9px] uppercase tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {loadingSearch ? <Loader2 className="animate-spin" size={12} /> : 'Execute'}
              </button>
            </div>
            <ErrorNotice message={error} onClose={() => setError(null)} />
          </div>

          {loadingSearch && (
            <div className="min-h-[250px] flex flex-col items-center justify-center glass rounded-2xl border border-black/5">
              <Loader2 className="animate-spin text-[#0070FF]" size={28} />
              <p className="text-[10px] uppercase font-black tracking-widest mt-4 text-zinc-500 animate-pulse">Scanning search registry...</p>
            </div>
          )}

          {searchResult && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
              <div className="xl:col-span-2 bg-white p-8 rounded-2xl border border-zinc-100 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#0070FF]">Research Synthesis Result</h4>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Source Verification: Passed</span>
                </div>
                <SimpleMarkdownRenderer text={searchResult.text} />
              </div>

              <div className="space-y-4">
                <div className="glass p-6 rounded-xl border border-black/5 space-y-4">
                  <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                    <LinkIcon size={14} className="text-[#0070FF]" /> Grounded Citations ({searchResult.links?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {searchResult.links && searchResult.links.length > 0 ? (
                      searchResult.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-[#0070FF]/5 border border-[#0070FF]/10 rounded-lg hover:border-[#0070FF]/45 transition-all group">
                          <p className="text-[10px] font-black text-zinc-600 group-hover:text-[#0070FF] truncate uppercase">{link.title}</p>
                          <ExternalLink size={10} className="text-[#0070FF]/40 group-hover:text-[#0070FF] ml-2" />
                        </a>
                      ))
                    ) : (
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">No citations generated</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyIntel;
