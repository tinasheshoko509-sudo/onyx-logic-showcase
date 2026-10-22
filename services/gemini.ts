import type { WorkflowGenerationContext, Platform } from '../types';

// Model settings, stored per browser. 'onyx_preferred_model' was the old single setting,
// which applied to the work now called advanced, so it carries over.
export const MODEL_KEYS = { advanced: 'onyx_model_advanced', simple: 'onyx_model_simple' } as const;
const readKey = (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
export const getModelChoices = () => ({
  advanced: readKey(MODEL_KEYS.advanced) || readKey('onyx_preferred_model') || undefined,
  simple: readKey(MODEL_KEYS.simple) || undefined,
});
export const setModelChoice = (tier: 'advanced' | 'simple', model: string) => {
  try {
    if (model.trim()) localStorage.setItem(MODEL_KEYS[tier], model.trim()); else localStorage.removeItem(MODEL_KEYS[tier]);
    if (tier === 'advanced') localStorage.removeItem('onyx_preferred_model');
  } catch { /* storage blocked: the default is used */ }
};

const callServerGemini = async (functionName: string, args: any[]) => {
  const { auth } = await import('./firebase');
  const uid = auth.currentUser?.uid || null;
  // The two model settings ("Advanced tasks", "Simple tasks"); empty = server default.
  const models = getModelChoices();
  // Live steps while it runs: the server reports them under this random id, and they are
  // passed on to the page as 'onyx_progress' events (components/RunProgress.tsx shows them).
  const runId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-run`).replace(/[^a-z0-9-]/gi, '');
  let finished = false;
  const sendSteps = (steps: string[], done: boolean) =>
    window.dispatchEvent(new CustomEvent('onyx_progress', { detail: { functionName, runId, steps, done } }));
  const poll = async () => {
    while (!finished) {
      await new Promise(r => setTimeout(r, 1500));
      if (finished) break;
      try {
        const p = await (await fetch(`/api/progress/${runId}`, { cache: 'no-store' })).json();
        if (!finished && Array.isArray(p.steps)) sendSteps(p.steps, false);
      } catch { /* progress is a nice-to-have; the request itself carries on */ }
    }
  };
  sendSteps([], false);
  poll();

  const response = await fetch('/api/gemini/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ functionName, args, uid, models, runId })
  }).finally(() => { finished = true; sendSteps([], true); });

  const elapsedMs = response.headers.get('X-Onyx-Ms');
  // Lookups that use no AI (model settings, config) don't replace the last run's stats.
  if (elapsedMs && Number(response.headers.get('X-Onyx-Calls') || 0) > 0) {
    window.dispatchEvent(new CustomEvent('onyx_run_stats', {
      detail: {
        functionName,
        ms:           Number(elapsedMs),
        inputTokens:  Number(response.headers.get('X-Onyx-In')    || 0),
        outputTokens: Number(response.headers.get('X-Onyx-Out')   || 0),
        calls:        Number(response.headers.get('X-Onyx-Calls') || 0),
        // Priced per call at each model's live OpenRouter price; absent when unknown.
        costUsd:      response.headers.get('X-Onyx-Cost') !== null ? Number(response.headers.get('X-Onyx-Cost')) : null,
      },
    }));
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    let errorMsg = errorJson.error || errorJson.message || 'API Error';
    if (typeof errorMsg === 'object') {
      errorMsg = errorMsg.message || JSON.stringify(errorMsg);
    }
    const errorStr = String(errorMsg);
    window.dispatchEvent(new CustomEvent('onyx_api_error', { detail: { message: errorStr } }));
    throw new Error(errorStr);
  }
  return response.json();
};

export const askOnyx = async (message: string, history: any[]) => {
  return callServerGemini('askOnyx', [message, history]);
};

export const runAudit = async (workflow: string, scenario: string) => {
  return callServerGemini('runAudit', [workflow, scenario]);
};

export const reinforcementAuditCycle = async (currentTopology: string, selectedPointers: string[], scenario: string) => {
  return callServerGemini('reinforcementAuditCycle', [currentTopology, selectedPointers, scenario]);
};

export const generateIntegrationCode = async (topology: string, scenario: string) => {
  return callServerGemini('generateIntegrationCode', [topology, scenario]);
};

export const designMultiAgent = async (objective: string) => {
  return callServerGemini('designMultiAgent', [objective]);
};

export const compareTools = async (toolA: string, toolB: string, useCase: string) => {
  return callServerGemini('compareTools', [toolA, toolB, useCase]);
};

export const suggestIdealTool = async (goal: string) => {
  return callServerGemini('suggestIdealTool', [goal]);
};

export const troubleshootLogic = async (problem: string) => {
  return callServerGemini('troubleshootLogic', [problem]);
};

export const searchCommunity = async (platform: string, topic: string, platformUrl: string): Promise<any> => {
  return callServerGemini('searchCommunity', [platform, topic, platformUrl]);
};

export const generateSql = async (request: string, dialect: string, tableLayout?: string, mode?: string): Promise<any> => {
  return callServerGemini('generateSql', [request, dialect, tableLayout, mode]);
};

export const searchSkills = async (task: string): Promise<any> => {
  return callServerGemini('searchSkills', [task]);
};

export const explainSkillScripts = async (repo: string, commit: string, skillPath: string): Promise<any> => {
  return callServerGemini('explainSkillScripts', [repo, commit, skillPath]);
};

export const resolveWorkflowError = async (errorMessage: string) => {
  return callServerGemini('resolveWorkflowError', [errorMessage]);
};

export const resolveWorkflowErrorFromImage = async (base64Image: string, mimeType: string, extraText?: string) => {
  return callServerGemini('resolveWorkflowErrorFromImage', [base64Image, mimeType, extraText]);
};

export const scanPrivacy = async (data: string) => {
  return callServerGemini('scanPrivacy', [data]);
};

export const refinePrompt = async (rawPrompt: string, desiredOutput: string) => {
  return callServerGemini('refinePrompt', [rawPrompt, desiredOutput]);
};

export const reinforcePrompt = async (currentPrompt: string, instructions: string, goal: string) => {
  return callServerGemini('reinforcePrompt', [currentPrompt, instructions, goal]);
};

export const generatePromptFromScratch = async (objective: string) => {
  return callServerGemini('generatePromptFromScratch', [objective]);
};

export const checkCompliance = async (workflow: string) => {
  return callServerGemini('checkCompliance', [workflow]);
};

export const generateRoadmap = async (goal: string) => {
  return callServerGemini('generateRoadmap', [goal]);
};

export const assessWorkflowArchitecture = async (document: string, platform: Platform) => {
  return callServerGemini('assessWorkflowArchitecture', [document, platform]);
};

export const generateNodeRoadmap = async (document: string, platform: Platform, workflowContext?: WorkflowGenerationContext) => {
  return callServerGemini('generateNodeRoadmap', [document, platform, workflowContext]);
};

export const generateWorkflowJSON = async (roadmap: any, platform: Platform, workflowContext?: WorkflowGenerationContext) => {
  return callServerGemini('generateWorkflowJSON', [roadmap, platform, workflowContext]);
};

export const getWeeklyDiscovery = async () => {
  return callServerGemini('getWeeklyDiscovery', []);
};

// fresh: skip the saved answer (kept 7 days on the server) and research again.
export const scanApiDocumentation = async (url: string, useCase: string, pastedText?: string, searchWholeSite?: boolean, opts: { fresh?: boolean } = {}) => {
  return callServerGemini('scanApiDocumentation', [url, useCase, pastedText, searchWholeSite, opts]);
};

export const discoverTools = async (query: string) => {
  return callServerGemini('discoverTools', [query]);
};

export const getOnyxIQInsight = async (toolNames: string[]) => {
  return callServerGemini('getOnyxIQInsight', [toolNames]);
};

export const explainCode = async (code: string) => {
  return callServerGemini('explainCode', [code]);
};

export const refactorCode = async (code: string, objective: string) => {
  return callServerGemini('refactorCode', [code, objective]);
};

export const generateCode = async (objective: string) => {
  return callServerGemini('generateCode', [objective]);
};

export const analyzeAppCode = async (code: string, symptoms?: string) => {
  return callServerGemini('analyzeAppCode', [code, symptoms]);
};

// fresh: skip the saved answer (kept 7 days on the server) and build a new one.
export const generateHttpRequest = async (prompt: string, opts: { fresh?: boolean } = {}) => {
  return callServerGemini('generateHttpRequest', [prompt, opts]);
};

export const transformPayload = async (sourceJson: string, targetSchemaPrompt: string) => {
  return callServerGemini('transformPayload', [sourceJson, targetSchemaPrompt]);
};

export const explainAutomationNode = async (builder: string, nodeName: string) => {
  return callServerGemini('explainAutomationNode', [builder, nodeName]);
};

export const getCredentialAssistance = async (description: string, opts: { fresh?: boolean } = {}) => {
  return callServerGemini('getCredentialAssistance', [description, opts]);
};

export const processVoiceCommand = async (command: string) => {
  return callServerGemini('processVoiceCommand', [command]);
};

export const scanWorkflowPdf = async (base64Pdf: string) => {
  return callServerGemini('scanWorkflowPdf', [base64Pdf]);
};

export const generateQaTestScript = async (handoverDocument: string) => {
  return callServerGemini('generateQaTestScript', [handoverDocument]);
};

export const generateFunctionalSpec = async (files: Array<{ name: string; content: string; type: string }>) => {
  return callServerGemini('generateFunctionalSpec', [files]);
};

export const getApiSandboxAnalysis = async (params: any) => {
  return callServerGemini('getApiSandboxAnalysis', [params]);
};

export const analyzeScope = async (docText: string) => {
  return callServerGemini('analyzeScopeDocument', [docText]);
};

export const analyzeToolStack = async (docText: string) => {
  return callServerGemini('analyzeToolStack', [docText]);
};

export const analyzeEdgeCases = async (docText: string) => {
  return callServerGemini('analyzeEdgeCases', [docText]);
};

export const getModelConfig = async (): Promise<{
  provider: string; advancedDefault: string; simpleDefault: string; simpleTools: string[];
}> => {
  return callServerGemini('getModelConfig', []);
};

export type ModelInfo = { id: string; found: boolean; name: string; priceIn: number | null; priceOut: number | null; listChecked: boolean };
/** Look model IDs up on OpenRouter's live list (found, name, price per million tokens). */
export const getModelInfo = async (ids: string[]): Promise<ModelInfo[]> => {
  return callServerGemini('getModelInfo', [ids]);
};

/** exactWords: every typed word matched a whole word of the model's name ("flash", not "flashx"). */
export type ModelMatch = { id: string; name: string; priceIn: number | null; priceOut: number | null; exactWords?: boolean };
/** Models matching a plain description ("gemini 3.8"), best first. */
export const findModels = async (query: string): Promise<ModelMatch[]> => {
  return callServerGemini('findModels', [query]);
};
