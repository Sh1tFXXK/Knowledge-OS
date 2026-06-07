import { useMemo, useState } from 'react';
import { composeQuestionAnswerDraft, normalizeQuestionAnswerSteps } from '../knowledge/answerComposer';
import type { KnowledgeNode, Question, QuestionAnswerStep } from '../types';

interface Props {
  question: Question;
  nodePool: Record<string, KnowledgeNode>;
  onSave: (answer: string, steps: QuestionAnswerStep[]) => void;
  onCancel: () => void;
}

export default function QuestionAnswerEditor({
  question,
  nodePool,
  onSave,
  onCancel,
}: Props) {
  const nodeOptions = useMemo(
    () => Object.values(nodePool).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
    [nodePool],
  );
  const initialSteps = useMemo(
    () => normalizeQuestionAnswerSteps(question.answerSteps, nodePool),
    [nodePool, question.answerSteps],
  );
  const [steps, setSteps] = useState<QuestionAnswerStep[]>(initialSteps);
  const [selectedNodeId, setSelectedNodeId] = useState(
    question.relatedNodeId && nodePool[question.relatedNodeId]
      ? question.relatedNodeId
      : nodeOptions[0]?.id ?? '',
  );
  const [draftAnswer, setDraftAnswer] = useState(question.answer ?? '');

  const composedDraft = useMemo(
    () => composeQuestionAnswerDraft({ ...question, answerSteps: steps }, nodePool),
    [nodePool, question, steps],
  );

  const addStep = () => {
    if (!selectedNodeId || !nodePool[selectedNodeId]) return;
    if (steps.some((step) => step.nodeId === selectedNodeId)) return;
    setSteps([...steps, { nodeId: selectedNodeId }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const next = [...steps];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setSteps(next);
  };

  const updateStepNote = (index: number, note: string) => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, note } : step)));
  };

  const applyComposedDraft = () => {
    if (composedDraft) setDraftAnswer(composedDraft);
  };

  return (
    <div className="question-answer-editor" onClick={(e) => e.stopPropagation()}>
      <div className="question-answer-title">{question.text}</div>

      <div className="answer-builder">
        <div className="answer-builder-head">
          <span>基础节点步骤</span>
          <span>{steps.length} 步</span>
        </div>
        <div className="answer-step-add">
          <select
            className="input answer-node-select"
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
          >
            {nodeOptions.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={addStep}>
            添加步骤
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="answer-step-empty">尚未引用基础节点</div>
        ) : (
          <div className="answer-step-list">
            {steps.map((step, index) => {
              const node = nodePool[step.nodeId];
              if (!node) return null;
              return (
                <div key={`${step.nodeId}-${index}`} className="answer-step-item">
                  <div className="answer-step-main">
                    <span className="answer-step-index">{index + 1}</span>
                    <span className="answer-step-label">{node.label}</span>
                    <div className="answer-step-actions">
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0}
                        title="上移"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => moveStep(index, 1)}
                        disabled={index === steps.length - 1}
                        title="下移"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => removeStep(index)}
                        title="移除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <input
                    className="input answer-step-note"
                    value={step.note ?? ''}
                    onChange={(e) => updateStepNote(index, e.target.value)}
                    placeholder="这一步的备注，可留空"
                  />
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="btn btn-sm"
          onClick={applyComposedDraft}
          disabled={!composedDraft}
        >
          用节点生成答案草稿
        </button>
      </div>

      <textarea
        className="input question-answer-textarea"
        value={draftAnswer}
        onChange={(e) => setDraftAnswer(e.target.value)}
        placeholder="最终答案，可在节点草稿基础上继续修改"
        autoFocus
        rows={5}
      />
      <div className="question-answer-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onSave(draftAnswer, steps)}
        >
          保存答案
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
