
import React, { useState, useEffect, useRef } from 'react';
// Fixed: Use namespace import from react-router-dom to resolve "no exported member" errors
import * as ReactRouterDOM from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM as any;

import Layout from './components/Layout';
import AuthGateway from './components/AuthGateway';
import PaywallModal from './components/PaywallModal';
import OnyxAgent from './components/OnyxAgent';
import Dashboard from './pages/Dashboard';
import ExecutionLogs from './pages/ExecutionLogs';
import LastAudit from './pages/LastAudit';
import Auditor from './pages/Tools/Auditor';
import Designer from './pages/Tools/Designer';
import Comparison from './pages/Tools/Comparison';
import Compliance from './pages/Tools/Compliance';
import Roadmap from './pages/Tools/Roadmap';
import Troubleshooter from './pages/Tools/Troubleshooter';
import PrivacyScanner from './pages/Tools/PrivacyScanner';
import PromptLab from './pages/Tools/PromptLab';
import WeeklyIntel from './pages/Tools/WeeklyIntel';
import CodeOptimizer from './pages/Tools/CodeOptimizer';
import NodeRoadmap from './pages/Tools/NodeRoadmap';
import APIScanner from './pages/Tools/APIScanner';
import ErrorResolver from './pages/Tools/ErrorResolver';
import CredentialAssistant from './pages/Tools/CredentialAssistant';
import HttpBuilder from './pages/Tools/HttpBuilder';
import PayloadMorpher from './pages/Tools/PayloadMorpher';
import UserManual from './pages/Tools/UserManual';
import QaHandover from './pages/Tools/QaHandover';
import ApiSandbox from './pages/Tools/ApiSandbox';
import DocGenerator from './pages/Tools/DocGenerator';
import ScopeAnalyzer from './pages/Tools/ScopeAnalyzer';
// import Community from './pages/Tools/Community'; // hidden 2026-09-28, see constants.tsx
import SkillFinder from './pages/Tools/SkillFinder';
import SqlGenerator from './pages/Tools/SqlGenerator';
import { UserSession } from './types';
import { TOOLS } from './constants';
import { ProtocolProvider } from './context/ProtocolContext';
import { auth, saveExecutionLog, onAuthStateChanged, logoutUser } from './services/firebase';

