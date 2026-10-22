const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120';

/** Loads pdf.js from the CDN on first use (same build QA Lab uses). */
const loadPdfJs = (): Promise<any> => {
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PDFJS_BASE}/pdf.min.js`;
    script.onload = () => {
      if (!w.pdfjsLib) return reject(new Error('PDF parser failed to load.'));
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
      resolve(w.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load the PDF parser.'));
    document.head.appendChild(script);
  });
};

/**
 * Extracts text from a PDF page by page, ordering text top-to-bottom then
 * left-to-right and starting a new line whenever the vertical position jumps,
 * so tables and columns come out in reading order.
 */
const readPdfAsText = async (file: File): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const items = [...(await page.getTextContent()).items];
    items.sort((a: any, b: any) => {
      if (!a.transform || !b.transform) return 0;
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.transform[4] - b.transform[4];
    });
    let pageText = '';
    let lastY: number | null = null;
    for (const item of items as any[]) {
      if (lastY !== null && item.transform && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      }
      pageText += item.str + ' ';
      if (item.transform) lastY = item.transform[5];
    }
    fullText += pageText.trim() + '\n\n';
  }
  const text = fullText.trim();
  if (!text) {
    // Scanned PDFs are images with no text layer — say so rather than send nothing.
    throw new Error('That PDF has no readable text in it (it may be a scanned image). Paste the text instead.');
  }
  return text;
};

/**
 * Reads an uploaded document to plain text.
 *
 * .docx is a zip archive and .pdf is a binary format, so reading either as text
 * yields noise the model then analyses as if it were real — each needs a parser.
 * Everything else is read directly. Both parsers load lazily, only when a file of
 * that type is actually uploaded.
 */
export const readDocumentAsText = async (file: File): Promise<string> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return readPdfAsText(file);
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    if (!value.trim()) {
      throw new Error('That Word file has no readable text in it.');
    }
    return value;
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsText(file);
  });
};

/** File-picker filter for the tools that take a document. */
export const DOCUMENT_ACCEPT = '.txt,.md,.json,.csv,.log,.docx,.pdf';
