import type { SequenceDiagram as SequenceDiagramModel } from '../../mechanism';
import { toneClassName } from './toneClassName';

const PARTICIPANT_WIDTH = 136;
const PARTICIPANT_GAP = 24;
const PARTICIPANT_STEP = PARTICIPANT_WIDTH + PARTICIPANT_GAP;
const CANVAS_PADDING = 34;
const HEADER_HEIGHT = 72;
const MESSAGE_HEIGHT = 68;

interface SequenceDiagramProps {
  diagram: SequenceDiagramModel;
  stepIndex: number;
  onSelectStep: (stepIndex: number) => void;
}

export default function SequenceDiagram({
  diagram,
  stepIndex,
  onSelectStep,
}: SequenceDiagramProps) {
  const width = Math.max(980, CANVAS_PADDING * 2 + diagram.participants.length * PARTICIPANT_STEP);
  const height = Math.max(600, HEADER_HEIGHT + diagram.messages.length * MESSAGE_HEIGHT + 42);

  return (
    <div className="mechanism-diagram-scroll">
      <div className="mechanism-sequence-diagram" style={{ width, height }}>
        {diagram.participants.map((participant) => {
          const left = participantLeft(participant.index);
          return (
            <div key={participant.entity.id} className="mechanism-sequence-participant">
              <div className="mechanism-sequence-head" style={{ left }}>
                <strong>{participant.entity.label}</strong>
              </div>
              <span
                className="mechanism-sequence-lifeline"
                style={{ left: left + PARTICIPANT_WIDTH / 2, height: height - HEADER_HEIGHT + 12 }}
                aria-hidden="true"
              />
            </div>
          );
        })}

        {diagram.messages.map((message) => {
          const sourceX = participantCenter(message.sourceParticipantIndex);
          const targetX = participantCenter(message.targetParticipantIndex);
          const isReverse = targetX < sourceX;
          const left = Math.min(sourceX, targetX);
          const lineWidth = Math.max(36, Math.abs(targetX - sourceX));
          const top = HEADER_HEIGHT + message.index * MESSAGE_HEIGHT;

          return (
            <button
              key={message.stepId}
              type="button"
              className={`mechanism-sequence-message ${toneClassName(message.tone)} ${isReverse ? 'is-reverse' : ''} ${message.index === stepIndex ? 'is-current' : ''}`}
              style={{ left, top, width: lineWidth }}
              onClick={() => onSelectStep(message.index)}
              aria-current={message.index === stepIndex ? 'step' : undefined}
            >
              <span className="mechanism-sequence-message-label">
                <em>{String(message.index + 1).padStart(2, '0')}</em>
                <strong>{message.relation.label}</strong>
                <small>{message.label}</small>
              </span>
              <span className="mechanism-sequence-arrow" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function participantLeft(index: number): number {
  return CANVAS_PADDING + index * PARTICIPANT_STEP;
}

function participantCenter(index: number): number {
  return participantLeft(index) + PARTICIPANT_WIDTH / 2;
}
