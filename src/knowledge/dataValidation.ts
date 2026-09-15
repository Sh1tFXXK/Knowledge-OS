/**
 * 数据切片形状校验
 *
 * 目的：在任何"加载到的 JSON"进入 store 之前，先判断它到底是不是我们要的东西。
 * 背景：`/api/data` 在参数缺失/越权/文件缺失时返回的是 `{ error: "..." }` 形状的错误信封，
 * 与业务数据同为 JSON。历史上这类信封与"形状残缺的节点"都会被无差别合并进节点池，
 * 导致渲染层读到 undefined 字段后整页白屏。这里把"能不能用"的判断集中到一处。
 *
 * 两级结论：
 * - `fatal`：该切片**不可用**。上层必须保留既有状态并禁止回写该文件。
 * - `warnings`：形状可容忍（渲染层已容错），但必须上报，绝不静默丢弃。
 */

const ENVELOPE_KEYS = new Set([
  'error',
  'code',
  'message',
  'status',
  'statusCode',
  'details',
  'hint',
]);

/** 单次加载的形状诊断结果。 */
export interface SliceDiagnostic {
  /** 非 null 表示该切片不可用，值为人类可读的原因。 */
  fatal: string | null;
  /** 可容忍但必须上报的问题。 */
  warnings: string[];
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `数组(${value.length})`;
  return typeof value;
}

/**
 * 识别 API 错误信封：只有少数字段、且带字符串 `error`。
 * 这类响应即使 HTTP 状态被中间层改写为 2xx，也不能当成业务数据。
 */
export function isErrorEnvelope(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.length > 6) return false;
  if (typeof value.error !== 'string') return false;
  return keys.every((key) => ENVELOPE_KEYS.has(key));
}

export function describeEnvelope(value: unknown): string {
  if (!isPlainRecord(value)) return describeType(value);
  const error = typeof value.error === 'string' ? value.error : '';
  const code = typeof value.code === 'string' ? ` code=${value.code}` : '';
  return `error="${error}"${code}`;
}

/** 统一的信封前置检查；命中则直接返回 fatal。 */
function inspectEnvelope(value: unknown): SliceDiagnostic | null {
  if (!isErrorEnvelope(value)) return null;
  return { fatal: `响应体是错误信封而非业务数据（${describeEnvelope(value)}）`, warnings: [] };
}

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isPlainRecord);
}

/** 数组元素缺少必填字符串字段时的容错统计。 */
function inspectRequiredStrings(
  items: Record<string, unknown>[],
  field: string,
  label: string,
): string | null {
  const missing = items.filter((item) => typeof item[field] !== 'string' || item[field] === '');
  if (missing.length === 0) return null;
  return `${missing.length} 条${label}缺少 ${field} 字段`;
}

/**
 * 时间戳字段的容错统计。
 *
 * `occurredAt` 在数据模型里是 **number（epoch 毫秒）**，见 src/knowledge/timelineEvolution.ts
 * 的 `occurredAt: number`，EventDrawer / TemporalRail / indexEvolution 也都按数字在用。
 * 这里若照搬 inspectRequiredStrings 要求字符串，会把全库每一条事件都误报成"缺字段"。
 */
function inspectRequiredTimestamps(
  items: Record<string, unknown>[],
  field: string,
  label: string,
): string | null {
  const bad = items.filter((item) => {
    const value = item[field];
    if (typeof value === 'number') return !Number.isFinite(value);
    // 兼容历史数据里写成日期字符串的情况
    if (typeof value === 'string') return value === '' || Number.isNaN(Date.parse(value));
    return true;
  });
  if (bad.length === 0) return null;
  return `${bad.length} 条${label}的 ${field} 不是有效时间戳（应为 epoch 毫秒数）`;
}

function sampleOf(entries: [string, unknown][], limit = 3): string {
  return entries
    .slice(0, limit)
    .map(([key, value]) => `${key} → ${describeType(value)}`)
    .join('；');
}

// ── tree-data.json ────────────────────────────────────────────────

export function inspectTreeData(value: unknown): SliceDiagnostic {
  const envelope = inspectEnvelope(value);
  if (envelope) return envelope;
  if (!isPlainRecord(value)) {
    return { fatal: `顶层应为对象，实际收到 ${describeType(value)}`, warnings: [] };
  }
  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    return { fatal: '顶层缺少 id / name 字符串字段', warnings: [] };
  }
  if (value.children !== undefined && !Array.isArray(value.children)) {
    return { fatal: `children 应为数组，实际收到 ${describeType(value.children)}`, warnings: [] };
  }
  return { fatal: null, warnings: [] };
}

// ── node-pool.json ────────────────────────────────────────────────

