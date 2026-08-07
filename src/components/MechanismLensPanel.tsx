import { useEffect, useMemo, useState } from 'react';
import {
  GitBranch,
  Network,
  Pause,
  Play,
  RotateCcw,
  Rows3,
  SkipBack,
  SkipForward,
  type LucideIcon,
} from 'lucide-react';
import {
  MechanismDiagramType,
  entityId,
  inspectKnowledgeMechanism,
  projectGraphFrame,
  projectKnowledgeMechanism,
  projectProcessDiagram,
  projectSceneFrame,
  projectSequenceDiagram,
  projectTimeline,
  runProcess,
  type GraphLensRelation,
  type TimelineLensItem,
} from '../mechanism';
import { useGraphStore } from '../store/useGraph';
import FlowDiagram from './mechanism/FlowDiagram';
import LogicDiagram from './mechanism/LogicDiagram';
import SequenceDiagram from './mechanism/SequenceDiagram';
import { TONE_CLASS } from './mechanism/toneClassName';

const PLAY_INTERVAL_MS = 1200;

interface DiagramOption {
  type: MechanismDiagramType;
  label: string;
  ariaLabel: string;
  icon: LucideIcon;
}

const DIAGRAM_OPTIONS: readonly DiagramOption[] = [
  {
    type: MechanismDiagramType.Logic,
    label: '逻辑图',
    ariaLabel: '显示逻辑关系图',
    icon: Network,
  },
  {
    type: MechanismDiagramType.Flow,
    label: '流程图',
    ariaLabel: '显示流程图',
    icon: GitBranch,
  },
  {
    type: MechanismDiagramType.Sequence,
    label: '时序图',
    ariaLabel: '显示时序图',
    icon: Rows3,
  },
];

