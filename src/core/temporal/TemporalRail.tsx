import { Play } from 'lucide-react';
import type { KnowledgeEvolutionEvent } from '../../knowledge/timelineEvolution';

function formatEventDate(occurredAt: number): string {
  if (!occurredAt) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(occurredAt);
}

export function TemporalRail({
  events,
  activeEvent,
  followSelection,
  onSelect,
  onToggleFollow,
  onPlay,
}: {
  events: KnowledgeEvolutionEvent[];
  activeEvent: KnowledgeEvolutionEvent | null;
  followSelection: boolean;
  onSelect: (eventId: string | null) => void;
  onToggleFollow: (follow: boolean) => void;
  onPlay: () => void;
}) {
  if (events.length === 0) return null;

  return (
    <section className="explanation-index-timeline-lens" aria-label="索引时间维度">
      <div className="explanation-index-timeline-state">
        <span>时间维度</span>
        <strong>{activeEvent?.title ?? '稳定知识'}</strong>
      </div>
      <div className="explanation-index-timeline-stages" role="tablist" aria-label="知识演化阶段">
        <button
          type="button"
          role="tab"
          aria-selected={!activeEvent}
          className={!activeEvent ? 'is-active' : undefined}
          onClick={() => onSelect(null)}
        >
          稳定知识
        </button>
        {events.map((event) => (
          <button
            type="button"
            role="tab"
            key={event.id}
            aria-selected={activeEvent?.id === event.id}
            className={activeEvent?.id === event.id ? 'is-active' : undefined}
            title={formatEventDate(event.occurredAt)}
            onClick={() => onSelect(event.id)}
          >
            {event.title}
          </button>
        ))}
        <button
          type="button"
          className="explanation-index-timeline-play"
          title="播放知识演化"
          aria-label="播放知识演化"
          onClick={onPlay}
        >
          <Play size={12} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`explanation-index-timeline-follow${followSelection ? ' is-active' : ''}`}
          title="跟随所选知识点定位事件"
          aria-pressed={followSelection}
          aria-label="跟随选择"
          onClick={() => onToggleFollow(!followSelection)}
        >
          跟随
        </button>
      </div>
      <p>
        {activeEvent?.summary
          ?? '版本说明不进入稳定索引，真正新增的知识会在对应时间点出现。'}
      </p>
    </section>
  );
}
