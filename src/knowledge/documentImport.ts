export const MAX_DOCUMENT_IMPORT_BYTES = 20 * 1024 * 1024;

export enum DocumentKind {
  Pdf = 'pdf',
  Markdown = 'markdown',
}

export enum DocumentProfile {
  Article = 'article',
  QuestionBank = 'question-bank',
}

export interface DocumentImportStandardResult {
  characterCount: number;
  sectionCount: number;
  questionCount: number;
}

export interface DocumentImportCapabilities {
  ai: {
    configured: boolean;
    model: string;
  };
  maxBytes: number;
  extensions: string[];
}

export interface DocumentImportRequest {
  file: File;
  parentTreeNodeId: string;
  useAi: boolean;
}

export interface DocumentImportResult {
  ok: true;
  nodeId: string;
  treeNodeId: string;
  title: string;
  fileName: string;
  documentKind: DocumentKind;
  language: string;
  pageCount: number | null;
  nodeCount: number;
  sectionCount: number;
  questionCount: number;
  categories: string[];
  profile: DocumentProfile;
  standard: DocumentImportStandardResult;
  markdownPath: string;
}

interface DocumentImportErrorPayload {
  error?: string;
}

function fileExtension(fileName: string): string {
  const separator = fileName.lastIndexOf('.');
  return separator >= 0 ? fileName.slice(separator).toLocaleLowerCase() : '';
}

export function documentKindForFile(file: File): DocumentKind | null {
  const extension = fileExtension(file.name);
  if (extension === '.pdf') return DocumentKind.Pdf;
  if (extension === '.md' || extension === '.markdown') return DocumentKind.Markdown;
  return null;
}

export function validateDocumentFile(file: File): string | null {
  if (!documentKindForFile(file)) return '只支持 PDF、MD 或 Markdown 文档';
  if (file.size === 0) return '文档内容为空';
  if (file.size > MAX_DOCUMENT_IMPORT_BYTES) return '文档不能超过 20 MB';
  return null;
}

export async function getDocumentImportCapabilities(): Promise<DocumentImportCapabilities> {
  const response = await fetch('/api/import-document', { cache: 'no-store' });
  if (!response.ok) throw new Error(`无法读取文档导入能力（HTTP ${response.status}）`);
  return await response.json() as DocumentImportCapabilities;
}

export async function importDocumentFile(
  request: DocumentImportRequest,
): Promise<DocumentImportResult> {
  const validationError = validateDocumentFile(request.file);
  if (validationError) throw new Error(validationError);

  const query = new URLSearchParams({
    fileName: request.file.name,
    parentTreeNodeId: request.parentTreeNodeId,
    useAi: String(request.useAi),
  });
  const response = await fetch(`/api/import-document?${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': request.file.type || 'application/octet-stream',
    },
    body: request.file,
  });
  const body = await response.json().catch(() => null) as
    | DocumentImportResult
    | DocumentImportErrorPayload
    | null;
  if (!response.ok || !body || !('ok' in body)) {
    throw new Error(
      body && 'error' in body && body.error
        ? body.error
        : `文档导入失败（HTTP ${response.status}）`,
    );
  }
  return body;
}