const defaultStats = {
  usageCount: 0,
  isPremium: true,
  auditScores: [] as number[],
  efficiencyGains: [] as number[],
  featureUsage: {} as Record<string, number>,
  usageHistory: [] as { timestamp: number; toolId: string }[],
};

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession>({
    isAuthenticated: false,
    username: null,
    ...defaultStats,
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        uidRef.current = firebaseUser.uid;
        const email = firebaseUser.email || '';
        const username = firebaseUser.displayName || email.split('@')[0] || 'user';
        const saved = localStorage.getItem(`onyx_stats_${firebaseUser.uid}`);
        let stats = { ...defaultStats };
        if (saved) {
          try { stats = { ...defaultStats, ...JSON.parse(saved), isPremium: true }; } catch {}
        }
        setSession({ isAuthenticated: true, username, ...stats });
      } else {
        uidRef.current = null;
        setSession({ isAuthenticated: false, username: null, ...defaultStats });
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!session.isAuthenticated || !uidRef.current) return;
    const { isAuthenticated: _, username: __, ...stats } = session;
    localStorage.setItem(`onyx_stats_${uidRef.current}`, JSON.stringify(stats));
  }, [session]);

  const handleLogin = (_email: string) => {
    // Firebase onAuthStateChanged drives the session — this is just a signal from AuthGateway
  };

  const handleLogout = async () => {
    await logoutUser();
    uidRef.current = null;
    setSession({ isAuthenticated: false, username: null, ...defaultStats });
  };

  const trackAction = (
    toolId: string, 
    metrics?: any,
    input?: string,
    output?: string
  ) => {
    // 1. Durably save the execution to Firestore if they provide input/output and logging is enabled
    const loggingEnabled = localStorage.getItem('onyx_execution_logging') !== 'false';
    if (loggingEnabled && input && output) {
      const toolName = TOOLS.find(t => t.id === toolId)?.name || toolId;
      saveExecutionLog({
        toolId: toolId as any,
        toolName: typeof toolName === 'string' ? toolName : toolId,
        input,
        output,
        score: metrics?.score ?? metrics?.gain
      }).catch(err => console.error("Firestore Log Error:", err));
    }

    setSession(prev => {
      const newCount = (prev.usageCount || 0) + 1;
      
      const newAuditScores = metrics?.score !== undefined 
        ? [...prev.auditScores, metrics.score] 
        : prev.auditScores;
        
      const newEfficiencyGains = metrics?.gain !== undefined 
        ? [...prev.efficiencyGains, metrics.gain] 
        : prev.efficiencyGains;

      const newFeatureUsage = { ...prev.featureUsage };
      newFeatureUsage[toolId] = (newFeatureUsage[toolId] || 0) + 1;

      const newHistory = [
        ...prev.usageHistory,
        { timestamp: Date.now(), toolId }
      ];

      // Limit history to last 500 actions to prevent storage bloat
      if (newHistory.length > 500) newHistory.shift();
      
      return { 
        ...prev, 
        usageCount: newCount,
        auditScores: newAuditScores,
        efficiencyGains: newEfficiencyGains,
        featureUsage: newFeatureUsage,
        usageHistory: newHistory
      };
    });
  };

  const handleUpgrade = () => {
    setSession(prev => ({ ...prev, isPremium: true }));
    setIsPaywallOpen(false);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#0070FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return <AuthGateway onLogin={handleLogin} />;
  }

  return (
    <ProtocolProvider>
      <HashRouter>
        <Layout user={{ username: session.username, email: auth.currentUser?.email, isPremium: session.isPremium }} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard session={session} />} />
            <Route path="/weekly-intel" element={<WeeklyIntel onAction={(...args: any[]) => trackAction('weekly-intel', args[0], args[1], args[2])} />} />
            <Route path="/sql-generator" element={<SqlGenerator onAction={() => trackAction('sql-generator')} />} />
            <Route path="/skill-finder" element={<SkillFinder onAction={() => trackAction('skill-finder')} />} />
            {/* <Route path="/community" element={<Community onAction={() => trackAction('community')} />} /> hidden 2026-09-28 */}
            <Route path="/node-roadmap" element={<NodeRoadmap onAction={(...args: any[]) => trackAction('node-roadmap', args[0], args[1], args[2])} />} />
            <Route path="/lab" element={<PromptLab onAction={(...args: any[]) => trackAction('lab', args[0], args[1], args[2])} />} />
            <Route path="/error-resolver" element={<ErrorResolver onAction={(...args: any[]) => trackAction('error-resolver', args[0], args[1], args[2])} />} />
            <Route path="/credential-assistant" element={<CredentialAssistant onAction={(...args: any[]) => trackAction('credential-assistant', args[0], args[1], args[2])} />} />
            <Route path="/api-scanner" element={<APIScanner onAction={(...args: any[]) => trackAction('api-scanner', args[0], args[1], args[2])} />} />
            <Route path="/http-builder" element={<HttpBuilder onAction={(...args: any[]) => trackAction('http-builder', args[0], args[1], args[2])} />} />
            <Route path="/payload-morpher" element={<PayloadMorpher onAction={(...args: any[]) => trackAction('payload-morpher', args[0], args[1], args[2])} />} />
            <Route path="/api-sandbox" element={<ApiSandbox onAction={(...args: any[]) => trackAction('api-sandbox', args[0], args[1], args[2])} />} />
            <Route path="/doc-generator" element={<DocGenerator onAction={() => trackAction('doc-generator')} />} />
            <Route path="/comparison" element={<Comparison onAction={(...args: any[]) => trackAction('comparison', args[0], args[1], args[2])} />} />
            <Route path="/code-refactor" element={<CodeOptimizer onAction={(...args: any[]) => trackAction('code-refactor', args[0], args[1], args[2])} />} />
            <Route path="/auditor" element={<Auditor onAction={(...args: any[]) => trackAction('auditor', args[0], args[1], args[2])} />} />
            <Route path="/compliance" element={<Compliance onAction={(...args: any[]) => trackAction('compliance', args[0], args[1], args[2])} />} />
            <Route path="/roadmap" element={<Roadmap onAction={(...args: any[]) => trackAction('roadmap', args[0], args[1], args[2])} />} />
            <Route path="/troubleshooter" element={<Troubleshooter onAction={(...args: any[]) => trackAction('troubleshooter', args[0], args[1], args[2])} />} />
            <Route path="/designer" element={<Designer onAction={(...args: any[]) => trackAction('designer', args[0], args[1], args[2])} />} />
            <Route path="/privacy" element={<PrivacyScanner onAction={(...args: any[]) => trackAction('privacy', args[0], args[1], args[2])} />} />
            <Route path="/manual" element={<UserManual onAction={() => trackAction('manual')} />} />
            <Route path="/scope-analyzer" element={<ScopeAnalyzer onAction={(...args: any[]) => trackAction('scope-analyzer', args[0], args[1], args[2])} />} />
            <Route path="/qa-handover" element={<QaHandover onAction={() => trackAction('qa-handover')} />} />
            <Route path="/execution-logs" element={<ExecutionLogs />} />
            <Route path="/last-audit" element={<LastAudit />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <OnyxAgent />
        <PaywallModal 
          isOpen={isPaywallOpen} 
          onClose={() => setIsPaywallOpen(false)} 
          onUpgrade={handleUpgrade} 
        />
      </HashRouter>
    </ProtocolProvider>
  );
};

export default App;
