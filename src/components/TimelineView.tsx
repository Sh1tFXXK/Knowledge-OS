import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  ChevronRight,
  Clock3,
  FileClock,
  GitBranch,
  Plus,
  ScanLine,
  Trash2,
} from 'lucide-react';
import { useGraphStore } from '../store/useGraph';
import type { KnowledgePointSnapshot } from '../knowledge/state';
import type { KnowledgeNode } from '../types';
import { getKnowledgePointSnapshotStats } from '../knowledge/timeline';

type InputChangeEvent = { target: { value: string } };

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function contentPreview(node: KnowledgeNode): string {
  const content = node.card.rootContent?.trim() || node.card.tabs[0]?.content?.trim();
  if (!content) return '这个版本还没有填写定义内容。';
  return content.replace(/\s+/g, ' ').slice(0, 240);
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="timeline-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function NodePicker({
  nodes,
  onSelect,
}: {
  nodes: KnowledgeNode[];
  onSelect: (nodeId: string) => void;
}) {
  return (
    <div className="timeline-point-picker">
      <div className="timeline-section-heading">
        <div>
          <span className="timeline-section-kicker">KNOWLEDGE POINT</span>
          <h2>选择一个知识点</h2>
        </div>
        <span className="timeline-count">{nodes.length}</span>
      </div>
      {nodes.length > 0 ? (
        <ul>
          {nodes.map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => onSelect(node.id)}>
                <span>
                  <strong>{node.label}</strong>
                  <small>{node.role ?? 'plain'} · {node.tags?.length ?? 0} 个标签</small>
                </span>
                <ChevronRight size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="timeline-empty">
          <Archive size={20} />
          <strong>还没有知识点</strong>
          <span>先在知识视图中创建一个知识点。</span>
        </div>
      )}
    </div>
  );
}

