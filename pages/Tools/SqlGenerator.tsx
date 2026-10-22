import React, { useState, useEffect } from 'react';
import { generateSql } from '../../services/gemini';
import { useProtocol } from '../../context/ProtocolContext';
import { checkSqlSafety, SqlSafety } from '../../utils/sqlSafety';
import { checkSqlAgainstLayout } from '../../utils/sqlLayoutCheck';
import { Loader2, Database, Copy, Check, ShieldAlert, Wand2, Replace, Eye, HardDriveDownload } from 'lucide-react';

// SQL Generator: plain-English request in, SQL script out. Onyx never connects to or runs
// anything on a database — the user copies the script and runs it themselves.

const DIALECTS = [
  { id: 'postgres', label: 'PostgreSQL / Supabase' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'sqlserver', label: 'SQL Server' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'bigquery', label: 'BigQuery' },
];

const DIALECT_KEY = 'onyx_sql_dialect';
const readDialect = () => {
  try { return localStorage.getItem(DIALECT_KEY) || 'postgres'; } catch { return 'postgres'; }
};

// One-line (read-only) scripts that list every table and its columns, per database.
// The user runs it once per client database and pastes the result into Onyx.
const LAYOUT_SCRIPTS: Record<string, { where: string; sql: string }> = {
  postgres: {
    where: 'Supabase: open your project → SQL Editor → New query, paste this, click Run, then copy the results.',
    sql: `SELECT table_name, string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;`,
  },
  mysql: {
    where: 'Run this in your MySQL tool (e.g. phpMyAdmin → SQL tab, or MySQL Workbench) on the client database, then copy the results.',
    sql: `SET SESSION group_concat_max_len = 1000000;
SELECT table_name, GROUP_CONCAT(CONCAT(column_name, ' ', data_type) ORDER BY ordinal_position SEPARATOR ', ') AS columns
FROM information_schema.columns
WHERE table_schema = DATABASE()
GROUP BY table_name
ORDER BY table_name;`,
  },
  sqlserver: {
    where: 'Run this in SQL Server Management Studio or Azure Data Studio on the client database (SQL Server 2017 or newer), then copy the results.',
    sql: `SELECT TABLE_SCHEMA + '.' + TABLE_NAME AS table_name,
       STRING_AGG(CAST(COLUMN_NAME + ' ' + DATA_TYPE AS NVARCHAR(MAX)), ', ') WITHIN GROUP (ORDER BY ORDINAL_POSITION) AS columns
FROM INFORMATION_SCHEMA.COLUMNS
GROUP BY TABLE_SCHEMA, TABLE_NAME
ORDER BY 1;`,
  },
  sqlite: {
    where: 'Run this in your SQLite tool (e.g. DB Browser for SQLite → Execute SQL), then copy the results.',
    sql: `SELECT m.name AS table_name, group_concat(p.name || ' ' || p.type, ', ') AS columns
FROM sqlite_master m JOIN pragma_table_info(m.name) p
WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
GROUP BY m.name
ORDER BY m.name;`,
  },
  bigquery: {
    where: 'Run this in the BigQuery console. First replace my-project.my_dataset with your real project and dataset, then copy the results.',
    sql: `SELECT table_name, STRING_AGG(CONCAT(column_name, ' ', data_type), ', ' ORDER BY ordinal_position) AS columns
FROM \`my-project.my_dataset\`.INFORMATION_SCHEMA.COLUMNS
GROUP BY table_name
ORDER BY table_name;`,
  },
};

// Saved client layouts live in this browser only (per-viewer convenience, not shared).
type SavedLayout = { name: string; dialect: string; layout: string; savedAt: string };
const LAYOUTS_KEY = 'onyx_sql_layouts';
const readLayouts = (): SavedLayout[] => {
  try { return JSON.parse(localStorage.getItem(LAYOUTS_KEY) || '[]'); } catch { return []; }
};
const writeLayouts = (list: SavedLayout[]) => {
  try { localStorage.setItem(LAYOUTS_KEY, JSON.stringify(list)); return true; } catch { return false; }
};
const MAX_LAYOUT_CHARS = 20000;

