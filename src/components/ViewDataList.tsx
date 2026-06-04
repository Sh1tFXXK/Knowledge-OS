import type { ViewDataPack } from '../types';

const SCOPE_LABEL: Record<string, string> = {
  local: '局部 · 推理内核',
  neighbor: '邻域 · 子系统',
  global: '全局 · 关系网',
};

export default function ViewDataList({
  pack,
  compact = false,
}: {
  pack: ViewDataPack;
  compact?: boolean;
}) {
  const { meta, nodes, edges } = pack;

  if (!meta.focus && meta.scope !== 'global') {
    return (
      <p className="text-muted" style={{ fontSize: 11, fontStyle: 'italic', padding: 8 }}>
        请从目录选中一个知识节点
      </p>
    );
  }

  return (
    <div className="view-data-list" style={{ fontSize: 11, padding: compact ? 4 : 8 }}>
      <div
        style={{
          marginBottom: 6,
          color: 'var(--text-tertiary)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span>{SCOPE_LABEL[meta.scope] ?? meta.scope}</span>
        <span>
          节点 {meta.activeNodeCount}/{meta.nodeCount}
        </span>
        <span>
          边 {meta.activeEdgeCount}/{meta.edgeCount}
        </span>
        {meta.dimension !== 'all' && <span>视角 · {meta.dimension}</span>}
      </div>

      {nodes.length === 0 ? (
        <p className="text-muted" style={{ fontStyle: 'italic' }}>
          无边表数据。请在底部工具栏为节点池添加关系。
        </p>
      ) : (
        <>
          <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-secondary)' }}>
            节点
          </div>
          <ul style={{ margin: '0 0 8px', paddingLeft: 16, opacity: compact ? 0.95 : 1 }}>
            {nodes.map((n) => (
              <li
                key={n.id}
                style={{
                  opacity: n.dimmed ? 0.35 : 1,
                  color: n.isFocus ? 'var(--accent-purple)' : undefined,
                }}
              >
                {n.isFocus && '◎ '}
                {n.label}
                <span className="text-muted" style={{ marginLeft: 4 }}>
                  [{n.role}]
                </span>
              </li>
            ))}
          </ul>
          {edges.length > 0 && (
            <>
              <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-secondary)' }}>
                关系
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {edges.map((e) => (
                  <li key={e.id} style={{ opacity: e.dimmed ? 0.35 : 1 }}>
                    {pack.nodes.find((n) => n.id === e.source)?.label ?? e.source}
                    <span style={{ color: 'var(--text-tertiary)' }}> —{e.label}→ </span>
                    {pack.nodes.find((n) => n.id === e.target)?.label ?? e.target}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
