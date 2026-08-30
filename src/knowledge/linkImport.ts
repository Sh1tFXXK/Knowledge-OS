export interface LinkImportRequest {
  url: string;
  parentTreeNodeId: string;
  translate: boolean;
  useAi: boolean;
}

export interface LinkImportCapabilities {
  ai: {
    configured: boolean;
    model: string;
  };
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
  structureMode: 'semantic' | 'outline';
  markdownPath: string;
}

export async function getLinkImportCapabilities(): Promise<LinkImportCapabilities> {
  const response = await fetch('/api/import-link', { cache: 'no-store' });
  if (!response.ok) throw new Error(`无法读取导入能力（HTTP ${response.status}）`);
  return await response.json() as LinkImportCapabilities;
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
