import {
  RelationKind,
  VisualTone,
  VisualWeight,
  entityId,
  processId,
  processStepId,
  relationId,
  type MechanismModel,
  type MechanismProcess,
} from './core';

export const MYSQL_UPDATE_ENTITIES = {
  sqlUpdate: entityId('mysql.update.sql'),
  queryExecutor: entityId('mysql.query.executor'),
  transaction: entityId('mysql.transaction'),
  clusteredIndex: entityId('mysql.clustered.btree'),
  bufferPoolPage: entityId('mysql.buffer-pool.page'),
  clusteredRecord: entityId('mysql.clustered.record'),
  rowLock: entityId('mysql.row-lock'),
  redoLogBuffer: entityId('mysql.redo.buffer'),
  redoLogFile: entityId('mysql.redo.file'),
} as const;

export const MYSQL_UPDATE_RELATIONS = {
  sqlEntersExecutor: relationId('mysql.update.sql-enters-executor'),
  executorTraversesIndex: relationId('mysql.update.executor-traverses-index'),
  indexLocatesPage: relationId('mysql.update.index-locates-page'),
  pageContainsRecord: relationId('mysql.update.page-contains-record'),
  transactionGuardsRow: relationId('mysql.update.transaction-guards-row'),
  executorWritesRecord: relationId('mysql.update.executor-writes-record'),
  transactionAppendsRedo: relationId('mysql.update.transaction-appends-redo'),
  redoFlushesFile: relationId('mysql.update.redo-flushes-file'),
} as const;

export const mysqlUpdateModel: MechanismModel = {
  entities: [
    {
      id: MYSQL_UPDATE_ENTITIES.sqlUpdate,
      label: 'UPDATE statement',
      note: 'The user intent entering the storage engine path.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.queryExecutor,
      label: 'Query executor',
      note: 'Finds the target row and drives the write path.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.transaction,
      label: 'Transaction',
      note: 'Owns the write until commit releases the row guard.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.clusteredIndex,
      label: 'Clustered B+ tree',
      note: 'The primary-key access path to the record.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.bufferPoolPage,
      label: 'Buffer Pool page',
      note: 'The in-memory page whose visible tone changes during the write.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.clusteredRecord,
      label: 'Clustered record',
      note: 'The row image being changed.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.rowLock,
      label: 'Row lock',
      note: 'The guard that makes the row unavailable to conflicting writers.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.redoLogBuffer,
      label: 'Redo log buffer',
      note: 'Append-only memory surface for recovery intent.',
    },
    {
      id: MYSQL_UPDATE_ENTITIES.redoLogFile,
      label: 'Redo log file',
      note: 'Durable recovery surface flushed before commit returns.',
    },
  ],
  relations: [
    {
      id: MYSQL_UPDATE_RELATIONS.sqlEntersExecutor,
      kind: RelationKind.RoutesTo,
      source: MYSQL_UPDATE_ENTITIES.sqlUpdate,
      target: MYSQL_UPDATE_ENTITIES.queryExecutor,
      label: 'enters',
    },
    {
      id: MYSQL_UPDATE_RELATIONS.executorTraversesIndex,
      kind: RelationKind.RoutesTo,
      source: MYSQL_UPDATE_ENTITIES.queryExecutor,
      target: MYSQL_UPDATE_ENTITIES.clusteredIndex,
      label: 'traverses',
    },
    {
      id: MYSQL_UPDATE_RELATIONS.indexLocatesPage,
      kind: RelationKind.Caches,
      source: MYSQL_UPDATE_ENTITIES.clusteredIndex,
      target: MYSQL_UPDATE_ENTITIES.bufferPoolPage,
      label: 'locates page in',
    },
    {
      id: MYSQL_UPDATE_RELATIONS.pageContainsRecord,
      kind: RelationKind.Contains,
      source: MYSQL_UPDATE_ENTITIES.bufferPoolPage,
      target: MYSQL_UPDATE_ENTITIES.clusteredRecord,
      label: 'contains',
    },
    {
      id: MYSQL_UPDATE_RELATIONS.transactionGuardsRow,
      kind: RelationKind.Locks,
      source: MYSQL_UPDATE_ENTITIES.transaction,
      target: MYSQL_UPDATE_ENTITIES.rowLock,
      label: 'holds',
    },
    {
      id: MYSQL_UPDATE_RELATIONS.executorWritesRecord,
      kind: RelationKind.WritesTo,
      source: MYSQL_UPDATE_ENTITIES.queryExecutor,
      target: MYSQL_UPDATE_ENTITIES.clusteredRecord,
      label: 'writes',
    },
    {
      id: MYSQL_UPDATE_RELATIONS.transactionAppendsRedo,
      kind: RelationKind.WritesTo,
      source: MYSQL_UPDATE_ENTITIES.transaction,
      target: MYSQL_UPDATE_ENTITIES.redoLogBuffer,
      label: 'appends',
    },
    {
      id: MYSQL_UPDATE_RELATIONS.redoFlushesFile,
      kind: RelationKind.FlushesTo,
      source: MYSQL_UPDATE_ENTITIES.redoLogBuffer,
      target: MYSQL_UPDATE_ENTITIES.redoLogFile,
      label: 'flushes',
    },
  ],
};

