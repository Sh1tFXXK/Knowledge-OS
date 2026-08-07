import {
  RelationKind,
  VisualTone,
  VisualWeight,
  deriveTraversalDepths,
  type Entity,
  type EntityId,
  type EntityVisual,
  type MechanismModel,
  type ProcessFrame,
  type ProcessStepId,
  type Relation,
  type RelationId,
  type RelationVisual,
} from './core';

export interface GraphLensNode {
  entity: Entity;
  visual: EntityVisual | null;
  active: boolean;
}

export interface GraphLensRelation {
  relation: Relation;
  visual: RelationVisual | null;
  active: boolean;
}

export interface GraphLensFrame {
  nodes: readonly GraphLensNode[];
  relations: readonly GraphLensRelation[];
  activeStepId: ProcessStepId | null;
}

export interface TimelineLensItem {
  stepId: ProcessStepId;
  index: number;
  label: string;
  relationId: RelationId;
  sourceId: EntityId;
  targetId: EntityId;
  tone: VisualTone;
}

export interface TimelineLens {
  items: readonly TimelineLensItem[];
}

export interface ScenePoint {
  x: number;
  y: number;
  z: number;
}

export interface SceneLensObject {
  entity: Entity;
  position: ScenePoint;
  visual: EntityVisual | null;
}

export interface SceneLensConnection {
  relation: Relation;
  source: ScenePoint;
  target: ScenePoint;
  visual: RelationVisual | null;
}

export interface SceneLensPulse {
  stepId: ProcessStepId;
  sourceId: EntityId;
  targetId: EntityId;
  tone: VisualTone;
  weight: VisualWeight;
}

export interface SceneLensFrame {
  objects: readonly SceneLensObject[];
  connections: readonly SceneLensConnection[];
  pulse: SceneLensPulse | null;
}

export interface SceneLensOptions {
  origin?: EntityId;
  traversalKinds?: ReadonlySet<RelationKind>;
}

const DEFAULT_TRAVERSAL_KINDS = new Set<RelationKind>([
  RelationKind.Contains,
  RelationKind.RoutesTo,
  RelationKind.Caches,
  RelationKind.WritesTo,
  RelationKind.Locks,
  RelationKind.FlushesTo,
]);

export function projectGraphFrame(
  model: MechanismModel,
  frame: ProcessFrame | null,
): GraphLensFrame {
  const entityVisuals = indexEntityVisuals(frame?.entityVisuals ?? []);
  const relationVisuals = indexRelationVisuals(frame?.relationVisuals ?? []);

  return {
    activeStepId: frame?.stepId ?? null,
    nodes: model.entities.map((entity) => {
      const visual = entityVisuals.get(entity.id) ?? null;
      return { entity, visual, active: visual !== null };
    }),
    relations: model.relations.map((relation) => {
      const visual = relationVisuals.get(relation.id) ?? null;
      return { relation, visual, active: visual !== null };
    }),
  };
}

export function projectTimeline(frames: readonly ProcessFrame[]): TimelineLens {
  return {
    items: frames.map((frame) => {
      const visual = frame.relationVisuals.find(
        (item) => item.relationId === frame.relation.id,
      );

      return {
        stepId: frame.stepId,
        index: frame.stepIndex,
        label: frame.label,
        relationId: frame.relation.id,
        sourceId: frame.source.id,
        targetId: frame.target.id,
        tone: visual?.tone ?? VisualTone.Active,
      };
    }),
  };
}

export function projectSceneFrame(
  model: MechanismModel,
  frame: ProcessFrame | null,
  options: SceneLensOptions = {},
): SceneLensFrame {
  const positions = buildScenePositions(
    model,
    options.origin ?? frame?.source.id ?? model.entities[0]?.id ?? null,
    options.traversalKinds ?? DEFAULT_TRAVERSAL_KINDS,
  );
  const entityVisuals = indexEntityVisuals(frame?.entityVisuals ?? []);
  const relationVisuals = indexRelationVisuals(frame?.relationVisuals ?? []);

  const objects = model.entities.map((entity) => ({
    entity,
    position: requirePosition(positions, entity.id),
    visual: entityVisuals.get(entity.id) ?? null,
  }));

  const connections = model.relations.map((relation) => ({
    relation,
    source: requirePosition(positions, relation.source),
    target: requirePosition(positions, relation.target),
    visual: relationVisuals.get(relation.id) ?? null,
  }));

  const primaryVisual = frame
    ? relationVisuals.get(frame.relation.id) ?? frame.relationVisuals[0] ?? null
    : null;

  return {
    objects,
    connections,
    pulse: frame
      ? {
        stepId: frame.stepId,
        sourceId: frame.source.id,
        targetId: frame.target.id,
        tone: primaryVisual?.tone ?? VisualTone.Active,
        weight: primaryVisual?.weight ?? VisualWeight.Normal,
      }
      : null,
  };
}

function buildScenePositions(
  model: MechanismModel,
  origin: EntityId | null,
  traversalKinds: ReadonlySet<RelationKind>,
): Map<EntityId, ScenePoint> {
  const depthByEntity = new Map<EntityId, number>(
    origin
      ? deriveTraversalDepths(model, origin, traversalKinds).map((item) => [
        item.entityId,
        item.depth,
      ])
      : [],
  );

  const maxDepth = Math.max(0, ...depthByEntity.values());
  const byDepth = new Map<number, Entity[]>();

  model.entities.forEach((entity) => {
    const depth = depthByEntity.get(entity.id) ?? maxDepth + 1;
    const bucket = byDepth.get(depth) ?? [];
    bucket.push(entity);
    byDepth.set(depth, bucket);
  });

  const positions = new Map<EntityId, ScenePoint>();

  for (const [depth, entities] of byDepth) {
    const centerOffset = (entities.length - 1) / 2;
    entities.forEach((entity, index) => {
      positions.set(entity.id, {
        x: depth * 180,
        y: (index - centerOffset) * 96,
        z: relationKindHeight(model, entity.id) * 48,
      });
    });
  }

  return positions;
}

function relationKindHeight(model: MechanismModel, entityId: EntityId): number {
  const relation = model.relations.find(
    (item) => item.source === entityId || item.target === entityId,
  );
  if (!relation) return 0;

  const order = [
    RelationKind.Contains,
    RelationKind.RoutesTo,
    RelationKind.Caches,
    RelationKind.WritesTo,
    RelationKind.Locks,
    RelationKind.FlushesTo,
  ];

  const index = order.indexOf(relation.kind);
  return index === -1 ? 0 : index;
}

function requirePosition(
  positions: ReadonlyMap<EntityId, ScenePoint>,
  entityId: EntityId,
): ScenePoint {
  const position = positions.get(entityId);
  if (!position) throw new Error(`Missing scene position for entity: ${entityId}`);
  return position;
}

function indexEntityVisuals(visuals: readonly EntityVisual[]): Map<EntityId, EntityVisual> {
  return new Map(visuals.map((visual) => [visual.entityId, visual]));
}

function indexRelationVisuals(
  visuals: readonly RelationVisual[],
): Map<RelationId, RelationVisual> {
  return new Map(visuals.map((visual) => [visual.relationId, visual]));
}
