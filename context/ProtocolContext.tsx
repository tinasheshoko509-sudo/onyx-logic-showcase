
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProtocolContextType {
  registerActions: (actions: { dryRun?: () => Promise<void>; commit?: () => Promise<void> }) => void;
  triggerDryRun: () => Promise<void>;
  triggerCommit: () => Promise<void>;
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string | null;
}

const ProtocolContext = createContext<ProtocolContextType | undefined>(undefined);

export const ProtocolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<{ dryRun?: () => Promise<void>; commit?: () => Promise<void> }>({});
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const registerActions = useCallback((newActions: { dryRun?: () => Promise<void>; commit?: () => Promise<void> }) => {
    setActions(newActions);
  }, []);

  const triggerDryRun = async () => {
    if (status === 'processing') return;
    setStatus('processing');
    setMessage('INITIATING_DRY_RUN: Validating logic clusters...');
    
    try {
      if (actions.dryRun) {
        await actions.dryRun();
      } else {
        // Default mock behavior if tool hasn't registered a specific action
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      setStatus('success');
      setMessage('DRY_RUN_COMPLETE: Logic integrity verified. 0 defects detected.');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'DRY_RUN_FAILED: Logic bifurcation detected in sector 4.');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const triggerCommit = async () => {
    if (status === 'processing') return;
    setStatus('processing');
    setMessage('INITIATING_COMMIT: Uploading protocol to global node...');

    try {
      if (actions.commit) {
        await actions.commit();
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setStatus('success');
      setMessage('PROTOCOL_COMMITTED: Specialist uplink synchronized.');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'COMMIT_FAILED: Link integrity critical. Retry synchronization.');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <ProtocolContext.Provider value={{ registerActions, triggerDryRun, triggerCommit, status, message }}>
      {children}
    </ProtocolContext.Provider>
  );
};

export const useProtocol = () => {
  const context = useContext(ProtocolContext);
  if (!context) throw new Error('useProtocol must be used within a ProtocolProvider');
  return context;
};
