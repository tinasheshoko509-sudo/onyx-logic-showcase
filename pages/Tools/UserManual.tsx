import React, { useState, useEffect } from 'react';
import { useProtocol } from '../../context/ProtocolContext';
import {
  Loader2,
  BookOpen,
  Search,
  Download,
  ChevronRight,
  Info,
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface UserManualProps {
  onAction?: (metrics?: { score?: number; gain?: number }, input?: string, output?: string) => void;
}

// Group definitions for the 21 tools
const CATEGORIES = [
  { id: 'all', label: 'All Tools' },
  { id: 'core', label: 'Core & Intelligence' },
  { id: 'planning', label: 'Planning & Design' },
  { id: 'payload', label: 'Payload & APIs' },
  { id: 'code', label: 'Code & Speed' },
  { id: 'security', label: 'Security & Compliance' }
];

const TOOL_DOCS = [
  {
    id: 'dashboard',
    category: 'core',
    name: 'Dashboard (Neural Diagnostics)',
    purpose: 'Strategic operational overview, latency telemetry, and dynamic memory logs.',
    useCase: 'Best used by senior system architects to review real-time processing flow, verify secure Firestore database connections, and review recent middleware operations.',
    inputGuide: 'Navigating to this page reads localStorage metadata and Firestore collections dynamically; no typing is required.',
    outputGuide: 'Provides structured graphs visualising execution cycles, average logic integrity percentages, total efficiency gains, and lists historical logs.',
    steps: [
      'Navigate to the main page (/) to view your central pipeline operations.',
      'Check logic integrity scoring and latency telemetry in the statistics deck.',
      'Use the Period Selector (LIVE, 7D, 30D) to refresh and display custom time scopes on the throughput graph.',
      'Scroll to the Firestore Execution Log Stream. Click on any record to view nested input configurations and generated output JSON structures.',
      'Use the Save Telemetry toggle to optionally disable active cloud logging.'
    ],
    tip: 'Integrate the optional telemetry logging block in other sub-tools to populate your dashboard logs with detailed production data.'
  },
  {
    id: 'weekly-intel',
    category: 'core',
    name: 'New Intelligence (Weekly Intel)',
    purpose: 'System warnings, release logs, and neural middleware update bulletins.',
    useCase: 'Ideal for staying informed on structural changes in major automation networks e.g. Make.com runtime migrations or n8n credential formats.',
    inputGuide: 'Check the real-time notification streams. Toggle filtering triggers to isolate alerts or successful sync streams.',
    outputGuide: 'A list of structured system bulletins detailing developer logs, middleware instructions, and critical alert lines.',
    steps: [
      'Select the New Intelligence tab from the navigation workspace sidebar.',
      'Identify critical system notifications flagged with amber warnings or crimson alerts.',
      'Drill down on any record by clicking on its title to see impacted systems.',
      'Refine intelligence bulletins by entering keywords in the local workspace filters.',
      'Verify sync logs showing connection stats to global webhook nodes.'
    ],
    tip: 'Audit this section first before deploying significant new automation changes, as it lists emerging bugs in external API endpoints.'
  },
  // Community Intel manual entry removed 2026-09-28 while the tool is hidden (see constants.tsx).
  {
    id: 'sql-generator',
    category: 'code',
    name: 'SQL Generator',
    purpose: 'Writes an SQL script from a plain-English request and explains what it does. Onyx never connects to or runs anything on your database.',
    useCase: 'Used when you need a query for Supabase, a Postgres/Supabase node in n8n, a Make.com database module, or any SQL database — without writing SQL yourself.',
    inputGuide: 'Pick the database (PostgreSQL / Supabase is the default and is remembered), optionally a saved client table layout, then the kind of script: Ask a question (read only), Create a table, Change a table or data, or Explain SQL (paste a script). Describe what you need in plain English.',
    outputGuide: 'A safety label worked out by fixed rules (green = read only, yellow = changes data or structure, red = can destroy data), a read-only preview script to run first for yellow/red changes, a backup reminder for red, the SQL script with a copy button, a plain-English explanation of what it does, and — when Onyx does not know your real names — a list of stand-in table and column names to replace before running.',
    steps: [
      'Navigate to SQL Generator in the sidebar.',
      'Check the Database dropdown matches your client\'s database.',
      'Describe what you need, e.g. "find contacts that share the same phone number".',
      'Click Generate SQL (or press CTRL + ENTER).',
      'Replace any listed stand-in names with your real ones, then copy the script into Supabase\'s SQL Editor or your workflow\'s database node.'
    ],
    tip: 'For yellow or red scripts, run the preview first and check the rows and count. For red, take a backup first. Onyx only writes the script — nothing happens to your data until you run it yourself.'
  },
  {
    id: 'skill-finder',
    category: 'planning',
    name: 'Skill Finder',
    purpose: 'Finds ready-made Claude skills on GitHub that already do the task you describe, so you can reuse one instead of building from scratch.',
    useCase: 'Used before building a new Claude workflow or agent step — to check whether someone has already published a skill for it (e.g. turning PDFs into slide decks, reviewing workflow JSON).',
    inputGuide: 'Describe the task in plain English, in one or two sentences. Shorter, specific descriptions find better matches.',
    outputGuide: 'Up to 8 real skills from public GitHub projects, each with a High/Medium match label, what it does, why it fits your task, its star count, when it was last updated, and a link to open it on GitHub.',
    steps: [
      'Navigate to Skill Finder in the sidebar.',
      'Type what you want Claude to do.',
      'Click Find Skills (or press CTRL + ENTER). The search takes about 30 seconds.',
      'Compare the results — more stars and a recent update usually mean a better-maintained skill.',
      'Click Open on GitHub to read the skill in full before installing it.'
    ],
    tip: 'These are other people\'s skills. Always read a skill before installing it — skills can include scripts that run on your computer. GitHub allows about 10 searches a minute, so wait a moment if you see a limit message.'
  },
  {
    id: 'node-roadmap',
    category: 'planning',
    name: 'Node-by-Node Roadmap',
    purpose: 'Iterative, AI-backed sequencing map for multivariable workflow runs.',
    useCase: 'Used when building complex, multi-stage automations linking divergent apps (like GHL, Stripe, and Google Sheets) and you need a sequential map.',
    inputGuide: 'Provide a plain-English prompt stating your desired step-by-step business automation flows and click "Generate".',
    outputGuide: 'An interactive, fully-visualized diagrammatic roadmap of execution blocks, including node-by-node parameters and an exportable n8n layout tree.',
    steps: [
      'Open the Node-by-Node Roadmap worksheet.',
      'Type your desired business logic flow clearly inside the design context card.',
      'Select logic criteria options like "Include Error Branches" or "Optimized Mode" to tailor your design.',
      'Execute the synthesis. Use the interactive nodes to review expected key layouts.',
      'Click the "Export n8n Schema" button to instantly copy ready-to-run JSON layouts.'
    ],
    tip: 'Define clear conditions in your prompt like "If payment fails, send Gmail alert, else update worksheet" to generate perfect, fail-safe conditional logic pathways.'
  },
  {
    id: 'lab',
    category: 'planning',
    name: 'Prompt Engineering Lab',
    purpose: 'System prompting sandbox to prototype, test, and score custom instructions.',
    useCase: 'Used to refine and pressure-test logic statements and prompt directives before embedding them into custom AI modules.',
    inputGuide: 'Input your raw developer system instructions and optional mock datasets to execute parallel tests.',
    outputGuide: 'A side-by-side performance chart ranking latency, instruction retention, and output format integrity.',
    steps: [
      'Enter the Prompt Engineering Lab workstation.',
      'Paste your draft system prompt inside the template block.',
      'Add mock API variables to simulate active runtime data insertions.',
      'Execute the testing sequence to run real-time semantic analysis.',
      'Review the engineering score breakdown to identify loose phrasing or formatting risks.'
    ],
    tip: 'Use distinct uppercase tags (e.g., [SYSTEM_DIRECTIVE]) in your prompt structures to improve the instruction retention scores in the lab.'
  },
  {
    id: 'error-resolver',
    category: 'core',
    name: 'Error Resolver',
    purpose: 'Plain-English neural translator for technical logs, automation exception errors, and error screenshots — supports text input, image upload, or both simultaneously.',
    useCase: 'Use this tool when n8n, Make.com, or Zapier outputs a cryptic error code like "ECOMM_TIMED_OUT" or "429: Too Many Requests" and you need instant instructions — or when you only have a screenshot of the error.',
    inputGuide: 'Paste a raw error log or stack trace, upload a screenshot of the error (PNG, JPG, or WebP), or combine both for the most accurate diagnosis.',
    outputGuide: 'A plain-English explanation, a bulleted list of step-by-step remediation procedures, and a technical dossier context block.',
    steps: [
      'Select the Error Resolver from the side utility menu.',
      'Option A: Paste your cryptic, unedited technical exception log inside the textbox.',
      'Option B: Click "Upload Error Screenshot" (or drag-and-drop an image onto the panel) to supply a screenshot instead.',
      'Option C: Combine both — paste the error text AND attach a screenshot for maximum context.',
      'Use the CTRL+ENTER shortcut or click "Decode Signal" to process.',
      'View the translated definition in the highlight card to understand why the crash occurred.',
      'Follow the numbered remediation guide to apply systemic changes in your target platform.'
    ],
    tip: 'Screenshot mode uses vision AI — useful when the error only appears on-screen and you cannot copy the text. For best results, capture the full error panel, not just a cropped snippet.'
  },
  {
    id: 'credential-assistant',
    category: 'security',
    name: 'Credential Assistant',
    purpose: 'Step-by-step guide to getting access credentials (API key, OAuth app, service account) for any platform and connecting them to n8n, Make.com or GoHighLevel.',
    useCase: 'You need to connect a new service and don\'t know where its API key lives or how to enter it in your automation tool.',
    inputGuide: 'Describe what you need in plain English, naming the platform and the tool, e.g. "CallRail API key for n8n" or "Google Service Account for BigQuery in n8n".',
    outputGuide: 'Prerequisites (with checked links), numbered setup steps using the platform\'s own menu names, gotchas the docs mention, a "Not in the docs" note for anything not covered, and the official pages it was written from.',
    steps: [
      'Type what you need to connect, naming the platform (and the automation tool if not n8n).',
      'Onyx finds the platform\'s official documentation and help pages, plus the automation tool\'s own docs for that connection.',
      'The guide is written only from those pages. Every link comes from them and is checked to load.',
      'Follow the steps, and check "Not in the docs" for anything you will need to work out yourself.',
      'If no official docs can be found, Onyx says so instead of guessing.'
    ],
    tip: 'Never paste a real API key or secret here. The tool only needs the platform\'s name, not your credentials.'
  },
  {
    id: 'api-scanner',
    category: 'payload',
    name: 'Onyx Docu-Scanner',
    purpose: 'Crawl and parse developer documentation URLs to extract clean endpoint schemas.',
    useCase: 'Used when integrating a new software and you want to extract endpoint routes, header structures, and parameters without scrolling documentation pages.',
    inputGuide: 'Provide the public URL of the API docs (or paste the docs text) and a simple question, e.g. "How do I add a tag to a call?".',
    outputGuide: 'A plain-English answer, how to log in (authentication), one card per endpoint (method, path, what it does, parameters table, example), watch-outs and source links, exportable to MD, TXT or PDF. Everything comes from the real docs; if the docs cannot be read or do not answer the question, it says so instead of guessing.',
    steps: [
      'Acknowledge the scanner interface rules and select Onyx Docu-Scanner.',
      'Enter the public HTTP URL of the target developer documentation.',
      'State your target goal (e.g. "Find CRM contact creation parameters").',
      'Click "Scan Documentation".',
      'View and copy the parsed API routes directly from the dashboard card.'
    ],
    tip: 'If a page cannot be read, open it in your browser, select all (Ctrl + A), copy it and use "Or paste the docs text instead".'
  },
  {
    id: 'http-builder',
    category: 'payload',
    name: 'Prompt-to-HTTP Builder',
    purpose: 'Natural language synthesis tool producing standard code client libraries and raw payloads.',
    useCase: 'Used when you know what you want an API to do, but you want to generate the exact cURL command, JS Axios query, or n8n HTTP Request node.',
    inputGuide: 'Enter a request describing your API instructions, configure path variables, and add key headers.',
    outputGuide: 'A tabbed output displaying compiled blocks of cURL cli, ES6 Axios, and standard n8n JSON structures.',
    steps: [
      'Select the Prompt-to-HTTP Builder.',
      'Explain your API route details in the command console.',
      'Provide manual structural headers (e.g., Content-Type: application/json) if required.',
      'Compile code. Switch easily between cURL, Axios, and n8n tabs to view output formats.',
      'Click the copy icon to copy the selected configuration block instantly.'
    ],
    tip: 'You can input dynamic parameters like {{ $node["MyNode"].json.id }} to generate perfectly suited n8n client nodes.'
  },
  {
    id: 'payload-morpher',
    category: 'payload',
    name: 'Onyx Payload Morpher',
    purpose: 'Transform, map, and flatten complex JSON webhook assets.',
    useCase: 'Perfect for connecting GHL webhook arrays containing custom variables that need to map into structured GoHighLevel or Make.com key requirements.',
    inputGuide: 'Input your raw source web payload JSON on the left and type your target mapping guidelines on the right.',
    outputGuide: 'An optimized, transformed target JSON structure, a secure mapping translation overview, and schema compliance reviews.',
    steps: [
      'Go to the Onyx Payload Morpher tab.',
      'Select an integration preset (like GHL Contacts or Stripe Payments) or paste your custom raw JSON.',
      'State your targeted endpoint mapping rules in clear plain English.',
      'Click "Translate & Morph" to process.',
      'Expand the Compliance tabs to evaluate structures before pasting code.'
    ],
    tip: 'Ensure your source JSON has double quotes on keys to avoid runtime parsing crashes; use the live JSON validator to assist.'
  },
  {
    id: 'api-sandbox',
    category: 'payload',
    name: 'Onyx API Sandbox',
    purpose: 'Complete sandbox utility to simulate API request execution with high-fidelity validation feedback.',
    useCase: 'Used when building external integrations or custom API integrations and you need to simulate server responses, trace custom header sets, validate payload structures, and trace validation parameters safely.',
    inputGuide: 'Configure requests by choosing methods (GET, POST, PUT, DELETE), typing target URL paths, injecting custom headers, adding schema query parameters, or configuring request body JSON.',
    outputGuide: 'Instantly renders a dynamic HTTP response panel showing simulated response times, simulated headers, and exact JSON bodies, complete with AI validation checklists and issue ratings.',
    steps: [
      'Select Onyx API Sandbox from the utility sidebar.',
      'Choose a quick-start preset (e.g. Stripe Payment, Slack Webhook, Auth0 Access, SendGrid Dispatch) to instantly populate headers and structures.',
      'Customize target parameters, configure custom request headers, or adjust the JSON body schema.',
      'Specify the desired HTTP Status code to simulate handling edge-cases (like 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 500 Internal Server Error).',
      'Click the "Simulate Request Execution" trigger to run full structural sanity and validation diagnostics.'
    ],
    tip: 'Simulate high-risk edge cases like "403 Forbidden" or "503 Service Unavailable" to receive tailored logic advice on how to implement proper backoff and retry rules inside your target application workflows.'
  },
  {
    id: 'comparison',
    category: 'planning',
    name: 'Tool Comparison',
    purpose: 'Deep analytical feature scorecard comparing major automation systems.',
    useCase: 'Use this tool when deciding whether a new enterprise workflow is better suited for n8n, Make.com, or Zapier.',
    inputGuide: 'Select the primary and secondary integration engines from the comparative drop-down options.',
    outputGuide: 'A dynamic, visual comparison dashboard mapping speed, limits, pricing structures, and self-hosted capacities.',
    steps: [
      'Select Tool Comparison from the systems sidebar.',
      'Choose your first engine option (e.g., n8n) and your second choice (e.g., Make.com).',
      'Review the structured bar graphs indicating speed limits and data capacity.',
      'Audit the detailed features comparison list beneath the main scorecard.',
      'Read the tactical overview tips suggesting the ideal pipeline architecture.'
    ],
    tip: 'Review the "Self-host Capability" category if your workflow needs to operate with low cost under massive data throughput arrays.'
  },
  {
    id: 'code-refactor',
    category: 'code',
    name: 'JS Refactor & Codebase Auditor',
    purpose: 'Source code optimizer with four modes: Refactor, Generate, Audit, and Decode — covering optimization, generation, deep diagnosis, and plain-English explanation of any JavaScript.',
    useCase: 'Used when optimizing JS for automation nodes, generating scripts from English rules, auditing entire app codebases, or decoding unfamiliar JavaScript into a step-by-step plain-English breakdown.',
    inputGuide: 'Paste your unoptimized custom script, your full application source file, or any JavaScript you want explained. Optionally type observed symptoms or user notes.',
    outputGuide: 'Mode-dependent: Refactor returns optimized code; Generate returns a new script; Audit returns a multi-tab bug/security/performance report; Decode returns a plain-English summary, numbered step breakdown, and data-flow card (inputs, outputs, side effects).',
    steps: [
      'Select JS Refactor & Auditor from the systems menu.',
      'Choose your mode: Refactor (optimizes JS), Generate (creates scripts from English rules), Audit (full codebase diagnostics), or Decode (explains what any JavaScript does in plain English).',
      'Paste your JavaScript code in the code input area.',
      'For Audit mode, optionally add observed symptoms to guide the diagnosis.',
      'Click the action button to run the selected mode.',
      'For Decode mode, review the Summary card, numbered Step-by-Step breakdown, and Data Flow card showing inputs, outputs, and side effects.'
    ],
    tip: 'Use Decode mode when you inherit a Code node from someone else and cannot tell what it does — it works on n8n Code nodes, backend scripts, utility functions, and any other JavaScript regardless of context.'
  },
  {
    id: 'auditor',
    category: 'code',
    name: 'Efficiency Auditor',
    purpose: 'Workflow JSON analyzer designed to reduce step costs, node volume, and payload cycles.',
    useCase: 'Use when you want to audit your automation pipeline layout to remove loops, redundant requests, and save on step counts.',
    inputGuide: 'Paste your compiled workflow schema blueprint (JSON) inside the workspace analyzer.',
    outputGuide: 'An automated diagnostic score, detailed waste audits, and step-reduction plans.',
    steps: [
      'Select Efficiency Auditor from the tools menu.',
      'Paste your complete workflow schema JSON layout.',
      'Configure processing cost limits to calculate estimated dollar-waste.',
      'Analyze the results. Check the visual gauges measuring node efficiency and payload overhead.',
      'Apply the recommended structural improvements to optimize platform pricing.'
    ],
    tip: 'Paste your n8n workflow JSON, and the auditor will flag locations where multiple single-value HTTP calls can be batched into single collections.'
  },
  {
    id: 'compliance',
    category: 'security',
    name: 'Compliance Checker',
    purpose: 'Workflow and endpoint configuration auditer verifying GDPR, HIPAA, and data safety standards.',
    useCase: 'Used to audit sensitive webhooks or customer processing pipelines before deploying them live in production, avoiding privacy leaks.',
    inputGuide: 'Input your raw API endpoint specs, JSON payloads, or workflow definitions.',
    outputGuide: 'A detailed compliance scorecard showing risk categories, rating flags, and remediation steps.',
    steps: [
      'Open the Compliance Checker platform routing.',
      'Paste your target layout setup or endpoint configuration schemas.',
      'Select security levels and rulesets relevant to your target customer geography.',
      'Run the diagnostic sequence.',
      'Download or review compliance lists detailing strict encryption gaps or PII transmission vulnerabilities.'
    ],
    tip: 'Combine these compliance checklists with the Privacy Scanner to implement a comprehensive security audit of your data assets.'
  },
  {
    id: 'roadmap',
    category: 'planning',
    name: 'Integration Roadmap',
    purpose: 'Visual project planner mapping legacy transformations to automated integrations.',
    useCase: 'Use when planning a multi-week enterprise client migration project and you want to map milestones, stages, and tasks.',
    inputGuide: 'A text outline of your integration plan, core stages, and milestones.',
    outputGuide: 'An interactive roadmap timeline card featuring planning markers, chronological progress bars, and risk factors.',
    steps: [
      'Select the Integration Roadmap option.',
      'Input your targeted automation program description.',
      'Choose project planning criteria templates (like Standard, Agile, or Fast-Track).',
      'Build the timeline view. Review setup tasks, logic dev grids, and staging goals.',
      'Monitor risk indicators that highlight bottlenecks in API access authorizations.'
    ],
    tip: 'Define clear milestones with deadlines in your input string to render more detailed, time-specific sequence charts on the roadmap canvas.'
  },
  {
    id: 'troubleshooter',
    category: 'planning',
    name: 'Logic Troubleshooter',
    purpose: 'AI-guided debugger designed to inspect conditional loops and binary junctions.',
    useCase: 'Use this tool when a workflow execution frequently bifurcates down the wrong logic tree, or gets locked inside infinite retry nodes.',
    inputGuide: 'Explain the logical structure of your workflow conditional checks and detail the unexpected error behaviors.',
    outputGuide: 'A logical blueprint debugging scan, an interactive timeline of variables, and corrective boolean code statements.',
    steps: [
      'Open the Logic Troubleshooter.',
      'Outline your conditional check structures (e.g. If status is equal to active, but value is undefined).',
      'Select target automation engine preset.',
      'Inspect parsed logical outcomes in the debugger card.',
      'Copy the suggested corrective boolean check string.'
    ],
    tip: 'Include actual failing raw test values in your prompt to allow the debugger to test your logic conditions against edge cases.'
  },
  {
    id: 'designer',
    category: 'planning',
    name: 'Multi-Agent Designer',
    purpose: 'Blueprint orchestrator to align multiple specialized AI routines.',
    useCase: 'Use when design-structuring an agent-oriented network (like a research agent, synthesis agent, and email sender agent) to execute in series.',
    inputGuide: 'Provide roles, responsibilities, and system-level delegation models for your desired AI workforce.',
    outputGuide: 'A comprehensive integration pipeline, defining communication protocols, prompt mappings, and output nodes.',
    steps: [
      'Select the Multi-Agent Designer in the workspace sidebar.',
      'Outline what roles of specialized agents are needed (e.g., researcher, copywriter).',
      'Configure coordination types (e.g., Linear, Hierarchical, or Star network).',
      'Click "Compile Agent Pipeline" to process.',
      'Review output definitions showing prompts, outputs, and validation routines.'
    ],
    tip: 'Assign a single "Lead Coordinator" agent role to manage inputs and aggregate reports, preventing loops or agent confusion.'
  },
  {
    id: 'privacy',
    category: 'security',
    name: 'Privacy Scanner',
    purpose: 'Real-time structural checker detecting and masking PII inside JSON web assets.',
    useCase: 'Checks JSON database records for accidental inclusion of credit cards, emails, phone numbers, or passwords before passing to public APIs.',
    inputGuide: 'Input your raw data schema, sample database outputs, or webhook payloads.',
    outputGuide: 'An identified risks list, highlighted security vectors, and copyable script models to mask fields.',
    steps: [
      'Open the Privacy Scanner under security tools.',
      'Paste your sample JSON payload into the sandbox editor.',
      'Run the sanitization check.',
      'Verify PII compliance flags identifying email or financial records in the highlighted report.',
      'Copy the generated JS sanitizer snippet to scrub values before they exit your system.'
    ],
    tip: 'Add custom field keys in the validator config card to detect and mask platform-specific unique tags (like "ghl_custom_phone").'
  },
  {
    id: 'scope-analyzer',
    category: 'planning',
    name: 'Scope & Stack Analyzer',
    purpose: 'Dual-output analyzer that extracts a structured project scope and suggests vetted alternative tools for every technology listed in a 3DX or project document.',
    useCase: 'Use when onboarding a new client project — paste the 3DX doc to instantly understand the project scope and surface alternatives for every tool in the proposed stack.',
    inputGuide: 'Paste or upload a 3DX project document, project brief, or any text that describes the project objectives and its intended tools or platforms.',
    outputGuide: 'Two tabbed outputs: (1) Project Scope — objectives, phases, integrations, and risks; (2) Stack Alternatives — per-tool alternative suggestions with role descriptions and key trade-offs.',
    steps: [
      'Navigate to Scope & Stack Analyzer from the sidebar.',
      'Paste the full text of your 3DX project document into the input area.',
      'Click "Analyze Document" to run both analyses simultaneously.',
      'Review the Project Scope tab for objectives, phases, integrations, and risks.',
      'Switch to the Stack Alternatives tab to see vetted alternatives for each tool listed in the document.',
      'Export the combined report as Markdown, TXT, or PDF.'
    ],
    tip: 'Both the scope and stack analyses run in parallel — you get both outputs in a single request with no extra wait. Use the Stack Alternatives tab when a client asks "is there a cheaper or simpler option than X?"'
  },
  {
    id: 'qa-handover',
    category: 'code',
    name: 'Onyx QA Lab',
    purpose: 'Engineers executable testing script sequences and senior manual checklists directly from project handover or blueprint specs.',
    useCase: 'Used by technical specialists and developers when handing over complete automations or custom microservices to generate standardized pytest, Playwright, or curl assertion suites.',
    inputGuide: 'Upload or paste a raw project blueprint specification, technical handover sheet, or code outline instructions.',
    outputGuide: 'Instantly provides a structured set of 4 critical scenario testing vectors with priorities, a 5-point QA validation manual checklist, and a ready-to-run assertion test script.',
    steps: [
      'Navigate to the Onyx QA Lab module.',
      'Paste your draft blueprint notes or upload your technical handover document.',
      'Optionally select default quick-launch benchmark presets like n8n Stripe Webhooks, Flask Ticket responders, or authorization services.',
      'Click the "Generate QA Test plan" trigger to run parallel semantic synthesis.',
      'Click the "Copy Script" button on the terminal window to extract clean, ready-to-use testing files.'
    ],
    tip: 'Define clear happy and unhappy pathways inside your spec to receive extremely precise assertion criteria tailored directly to your system requirements.'
  },
  {
    id: 'doc-generator',
    category: 'code',
    name: 'Onyx Spec & Doc Generator',
    purpose: 'Engineers detailed functional specification documents and structured system manuals from custom codebase files or project blueprints.',
    useCase: 'Used when building or handing over an integration pipeline, allowing developers to upload source scripts or markdown lists to automatically synthesize comprehensive architecture and deployment specs.',
    inputGuide: 'Upload single or multiple files (YAML workflows, JS/TS scripts, markdown specifications) and select the desired output format.',
    outputGuide: 'Generates a fully-structured Markdown functional spec document featuring project overviews, API mappings, and schemas, exportable to .md, .pdf, .docx, or .txt.',
    steps: [
      'Select Doc Generator from the workspace sidebar menu.',
      'Choose between Single or Multi upload mode depending on your project scope.',
      'Drag and drop or click to upload your raw source files (code, JSON schemas, or text descriptions).',
      'Click the "Generate Specification" trigger to analyze files and compile the functional document.',
      'Configure the desired export format (.md, .pdf, .docx, or .txt) and download your finalized system specification.'
    ],
    tip: 'Upload a combination of your configuration files (e.g., package.json) and main router scripts to obtain an incredibly precise dependency and flow map.'
  }
];

const UserManual: React.FC<UserManualProps> = ({ onAction }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTool, setSelectedTool] = useState<string | null>('dashboard');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const { registerActions } = useProtocol();

  // Filter tools based on category and search query
  const filteredTools = TOOL_DOCS.filter(doc => {
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.useCase.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeDoc = TOOL_DOCS.find(d => d.id === selectedTool) || TOOL_DOCS[0];

  useEffect(() => {
    registerActions({
      dryRun: async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsExporting(false);
      },
      commit: async () => {
        handleDownloadPDF();
        if (onAction) onAction();
      }
    });
  }, [selectedTool, onAction, registerActions]);

  const handleDownloadPDF = () => {
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Total Pages Estimate configuration (for flawless page breaks)
      const pageHeight = 297;
      const pageWidth = 210;
      const marginX = 20;
      const contentWidth = pageWidth - (marginX * 2); // 170mm

      // Cover Page Configuration
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Accent border
      doc.setDrawColor(0, 112, 255);
      doc.setLineWidth(1.5);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Title Block
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('ONYX LOGIC SYSTEMS', marginX + 5, 80);

      doc.setFontSize(14);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0, 112, 255);
      doc.text('AUTOMATION PROTOCOL MANUAL', marginX + 5, 95);

      doc.setDrawColor(0, 112, 255);
      doc.setLineWidth(0.5);
      doc.line(marginX + 5, 102, marginX + 110, 102);

      // Description text on cover
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(11);
      const splashDesc = [
        "A highly detailed, comprehensive user reference and architectural systems",
        "documentation manual explaining the 21 specialized operations modules",
        "of the Onyx Logic integration suite.",
        "",
        "This manual outlines primary purposes, step-by-step procedures, typical use cases,",
        "essential parameter models, and optimizations for incoming and outgoing data pipelines."
      ];
      let splashY = 115;
      splashDesc.forEach((line) => {
        doc.text(line, marginX + 5, splashY);
        splashY += 7;
      });

      // Metadata info on cover
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(110, 110, 110);
      doc.setFontSize(9);
      doc.text('VERSION: 4.0.2 - STABLE RUNTIME', marginX + 5, 230);
      doc.text('AUTHOR: ONYX NEURAL SYSTEMS & COMPLIANCE GROUP', marginX + 5, 237);
      doc.text('COMPILED ON: ' + new Date().toLocaleDateString('en-US'), marginX + 5, 244);
      doc.text('CLASSIFICATION: USER OPERATIONAL REFERENCE', marginX + 5, 251);

      // PAGE 2: Table of Contents
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Page Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(10, 10, 10);
      doc.text('TABLE OF CONTENTS', marginX, 30);

      // Line
      doc.setDrawColor(0, 112, 255);
      doc.setLineWidth(0.8);
      doc.line(marginX, 35, pageWidth - marginX, 35);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Navigate this comprehensive operational handbook detailing the active sub-systems.', marginX, 42);

      // Print TOC list programmatically. Since we know A4 sizing, let's list sections beautifully
      let tocY = 55;
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('Section I: Core Operations & Performance Metrics', marginX, tocY);
      tocY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const itemsI = [
        '1. Dashboard (Telemetry & Execution Logs) .............................................................. Page 3',
        '2. New Intelligence (Weekly Updates Bulletins) ........................................................ Page 3',
        '3. Error Resolver (Plain-English Exception & Screenshot Decoder) ............................ Page 4'
      ];
      itemsI.forEach(item => {
        doc.text(item, marginX + 5, tocY);
        tocY += 6;
      });

      tocY += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('Section II: Planning & Architectural Design Tools', marginX, tocY);
      tocY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const itemsII = [
        '4. Node-by-Node Roadmap (Path Synthesizer) ....................................................... Page 5',
        '5. Integration Roadmap (Gantt Milestone Planner) .................................................. Page 5',
        '6. Logic Troubleshooter (Conditional Branching Guard) ............................................ Page 6',
        '7. Multi-Agent Designer (Workflow delegation blueprints) .......................................... Page 6',
        '8. Scope & Stack Analyzer (Project scope + tool alternative suggestions) .................. Page 7',
        '9. Skill Finder (Ready-made Claude skills from GitHub) ............................................ Page 7'
      ];
      itemsII.forEach(item => {
        doc.text(item, marginX + 5, tocY);
        tocY += 6;
      });

      tocY += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('Section III: Webhook Payloads & API Morphing', marginX, tocY);
      tocY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const itemsIII = [
        '9. Onyx Payload Morpher (JSON Transform Middlewares) ....................................... Page 8',
        '10. Prompt-to-HTTP Builder (API Code Synthesizer) .................................................. Page 8',
        '11. Onyx Docu-Scanner (Automated Docs crawler) ................................................. Page 9',
        '12. Onyx API Sandbox (High-fidelity HTTP Router Simulation) ................................ Page 9'
      ];
      itemsIII.forEach(item => {
        doc.text(item, marginX + 5, tocY);
        tocY += 6;
      });

      tocY += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('Section IV: Code Refactoring & System Optimization', marginX, tocY);
      tocY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const itemsIV = [
        '13. JS Refactor & Codebase Auditor (Refactor, Generate, Audit & Decode modes) ....... Page 10',
        '14. Efficiency Auditor (Excess billing and overhead checks) .................................. Page 10',
        '15. Tool Comparison (Performance Matrix of major platforms) .................................. Page 11',
        '16. Onyx QA Lab (Fidelity test-script & checklist synthesizer) ................................. Page 11',
        '17. Onyx Spec & Doc Generator (Functional spec & system manual generator) ........... Page 11'
      ];
      itemsIV.forEach(item => {
        doc.text(item, marginX + 5, tocY);
        tocY += 6;
      });

      tocY += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(10, 10, 10);
      doc.text('Section V: Critical Security, Audits & Compliance', marginX, tocY);
      tocY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      const itemsV = [
        '18. Credential Assistant (Setup guides from official docs) .................................... Page 13',
        '19. Compliance Checker (GDPR, HIPAA structures review) ...................................... Page 13',
        '20. Privacy Scanner (Personally Identifiable PII mask systems) ................................. Page 14',
        '21. Prompt Lab (Instruction pressure and testing models) ....................................... Page 14'
      ];
      itemsV.forEach(item => {
        doc.text(item, marginX + 5, tocY);
        tocY += 6;
      });


      // PAGE 3 AND ONWARD: Detailed manual description for the 20 tools
      let activePage = 3;
      
      // Let's divide tools into logic categories for professional rendering of the pages.
      const groups = [
        { title: 'SECTION I: CORE OPERATIONS & PERFORMANCE METRICS', toolIds: ['dashboard', 'weekly-intel', 'error-resolver'] },
        { title: 'SECTION II: PLANNING & ARCHITECTURAL DESIGN TOOLS', toolIds: ['node-roadmap', 'roadmap', 'troubleshooter', 'designer', 'scope-analyzer', 'skill-finder'] },
        { title: 'SECTION III: WEBHOOK PAYLOADS & API MORPHING', toolIds: ['payload-morpher', 'http-builder', 'api-scanner', 'api-sandbox'] },
        { title: 'SECTION IV: CODE REFACTORING & SYSTEM OPTIMIZATION', toolIds: ['code-refactor', 'auditor', 'comparison', 'qa-handover', 'doc-generator', 'sql-generator'] },
        { title: 'SECTION V: SECURITY, AUDITS & COMPLIANCE', toolIds: ['credential-assistant', 'compliance', 'privacy', 'lab'] }
      ];

      groups.forEach((g) => {
        doc.addPage();
        activePage++;

        // Draw header
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 112, 255);
        doc.text('ONYX LOGIC OPERATIONS HANDBOOK', marginX, 15);
        doc.setDrawColor(230, 230, 230);
        doc.line(marginX, 17, pageWidth - marginX, 17);

        // Section Title
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(10, 10, 10);
        doc.text(g.title, marginX, 26);

        let curY = 36;

        g.toolIds.forEach((tId) => {
          const docItem = TOOL_DOCS.find(d => d.id === tId);
          if (!docItem) return;

          // If there is too little vertical space, add page
          if (curY > 210) {
            doc.addPage();
            activePage++;
            // Draw header again
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(0, 112, 255);
            doc.text('ONYX LOGIC OPERATIONS HANDBOOK', marginX, 15);
            doc.setDrawColor(230, 230, 230);
            doc.line(marginX, 17, pageWidth - marginX, 17);

            curY = 28;
          }

          // Tool Name
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(10, 10, 10);
          doc.text('• ' + docItem.name.toUpperCase(), marginX, curY);
          curY += 6;

          // Purpose
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text('Purpose:', marginX + 4, curY);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          const splitPurp = doc.splitTextToSize(docItem.purpose, contentWidth - 25);
          doc.text(splitPurp, marginX + 22, curY);
          curY += (splitPurp.length * 4) + 2;

          // Main Use Case
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Use Case:', marginX + 4, curY);
          doc.setFont('Helvetica', 'italic');
          doc.setTextColor(80, 80, 80);
          const splitCase = doc.splitTextToSize(docItem.useCase, contentWidth - 25);
          doc.text(splitCase, marginX + 22, curY);
          curY += (splitCase.length * 4.2) + 2;

          // Inputs & Outputs Guidance
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Input Specs:', marginX + 4, curY);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          const splitIn = doc.splitTextToSize(docItem.inputGuide, contentWidth - 25);
          doc.text(splitIn, marginX + 22, curY);
          curY += (splitIn.length * 4) + 1;

          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Output Specs:', marginX + 4, curY);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          const splitOut = doc.splitTextToSize(docItem.outputGuide, contentWidth - 25);
          doc.text(splitOut, marginX + 22, curY);
          curY += (splitOut.length * 4) + 3;

          // Steps Header
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(0, 112, 255);
          doc.setFontSize(8.5);
          doc.text('Operational Sequence Procedures:', marginX + 4, curY);
          curY += 5;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(60, 60, 60);
          docItem.steps.forEach((step, idx) => {
            const stepText = `${idx + 1}. ${step}`;
            const splitStep = doc.splitTextToSize(stepText, contentWidth - 12);
            
            if (curY > 265) {
              doc.addPage();
              activePage++;
              // Draw header again
              doc.setFont('Helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(0, 112, 255);
              doc.text('ONYX LOGIC OPERATIONS HANDBOOK', marginX, 15);
              doc.setDrawColor(230, 230, 230);
              doc.line(marginX, 17, pageWidth - marginX, 17);
              curY = 28;
            }

            doc.text(splitStep, marginX + 8, curY);
            curY += (splitStep.length * 4.2);
          });

          curY += 2;
          
          if (curY > 265) {
            doc.addPage();
            activePage++;
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(0, 112, 255);
            doc.text('ONYX LOGIC OPERATIONS HANDBOOK', marginX, 15);
            doc.setDrawColor(230, 230, 230);
            doc.line(marginX, 17, pageWidth - marginX, 17);
            curY = 28;
          }

          // Pro-Tip Card
          doc.setFillColor(242, 247, 255);
          const tipTextStr = `PRO TIP: ${docItem.tip}`;
          const splitTipText = doc.splitTextToSize(tipTextStr, contentWidth - 16);
          const cardHeight = (splitTipText.length * 4.2) + 6;

          doc.rect(marginX + 4, curY, contentWidth - 8, cardHeight, 'F');
          doc.setDrawColor(0, 112, 255);
          doc.setLineWidth(0.3);
          doc.line(marginX + 4, curY, marginX + 4, curY + cardHeight);

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 112, 255);
          
          let tipY = curY + 4.5;
          splitTipText.forEach((tLine: string, lineIdx: number) => {
            if (lineIdx === 0) {
              doc.text(tLine, marginX + 8, tipY);
            } else {
              doc.setFont('Helvetica', 'normal');
              doc.setTextColor(80, 80, 80);
              doc.text(tLine, marginX + 8, tipY);
            }
            tipY += 4.2;
          });

          curY += cardHeight + 10;
        });
      });

      // Write footer and page numbers programmatically to all pages except cover (starts at page 2)
      const pageCount = doc.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`ONYX LOGIC SYSTEMS PROTOCOLS MANUAL • CLASSIFIED USER MANUAL`, marginX, pageHeight - 12);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX - 16, pageHeight - 12);
      }

      // Save PDF output
      doc.save('onyx-logic-systems-user-manual.pdf');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("PDF_EXPORT_FAULT:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-3">
             <BookOpen size={16} className="text-[#0070FF]" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-sans">System Documentation Desk</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4 font-sans text-zinc-900">
            System Operational <span className="text-[#0070FF]">Manual</span>
          </h2>
          <p className="text-zinc-600 text-xl max-w-3xl font-sans">
            Comprehensive guide, steps, inputs, and tips for all 21 ONYX Logic operations sub-systems, exportable directly to PDF.
          </p>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="px-6 py-4 bg-[#0070FF] hover:bg-[#005ACC] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center gap-3 disabled:opacity-50 cursor-pointer text-center font-display"
        >
          {isExporting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Compiling Document...
            </>
          ) : (
            <>
              <Download size={16} />
              Export Manual PDF
            </>
          )}
        </button>
      </header>

      {downloadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm font-sans animate-in zoom-in-95 duration-300">
          <span className="flex items-center gap-2">
            <Check size={18} className="text-emerald-600 shrink-0" />
            Operational PDF manual built and downloaded successfully. Keep this reference offline for integration blueprint audits!
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar & Filter - 4 cols */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-xl space-y-6 bg-gradient-to-br from-white to-blue-50/10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-1 font-sans">Search Systems</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              <input
                type="text"
                className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-zinc-900 text-xs font-semibold focus:border-[#0070FF] focus:ring-1 focus:ring-[#0070FF] outline-none transition-all leading-normal"
                placeholder="Search tools, terms, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-1 font-sans">Class Filters</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all border cursor-pointer ${activeCategory === category.id ? 'bg-[#0070FF] text-white border-[#0070FF]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-zinc-150" />

          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block px-1 mb-2">Systems Index ({filteredTools.length})</span>
            {filteredTools.map((docItem) => (
              <button
                key={docItem.id}
                onClick={() => setSelectedTool(docItem.id)}
                className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all font-sans cursor-pointer group ${selectedTool === docItem.id ? 'bg-[#0070FF] text-white font-bold' : 'bg-white/40 hover:bg-zinc-50 text-zinc-700 border border-zinc-100 hover:border-zinc-200 shadow-sm'}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate leading-none mb-1 group-hover:text-zinc-950 text-inherit">
                    {docItem.name}
                  </p>
                  <p className={`text-[9px] uppercase tracking-widest font-mono truncate ${selectedTool === docItem.id ? 'text-blue-100' : 'text-zinc-500'}`}>
                    Category: {docItem.category}
                  </p>
                </div>
                <ChevronRight size={14} className="shrink-0 ml-2" />
              </button>
            ))}

            {filteredTools.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">No matching systems</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Operational View - 8 cols */}
        <div className="lg:col-span-8 bg-white p-8 rounded-2xl border border-[#0070FF]/25 shadow-xl bg-gradient-to-br from-white to-blue-50/5 min-h-[640px] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-zinc-150 pb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0070FF] bg-[#0070FF]/5 px-2.5 py-1 rounded-md border border-[#0070FF]/15">
                  Sub-System Diagnostics
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 font-mono">
                  Active V4.0.2
                </span>
              </div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight font-sans mt-2">{activeDoc.name}</h3>
              <p className="text-xs text-zinc-500 font-sans tracking-wide mt-1">Classification Class: {activeDoc.category.toUpperCase()}</p>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest block font-mono mb-2">Core Purpose & Objective</span>
                <p className="text-sm text-zinc-700 leading-relaxed font-sans font-medium">{activeDoc.purpose}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/10 border border-zinc-200 rounded-xl">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block font-sans mb-1">Input Integration Specs</span>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">{activeDoc.inputGuide}</p>
                </div>
                <div className="p-4 bg-blue-50/10 border border-zinc-200 rounded-xl">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block font-sans mb-1">Output Integration Specs</span>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">{activeDoc.outputGuide}</p>
                </div>
              </div>

              <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest block font-mono mb-2">Primary Business Use Case</span>
                <p className="text-xs text-zinc-700 leading-relaxed font-sans italic font-semibold">"{activeDoc.useCase}"</p>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest block font-sans">Step-by-Step Procedure Guide</span>
                <div className="space-y-2.5">
                  {activeDoc.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:border-[#0070FF]/30 hover:bg-blue-50/5 transition-all items-center">
                      <div className="w-8 h-8 rounded-lg bg-[#0070FF]/5 hover:bg-[#0070FF] border border-[#0070FF]/15 text-[#0070FF] hover:text-white flex items-center justify-center font-black text-xs shrink-0 transition-colors font-mono">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-zinc-700 font-sans font-semibold tracking-wide">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-150 mt-6 bg-[#0070FF]/5 p-4 rounded-xl border border-[#0070FF]/15 flex items-start gap-3">
            <Info size={16} className="text-[#0070FF] shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-[10px] font-black text-[#0070FF] uppercase tracking-widest font-sans">Operational Pro-tip</p>
              <p className="text-xs text-zinc-700 font-semibold leading-relaxed mt-1 font-sans">{activeDoc.tip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManual;
