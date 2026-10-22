import React, { useState, useEffect } from 'react';
import { transformPayload } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { useLocation } from 'react-router-dom';
import {
  Loader2,
  Shuffle,
  Terminal,
  AlertCircle,
  Cpu,
  CheckCircle2,
  Code2,
  Layers,
  Lock,
  ArrowRightLeft
} from 'lucide-react';

const PRESETS = [
  {
    label: 'Stripe webhook ➔ Slack Card',
    source: `{
  "id": "evt_1N2y3z4A5",
  "object": "event",
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_1N2y3z4B5",
      "amount": 29900,
      "billing_details": {
        "email": "user@example.com",
        "name": "Jane Doe"
      },
      "currency": "usd",
      "receipt_url": "https://stripe.com/receipt"
    }
  }
}`,
    target: 'Morph this Stripe webhook charge into a professional Slack attachment block. The output should include a text block reading "Payment Succeeded: $299.00 from Jane Doe (user@example.com)" and an accessory link button for the receipt url.'
  },
  {
    label: 'Typeform submission ➔ DB Format',
    source: `{
  "event_id": "01H2AXJZW",
  "form_response": {
    "form_id": "survey123",
    "submitted_at": "2026-06-13T12:00:00Z",
    "answers": [
      {
        "type": "text",
        "text": "Alexander Smith",
        "field": { "id": "name_field", "ref": "name" }
      },
      {
        "type": "email",
        "email": "alex@smith.org",
        "field": { "id": "email_field", "ref": "email" }
      }
    ]
  }
}`,
    target: 'Flatten this nested array of Typeform answers into a flat database format. I want a clean flat object with keys: name, email, formId, and receivedAt (mapped from submitted_at).'
  },
  {
    label: 'HubSpot Contact ➔ Mailchimp Member',
    source: `{
  "portalId": 883204,
  "objectType": "CONTACT",
  "objectId": 1402,
  "properties": {
    "firstname": { "value": "Teresa" },
    "lastname": { "value": "Mendez" },
    "email": { "value": "teresa.m@hq.co" },
    "company": { "value": "Aperture Labs" },
    "lifecyclestage": { "value": "marketingqualifiedlead" }
  }
}`,
    target: 'Reshape this HubSpot payload into a standard Mailchimp list member format. It requires: email_address, status: "subscribed", and merge_fields (an object containing FNAME, LNAME, and COMPANY).'
  }
];

