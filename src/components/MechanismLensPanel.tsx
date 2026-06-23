import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  INNODB_STRUCTURE_ENTITIES,
  INNODB_STRUCTURE_RELATIONS,
  VisualTone,
  innodbStructureModel,
  innodbStructureProcess,
  projectGraphFrame,
  projectTimeline,
  runProcess,
  type EntityId,
  type RelationId,
} from '../mechanism';

const PLAY_INTERVAL_MS = 1200;

const TONE_CLASS: Record<VisualTone, string> = {
  [VisualTone.Active]: 'is-active',
  [VisualTone.Traversed]: 'is-traversed',
  [VisualTone.Mutated]: 'is-mutated',
  [VisualTone.Guarded]: 'is-guarded',
  [VisualTone.Persisted]: 'is-persisted',
  [VisualTone.Released]: 'is-released',
};

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

export default function MechanismLensPanel() {
  const frames = useMemo(() => runProcess(innodbStructureModel, innodbStructureProcess), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentFrame = frames[stepIndex] ?? frames[0];
  const graphFrame = useMemo(
    () => projectGraphFrame(innodbStructureModel, currentFrame),
    [currentFrame],
  );
  const timeline = useMemo(() => projectTimeline(frames), [frames]);
  const entityTones = useMemo(
    () => new Map(currentFrame.entityVisuals.map((visual) => [visual.entityId, visual.tone])),
    [currentFrame],
  );
  const relationTones = useMemo(
    () => new Map(currentFrame.relationVisuals.map((visual) => [visual.relationId, visual.tone])),
    [currentFrame],
  );
  const progress = ((stepIndex + 1) / frames.length) * 100;

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timerId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % frames.length);
    }, PLAY_INTERVAL_MS);

    return () => window.clearInterval(timerId);
  }, [frames.length, isPlaying]);

  const entityClass = (entityId: EntityId) => toneClass(entityTones.get(entityId));
  const relationClass = (relationId: RelationId) => toneClass(relationTones.get(relationId));
  const blockClass = (base: string, entityId: EntityId, extra?: string) =>
    [base, extra, entityClass(entityId)].filter(Boolean).join(' ');
  const flowClass = (relationId: RelationId, extra?: string) =>
    ['innodb-flow', extra, relationClass(relationId)].filter(Boolean).join(' ');

  const goPrevious = () => {
    setStepIndex((current) => (current === 0 ? frames.length - 1 : current - 1));
  };

  const goNext = () => {
    setStepIndex((current) => (current + 1) % frames.length);
  };

  const reset = () => {
    setIsPlaying(false);
    setStepIndex(0);
  };

  return (
    <div className="mechanism-lens">
      <header className="mechanism-lens-head">
        <div className="mechanism-title-block">
          <span className="mechanism-eyebrow">Mechanism Lens</span>
          <h2>InnoDB structure map</h2>
          <p>{currentFrame.label}</p>
        </div>

        <div className="mechanism-controls" aria-label="Mechanism playback controls">
          <button className="btn btn-icon" type="button" title="Previous step" onClick={goPrevious}>
            <span>|&lt;</span>
          </button>
          <button
            className="btn btn-primary mechanism-play-button"
            type="button"
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={() => setIsPlaying((value) => !value)}
          >
            <span>{isPlaying ? '||' : '>'}</span>
          </button>
          <button className="btn btn-icon" type="button" title="Next step" onClick={goNext}>
            <span>&gt;|</span>
          </button>
          <button className="btn" type="button" title="Reset" onClick={reset}>
            <span>[]</span>
          </button>
        </div>
      </header>

      <div className="mechanism-progress" aria-hidden="true">
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="mechanism-workbench">
        <section className="mechanism-stage" aria-label="InnoDB mechanism scene">
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

                <div
                  className={blockClass('innodb-log-buffer', INNODB_STRUCTURE_ENTITIES.logBuffer)}
                >
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
                  <FragmentWithArrow key={level.entityId} showArrow={index < PHYSICAL_LEVELS.length - 1}>
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
                  </FragmentWithArrow>
                ))}
              </div>
            </section>
          </div>
        </section>

        <aside className="mechanism-side">
          <section className="mechanism-current-step">
            <div className="mechanism-step-count">
              Step {stepIndex + 1} / {frames.length}
            </div>
            <h3>{currentFrame.label}</h3>
            <div className="mechanism-route">
              <span>{currentFrame.source.label}</span>
              <span>{currentFrame.relation.label}</span>
              <span>{currentFrame.target.label}</span>
            </div>
          </section>

          <ol className="mechanism-timeline">
            {timeline.items.map((item) => (
              <li key={item.stepId}>
                <button
                  type="button"
                  className={item.index === stepIndex ? 'is-selected' : ''}
                  onClick={() => setStepIndex(item.index)}
                >
                  <span className={`mechanism-timeline-dot ${TONE_CLASS[item.tone]}`} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <footer className="mechanism-relation-strip">
        {graphFrame.relations.map((relation) => {
          const tone = relation.visual?.tone;
          return (
            <span
              key={relation.relation.id}
              className={`mechanism-relation-pill ${relation.active && tone ? TONE_CLASS[tone] : ''}`}
            >
              {relation.relation.label}
            </span>
          );
        })}
      </footer>
    </div>
  );
}

interface FragmentWithArrowProps {
  children: ReactNode;
  showArrow: boolean;
}

function FragmentWithArrow({ children, showArrow }: FragmentWithArrowProps) {
  return (
    <>
      {children}
      {showArrow ? <span className="innodb-physical-arrow" aria-hidden="true" /> : null}
    </>
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

function toneClass(tone?: VisualTone): string {
  return tone ? TONE_CLASS[tone] : '';
}
