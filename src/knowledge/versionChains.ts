/**
 * 版本链模型（versions-v1，2026-09-15 用户裁决）。
 *
 * 版本是**状态**（名词），不是事件（动词）：EVOLUTION-V2 的事件表回答「发生了什么」，
 * 本模块回答「变成了什么」。version-chains.json 是唯一事实源，V1 运行时**只读**——
 * 版本数据由批次脚本管理，UI 不提供编辑入口（入 store 的切片接线在 useGraph.ts
 * 空闲后的续批做，见 batch-manifests/versions-v1.json scopeRegistration）。
 *
 * 数据纪律（违反即坏债，normalize 一律严格丢弃 + 记诊断，不兜底）：
 * - 版本 id 全局唯一且**严禁冒号**（treebind 18 条坏债的根因就是 id 含冒号）；
 * - previous 单指针 = 线性链（分叉 v1 不表达）；previous 必须指向同链内存在的版本；
 * - 链必须从链头（previous === null）可达，环成员丢弃；
 * - releasedAt / eolAt 用 ISO 月精度字符串（YYYY | YYYY-MM | YYYY-MM-DD），
 *   不对齐事件表的 epoch 毫秒——版本的时间精度是月；
 * - 跨实体版本依赖（requires）**不存本文件**，进 knowledge-edges.json
 *   （关系表 = 关系唯一事实源），UI 从边表 filter type === 'requires' 派生。
 */

export interface VersionNode {
  /** 全局唯一，严禁冒号（treebind 坏债根因） */
  id: string;
  /** 展示名，如 "Java 17" */
  label: string;
  /** 发布时间，ISO 月精度：YYYY | YYYY-MM | YYYY-MM-DD */
  releasedAt: string;
  /** EOL 时间；null = 未到生命终点 */
  eolAt: string | null;
  /** 单指针 = 线性链；null = 链头 */
  previous: string | null;
  /** 如 ["LTS"] */
  tags?: string[];
  /** 该版本引入的关键变化（展示用要点） */
  changes?: string[];
}

export interface VersionChain {
  /** 池内知识实体 id（如 k_java_fw_spring） */
  entityId: string;
  versions: VersionNode[];
}

const VERSION_DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** ISO 月精度日期（YYYY | YYYY-MM | YYYY-MM-DD），且必须是真实存在的日历日期。 */
export function isValidVersionDate(value: unknown): value is string {
  if (typeof value !== 'string' || !VERSION_DATE_RE.test(value)) return false;
  const parts = value.split('-').map((part) => Number(part));
  const year = parts[0];
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year
    && probe.getUTCMonth() === month - 1
    && probe.getUTCDate() === day
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export interface VersionChainNormalization {
  chains: VersionChain[];
  /** 被丢弃条目的人类可读原因（诊断上报 / 测试负对照用） */
  dropped: string[];
}

function normalizeVersionNode(
  raw: unknown,
  chainTag: string,
  seenIds: Map<string, string>,
): VersionNode | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return `${chainTag}：版本条目不是对象`;
  }
  const node = raw as Record<string, unknown>;
  if (typeof node.id !== 'string' || node.id === '') return `${chainTag}：版本缺少 id`;
  if (node.id.includes(':')) return `版本 ${node.id}：id 含冒号（禁用，treebind 坏债根因）`;
  if (seenIds.has(node.id)) {
    return `版本 ${node.id}：id 全局重复（首次出现于 ${seenIds.get(node.id)}）`;
  }
  if (typeof node.label !== 'string' || node.label === '') return `版本 ${node.id}：缺少 label`;
  if (!isValidVersionDate(node.releasedAt)) {
    return `版本 ${node.id}：releasedAt 不是合法 ISO 月精度日期（YYYY|YYYY-MM|YYYY-MM-DD）`;
  }
  seenIds.set(node.id, chainTag);
  const previous = typeof node.previous === 'string' && node.previous !== '' ? node.previous : null;
  if (previous !== null && previous.includes(':')) {
    return `版本 ${node.id}：previous 含冒号`;
  }
  return {
    id: node.id,
    label: node.label,
    releasedAt: node.releasedAt,
    eolAt: isValidVersionDate(node.eolAt) ? node.eolAt : null,
    previous,
    tags: asStringArray(node.tags),
    changes: asStringArray(node.changes),
  };
}

