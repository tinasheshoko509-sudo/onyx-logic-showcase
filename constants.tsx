
import React from 'react';
import {
  BarChart3,
  ShieldCheck,
  Zap,
  Map,
  Target,
  Bug,
  Users,
  Lock,
  Beaker,
  LayoutDashboard,
  BellRing,
  LogOut,
  Code2,
  Workflow,
  Link as LinkIcon,
  FileText,
  LifeBuoy,
  Key,
  Globe,
  Shuffle,
  ClipboardCheck,
  Send,
  MessageSquare,
  Puzzle,
  Database
} from 'lucide-react';

export const COLORS = {
  onyx: '#F5F5F5',
  charcoal: '#FFFFFF',
  primary: '#0A0A0A',
  secondary: '#0070FF',
  neon: '#0070FF',
  neonHover: '#005ACC',
  white: '#0A0A0A',
  gray: '#71717A',
};

export const TOOLS = [
  { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
  { id: 'weekly-intel', name: 'New Intelligence', icon: <BellRing size={20} />, path: '/weekly-intel' },
  { id: 'node-roadmap', name: 'Node-by-Node Roadmap', icon: <Workflow size={20} />, path: '/node-roadmap' },
  { id: 'lab', name: 'Prompt Engineering Lab', icon: <Beaker size={20} />, path: '/lab' },
  { id: 'error-resolver', name: 'Error Resolver', icon: <LifeBuoy size={20} />, path: '/error-resolver' },
  { id: 'credential-assistant', name: 'Credential Assistant', icon: <Key size={20} />, path: '/credential-assistant' },
  { id: 'api-scanner', name: 'Onyx Docu-Scanner', icon: <LinkIcon size={20} />, path: '/api-scanner' },
  { id: 'http-builder', name: 'Prompt-to-HTTP Builder', icon: <Globe size={20} />, path: '/http-builder' },
  { id: 'payload-morpher', name: 'Onyx Payload Morpher', icon: <Shuffle size={20} />, path: '/payload-morpher' },
  { id: 'api-sandbox', name: 'Onyx API Sandbox', icon: <Send size={20} />, path: '/api-sandbox' },
  { id: 'doc-generator', name: 'Doc Generator', icon: <FileText size={20} />, path: '/doc-generator' },
  { id: 'comparison', name: 'Tool Comparison', icon: <Zap size={20} />, path: '/comparison' },
  { id: 'code-refactor', name: 'JS Refactor & Auditor', icon: <Code2 size={20} />, path: '/code-refactor' },
  { id: 'auditor', name: 'Efficiency Auditor', icon: <BarChart3 size={20} />, path: '/auditor' },
  { id: 'compliance', name: 'Compliance Checker', icon: <ShieldCheck size={20} />, path: '/compliance' },
  { id: 'roadmap', name: 'Integration Roadmap', icon: <Map size={20} />, path: '/roadmap' },
  { id: 'troubleshooter', name: 'Logic Troubleshooter', icon: <Bug size={20} />, path: '/troubleshooter' },
  { id: 'designer', name: 'Multi-Agent Designer', icon: <Users size={20} />, path: '/designer' },
  { id: 'privacy', name: 'Privacy Scanner', icon: <Lock size={20} />, path: '/privacy' },
{ id: 'scope-analyzer', name: 'Scope & Stack Analyzer', icon: <Target size={20} />, path: '/scope-analyzer' },
  { id: 'qa-handover', name: 'Onyx QA Lab', icon: <ClipboardCheck size={20} />, path: '/qa-handover' },
  // Community Intel hidden 2026-09-28 until it has real forum search (it only answered from AI memory).
  // To restore: uncomment this line, the route in App.tsx, the entry in services/toolCatalog.ts and the manual entry in pages/Tools/UserManual.tsx.
  // { id: 'community', name: 'Community Intel', icon: <MessageSquare size={20} />, path: '/community' },
  { id: 'skill-finder', name: 'Skill Finder', icon: <Puzzle size={20} />, path: '/skill-finder' },
  { id: 'sql-generator', name: 'SQL Generator', icon: <Database size={20} />, path: '/sql-generator' },
  { id: 'logout', name: 'Logout', icon: <LogOut size={20} />, path: '#' },
];

export const USAGE_LIMIT = 5;