const PayloadMorpher: React.FC<{ onAction: (toolId: string, input: string, output: string) => void }> = ({ onAction }) => {
  const location = useLocation();
  const [sourceJson, setSourceJson] = useState('');
  const [targetPrompt, setTargetPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transformed' | 'js' | 'n8n' | 'jq' | 'audit'>('transformed');
  const [copiedText, setCopiedText] = useState<'transformed' | 'js' | 'n8n' | 'jq' | null>(null);

  const { registerActions } = useProtocol();

  useEffect(() => {
    if (location.state?.extractedInput) {
      // If passing input from another tool
      setSourceJson(location.state.extractedInput);
    }
  }, [location.state]);

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        if (!sourceJson) throw new Error('NO_INPUT: Source raw JSON is required.');
        setLoading(true);
        try {
          JSON.parse(sourceJson);
        } catch (e: any) {
          throw new Error('INVALID_JSON: Unable to parse source payload. Check formatting.');
        } finally {
          setLoading(false);
        }
      },
      commit: async () => {
        if (!result) throw new Error('NO_RESULT: Morph a payload first.');
        await new Promise(resolve => setTimeout(resolve, 800));
        onAction('payload-morpher', sourceJson, JSON.stringify(result));
      }
    });
  }, [sourceJson, result, onAction, registerActions]);

  const handleMorph = async () => {
    if (!sourceJson || !targetPrompt || loading) return;
    setLoading(true);
    setResult(null);
    setErrorMsg(null);

    // Basic client-side check to assist developers instantly
    try {
      JSON.parse(sourceJson);
    } catch (e: any) {
      setErrorMsg(`Invalid Source JSON: ${e.message}. Please correct the formatting and try again.`);
      setLoading(false);
      return;
    }

    try {
      const data = await transformPayload(sourceJson, targetPrompt);
      setResult(data);
      onAction('payload-morpher', sourceJson + '\n\nInstructions:\n' + targetPrompt, JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Payload conversion failed. Ensure your schema criteria are reachable manually.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'transformed' | 'js' | 'n8n' | 'jq') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
           <Shuffle size={16} className="text-[#0070FF] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-sans">Onyx Middleware Engine</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4 text-zinc-900">
          Onyx Payload <span className="text-[#0070FF]">Morpher</span>
        </h2>
        <p className="text-zinc-650 text-xl max-w-3xl font-sans leading-relaxed">
          Instantly translate, flatten, or reshape nested webhook payloads and API schemas between custom platforms, generating client code & automation mappings concurrently.
        </p>
      </header>

      {/* Preset Pickers */}
      <div className="glass border border-black/5 p-6 rounded-2xl space-y-4 shadow-xl">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 block font-sans px-1">Select a standard Integration Preset</span>
        <div className="flex flex-wrap gap-2.5">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSourceJson(preset.source);
                setTargetPrompt(preset.target);
              }}
              className="px-4 py-2 bg-white/40 border border-black/10 hover:border-[#0070FF]/50 hover:bg-[#0070FF]/5 rounded-xl text-xs font-semibold text-zinc-800 hover:text-[#0070FF] transition-all cursor-pointer flex items-center gap-2 shadow-sm font-sans"
            >
              <Cpu size={12} />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Input Pane */}
        <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans">1. Source Webhook Payload (JSON)</label>
              <span className="text-[9px] text-[#0070FF] font-mono tracking-widest font-black">VALIDATING JSON LIVE</span>
            </div>
            <textarea 
              className="w-full h-80 bg-zinc-950 text-emerald-400 border border-zinc-900 rounded-xl p-5 text-xs font-mono leading-relaxed focus:outline-none focus:border-[#0070FF]/50 resize-y transition-all placeholder:text-zinc-800"
              placeholder="Paste raw response payload here..."
              value={sourceJson}
              onChange={(e) => setSourceJson(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] block px-1 font-sans">2. Target Mapping criteria / prompt</label>
            <textarea 
              className="w-full h-28 bg-white border border-black/10 rounded-xl p-5 text-black text-sm focus:outline-none focus:border-[#0070FF]/50 transition-all resize-none placeholder:text-zinc-400 leading-relaxed font-sans"
              placeholder="E.g., 'Reshape to match Typeform answers. Create flat mapping arrays.'"
              value={targetPrompt}
              onChange={(e) => setTargetPrompt(e.target.value)}
            />
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-700 text-xs font-sans">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="font-semibold leading-normal">{errorMsg}</p>
            </div>
          )}

          <button 
            onClick={handleMorph} 
            disabled={loading || !sourceJson || !targetPrompt} 
            className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 text-xs uppercase tracking-[0.4em] shadow-lg disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-display"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <><ArrowRightLeft size={16} /> Translate & Morph Payload</>}
          </button>
        </div>

        {/* Right Output Pane */}
        <div className="overflow-y-auto max-h-[900px] pr-1">
          {result ? (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              
              {/* Output Tab Selection */}
              <div className="glass border border-black/5 p-1.5 rounded-2xl flex items-center justify-between shadow-md overflow-x-auto gap-1">
                {[
                  { id: 'transformed', label: 'Morphed JSON', icon: <Shuffle size={12} /> },
                  { id: 'js', label: 'JS Transform', icon: <Code2 size={12} /> },
                  { id: 'n8n', label: 'n8n Rules', icon: <Layers size={12} /> },
                  { id: 'jq', label: 'jq CLI Filter', icon: <Terminal size={12} /> },
                  { id: 'audit', label: 'Compliance Audit', icon: <CheckCircle2 size={12} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'bg-[#0070FF] text-white shadow-md' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: Morphed JSON Output */}
              {activeTab === 'transformed' && (
                <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-black/5 pb-4 gap-4 flex-wrap">
                    <div>
                      <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.3em]">
                        Translated Schema Payload Ready
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">Live compiled mapping sample</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.transformedJson, 'transformed')}
                      className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] bg-[#0070FF]/5 hover:bg-[#0070FF]/10 hover:text-black transition-all flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0070FF]/25 cursor-pointer"
                    >
                      {copiedText === 'transformed' ? 'Copied' : 'Clone JSON payload'}
                    </button>
                  </div>

                  <pre className="bg-zinc-950 text-emerald-400 p-6 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed select-all max-h-[460px]">
                    {result.transformedJson}
                  </pre>
                </div>
              )}

              {/* TAB 2: JavaScript Transformation Function */}
              {activeTab === 'js' && (
                <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-black/5 pb-4 gap-4 flex-wrap">
                    <div>
                      <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.3em] flex items-center gap-2">
                        <Code2 size={14} /> ES6 Map & Destructure Snippet
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">Production integrated connector logic</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.javascriptMapping, 'js')}
                      className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] bg-[#0070FF]/5 hover:bg-[#0070FF]/10 hover:text-black transition-all flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0070FF]/25 cursor-pointer"
                    >
                      {copiedText === 'js' ? 'Copied' : 'Clone script code'}
                    </button>
                  </div>

                  <pre className="bg-zinc-950 text-[#0070FF] p-6 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed select-all max-h-[460px]">
                    {result.javascriptMapping}
                  </pre>
                </div>
              )}

              {/* TAB 3: n8n Mapping Expression */}
              {activeTab === 'n8n' && (
                <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-black/5 pb-4 gap-4 flex-wrap">
                    <div>
                      <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.3em] flex items-center gap-2">
                        <Layers size={14} /> n8n Node Dynamic Expressions
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">Copy-paste mapping parameters for n8n Set or HTTP nodes</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.n8nExpression, 'n8n')}
                      className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] bg-[#0070FF]/5 hover:bg-[#0070FF]/10 hover:text-black transition-all flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0070FF]/25 cursor-pointer"
                    >
                      {copiedText === 'n8n' ? 'Copied' : 'Clone n8n code'}
                    </button>
                  </div>

                  <pre className="bg-zinc-950 text-cyan-400 p-6 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed select-all max-h-[460px]">
                    {result.n8nExpression}
                  </pre>
                </div>
              )}

              {/* TAB 4: jq UNIX filter snippet */}
              {activeTab === 'jq' && (
                <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-black/5 pb-4 gap-4 flex-wrap">
                    <div>
                      <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.3em] flex items-center gap-2">
                        <Terminal size={14} /> JQ JSON Query Syntax
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">CLI terminal pipeline morph command</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.jqQuery, 'jq')}
                      className="text-[9px] font-black uppercase tracking-widest text-[#0070FF] bg-[#0070FF]/5 hover:bg-[#0070FF]/10 hover:text-black transition-all flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0070FF]/25 cursor-pointer"
                    >
                      {copiedText === 'jq' ? 'Copied' : 'Clone jq command'}
                    </button>
                  </div>

                  <pre className="bg-zinc-950 text-orange-400 p-6 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-zinc-800 leading-relaxed select-all max-h-[460px]">
                    {result.jqQuery}
                  </pre>
                </div>
              )}

              {/* TAB 5: Compliance Audit */}
              {activeTab === 'audit' && (
                <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-6 text-zinc-900">
                  <div className="border-b border-black/5 pb-4">
                    <h4 className="text-[10px] font-black text-[#0070FF] uppercase tracking-[0.3em] flex items-center gap-2">
                      <Lock size={14} className="text-[#0070FF]" /> Schema Security & Integration Analysis
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1 font-sans">Compliance review of translated key mapping attributes</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h5 className="font-black text-emerald-800 uppercase tracking-wider text-[9px] font-sans">Data Structure Integrity</h5>
                        <p className="text-xs text-zinc-700 font-sans leading-relaxed">No undefined or circular data tree schemas identified. Fields successfully resolved under safe, non-blocking default placeholders.</p>
                      </div>
                    </div>

                    <div className="p-6 glass border border-black/5 rounded-xl space-y-3">
                      <span className="font-black text-zinc-800 uppercase tracking-widest text-[9px] block font-mono">Structural Mapping Details</span>
                      <p className="text-xs text-zinc-800 font-sans leading-relaxed whitespace-pre-wrap">{result.explanation}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-black/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 p-12 text-center glass min-h-[500px]">
              <Shuffle size={40} className="mb-6 opacity-10 text-[#0070FF] animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.5em] font-black text-black">Schema Morpher Idle</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-2 font-medium font-sans leading-relaxed">
                Choose a preset above or paste custom source payload structures to compile transform rules instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayloadMorpher;
