import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SectionProps } from './SectionRenderer';
import type { BPlusTreeData, BPlusTreeNode } from '../../types';

/**
 * B+ 树实例结构渲染器。
 *
 * 与其他 Section 不同：它**不读 atoms/nodePool** —— B+ 树的磁盘块、键、指针
 * 是结构实例数据，不是知识概念。数据来源是 `section.config.btree`。
 *
 * 职责：
 *  1. 按 depth（从 rootId BFS）分行渲染节点框（内部节点：键|指针 交替格子；叶子：键格子）
 *  2. SVG 连线：内部节点每个指针 → 对应子节点框
 *  3. 叶子层横向双向链表（⟷）
 *  4. 查询路径高亮：输入 key，按二分路由高亮 root→...→leaf
 */

const CELL_W = 34;   // 键/指针格子宽
const CELL_H = 26;   // 格子高
const ROW_GAP = 70;  // 行间距（给连线留空间）
const NODE_GAP = 16; // 同行节点间距

interface NodeBox {
  id: number;
  node: BPlusTreeNode;
  depth: number;
  /** 该节点子树（含自身）的叶子数，用于宽度权重 */
  leafWeight: number;
  /** 渲染后由 DOM 测得的中心坐标 */
  cx: number;
  cy: number;
  width: number;
}

interface Edge {
  id: string;
  fromId: number;
  toId: number;
  /** 该指针上方应标注的键（路由谓词） */
  keyBefore?: number;
  keyAfter?: number;
  onPath: boolean;
}

interface LeafLink {
  fromId: number;
  toId: number;
}

