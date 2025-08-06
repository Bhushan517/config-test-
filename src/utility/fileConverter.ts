import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function convertFileToHTML(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    const content = await fs.readFile(filePath, 'utf-8');
    return `<html><body><pre>${content}</pre></body></html>`;
  }

  if (mimeType === 'application/pdf') {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return `<html><body><pre>${data.text}</pre></body></html>`;
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    return `<html><body>${result.value}</body></html>`;
  }

  throw new Error('Unsupported file type');
}
