import {
  VisualTone,
  type Entity,
  type EntityId,
  type ProcessFrame,
  type ProcessStepId,
  type Relation,
} from './core';

export enum MechanismDiagramType {
  Structure = 'structure',
  Flow = 'flow',
  Logic = 'logic',
  Sequence = 'sequence',
}

export interface ProcessDiagramStep {
  stepId: ProcessStepId;
  index: number;
  label: string;
  source: Entity;
  target: Entity;
  relation: Relation;
  tone: VisualTone;
}

export interface ProcessDiagram {
  steps: readonly ProcessDiagramStep[];
}

export interface SequenceParticipant {
  entity: Entity;
  index: number;
}

export interface SequenceMessage extends ProcessDiagramStep {
  sourceParticipantIndex: number;
  targetParticipantIndex: number;
}

export interface SequenceDiagram {
  participants: readonly SequenceParticipant[];
  messages: readonly SequenceMessage[];
}

export function projectProcessDiagram(frames: readonly ProcessFrame[]): ProcessDiagram {
  return {
    steps: frames.map((frame) => ({
      stepId: frame.stepId,
      index: frame.stepIndex,
      label: frame.label,
      source: frame.source,
      target: frame.target,
      relation: frame.relation,
      tone: frameTone(frame),
    })),
  };
}

export function projectSequenceDiagram(frames: readonly ProcessFrame[]): SequenceDiagram {
  const participants: SequenceParticipant[] = [];
  const participantIndexById = new Map<EntityId, number>();

  const register = (entity: Entity): number => {
    const existingIndex = participantIndexById.get(entity.id);
    if (existingIndex !== undefined) return existingIndex;

    const index = participants.length;
    participants.push({ entity, index });
    participantIndexById.set(entity.id, index);
    return index;
  };

  const messages = frames.map((frame) => ({
    stepId: frame.stepId,
    index: frame.stepIndex,
    label: frame.label,
    source: frame.source,
    target: frame.target,
    relation: frame.relation,
    tone: frameTone(frame),
    sourceParticipantIndex: register(frame.source),
    targetParticipantIndex: register(frame.target),
  }));

  return { participants, messages };
}

function frameTone(frame: ProcessFrame): VisualTone {
  return frame.relationVisuals.find((visual) => visual.relationId === frame.relation.id)?.tone
    ?? frame.relationVisuals[0]?.tone
    ?? VisualTone.Active;
}