export function BPlusTreeSection({ section, dimension }: SectionProps) {
  const tree = section.config?.btree;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const boxRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [measured, setMeasured] = useState<Map<number, { cx: number; cy: number; width: number; height: number }>>(new Map());
  const [queryKey, setQueryKey] = useState<string>('');

  // ── 布局计算：depth + leafWeight（自底向上） ──
  const { byId, levels } = useMemo(() => {
    if (!tree) return { byId: new Map<number, BPlusTreeNode>(), levels: [] as BPlusTreeNode[][] };
    const m = new Map<number, BPlusTreeNode>();
    tree.nodes.forEach((n) => m.set(n.id, n));
    // BFS 分层
    const levelsArr: BPlusTreeNode[][] = [];
    const visited = new Set<number>();
    const queue: Array<{ id: number; depth: number }> = [{ id: tree.rootId, depth: 0 }];
    while (queue.length) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const n = m.get(id);
      if (!n) continue;
      if (!levelsArr[depth]) levelsArr[depth] = [];
      levelsArr[depth].push(n);
      if (!n.leaf) {
        n.ptrs.forEach((p) => queue.push({ id: p, depth: depth + 1 }));
      }
    }
    return { byId: m, levels: levelsArr };
  }, [tree]);

  // 自底向上算 leafWeight（决定每个节点框水平占位）
  const leafWeight = useMemo(() => {
    const w = new Map<number, number>();
    if (!tree) return w;
    for (let d = levels.length - 1; d >= 0; d--) {
      for (const n of levels[d]) {
        if (n.leaf) {
          w.set(n.id, 1);
        } else {
          const sum = n.ptrs.reduce((acc, p) => acc + (w.get(p) ?? 1), 0);
          w.set(n.id, Math.max(1, sum));
        }
      }
    }
    return w;
  }, [tree, levels]);

  // resize 时自增 tick，下面的 layout effect 依赖它以重算连线
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  // ── 测量 DOM，拿到每个框的真实中心坐标 ──
  useLayoutEffect(() => {
    if (!wrapRef.current || !tree) return;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const next = new Map<number, { cx: number; cy: number; width: number; height: number }>();
    boxRefs.current.forEach((el, id) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      next.set(id, {
        cx: r.left - wrapRect.left + r.width / 2,
        cy: r.top - wrapRect.top + r.height / 2,
        width: r.width,
        height: r.height,
      });
    });
    setMeasured(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, levels, leafWeight, tick]);

  // ── 查询路径：输入 key 二分路由 ──
  const pathSet = useMemo(() => {
    const s = new Set<number>();
    if (!tree || !byId.has(tree.rootId)) return s;
    const k = Number(queryKey);
    if (!Number.isFinite(k) || queryKey === '') return s;
    let cur: BPlusTreeNode | undefined = byId.get(tree.rootId);
    let guard = 0;
    while (cur && guard++ < 100) {
      s.add(cur.id);
      if (cur.leaf) break;
      // 找第一个 >= k 的键的位置 → 走对应指针
      let i = 0;
      while (i < cur.keys.length && k >= cur.keys[i]) i++;
      cur = byId.get(cur.ptrs[i]);
    }
    return s;
  }, [tree, queryKey, byId]);

  // ── 边（内部节点指针 → 子节点） ──
  const edges: Edge[] = useMemo(() => {
    if (!tree) return [];
    const list: Edge[] = [];
    tree.nodes.forEach((n) => {
      if (n.leaf) return;
      n.ptrs.forEach((p, i) => {
        list.push({
          id: `${n.id}-${i}-${p}`,
          fromId: n.id,
          toId: p,
          keyBefore: i > 0 ? n.keys[i - 1] : undefined,
          keyAfter: i < n.keys.length ? n.keys[i] : undefined,
          onPath: pathSet.has(n.id) && pathSet.has(p),
        });
      });
    });
    return list;
  }, [tree, pathSet]);

  // 叶子链表连线
  const leafLinks: LeafLink[] = useMemo(() => {
    if (!tree || tree.leafChain.length < 2) return [];
    const out: LeafLink[] = [];
    for (let i = 0; i < tree.leafChain.length - 1; i++) {
      out.push({ fromId: tree.leafChain[i], toId: tree.leafChain[i + 1] });
    }
    return out;
  }, [tree]);

  if (!tree) {
    return (
      <div className="dc-section-body dc-btree-empty">
        该 Section 未配置 B+ 树数据（`config.btree`）。
      </div>
    );
  }

  // 连线坐标：父框底边中点 → 子框顶边中点
  const svgEdges = edges
    .map((e) => {
      const a = measured.get(e.fromId);
      const b = measured.get(e.toId);
      if (!a || !b) return null;
      const x1 = a.cx;
      const y1 = a.cy + a.height / 2;
      const x2 = b.cx;
      const y2 = b.cy - b.height / 2;
      // 贝塞尔，模拟 TreeSection 的下垂感
      const midY = (y1 + y2) / 2;
      const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      return { e, d, x1, y1, x2, y2, labelX: (x1 + x2) / 2, labelY: midY };
    })
    .filter(Boolean) as Array<{ e: Edge; d: string; x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number }>;

  // 叶子链表横向箭头坐标
  const svgLeafLinks = leafLinks
    .map((l) => {
      const a = measured.get(l.fromId);
      const b = measured.get(l.toId);
      if (!a || !b) return null;
      return { l, x1: a.cx + a.width / 2, x2: b.cx - b.width / 2, y: a.cy };
    })
    .filter(Boolean) as Array<{ l: LeafLink; x1: number; x2: number; y: number }>;

  return (
    <div className="dc-section-body dc-btree-section" ref={wrapRef}>
      {/* 控制条：fanout + 查询 */}
      <div className="dc-btree-ctrl">
        <span className="dc-btree-badge">fanout = {tree.fanout}</span>
        <span className="dc-btree-badge">{tree.nodes.length} 页</span>
        <span className="dc-btree-badge">{tree.leafChain.length} 叶</span>
        <div className="dc-btree-search">
          <span className="dc-btree-search-label">查找</span>
          <input
            className="input dc-btree-search-input"
            type="number"
            value={queryKey}
            onChange={(ev) => setQueryKey(ev.target.value)}
            placeholder="key"
          />
          {queryKey !== '' && (
            <button className="btn btn-sm" onClick={() => setQueryKey('')}>清除</button>
          )}
        </div>
      </div>

      {/* 树体：分行 */}
      <div className="dc-btree-stage">
        {levels.map((row, depth) => (
          <div className="dc-btree-row" key={depth} style={{ marginBottom: depth < levels.length - 1 ? ROW_GAP : 0 }}>
            {row.map((n) => {
              const onPath = pathSet.has(n.id);
              return (
                <div
                  key={n.id}
                  className={`dc-btree-node ${n.leaf ? 'leaf' : 'internal'} ${onPath ? 'on-path' : ''}`}
                  style={{ marginInline: NODE_GAP / 2, flexGrow: leafWeight.get(n.id) ?? 1 }}
                  ref={(el) => {
                    boxRefs.current.set(n.id, el);
                  }}
                >
                  {/* 内部节点：指针|键|指针|…|键|指针 交替；叶子：仅键 */}
                  {!n.leaf ? (
                    <div className="dc-btree-cells">
                      {Array.from({ length: n.keys.length + 1 }).map((_, i) => (
                        <span className="dc-btree-cell-group" key={i}>
                          <span className="dc-btree-cell ptr">P{n.ptrs[i]}</span>
                          {i < n.keys.length && <span className="dc-btree-cell key">{n.keys[i]}</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="dc-btree-cells">
                      {n.keys.map((k, i) => (
                        <span className="dc-btree-cell leafkey" key={i}>{k}</span>
                      ))}
                    </div>
                  )}
                  <span className="dc-btree-tag">块{n.id}</span>
                </div>
              );
            })}
          </div>
        ))}

        {/* SVG 连线层（绝对覆盖） */}
        <svg className="dc-btree-svg" aria-hidden>
          {svgEdges.map(({ e, d, labelX, labelY }) => (
            <g key={e.id}>
              <path d={d} className={`dc-btree-edge ${e.onPath ? 'on-path' : ''}`} />
              {e.keyAfter !== undefined && (
                <text x={labelX} y={labelY} className="dc-btree-edge-label" textAnchor="middle">
                  {e.keyAfter}
                </text>
              )}
            </g>
          ))}
          {svgLeafLinks.map(({ l, x1, x2, y }) => (
            <g key={`leaf-${l.fromId}-${l.toId}`}>
              <line x1={x1} y1={y} x2={x2} y2={y} className="dc-btree-leaf-link" markerEnd="url(#dc-btree-arrow)" markerStart="url(#dc-btree-arrow)" />
            </g>
          ))}
          <defs>
            <marker id="dc-btree-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" className="dc-btree-arrow-head" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}
