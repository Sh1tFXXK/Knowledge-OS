import { useMemo, useState } from 'react';
import { useGraphStore } from '../store/useGraph';
import { questionsForNode } from '../knowledge/questionLink';

export default function QuestionBank() {
  const questions = useGraphStore((s) => s.questions);
  const nodePool = useGraphStore((s) => s.nodePool);
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const selectedQuestionId = useGraphStore((s) => s.selectedQuestionId);
  const setSelectedQuestion = useGraphStore((s) => s.setSelectedQuestion);
  const openCard = useGraphStore((s) => s.openCard);
  const setActiveView = useGraphStore((s) => s.setActiveView);
  const addNotification = useGraphStore((s) => s.addNotification);
  const answerQuestion = useGraphStore((s) => s.answerQuestion);

  const [editingAnswer, setEditingAnswer] = useState(false);
  const [editAnswer, setEditAnswer] = useState('');

  const currentQuestion = useMemo(
    () => questions.find((q) => q.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );

  const siblingQuestions = useMemo(() => {
    const nodeId = currentQuestion?.relatedNodeId;
    if (!nodeId) return [];
    return questionsForNode(questions, nodeId);
  }, [currentQuestion, questions]);

  const siblingIndex = currentQuestion
    ? siblingQuestions.findIndex((q) => q.id === currentQuestion.id)
    : -1;

  const relatedLabel =
    currentQuestion?.relatedNodeId && nodePool[currentQuestion.relatedNodeId]
      ? nodePool[currentQuestion.relatedNodeId].label
      : focusNodeId && nodePool[focusNodeId]
        ? nodePool[focusNodeId].label
        : null;

  const handleOpenRelatedNode = () => {
    const nodeId = currentQuestion?.relatedNodeId ?? focusNodeId;
    if (nodeId && nodePool[nodeId]) {
      openCard(nodeId);
      addNotification(`已打开解释卡: ${nodePool[nodeId].label}`, 'success');
    }
  };

  const handlePrev = () => {
    if (siblingIndex > 0) {
      setSelectedQuestion(siblingQuestions[siblingIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (siblingIndex >= 0 && siblingIndex < siblingQuestions.length - 1) {
      setSelectedQuestion(siblingQuestions[siblingIndex + 1].id);
    }
  };

  const handleStartAnswerEdit = () => {
    if (!currentQuestion) return;
    setEditAnswer(currentQuestion.answer || '');
    setEditingAnswer(true);
  };

  const handleSaveAnswer = () => {
    if (!currentQuestion) return;
    answerQuestion(currentQuestion.id, editAnswer);
    setEditingAnswer(false);
    addNotification('答案已保存', 'success');
  };

  const handleCancelAnswerEdit = () => {
    setEditingAnswer(false);
    setEditAnswer('');
  };

  const statusLabel = currentQuestion?.answered
    ? '已答复'
    : (currentQuestion as { status?: string } | null)?.status === 'forgot'
      ? '忘答存疑'
      : '未答复';

  const statusClass = currentQuestion?.answered
    ? 'status-answered'
    : (currentQuestion as { status?: string } | null)?.status === 'forgot'
      ? 'status-forgot'
      : 'status-pending';

  return (
    <div className="right-section">
      <div className="right-section-header">
        <div className="right-section-title">
          <span>❓</span>
          <span>当前问题</span>
          <span className="title-en">(Current Question)</span>
        </div>
        <div className="right-section-actions">
          {siblingQuestions.length > 1 && (
            <span className="question-nav-indicator">
              {siblingIndex + 1}/{siblingQuestions.length}
            </span>
          )}
        </div>
      </div>

      {!currentQuestion ? (
        <div className="question-detail-empty">
          <p>暂无选中问题</p>
          <p className="question-detail-hint">
            在左侧目录选择知识点，或在中间问题库点击问题
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setActiveView('questions')}
          >
            打开问题库
          </button>
        </div>
      ) : (
        <div className="question-detail">
          {siblingQuestions.length > 1 && (
            <div className="question-detail-nav">
              <button
                type="button"
                className="btn-icon-sm"
                onClick={handlePrev}
                disabled={siblingIndex <= 0}
                title="上一题"
              >
                ‹
              </button>
              <span className="question-nav-label">同知识点关联题</span>
              <button
                type="button"
                className="btn-icon-sm"
                onClick={handleNext}
                disabled={siblingIndex < 0 || siblingIndex >= siblingQuestions.length - 1}
                title="下一题"
              >
                ›
              </button>
            </div>
          )}

          <div className="question-detail-meta">
            <span className={`question-status ${statusClass}`}>{statusLabel}</span>
            {relatedLabel && (
              <button
                type="button"
                className="question-related-chip"
                onClick={handleOpenRelatedNode}
                title="打开关联知识点解释卡"
              >
                🔗 {relatedLabel}
              </button>
            )}
          </div>

          <div className="question-detail-text">{currentQuestion.text}</div>

          <div className="question-detail-answer-section">
            <div className="question-detail-answer-header">
              <span>答案</span>
              {!editingAnswer && (
                <button
                  type="button"
                  className="btn-icon-sm"
                  onClick={handleStartAnswerEdit}
                  title={currentQuestion.answer ? '编辑答案' : '添加答案'}
                >
                  {currentQuestion.answer ? '✎' : '+'}
                </button>
              )}
            </div>

            {editingAnswer ? (
              <div className="question-detail-answer-edit">
                <textarea
                  className="input"
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  placeholder="输入答案..."
                  autoFocus
                  rows={6}
                />
                <div className="question-detail-answer-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveAnswer}>
                    保存
                  </button>
                  <button type="button" className="btn btn-sm" onClick={handleCancelAnswerEdit}>
                    取消
                  </button>
                </div>
              </div>
            ) : currentQuestion.answer ? (
              <div className="question-detail-answer-content">{currentQuestion.answer}</div>
            ) : (
              <div className="question-detail-answer-empty">尚未填写答案</div>
            )}
          </div>

          <button
            type="button"
            className="question-detail-link"
            onClick={() => setActiveView('questions')}
          >
            在问题库中查看全部 →
          </button>
        </div>
      )}
    </div>
  );
}
