import type { PersistedAppState } from './state';
import { APP_STATE_VERSION, createEmptyAppState } from './state';
import type { TreeNode, KnowledgeNode, KnowledgeEdge, Question } from '../types';
import type { VersionChain } from './versionChains';
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
  isPlainRecord,
  type SliceDiagnostic,
} from './dataValidation';

const FILES = {
  treeData: 'tree-data.json',
  nodePool: 'node-pool.json',
  knowledgeEdges: 'knowledge-edges.json',
  questions: 'questions.json',
  evolutionEvents: 'evolution-events.json',
  versionChains: 'version-chains.json',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 单个切片的加载结果。
 *
 * `failed` 与 `missing` 必须区分：
 * - `missing`（HTTP 404）是"文件还不存在"，按新文件处理，允许首次写入；
 * - `failed` 是"文件在但不该采信"（非 2xx / 非法 JSON / 形状不合法 / 错误信封），
 *   上层必须保留既有状态，并**禁止**把这份状态回写给该文件。
 */
export type SliceLoad<T> =
  | { status: 'loaded'; value: T; warnings: string[] }
  | { status: 'missing' }
  | { status: 'failed'; reason: string };

async function fetchSlice<T>(
  filename: string,
  inspect: (value: unknown) => SliceDiagnostic,
): Promise<SliceLoad<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/data?file=${filename}`, { cache: 'no-store' });
  } catch (error) {
    return { status: 'failed', reason: `请求失败：${errorMessage(error)}` };
  }

  if (res.status === 404) return { status: 'missing' };

  if (!res.ok) {
    // 非 2xx 一律不采信；把服务端的错误说明尽量带回来，便于定位
    const body: unknown = await res.json().catch(() => null);
    const detail = isPlainRecord(body) && typeof body.error === 'string'
      ? `：${describeEnvelope(body)}`
      : '';
    return { status: 'failed', reason: `HTTP ${res.status}${detail}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (error) {
    return { status: 'failed', reason: `响应不是合法 JSON：${errorMessage(error)}` };
  }

  const diagnostic = inspect(body);
  if (diagnostic.fatal) return { status: 'failed', reason: diagnostic.fatal };
  return { status: 'loaded', value: body as T, warnings: diagnostic.warnings };
}

