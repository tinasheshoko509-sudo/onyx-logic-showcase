/**
 * Efficiency Auditor scoring. The model only classifies each finding
 * (good/bad, major/minor); the score itself is calculated here from a fixed
 * rule so it is repeatable and every lost point traces to a named problem.
 * Previously the model invented a 0-100 number with no rubric.
 */

export type FindingType = 'good' | 'bad';
export type FindingSeverity = 'major' | 'minor';

export interface AuditFinding {
  type: FindingType;
  severity?: FindingSeverity; // bad findings only
  text: string;
}

export const MAJOR_PENALTY = 15;
export const MINOR_PENALTY = 5;

/** Accepts the new object shape or the old plain-string shape (treated as minor problems). */
export const normalizeFindings = (raw: any): AuditFinding[] =>
  (Array.isArray(raw) ? raw : []).map((f: any): AuditFinding => {
    if (typeof f === 'string') return { type: 'bad', severity: 'minor', text: f };
    const type: FindingType = String(f?.type).toLowerCase() === 'good' ? 'good' : 'bad';
    const severity: FindingSeverity = String(f?.severity).toLowerCase() === 'major' ? 'major' : 'minor';
    return type === 'good' ? { type, text: String(f?.text ?? '') } : { type, severity, text: String(f?.text ?? '') };
  }).filter(f => f.text);

export const computeAuditScore = (findings: AuditFinding[]) => {
  const major = findings.filter(f => f.type === 'bad' && f.severity === 'major').length;
  const minor = findings.filter(f => f.type === 'bad' && f.severity !== 'major').length;
  const score = Math.max(0, 100 - major * MAJOR_PENALTY - minor * MINOR_PENALTY);
  const parts = ['100'];
  if (major) parts.push(`${major * MAJOR_PENALTY} (${major} major problem${major > 1 ? 's' : ''} × ${MAJOR_PENALTY})`);
  if (minor) parts.push(`${minor * MINOR_PENALTY} (${minor} minor problem${minor > 1 ? 's' : ''} × ${MINOR_PENALTY})`);
  const breakdown = major || minor ? `${parts.join(' − ')} = ${score}` : 'No problems found = 100';
  return { score, major, minor, breakdown };
};
