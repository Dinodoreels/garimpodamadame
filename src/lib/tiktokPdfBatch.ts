import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export const TIKTOK_PDF_MAX_SIZE = 20 * 1024 * 1024;

export interface ParsedPdfPage {
  pageNumber: number;
  text: string;
  numericCodes: string[];
}

export interface ParsedTikTokPdf {
  file: File;
  bytes: Uint8Array;
  pages: ParsedPdfPage[];
}

export async function validatePdf(file: File) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Selecione um arquivo PDF oficial.');
  }
  if (file.size <= 0 || file.size > TIKTOK_PDF_MAX_SIZE) {
    throw new Error('Cada PDF deve ter no máximo 20 MB.');
  }
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== '%PDF-') throw new Error('O arquivo selecionado não é um PDF válido.');
}

export async function parseTikTokPdf(file: File): Promise<ParsedTikTokPdf> {
  await validatePdf(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const document = await task.promise;
  const pages: ParsedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const numericCodes = Array.from(new Set(text.match(/(?<!\d)\d{8,20}(?!\d)/g) ?? []));
    pages.push({ pageNumber, text, numericCodes });
  }
  await task.destroy();
  return { file, bytes, pages };
}

export async function extractSinglePdfPage(bytes: Uint8Array, pageIndex: number) {
  const source = await PDFDocument.load(bytes);
  const output = await PDFDocument.create();
  const [page] = await output.copyPages(source, [pageIndex]);
  if (!page) throw new Error('Não foi possível separar a página do PDF.');
  output.addPage(page);
  const saved = await output.save();
  const buffer = saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}