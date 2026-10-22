import React, { useState, useEffect } from 'react';
import { getApiSandboxAnalysis } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import {
  Loader2,
  Send,
  Plus,
  Trash2,
  Database,
  AlertCircle,
  Settings,
  Sparkles,
  FileJson
} from 'lucide-react';

const PRESETS = [
  {
    name: 'Stripe Payment Intent',
    method: 'POST',
    url: 'https://api.stripe.com/v1/payment_intents',
    headers: [
      { key: 'Authorization', value: 'Bearer sk_test_51...your_key' },
      { key: 'Content-Type', value: 'application/x-www-form-urlencoded' }
    ],
    queryParams: [],
    body: JSON.stringify({
      amount: 2000,
      currency: 'usd',
      payment_method_types: ['card'],
      receipt_email: 'premium-member@onyx.io',
      metadata: {
        order_id: 'order_99831',
        node_tier: 'enterprise'
      }
    }, null, 2)
  },
  {
    name: 'Slack Webhook Alert',
    method: 'POST',
    url: 'https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_WEBHOOK_TOKEN',
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ],
    queryParams: [],
    body: JSON.stringify({
      text: "🚨 *Onyx System Alert*: Node capacity constraint detected.",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*CRITICAL WARNING*: API rate limit reached on webhook router node-B."
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Audit Log"
              },
              url: "https://onyx.io/logs"
            }
          ]
        }
      ]
    }, null, 2)
  },
  {
    name: 'Auth0 Get Access Token',
    method: 'POST',
    url: 'https://onyx-auth.auth0.com/oauth/token',
    headers: [
      { key: 'Content-Type', value: 'application/json' }
    ],
    queryParams: [],
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      audience: 'https://api.onyx-logic.io'
    }, null, 2)
  },
  {
    name: 'SendGrid Email Dispatch',
    method: 'POST',
    url: 'https://api.sendgrid.com/v3/mail/send',
    headers: [
      { key: 'Authorization', value: 'Bearer YOUR_SENDGRID_API_KEY' },
      { key: 'Content-Type', value: 'application/json' }
    ],
    queryParams: [],
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: 'recipient@domain.com', name: 'Elite Lead Integrator' }],
          subject: 'Your Onyx Node Setup Protocol is Ready'
        }
      ],
      from: { email: 'ops@onyx-logic.io', name: 'Onyx Operations' },
      content: [
        {
          type: 'text/html',
          value: '<p>Standard handoff configuration compiled successfully.</p>'
        }
      ]
    }, null, 2)
  }
];