export const mysqlUpdateProcess: MechanismProcess = {
  id: processId('mysql.update.process'),
  label: 'MySQL UPDATE write path',
  steps: [
    {
      id: processStepId('mysql.update.step.enter-executor'),
      label: 'SQL enters the executor',
      relationId: MYSQL_UPDATE_RELATIONS.sqlEntersExecutor,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.sqlUpdate, tone: VisualTone.Active, weight: VisualWeight.Normal },
        { entityId: MYSQL_UPDATE_ENTITIES.queryExecutor, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.sqlEntersExecutor, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('mysql.update.step.traverse-index'),
      label: 'Executor follows the clustered index path',
      relationId: MYSQL_UPDATE_RELATIONS.executorTraversesIndex,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.queryExecutor, tone: VisualTone.Active, weight: VisualWeight.Normal },
        { entityId: MYSQL_UPDATE_ENTITIES.clusteredIndex, tone: VisualTone.Traversed, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.executorTraversesIndex, tone: VisualTone.Traversed, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('mysql.update.step.locate-page'),
      label: 'The target page becomes visible through the Buffer Pool',
      relationId: MYSQL_UPDATE_RELATIONS.indexLocatesPage,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.clusteredIndex, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: MYSQL_UPDATE_ENTITIES.bufferPoolPage, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.indexLocatesPage, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('mysql.update.step.guard-row'),
      label: 'The transaction places a guard around the row',
      relationId: MYSQL_UPDATE_RELATIONS.transactionGuardsRow,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.transaction, tone: VisualTone.Active, weight: VisualWeight.Normal },
        { entityId: MYSQL_UPDATE_ENTITIES.rowLock, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
        { entityId: MYSQL_UPDATE_ENTITIES.clusteredRecord, tone: VisualTone.Guarded, weight: VisualWeight.Normal },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.transactionGuardsRow, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('mysql.update.step.mutate-record'),
      label: 'The record image changes inside the page',
      relationId: MYSQL_UPDATE_RELATIONS.executorWritesRecord,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.queryExecutor, tone: VisualTone.Active, weight: VisualWeight.Normal },
        { entityId: MYSQL_UPDATE_ENTITIES.clusteredRecord, tone: VisualTone.Mutated, weight: VisualWeight.Strong },
        { entityId: MYSQL_UPDATE_ENTITIES.bufferPoolPage, tone: VisualTone.Mutated, weight: VisualWeight.Normal },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.executorWritesRecord, tone: VisualTone.Mutated, weight: VisualWeight.Strong },
        { relationId: MYSQL_UPDATE_RELATIONS.pageContainsRecord, tone: VisualTone.Mutated, weight: VisualWeight.Soft },
      ],
    },
    {
      id: processStepId('mysql.update.step.append-redo'),
      label: 'Redo intent is appended before the commit can finish',
      relationId: MYSQL_UPDATE_RELATIONS.transactionAppendsRedo,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.transaction, tone: VisualTone.Active, weight: VisualWeight.Normal },
        { entityId: MYSQL_UPDATE_ENTITIES.redoLogBuffer, tone: VisualTone.Mutated, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.transactionAppendsRedo, tone: VisualTone.Mutated, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('mysql.update.step.flush-redo'),
      label: 'Redo reaches durable storage',
      relationId: MYSQL_UPDATE_RELATIONS.redoFlushesFile,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.redoLogBuffer, tone: VisualTone.Persisted, weight: VisualWeight.Normal },
        { entityId: MYSQL_UPDATE_ENTITIES.redoLogFile, tone: VisualTone.Persisted, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.redoFlushesFile, tone: VisualTone.Persisted, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('mysql.update.step.release-guard'),
      label: 'Commit returns and the row guard fades',
      relationId: MYSQL_UPDATE_RELATIONS.transactionGuardsRow,
      entityVisuals: [
        { entityId: MYSQL_UPDATE_ENTITIES.transaction, tone: VisualTone.Released, weight: VisualWeight.Soft },
        { entityId: MYSQL_UPDATE_ENTITIES.rowLock, tone: VisualTone.Released, weight: VisualWeight.Strong },
        { entityId: MYSQL_UPDATE_ENTITIES.clusteredRecord, tone: VisualTone.Mutated, weight: VisualWeight.Normal },
      ],
      relationVisuals: [
        { relationId: MYSQL_UPDATE_RELATIONS.transactionGuardsRow, tone: VisualTone.Released, weight: VisualWeight.Strong },
      ],
    },
  ],
};
