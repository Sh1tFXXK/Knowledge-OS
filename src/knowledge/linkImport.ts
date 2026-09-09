export interface LinkImportRequest {
  url: string;
  parentTreeNodeId: string;
  translate: boolean;
}

export interface LinkImportResult {
  ok: true;
  nodeId: string;
  treeNodeId: string;
  title: string;
  sourceUrl: string;
  sourceHost: string;
  language: string;
  translated: boolean;
  nodeCount: number;
  rootCount: number;
  relationCount: number;
  sectionCount: number;
  questionCount: number;
  categories: string[];
  structureMode: 'outline';
  markdownPath: string;
}

interface LinkImportErrorPayload {
  error?: string;
}

export async function importLink(request: LinkImportRequest): Promise<LinkImportResult> {
  const response = await fetch('/api/import-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const body = await response.json().catch(() => null) as LinkImportResult | LinkImportErrorPayload | null;
  if (!response.ok || !body || !('ok' in body)) {
    throw new Error(body && 'error' in body && body.error ? body.error : `链接导入失败（HTTP ${response.status}）`);
  }
  return body;
}