const ApiSandbox: React.FC<{ onAction: (toolId: string, input: string, output: string) => void }> = ({ onAction }) => {
  // Request States
  const [method, setMethod] = useState('POST');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([]);
  const [body, setBody] = useState('');

  // Tabs / Active state
  const [activeRequestTab, setActiveRequestTab] = useState<'body' | 'headers' | 'params'>('body');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { registerActions } = useProtocol();

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        setLoading(true);
        try {
          const sample = await getApiSandboxAnalysis({ method, url, headers, queryParams, body });
          setResult(sample);
        } catch (e) {
          setErrorMsg('Protocol Simulation Failure.');
        } finally {
          setLoading(false);
        }
      }
    });
  }, [method, url, headers, queryParams, body]);

  const selectPreset = (p: typeof PRESETS[0]) => {
    setMethod(p.method);
    setUrl(p.url);
    setHeaders([...p.headers]);
    setQueryParams([...p.queryParams]);
    setBody(p.body);
  };

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleUpdateHeader = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  const handleAddParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  const handleRemoveParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const handleUpdateParam = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...queryParams];
    updated[index][field] = val;
    setQueryParams(updated);
  };

  // Perform Gemini dissection payload & simulated response setup
  const runPayloadAnalysis = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await getApiSandboxAnalysis({ method, url, headers, queryParams, body });
      setResult(response);
      onAction('api-sandbox', `Method: ${method}\nURL: ${url}\nBody: ${body}`, JSON.stringify(response));
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Verification & processing failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12" id="api_sandbox_node">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6" id="api_sandbox_header">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <Send size={16} className="text-[#0070FF] animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Onyx Middleware Engine</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4">
            Onyx API <span className="text-[#0070FF]">Sandbox</span>
          </h2>
          <p className="text-zinc-600 text-xl max-w-3xl">Analyze, construct and dispatch API payloads. Get a comprehensive, plain English variables dictionary and beautiful next-gen production output simulation.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="sandbox_two_column_container">
        
        {/* LEFT COLUMN: INTERACTIVE REQUEST BUILDER */}
        <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-[#0070FF]/25 shadow-xl bg-gradient-to-br from-white to-blue-50/10 space-y-6" id="sandbox_request_column">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-[#0070FF]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700">1. HTTP Request Configurator</span>
            </div>

            {/* HTTP METHOD AND URL BAR */}
            <div className="flex gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 px-3.5 py-2.5 rounded-xl text-xs font-black text-zinc-805 uppercase tracking-wider cursor-pointer outline-none transition-all"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              <input
                type="text"
                placeholder="https://api.example.com/v1/resource"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-zinc-50 hover:bg-zinc-100/60 focus:bg-white border border-zinc-200 focus:border-[#0070FF]/50 px-4 py-2.5 rounded-xl text-xs font-mono font-medium text-zinc-900 outline-none transition-all"
              />
            </div>

            {/* REQUEST CONFIGURATION TABS */}
            <div className="border-b border-zinc-100 flex gap-2">
              {[
                { id: 'body', label: 'Body (JSON)', active: activeRequestTab === 'body' },
                { id: 'headers', label: `Headers (${headers.length})`, active: activeRequestTab === 'headers' },
                { id: 'params', label: `Params (${queryParams.length})`, active: activeRequestTab === 'params' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRequestTab(tab.id as any)}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 px-1 cursor-pointer transition-all ${
                    tab.active 
                      ? 'border-[#0070FF] text-[#0070FF]' 
                      : 'border-transparent text-zinc-400 hover:text-zinc-650'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: HEADERS */}
            {activeRequestTab === 'headers' && (
              <div className="space-y-3 min-h-[220px] animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">HTTP Header Key/Value Pairs</span>
                  <button
                    onClick={handleAddHeader}
                    className="flex items-center gap-1.5 text-[10px] font-black text-[#0070FF] bg-blue-50/50 hover:bg-blue-50 hover:text-[#005ACC] border border-[#0070FF]/20 px-3 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    <Plus size={10} /> Add Header
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {headers.map((h, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Key (e.g. Authorization)"
                        value={h.key}
                        onChange={(e) => handleUpdateHeader(index, 'key', e.target.value)}
                        className="flex-1 bg-zinc-50 border border-zinc-200 text-xs px-3 py-2 rounded-lg font-mono outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={h.value}
                        onChange={(e) => handleUpdateHeader(index, 'value', e.target.value)}
                        className="flex-1 bg-zinc-50 border border-zinc-200 text-xs px-3 py-2 rounded-lg font-mono outline-none"
                      />
                      <button
                        onClick={() => handleRemoveHeader(index)}
                        className="text-zinc-400 hover:text-rose-500 p-2 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {headers.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 text-xs font-semibold italic border border-dashed border-zinc-200 rounded-xl">
                      No custom headers added. Standard implicit headers apply.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: QUERY PARAMETERS */}
            {activeRequestTab === 'params' && (
              <div className="space-y-3 min-h-[220px] animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">URL Query String Parameters</span>
                  <button
                    onClick={handleAddParam}
                    className="flex items-center gap-1.5 text-[10px] font-black text-[#0070FF] bg-blue-50/50 hover:bg-blue-50 hover:text-[#005ACC] border border-[#0070FF]/20 px-3 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    <Plus size={10} /> Add Param
                  </button>
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {queryParams.map((q, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Key (e.g. limit)"
                        value={q.key}
                        onChange={(e) => handleUpdateParam(index, 'key', e.target.value)}
                        className="flex-1 bg-zinc-50 border border-zinc-200 text-xs px-3 py-2 rounded-lg font-mono outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={q.value}
                        onChange={(e) => handleUpdateParam(index, 'value', e.target.value)}
                        className="flex-1 bg-zinc-50 border border-zinc-200 text-xs px-3 py-2 rounded-lg font-mono outline-none"
                      />
                      <button
                        onClick={() => handleRemoveParam(index)}
                        className="text-zinc-400 hover:text-rose-500 p-2 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {queryParams.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 text-xs font-semibold italic border border-dashed border-zinc-200 rounded-xl">
                      No explicit query parameters added yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: BODY */}
            {activeRequestTab === 'body' && (
              <div className="space-y-2 min-h-[220px] animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileJson size={12} className="text-[#0070FF]" /> Send JSON Body Payload
                  </span>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">application/json</span>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={"{\n  \"variable\": \"payload\"\n}"}
                  rows={10}
                  className="w-full bg-zinc-950 text-sky-400 focus:text-emerald-400 focus:bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-xs font-mono outline-none focus:border-[#0070FF]/50 transition-all shadow-inner leading-relaxed select-all"
                />
              </div>
            )}

            {/* QUICK TEMPLATES / PRESETS SELECTOR */}
            <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2">
              <h5 className="text-[9px] font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#0070FF]" /> Prototyping Quick-Fill Scenarios
              </h5>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => selectPreset(p)}
                    className="px-2.5 py-1.5 bg-white border border-zinc-200 hover:border-[#0070FF] rounded-lg text-[9px] font-semibold text-zinc-600 hover:text-[#0070FF] transition-all cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ACTION SUBMIT CONTAINER */}
          <div className="border-t border-zinc-150 pt-4 space-y-3" id="sandbox_action_buttons">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* PRIMARY: DISSECT AND SIMULATE */}
              <button
                onClick={runPayloadAnalysis}
                disabled={loading}
                className="flex-1 bg-[#0070FF] hover:bg-[#005ACC] disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-display text-xs font-black uppercase tracking-wider py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 shadow-md disabled:shadow-none hover:shadow-lg transition-all cursor-pointer select-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Dissecting Variables...</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span>Send & Get Payload Dictionary</span>
                  </>
                )}
              </button>

            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-650 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 animate-pulse">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTELLIGENT AI OUTPUT & DISSECTION */}
        <div className="lg:col-span-7 space-y-6" id="sandbox_ai_output_column">
          {/* DYNAMIC RESULTS BOARD */}
          {result ? (
            <div className="space-y-6 animate-in fade-in duration-400">
              {/* SECTION: SUMMARY & DEEP INTEL */}
              {result.validationIssues && result.validationIssues.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle size={16} className="shrink-0" />
                    <h5 className="text-xs font-black uppercase tracking-wider">Onyx Request Diagnostics: {result.validationIssues.length} Issue{result.validationIssues.length > 1 ? 's' : ''} Identified</h5>
                  </div>
                  <ul className="space-y-11 pl-5 list-disc text-xs text-amber-800 font-medium leading-relaxed">
                    {result.validationIssues.map((issue: string, idx: number) => (
                      <li key={idx}>
                        {issue}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider pt-1">💡 Double-check your JSON body formatting syntax, query variables spelling, or authentication headers standard formats.</p>
                </div>
              )}

              {/* POSTMAN-LIKE STATUS BAR */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Simulated Output Console</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-black border uppercase tracking-wider ${
                      result.simulatedStatusCode >= 200 && result.simulatedStatusCode < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                    }`}>
                      {result.simulatedStatusCode || 200} {result.simulatedStatusText || 'OK'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-5 text-[11px] font-mono font-semibold text-zinc-400">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase tracking-widest text-[#0070FF] font-black">Response Time</span>
                    <span className="text-zinc-200 mt-0.5">{(Math.floor(Math.random() * 15) + 12)} ms</span>
                  </div>
                  <div className="h-6 w-[1px] bg-zinc-800" />
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase tracking-widest text-[#0070FF] font-black">Size</span>
                    <span className="text-zinc-200 mt-0.5">{(result.productionResponseMock ? (result.productionResponseMock.length / 1024).toFixed(2) : '0.45')} KB</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-md space-y-4">
                <div className="flex items-center gap-1.5 pb-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-250">
                    Onyx Verified
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-[0.15em] font-black">Structure Audit Success</span>
                </div>
                <h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Protocol Overview</h4>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-150">
                  {result.summary}
                </p>
              </div>

              {/* SECTION: PLAIN ENGLISH REQUEST VARIABLES DICTIONARY */}
              <div className="bg-white p-6 rounded-2xl border border-[#0070FF]/15 shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0070FF]">
                    <span className="text-[9px] font-black">1</span>
                  </div>
                  <h4 className="text-xs font-black text-zinc-800 uppercase tracking-widest">
                    Request Variable Dissection (Plain English)
                  </h4>
                </div>
                
                {result.requestBodyDetails && result.requestBodyDetails.length > 0 ? (
                  <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-[11px] font-sans">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                          <th className="px-4 py-2.5 font-black text-zinc-600 uppercase tracking-widest w-[30%]">Input Field</th>
                          <th className="px-4 py-2.5 font-black text-zinc-600 uppercase tracking-widest w-[18%]">Datatype</th>
                          <th className="px-4 py-2.5 font-black text-zinc-600 uppercase tracking-widest">Explanation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {result.requestBodyDetails.map((v: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50/40">
                            <td className="px-4 py-3 font-mono text-zinc-900 font-bold select-all break-all">{v.key}</td>
                            <td className="px-4 py-3">
                              <span className="bg-neutral-100 border border-neutral-200 rounded px-1.5 py-0.5 text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider">
                                {v.dataType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-650 font-medium leading-relaxed">
                              {v.plainEnglishExplanation}
                              <div className="mt-1 text-[9px] font-mono font-semibold text-blue-600 uppercase">
                                e.g. {v.productionValueType}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500 font-medium italic text-center">
                    No explicit request body parameters required.
                  </div>
                )}
              </div>

              {/* SECTION: EXPECTED PRODUCTION RESPONSE MOCKUP */}
              <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-850 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-855 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <span className="text-[9px] font-black">2</span>
                    </div>
                    <h4 className="text-xs font-black text-zinc-200 uppercase tracking-widest">
                      Production Simulation Response
                    </h4>
                  </div>
                  <span className="text-[8.5px] font-mono text-emerald-400 font-bold tracking-widest select-none bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
                    JSON RESULT
                  </span>
                </div>
                <pre className="bg-zinc-950 text-emerald-400 p-2 text-xs font-mono overflow-x-auto select-all leading-relaxed whitespace-pre font-medium p-4 rounded-xl border border-zinc-800">
                  {result.productionResponseMock}
                </pre>
              </div>

              {/* SECTION: RESPONSE VARIABLE DICTIONARY AND SIGNIFICANCE */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <span className="text-[9px] font-black">3</span>
                  </div>
                  <h4 className="text-xs font-black text-zinc-800 uppercase tracking-widest">
                    Response Variables Explainer & Significance
                  </h4>
                </div>

                {result.productionResponseFields && result.productionResponseFields.length > 0 ? (
                  <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-[11px] font-sans">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200">
                          <th className="px-4 py-2.5 font-black text-zinc-650 uppercase tracking-widest w-[28%]">Returned Field</th>
                          <th className="px-4 py-2.5 font-black text-zinc-655 uppercase tracking-widest w-[16%]">Type</th>
                          <th className="px-4 py-2.5 font-black text-zinc-655 uppercase tracking-widest">Meaning & Downstream Impact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {result.productionResponseFields.map((f: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50/40">
                            <td className="px-4 py-3 font-mono text-emerald-800 font-bold select-all break-all">{f.key}</td>
                            <td className="px-4 py-3">
                              <span className="bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 text-[8.5px] font-mono text-emerald-600 uppercase tracking-wider">
                                {f.dataType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-655 font-medium leading-relaxed">
                              <p className="text-zinc-700 font-semibold">{f.plainEnglishExplanation}</p>
                              <div className="text-[9.5px] text-zinc-500 font-medium italic mt-1 pb-0.5">
                                <span className="font-bold text-amber-600 not-italic uppercase text-[8.5px] tracking-wider pr-1">SIG:</span> 
                                {f.significance}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500 font-medium italic text-center">
                    No explicit fields parsed in the simulation output.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-inner min-h-[350px]">
              <Database size={36} className="text-zinc-300 stroke-[1.5]" />
              <div>
                <h4 className="text-sm font-black text-zinc-700 uppercase tracking-wide">Output & Dissection Console</h4>
                <p className="text-xs text-zinc-400 max-w-sm font-medium mt-1">
                  Configure your headers, variables, and parameters, then hit the <span className="text-[#0070FF] font-bold">"Send & Get Payload Dictionary"</span> button to dissect fields instantly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiSandbox;