// 线上传输用压缩 JSON（服务端落盘时仍会格式化），12MB 级数据可省一半序列化与传输开销
async function saveFile<T>(filename: string, data: T): Promise<void> {
  try {
    const res = await fetch(`/api/data?file=${filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`Failed to save ${filename}`, e);
    throw e;
  }
}

/** 持久化到本地文件的数据切片。 */
export type PersistedSliceKey =
  | 'treeData'
  | 'nodePool'
  | 'knowledgeEdges'
  | 'questions'
  | 'evolutionEvents'
  | 'versionChains';

export type PersistedSlices = Pick<PersistedAppState, PersistedSliceKey>;

const PERSISTED_SLICE_KEYS: readonly PersistedSliceKey[] = [
  'treeData',
  'nodePool',
  'knowledgeEdges',
  'questions',
  'evolutionEvents',
  'versionChains',
] as const;

const SLICE_FILES: Record<PersistedSliceKey, string> = {
  treeData: FILES.treeData,
  nodePool: FILES.nodePool,
  knowledgeEdges: FILES.knowledgeEdges,
  questions: FILES.questions,
  evolutionEvents: FILES.evolutionEvents,
  versionChains: FILES.versionChains,
};

const SLICE_LABELS: Record<PersistedSliceKey, string> = {
  treeData: '目录树',
  nodePool: '节点池',
  knowledgeEdges: '知识边',
  questions: '问题库',
  evolutionEvents: '演化事件',
  versionChains: '版本链',
};

export function sliceFile(key: PersistedSliceKey): string {
  return SLICE_FILES[key];
}

export function sliceLabel(key: PersistedSliceKey): string {
  return SLICE_LABELS[key];
}

export function pickPersistedSlices(state: PersistedAppState): PersistedSlices {
  return {
    treeData: state.treeData,
    nodePool: state.nodePool,
    knowledgeEdges: state.knowledgeEdges,
    questions: state.questions,
    evolutionEvents: state.evolutionEvents,
    versionChains: state.versionChains,
  };
}

/** 通过引用对比找出真正变化过的切片：zustand 每个 action 只替换被改的切片。 */
export function dirtyPersistedSlices(
  next: PersistedSlices,
  saved: Partial<PersistedSlices> | null,
): PersistedSliceKey[] {
  if (!saved) return [...PERSISTED_SLICE_KEYS];
  return PERSISTED_SLICE_KEYS.filter((key) => next[key] !== saved[key]);
}

/** 只写入指定切片对应的数据文件，返回写入失败的切片。 */
export async function savePersistedSlices(
  slices: PersistedSlices,
  keys: readonly PersistedSliceKey[],
): Promise<PersistedSliceKey[]> {
  const results = await Promise.all(
    keys.map((key) =>
      saveFile(SLICE_FILES[key], slices[key]).then(
        () => null,
        () => key,
      ),
    ),
  );
  return results.filter((key): key is PersistedSliceKey => key !== null);
}

/** 加载失败、必须禁止回写的切片。 */
export interface SliceFailure {
  key: PersistedSliceKey;
  file: string;
  label: string;
  reason: string;
}

export interface LoadedAppState {
  state: PersistedAppState;
  /** 加载失败、禁止回写的切片 */
  failures: SliceFailure[];
  /** 只需上报、不影响使用的形状问题 */
  warnings: string[];
  /** 文件不存在、按新文件处理的切片 */
  missing: SliceFailure[];
}

function failureOf(key: PersistedSliceKey, reason: string): SliceFailure {
  return { key, file: SLICE_FILES[key], label: SLICE_LABELS[key], reason };
}

async function loadStateFromFiles(): Promise<LoadedAppState> {
  const [treeData, nodePool, knowledgeEdges, questions, evolutionEvents, versionChains] = await Promise.all([
    fetchSlice<TreeNode>(FILES.treeData, inspectTreeData),
    fetchSlice<Record<string, KnowledgeNode>>(FILES.nodePool, inspectNodePool),
    fetchSlice<KnowledgeEdge[]>(FILES.knowledgeEdges, inspectKnowledgeEdges),
    fetchSlice<Question[]>(FILES.questions, inspectQuestions),
    fetchSlice<unknown[]>(FILES.evolutionEvents, inspectEvolutionEvents),
    fetchSlice<VersionChain[]>(FILES.versionChains, inspectVersionChains),
  ]);

  const loads: Array<[PersistedSliceKey, SliceLoad<unknown>]> = [
    ['treeData', treeData],
    ['nodePool', nodePool],
    ['knowledgeEdges', knowledgeEdges],
    ['questions', questions],
    ['evolutionEvents', evolutionEvents],
    ['versionChains', versionChains],
  ];

  const failures: SliceFailure[] = [];
  const missing: SliceFailure[] = [];
  const warnings: string[] = [];

  for (const [key, load] of loads) {
    if (load.status === 'failed') {
      failures.push(failureOf(key, load.reason));
      console.error(`[data] ${SLICE_FILES[key]} 加载失败，保留既有状态：${load.reason}`);
    } else if (load.status === 'missing') {
      missing.push(failureOf(key, '文件不存在，将按新文件处理'));
      console.warn(`[data] ${SLICE_FILES[key]} 不存在，按新文件处理`);
    } else {
      for (const warning of load.warnings) {
        warnings.push(`${SLICE_FILES[key]}：${warning}`);
        console.warn(`[data] ${SLICE_FILES[key]}：${warning}`);
      }
    }
  }

  const state: Partial<PersistedAppState> = { version: APP_STATE_VERSION };

  // 只有 loaded 的切片才进入状态；failed 的切片留空，由上层保留既有状态并禁止回写
  if (treeData.status === 'loaded') state.treeData = normalizeTreeNode(treeData.value);
  if (nodePool.status === 'loaded') state.nodePool = migrateNodePool(nodePool.value);
  if (knowledgeEdges.status === 'loaded') state.knowledgeEdges = knowledgeEdges.value;
  if (questions.status === 'loaded') state.questions = questions.value;
  if (evolutionEvents.status === 'loaded') {
    state.evolutionEvents = normalizeEvolutionEvents(evolutionEvents.value);
  }
  if (versionChains.status === 'loaded') {
    state.versionChains = versionChains.value;
  }

  const empty = createEmptyAppState();

  return {
    state: {
      ...empty,
      ...state,
      version: APP_STATE_VERSION,
      treeData: state.treeData ?? empty.treeData,
      nodePool: state.nodePool ?? empty.nodePool,
      knowledgeEdges: state.knowledgeEdges ?? empty.knowledgeEdges,
      questions: state.questions ?? empty.questions,
      evolutionEvents: state.evolutionEvents ?? empty.evolutionEvents,
      versionChains: state.versionChains ?? empty.versionChains,
    },
    failures,
    warnings,
    missing,
  };
}

/**
 * 从 data/*.json 装载全量状态。
 *
 * 返回的不是裸状态，而是带诊断的结果：哪些切片加载成功、哪些失败（必须禁止回写）、
 * 哪些文件不存在、哪些形状问题需要上报。调用方必须处理 `failures`，否则
 * "加载失败 → 空状态 → 回写覆盖正式文件" 这条破坏性链路会被重新打开。
 */
export async function loadCompleteStateFromFiles(): Promise<LoadedAppState> {
  return loadStateFromFiles();
}
