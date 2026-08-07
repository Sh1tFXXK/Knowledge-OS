import {
  INNODB_STRUCTURE_ENTITIES,
  INNODB_STRUCTURE_RELATIONS,
} from '../../mechanism/innodbStructureExample';
import type { EntityId, RelationId, VisualTone } from '../../mechanism/core';
import { toneClassName } from './toneClassName';

const BUFFER_POOL_PAGES = [
  'hot',
  'warm',
  'clean',
  'warm',
  'dirty',
  'clean',
  'warm',
  'hot',
  'clean',
  'warm',
  'dirty',
  'warm',
  'clean',
  'hot',
  'warm',
  'clean',
  'warm',
  'dirty',
  'clean',
  'warm',
];

const CHANGE_BUFFER_PAGES = ['warm', 'clean', 'dirty', 'warm', 'clean', 'dirty', 'warm', 'hot'];
const LOG_BUFFER_RECORDS = ['warm', 'dirty', 'warm', 'clean', 'dirty', 'warm'];
const AHI_SLOTS = ['warm', 'hot', 'warm', 'clean', 'warm', 'clean'];

const PHYSICAL_LEVELS = [
  {
    entityId: INNODB_STRUCTURE_ENTITIES.tablespace,
    title: 'Tablespace',
    caption: '表空间',
    className: 'innodb-physical-card--tablespace',
  },
  {
    entityId: INNODB_STRUCTURE_ENTITIES.segment,
    title: 'Segment',
    caption: '段',
    className: 'innodb-physical-card--segment',
  },
  {
    entityId: INNODB_STRUCTURE_ENTITIES.extent,
    title: 'Extent',
    caption: '区',
    className: 'innodb-physical-card--extent',
  },
  {
    entityId: INNODB_STRUCTURE_ENTITIES.page,
    title: 'Page',
    caption: '页',
    className: 'innodb-physical-card--page',
  },
  {
    entityId: INNODB_STRUCTURE_ENTITIES.row,
    title: 'Row',
    caption: '行',
    className: 'innodb-physical-card--row',
  },
] as const;

interface InnoDBStructureDiagramProps {
  entityTones: ReadonlyMap<EntityId, VisualTone>;
  relationTones: ReadonlyMap<RelationId, VisualTone>;
}

