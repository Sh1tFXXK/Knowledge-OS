import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { useGraphStore } from '../store/useGraph';
import { questionsForNode } from '../knowledge/questionLink';
import ExplanationCard from '../panels/ExplanationCard';
import MarkdownView from '../panels/explanation/MarkdownView';
import SystemConnectionMap from '../panels/SystemConnectionMap';
import { collectKnowledgeReferences } from '../knowledge/nodeReferences';

/** 右侧面板：解释卡 → 问题 → 系统连接图 */
export default function RightSidePanel({
  onResizeStart,
}: {
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const questions = useGraphStore((s) => s.questions);
  const nodePool = useGraphStore((s) => s.nodePool);
  const openCard = useGraphStore((s) => s.openCard);
  const answerQuestion = useGraphStore((s) => s.answerQuestion);
  const addNotification = useGraphStore((s) => s.addNotification);

  const siblingQuestions = useMemo(
    () => (focusNodeId ? questionsForNode(questions, focusNodeId) : []),
    [questions, focusNodeId],
  );
  const knowledgeReferences = useMemo(
    () => collectKnowledgeReferences(
      nodePool,
      focusNodeId ? new Set([focusNodeId]) : new Set<string>(),
    ),
    [focusNodeId, nodePool],
  );
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');

  useEffect(() => {
    setOpenQuestionId(null);
    setEditingQuestionId(null);
    setAnswerDraft('');
  }, [focusNodeId]);

  const startAnswerEdit = (questionId: string, answer: string | undefined) => {
    setOpenQuestionId(questionId);
    setEditingQuestionId(questionId);
    setAnswerDraft(answer ?? '');
  };

  const cancelAnswerEdit = () => {
    setEditingQuestionId(null);
    setAnswerDraft('');
  };

  const toggleQuestion = (questionId: string) => {
    if (editingQuestionId) cancelAnswerEdit();
    setOpenQuestionId((currentId) => (currentId === questionId ? null : questionId));
  };

  const saveAnswer = (questionId: string) => {
    answerQuestion(questionId, answerDraft);
    setEditingQuestionId(null);
    setAnswerDraft('');
    addNotification('答案已保存', 'success');
  };

  return (
    <aside className="right-panel" id="right-panel">
      <div
        className="right-panel-resize-handle"
        onMouseDown={onResizeStart}
        title="拖动调整右栏宽度"
      />
      <div className="right-panel-body">
        <ExplanationCard />

        {/* ── 问题区（与目录焦点联动） ── */}
        <div className="right-section">
          <div className="right-section-header">
            <div className="right-section-title">
              <span>❓</span>
              <span>问题</span>
              <span className="title-en">(Questions)</span>
            </div>
            <span className="right-section-count">{siblingQuestions.length}</span>
          </div>
          <div className="right-questions-list">
            {siblingQuestions.length === 0 ? (
              <div className="right-questions-empty">暂无问题</div>
            ) : (
              siblingQuestions.map((q) => {
                const isOpen = openQuestionId === q.id;
                const isEditing = editingQuestionId === q.id;
                return (
                  <article
                    key={q.id}
                    className={`right-question-card${isOpen ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="right-question-card-trigger"
                      aria-expanded={isOpen}
                      onClick={() => toggleQuestion(q.id)}
                    >
                      <span className="right-question-card-question">{q.text}</span>
                    </button>
                    {isOpen && (
                      <div className="right-question-card-answer">
                        {isEditing ? (
                          <div className="right-question-answer-editor">
                            <textarea
                              className="right-question-answer-input"
                              value={answerDraft}
                              onChange={(event) => setAnswerDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                                  event.preventDefault();
                                  saveAnswer(q.id);
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  cancelAnswerEdit();
                                }
                              }}
                              placeholder="输入答案..."
                              rows={6}
                              autoFocus
                            />
                            <div className="right-question-answer-actions">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => saveAnswer(q.id)}
                              >
                                <Check size={13} aria-hidden="true" />
                                保存
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={cancelAnswerEdit}
                              >
                                <X size={13} aria-hidden="true" />
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="right-question-answer-view">
                            <button
                              type="button"
                              className="btn-icon-sm right-question-answer-edit"
                              onClick={() => startAnswerEdit(q.id, q.answer)}
                              title={q.answer?.trim() ? '编辑答案' : '添加答案'}
                              aria-label={q.answer?.trim() ? '编辑答案' : '添加答案'}
                            >
                              <Pencil size={13} aria-hidden="true" />
                            </button>
                            <div
                              className={`right-question-answer-content${q.answer?.trim() ? '' : ' is-empty'}`}
                            >
                              {q.answer?.trim() ? (
                                <MarkdownView
                                  content={q.answer}
                                  references={knowledgeReferences}
                                  onOpenReference={openCard}
                                />
                              ) : (
                                '暂无答案'
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>

        <SystemConnectionMap />
      </div>
    </aside>
  );
}
