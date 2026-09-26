import type { PersistedAppState } from './state';
import {
  APP_STATE_VERSION,
} from './state';
import type { TreeNode, KnowledgeNode, KnowledgeEdge, Question } from '../types';
import { migrateNodePool } from './migrateViewDimensions';
import { normalizeTreeNode } from './treeUtils';
import { normalizeEvolutionEvents } from './timelineEvolution';
import {
  describeEnvelope,
  inspectEvolutionEvents,
  inspectKnowledgeEdges,
  inspectNodePool,
  inspectQuestions,
  inspectTreeData,
  inspectVersionChains,
  type SliceDiagnostic,
} from './dataValidation';
import type { PersistedSliceKey } from './filePersistence';
import type { VersionChain } from './versionChains';
import { READ_ONLY_DEPLOYMENT } from './deploymentMode';

/** 数据文件名 → store 持久化切片 key（versions-v1.2 起 version-chains.json 入切片，仍为只读语义）。 */
const FILE_TO_SLICE: Record<string, PersistedSliceKey> = {
  'tree-data.json': 'treeData',
  'node-pool.json': 'nodePool',
  'knowledge-edges.json': 'knowledgeEdges',
  'questions.json': 'questions',
  'evolution-events.json': 'evolutionEvents',
  'version-chains.json': 'versionChains',
};

export function sliceKeyOfFile(filename: string): PersistedSliceKey | null {
  return FILE_TO_SLICE[filename] ?? null;
}

async function fetchSlice<T>(
  filename: string,
  inspect: (value: unknown) => SliceDiagnostic,
): Promise<{ ok: true; value: T; warnings: string[] } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(`/api/data?file=${filename}`, { cache: 'no-store' });
  } catch (error) {
    return { ok: false, reason: `请求失败：${error instanceof Error ? error.message : String(error)}` };
  }
  if (res.status === 404) return { ok: false, reason: '文件不存在' };
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const isRecord = typeof body === 'object' && body !== null && !Array.isArray(body);
    const detail = isRecord && typeof (body as { error?: unknown }).error === 'string'
      ? `：${describeEnvelope(body)}`
      : '';
    return { ok: false, reason: `HTTP ${res.status}${detail}` };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch (error) {
    return { ok: false, reason: `响应不是合法 JSON：${error instanceof Error ? error.message : String(error)}` };
  }
  const diagnostic = inspect(body);
  if (diagnostic.fatal) return { ok: false, reason: diagnostic.fatal };
  return { ok: true, value: body as T, warnings: diagnostic.warnings };
}

/** 外部修改过的切片重载结果：失败列表用于上报冲突（禁止用旧内存态回写该切片）。 */
export interface ReloadedSlices {
  patches: Partial<PersistedAppState>;
  loadedKeys: PersistedSliceKey[];
  failures: Array<{ key: PersistedSliceKey; reason: string }>;
  warnings: string[];
}

/** 拉取并校验指定切片对应的文件；返回可直接 merge 进 store 的局部状态。 */
export async function reloadSlicesFromFiles(keys: readonly PersistedSliceKey[]): Promise<ReloadedSlices> {
  const patches: Partial<PersistedAppState> = { version: APP_STATE_VERSION };
  const loadedKeys: PersistedSliceKey[] = [];
  const failures: ReloadedSlices['failures'] = [];
  const warnings: string[] = [];

  await Promise.all(
    keys.map(async (key) => {
      const entry = (Object.entries(FILE_TO_SLICE) as Array<[string, PersistedSliceKey]>).find(
        ([, slice]) => slice === key,
      );
      if (!entry) return;
      const filename = entry[0];

      const apply = <T,>(
        load: Promise<{ ok: true; value: T; warnings: string[] } | { ok: false; reason: string }>,
        assign: (value: T) => void,
      ) =>
        load.then((result) => {
          if (result.ok) {
            assign(result.value);
            loadedKeys.push(key);
            for (const warning of result.warnings) warnings.push(`${filename}：${warning}`);
          } else {
            failures.push({ key, reason: result.reason });
          }
        });

      switch (key) {
        case 'treeData':
          await apply(
            fetchSlice<TreeNode>(filename, inspectTreeData),
            (v) => { patches.treeData = normalizeTreeNode(v); },
          );
          break;
        case 'nodePool':
          await apply(
            fetchSlice<Record<string, KnowledgeNode>>(filename, inspectNodePool),
            (v) => { patches.nodePool = migrateNodePool(v); },
          );
          break;
        case 'knowledgeEdges':
          await apply(
            fetchSlice<KnowledgeEdge[]>(filename, inspectKnowledgeEdges),
            (v) => { patches.knowledgeEdges = v; },
          );
          break;
        case 'questions':
          await apply(
            fetchSlice<Question[]>(filename, inspectQuestions),
            (v) => { patches.questions = v; },
          );
          break;
        case 'evolutionEvents':
          await apply(
            fetchSlice<unknown[]>(filename, inspectEvolutionEvents),
            (v) => { patches.evolutionEvents = normalizeEvolutionEvents(v); },
          );
          break;
        case 'versionChains':
          await apply(
            fetchSlice<VersionChain[]>(filename, inspectVersionChains),
            (v) => { patches.versionChains = v; }, // raw 存切片，消费方 normalize
          );
          break;
      }
    }),
  );

  return { patches, loadedKeys, failures, warnings };
}

export interface ExternalChangeMessage {
  type: 'changed';
  file: string;
  mtimeMs: number;
}

/**
 * 订阅服务端的数据文件变更事件流。
 * 返回取消订阅函数；连接断开会自动重连（EventSource 内建 retry）。
 *
 * 只读部署（静态托管）没有 /api/data-events：直接返回空订阅函数，不开连接。
 * 否则浏览器会按 retry 周期反复重连一个 404 的路由，线上控制台持续刷错。
 */
export function subscribeDataFileChanges(onChange: (message: ExternalChangeMessage) => void): () => void {
  if (READ_ONLY_DEPLOYMENT) return () => {};
  if (typeof EventSource === 'undefined') return () => {}; // 非浏览器环境
  const source = new EventSource('/api/data-events');
  source.onmessage = (event: MessageEvent<string>) => {
    try {
      const parsed = JSON.parse(event.data) as ExternalChangeMessage;
      if (parsed && parsed.type === 'changed' && typeof parsed.file === 'string') {
        onChange(parsed);
      }
    } catch {
      // 心跳/未知帧：忽略
    }
  };
  return () => source.close();
}
