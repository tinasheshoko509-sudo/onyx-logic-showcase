import type { AuditFinding } from './utils/auditScore';

export type ToolType =
  | 'comparison' 
  | 'auditor' 
  | 'compliance' 
  | 'roadmap' 
  | 'discovery' 
  | 'troubleshooter' 
  | 'designer' 
  | 'privacy' 
  | 'lab'
  | 'code-refactor'
  | 'weekly-intel'
  | 'api-scanner'
  | 'node-roadmap'
  | 'credential-assistant'
  | 'http-builder'
  | 'payload-morpher'
  | 'api-sandbox';

export interface UsageEntry {
  timestamp: number;
  toolId: string;
}

export interface UserSession {
  isAuthenticated: boolean;
  username: string | null;
  usageCount: number;
  isPremium: boolean;
  emailNotifications?: boolean;
  auditScores: number[];
  efficiencyGains: number[];
  featureUsage: Record<string, number>;
  usageHistory: UsageEntry[];
}

export interface AuditResult {
  score: number;
  /** How the score was calculated, e.g. "100 − 30 (2 major problems × 15) = 70". */
  scoreBreakdown?: string;
  findings: AuditFinding[];
  recommendations: string[];
  correctedTopology: string;
  codeSnippet?: string;
}

export interface CodeRefactorResult {
  analysis: string[];
  refactoredCode: string;
  explanation: string;
  complexityScore: string;
}

export interface CodeAnalysisResult {
  overview: string;
  bugs: Array<{ linePointer: string; issue: string; severity: 'High' | 'Medium' | 'Low'; remediation: string }>;
  securityIssues: Array<{ component: string; threat: string; resolution: string }>;
  performanceIssues: Array<{ location: string; symptom: string; fix: string }>;
  architecturalSuggestions: string[];
}

export interface ProtocolBlueprint {
  title: string;
  objective: string;
  logic: string;
}

export interface WeeklyDiscovery {
  toolName: string;
  category: string;
  description: string;
  whyItMatters: string;
  largelyUsedFor: string;
  protocolBlueprints: ProtocolBlueprint[];
  releaseDate: string;
  url: string;
}

// ── Node Roadmap / multi-workflow architecture ────────────────────────────────

export type Platform = 'n8n' | 'ghl' | 'make';

export interface WorkflowGenerationContext {
  workflowName: string;
  purpose: string;
  trigger: string;
  relationship: 'standalone' | 'parent' | 'child';
  relatedWorkflowId: string | null;
  relatedWorkflowName: string | null;
  relationshipReason: string;
}

export interface WorkflowArchitectureWorkflow {
  workflowId: string;
  workflowName: string;
  purpose: string;
  trigger: string;
  estimatedNodeCount: number;
  relationship: 'standalone' | 'parent' | 'child';
  relatedWorkflowId: string | null;
  relationshipReason: string;
}

export interface WorkflowArchitectureDecision {
  decision: 'single' | 'multiple';
  reasoning: string;
  workflows: WorkflowArchitectureWorkflow[];
}

export interface RoadmapNodeParameter {
  field: string;
  value: string;
}

export interface RoadmapNodeExpression {
  field: string;
  expression: string;
  note: string;
}

export interface RoadmapNodeBranch {
  label: string;
  condition: string;
  leadsTo: string;
}

export interface RoadmapNode {
  nodeNumber: string;
  nodeName: string;
  stepType: string;
  inPlainEnglish: string;
  input: string;
  output: string;
  parameters: RoadmapNodeParameter[];
  expressions: RoadmapNodeExpression[];
  branches: RoadmapNodeBranch[];
  note: string | null;
}

export interface RoadmapPhase {
  phaseNumber: number;
  phaseName: string;
  phaseIntro: string;
  nodes: RoadmapNode[];
}

export interface RoadmapCredential {
  credential: string;
  credentialIdentifier: string;
  whereToGetIt: string;
  usedInNodes: string;
}

export interface WorkflowRoadmap {
  workflowName: string;
  subtitle: string;
  plainEnglishSummary: string;
  overview: {
    trigger: string;
    output: string;
    deduplication: string;
    errorHandling: string;
    estimatedBuildTime: string;
    totalNodes: number;
    totalPhases: number;
  };
  phases: RoadmapPhase[];
  credentialsNeeded: RoadmapCredential[];
}
