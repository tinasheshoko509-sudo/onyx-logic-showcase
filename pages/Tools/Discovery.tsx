
import React, { useState } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import { discoverTools } from '../../services/gemini';
import { Loader2, Search, Sparkles, ExternalLink, Link as LinkIcon, Zap } from 'lucide-react';

const Discovery: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, links: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query) return;
    setError(null);
    setLoading(true);
    try {
      const data = await discoverTools(query);
      setResult(data);
      onAction();
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The search could not be completed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Zap size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Automation Intelligence Search</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
          Tool <span className="text-[#0070FF]">Discovery</span>
        </h2>
        <p className="text-zinc-600 text-xl max-w-3xl">Locate state-of-the-art AI tools and automation platforms grounded in real-time neural search data.</p>
      </header>

      <div className="bg-[#0A0A0A] p-6 rounded-2xl border border-zinc-200 shadow-2xl mb-8">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#0070FF] transition-colors" size={20} />
          <input 
            className="w-full bg-white border border-zinc-200 rounded-xl py-4 pl-12 pr-32 text-black text-sm focus:outline-none focus:border-[#0070FF] transition-all"
            placeholder="e.g. Best open-source alternative to Pinecone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={loading || !query}
            className="absolute right-2 top-2 bottom-2 px-6 neon-bg text-black font-black rounded-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-all text-[10px] uppercase tracking-widest"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <><Sparkles size={14} /> Search</>}
          </button>
        </div>
        {error && <div className="mt-3"><ErrorNotice message={error} onClose={() => setError(null)} /></div>}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0A0A0A] p-8 rounded-2xl border border-zinc-800 animate-in slide-in-from-top-2 duration-500 shadow-2xl">
            <div className="text-base text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium">
               {result.text}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] p-6 rounded-2xl border border-zinc-800 h-fit shadow-xl">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2 px-1">
                <LinkIcon size={16} className="neon-accent text-[#0070FF]" /> Neural Sources
              </h4>
              <div className="space-y-2">
                {result.links.length > 0 ? result.links.map((link, i) => (
                  <a 
                    key={i} 
                    href={link.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-[#0070FF]/60 transition-all group"
                  >
                    <p className="text-xs font-black text-zinc-300 group-hover:text-white truncate mb-1 uppercase tracking-tight">{link.title}</p>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 truncate italic group-hover:text-[#0070FF]">
                      <ExternalLink size={10} /> {link.uri}
                    </div>
                  </a>
                )) : (
                  <p className="text-[10px] text-zinc-500 italic uppercase tracking-widest text-center py-4">No direct nodes resolved</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Discovery;
