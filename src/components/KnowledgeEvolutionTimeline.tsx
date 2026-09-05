import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, ExternalLink, GitBranch, Layers3, Play, Search } from 'lucide-react';
import { useGraphStore } from '../store/useGraph';
import {
  buildKnowledgeTimeline,
  facetLabel,
  nodeContentSummary,
  TimelineFacet,
  type KnowledgeTimelineBatch,
  type KnowledgeTimelineEvent,
  type TimelineFacetChange,
} from '../knowledge/timelineEvolution';
import { BUILT_IN_TIMELINE_ANNOTATIONS } from '../knowledge/timelineAnnotations';
import type { KnowledgeNode } from '../types';

const MAX_VISIBLE_ENTRIES = 28;

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function eventLabel(event: KnowledgeTimelineEvent): string {
  return event.isBaseline ? '初始记录' : event.title || '知识更新';
}

function eventSummary(event: KnowledgeTimelineEvent): string {
  const coalesced = event.coalescedSnapshotCount && event.coalescedSnapshotCount > 1
    ? ` · 合并 ${event.coalescedSnapshotCount} 份同刻观察`
    : '';
  if (event.isBaseline) return `建立知识点基线${coalesced}`;
  const summary = event.changes.length
    ? event.changes.map((change) => facetLabel(change.facet)).join('、')
    : '无语义变化';
  return `${summary}${coalesced}`;
}

function BatchPicker({
  batches,
  selectedId,
  query,
  changesOnly,
  onQueryChange,
  onChangesOnlyChange,
  onSelect,
}: {
  batches: KnowledgeTimelineBatch[];
  selectedId: string | null;
  query: string;
  changesOnly: boolean;
  onQueryChange: (value: string) => void;
  onChangesOnlyChange: (value: boolean) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="knowledge-evolution-picker" aria-label="全局知识时间线">
      <div className="timeline-section-heading">
        <div>
          <span className="timeline-section-kicker">SHARED KNOWLEDGE TIMELINE</span>
          <h2>时间批次</h2>
        </div>
        <span className="timeline-count">{batches.length}</span>
      </div>
      <div className="knowledge-evolution-filters">
        <label className="knowledge-evolution-search">
          <Search size={13} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索知识点"
            aria-label="搜索知识点"
          />
        </label>
        <button
          type="button"
          className={`knowledge-evolution-filter${changesOnly ? ' is-active' : ''}`}
          aria-pressed={changesOnly}
          onClick={() => onChangesOnlyChange(!changesOnly)}
        >
          只看有变化
        </button>
      </div>
      <div className="knowledge-batch-list">
        {batches.length > 0 ? batches.map((batch, index) => (
          <button
            key={batch.id}
            type="button"
            className={`knowledge-batch${batch.id === selectedId ? ' is-active' : ''}`}
            onClick={() => onSelect(batch.id)}
          >
            <span className={`knowledge-evolution-marker${index === 0 ? ' is-current' : ''}`} />
            <span className="knowledge-batch-copy">
              <strong>{batch.title}</strong>
              <small>{formatTimestamp(batch.capturedAt)}</small>
              <span>
                {batch.events.length} 个知识点
                {batch.changedNodeCount > 0 ? ` · ${batch.changedNodeCount} 个发生变化` : ' · 基线批次'}
              </span>
            </span>
          </button>
        )) : (
          <div className="timeline-empty">
            <Clock3 size={20} />
            <strong>没有匹配的时间批次</strong>
            <span>调整搜索词或关闭“只看有变化”。</span>
          </div>
        )}
      </div>
    </section>
  );
}

