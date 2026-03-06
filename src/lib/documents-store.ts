import fs from 'fs';
import path from 'path';

export interface DocumentMeta {
  id: string;
  personId: string;
  filename: string;     // stored name: {uuid}.{ext}
  originalName: string; // original upload name
  title?: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const META_FILE = path.join(process.cwd(), 'data', 'documents.json');
const DOCS_DIR  = path.join(process.cwd(), 'public', 'documents');

function readAll(): Record<string, DocumentMeta[]> {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, DocumentMeta[]>): void {
  fs.mkdirSync(path.dirname(META_FILE), { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(all, null, 2), 'utf-8');
}

export function getDocumentsForPerson(personId: string): DocumentMeta[] {
  return readAll()[personId] ?? [];
}

export function saveDocumentMeta(doc: DocumentMeta): void {
  const all = readAll();
  if (!all[doc.personId]) all[doc.personId] = [];
  all[doc.personId].push(doc);
  writeAll(all);
}

export function deleteDocumentMeta(personId: string, docId: string): DocumentMeta | null {
  const all = readAll();
  const docs = all[personId] ?? [];
  const doc = docs.find(d => d.id === docId);
  if (!doc) return null;
  all[personId] = docs.filter(d => d.id !== docId);
  writeAll(all);
  return doc;
}

export function getDocumentFilePath(personId: string, filename: string): string {
  return path.join(DOCS_DIR, personId, filename);
}

export function ensurePersonDocsDir(personId: string): void {
  fs.mkdirSync(path.join(DOCS_DIR, personId), { recursive: true });
}
