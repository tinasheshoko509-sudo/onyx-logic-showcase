import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Turns any thrown failure into a plain-English message the user can act on.
 * Known failure types get a fixed explanation; any other short, readable server
 * message is shown as-is; anything technical-looking falls back to a generic line.
 */
export const friendlyError = (err: unknown, fallback = 'Something went wrong. Please try again in a moment.'): string => {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const m = raw.toLowerCase();
  if (!m) return fallback;
  if (m.includes('timed out') || m.includes('timeout') || m.includes('504')) return 'The AI took too long to answer and timed out. Please try again — shorter or smaller inputs usually come back faster.';
  if (m.includes('429') || m.includes('quota') || m.includes('rate limit') || m.includes('credit') || m.includes('402')) return "The AI service's usage limit was hit. Wait a minute and try again. If it keeps happening, the OpenRouter account may need topping up.";
  if (m.includes('401') || m.includes('403') || m.includes('api key') || m.includes('unauthorized')) return "Onyx can't reach the AI service because of an access problem (the API key may be missing or wrong). Let whoever manages Onyx know.";
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('econnrefused')) return "Onyx can't reach its server. Check your internet connection, or the server may be restarting — try again in a moment.";
  if (m.includes('json') || m.includes('unexpected token') || m.includes('parse')) return 'The AI sent back an answer Onyx could not read. Please try again.';
  // A short sentence with no code-like tokens is already human-readable (e.g. "That PDF has no readable text in it").
  const looksTechnical = /[A-Z_]{6,}|[{}<>]|\bat\s+\S+\.(ts|js)|stack|undefined|null/.test(raw);
  if (raw.length <= 200 && !looksTechnical) return raw;
  return fallback;
};

/** Red box shown under a tool's run button when the run fails. Renders nothing when there is no message. */
const ErrorNotice: React.FC<{ message: string | null; onClose?: () => void }> = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm leading-relaxed">
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="shrink-0 text-red-400 hover:text-red-700">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default ErrorNotice;
