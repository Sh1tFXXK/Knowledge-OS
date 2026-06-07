import React, { useMemo, useState } from 'react';
import { useGraphStore } from '../store/useGraph';
import { extractSubgraph } from '../knowledge/extractSubgraph';
import { layoutFunnelZone } from './funnelLayout';
import type { KnowledgeRole } from '../types';

const Z = {
  axiom: { color: '#8B5CF6', label: '公理区', sub: 'AXIOMS · 定义 / 常识' },
  mechanism: { color: '#3B82F6', label: '机制区', sub: 'MECHANISMS · 过程 / 方法' },
  conclusion: { color: '#10B981', label: '结论区', sub: 'CONCLUSIONS · 性质 / 能力' },
} as const;

const EDGE_COLOR: Record<string, string> = {
  'belongs-to': '#f59e0b',
  'leads-to': '#10b981',
  'needs-for': '#a855f7',
  needs: '#a855f7',
  'depends-on': '#ef4444',
  enables: '#3b82f6',
  determines: '#06b6d4',
};

const ROLE_ZONE: Record<string, keyof typeof Z> = {
  axiom: 'axiom',
  mechanism: 'mechanism',
  conclusion: 'conclusion',
};

const EDITABLE_ROLES: KnowledgeRole[] = ['axiom', 'mechanism', 'conclusion', 'subsystem', 'plain'];

function roleColor(role?: string) {
  const z = ROLE_ZONE[role ?? ''] ?? 'mechanism';
  return Z[z].color;
}

function nodeIcon(label: string) {
  if (label.includes('共享') || label.startsWith('S')) return 'S';
  if (label.includes('排他') || label.startsWith('X')) return 'X';
  if (label.includes('死锁')) return '⊗';
  if (label.includes('乐观')) return '☺';
  if (label.includes('悲观')) return '🔐';
  return label.slice(0, 1);
}

function arcPath(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number) {
  const sy = y1 + r1 + 6;
  const ty = y2 - r2 - 6;
  const cy = (sy + ty) / 2;
  return `M${x1},${sy} C${x1},${cy} ${x2},${cy} ${x2},${ty}`;
}

interface Props {
  focusNodeId: string;
  focusLabel: string;
}

