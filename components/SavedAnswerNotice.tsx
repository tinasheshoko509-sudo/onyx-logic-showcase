import React from 'react';
import { History, RefreshCw } from 'lucide-react';

/**
 * Shown above an answer that came from the server's saved answers (kept 7 days) instead of
 * fresh research, with a button to research it again now.
 */
const SavedAnswerNotice: React.FC<{ savedAt?: number; onRefresh: () => void; busy?: boolean }> = ({ savedAt, onRefresh, busy }) => {
  if (!savedAt) return null;
  const when = new Date(savedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-600 flex items-center justify-between gap-3 flex-wrap">
      <span className="flex items-center gap-2"><History size={14} className="text-zinc-500" /> Saved answer from {when} — shown instantly instead of researching again.</span>
      <button onClick={onRefresh} disabled={busy} className="flex items-center gap-1.5 font-bold text-[#0070FF] hover:underline disabled:opacity-50">
        <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Check again
      </button>
    </div>
  );
};

export default SavedAnswerNotice;