function FacetOverview({ events }: { events: KnowledgeTimelineEvent[] }) {
  const stats = Object.values(TimelineFacet).map((facet) => {
    const changed = events.filter((event) => event.changes.some((change) => change.facet === facet)).length;
    return { facet, changed, stable: events.length - changed };
  });

  return (
    <section className="knowledge-evolution-section">
      <div className="timeline-preview-heading">
        <span><Layers3 size={13} /> 稳定与变化</span>
        <span>{events.length} 个知识点</span>
      </div>
      <div className="knowledge-facet-grid">
        {stats.map(({ facet, changed, stable }) => (
          <div key={facet} className="knowledge-facet-stat">
            <strong>{facetLabel(facet)}</strong>
            <span><i className="knowledge-facet-stable" />{stable} 不变</span>
            <span><i className="knowledge-facet-changed" />{changed} 变化</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChangeCard({
  nodeLabel,
  change,
}: {
  nodeLabel: string;
  change: TimelineFacetChange;
}) {
  return (
    <article className="knowledge-change-card">
      <div className="knowledge-change-card-head">
        <span className="knowledge-change-target">{nodeLabel} · {change.label}</span>
        <span className="knowledge-change-badge">语义变化</span>
      </div>
      <div className="knowledge-change-flow">
        <div>
          <span className="knowledge-change-label">之前</span>
          <p>{change.before}</p>
        </div>
        <ArrowRight className="knowledge-change-arrow" size={15} />
        <div>
          <span className="knowledge-change-label">之后</span>
          <p>{change.after}</p>
        </div>
      </div>
    </article>
  );
}

function AffectedEntries({
  events,
  selectedId,
  onSelect,
}: {
  events: KnowledgeTimelineEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const visible = events.slice(0, MAX_VISIBLE_ENTRIES);
  return (
    <section className="knowledge-evolution-section">
      <div className="timeline-preview-heading">
        <span><GitBranch size={13} /> 批次内知识点</span>
        <span>{events.length} 个</span>
      </div>
      <div className="knowledge-affected-list">
        {visible.map((event) => (
          <button
            key={event.id}
            type="button"
            className={`knowledge-affected-entry${event.id === selectedId ? ' is-active' : ''}`}
            onClick={() => onSelect(event.id)}
          >
            <span className="knowledge-effective-dot" />
            <span>
              <strong>{event.node.label}</strong>
              <small>{event.changes.length ? eventSummary(event) : '无语义变化'}</small>
            </span>
          </button>
        ))}
      </div>
      {events.length > visible.length && (
        <p className="knowledge-list-overflow">还有 {events.length - visible.length} 个知识点，使用搜索过滤后查看。</p>
      )}
    </section>
  );
}

function EventInspector({
  event,
  nodePool,
  onOpen,
}: {
  event: KnowledgeTimelineEvent;
  nodePool: Record<string, KnowledgeNode>;
  onOpen: (nodeId: string) => void;
}) {
  const liveNode = nodePool[event.knowledgeNodeId];
  const sourceNodes = (event.sourceNodeIds ?? [])
    .map((nodeId) => nodePool[nodeId])
    .filter((node): node is KnowledgeNode => Boolean(node));

  return (
    <section className="knowledge-evolution-inspector" aria-label={`${event.node.label} 时间线详情`}>
      <div className="knowledge-evolution-inspector-head">
        <div>
          <span className="timeline-section-kicker">{formatTimestamp(event.capturedAt)}</span>
          <h2>{event.node.label}</h2>
        </div>
        <span className={`timeline-state-badge${event.isBaseline ? '' : ' is-readonly'}`}>
          {event.isBaseline ? '基线' : '变化事件'}
        </span>
      </div>

      <section className="knowledge-evolution-section">
        <div className="timeline-preview-heading">
          <span><Layers3 size={13} /> 不变的部分</span>
          <span>{event.stableFacets.length} 个稳定面</span>
        </div>
        {event.stableFacets.length > 0 ? (
          <div className="knowledge-stable-chips">
            {event.stableFacets.map((facet) => (
              <span key={facet}><Check size={11} /> {facetLabel(facet)}</span>
            ))}
          </div>
        ) : (
          <p className="timeline-no-nodes">本次更新涉及全部语义面。</p>
        )}
      </section>

      <section className="knowledge-evolution-section">
        <div className="timeline-preview-heading">
          <span><GitBranch size={13} /> 变化的部分</span>
          <span>{event.changes.length} 个语义面</span>
        </div>
        {event.changes.length > 0 ? (
          <div className="knowledge-change-list">
            {event.changes.map((change, index) => (
              <ChangeCard key={`${change.facet}:${index}`} nodeLabel={event.node.label} change={change} />
            ))}
          </div>
        ) : (
          <p className="timeline-no-nodes">这是该知识点的基线状态，尚未检测到前序变化。</p>
        )}
      </section>

      <section className="knowledge-evolution-section">
        <div className="timeline-preview-heading">
          <span><GitBranch size={13} /> 变化后的情况</span>
          {liveNode ? (
            <button type="button" className="knowledge-open-source" onClick={() => onOpen(event.knowledgeNodeId)}>
              打开原知识点 <ExternalLink size={11} />
            </button>
          ) : (
            <span className="knowledge-open-source is-disabled">历史节点已归档</span>
          )}
        </div>
        <div className="timeline-node-content">
          {event.effectiveSummary ?? nodeContentSummary(event.node)}
        </div>
        {event.effectiveSummary && (
          <ul className="knowledge-effective-list">
            {event.changes.map((change, index) => (
              <li key={`${change.facet}:${index}`}>
                <span className="knowledge-effective-dot" />
                <span>{change.label}</span>
                <small>{change.after}</small>
              </li>
            ))}
          </ul>
        )}
        {event.note && <p className="knowledge-event-note">备注：{event.note}</p>}
        {event.effectiveSummary && <p className="knowledge-event-note">本次演化：{event.effectiveSummary}</p>}
        {sourceNodes.length > 0 && (
          <div className="knowledge-event-sources">
            <span>复用来源</span>
            {sourceNodes.map((sourceNode) => (
              <button type="button" key={sourceNode.id} onClick={() => onOpen(sourceNode.id)}>
                {sourceNode.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function BatchInspector({
  batch,
  nodePool,
  selectedEventId,
  onSelectEvent,
  onOpenNode,
  onOpenInIndex,
}: {
  batch: KnowledgeTimelineBatch;
  nodePool: Record<string, KnowledgeNode>;
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onOpenNode: (nodeId: string) => void;
  onOpenInIndex?: () => void;
}) {
  const selectedEvent = batch.events.find((event) => event.id === selectedEventId) ?? batch.events[0];
  if (!selectedEvent) return null;

  return (
    <div className="knowledge-evolution-detail">
      <div className="knowledge-evolution-titlebar">
        <div>
          <span className="timeline-section-kicker">TIMELINE BATCH</span>
          <h2>{batch.title}</h2>
          <p>{formatTimestamp(batch.capturedAt)} · {batch.events.length} 个知识点参与</p>
        </div>
        <div className="knowledge-evolution-title-actions">
          {onOpenInIndex && (
            <button type="button" className="btn btn-sm" onClick={onOpenInIndex}>
              <Play size={12} />
              在索引中播放
            </button>
          )}
          <span className="timeline-state-badge is-readonly">共享投影</span>
        </div>
      </div>

      <FacetOverview events={batch.events} />

      <div className="knowledge-evolution-workbench">
        <AffectedEntries events={batch.events} selectedId={selectedEvent.id} onSelect={onSelectEvent} />
        <EventInspector
          event={selectedEvent}
          nodePool={nodePool}
          onOpen={onOpenNode}
        />
      </div>
    </div>
  );
}

export default function KnowledgeEvolutionTimeline() {
  const nodePool = useGraphStore((state) => state.nodePool);
  const timeline = useGraphStore((state) => state.timeline);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const openCard = useGraphStore((state) => state.openCard);
  const setActiveView = useGraphStore((state) => state.setActiveView);
  const setActiveTimelineAnnotation = useGraphStore((state) => state.setActiveTimelineAnnotation);
  const projection = useMemo(
    () => buildKnowledgeTimeline(nodePool, timeline, BUILT_IN_TIMELINE_ANNOTATIONS),
    [nodePool, timeline],
  );
  const [query, setQuery] = useState('');
  const [changesOnly, setChangesOnly] = useState(false);
  const filteredBatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projection.batches.flatMap((batch) => {
      const events = batch.events.filter((event) => {
        if (changesOnly && event.changes.length === 0) return false;
        if (!normalized) return true;
        return event.node.label.toLowerCase().includes(normalized)
          || event.title.toLowerCase().includes(normalized);
      });
      const changedNodeCount = events.filter((event) => event.changes.length > 0).length;
      if (!events.length) return [];
      return [{ ...batch, events, changedNodeCount, baselineNodeCount: events.filter((event) => event.isBaseline).length }];
    });
  }, [changesOnly, projection.batches, query]);
  const selectedBatchForNode = selectedNodeId
    ? filteredBatches.find((batch) => batch.events.some((event) => event.knowledgeNodeId === selectedNodeId))
    : null;
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isFollowingSelection, setIsFollowingSelection] = useState(true);

  useEffect(() => {
    if (activeBatchId && filteredBatches.some((batch) => batch.id === activeBatchId)) return;
    setActiveBatchId(selectedBatchForNode?.id ?? filteredBatches[0]?.id ?? null);
  }, [activeBatchId, filteredBatches, selectedBatchForNode]);

  useEffect(() => {
    if (!isFollowingSelection || !selectedNodeId || !selectedBatchForNode) return;
    const selectedEvent = selectedBatchForNode.events.find(
      (event) => event.knowledgeNodeId === selectedNodeId,
    );
    setActiveBatchId(selectedBatchForNode.id);
    if (selectedEvent) setActiveEventId(selectedEvent.id);
  }, [isFollowingSelection, selectedBatchForNode, selectedNodeId]);

  const activeBatch = filteredBatches.find((batch) => batch.id === activeBatchId) ?? null;

  useEffect(() => {
    setActiveTimelineAnnotation(activeBatch?.annotationId ?? null);
  }, [activeBatch?.annotationId, setActiveTimelineAnnotation]);

  useEffect(() => {
    if (activeBatch?.events.some((event) => event.id === activeEventId)) return;
    const preferred = activeBatch?.events.find((event) => event.knowledgeNodeId === selectedNodeId);
    setActiveEventId(preferred?.id ?? activeBatch?.events[0]?.id ?? null);
  }, [activeBatch, activeEventId, selectedNodeId]);

  return (
    <div className="knowledge-evolution">
      <BatchPicker
        batches={filteredBatches}
        selectedId={activeBatchId}
        query={query}
        changesOnly={changesOnly}
        onQueryChange={setQuery}
        onChangesOnlyChange={setChangesOnly}
        onSelect={(id) => {
          setIsFollowingSelection(false);
          setActiveBatchId(id);
          setActiveEventId(null);
        }}
      />
      {activeBatch ? (
        <BatchInspector
          batch={activeBatch}
          nodePool={nodePool}
          selectedEventId={activeEventId}
          onSelectEvent={(id) => {
            setIsFollowingSelection(false);
            setActiveEventId(id);
          }}
          onOpenNode={(id) => {
            setIsFollowingSelection(false);
            openCard(id);
          }}
          onOpenInIndex={activeBatch.annotationId && activeBatch.scopeNodeId
            ? () => {
                setIsFollowingSelection(false);
                setActiveTimelineAnnotation(activeBatch.annotationId ?? null);
                openCard(activeBatch.scopeNodeId ?? null);
                setActiveView('index');
              }
            : undefined}
        />
      ) : (
        <div className="knowledge-evolution-empty">
          <Clock3 size={20} />
          <strong>还没有可展示的时间线</strong>
          <span>为任意知识点保存一次快照后，这里会复用同一套演化视图。</span>
        </div>
      )}
    </div>
  );
}
