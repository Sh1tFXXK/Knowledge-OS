import { useEffect, useMemo, useState } from 'react';
import { useGraphStore } from '../../store/useGraph';
import {
  normalizeVersionChainsWithDiagnostics,
  orderVersions,
  type VersionChain,
  type VersionNode,
} from '../../knowledge/versionChains';

/**
 * 版本链轨（versions-v1）：TemporalRail 双轨的第二轨。
 *
 * 版本是状态不是事件：事件轨回答「发生了什么」，本轨回答「变成了什么」。
 * V1 运行时只读：版本链不经 store（useGraph.ts 为外部在飞件），由本组件
 * 自行 fetch /api/data + normalizeVersionChains 装载（preview/dev 的 /api/data
 * 中间件直读 data/version-chains.json，改数据无需 rebuild）。
 * requires 标注从 store 既有的 knowledgeEdges 切片 filter type==='requires' 派生
 * （关系表 = 关系唯一事实源，VersionNode 不存 requires 字段）。
 *
 * 聚焦策略：有选中实体（focusNodeId ?? selectedNodeId）时只显示该实体的链；
 * 无选中时显示全部链。当前实体没有链时不渲染（不留空壳）。
 */

interface RequiresRef {
  source: string;
  target: string;
}

function versionTitleFor(node: VersionNode): string {
  const lines: string[] = [`${node.label} · ${node.releasedAt}`];
  if (node.eolAt) lines.push(`EOL：${node.eolAt}`);
  if (node.changes && node.changes.length > 0) lines.push(...node.changes);
  return lines.join('\n');
}

export function VersionChainRail({ embedded = false }: { embedded?: boolean }) {
  const [chains, setChains] = useState<VersionChain[] | null>(null);
  const knowledgeEdges = useGraphStore((state) => state.knowledgeEdges);
  const focusNodeId = useGraphStore((state) => state.focusNodeId);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/data?file=version-chains.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw: unknown) => {
        if (cancelled) return;
        const { chains: next, dropped } = normalizeVersionChainsWithDiagnostics(raw);
        for (const reason of dropped) {
          console.warn(`[version-chains] 丢弃：${reason}`);
        }
        setChains(next);
      })
      .catch(() => {
        if (!cancelled) setChains([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orderedChains = useMemo(
    () => (chains ?? []).map((chain) => ({
      entityId: chain.entityId,
      versions: orderVersions(chain.versions),
    })),
    [chains],
  );

  const requiresBySource = useMemo(() => {
    const map = new Map<string, RequiresRef[]>();
    for (const edge of knowledgeEdges) {
      if (edge.type !== 'requires') continue;
      const list = map.get(edge.source) ?? [];
      list.push({ source: edge.source, target: edge.target });
      map.set(edge.source, list);
    }
    return map;
  }, [knowledgeEdges]);

  const labelOfVersion = useMemo(() => {
    const map = new Map<string, string>();
    for (const chain of orderedChains) {
      for (const node of chain.versions) map.set(node.id, node.label);
    }
    return (versionId: string) => map.get(versionId) ?? versionId;
  }, [orderedChains]);

  const focusId = focusNodeId ?? selectedNodeId;
  const visibleChains = focusId
    ? orderedChains.filter((chain) => chain.entityId === focusId)
    : orderedChains;

  if (orderedChains.length === 0 || visibleChains.length === 0) return null;

  const body = (
    <div className="version-chain-strip" role="list" aria-label="版本链">
      <span className="version-chain-kicker">版本链</span>
      {visibleChains.map((chain) => (
        <div className="version-chain" key={chain.entityId} role="listitem">
          {chain.versions.map((node, index) => (
            <span className="version-chain-seg" key={node.id}>
              {index > 0 && <span className="version-chain-arrow" aria-hidden="true">→</span>}
              <span
                className={`version-chain-node${node.eolAt ? ' is-eol' : ''}`}
                title={versionTitleFor(node)}
              >
                <strong>{node.label}</strong>
                <small>{node.releasedAt}</small>
                {node.tags?.includes('LTS') && (
                  <em className="version-chain-tag" title="长期支持版本">LTS</em>
                )}
                {node.eolAt && <em className="version-chain-tag is-eol" title="已到生命终点">EOL</em>}
                {(requiresBySource.get(node.id) ?? []).map((ref) => (
                  <em
                    className="version-chain-requires"
                    key={ref.target}
                    title={`跨实体版本依赖（requires 边）`}
                  >
                    需 {labelOfVersion(ref.target)}
                  </em>
                ))}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );

  if (embedded) return body;
  return (
    <section className="explanation-index-timeline-lens" aria-label="索引时间维度">
      {body}
    </section>
  );
}
