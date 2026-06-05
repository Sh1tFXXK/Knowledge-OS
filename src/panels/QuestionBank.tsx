import { useState } from 'react';
import { useGraphStore } from '../store/useGraph';

export default function QuestionBank() {
  const questions = useGraphStore((s) => s.questions);
  const nodePool = useGraphStore((s) => s.nodePool);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const addNotification = useGraphStore((s) => s.addNotification);
  const toggleQuestion = useGraphStore((s) => s.toggleQuestion);
  const addQuestion = useGraphStore((s) => s.addQuestion);
  const removeQuestion = useGraphStore((s) => s.removeQuestion);
  const updateQuestion = useGraphStore((s) => s.updateQuestion);

  const [newQuestion, setNewQuestion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswer, setEditAnswer] = useState('');
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());

  const handleQuestionClick = (q: (typeof questions)[0], e?: React.MouseEvent) => {
    // 右键或 Shift+点击切换状态
    if (e?.shiftKey || e?.button === 2) {
      e?.preventDefault();
      // 循环切换状态：pending -> answered -> forgot -> pending
      const currentStatus = (q as any).status || (q.answered ? 'answered' : 'pending');
      let nextStatus = 'pending';
      if (currentStatus === 'pending') nextStatus = 'answered';
      else if (currentStatus === 'answered') nextStatus = 'forgot';

      (q as any).status = nextStatus;
      toggleQuestion(q.id);
      return;
    }

    // 优先使用 relatedNodeId
    let foundNodeId: string | null = q.relatedNodeId || null;

    // 如果没有 relatedNodeId，尝试文本匹配
    if (!foundNodeId) {
      const questionText = q.text.toLowerCase();

      // 尝试匹配问题中的关键词到节点
      for (const [nodeId, node] of Object.entries(nodePool)) {
        const label = node.label.toLowerCase();
        // 如果问题包含节点名称，或节点名称包含在问题中
        if (questionText.includes(label) || label.length > 2 && questionText.includes(label)) {
          foundNodeId = nodeId;
          break;
        }
      }

      // 如果没有精确匹配，尝试关键词匹配
      if (!foundNodeId) {
        const keywords = ['mvcc', 'read view', 'readview', 'undo', '版本链', 'b+树', 'btree', 'innodb',
                         '隔离', 'isolation', 'acid', '事务', 'transaction', '死锁', 'deadlock',
                         'redo', 'binlog', 'buffer', '索引', 'index', '锁', 'lock', '共享', '排他',
                         '表级', '行级', '乐观', '悲观'];

        for (const keyword of keywords) {
          if (questionText.includes(keyword)) {
            // 查找包含该关键词的节点
            for (const [nodeId, node] of Object.entries(nodePool)) {
              if (node.label.toLowerCase().includes(keyword) || keyword.includes(node.label.toLowerCase())) {
                foundNodeId = nodeId;
                break;
              }
            }
            if (foundNodeId) break;
          }
        }
      }
    }

    if (foundNodeId) {
      // 检查节点是否存在
      const node = nodePool[foundNodeId];
      if (node) {
        // 跳转到找到的节点（会更新 focusNodeId 和 selectedNodeId）
        setSelectedNode(foundNodeId);
        addNotification(`已定位到: ${node.label}`, 'success');
      } else {
        addNotification(`节点 ${foundNodeId} 不存在`, 'warning');
      }
    } else {
      addNotification(`未找到相关知识点`, 'info');
    }

    toggleQuestion(q.id);
  };

  const handleAddQuestion = () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    addQuestion(trimmed);
    setNewQuestion('');
    setShowAddForm(false);
    addNotification('问题已添加到问题库', 'success');
  };

  const handleStartEdit = (q: (typeof questions)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(q.id);
    setEditText(q.text);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      updateQuestion(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
      addNotification('问题已更新', 'success');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteQuestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个问题吗？')) {
      removeQuestion(id);
      addNotification('问题已删除', 'success');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingId) {
        handleSaveEdit();
      } else if (editingAnswerId) {
        handleSaveAnswer();
      } else {
        handleAddQuestion();
      }
    }
    if (e.key === 'Escape') {
      if (editingId) {
        handleCancelEdit();
      } else if (editingAnswerId) {
        handleCancelAnswerEdit();
      } else {
        setShowAddForm(false);
      }
    }
  };

  const handleStartAnswerEdit = (q: (typeof questions)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnswerId(q.id);
    setEditAnswer(q.answer || '');
  };

  const handleSaveAnswer = () => {
    if (editingAnswerId) {
      const trimmed = editAnswer.trim();
      const answerQuestion = useGraphStore.getState().answerQuestion;
      answerQuestion(editingAnswerId, trimmed);
      setEditingAnswerId(null);
      setEditAnswer('');
      addNotification('答案已保存', 'success');
    }
  };

  const handleCancelAnswerEdit = () => {
    setEditingAnswerId(null);
    setEditAnswer('');
  };

  const toggleAnswerExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="right-section">
      <div className="right-section-header">
        <div className="right-section-title">
          <span>❓</span><span>问题库</span>
          <span className="title-en">(Question Bank)</span>
        </div>
        <div className="right-section-actions">
          <span className="question-count">共 {questions.length} 题</span>
        </div>
      </div>

      {/* Question List */}
      <div className="question-list" id="question-list">
        {questions.length === 0 && (
          <div className="text-muted" style={{ padding: '8px', fontSize: 11, fontStyle: 'italic' }}>
            问题库为空，点击下方添加问题
          </div>
        )}
        {questions.map((q) => {
          const status = (q as any).status || (q.answered ? 'answered' : 'pending');
          const isEditing = editingId === q.id;
          const isEditingAnswer = editingAnswerId === q.id;

          if (isEditing) {
            return (
              <div key={q.id} className="question-item question-editing">
                <input
                  className="input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{ flex: 1, fontSize: 11 }}
                />
                <button onClick={handleSaveEdit} className="btn btn-primary btn-sm" style={{ padding: '2px 8px' }}>
                  ✓
                </button>
                <button onClick={handleCancelEdit} className="btn btn-sm" style={{ padding: '2px 8px' }}>
                  ✕
                </button>
              </div>
            );
          }

          if (isEditingAnswer) {
            return (
              <div key={q.id} className="question-item question-editing" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {q.text}
                </div>
                <textarea
                  className="input"
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  placeholder="输入答案..."
                  autoFocus
                  rows={4}
                  style={{ flex: 1, fontSize: 11, resize: 'vertical', minHeight: '60px' }}
                />
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <button onClick={handleSaveAnswer} className="btn btn-primary btn-sm">
                    ✓ 保存答案
                  </button>
                  <button onClick={handleCancelAnswerEdit} className="btn btn-sm">
                    ✕ 取消
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={q.id}
              className={`question-item question-${status}`}
              data-question={q.text}
              title="点击查看 | Shift+点击切换状态"
            >
              <span
                className={`question-icon status-${status}`}
                onClick={(e) => handleQuestionClick(q, e)}
                onContextMenu={(e) => handleQuestionClick(q, e)}
              >
                {status === 'answered' ? '✅' : status === 'forgot' ? '❌' : '⭐'}
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  className="question-text"
                  onClick={(e) => handleQuestionClick(q, e)}
                  style={{ flex: 1 }}
                >
                  {q.text}
                </span>

                {/* 答案显示 */}
                {q.answer && (
                  <div className="question-answer-section">
                    <div
                      className="question-answer-toggle"
                      onClick={(e) => toggleAnswerExpanded(q.id, e)}
                      style={{
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{expandedAnswers.has(q.id) ? '▼' : '▶'}</span>
                      <span>答案</span>
                    </div>
                    {expandedAnswers.has(q.id) && (
                      <div
                        className="question-answer-content"
                        style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)',
                          padding: '4px 8px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '4px',
                          marginTop: '2px',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {q.answer}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="question-actions">
                <button
                  className="btn-icon-sm"
                  onClick={(e) => handleStartAnswerEdit(q, e)}
                  title={q.answer ? "编辑答案" : "添加答案"}
                  style={{ color: q.answer ? 'var(--accent-green)' : 'var(--text-secondary)' }}
                >
                  💬
                </button>
                <button
                  className="btn-icon-sm"
                  onClick={(e) => handleStartEdit(q, e)}
                  title="编辑问题"
                >
                  ✎
                </button>
                <button
                  className="btn-icon-sm"
                  onClick={(e) => handleDeleteQuestion(q.id, e)}
                  title="删除"
                  style={{ color: '#ef4444' }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
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
    </div>
  );
}
