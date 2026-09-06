import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { facetLabel } from '../../knowledge/timelineEvolution';
import type { KnowledgeEvolutionEvent } from '../../knowledge/timelineEvolution';
import type { KnowledgeNode } from '../../types';

function formatEventDate(occurredAt: number): string {
  if (!occurredAt) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(occurredAt);
}

function ChangeRow({
  nodeLabel,
  change,
  onOpenNode,
  nodeExists,
}: {
  nodeLabel: string;
  change: KnowledgeEvolutionEvent['changes'][number];
  onOpenNode: (nodeId: string) => void;
  nodeExists: boolean;
}) {
  const label = nodeLabel ?? change.targetNodeId;
  return (
    <article className="knowledge-change-card">
      <div className="knowledge-change-card-head">
        <span className="knowledge-change-target">
          {nodeExists ? (
            <button
              type="button"
              className="knowledge-open-source"
              onClick={() => onOpenNode(change.targetNodeId)}
              title="打开原知识点"
            >
              {label} <ExternalLink size={11} />
            </button>
          ) : (
            label
          )}
          {' · '}
          {facetLabel(change.facet)}
        </span>
        <span className="knowledge-change-badge">语义变化</span>
      </div>
      <div className="knowledge-change-flow">
        <div>
          <span className="knowledge-change-label">之前</span>
          <p>{change.before || '—'}</p>
        </div>
        <ArrowRight className="knowledge-change-arrow" size={15} />
        <div>
          <span className="knowledge-change-label">之后</span>
          <p>{change.after || '—'}</p>
        </div>
      </div>
    </article>
  );
}

export function EventDrawer({
  event,
  nodePool,
  onOpenNode,
}: {
  event: KnowledgeEvolutionEvent | null;
  nodePool: Record<string, KnowledgeNode>;
  onOpenNode: (nodeId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const introducedNodes = useMemo(
    () => (event
      ? event.introducedNodes
        .map((introduced) => ({
          ...introduced,
          label: nodePool[introduced.nodeId]?.label ?? introduced.nodeId,
        }))
      : []),
    [event, nodePool],
  );
  const sourceOnlyNodes = useMemo(
    () => (event
      ? event.sourceOnlyNodeIds
        .map((nodeId) => ({ nodeId, label: nodePool[nodeId]?.label ?? nodeId }))
      : []),
    [event, nodePool],
  );
  if (!event) return null;

  return (
    <section className="event-drawer" aria-label="事件详情抽屉">
      <div className="event-drawer-head">
        <button
          type="button"
          className="event-drawer-toggle"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          title={isExpanded ? '收起事件详情' : '展开事件详情'}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          <strong>{event.title}</strong>
          <small>{formatEventDate(event.occurredAt)}</small>
        </button>
      </div>
      {isExpanded && (
        <div className="event-drawer-body">
          <p className="event-drawer-summary">{event.summary}</p>
          {event.changes.length > 0 && (
            <div className="knowledge-change-list">
              {event.changes.map((change, index) => (
                <ChangeRow
                  key={`${change.targetNodeId}:${change.facet}:${index}`}
                  nodeLabel={nodePool[change.targetNodeId]?.label ?? null}
                  change={change}
                  onOpenNode={onOpenNode}
                  nodeExists={Boolean(nodePool[change.targetNodeId])}
                />
              ))}
            </div>
          )}
          {introducedNodes.length > 0 && (
            <div className="knowledge-event-sources">
              <span>本次新增知识</span>
              {introducedNodes.map((introduced) => (
                <button
                  type="button"
                  key={introduced.nodeId}
                  onClick={() => onOpenNode(introduced.nodeId)}
                >
                  {introduced.label}
                </button>
              ))}
            </div>
          )}
          {sourceOnlyNodes.length > 0 && (
            <div className="knowledge-event-sources">
              <span>来源证据（只读，不进入索引）</span>
              {sourceOnlyNodes.map((source) => (
                <button
                  type="button"
                  key={source.nodeId}
                  onClick={() => onOpenNode(source.nodeId)}
                >
                  {source.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