export default function MechanismLensPanel() {
  const focusNodeId = useGraphStore((state) => state.focusNodeId);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const nodePool = useGraphStore((state) => state.nodePool);
  const knowledgeEdges = useGraphStore((state) => state.knowledgeEdges);
  const treeData = useGraphStore((state) => state.treeData);
  const setSelectedNodeOnly = useGraphStore((state) => state.setSelectedNodeOnly);
  const mechanismFocusNodeId = focusNodeId ?? selectedNodeId;

  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [diagramType, setDiagramType] = useState(MechanismDiagramType.Logic);

  const projection = useMemo(
    () => projectKnowledgeMechanism({
      focusNodeId: mechanismFocusNodeId,
      nodePool,
      knowledgeEdges,
      treeData,
    }),
    [knowledgeEdges, mechanismFocusNodeId, nodePool, treeData],
  );
  const inspection = useMemo(
    () => inspectKnowledgeMechanism({
      focusNodeId: mechanismFocusNodeId,
      nodePool,
      knowledgeEdges,
      treeData,
    }),
    [knowledgeEdges, mechanismFocusNodeId, nodePool, treeData],
  );
  const frames = useMemo(
    () => projection ? runProcess(projection.model, projection.process) : [],
    [projection],
  );
  const currentFrame = frames[stepIndex] ?? null;
  const timeline = useMemo(() => projectTimeline(frames), [frames]);
  const processDiagram = useMemo(() => projectProcessDiagram(frames), [frames]);
  const sequenceDiagram = useMemo(() => projectSequenceDiagram(frames), [frames]);
  const graphFrame = useMemo(
    () => projection ? projectGraphFrame(projection.model, currentFrame) : null,
    [currentFrame, projection],
  );
  const logicFrame = useMemo(
    () => projection
      ? projectSceneFrame(projection.model, currentFrame, { origin: projection.origin })
      : null,
    [currentFrame, projection],
  );
  const progress = frames.length > 0 ? ((stepIndex + 1) / frames.length) * 100 : 0;
  const hasProcess = frames.length > 0;
  const availableDiagramOptions = hasProcess
    ? DIAGRAM_OPTIONS
    : DIAGRAM_OPTIONS.filter((option) => option.type === MechanismDiagramType.Logic);

  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [projection?.mechanismNodeId]);

  useEffect(() => {
    if (frames.length === 0) {
      setStepIndex(0);
      setIsPlaying(false);
      return;
    }
    if (stepIndex >= frames.length) setStepIndex(frames.length - 1);
  }, [frames.length, stepIndex]);

  useEffect(() => {
    if (!hasProcess && diagramType !== MechanismDiagramType.Logic) {
      setDiagramType(MechanismDiagramType.Logic);
    }
  }, [diagramType, hasProcess]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return undefined;

    const timerId = window.setInterval(() => {
      setStepIndex((current: number) => (current + 1) % frames.length);
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(timerId);
  }, [frames.length, isPlaying]);

  useEffect(() => {
    if (isPlaying && currentFrame) setSelectedNodeOnly(currentFrame.target.id);
  }, [currentFrame, isPlaying, setSelectedNodeOnly]);

  const selectStep = (nextStepIndex: number) => {
    const frame = frames[nextStepIndex];
    if (!frame) return;
    setIsPlaying(false);
    setStepIndex(nextStepIndex);
    setSelectedNodeOnly(frame.target.id);
  };

  const goPrevious = () => {
    if (frames.length === 0) return;
    selectStep(stepIndex === 0 ? frames.length - 1 : stepIndex - 1);
  };

  const goNext = () => {
    if (frames.length === 0) return;
    selectStep((stepIndex + 1) % frames.length);
  };

  const reset = () => {
    setIsPlaying(false);
    setStepIndex(0);
    if (projection) setSelectedNodeOnly(projection.mechanismNodeId);
  };

  if (!projection || !logicFrame || !graphFrame) {
    const validationErrors = inspection.validation?.errors ?? [];
    return (
      <div className="mechanism-lens mechanism-lens--empty">
        <Network size={28} aria-hidden="true" />
        <h2>{validationErrors.length > 0 ? '机制定义不完整' : '当前知识不构成机制'}</h2>
        {validationErrors.length > 0 ? (
          <ul className="mechanism-validation-errors">
            {validationErrors.map((error: string) => <li key={error}>{error}</li>)}
          </ul>
        ) : (
          <p>只有明确标记为机制，并包含因果或状态转移规律的知识子图才会在这里呈现。</p>
        )}
      </div>
    );
  }

  return (
    <div className="mechanism-lens">
      <header className="mechanism-lens-head">
        <div className="mechanism-title-block">
          <span className="mechanism-eyebrow">Mechanism Lens · 跟随当前焦点</span>
          <h2>{projection.label}</h2>
          <p>
            {currentFrame?.label
              ?? `${projection.model.entities.length} 个实体，${projection.model.relations.length} 条关系`}
          </p>
        </div>

        <div className="mechanism-head-actions">
          <nav className="mechanism-diagram-switcher" aria-label="机制图形类型">
            {availableDiagramOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.type === diagramType;
              return (
                <button
                  key={option.type}
                  type="button"
                  className={isSelected ? 'is-selected' : ''}
                  aria-label={option.ariaLabel}
                  aria-pressed={isSelected}
                  title={option.ariaLabel}
                  onClick={() => setDiagramType(option.type)}
                >
                  <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mechanism-controls" aria-label="机制播放控制">
            <button
              className="btn btn-icon"
              type="button"
              title="上一步"
              disabled={!hasProcess}
              onClick={goPrevious}
            >
              <SkipBack size={14} aria-hidden="true" />
            </button>
            <button
              className="btn btn-primary mechanism-play-button"
              type="button"
              title={isPlaying ? '暂停' : '播放'}
              disabled={!hasProcess}
              onClick={() => setIsPlaying((value: boolean) => !value)}
            >
              {isPlaying ? (
                <Pause size={14} fill="currentColor" aria-hidden="true" />
              ) : (
                <Play size={14} fill="currentColor" aria-hidden="true" />
              )}
            </button>
            <button
              className="btn btn-icon"
              type="button"
              title="下一步"
              disabled={!hasProcess}
              onClick={goNext}
            >
              <SkipForward size={14} aria-hidden="true" />
            </button>
            <button className="btn btn-icon" type="button" title="重置" onClick={reset}>
              <RotateCcw size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="mechanism-progress" aria-hidden="true">
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="mechanism-workbench">
        <section
          className={`mechanism-stage mechanism-stage--${diagramType}`}
          aria-label={`${projection.label} ${diagramType} diagram`}
          data-diagram-type={diagramType}
        >
          {diagramType === MechanismDiagramType.Flow ? (
            <FlowDiagram diagram={processDiagram} stepIndex={stepIndex} onSelectStep={selectStep} />
          ) : diagramType === MechanismDiagramType.Sequence ? (
            <SequenceDiagram
              diagram={sequenceDiagram}
              stepIndex={stepIndex}
              onSelectStep={selectStep}
            />
          ) : (
            <LogicDiagram
              frame={logicFrame}
              selectedEntityId={selectedNodeId ? entityId(selectedNodeId) : null}
              onSelectEntity={(selectedEntityId) => setSelectedNodeOnly(selectedEntityId)}
            />
          )}
        </section>

        <aside className="mechanism-side">
          {currentFrame ? (
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
          ) : (
            <section className="mechanism-current-step mechanism-current-step--empty">
              <div className="mechanism-step-count">静态结构</div>
              <h3>尚未找到过程关系</h3>
              <p>为目录子节点添加非包含关系后，流程图和时序图会自动出现。</p>
            </section>
          )}

          <ol className="mechanism-timeline">
            {timeline.items.map((item: TimelineLensItem) => (
              <li key={item.stepId}>
                <button
                  type="button"
                  className={item.index === stepIndex ? 'is-selected' : ''}
                  onClick={() => selectStep(item.index)}
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
        {graphFrame.relations.map((relation: GraphLensRelation) => {
          const tone = relation.visual?.tone;
          return (
            <button
              key={relation.relation.id}
              type="button"
              className={`mechanism-relation-pill ${relation.active && tone ? TONE_CLASS[tone] : ''}`}
              onClick={() => setSelectedNodeOnly(relation.relation.target)}
            >
              {relation.relation.label}
            </button>
          );
        })}
      </footer>
    </div>
  );
}
