import React, { useState, useEffect } from 'react';
import ErrorNotice, { friendlyError } from '../../components/ErrorNotice';
import SavedAnswerNotice from '../../components/SavedAnswerNotice';
import RunProgress from '../../components/RunProgress';
import { generateHttpRequest } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { useLocation } from 'react-router-dom';
import {
  Loader2,
  Globe,
  Terminal,
  AlertCircle,
  Cpu,
  CheckCircle2,
  Layers
} from 'lucide-react';

/** Box-by-box values for an automation tool's HTTP node/module, each with its own Copy button. */
const FieldGuide: React.FC<{ rows: Array<{ field: string; value: string; note?: string }>; header: string; skipCopy: string; emptyText: string }> = ({ rows, header, skipCopy, emptyText }) => {
  if (!rows.length) return <p className="text-xs text-zinc-500 italic">{emptyText}</p>;
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <table className="w-full text-left border-collapse text-[11px] table-fixed">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200">
            <th className="px-4 py-2 font-black text-zinc-700 uppercase tracking-wider w-1/4">{header}</th>
            <th className="px-4 py-2 font-black text-zinc-700 uppercase tracking-wider">What to enter</th>
            <th className="px-4 py-2 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              <td className="px-4 py-3 font-bold text-zinc-900">{row.field}</td>
              <td className="px-4 py-3 min-w-0">
                <pre className="font-mono text-zinc-800 whitespace-pre-wrap [overflow-wrap:anywhere]">{row.value}</pre>
                {row.note && <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{row.note}</p>}
              </td>
              <td className="px-2 py-3">
                {row.field !== skipCopy && (
                  <button onClick={() => navigator.clipboard?.writeText(String(row.value).replace(/^Name: (.*?)\s{3}Value: /, '$1: ')).catch(() => {})}
                    className="text-[10px] font-bold text-[#0070FF] hover:underline">Copy</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const HttpBuilder: React.FC<{ onAction: (toolId: string, input: string, output: string) => void }> = ({ onAction }) => {
  const location = useLocation();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'n8n' | 'make' | 'curl'>('n8n');
  const [copiedText, setCopiedText] = useState<'curl' | 'n8n' | null>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    if (location.state?.extractedInput) {
      setPrompt(location.state.extractedInput);
    }
  }, [location.state]);

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!prompt) throw new Error('NO_INPUT: Target objective prompt required.');
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
      },
      commit: async () => {
        if (!result) throw new Error('NO_RESULT: Construct an HTTP specification first.');
        await new Promise(resolve => setTimeout(resolve, 1000));
        onAction('http-builder', prompt, JSON.stringify(result));
      }
    });
  }, [prompt, result, onAction, registerActions]);

  // fresh: skip the saved answer and research again ("Check again").
  const handleConstruct = async (fresh = false) => {
    if (!prompt || loading) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = await generateHttpRequest(prompt, { fresh });
      setResult(data);
      // Callback to track usage with full logging sync to firestore if active
      onAction('http-builder', prompt, JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setError(friendlyError(err, 'The HTTP request could not be generated. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'curl' | 'n8n') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <Globe size={16} className="text-[#0070FF] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Onyx Middleware Engine</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
            Prompt-to-HTTP <span className="text-[#0070FF]">Builder</span>
          </h2>
          <p className="text-zinc-600 text-xl max-w-3xl">Design clean HTTP specifications, production-ready curls, Axios integrations, and automation connectors from pure English.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Input Pane - 5 cols */}
        <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-[#0070FF]/25 shadow-xl bg-gradient-to-br from-white to-blue-50/10 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] block px-1">Describe Endpoint / Integration Request</label>
            <textarea 
              className="w-full h-44 bg-white border border-zinc-200 rounded-xl p-5 text-black text-xs font-medium focus:border-[#0070FF] focus:ring-1 focus:ring-[#0070FF] outline-none resize-y transition-all placeholder:text-zinc-400 leading-relaxed"
              placeholder="E.g., 'Make a request to Slack's chat.postMessage API using a Bearer token. It should pass the channel name, a nicely formatted markdown body text block, and custom attachment data in a POST payload.'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2">
            <h5 className="text-[9px] font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Cpu size={12} className="text-[#0070FF]" /> Prototyping Quick-Fill Scenarios
            </h5>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: 'HubSpot contact', text: 'Create a contact in HubSpot with first name, last name and email' },
                { label: 'CallRail call tag', text: 'Add the tag New Client to a call in CallRail' },
                { label: 'GoHighLevel tags', text: 'Add the tags VIP and Hot Lead to a contact in GoHighLevel' },
                { label: 'Podium text message', text: 'Send a text message to a customer in Podium' },
                { label: 'Slack message', text: 'Post a message to a Slack channel' }
              ].map((rec, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(rec.text)}
                  className="px-2.5 py-1.5 bg-white border border-zinc-200 hover:border-[#0070FF] rounded-lg text-[9px] font-semibold text-zinc-600 hover:text-[#0070FF] transition-all"
                >
                  {rec.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => handleConstruct()}
            disabled={loading || !prompt} 
            className="w-full bg-[#0070FF] hover:bg-[#005ACC] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] shadow-lg disabled:opacity-50 transition-all font-display cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Globe size={16} /> Construct HTTP Endpoint & Specs</>}
          </button>
          <ErrorNotice message={error} onClose={() => setError(null)} />
        </div>

        {/* Right Output Specs Pane - 7 cols */}
        <div className="lg:col-span-7">
          {result && result.found === false ? (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-2 min-w-0">
                  <h3 className="text-sm font-black text-zinc-900">No request built{result.platform ? ` for ${result.platform}` : ''}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed [overflow-wrap:anywhere]">{result.notice}</p>
                </div>
              </div>
              {(result.sources || []).length > 0 && (
                <div className="pl-7 space-y-1">
                  <p className="text-[11px] font-bold text-zinc-500">Pages checked:</p>
                  {result.sources.map((s: any, i: number) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#0070FF] hover:underline break-all">{s.title || s.url}</a>
                  ))}
                </div>
              )}
            </div>
          ) : result ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <SavedAnswerNotice savedAt={result.savedAt} onRefresh={() => handleConstruct(true)} busy={loading} />
              {(result.sources || []).length > 0 && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1.5">
                  <p className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Built from {result.platform}'s official API documentation:
                  </p>
                  {result.sources.map((s: any, i: number) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-emerald-700 hover:underline break-all pl-5">{s.title || s.url}</a>
                  ))}
                </div>
              )}
              {result.notCovered && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="[overflow-wrap:anywhere]"><span className="font-black">Not in the docs:</span> {result.notCovered}</span>
                </div>
              )}

              {/* Output Tabs Navigation */}
              <div className="bg-white border border-zinc-200 p-1.5 rounded-2xl flex items-center justify-start shadow-sm overflow-x-auto gap-1">
                {[
                  { id: 'n8n', label: 'n8n', icon: <Layers size={11} /> },
                  { id: 'make', label: 'Make.com', icon: <Layers size={11} /> },
                  { id: 'curl', label: 'cURL Command', icon: <Terminal size={11} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-[#0070FF] text-white shadow-md' : 'text-zinc-500 hover:text-black hover:bg-zinc-50'}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* n8n: paste-in node, then the same values box by box */}
              {activeTab === 'n8n' && (
                <div className="bg-white p-8 rounded-2xl border border-zinc-150 shadow-xl space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-4 gap-4 flex-wrap">
                    <div>
                      <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.4em] flex items-center gap-2">
                        <Layers size={14} /> n8n — HTTP Request node
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">Paste the whole node, or fill in each box below</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.n8nJson, 'n8n')}
                      className="text-[9px] font-black uppercase text-[#0070FF] hover:text-white hover:bg-[#0070FF] transition-all flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-[#0070FF]/15 cursor-pointer"
                    >
                      {copiedText === 'n8n' ? 'Copied' : 'Copy node'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    <span className="font-bold text-zinc-800">Quickest:</span> click <span className="font-bold">Copy node</span>, click on your n8n canvas and press Ctrl+V. The node arrives with every box below already filled in; you only add the credential.
                  </p>
                  <FieldGuide rows={result.n8nGuide || []} header="Box in n8n" skipCopy="Node" emptyText="No n8n values for this request." />
                  <details className="text-xs text-zinc-600">
                    <summary className="cursor-pointer font-bold text-zinc-700">Show the node code</summary>
                    <pre className="mt-3 bg-zinc-950 text-cyan-400 p-6 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed select-all max-h-96">
                      {result.n8nJson}
                    </pre>
                  </details>
                </div>
              )}

              {/* Make.com: HTTP module, box by box */}
              {activeTab === 'make' && (
                <div className="bg-white p-8 rounded-2xl border border-zinc-150 shadow-xl space-y-6">
                  <div className="border-b border-zinc-100 pb-4">
                    <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.4em] flex items-center gap-2">
                      <Layers size={14} /> Make.com — HTTP "Make a request" module
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">Copy each value into the matching box in Make.com</p>
                  </div>
                  <FieldGuide rows={result.makeGuide || []} header="Box in Make.com" skipCopy="Module" emptyText="No Make.com values for this request." />
                  <div className="p-4 bg-zinc-50 border border-zinc-200/50 rounded-xl text-xs text-zinc-600 leading-relaxed">
                    Use these values in Make.com's built-in HTTP app. If Make.com also has its own app for {result.platform}, that is usually simpler — check the Credential Assistant for how to connect it.
                  </div>
                </div>
              )}

              {/* cURL command */}
              {activeTab === 'curl' && (
                <div className="bg-white p-8 rounded-2xl border border-zinc-150 shadow-xl space-y-6">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-4 gap-4 flex-wrap">
                    <div>
                      <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.4em] flex items-center gap-2">
                        <Terminal size={14} /> cURL command
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">Test the call from a terminal</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.curlCommand, 'curl')}
                      className="text-[9px] font-black uppercase text-[#0070FF] hover:text-white hover:bg-[#0070FF] transition-all flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-[#0070FF]/15 cursor-pointer"
                    >
                      {copiedText === 'curl' ? 'Copied' : 'Copy cURL'}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 text-orange-400 p-6 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed select-all whitespace-pre-wrap max-h-96">
                    {result.curlCommand}
                  </pre>
                  <p className="text-xs text-zinc-600 leading-relaxed">Paste this into a terminal to test the call. Replace any &lt;...&gt; placeholders (including your key) with real values first.</p>
                </div>
              )}

            </div>
          ) : loading ? (
            <RunProgress functionName="generateHttpRequest" active={loading} />
          ) : (
            <div className="h-full border-2 border-dashed border-[#0070FF]/25 rounded-2xl flex flex-col items-center justify-center text-zinc-600 p-12 text-center min-h-[460px] bg-blue-50/5">
              <Globe size={48} className="mb-4 opacity-30 text-[#0070FF] animate-pulse" />
              <p className="text-[11px] uppercase tracking-[0.4em] font-black text-zinc-800">Connection Builder Idle</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-2 font-medium">
                Describe an API or system integration challenge on the left pane, and configure modular HTTP assets instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HttpBuilder;