const MODES = [
  { id: 'read', label: 'Ask a question', hint: 'Read only — find, count, list', placeholder: 'e.g. Find contacts that share the same phone number, newest first' },
  { id: 'create', label: 'Create a table', hint: 'Make a new table', placeholder: 'e.g. A table for appointments: contact, date and time, status, notes' },
  { id: 'change', label: 'Change a table or data', hint: 'Add, edit or delete', placeholder: 'e.g. Mark every lead older than 90 days with no booking as "cold"' },
  { id: 'explain', label: 'Explain SQL', hint: 'Paste a script, get plain English', placeholder: 'Paste the SQL script you want explained' },
];

const SAFETY_STYLE: Record<SqlSafety['level'], { box: string; title: string; label: string }> = {
  green: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', title: 'text-emerald-800', label: '🟢 Read only — safe to run' },
  yellow: { box: 'border-amber-200 bg-amber-50 text-amber-900', title: 'text-amber-800', label: '🟡 Changes data or structure — check first' },
  red: { box: 'border-red-200 bg-red-50 text-red-900', title: 'text-red-800', label: '🔴 Can destroy data — back up first' },
};

// How to take a backup before running a red script, per database.
const BACKUP_TIPS: Record<string, string> = {
  postgres: 'Supabase: Database → Backups (paid plans), or copy the table first: CREATE TABLE my_table_backup AS SELECT * FROM my_table;',
  mysql: 'Copy the table first: CREATE TABLE my_table_backup AS SELECT * FROM my_table; (or export it with phpMyAdmin / mysqldump).',
  sqlserver: 'Copy the table first: SELECT * INTO my_table_backup FROM my_table; (or take a full backup in SSMS).',
  sqlite: 'Copy the database file somewhere safe before running, or: CREATE TABLE my_table_backup AS SELECT * FROM my_table;',
  bigquery: 'Copy the table first in the BigQuery console (Copy table), or: CREATE TABLE my_dataset.my_table_backup AS SELECT * FROM my_dataset.my_table;',
};

type Result = { sql: string; whatItDoes: string; previewSql: string; placeholders: Array<{ name: string; meaning: string }> };

