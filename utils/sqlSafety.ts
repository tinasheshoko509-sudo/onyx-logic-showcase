// Safety label for a SQL script, worked out by fixed rules (not by the AI), so the label
// can't be talked out of by a model mistake.
//   green  = only reads data
//   yellow = changes data or structure, but in a limited / reversible-by-hand way
//   red    = can destroy data (DROP, TRUNCATE, DELETE/UPDATE with no WHERE, dropping a column)

export type SqlSafetyLevel = 'green' | 'yellow' | 'red';
export type SqlSafety = { level: SqlSafetyLevel; reasons: string[] };

// Remove comments and quoted text so words inside them ("-- delete later", 'DROP') don't count.
const strip = (sql: string) =>
  sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .replace(/`[^`]*`/g, '``');

export function checkSqlSafety(sql: string): SqlSafety {
  const statements = strip(sql || '')
    .split(';')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const red: string[] = [];
  const yellow: string[] = [];
  const add = (list: string[], msg: string) => { if (!list.includes(msg)) list.push(msg); };

  for (const s of statements) {
    const u = s.toUpperCase();
    if (/\bDROP\s+(TABLE|DATABASE|SCHEMA|VIEW|INDEX|FUNCTION|TRIGGER)\b/.test(u)) add(red, 'Deletes a whole table or other database object (DROP).');
    if (/\bTRUNCATE\b/.test(u)) add(red, 'Empties a whole table (TRUNCATE).');
    if (/\bALTER\s+TABLE\b[\s\S]*\bDROP\b/.test(u)) add(red, 'Removes a column or rule from a table, and the data in it.');
    if (/\bDELETE\s+FROM\b/.test(u)) {
      if (/\bWHERE\b/.test(u)) add(yellow, 'Deletes the rows that match its filter (DELETE … WHERE).');
      else add(red, 'Deletes EVERY row in the table: DELETE with no WHERE filter.');
    }
    if (/^(WITH\b[\s\S]*\b)?UPDATE\b/.test(u) || /\bUPDATE\s+\S+\s+SET\b/.test(u)) {
      if (/\bWHERE\b/.test(u)) add(yellow, 'Changes the rows that match its filter (UPDATE … WHERE).');
      else add(red, 'Changes EVERY row in the table: UPDATE with no WHERE filter.');
    }
    if (/\bINSERT\s+INTO\b/.test(u)) add(yellow, 'Adds new rows (INSERT).');
    if (/\bMERGE\s+INTO\b|\bUPSERT\b|\bON\s+CONFLICT\b|\bON\s+DUPLICATE\s+KEY\b/.test(u)) add(yellow, 'Adds or overwrites rows (upsert / MERGE).');
    if (/\bCREATE\s+(OR\s+REPLACE\s+)?(TABLE|VIEW|INDEX|UNIQUE\s+INDEX|FUNCTION|TRIGGER|SCHEMA|TYPE)\b/.test(u)) {
      if (/\bOR\s+REPLACE\b/.test(u)) add(yellow, 'Creates something new, or replaces an existing one with the same name (CREATE OR REPLACE).');
      else add(yellow, 'Creates a new table or other database object (CREATE).');
    }
    if (/\bALTER\s+TABLE\b/.test(u) && !/\bDROP\b/.test(u)) add(yellow, 'Changes a table\'s structure (ALTER TABLE).');
    if (/\b(GRANT|REVOKE)\b/.test(u)) add(yellow, 'Changes who is allowed to see or change data (GRANT/REVOKE).');
    if (/\bSELECT\b[\s\S]*\bINTO\b/.test(u) && !/\bINSERT\b/.test(u) && /^SELECT\b/.test(u)) add(yellow, 'Copies results into a new table (SELECT … INTO).');
  }

  if (red.length) return { level: 'red', reasons: [...red, ...yellow] };
  if (yellow.length) return { level: 'yellow', reasons: yellow };
  return { level: 'green', reasons: ['Only reads data. Nothing in your database is changed.'] };
}
