/**
 * Plain-English catalogue of every Onyx tool, used by the Onyx concierge (and the
 * voice-command router) so they recommend real tools instead of guessing.
 * Paths must match the routes in App.tsx. Keep in sync when a tool is added,
 * renamed or changed.
 */

export interface ToolInfo {
  name: string;
  path: string;
  what: string;    // what it does
  useWhen: string; // the situation it's for
}

export const TOOL_CATALOG: ToolInfo[] = [
  { name: 'Dashboard', path: '/', what: 'Overview of recent activity and usage across the suite.', useWhen: 'you want a summary of what you have been doing.' },
  { name: 'New Intelligence', path: '/weekly-intel', what: 'Roundup of recent AI and automation news and platform releases from the last two weeks.', useWhen: 'you want to know what changed recently in n8n, Make.com, GHL, AI models, etc.' },
  // Community Intel hidden 2026-09-28 (see constants.tsx):
  // { name: 'Community Intel', path: '/community', what: 'Summarises what users on the n8n and Make.com forums, GitHub and Reddit are saying about a topic.', useWhen: 'you want real-world opinions, known bugs or workarounds for a platform or feature.' },
  { name: 'Node-by-Node Roadmap', path: '/node-roadmap', what: 'Turns a 3DX or project document into a step-by-step build plan, node by node, for n8n, Make.com or GHL.', useWhen: 'you have a client document and need to know exactly which steps to build, in order.' },
  { name: 'Scope & Stack Analyzer', path: '/scope-analyzer', what: 'Reads a 3DX or project document and produces a clear project scope, alternative tools for each technology, and edge cases to plan for.', useWhen: 'you are starting a project and need the scope, tool choices and risks pinned down.' },
  { name: 'Integration Roadmap', path: '/roadmap', what: 'Plans a larger multi-platform automation project in phases.', useWhen: 'you are planning how several systems will be connected over a project.' },
  { name: 'Logic Troubleshooter', path: '/troubleshooter', what: 'Helps find why a workflow takes the wrong path — broken conditions, loops and branches.', useWhen: 'a workflow runs but does the wrong thing.' },
  { name: 'Error Resolver', path: '/error-resolver', what: 'Explains an error message or error screenshot in plain English and gives the fix steps.', useWhen: 'a workflow failed with an error and you want to know what it means and how to fix it.' },
  { name: 'Multi-Agent Designer', path: '/designer', what: 'Designs a setup where several AI agents each handle part of a job and hand off to each other.', useWhen: 'one AI step is not enough and you need several specialised agents working together.' },
  { name: 'Prompt Engineering Lab', path: '/lab', what: 'Improves an existing AI prompt or writes a new one from a plain description, then lets you re-adjust it in your own words.', useWhen: 'you need a better prompt for an AI step in a workflow.' },
  { name: 'Credential Assistant', path: '/credential-assistant', what: 'Step-by-step guide to setting up a connection or API key for a service, written only from that service\'s official documentation, with checked links and the source pages.', useWhen: 'you need to connect a new app or service and don\'t know how to set up its credentials.' },
  { name: 'Onyx Docu-Scanner', path: '/api-scanner', what: 'Pulls the specific technical details you need (endpoints, fields) out of long developer documentation.', useWhen: 'you have API documentation and need just the relevant part.' },
  { name: 'Prompt-to-HTTP Builder', path: '/http-builder', what: 'Turns a plain-English description of an API call into a ready HTTP request (curl, code or automation settings).', useWhen: 'you need to call an API from a workflow and want the request built for you.' },
  { name: 'Onyx Payload Morpher', path: '/payload-morpher', what: 'Reshapes webhook or API data from one structure into another and gives the field mapping.', useWhen: 'data arrives in one shape and the next system needs it in a different shape.' },
  { name: 'Onyx API Sandbox', path: '/api-sandbox', what: 'Builds and tries out API requests, and explains every field in plain English.', useWhen: 'you want to test or understand an API request before putting it in a workflow.' },
  { name: 'Doc Generator', path: '/doc-generator', what: 'Writes a functional specification document from blueprint or code files (Make.com/n8n exports), downloadable as MD, TXT, PDF or Word.', useWhen: 'you need documentation or a handover spec for a workflow you built.' },
  { name: 'Onyx QA Lab', path: '/qa-handover', what: 'Turns a handover document or blueprint into test cases and a QA checklist.', useWhen: 'you need to test a build before handing it to a client.' },
  { name: 'Tool Comparison', path: '/comparison', what: 'Compares automation platforms side by side on features, speed and pricing.', useWhen: 'you are choosing between platforms like n8n, Make.com and Zapier.' },
  { name: 'JS Refactor & Auditor', path: '/code-refactor', what: 'Works with JavaScript code in four modes: improve it, write it, check it for problems, or explain it in plain English.', useWhen: 'you have code from a Code node and want it fixed, written or explained.' },
  { name: 'Efficiency Auditor', path: '/auditor', what: 'Checks a workflow or config for strengths and problems, scores it by a fixed rule, and produces an improved version.', useWhen: 'you want a workflow reviewed and made more reliable or efficient.' },
  { name: 'Compliance Checker', path: '/compliance', what: 'Checks how a process handles data against GDPR, HIPAA and similar rules and lists the risks and fixes.', useWhen: 'a workflow handles personal or sensitive data and you need to know if it is compliant.' },
  { name: 'Privacy Scanner', path: '/privacy', what: 'Finds personal data and secrets (emails, API keys, card numbers) in a payload, rates the risk High/Medium/Low, and says how to fix each leak.', useWhen: 'you want to check data or a blueprint for leaked keys or personal information.' },
  { name: 'Skill Finder', path: '/skill-finder', what: 'Searches GitHub for ready-made Claude skills (SKILL.md files) that match a task you describe, with stars, last update and a link for each.', useWhen: 'you want Claude to do a task and want to know if someone already built a skill for it.' },
  { name: 'SQL Generator', path: '/sql-generator', what: 'Writes an SQL script from a plain-English request (PostgreSQL/Supabase, MySQL, SQL Server, SQLite or BigQuery) and explains what it does. Four modes: ask a question (read only), create a table, change a table or data, explain pasted SQL. Shows a green/yellow/red safety label, a preview script to run first for changes, and a backup reminder for risky ones. It never runs anything on a database.', useWhen: 'you need an SQL query for Supabase, a database node in n8n/Make, or any SQL database.' },
  { name: 'System Manual', path: '/manual', what: 'Full guide to every tool, with steps and tips, exportable to PDF.', useWhen: 'you want detailed instructions for a tool.' },
];

export const toolCatalogText = () =>
  TOOL_CATALOG.map(t => `- ${t.name} (${t.path}): ${t.what} Use when ${t.useWhen}`).join('\n');
