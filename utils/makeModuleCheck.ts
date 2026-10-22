import moduleList from '../services/makeModules.json';

// Checks AI-generated Make blueprints against a list of real Make module IDs and versions,
// so made-up modules are flagged for a manual swap before the user imports the file.
// Make publishes no official module list, so services/makeModules.json is built from real
// exported blueprints (the user's own, public ones, and Make's official examples).

type ModuleInfo = { versions: number[]; sources: string[]; name: string };
const KNOWN: Record<string, ModuleInfo> = moduleList.modules as Record<string, ModuleInfo>;

export type MakeModuleStatus = 'verified' | 'version-unconfirmed' | 'swap' | 'problem';

export type MakeModuleResult = {
  id: number | string;
  module: string;
  version: number | null;
  status: MakeModuleStatus;
  message: string;
  aiNote?: string;
};

export type MakeCheckResult = {
  modules: MakeModuleResult[];
  problems: string[];
  counts: Record<MakeModuleStatus, number>;
};

// Walks the whole flow, including router routes, if-else branches and error handlers.
function collect(flow: any[], out: { mod: any; prev: any }[]) {
  if (!Array.isArray(flow)) return;
  flow.forEach((mod, i) => {
    out.push({ mod, prev: i > 0 ? flow[i - 1] : null });
    for (const route of mod?.routes || []) collect(route?.flow, out);
    for (const branch of mod?.branches || []) collect(branch?.flow, out);
    collect(mod?.onerror, out);
  });
}

export function checkMakeBlueprint(blueprint: any): MakeCheckResult {
  const all: { mod: any; prev: any }[] = [];
  collect(blueprint?.flow, all);

  const notes: Record<string, string> = {};
  for (const n of blueprint?._notes || []) if (n?.moduleId != null) notes[String(n.moduleId)] = String(n.note || '');

  const ids = new Set(all.map(({ mod }) => String(mod?.id)));
  const problems: string[] = [];
  if (all.length === 0) problems.push('The blueprint has no modules, so it will import as an empty scenario.');

  const modules: MakeModuleResult[] = all.map(({ mod, prev }) => {
    const name = String(mod?.module || '');
    const version = typeof mod?.version === 'number' ? mod.version : null;
    const base = { id: mod?.id ?? '?', module: name || '(no module)', version, aiNote: notes[String(mod?.id)] };
    const info = KNOWN[name];

    if (!name) return { ...base, status: 'problem', message: 'This module has no type, so Make.com cannot create it.' };
    if (name === 'placeholder:Placeholder') return { ...base, status: 'swap', message: 'Empty placeholder. Pick the real module for this step in Make.com after import.' };

    // Merge only rejoins If-else branches; it cannot rejoin Router routes (Make help: "if-else-and-merge").
    if (name === 'builtin:BasicMerge' && prev?.module !== 'builtin:BasicIfElse') {
      return { ...base, status: 'problem', message: 'Merge only works straight after an If-else module. It cannot rejoin Router routes, so this step will not work. Remove it, or change the Router to an If-else.' };
    }

    if (!info) {
      return { ...base, status: 'swap', message: 'Not found in any real Make.com blueprint we have. The AI may have invented this name. After import, replace it with the matching module from this app in Make.com.' };
    }
    if (info.versions.length === 0) {
      return { ...base, status: 'version-unconfirmed', message: `Real module${info.name ? ` (${info.name})` : ''}. Its version number is not confirmed, so check it imports cleanly.` };
    }
    if (version === null || !info.versions.includes(version)) {
      return { ...base, status: 'swap', message: `Real module${info.name ? ` (${info.name})` : ''}, but version ${version ?? 'is missing'}${version !== null ? ' is not one we have seen' : ''}. Known version${info.versions.length > 1 ? 's' : ''}: ${info.versions.join(', ')}.` };
    }
    return { ...base, status: 'verified', message: `Real module${info.name ? ` (${info.name})` : ''}, version confirmed.` };
  });

  // {{N.field}} must point at a module id that exists in this blueprint.
  for (const { mod } of all) {
    const text = JSON.stringify({ mapper: mod?.mapper, filter: mod?.filter, parameters: mod?.parameters }) || '';
    for (const block of text.match(/\{\{.*?\}\}/g) || []) {
      for (const m of block.matchAll(/(?<![\w.])(\d+)\.[`A-Za-z_]/g)) {
        if (!ids.has(m[1])) problems.push(`Module ${mod?.id} (${mod?.module}) uses data from module ${m[1]}, but no module has that id.`);
      }
    }
  }

  const counts = { verified: 0, 'version-unconfirmed': 0, swap: 0, problem: 0 } as Record<MakeModuleStatus, number>;
  for (const m of modules) counts[m.status]++;
  return { modules, problems: [...new Set(problems)], counts };
}

// Returns a copy without the AI's own "_confidence" / "_notes" fields, which Make's import
// does not expect. Onyx shows those notes on screen instead.
export function cleanMakeBlueprint(blueprint: any): any {
  const strip = (v: any): any => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const [k, val] of Object.entries(v)) if (k !== '_confidence' && k !== '_notes') out[k] = strip(val);
      return out;
    }
    return v;
  };
  return strip(blueprint);
}
