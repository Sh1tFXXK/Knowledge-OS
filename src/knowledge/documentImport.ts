export const MAX_DOCUMENT_IMPORT_BYTES = 20 * 1024 * 1024;

export enum DocumentKind {
  Pdf = 'pdf',
  Markdown = 'markdown',
  Html = 'html',
  Text = 'text',
  Docx = 'docx',
}

export enum DocumentProfile {
  Article = 'article',
  QuestionBank = 'question-bank',
}

export enum DocumentImportSourceKind {
  File = 'file',
  JavaSource = 'java-source',
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
  javaSource: {
    available: boolean;
    defaultSource: string;
    supportedSources: string[];
  };
}

export interface DocumentImportRequest {
  file: File;
  parentTreeNodeId: string;
  translate: boolean;
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
  translated: boolean;
  pageCount: number | null;
  nodeCount: number;
  sectionCount: number;
  questionCount: number;
  categories: string[];
  profile: DocumentProfile;
  standard: DocumentImportStandardResult;
  markdownPath: string;
}

export interface JavaSourceImportRequest {
  source: string;
  parentTreeNodeId: string;
  translate: boolean;
}

export interface JavaSourceImportResult {
  ok: true;
  kind: DocumentImportSourceKind.JavaSource;
  title: string;
  nodeId: string;
  treeNodeId: string;
  source: string;
  runtimeVersion: string;
  sourceFiles: number;
  importedPackages: number;
  importedTypes: number;
  importedConstructors: number;
  importedMethods: number;
  importedMembers: number;
  documentedTypes: number;
  documentedMembers: number;
  translatedComments: number;
  reusedTranslations: number;
  directTypeRelations: number;
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
  if (extension === '.html' || extension === '.htm') return DocumentKind.Html;
  if (extension === '.docx') return DocumentKind.Docx;
  return DocumentKind.Text;
}

export function validateDocumentFile(file: File): string | null {
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
    translate: String(request.translate),
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

export async function importJavaSource(
  request: JavaSourceImportRequest,
): Promise<JavaSourceImportResult> {
  const source = request.source.trim();
  if (!source) throw new Error('请输入 Java 源码路径');
  if (!request.parentTreeNodeId.trim()) throw new Error('请选择要挂载的项目目录');

  const response = await fetch('/api/import-java-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source,
      parentTreeNodeId: request.parentTreeNodeId,
      translate: request.translate,
    }),
  });
  const body = await response.json().catch(() => null) as
    | JavaSourceImportResult
    | DocumentImportErrorPayload
    | null;
  if (!response.ok || !body || !('ok' in body)) {
    throw new Error(
      body && 'error' in body && body.error
        ? body.error
        : `Java 源码导入失败（HTTP ${response.status}）`,
    );
  }
  return body;
}