/**
 * 加载时校验版本链，丢弃无法立足的条目（链级：缺 entityId / versions 非数组；
 * 节点级：缺 id/label、id 含冒号、id 全局重复、releasedAt 非法、previous 悬空/含冒号、环成员）。
 */
export function normalizeVersionChainsWithDiagnostics(value: unknown): VersionChainNormalization {
  const dropped: string[] = [];
  if (!Array.isArray(value)) {
    return { chains: [], dropped: ['顶层不是数组，整体丢弃'] };
  }

  const seenIds = new Map<string, string>();
  const chains: VersionChain[] = [];

  value.forEach((entry, chainIndex) => {
    const chainTag = `链 #${chainIndex}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      dropped.push(`${chainTag}：条目不是对象`);
      return;
    }
    const chain = entry as Record<string, unknown>;
    if (typeof chain.entityId !== 'string' || chain.entityId === '') {
      dropped.push(`${chainTag}：缺少 entityId`);
      return;
    }
    if (!Array.isArray(chain.versions)) {
      dropped.push(`链 ${chain.entityId}：versions 不是数组`);
      return;
    }

    const versions: VersionNode[] = [];
    for (const raw of chain.versions) {
      const result = normalizeVersionNode(raw, `链 ${chain.entityId}`, seenIds);
      if (typeof result === 'string') dropped.push(result);
      else versions.push(result);
    }

    // previous 必须指向同链内存在的版本（跨链 previous 无意义，一并丢弃）
    const idsInChain = new Set(versions.map((v) => v.id));
    const kept = versions.filter((v) => {
      if (v.previous !== null && !idsInChain.has(v.previous)) {
        dropped.push(`版本 ${v.id}：previous ${v.previous} 不在同链内，丢弃`);
        return false;
      }
      return true;
    });
    if (kept.length === 0) return;

    // 环检测：从链头沿 previous 的子指针走，走不到的成员（环）丢弃
    const children = new Map<string, string[]>();
    const heads: string[] = [];
    for (const v of kept) {
      if (v.previous === null) heads.push(v.id);
      else {
        const list = children.get(v.previous) ?? [];
        list.push(v.id);
        children.set(v.previous, list);
      }
    }
    const reachable = new Set<string>();
    const queue = [...heads];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const child of children.get(id) ?? []) queue.push(child);
    }
    const reachableKept = kept.filter((v) => {
      if (!reachable.has(v.id)) {
        dropped.push(`版本 ${v.id}：不在任何链头可达路径上（环成员），丢弃`);
        return false;
      }
      return true;
    });
    if (reachableKept.length > 0) {
      chains.push({ entityId: chain.entityId, versions: reachableKept });
    }
  });

  return { chains, dropped };
}

export function normalizeVersionChains(value: unknown): VersionChain[] {
  return normalizeVersionChainsWithDiagnostics(value).chains;
}

/**
 * 线性链排序：链头在前，沿 previous 单指针依次向后；同头多支（v1 不表达）时
 * 按 releasedAt 取最早支线先行，其余余量按 releasedAt 兜底追加，保证不丢节点。
 */
export function orderVersions(versions: VersionNode[]): VersionNode[] {
  const byId = new Map(versions.map((v) => [v.id, v]));
  const byReleased = (
    a: VersionNode,
    b: VersionNode,
  ) => a.releasedAt.localeCompare(b.releasedAt) || a.id.localeCompare(b.id);

  const nextOf = new Map<string | null, VersionNode[]>();
  for (const v of versions) {
    const key = v.previous !== null && byId.has(v.previous) ? v.previous : null;
    const list = nextOf.get(key) ?? [];
    list.push(v);
    nextOf.set(key, list);
  }
  for (const list of nextOf.values()) list.sort(byReleased);

  const ordered: VersionNode[] = [];
  const visited = new Set<string>();
  const walkFrom = (start: VersionNode) => {
    let cursor: VersionNode | undefined = start;
    while (cursor && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      ordered.push(cursor);
      cursor = (nextOf.get(cursor.id) ?? [])[0];
    }
  };
  for (const head of nextOf.get(null) ?? []) walkFrom(head);
  if (ordered.length < versions.length) {
    ordered.push(...versions.filter((v) => !visited.has(v.id)).sort(byReleased));
  }
  return ordered;
}
