import nodeTypeList from '../services/n8nNodeTypes.json';

// Checks AI-generated n8n workflow JSON against n8n's real node list, so made-up nodes,
// unsupported versions and broken wiring are caught before the user imports the file.
// The list comes from n8n's own npm packages; refresh it with scripts/update-n8n-node-types.mjs.

const KNOWN_TYPES: Record<string, number[]> = nodeTypeList.types;
const OFFICIAL_PREFIXES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

export type NodeIssue = {
  nodeName: string;
  severity: 'error' | 'warning';
  message: string;
};

export type NodeCheckResult = {
  checkedCount: number;
  issues: NodeIssue[];
  listSource: string;
};

export function checkN8nWorkflow(workflow: any): NodeCheckResult {
  const issues: NodeIssue[] = [];
  const nodes: any[] = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
  const listSource = `${nodeTypeList.sources.join(', ')} (list from ${nodeTypeList.generatedAt})`;

  if (nodes.length === 0) {
    issues.push({ nodeName: '(workflow)', severity: 'error', message: 'The file has no nodes, so it will import as an empty workflow.' });
    return { checkedCount: 0, issues, listSource };
  }

  for (const node of nodes) {
    const name = String(node?.name || '(unnamed node)');
    const type = String(node?.type || '');

    if (!type) {
      issues.push({ nodeName: name, severity: 'error', message: 'This node has no type, so n8n cannot create it.' });
      continue;
    }

    const versions = KNOWN_TYPES[type];
    if (!versions) {
      const isOfficial = OFFICIAL_PREFIXES.some(p => type.startsWith(p));
      issues.push(isOfficial
        ? { nodeName: name, severity: 'error', message: `"${type}" is not a real n8n node. The AI made it up, so this node will show as unknown after import. Replace it with a real node (often an HTTP Request node calling that service's API).` }
        : { nodeName: name, severity: 'warning', message: `"${type}" is not one of n8n's built-in nodes. It only works if that community node is installed on your n8n instance.` });
      continue;
    }

    const version = Number(node?.typeVersion);
    if (node?.typeVersion === undefined || Number.isNaN(version)) {
      issues.push({ nodeName: name, severity: 'warning', message: `No version is set, so n8n may not load this node with the settings the AI wrote for it. Supported versions: ${versions.join(', ')}.` });
    } else if (!versions.includes(version)) {
      issues.push({ nodeName: name, severity: 'error', message: `Version ${version} of "${type}" does not exist. Supported versions: ${versions.join(', ')}.` });
    }
  }

  // Connections must point at nodes that exist, or the wiring silently disappears on import.
  const names = new Set(nodes.map(n => String(n?.name)));
  for (const [source, outputs] of Object.entries(workflow?.connections || {})) {
    if (!names.has(source)) {
      issues.push({ nodeName: source, severity: 'error', message: `A connection starts from "${source}", but no node has that name.` });
    }
    for (const branches of Object.values(outputs as Record<string, any[]>)) {
      for (const branch of branches || []) {
        for (const link of branch || []) {
          if (link?.node && !names.has(link.node)) {
            issues.push({ nodeName: source, severity: 'error', message: `"${source}" connects to "${link.node}", but no node has that name.` });
          }
        }
      }
    }
  }

  return { checkedCount: nodes.length, issues, listSource };
}
