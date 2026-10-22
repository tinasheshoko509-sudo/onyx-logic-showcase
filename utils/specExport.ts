import { jsPDF } from 'jspdf';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType,
} from 'docx';

/**
 * Converts a generated Markdown spec into the other export formats (plain text,
 * PDF, Word) so each one is a properly formatted document rather than the raw
 * Markdown source with its # and ** symbols left in.
 *
 * Markdown is parsed into simple blocks first; each format then renders those
 * blocks its own way. Only the Markdown features the spec generator actually
 * emits are handled: headings, bullets, numbered items, tables, code blocks,
 * horizontal rules, and bold/italic/code/link inline marks. Tables render as
 * real bordered grids (first row = header) in PDF and Word.
 */

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'bullet'; level: number; text: string }
  | { kind: 'numbered'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'rule' }
  | { kind: 'blank' }
  | { kind: 'para'; text: string };

const splitRow = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

const parseBlocks = (md: string): Block[] => {
  const blocks: Block[] = [];
  let inCode = false;
  let table: string[][] | null = null;
  const flushTable = () => {
    if (table && table.length) {
      // Pad ragged rows so every row has the header's column count.
      const cols = Math.max(...table.map(r => r.length));
      blocks.push({ kind: 'table', rows: table.map(r => [...r, ...Array(cols - r.length).fill('')]) });
    }
    table = null;
  };

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*```/.test(line)) { flushTable(); inCode = !inCode; continue; }
    if (inCode) { blocks.push({ kind: 'code', text: raw }); continue; }

    if (/^\s*\|/.test(line)) {
      if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line)) continue; // |---|---| separator row
      (table ??= []).push(splitRow(line));
      continue;
    }
    flushTable();

    if (!line.trim()) { blocks.push({ kind: 'blank' }); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      blocks.push({ kind: 'heading', level: m[1].length, text: m[2] });
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ kind: 'rule' });
    } else if ((m = line.match(/^(\s*)[-*+]\s+(.*)$/))) {
      blocks.push({ kind: 'bullet', level: Math.min(Math.floor(m[1].length / 2), 3), text: m[2] });
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      blocks.push({ kind: 'numbered', text: line.trim() });
    } else {
      blocks.push({ kind: 'para', text: line.trim() });
    }
  }
  flushTable();
  return blocks;
};

/** Removes inline Markdown marks, keeping the words (links keep their URL). */
const stripInline = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/<br\s*\/?>/gi, ' ');

// ---------------------------------------------------------------- plain text

const tableToText = (rows: string[][]): string => {
  const clean = rows.map(r => r.map(stripInline));
  const widths = clean[0].map((_, c) => Math.max(...clean.map(r => r[c].length)));
  // Aligned columns when it fits a normal text width; otherwise one field per line.
  if (widths.reduce((a, b) => a + b, 0) + widths.length * 3 <= 110) {
    const fmt = (r: string[]) => r.map((cell, c) => cell.padEnd(widths[c])).join('   ').trimEnd();
    return [fmt(clean[0]), widths.map(w => '-'.repeat(w)).join('   '), ...clean.slice(1).map(fmt)].join('\n');
  }
  const [header, ...body] = clean;
  return body.map(r => r.map((cell, c) => `${header[c]}: ${cell}`).join('\n')).join('\n\n');
};

export const markdownToPlainText = (md: string): string => {
  const out: string[] = [];
  for (const b of parseBlocks(md)) {
    switch (b.kind) {
      case 'heading': {
        const text = stripInline(b.text);
        out.push(b.level <= 2 ? `${text.toUpperCase()}\n${'='.repeat(Math.min(text.length, 80))}` : text);
        break;
      }
      case 'bullet':   out.push(`${'  '.repeat(b.level)}- ${stripInline(b.text)}`); break;
      case 'numbered': out.push(stripInline(b.text)); break;
      case 'code':     out.push(`    ${b.text}`); break;
      case 'table':    out.push('', tableToText(b.rows), ''); break;
      case 'rule':     out.push('-'.repeat(60)); break;
      case 'blank':    out.push(''); break;
      case 'para':     out.push(stripInline(b.text)); break;
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
};

// ---------------------------------------------------------------- PDF

/**
 * jsPDF's built-in fonts only cover the Windows-1252 character set; anything
 * outside it (arrows, check marks, emoji) prints as garbage. Swap the common
 * ones for ASCII and drop the rest.
 */
const pdfSafe = (s: string) =>
  s
    .replace(/[→⇒➜]/g, '->')
    .replace(/[←⇐]/g, '<-')
    .replace(/[✅✔✓☑]/g, '[x]')
    .replace(/[❌✗✘☐]/g, '[ ]')
    .replace(/[⚠]/g, '!')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[^\x00-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, '');

export const buildPdfBlob = (md: string): Blob => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const width = 210 - margin * 2;
  const bottom = 297 - margin;
  let y = margin;
  const lineHeight = (size: number) => size * 0.3528 * 1.4;

  const write = (text: string, size: number, style: 'normal' | 'bold', font = 'helvetica', indent = 0, prefix = '') => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    const lineH = lineHeight(size);
    const lines = doc.splitTextToSize(pdfSafe(text), width - indent - (prefix ? 5 : 0));
    lines.forEach((ln: string, i: number) => {
      if (y + lineH > bottom) { doc.addPage(); y = margin; }
      if (prefix && i === 0) doc.text(prefix, margin + indent, y);
      doc.text(ln, margin + indent + (prefix ? 5 : 0), y);
      y += lineH;
    });
  };

  const drawTable = (rows: string[][]) => {
    const size = 8.5;
    const pad = 1.8;
    const lineH = lineHeight(size);
    const cells = rows.map(r => r.map(c => pdfSafe(stripInline(c))));
    const cols = cells[0].length;

    // Column widths follow content length, clamped so no column dominates or vanishes.
    const weights = Array.from({ length: cols }, (_, c) =>
      Math.min(Math.max(...cells.map(r => r[c].length), 4), 60));
    const total = weights.reduce((a, b) => a + b, 0);
    const colW = weights.map(w => (w / total) * width);

    const drawRow = (row: string[], header: boolean) => {
      doc.setFont('helvetica', header ? 'bold' : 'normal');
      doc.setFontSize(size);
      const wrapped = row.map((cell, c) => doc.splitTextToSize(cell || ' ', colW[c] - pad * 2) as string[]);
      const h = Math.max(...wrapped.map(w => w.length)) * lineH + pad * 2;
      if (y + h > bottom) {
        doc.addPage();
        y = margin;
        if (!header) drawRow(cells[0], true); // repeat the header on the new page
        doc.setFont('helvetica', header ? 'bold' : 'normal');
      }
      let x = margin;
      wrapped.forEach((lines, c) => {
        if (header) { doc.setFillColor(238, 240, 243); doc.rect(x, y, colW[c], h, 'F'); }
        doc.setDrawColor(190);
        doc.rect(x, y, colW[c], h);
        lines.forEach((ln, i) => doc.text(ln, x + pad, y + pad + lineH * (i + 0.75)));
        x += colW[c];
      });
      y += h;
    };

    y += 1.5;
    cells.forEach((row, i) => drawRow(row, i === 0));
    y += 4;
  };

  for (const b of parseBlocks(md)) {
    switch (b.kind) {
      case 'heading': {
        const size = [18, 15, 13, 11.5, 11, 11][b.level - 1];
        y += b.level <= 2 ? 4 : 2;
        write(stripInline(b.text), size, 'bold');
        y += 1.5;
        break;
      }
      case 'bullet':   write(stripInline(b.text), 10.5, 'normal', 'helvetica', b.level * 5, '•'); break;
      case 'numbered': write(stripInline(b.text), 10.5, 'normal'); break;
      case 'code':     write(b.text || ' ', 9, 'normal', 'courier', 4); break;
      case 'table':    drawTable(b.rows); break;
      case 'rule':
        y += 2;
        doc.setDrawColor(200);
        doc.line(margin, y, margin + width, y);
        y += 4;
        break;
      case 'blank':    y += 2.5; break;
      case 'para':     write(stripInline(b.text), 10.5, 'normal'); break;
    }
  }
  return doc.output('blob');
};

// ---------------------------------------------------------------- Word

/** Splits text on **bold** marks into Word runs; other inline marks are stripped. */
const runs = (text: string, font?: string, size?: number, forceBold = false): TextRun[] =>
  text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map(part => {
      const bold = forceBold || /^\*\*[^*]+\*\*$/.test(part);
      const body = /^\*\*[^*]+\*\*$/.test(part) ? part.slice(2, -2) : part;
      return new TextRun({ text: stripInline(body), bold, font, size });
    });

const HEADINGS = [
  HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
];

const buildDocxTable = (rows: string[][]): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, i) =>
      new TableRow({
        tableHeader: i === 0,
        children: row.map(cell =>
          new TableCell({
            children: [new Paragraph({ children: runs(cell, undefined, 18, i === 0) })],
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            ...(i === 0 && { shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF0F3' } }),
          })
        ),
      })
    ),
  });

export const buildDocxBlob = async (md: string): Promise<Blob> => {
  const children: (Paragraph | Table)[] = [];
  for (const b of parseBlocks(md)) {
    switch (b.kind) {
      case 'heading':  children.push(new Paragraph({ heading: HEADINGS[b.level - 1], children: runs(b.text) })); break;
      case 'bullet':   children.push(new Paragraph({ bullet: { level: b.level }, children: runs(b.text) })); break;
      case 'numbered': children.push(new Paragraph({ children: runs(b.text) })); break;
      case 'code':     children.push(new Paragraph({ children: [new TextRun({ text: b.text, font: 'Courier New', size: 18 })] })); break;
      case 'table':
        children.push(buildDocxTable(b.rows));
        children.push(new Paragraph({ children: [] })); // breathing room after the grid
        break;
      case 'rule':     children.push(new Paragraph({ border: { bottom: { style: 'single', size: 6, color: 'CCCCCC', space: 1 } }, children: [] })); break;
      case 'blank':    break; // Word paragraphs already carry spacing
      case 'para':     children.push(new Paragraph({ children: runs(b.text), spacing: { after: 120 } })); break;
    }
  }
  return Packer.toBlob(new Document({ sections: [{ properties: {}, children }] }));
};
