type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type EntityId = Brand<string, 'EntityId'>;
export type RelationId = Brand<string, 'RelationId'>;
export type ProcessId = Brand<string, 'ProcessId'>;
export type ProcessStepId = Brand<string, 'ProcessStepId'>;

export enum RelationKind {
  Contains = 'contains',
  RoutesTo = 'routesTo',
  Caches = 'caches',
  WritesTo = 'writesTo',
  Locks = 'locks',
  FlushesTo = 'flushesTo',
}

export enum VisualTone {
  Active = 'active',
  Traversed = 'traversed',
  Mutated = 'mutated',
  Guarded = 'guarded',
  Persisted = 'persisted',
  Released = 'released',
}

export enum VisualWeight {
  Soft = 'soft',
  Normal = 'normal',
  Strong = 'strong',
}

export interface Entity {
  id: EntityId;
  label: string;
  note?: string;
}

export interface Relation {
  id: RelationId;
  kind: RelationKind;
  source: EntityId;
  target: EntityId;
  label: string;
}

export interface MechanismModel {
  entities: readonly Entity[];
  relations: readonly Relation[];
}

export interface EntityVisual {
  entityId: EntityId;
  tone: VisualTone;
  weight: VisualWeight;
}

export interface RelationVisual {
  relationId: RelationId;
  tone: VisualTone;
  weight: VisualWeight;
}

export interface ProcessStep {
  id: ProcessStepId;
  label: string;
  relationId: RelationId;
  entityVisuals: readonly EntityVisual[];
  relationVisuals: readonly RelationVisual[];
}

export interface MechanismProcess {
  id: ProcessId;
  label: string;
  steps: readonly ProcessStep[];
}

export interface ProcessFrame {
  stepId: ProcessStepId;
  stepIndex: number;
  label: string;
  relation: Relation;
  source: Entity;
  target: Entity;
  entityVisuals: readonly EntityVisual[];
  relationVisuals: readonly RelationVisual[];
}

export interface TraversalDepth {
  entityId: EntityId;
  depth: number;
}

export function entityId(value: string): EntityId {
  return value as EntityId;
}

export function relationId(value: string): RelationId {
  return value as RelationId;
}

export function processId(value: string): ProcessId {
  return value as ProcessId;
}

export function processStepId(value: string): ProcessStepId {
  return value as ProcessStepId;
}

export function runProcess(
  model: MechanismModel,
  process: MechanismProcess,
): ProcessFrame[] {
  const entities = indexEntities(model.entities);
  const relations = indexRelations(model.relations);

  return process.steps.map((step, stepIndex) => {
    const relation = requireRelation(relations, step.relationId);

    return {
      stepId: step.id,
      stepIndex,
      label: step.label,
      relation,
      source: requireEntity(entities, relation.source),
      target: requireEntity(entities, relation.target),
      entityVisuals: step.entityVisuals,
      relationVisuals: step.relationVisuals,
    };
  });
}

export function deriveTraversalDepths(
  model: MechanismModel,
  origin: EntityId,
  relationKinds: ReadonlySet<RelationKind>,
): TraversalDepth[] {
  const seen = new Set<EntityId>([origin]);
  const depths: TraversalDepth[] = [{ entityId: origin, depth: 0 }];
  const queue: TraversalDepth[] = [{ entityId: origin, depth: 0 }];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const relation of model.relations) {
      if (relation.source !== current.entityId) continue;
      if (!relationKinds.has(relation.kind)) continue;
      if (seen.has(relation.target)) continue;

      const next = { entityId: relation.target, depth: current.depth + 1 };
      seen.add(relation.target);
      depths.push(next);
      queue.push(next);
    }
  }

  return depths;
}

function indexEntities(entities: readonly Entity[]): Map<EntityId, Entity> {
  return new Map(entities.map((entity) => [entity.id, entity]));
}

function indexRelations(relations: readonly Relation[]): Map<RelationId, Relation> {
  return new Map(relations.map((relation) => [relation.id, relation]));
}

function requireEntity(entities: ReadonlyMap<EntityId, Entity>, id: EntityId): Entity {
  const entity = entities.get(id);
  if (!entity) throw new Error(`Missing mechanism entity: ${id}`);
  return entity;
}

function requireRelation(
  relations: ReadonlyMap<RelationId, Relation>,
  id: RelationId,
): Relation {
  const relation = relations.get(id);
  if (!relation) throw new Error(`Missing mechanism relation: ${id}`);
  return relation;
}