export default function FunnelCanvas({ focusNodeId, focusLabel }: Props) {
  const nodePool = useGraphStore((s) => s.nodePool);
  const knowledgeEdges = useGraphStore((s) => s.knowledgeEdges);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const openCard = useGraphStore((s) => s.openCard);
  const updateKnowledgeNodeLabel = useGraphStore((s) => s.updateKnowledgeNodeLabel);
  const updateKnowledgeNodeMeta = useGraphStore((s) => s.updateKnowledgeNodeMeta);
  const updateKnowledgeTab = useGraphStore((s) => s.updateKnowledgeTab);
  const dimension = useGraphStore((s) => s.currentPerspective?.id ?? 'all');

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftRole, setDraftRole] = useState<KnowledgeRole>('mechanism');
  const [draftDimensions, setDraftDimensions] = useState('');
  const [draftDefinition, setDraftDefinition] = useState('');

  const pack = useMemo(
    () => extractSubgraph(nodePool, knowledgeEdges, { focus: focusNodeId, scope: 'local', dimension }),
    [nodePool, knowledgeEdges, focusNodeId, dimension],
  );

  const grouped = useMemo(() => {
    const g: Record<string, typeof pack.nodes> = { axiom: [], mechanism: [], conclusion: [] };
    for (const n of pack.nodes) {
      const r = n.role ?? 'plain';
      const bucket = ROLE_ZONE[r] ?? 'mechanism';
      g[bucket].push(n);
    }
    return g;
  }, [pack.nodes]);

  const W = 800;
  const zones = [
    { key: 'axiom' as const, x: 10, y: 12, zw: 780, zh: 148 },
    { key: 'mechanism' as const, x: 10, y: 172, zw: 780, zh: 138 },
    { key: 'conclusion' as const, x: 10, y: 322, zw: 780, zh: 108 },
  ];

  type PackNode = (typeof pack.nodes)[0];
  type LaidNode = PackNode & { cx: number; cy: number };

  const laidOut: LaidNode[] = useMemo(() => {
    const opts = { canvasW: W, focusId: focusNodeId, edges: pack.edges };
    return [
      ...layoutFunnelZone(zones[0], grouped.axiom, opts),
      ...layoutFunnelZone(zones[1], grouped.mechanism, opts),
      ...layoutFunnelZone(zones[2], grouped.conclusion, opts),
    ];
  }, [grouped, focusNodeId, pack.edges]);

  const posMap = useMemo(() => {
    const m = new Map<string, LaidNode>();
    laidOut.forEach((n) => m.set(n.id, n));
    return m;
  }, [laidOut]);

  const activeId = hoverId ?? selectedNodeId;
  const connIds = useMemo(() => {
    if (!activeId) return null;
    const s = new Set<string>([activeId]);
    pack.edges.forEach((e) => {
      if (e.source === activeId) s.add(e.target);
      if (e.target === activeId) s.add(e.source);
    });
    return s;
  }, [activeId, pack.edges]);

  const edgeOn = (source: string, target: string) => {
    if (!connIds) return true;
    return connIds.has(source) && connIds.has(target);
  };

  const nodeOn = (id: string) => !connIds || connIds.has(id);

  const detailNode = selectedNodeId ? nodePool[selectedNodeId] : null;
  const detailRole = detailNode?.role ?? 'mechanism';
  const detailCol = roleColor(detailRole);
  const isEditingDetail = detailNode?.id === editingNodeId;

  const startDetailEdit = () => {
    if (!detailNode) return;
    setEditingNodeId(detailNode.id);
    setDraftLabel(detailNode.label);
    setDraftRole(detailNode.role ?? 'mechanism');
    setDraftDimensions((detailNode.dimensions ?? []).join(', '));
    setDraftDefinition(detailNode.card.tabs[0]?.content ?? '');
  };

  const cancelDetailEdit = () => {
    setEditingNodeId(null);
    setDraftLabel('');
    setDraftRole('mechanism');
    setDraftDimensions('');
    setDraftDefinition('');
  };

  const saveDetailEdit = () => {
    if (!detailNode) return;
    const label = draftLabel.trim();
    if (!label) return;
    updateKnowledgeNodeLabel(detailNode.id, label);
    updateKnowledgeNodeMeta(detailNode.id, {
      role: draftRole,
      dimensions: draftDimensions
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    const firstTabId = detailNode.card.tabs[0]?.id;
    if (firstTabId) {
      updateKnowledgeTab(detailNode.id, firstTabId, draftDefinition);
    }
    cancelDetailEdit();
  };

  const isEmpty = pack.nodes.length === 0;

  return (
    <div className="funnel-canvas">
      <div className="funnel-canvas-header">
        <span className="funnel-canvas-title">{focusLabel}</span>
        <span className="funnel-canvas-badge">五不原语</span>
      </div>

      <div className="funnel-canvas-stage">
        {isEmpty && (
          <div className="funnel-canvas-empty">选中左侧目录节点，此处显示局部推理漏斗</div>
        )}

        <svg
          className="funnel-canvas-svg"
          viewBox={`0 0 ${W} 440`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {zones.map((z) => (
              <radialGradient key={z.key} id={`fz-${z.key}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={Z[z.key].color} stopOpacity="0.14" />
                <stop offset="100%" stopColor={Z[z.key].color} stopOpacity="0" />
              </radialGradient>
            ))}
            <filter id="fn-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {zones.map((z) => (
            <g key={z.key}>
              <rect
                x={z.x} y={z.y} width={z.zw} height={z.zh}
                rx={12}
                fill={Z[z.key].color}
                fillOpacity={0.035}
              />
              <ellipse
                cx={z.x + z.zw / 2}
                cy={z.y + z.zh / 2}
                rx={z.zw * 0.42}
                ry={z.zh * 0.42}
                fill={`url(#fz-${z.key})`}
              />
              <text x={z.x + 16} y={z.y + 18} fill={Z[z.key].color} fillOpacity={0.55}
                fontSize={8} letterSpacing={2} fontFamily="var(--font-mono, monospace)">
                {Z[z.key].label}  {Z[z.key].sub}
              </text>
            </g>
          ))}

          {pack.edges.map((e) => {
            const from = posMap.get(e.source);
            const to = posMap.get(e.target);
            if (!from || !to) return null;
            const on = edgeOn(e.source, e.target);
            const r1 = from.id === focusNodeId ? 26 : 22;
            const r2 = to.id === focusNodeId ? 26 : 22;
            const col = roleColor(from.role);
            const highlighted = activeId && (e.source === activeId || e.target === activeId);
            return (
              <path
                key={e.id}
                d={arcPath(from.cx, from.cy, to.cx, to.cy, r1, r2)}
                stroke={col}
                strokeWidth={highlighted ? 1.6 : 1}
                strokeOpacity={on ? (highlighted ? 0.85 : 0.22) : 0.04}
                strokeDasharray={highlighted ? undefined : '5 4'}
                fill="none"
              />
            );
          })}

          {laidOut.map((n) => {
            const isFocus = n.id === focusNodeId;
            const isSel = n.id === selectedNodeId;
            const isHov = n.id === hoverId;
            const on = nodeOn(n.id);
            const col = roleColor(n.role);
            const r = isFocus ? 26 : n.role === 'conclusion' ? 24 : 22;
            const active = isSel || isHov;

            return (
              <g
                key={n.id}
                transform={`translate(${n.cx},${n.cy})`}
                opacity={on ? 1 : 0.14}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => {
                  cancelDetailEdit();
                  openCard(isSel ? null : n.id);
                }}
              >
                {active && <circle r={r + 14} fill={col} fillOpacity={0.06} />}
                {active && <circle r={r + 7} fill={col} fillOpacity={0.05} />}
                {isSel && (
                  <circle r={r + 5} fill="none" stroke={col} strokeWidth={1}
                    strokeDasharray="3 3" strokeOpacity={0.55} />
                )}
                {isFocus && (
                  <circle r={r + 9} fill="none" stroke={col} strokeWidth={1}
                    strokeOpacity={0.35} filter="url(#fn-glow)">
                    <animate attributeName="r" values={`${r + 7};${r + 11};${r + 7}`}
                      dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={r} fill="var(--bg-card, #09090f)" stroke={col}
                  strokeWidth={isSel ? 1.8 : 1.1} />
                <text textAnchor="middle" dominantBaseline="middle"
                  fontSize={isFocus ? 13 : 11} fill={col} fontWeight={600}
                  fontFamily="var(--font-mono, monospace)">
                  {nodeIcon(n.label)}
                </text>
                <text y={r + 15} textAnchor="middle" fontSize={9}
                  fill={on ? 'var(--text-secondary, #888)' : '#333'}
                  fontFamily="var(--font-mono, monospace)">
                  {n.label.length > 10 ? n.label.slice(0, 9) + '…' : n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {detailNode && !isEditingDetail && (
          <div className="funnel-detail-panel" style={{ borderColor: `${detailCol}44` }}>
            <div className="funnel-detail-head">
              <span className="funnel-detail-icon" style={{ color: detailCol }}>
                {nodeIcon(detailNode.label)}
              </span>
              <div>
                <div className="funnel-detail-name" style={{ color: detailCol }}>{detailNode.label}</div>
                <div className="funnel-detail-role">{detailNode.role?.toUpperCase() ?? 'NODE'}</div>
              </div>
              <button type="button" className="funnel-detail-action" onClick={startDetailEdit}>编辑</button>
              <button type="button" className="funnel-detail-close" onClick={() => openCard(null)}>×</button>
            </div>
            <p className="funnel-detail-text">
              {detailNode.card.tabs[0]?.content ?? ''}
            </p>
          </div>
        )}

        {detailNode && isEditingDetail && (
          <div className="funnel-detail-panel funnel-detail-panel-editing" style={{ borderColor: `${detailCol}66` }}>
            <div className="funnel-detail-head">
              <span className="funnel-detail-icon" style={{ color: detailCol }}>
                {nodeIcon(draftLabel || detailNode.label)}
              </span>
              <div>
                <div className="funnel-detail-name" style={{ color: detailCol }}>编辑节点</div>
                <div className="funnel-detail-role">{detailNode.id}</div>
              </div>
              <button type="button" className="funnel-detail-close" onClick={cancelDetailEdit}>×</button>
            </div>
            <div className="funnel-edit-fields">
              <input
                className="input funnel-edit-input"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="节点名称"
              />
              <select
                className="input funnel-edit-input"
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value as KnowledgeRole)}
              >
                {EDITABLE_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input
                className="input funnel-edit-input"
                value={draftDimensions}
                onChange={(e) => setDraftDimensions(e.target.value)}
                placeholder="维度，用英文逗号分隔"
              />
              <textarea
                className="input funnel-edit-textarea"
                value={draftDefinition}
                onChange={(e) => setDraftDefinition(e.target.value)}
                placeholder="核心说明"
                rows={4}
              />
              <div className="funnel-edit-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={saveDetailEdit}>保存</button>
                <button type="button" className="btn btn-sm" onClick={cancelDetailEdit}>取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
