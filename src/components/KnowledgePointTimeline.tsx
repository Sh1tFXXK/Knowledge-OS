import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ChevronRight, Clock3, X } from 'lucide-react';
import { useGraphStore } from '../store/useGraph';
import type { KnowledgePointSnapshot } from '../knowledge/state';

type InputChangeEvent = { target: { value: string } };
type PopoverPosition = { top: number; right: number };

function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
}
function previewContent(snapshot: KnowledgePointSnapshot): string {
  const content = snapshot.node.card.rootContent?.trim() || snapshot.node.card.tabs[0]?.content?.trim();
  return content ? content.replace(/\s+/g, ' ').slice(0, 120) : '这个版本没有正文。';
}

export default function KnowledgePointTimeline() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedNode = useGraphStore((state) =>
    state.selectedNodeId ? state.nodePool[state.selectedNodeId] : undefined,
  );
  const timeline = useGraphStore((state) => state.timeline);
  const selectedSnapshotId = useGraphStore((state) => state.selectedTimelineSnapshotId);
  const selectTimelineSnapshot = useGraphStore((state) => state.selectTimelineSnapshot);
  const createKnowledgePointSnapshot = useGraphStore(
    (state) => state.createKnowledgePointSnapshot,
  );
  const setActiveView = useGraphStore((state) => state.setActiveView);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 72, right: 16 });
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      setPosition({
        top: anchor.bottom + 8,
        right: Math.max(12, window.innerWidth - anchor.right),
      });
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [isOpen]);

  if (!selectedNodeId || !selectedNode) return null;

  const snapshots = timeline
    .filter((snapshot) => snapshot.knowledgeNodeId === selectedNodeId)
    .sort((left, right) => right.capturedAt - left.capturedAt);
  const selectedSnapshot = snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null;

  const handleCreate = () => {
    const id = createKnowledgePointSnapshot(selectedNodeId, title, undefined);
    if (!id) return;
    setTitle('');
  };

  const popover = (
    <div
      ref={popoverRef}
      className="point-timeline-popover"
      style={{ top: position.top, right: position.right }}
      role="dialog"
      aria-label={`${selectedNode.label} 知识点时间线`}
    >
      <section className="point-timeline">
        <div className="point-timeline-heading">
          <div>
            <span className="point-timeline-kicker">POINT TIMELINE</span>
            <strong>{selectedNode.label}</strong>
          </div>
          <button
            type="button"
            className="btn-icon"
            title="关闭知识点时间线"
            aria-label="关闭知识点时间线"
            onClick={() => setIsOpen(false)}
          >
            <X size={14} />
          </button>
        </div>

        <div className="point-timeline-summary">
          {snapshots.length ? `${snapshots.length} 个历史版本` : '当前版本尚未保存历史快照'}
          <button type="button" onClick={() => setActiveView('timeline')}>
            完整查看 <ChevronRight size={12} />
          </button>
        </div>

        <div className="point-timeline-track">
          <button
            type="button"
            className={`point-timeline-item${selectedSnapshotId === null || !selectedSnapshot ? ' is-active' : ''}`}
            onClick={() => selectTimelineSnapshot(null)}
          >
            <span className="point-timeline-dot point-timeline-dot--live" />
            <span>
              <strong>当前</strong>
              <small>{selectedNode.label}</small>
            </span>
          </button>
          {snapshots.slice(0, 6).map((snapshot) => (
            <button
              type="button"
              key={snapshot.id}
              className={`point-timeline-item${selectedSnapshotId === snapshot.id ? ' is-active' : ''}`}
              onClick={() => selectTimelineSnapshot(snapshot.id)}
            >
              <span className="point-timeline-dot" />
              <span>
                <strong>{snapshot.title}</strong>
                <small>{formatShortDate(snapshot.capturedAt)} · {snapshot.node.label}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="point-timeline-capture">
          <input
            className="input"
            value={title}
            onChange={(event: InputChangeEvent) => setTitle(event.target.value)}
            placeholder="记录这个知识点的新版本"
            aria-label="知识点版本名称"
          />
          <button
            type="button"
            className="btn-icon"
            title="保存知识点版本"
            aria-label="保存知识点版本"
            disabled={!title.trim()}
            onClick={handleCreate}
          >
            <Camera size={14} />
          </button>
        </div>

        {selectedSnapshot && (
          <div className="point-timeline-preview">
            <span>{selectedSnapshot.title} · {formatShortDate(selectedSnapshot.capturedAt)}</span>
            <p>{previewContent(selectedSnapshot)}</p>
            {selectedSnapshot.note && <small>{selectedSnapshot.note}</small>}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div ref={anchorRef} className="point-timeline-anchor">
      <button
        type="button"
        className={`btn-icon point-timeline-trigger${isOpen ? ' is-active' : ''}`}
        title="查看当前知识点时间线"
        aria-label="查看当前知识点时间线"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Clock3 size={14} />
      </button>
      {isOpen && createPortal(popover, document.body)}
    </div>
  );
}
