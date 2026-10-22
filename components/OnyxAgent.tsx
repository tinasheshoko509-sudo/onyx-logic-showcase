
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, Bot, Maximize2, Minimize2, SquarePen } from 'lucide-react';
import { askOnyx } from '../services/gemini';

interface Message {
  role: 'user' | 'model';
  text: string;
}

/** Styles for markdown in Onyx's replies (bold, lists, steps, inline code). */
const mdComponents = {
  p: (p: any) => <p className="mb-2 last:mb-0" {...p} />,
  strong: (p: any) => <strong className="font-semibold text-zinc-900" {...p} />,
  ul: (p: any) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1 marker:text-[#0070FF]" {...p} />,
  ol: (p: any) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1 marker:text-[#0070FF] marker:font-semibold" {...p} />,
  li: (p: any) => <li className="pl-0.5" {...p} />,
  code: (p: any) => <code className="px-1 py-0.5 rounded bg-white border border-zinc-200 text-[12px] font-mono text-[#0050C0]" {...p} />,
  a: (p: any) => <a className="text-[#0070FF] underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
  h1: (p: any) => <p className="font-semibold text-zinc-900 mb-1.5" {...p} />,
  h2: (p: any) => <p className="font-semibold text-zinc-900 mb-1.5" {...p} />,
  h3: (p: any) => <p className="font-semibold text-zinc-900 mb-1.5" {...p} />,
};

/** Optional initial state — used only by the visual preview page, the app mounts it with no props. */
/** Turns technical failures into a plain-English message the user can act on. */
const friendlyError = (raw: string): string => {
  const m = raw.toLowerCase();
  if (m.includes('empty_reply')) return "Sorry — I couldn't put an answer together that time. Please try asking again, or rephrase the question.";
  if (m.includes('timed out') || m.includes('timeout')) return 'Sorry — that took too long and timed out. Please try again; shorter questions usually come back faster.';
  if (m.includes('429') || m.includes('quota') || m.includes('rate limit') || m.includes('credit') || m.includes('402')) return "I've hit the AI service's usage limit. Please wait a minute and try again. If it keeps happening, the OpenRouter account may need topping up.";
  if (m.includes('401') || m.includes('403') || m.includes('api key') || m.includes('unauthorized')) return "I can't reach the AI service right now because of an access problem (the API key may be missing or wrong). Please let whoever manages Onyx know.";
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('econnrefused')) return "I can't reach the Onyx server. Check your internet connection, or the server may be restarting — try again in a moment.";
  return "Sorry — something went wrong on my side. Please try again in a moment.";
};

const OnyxAgent: React.FC<{ initialOpen?: boolean; initialMessages?: Message[]; initialTyping?: boolean }> = ({ initialOpen = false, initialMessages = [], initialTyping = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(initialTyping);
  const [showProactive, setShowProactive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Proactive welcome: shown at most once per browser session, and never again once the
  // user has dismissed it or opened the chat (it used to reappear on every page load/close).
  const GREETED_KEY = 'onyx_greeted';
  const markGreeted = () => { try { sessionStorage.setItem(GREETED_KEY, '1'); } catch {} };
  useEffect(() => {
    let greeted = false;
    try { greeted = sessionStorage.getItem(GREETED_KEY) === '1'; } catch {}
    if (greeted) return;
    const timer = setTimeout(() => {
      setShowProactive(true);
      markGreeted();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Grow the input with its content, up to ~5 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const startNewChat = () => {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setShowProactive(false);

    try {
      const response = await askOnyx(input, messages);
      const onyxMsg: Message = { role: 'model', text: response || friendlyError('EMPTY_REPLY') };
      setMessages(prev => [...prev, onyxMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.message || '';
      setMessages(prev => [...prev, { role: 'model', text: friendlyError(errorMsg) }]);
    } finally {
      setIsTyping(false);
    }
  };

  const size = expanded
    ? 'w-[min(640px,calc(100vw-3rem))] h-[min(760px,calc(100vh-7rem))]'
    : 'w-[min(380px,calc(100vw-3rem))] h-[min(560px,calc(100vh-7rem))]';

  const OnyxAvatar = () => (
    <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-[#0070FF] to-[#0050C0] flex items-center justify-center text-white shadow-sm">
      <Bot size={15} />
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Proactive Bubble */}
      {showProactive && !isOpen && (
        <div className="mb-4 mr-2 bg-white border border-zinc-200 px-4 py-3 rounded-2xl rounded-br-md shadow-xl max-w-[240px] animate-in slide-in-from-bottom-2 fade-in duration-500 relative">
          <button
            onClick={() => setShowProactive(false)}
            className="absolute -top-2 -right-2 bg-white border border-zinc-200 rounded-full p-1 text-zinc-500 hover:text-black shadow-sm"
            aria-label="Dismiss"
          >
            <X size={10} />
          </button>
          <p className="text-[13px] text-zinc-700 leading-relaxed">
            Hi, I'm <span className="text-zinc-900 font-semibold">Onyx</span>. Need help finding the right tool?
          </p>
        </div>
      )}

      {isOpen && (
        <div className={`${size} bg-white border border-zinc-200 rounded-2xl shadow-2xl shadow-black/10 flex flex-col overflow-hidden mb-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 transition-[width,height]`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <OnyxAvatar />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-zinc-900 font-sans">Onyx</p>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={startNewChat}
                  disabled={isTyping}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 mr-1 rounded-lg text-xs font-medium text-zinc-600 hover:text-[#0070FF] hover:bg-[#0070FF]/5 border border-zinc-200 hover:border-[#0070FF]/30 transition-colors disabled:opacity-40"
                  title="Start a new conversation"
                >
                  <SquarePen size={13} /> New chat
                </button>
              )}
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors"
                title={expanded ? 'Make smaller' : 'Make bigger'}
              >
                {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-5 space-y-4 custom-scrollbar bg-zinc-50/60"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-[#0070FF]/10 flex items-center justify-center text-[#0070FF] mb-3">
                  <Bot size={24} />
                </div>
                <p className="text-sm font-semibold text-zinc-800">How can I help?</p>
                <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">Ask which tool to use, or any question about your automations.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-[#0070FF] text-white text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start gap-2.5">
                  <OnyxAvatar />
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-zinc-200 text-zinc-700 text-sm leading-relaxed shadow-sm">
                    <ReactMarkdown components={mdComponents}>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              )
            ))}
            {isTyping && (
              <div className="flex justify-start gap-2.5 items-center">
                <OnyxAvatar />
                <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-zinc-200 shadow-sm flex items-center gap-1" aria-label="Onyx is typing">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-zinc-100 bg-white">
            <div className="flex items-end gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 focus-within:border-[#0070FF] focus-within:ring-2 focus-within:ring-[#0070FF]/10 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                className="flex-1 bg-transparent resize-none py-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none max-h-[120px]"
                placeholder="Ask Onyx…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="shrink-0 w-8 h-8 rounded-lg bg-[#0070FF] hover:bg-[#005ACC] text-white flex items-center justify-center disabled:bg-zinc-200 disabled:text-zinc-400 transition-colors"
                title="Send"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[11px] text-center text-zinc-400 mt-2">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowProactive(false);
          markGreeted();
        }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
          isOpen
          ? 'bg-white border border-zinc-200 text-zinc-600'
          : 'bg-[#0070FF] hover:bg-[#005ACC] text-white shadow-[#0070FF]/30'
        }`}
        aria-label={isOpen ? 'Close Onyx' : 'Open Onyx'}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </div>
  );
};

export default OnyxAgent;