export default function InnoDBStructureDiagram({
  entityTones,
  relationTones,
}: InnoDBStructureDiagramProps) {
  const entityClass = (entityId: EntityId) => toneClassName(entityTones.get(entityId));
  const relationClass = (relationId: RelationId) => toneClassName(relationTones.get(relationId));
  const blockClass = (base: string, entityId: EntityId, extra?: string) =>
    [base, extra, entityClass(entityId)].filter(Boolean).join(' ');
  const flowClass = (relationId: RelationId, extra?: string) =>
    ['innodb-flow', extra, relationClass(relationId)].filter(Boolean).join(' ');

  return (
    <div className="innodb-canvas">
      <div className="innodb-map">
        <section className="innodb-domain innodb-domain--memory">
          <div className="innodb-domain-header">
            <span>In-memory structures</span>
            <strong>Memory</strong>
          </div>

          <div className="innodb-memory-grid">
            <div
              className={blockClass(
                'innodb-ahi',
                INNODB_STRUCTURE_ENTITIES.adaptiveHashIndex,
              )}
            >
              <span>Adaptive Hash Index</span>
              <div className="innodb-ahi-slots">
                {AHI_SLOTS.map((state, index) => (
                  <span key={`${state}-${index}`} className={`innodb-page-cell ${state}`} />
                ))}
              </div>
            </div>

            <div
              className={blockClass(
                'innodb-buffer-pool',
                INNODB_STRUCTURE_ENTITIES.bufferPool,
              )}
            >
              <div className="innodb-object-title">
                <span>Buffer Pool</span>
                <small>cached pages</small>
              </div>

              <div className="innodb-page-grid innodb-page-grid--pool">
                {BUFFER_POOL_PAGES.map((state, index) => (
                  <span key={`${state}-${index}`} className={`innodb-page-cell ${state}`} />
                ))}
              </div>

              <div
                className={blockClass(
                  'innodb-change-buffer',
                  INNODB_STRUCTURE_ENTITIES.changeBuffer,
                )}
              >
                <div className="innodb-object-title">
                  <span>Change Buffer</span>
                  <small>secondary index changes</small>
                </div>
                <div className="innodb-page-grid innodb-page-grid--change">
                  {CHANGE_BUFFER_PAGES.map((state, index) => (
                    <span key={`${state}-${index}`} className={`innodb-page-cell ${state}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={blockClass('innodb-log-buffer', INNODB_STRUCTURE_ENTITIES.logBuffer)}>
            <div className="innodb-object-title">
              <span>Log Buffer</span>
              <small>redo records</small>
            </div>
            <div className="innodb-page-grid innodb-page-grid--log">
              {LOG_BUFFER_RECORDS.map((state, index) => (
                <span key={`${state}-${index}`} className={`innodb-page-cell ${state}`} />
              ))}
            </div>
          </div>
        </section>

        <div className="innodb-io-column">
          <div
            className={flowClass(
              INNODB_STRUCTURE_RELATIONS.bufferPoolFlushesThroughOsCache,
              'innodb-flow--direct',
            )}
          >
            <span>O_DIRECT</span>
          </div>

          <div className={blockClass('innodb-os-cache', INNODB_STRUCTURE_ENTITIES.osCache)}>
            <span>Operating</span>
            <span>System Cache</span>
          </div>

          <div
            className={flowClass(
              INNODB_STRUCTURE_RELATIONS.logBufferFlushesRedo,
              'innodb-flow--redo',
            )}
          />
        </div>

        <section className="innodb-domain innodb-domain--disk">
          <div className="innodb-domain-header">
            <span>On-disk structures</span>
            <strong>Disk</strong>
          </div>

          <div className="innodb-disk-grid">
            <div
              className={blockClass(
                'innodb-disk-object innodb-disk-object--system',
                INNODB_STRUCTURE_ENTITIES.systemTablespace,
              )}
            >
              <div className="innodb-object-title">
                <span>System Tablespace</span>
                <small>ibdata1</small>
              </div>
              <div
                className={blockClass(
                  'innodb-disk-nested',
                  INNODB_STRUCTURE_ENTITIES.changeBuffer,
                )}
              >
                Change Buffer
              </div>
            </div>

            <div
              className={blockClass(
                'innodb-disk-object innodb-disk-object--file',
                INNODB_STRUCTURE_ENTITIES.filePerTableTablespaces,
              )}
            >
              <div className="innodb-object-title">
                <span>File-per-table Tablespaces</span>
                <small>innodb_file_per_table=ON</small>
              </div>
              <div className="innodb-file-row">
                <FileGlyph label="t1.ibd" />
                <FileGlyph label="t2.ibd" />
              </div>
            </div>

            <div
              className={blockClass(
                'innodb-disk-object innodb-disk-object--doublewrite',
                INNODB_STRUCTURE_ENTITIES.doublewriteFiles,
              )}
            >
              <div className="innodb-object-title">
                <span>Doublewrite Buffer Files</span>
                <small>torn-page guard</small>
              </div>
              <div className="innodb-file-row">
                <FileGlyph label="ib_16384_0.dblwr" />
                <FileGlyph label="ib_16384_1.dblwr" />
              </div>
            </div>

            <div
              className={blockClass(
                'innodb-disk-object innodb-disk-object--general',
                INNODB_STRUCTURE_ENTITIES.generalTablespaces,
              )}
            >
              <div className="innodb-object-title">
                <span>General Tablespaces</span>
                <small>shared .ibd files</small>
              </div>
              <div className="innodb-overlap-files">
                <span>ts1.ibd</span>
                <span>ts2.ibd</span>
              </div>
            </div>

            <div
              className={blockClass(
                'innodb-disk-object innodb-disk-object--undo',
                INNODB_STRUCTURE_ENTITIES.undoTablespaces,
              )}
            >
              <div className="innodb-object-title">
                <span>Undo Tablespaces</span>
                <small>old row versions</small>
              </div>
              <div className="innodb-stack-files">
                <span>undo_001</span>
                <span>undo_002</span>
                <span>undo_003.ibu</span>
              </div>
            </div>

            <div
              className={blockClass(
                'innodb-disk-object innodb-disk-object--temp',
                INNODB_STRUCTURE_ENTITIES.temporaryTablespaces,
              )}
            >
              <div className="innodb-object-title">
                <span>Temporary Tablespaces</span>
                <small>global and session</small>
              </div>
              <div className="innodb-stack-files">
                <span>ibtmp1</span>
                <span>temp_1.ibt</span>
                <span>temp_2.ibt</span>
              </div>
            </div>

            <div
              className={blockClass(
                'innodb-disk-object innodb-disk-object--redo',
                INNODB_STRUCTURE_ENTITIES.redoLog,
              )}
            >
              <div className="innodb-object-title">
                <span>Redo Log</span>
                <small>crash recovery</small>
              </div>
              <div className="innodb-file-row">
                <LogGlyph label="ib_logfile0" />
                <LogGlyph label="ib_logfile1" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="innodb-physical-layer" aria-label="Physical storage hierarchy">
        <div className="innodb-layer-head">
          <span>Physical hierarchy</span>
          <strong>Tablespace to row</strong>
        </div>

        <div className="innodb-physical-chain">
          {PHYSICAL_LEVELS.map((level, index) => (
            <div className="innodb-physical-chain-item" key={level.entityId}>
              <div
                className={blockClass(
                  'innodb-physical-card',
                  level.entityId,
                  level.className,
                )}
              >
                <div className="innodb-physical-title">
                  <span>{level.title}</span>
                  <small>{level.caption}</small>
                </div>
                <PhysicalPreview entityId={level.entityId} entityClass={entityClass} />
              </div>
              {index < PHYSICAL_LEVELS.length - 1 ? (
                <span className="innodb-physical-arrow" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

interface FileGlyphProps {
  label: string;
}

function FileGlyph({ label }: FileGlyphProps) {
  return (
    <div className="innodb-file-glyph">
      <span />
      <span />
      <span />
      <small>{label}</small>
    </div>
  );
}

function LogGlyph({ label }: FileGlyphProps) {
  return (
    <div className="innodb-log-glyph">
      <strong>LOG</strong>
      <small>{label}</small>
    </div>
  );
}

interface PhysicalPreviewProps {
  entityId: EntityId;
  entityClass: (entityId: EntityId) => string;
}

function PhysicalPreview({ entityId, entityClass }: PhysicalPreviewProps) {
  if (entityId === INNODB_STRUCTURE_ENTITIES.tablespace) {
    return (
      <div className="innodb-preview-stack">
        <span>Segment</span>
        <span>Segment</span>
        <span>Segment</span>
      </div>
    );
  }

  if (entityId === INNODB_STRUCTURE_ENTITIES.segment) {
    return (
      <div className="innodb-preview-extents">
        <span>Extent</span>
        <span>Extent</span>
        <span>Extent</span>
        <span>Extent</span>
      </div>
    );
  }

  if (entityId === INNODB_STRUCTURE_ENTITIES.extent) {
    return (
      <div className="innodb-preview-pages">
        {Array.from({ length: 20 }, (_, index) => (
          <span key={index}>page</span>
        ))}
      </div>
    );
  }

  if (entityId === INNODB_STRUCTURE_ENTITIES.page) {
    return (
      <div className="innodb-preview-rows">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index}>Row</span>
        ))}
      </div>
    );
  }

  return (
    <div className="innodb-preview-row-fields">
      <span className={entityClass(INNODB_STRUCTURE_ENTITIES.rowTrxId)}>DB_TRX_ID</span>
      <span className={entityClass(INNODB_STRUCTURE_ENTITIES.rowRollPointer)}>DB_ROLL_PTR</span>
      <span>col1</span>
      <span>col2</span>
      <span>col3</span>
    </div>
  );
}