export default function TimelineView() {
  const store = useGraphStore((state) => state);
  const {
    selectedNodeId,
    nodePool,
    timeline,
    selectedTimelineSnapshotId: selectedSnapshotId,
    openCard,
    selectTimelineSnapshot,
    createKnowledgePointSnapshot,
    removeTimelineSnapshot,
  } = store;
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const selectedNode = selectedNodeId ? nodePool[selectedNodeId] : undefined;
  const nodes = useMemo(
    () => Object.values(nodePool).sort((left, right) => left.label.localeCompare(right.label)),
    [nodePool],
  );
  const snapshots = useMemo(
    (): KnowledgePointSnapshot[] => timeline
      .filter((snapshot) => snapshot.knowledgeNodeId === selectedNodeId)
      .sort((left, right) => right.capturedAt - left.capturedAt),
    [selectedNodeId, timeline],
  );
  const selectedSnapshot = snapshots.find(
    (snapshot: KnowledgePointSnapshot) => snapshot.id === selectedSnapshotId,
  ) ?? null;
  const displayedNode = selectedSnapshot?.node ?? selectedNode;
  const displayedStats = displayedNode ? getKnowledgePointSnapshotStats(displayedNode) : null;

  useEffect(() => {
    if (!selectedNodeId || !selectedNode) return;
    if (timeline.some((snapshot) => snapshot.knowledgeNodeId === selectedNodeId)) return;
    const baselineId = createKnowledgePointSnapshot(
      selectedNodeId,
      '初始版本',
      '首次建立这个知识点的时间线',
    );
    if (baselineId) selectTimelineSnapshot(null);
  }, [createKnowledgePointSnapshot, selectedNode, selectedNodeId, selectTimelineSnapshot, timeline]);

  const handleCreate = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!selectedNodeId) return;
    const createdId = createKnowledgePointSnapshot(selectedNodeId, title, note);
    if (!createdId) return;
    setTitle('');
    setNote('');
  };

  if (!selectedNode) {
    return (
      <div className="timeline-view">
        <header className="timeline-header">
          <div>
            <span className="timeline-kicker">KNOWLEDGE POINT HISTORY</span>
            <h1>知识点时间线</h1>
            <p>选择一个知识点，查看它的定义、标签和结构如何随时间变化。</p>
          </div>
          <div className="timeline-header-meta">
            <FileClock size={17} />
            <span>{timeline.length} 个已保存版本</span>
          </div>
        </header>
        <NodePicker nodes={nodes} onSelect={openCard} />
      </div>
    );
  }

  return (
    <div className="timeline-view">
      <header className="timeline-header">
        <div>
          <span className="timeline-kicker">KNOWLEDGE POINT HISTORY</span>
          <h1>{selectedNode.label}</h1>
          <p>这个知识点的独立演化轨迹。其他知识点不会出现在这里。</p>
        </div>
        <div className="timeline-header-meta">
          <Clock3 size={17} />
          <span>{snapshots.length} 个历史版本</span>
        </div>
      </header>

      <form className="timeline-capture" onSubmit={handleCreate}>
        <div className="timeline-capture-icon"><ScanLine size={17} /></div>
        <div className="timeline-capture-context">
          <strong>{selectedNode.label}</strong>
          <span>保存这个知识点当前的解释状态</span>
        </div>
        <div className="timeline-capture-fields">
          <label>
            <span>版本名称</span>
            <input
              className="input"
              value={title}
              onChange={(event: InputChangeEvent) => setTitle(event.target.value)}
              placeholder="例如：补充 MVCC 可见性边界"
              aria-label="知识点版本名称"
            />
          </label>
          <label>
            <span>备注</span>
            <input
              className="input"
              value={note}
              onChange={(event: InputChangeEvent) => setNote(event.target.value)}
              placeholder="记录这次修改的原因"
              aria-label="知识点版本备注"
            />
          </label>
        </div>
        <button className="btn btn-primary timeline-capture-submit" type="submit" disabled={!title.trim()}>
          <Plus size={14} />
          保存版本
        </button>
      </form>

      <div className="timeline-workbench">
        <section className="timeline-rail" aria-label={`${selectedNode.label} 的版本列表`}>
          <div className="timeline-section-heading">
            <div>
              <span className="timeline-section-kicker">VERSION HISTORY</span>
              <h2>版本轨迹</h2>
            </div>
            <span className="timeline-count">{snapshots.length + 1}</span>
          </div>

          <div className="timeline-events">
            <article className={`timeline-event${selectedSnapshotId === null ? ' is-active' : ''}`}>
              <span className="timeline-event-marker timeline-event-marker--live" />
              <button
                type="button"
                className="timeline-event-button"
                onClick={() => selectTimelineSnapshot(null)}
              >
                <span className="timeline-event-topline">
                  <strong>当前版本</strong>
                  <span className="timeline-live-badge"><Check size={10} /> LIVE</span>
                </span>
                <span className="timeline-event-time">实时编辑状态 · {selectedNode.label}</span>
              </button>
            </article>

            {snapshots.map((snapshot: KnowledgePointSnapshot) => (
              <article
                className={`timeline-event${selectedSnapshotId === snapshot.id ? ' is-active' : ''}`}
                key={snapshot.id}
              >
                <span className="timeline-event-marker" />
                <button
                  type="button"
                  className="timeline-event-button"
                  onClick={() => selectTimelineSnapshot(snapshot.id)}
                >
                  <span className="timeline-event-topline">
                    <strong>{snapshot.title}</strong>
                    <span className="timeline-event-node-count">{snapshot.node.label}</span>
                  </span>
                  <span className="timeline-event-time">{formatTimestamp(snapshot.capturedAt)}</span>
                </button>
                <button
                  type="button"
                  className="btn-icon timeline-event-delete"
                  title="删除版本"
                  aria-label={`删除版本 ${snapshot.title}`}
                  onClick={() => removeTimelineSnapshot(snapshot.id)}
                >
                  <Trash2 size={13} />
                </button>
              </article>
            ))}
          </div>

          {snapshots.length === 0 && (
            <div className="timeline-empty">
              <Archive size={20} />
              <strong>这个知识点还没有历史版本</strong>
              <span>保存一次当前内容，建立它自己的时间线。</span>
            </div>
          )}
        </section>

        <section className="timeline-inspector" aria-label="知识点版本详情">
          <div className="timeline-section-heading">
            <div>
              <span className="timeline-section-kicker">POINT INSPECTOR</span>
              <h2>{displayedNode?.label}</h2>
            </div>
            <span className={`timeline-state-badge${selectedSnapshot ? ' is-readonly' : ''}`}>
              {selectedSnapshot ? '只读版本' : '当前版本'}
            </span>
          </div>

          <div className="timeline-inspector-meta">
            <span>{selectedSnapshot ? formatTimestamp(selectedSnapshot.capturedAt) : '现在'}</span>
            {selectedSnapshot?.note && <span>{selectedSnapshot.note}</span>}
          </div>

          {displayedNode && displayedStats && (
            <>
              <div className="timeline-stats-grid">
                <Stat value={displayedStats.tabCount} label="解释页签" />
                <Stat value={displayedStats.dimensionCount} label="视图维度" />
                <Stat value={displayedStats.tagCount} label="标签" />
                <Stat value={displayedStats.hasRootContent ? '有' : '无'} label="根定义" />
              </div>

              <div className="timeline-node-preview">
                <div className="timeline-preview-heading">
                  <span>内容快照</span>
                  <span>{displayedNode.role ?? 'plain'}</span>
                </div>
                <div className="timeline-node-content">{contentPreview(displayedNode)}</div>
                <div className="timeline-node-tags">
                  {(displayedNode.tags ?? []).length > 0 ? displayedNode.tags?.map((tag: string) => (
                    <span key={tag}>{tag}</span>
                  )) : <span className="is-empty">暂无标签</span>}
                </div>
              </div>
            </>
          )}

          <div className="timeline-readonly-note">
            <GitBranch size={14} />
            <span>{selectedSnapshot ? '历史版本保持只读，回到当前版本继续编辑。' : '当前版本会继续接收编辑，重要变化可单独保存。'}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