const SqlGenerator: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const [dialect, setDialect] = useState(readDialect);
  const [mode, setMode] = useState('read');
  const [request, setRequest] = useState('');
  const [resultMode, setResultMode] = useState('read');
  const [explained, setExplained] = useState(''); // the pasted SQL, in Explain mode
  const [resultLayout, setResultLayout] = useState<{ name: string; layout: string } | null>(null); // layout used for this result
  const [previewCopied, setPreviewCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [layouts, setLayouts] = useState<SavedLayout[]>(readLayouts);
  const [activeLayout, setActiveLayout] = useState<string>(''); // saved layout name, '' = none
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftLayout, setDraftLayout] = useState('');
  const [layoutMsg, setLayoutMsg] = useState<string | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);
  const { registerActions } = useProtocol();

  const current = layouts.find(l => l.name === activeLayout) || null;

  const pickLayout = (name: string) => {
    setActiveLayout(name);
    const l = layouts.find(x => x.name === name);
    if (l) setDialect(l.dialect); // the database type is saved with the client
    setEditing(false);
  };

  const startEdit = (existing: SavedLayout | null) => {
    setDraftName(existing?.name || '');
    setDraftLayout(existing?.layout || '');
    setLayoutMsg(null);
    setEditing(true);
  };

  const saveLayout = () => {
    const name = draftName.trim();
    const layout = draftLayout.trim();
    if (!name || !layout) { setLayoutMsg('Give the layout a name and paste the table list first.'); return; }
    const entry: SavedLayout = { name, dialect, layout: layout.slice(0, MAX_LAYOUT_CHARS), savedAt: new Date().toISOString() };
    const next = [...layouts.filter(l => l.name !== name), entry].sort((a, b) => a.name.localeCompare(b.name));
    if (!writeLayouts(next)) { setLayoutMsg('This browser would not save it (storage is blocked). It will still be used for this session.'); }
    setLayouts(next);
    setActiveLayout(name);
    setEditing(false);
  };

  const deleteLayout = (name: string) => {
    const next = layouts.filter(l => l.name !== name);
    writeLayouts(next);
    setLayouts(next);
    if (activeLayout === name) setActiveLayout('');
  };

  const copyLayoutScript = async () => {
    await navigator.clipboard.writeText(LAYOUT_SCRIPTS[dialect].sql);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
  };

  useEffect(() => {
    try { localStorage.setItem(DIALECT_KEY, dialect); } catch { /* storage unavailable */ }
  }, [dialect]);

  useEffect(() => {
    registerActions({
      dryRun: async () => { if (!request.trim()) throw new Error('NO_REQUEST: Describe what the script should do first.'); },
      commit: async () => { if (!result) throw new Error('NO_RESULT: Generate a script first.'); onAction(); },
    });
  }, [request, result, onAction, registerActions]);

  const handleGenerate = async () => {
    if (!request.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      setResult(await generateSql(request.trim(), dialect, current?.layout, mode));
      setResultMode(mode);
      setExplained(mode === 'explain' ? request.trim() : '');
      setResultLayout(current ? { name: current.name, layout: current.layout } : null);
      onAction();
    } catch (err: any) {
      setError(err?.message || 'The script could not be generated. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPreview = async () => {
    if (!result?.previewSql) return;
    await navigator.clipboard.writeText(result.previewSql);
    setPreviewCopied(true);
    setTimeout(() => setPreviewCopied(false), 2000);
  };

  // Label comes from fixed rules on the actual script (or the pasted one in Explain mode).
  const checkedSql = resultMode === 'explain' ? explained : result?.sql || '';
  const safety = result && checkedSql.trim() ? checkSqlSafety(checkedSql) : null;
  const modeInfo = MODES.find(m => m.id === mode)!;
  // Names check against the saved layout (main script + preview), fixed rules, no AI.
  const layoutCheck = result && resultLayout && checkedSql.trim()
    ? checkSqlAgainstLayout(`${checkedSql};\n${result.previewSql || ''}`, resultLayout.layout)
    : null;
  const layoutProblems = layoutCheck ? [...layoutCheck.missingTables.map(t => `table ${t}`), ...layoutCheck.missingColumns.map(c => `column ${c}`)] : [];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Database size={16} className="text-[#0070FF]" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 font-sans">Plain English to SQL</span>
        </div>
        <h2 className="text-4xl font-semibold tracking-tight leading-none mb-4 text-zinc-900">
          SQL <span className="text-[#0070FF]">Generator</span>
        </h2>
        <p className="text-zinc-650 text-xl max-w-3xl font-sans leading-relaxed">
          Describe what you need from your database and get a ready SQL script with a plain-English explanation. Onyx never runs anything — you copy the script and run it yourself.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="glass p-6 rounded-2xl border border-black/5 shadow-2xl space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans px-1 block">Database</label>
            <select
              value={dialect}
              onChange={e => {
                setDialect(e.target.value);
                // A saved layout belongs to one database type; switching type means it no longer applies.
                if (current && current.dialect !== e.target.value) setActiveLayout('');
              }}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:border-[#0070FF]/50"
            >
              {DIALECTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>

          {/* Client table layout (optional) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans px-1 block">Your tables (optional)</label>
            <div className="flex gap-2">
              <select
                value={activeLayout}
                onChange={e => pickLayout(e.target.value)}
                className="flex-1 min-w-0 bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:border-[#0070FF]/50"
              >
                <option value="">None — use stand-in names</option>
                {layouts.map(l => (
                  <option key={l.name} value={l.name}>{l.name} ({DIALECTS.find(d => d.id === l.dialect)?.label})</option>
                ))}
              </select>
              <button
                onClick={() => startEdit(null)}
                className="shrink-0 px-3 py-2 border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:border-[#0070FF]/50 hover:text-[#0070FF]"
              >
                + Add
              </button>
            </div>
            {current && !editing && (
              <p className="text-[11px] text-zinc-500 px-1">
                Using the real table and column names from <span className="font-semibold">{current.name}</span>.{' '}
                <button onClick={() => startEdit(current)} className="underline hover:text-zinc-800">Update</button>{' · '}
                <button onClick={() => deleteLayout(current.name)} className="underline hover:text-red-600">Delete</button>
              </p>
            )}
          </div>

          {editing && (
            <div className="p-4 rounded-xl border border-[#0070FF]/20 bg-[#0070FF]/5 space-y-3">
              <p className="text-xs font-bold text-zinc-800">Save a client's table layout (once per database)</p>
              <div className="space-y-1.5">
                <p className="text-[11px] text-zinc-600 leading-relaxed"><span className="font-bold">1.</span> {LAYOUT_SCRIPTS[dialect].where}</p>
                <div className="relative">
                  <pre className="p-3 pr-16 bg-white border border-black/10 rounded-lg text-[10px] font-mono text-zinc-700 whitespace-pre-wrap break-words">{LAYOUT_SCRIPTS[dialect].sql}</pre>
                  <button onClick={copyLayoutScript} className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-600 hover:text-[#0070FF]">
                    {scriptCopied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">This script only reads the list of tables and columns. It does not read or change any of your data.</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-zinc-600"><span className="font-bold">2.</span> Paste the results here:</p>
                <textarea
                  className="w-full h-28 bg-white border border-black/10 rounded-lg p-3 text-[11px] font-mono text-black focus:outline-none focus:border-[#0070FF]/50 resize-y"
                  placeholder={'contacts    id uuid, first_name text, phone text, created_at timestamp\ncalls       id uuid, contact_id uuid, duration integer'}
                  value={draftLayout}
                  onChange={e => setDraftLayout(e.target.value)}
                />
                {draftLayout.length > MAX_LAYOUT_CHARS && (
                  <p className="text-[10px] text-amber-700">This layout is very large; only the first {MAX_LAYOUT_CHARS.toLocaleString()} characters will be used.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-zinc-600"><span className="font-bold">3.</span> Name it (e.g. the client), then save. The database type above is saved with it.</p>
                <input
                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-[#0070FF]/50"
                  placeholder="e.g. UCM Supabase"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                />
              </div>
              {layoutMsg && <p className="text-[11px] text-red-700">{layoutMsg}</p>}
              <div className="flex gap-2">
                <button onClick={saveLayout} className="px-4 py-2 bg-[#0070FF] text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#005fd9]">Save layout</button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 border border-zinc-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-zinc-600">Cancel</button>
              </div>
              <p className="text-[10px] text-zinc-500">Saved in this browser only. If you use Onyx on another computer, save it there too.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans px-1 block">What kind of script?</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-all ${mode === m.id ? 'border-[#0070FF] bg-[#0070FF]/5' : 'border-black/10 bg-white hover:border-[#0070FF]/40'}`}
                >
                  <span className={`block text-xs font-bold ${mode === m.id ? 'text-[#0070FF]' : 'text-zinc-800'}`}>{m.label}</span>
                  <span className="block text-[10px] text-zinc-500">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans px-1 block">{mode === 'explain' ? 'SQL to explain' : 'What do you need?'}</label>
            <textarea
              className="w-full h-36 bg-white border border-black/10 rounded-xl p-5 text-black text-sm focus:outline-none focus:border-[#0070FF]/50 transition-all placeholder:text-zinc-400 resize-none font-mono leading-relaxed"
              placeholder={modeInfo.placeholder}
              value={request}
              onChange={e => setRequest(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleGenerate(); } }}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!request.trim() || loading}
            className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] shadow-lg disabled:opacity-40 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer font-display"
          >
            {loading
              ? <><Loader2 className="animate-spin" size={16} /> {mode === 'explain' ? 'Reading script...' : 'Writing script...'}</>
              : <><Wand2 size={16} /> {mode === 'explain' ? 'Explain SQL' : 'Generate SQL'}</>}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-[11px] font-semibold flex items-start gap-2">
              <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div>
          {result ? (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              {safety && (
                <div className={`p-4 rounded-2xl border space-y-1.5 ${SAFETY_STYLE[safety.level].box}`}>
                  <h4 className={`text-sm font-bold ${SAFETY_STYLE[safety.level].title}`}>
                    {resultMode === 'explain' ? 'Your script: ' : ''}{SAFETY_STYLE[safety.level].label}
                  </h4>
                  <ul className="text-xs space-y-0.5 list-disc pl-4">
                    {safety.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {layoutCheck && (
                layoutProblems.length === 0 ? (
                  <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900">
                    ✓ Every table and column name matches <span className="font-semibold">{resultLayout!.name}</span>.
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 space-y-1.5">
                    <h4 className="text-xs font-bold text-amber-800">
                      {layoutProblems.length} name{layoutProblems.length === 1 ? '' : 's'} not found in {resultLayout!.name} — check before running
                    </h4>
                    <ul className="text-xs text-amber-900 space-y-0.5">
                      {layoutProblems.map(p => <li key={p}><code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">{p}</code></li>)}
                    </ul>
                    <p className="text-[10px] text-amber-800/80">A name that isn't in your saved layout will make the script fail. If you added it to the database recently, update the saved layout. Some names made up inside the script itself can show here by mistake.</p>
                  </div>
                )
              )}

              {safety?.level === 'red' && (
                <div className="p-4 rounded-2xl border border-red-300 bg-white space-y-1">
                  <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5"><HardDriveDownload size={13} /> Take a backup before you run this</h4>
                  <p className="text-xs text-zinc-700 leading-relaxed">What this deletes cannot be undone. {BACKUP_TIPS[dialect]}</p>
                </div>
              )}

              {result.previewSql && safety && safety.level !== 'green' && resultMode !== 'explain' && (
                <div className="glass rounded-2xl border border-amber-200 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100 bg-amber-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5"><Eye size={12} /> Step 1 — Run this preview first (read only)</span>
                    <button onClick={copyPreview} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:text-[#0070FF]">
                      {previewCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <pre className="p-5 text-xs font-mono text-zinc-800 whitespace-pre-wrap break-words leading-relaxed max-h-[300px] overflow-y-auto">{result.previewSql}</pre>
                  <p className="px-5 pb-4 text-[11px] text-zinc-600">It shows what the change below would touch, without changing anything. If the rows or count look wrong, don't run step 2.</p>
                </div>
              )}

              {result.sql && (
              <div className="glass rounded-2xl border border-black/5 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-zinc-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {result.previewSql && safety && safety.level !== 'green' ? 'Step 2 — The change · ' : 'SQL · '}{DIALECTS.find(d => d.id === dialect)?.label}
                  </span>
                  <button onClick={copy} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:text-[#0070FF]">
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <pre className="p-5 text-xs font-mono text-zinc-800 whitespace-pre-wrap break-words leading-relaxed max-h-[480px] overflow-y-auto">{result.sql}</pre>
              </div>
              )}

              <div className="glass p-5 rounded-2xl border border-black/5 shadow-xl space-y-1">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{resultMode === 'explain' ? 'What this script does' : 'What it does'}</h4>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{result.whatItDoes}</p>
              </div>

              {result.placeholders?.length > 0 && (
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 space-y-2">
                  <h4 className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                    <Replace size={13} /> Replace these with your real table and column names before running
                  </h4>
                  <ul className="space-y-1">
                    {result.placeholders.map((p, i) => (
                      <li key={i} className="text-xs text-amber-900/90">
                        <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-200">{p.name}</code> — {p.meaning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-black/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 p-12 text-center glass min-h-[400px]">
              <Database size={40} className="opacity-10 text-[#0070FF] mb-6" />
              <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2 text-black">No script yet</p>
              <p className="text-xs text-zinc-550 max-w-xs leading-relaxed font-sans font-medium">
                Describe what you need on the left and Onyx will write the SQL.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SqlGenerator;