export function inspectNodePool(value: unknown): SliceDiagnostic {
  const envelope = inspectEnvelope(value);
  if (envelope) return envelope;
  if (!isPlainRecord(value)) {
    return { fatal: `顶层应为"节点表"对象，实际收到 ${describeType(value)}`, warnings: [] };
  }

  const entries = Object.entries(value);
  const notObject: [string, unknown][] = [];
  const noLabel: string[] = [];
  const noCard: string[] = [];

  let emptyTabs = 0;
  let tabWithoutContent = 0;
  let nonArrayTabs = 0;

  for (const [key, node] of entries) {
    if (!isPlainRecord(node)) {
      notObject.push([key, node]);
      continue;
    }
    if (typeof node.label !== 'string') {
      if (noLabel.length < 3) noLabel.push(`${key}(${describeType(node.label)})`);
      continue;
    }
    if (!isPlainRecord(node.card)) {
      if (noCard.length < 3) noCard.push(key);
      continue;
    }
    const tabs = node.card.tabs;
    if (tabs === undefined) continue;
    if (!Array.isArray(tabs)) {
      nonArrayTabs += 1;
      continue;
    }
    if (tabs.length === 0) {
      emptyTabs += 1;
      continue;
    }
    for (const tab of tabs) {
      if (!isPlainRecord(tab)) {
        tabWithoutContent += 1;
        continue;
      }
      if (typeof tab.content !== 'string') tabWithoutContent += 1;
      // 子 tab / 子页递归计数（层级不深，最多递归 3 层）
    }
  }

  // 致命：节点本身不成形，合并进池后任何一次 Object.values 都可能触雷
  if (notObject.length > 0) {
    return {
      fatal: `${notObject.length} 个条目不是对象（${sampleOf(notObject)}），无法作为节点池使用`,
      warnings: [],
    };
  }
  if (noLabel.length > 0) {
    return {
      fatal: `${noLabel.length} 个条目缺少字符串 label（${noLabel.join('；')}）`,
      warnings: [],
    };
  }
  if (noCard.length > 0) {
    return {
      fatal: `${noCard.length} 个条目缺少 card 对象（${noCard.join('；')}）`,
      warnings: [],
    };
  }

  // 可容忍：上报但不丢弃
  const warnings: string[] = [];
  if (emptyTabs > 0) {
    warnings.push(`${emptyTabs} 个节点的 card.tabs 为空数组（合法：仅入池、尚未填正文）`);
  }
  if (tabWithoutContent > 0) {
    warnings.push(`${tabWithoutContent} 个 tab 缺少 content 字段（渲染层已容错；数据本身建议单独修复）`);
  }
  if (nonArrayTabs > 0) {
    warnings.push(`${nonArrayTabs} 个节点的 card.tabs 不是数组（渲染层已容错）`);
  }
  return { fatal: null, warnings };
}

// ── knowledge-edges.json ──────────────────────────────────────────

export function inspectKnowledgeEdges(value: unknown): SliceDiagnostic {
  const envelope = inspectEnvelope(value);
  if (envelope) return envelope;
  if (!Array.isArray(value)) {
    return { fatal: `顶层应为数组，实际收到 ${describeType(value)}`, warnings: [] };
  }
  if (!isRecordArray(value)) {
    const bad = value.filter((item) => !isPlainRecord(item)).length;
    return { fatal: `${bad} 条边不是对象`, warnings: [] };
  }
  const warnings: string[] = [];
  const noId = inspectRequiredStrings(value, 'id', '边');
  if (noId) warnings.push(noId);
  const noSource = inspectRequiredStrings(value, 'source', '边');
  if (noSource) warnings.push(noSource);
  const noTarget = inspectRequiredStrings(value, 'target', '边');
  if (noTarget) warnings.push(noTarget);
  return { fatal: null, warnings };
}

// ── questions.json ────────────────────────────────────────────────

export function inspectQuestions(value: unknown): SliceDiagnostic {
  const envelope = inspectEnvelope(value);
  if (envelope) return envelope;
  if (!Array.isArray(value)) {
    return { fatal: `顶层应为数组，实际收到 ${describeType(value)}`, warnings: [] };
  }
  if (!isRecordArray(value)) {
    const bad = value.filter((item) => !isPlainRecord(item)).length;
    return { fatal: `${bad} 条问题不是对象`, warnings: [] };
  }
  const warnings: string[] = [];
  const noId = inspectRequiredStrings(value, 'id', '问题');
  if (noId) warnings.push(noId);
  const noText = inspectRequiredStrings(value, 'text', '问题');
  if (noText) warnings.push(noText);
  return { fatal: null, warnings };
}

// ── evolution-events.json ─────────────────────────────────────────

export function inspectEvolutionEvents(value: unknown): SliceDiagnostic {
  const envelope = inspectEnvelope(value);
  if (envelope) return envelope;
  if (!Array.isArray(value)) {
    return { fatal: `顶层应为数组，实际收到 ${describeType(value)}`, warnings: [] };
  }
  if (!isRecordArray(value)) {
    const bad = value.filter((item) => !isPlainRecord(item)).length;
    return { fatal: `${bad} 条事件不是对象`, warnings: [] };
  }
  const warnings: string[] = [];
  const noScope = inspectRequiredStrings(value, 'scopeRootId', '事件');
  if (noScope) warnings.push(noScope);
  const noTime = inspectRequiredTimestamps(value, 'occurredAt', '事件');
  if (noTime) warnings.push(noTime);
  const validTypes = new Set(['release', 'introduce', 'deprecate', 'replace', 'split', 'merge']);
  const badType = value.filter((item) => !validTypes.has(item.type as string)).length;
  if (badType > 0) {
    // type 缺失或非法的事件会被 normalizeEvolutionEvents 丢弃（不进演化图），
    // 操作日志类事件（tree-refactor 等）不应再写入本文件 —— 见 timelineEvolution.ts 头注。
    warnings.push(`${badType} 条事件的 type 不是合法演化类型（release/introduce/deprecate/replace/split/merge），加载时将被丢弃`);
  }
  return { fatal: null, warnings };
}
