import { useState } from 'react';
import { useGraphStore } from '../store/useGraph';

export default function QuestionBank() {
  const questions = useGraphStore((s) => s.questions);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const addNotification = useGraphStore((s) => s.addNotification);
  const toggleQuestion = useGraphStore((s) => s.toggleQuestion);
  const addQuestion = useGraphStore((s) => s.addQuestion);

  const handleQuestionClick = (q: (typeof questions)[0]) => {
    toggleQuestion(q.id);
    addNotification(`触发推理: ${q.text}`, 'info');
  };

  const handleAddQuestion = () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    addQuestion(trimmed);
    setNewQuestion('');
    setShowAddForm(false);
    addNotification('问题已添加到问题库', 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddQuestion();
  };

  const answeredCount = questions.filter((q) => q.answered || (q as any).status === 'answered').length;

  return (
    <>
      {/* Header */}
      <div className="right-section-header">
        <div className="right-section-title">
          <span>❓</span><span>问题库</span>
          <span className="title-en">(Question Bank)</span>
        </div>
        <div className="right-section-actions">
          <span className="question-count">题目 (共 {questions.length.toLocaleString()})</span>
        </div>
      </div>

      {/* Question List */}
      <div className="question-list" id="question-list">
        {questions.map((q) => (
          <div
            key={q.id}
            className="question-item"
            data-question={q.text}
            onClick={() => handleQuestionClick(q)}
          >
            <span className="question-text">{q.text}</span>
            <span className={`question-status ${q.answered || (q as any).status === 'answered' ? 'answered' : 'pending'}`}>
              {q.answered || (q as any).status === 'answered' ? '已答' : '待答'}
            </span>
          </div>
        ))}
      </div>

      {/* Add Question */}
      {showAddForm ? (
        <div className="flex gap-xs" style={{ padding: '6px 8px' }}>
          <input
            className="input"
            id="new-question-input"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入新问题..."
            style={{ flex: 1, fontSize: 11 }}
            autoFocus
          />
          <button onClick={handleAddQuestion} className="btn btn-primary btn-sm" id="btn-submit-question">
            添加
          </button>
        </div>
      ) : (
        <div className="question-add" id="btn-add-question" onClick={() => setShowAddForm(true)}>
          <span>+</span><span>新建问题</span>
        </div>
      )}
    </>
  );
}
