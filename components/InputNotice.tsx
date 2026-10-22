import React from 'react';
import { Scissors } from 'lucide-react';

/**
 * Amber note shown above a tool's result when the server had to leave part of the user's
 * document out to fit (the server returns this text as `inputNote`). Renders nothing otherwise.
 */
const InputNotice: React.FC<{ note?: string | null }> = ({ note }) => {
  if (!note) return null;
  return (
    <div role="status" className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm leading-relaxed">
      <Scissors size={18} className="shrink-0 mt-0.5" />
      <p className="flex-1">{note}</p>
    </div>
  );
};

export default InputNotice;
