
import React from 'react';
import { X, Check, Star } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/95 backdrop-blur-xl">
      <div className="bg-[#0A0A0A] border border-[#0070FF]/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-[#0070FF]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Star className="text-[#0070FF]" size={32} fill="#0070FF" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Initiate <span className="text-[#0070FF]">Prime Uplink</span></h2>
          <p className="text-zinc-500 mb-8 text-lg">
            Trial period terminated. Secure full agency access to unlock neural automation cores.
          </p>

          <div className="space-y-4 mb-10 text-left">
            {[
              'Unlimited Logic Audits & ROI Surges',
              'Advanced Multi-Agent Swarm Designer',
              'End-to-End Privacy & Compliance Scanners',
              'Access to the Prime Logic Tool Repository',
              'Neural workflow sync and cloud backup'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#0070FF]/10 flex items-center justify-center text-[#0070FF]">
                  <Check size={12} />
                </div>
                <span className="text-sm text-zinc-600">{feature}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={onUpgrade}
            className="w-full neon-bg text-black font-bold py-4 rounded-xl hover:bg-[#005ACC] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#0070FF]/30"
          >
            Activate Prime Clearance
          </button>
          
          <p className="mt-4 text-[10px] text-zinc-700 uppercase tracking-widest font-bold">
            Encrypted Transaction • Terminate Anytime
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
