// Checks a generated SQL script against the client's saved table layout and lists any table
// or column name that does not appear in it. Fixed rules, no AI. It is a helper, not a full
// SQL parser: it may occasionally miss something or flag a name that is really fine
// (e.g. a name made up inside the query), so results are shown as "please check", not errors.

export type LayoutCheck = {
  tablesChecked: number;
  missingTables: string[];
  missingColumns: string[];
};

// Parse the pasted layout: one line per table, "table_name <tab> col type, col type, ...".
export function parseLayout(layout: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  for (const raw of (layout || '').split(/\r?\n/)) {
    const line = raw.trim().replace(/^\|/, '').replace(/\|$/, '');
    if (!line) continue;
    const m = line.match(/^([^\s|,]+)[\s|]+(.+)$/);
    if (!m) continue;
    const table = m[1].replace(/["`[\]]/g, '').toLowerCase();
    if (table === 'table_name' || /^-+$/.test(table)) continue; // header / divider rows
    const cols = new Set<string>();
    for (const part of m[2].split(',')) {
      const col = part.trim().split(/\s+/)[0]?.replace(/["`[\]]/g, '').toLowerCase();
      if (col) cols.add(col);
    }
    tables.set(table, cols);
    // SQL Server layouts use schema.table; also accept the bare table name.
    const dot = table.lastIndexOf('.');
    if (dot > 0 && !tables.has(table.slice(dot + 1))) tables.set(table.slice(dot + 1), cols);
  }
  return tables;
}

const KEYWORDS = new Set(`
select from where and or not in is null as on join left right inner outer full cross natural using
group by order having limit offset fetch first next rows row only top distinct all any some exists
case when then else end union intersect except with recursive insert into values update set delete
create table if alter add column drop truncate primary key foreign references unique check default
constraint index view cascade restrict returning conflict do nothing duplicate merge matched begin
commit rollback transaction asc desc nulls last between like ilike similar escape true false unknown
interval day days hour hours minute minutes second seconds month months year years week weeks
current_date current_time current_timestamp now localtime localtimestamp over partition window
filter within lateral grant revoke to public cast collate at zone without time timestamp timestamptz
date text varchar char character varying integer int bigint smallint serial bigserial boolean bool
uuid numeric decimal real double precision float json jsonb bytea money array identity generated
always stored auto_increment nvarchar datetime datetime2 bit string int64 float64 bool struct
tinyint mediumint longtext blob clob enum signed unsigned zerofill temporary temp replace
extract epoch dow doy isodow quarter preceding following unbounded current range groups ties
`.split(/\s+/).filter(Boolean));

// Replace comments and string literals, and unwrap quoted identifiers.
const clean = (sql: string) =>
  sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, " '' ")
    .replace(/"((?:[^"]|"")*)"/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]/g, '$1')
    .toLowerCase();

export function checkSqlAgainstLayout(sql: string, layout: string): LayoutCheck | null {
  const tables = parseLayout(layout);
  if (!tables.size || !sql.trim()) return null;
  const s = clean(sql);

  const allColumns = new Set<string>();
  tables.forEach(cols => cols.forEach(c => allColumns.add(c)));

  // Names the script defines itself: new tables/columns, CTEs, aliases.
  const defined = new Set<string>();
  const addAll = (re: RegExp, group = 1) => { for (const m of s.matchAll(re)) if (m[group]) defined.add(m[group]); };
  addAll(/\bcreate\s+(?:temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/g);
  addAll(/\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(\w+)/g);
  addAll(/\brename\s+(?:column\s+\w+\s+)?to\s+(\w+)/g);
  addAll(/\bas\s+(\w+)/g);                       // output and table aliases
  addAll(/(?:\bwith|,)\s*(?:recursive\s+)?(\w+)\s*(?:\([^)]*\))?\s+as\s*\(/g); // CTE names
  // Column definitions inside CREATE TABLE (...).
  for (const m of s.matchAll(/\bcreate\s+(?:temp(?:orary)?\s+)?table\b[^(]*\(([\s\S]*?)\)\s*(?:;|$)/g)) {
    for (const def of m[1].split(',')) { const w = def.trim().split(/\s+/)[0]; if (w) defined.add(w); }
  }

  // Tables used after FROM / JOIN / UPDATE / INTO / TABLE, with their aliases.
  const aliases = new Map<string, string>(); // alias -> table
  const usedTables = new Set<string>();
  for (const m of s.matchAll(/\b(?:from|join|update|into|table|exists)\s+(?:only\s+)?([a-z_][\w.]*)(?:\s+(?:as\s+)?([a-z_]\w*))?/g)) {
    const t = m[1];
    if (KEYWORDS.has(t)) continue;
    usedTables.add(t);
    if (m[2] && !KEYWORDS.has(m[2])) aliases.set(m[2], t);
    aliases.set(t.split('.').pop()!, t);
  }
  // FROM a, b style lists.
  for (const m of s.matchAll(/\bfrom\s+([a-z_][\w.]*(?:\s+\w+)?(?:\s*,\s*[a-z_][\w.]*(?:\s+\w+)?)+)/g)) {
    for (const part of m[1].split(',')) {
      const [t, a] = part.trim().split(/\s+/);
      if (t && !KEYWORDS.has(t)) { usedTables.add(t); if (a && !KEYWORDS.has(a)) aliases.set(a, t); }
    }
  }

  const knownTable = (t: string) => tables.has(t) || tables.has(t.split('.').pop()!) || defined.has(t) || defined.has(t.split('.').pop()!);
  const missingTables = [...usedTables].filter(t => !knownTable(t));

  const missingColumns = new Set<string>();
  const colsOf = (t: string) => tables.get(t) || tables.get(t.split('.').pop()!);

  // Qualified refs: alias.column / table.column.
  for (const m of s.matchAll(/\b([a-z_]\w*)\.([a-z_]\w*)\b(?!\s*\()/g)) {
    const [, q, col] = m;
    const t = aliases.get(q) || (tables.has(q) ? q : null);
    if (!t) continue; // schema prefix or something we can't resolve
    const cols = colsOf(t);
    if (cols && !cols.has(col) && !defined.has(col)) missingColumns.add(`${q}.${col}`);
  }

  // Bare words: flag only if not a keyword, function, table, alias, defined name or any known column.
  const bare = s.replace(/\b[a-z_]\w*\.[a-z_][\w.]*/g, ' ');
  for (const m of bare.matchAll(/\b([a-z_]\w*)\b(?!\s*\()/g)) {
    const w = m[1];
    if (KEYWORDS.has(w) || allColumns.has(w) || defined.has(w) || aliases.has(w) || tables.has(w) || usedTables.has(w)) continue;
    if (/^\d/.test(w)) continue;
    missingColumns.add(w);
  }
  missingTables.forEach(t => missingColumns.delete(t));

  return { tablesChecked: tables.size, missingTables, missingColumns: [...missingColumns] };
}
