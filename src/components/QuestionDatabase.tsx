import { useState, useMemo } from 'react';
import { useGraphStore } from '../store/useGraph';
import type { QuestionAnswerStep } from '../types';
import QuestionAnswerEditor from './QuestionAnswerEditor';

type ViewMode = 'table' | 'cards';
type SortBy = 'text' | 'status' | 'created';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'status' | 'keyword';

export default function QuestionDatabase() {
  const questions = useGraphStore((s) => s.questions);
  const nodePool = useGraphStore((s) => s.nodePool);
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const selectedQuestionId = useGraphStore((s) => s.selectedQuestionId);
  const openCard = useGraphStore((s) => s.openCard);
  const setSelectedQuestion = useGraphStore((s) => s.setSelectedQuestion);
  const addQuestion = useGraphStore((s) => s.addQuestion);
  const addNotification = useGraphStore((s) => s.addNotification);
  const toggleQuestion = useGraphStore((s) => s.toggleQuestion);
  const removeQuestion = useGraphStore((s) => s.removeQuestion);
  const updateQuestion = useGraphStore((s) => s.updateQuestion);
  const answerQuestion = useGraphStore((s) => s.answerQuestion);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('text');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);

  // 扩展问题数据，添加状态
  const questionsWithStatus = useMemo(() => {
    return questions.map((q) => ({
      ...q,
      status: (q as any).status || (q.answered ? 'answered' : 'pending'),
    }));
  }, [questions]);

  // 搜索和过滤
  const filteredQuestions = useMemo(() => {
    let result = questionsWithStatus;

    // 搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((q) => q.text.toLowerCase().includes(query));
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      result = result.filter((q) => q.status === filterStatus);
    }

    return result;
  }, [questionsWithStatus, searchQuery, filterStatus]);

  // 排序
  const sortedQuestions = useMemo(() => {
    const sorted = [...filteredQuestions];
    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'text':
          compareValue = a.text.localeCompare(b.text, 'zh-CN');
          break;
        case 'status':
          const statusOrder = { pending: 1, answered: 2, forgot: 3 };
          compareValue = statusOrder[a.status as keyof typeof statusOrder] -
                        statusOrder[b.status as keyof typeof statusOrder];
          break;
        default:
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [filteredQuestions, sortBy, sortOrder]);

  // 分组
  const groupedQuestions = useMemo(() => {
    if (groupBy === 'none') {
      return { '全部': sortedQuestions };
    }

    const groups: Record<string, typeof sortedQuestions> = {};

    sortedQuestions.forEach((q) => {
      let groupKey = '其他';

      switch (groupBy) {
        case 'status':
          groupKey = q.status === 'answered' ? '✅ 已答复'
            : q.status === 'forgot' ? '❌ 忘答存疑'
            : '⭐ 未答复';
          break;
        case 'keyword':
          // 根据关键词分组
          const keywords = [...new Set(
            Object.values(nodePool).flatMap((n) => [
              n.label,
              ...(n.dimensions ?? []),
              ...(n.tags ?? []),
            ])
          )].slice(0, 12);
          const found = keywords.find(kw => q.text.toLowerCase().includes(kw.toLowerCase()));
          groupKey = found || '其他问题';
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(q);
    });

    return groups;
  }, [sortedQuestions, groupBy]);

  const handleQuestionClick = (q: typeof sortedQuestions[0]) => {
    setSelectedQuestion(q.id);

    if (q.relatedNodeId && nodePool[q.relatedNodeId]) {
      openCard(q.relatedNodeId);
      addNotification(`已选中问题并打开解释卡: ${nodePool[q.relatedNodeId].label}`, 'success');
      return;
    }

    const questionText = q.text.toLowerCase();
    let foundNodeId: string | null = null;

    for (const [nodeId, node] of Object.entries(nodePool)) {
      const label = node.label.toLowerCase();
      if (questionText.includes(label) || label.length > 2 && questionText.includes(label)) {
        foundNodeId = nodeId;
        break;
      }
    }

    if (foundNodeId) {
      openCard(foundNodeId);
      addNotification('已选中问题并打开关联解释卡', 'success');
    }
  };

  const handleAddQuestion = () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    addQuestion(trimmed, focusNodeId ?? undefined);
    setNewQuestion('');
    setShowAddForm(false);
    addNotification('问题已添加到问题库', 'success');
  };

  const handleToggleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleQuestion(id);
  };

  const handleDeleteQuestion = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除问题"${text}"吗？`)) {
      removeQuestion(id);
      addNotification('问题已删除', 'success');
    }
  };

  const handleStartEdit = (q: typeof sortedQuestions[0], e: React.MouseEvent) => {
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

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusLabel = (status: string) => {
    return status === 'answered' ? '✅ 已答复'
      : status === 'forgot' ? '❌ 忘答存疑'
      : '⭐ 未答复';
  };

  const handleStartAnswerEdit = (q: typeof sortedQuestions[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnswerId(q.id);
  };

  const handleSaveAnswer = (answer: string, steps: QuestionAnswerStep[]) => {
    if (editingAnswerId) {
      answerQuestion(editingAnswerId, answer, steps);
      setEditingAnswerId(null);
      addNotification('答案已保存', 'success');
    }
  };

  const handleCancelAnswerEdit = () => {
    setEditingAnswerId(null);
  };

  const getRelatedNodeLabel = (q: typeof sortedQuestions[0]) => {
    if (q.relatedNodeId && nodePool[q.relatedNodeId]) {
      return nodePool[q.relatedNodeId].label;
    }
    return null;
  };

  return (
    <div className="question-database">
      {/* 工具栏 */}
      <div className="database-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="input"
            placeholder="搜索问题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 200, fontSize: 11 }}
          />

          <select
            className="input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 120, fontSize: 11 }}
          >
            <option value="all">所有状态</option>
            <option value="pending">未答复</option>
            <option value="answered">已答复</option>
            <option value="forgot">忘答存疑</option>
          </select>

          <select
            className="input"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            style={{ width: 100, fontSize: 11 }}
          >
            <option value="none">不分组</option>
            <option value="status">按状态</option>
            <option value="keyword">按关键词</option>
          </select>
        </div>

        <div className="toolbar-right">
          {showAddForm ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="input"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddQuestion();
                  if (e.key === 'Escape') setShowAddForm(false);
                }}
                placeholder="输入新问题..."
                autoFocus
                style={{ width: 220, fontSize: 11 }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddQuestion}>
                添加
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setShowAddForm(false)}>
                取消
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowAddForm(true)}
              title={focusNodeId ? '关联当前目录知识点' : '新建问题'}
            >
              + 新建问题
            </button>
          )}
          <button
            className={`btn-icon${viewMode === 'table' ? ' active' : ''}`}
            onClick={() => setViewMode('table')}
            title="表格视图"
          >
            ☰
          </button>
          <button
            className={`btn-icon${viewMode === 'cards' ? ' active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="卡片视图"
          >
            ▦
          </button>
          <span className="qdb-count">
            共 <span className="qdb-count-num">{filteredQuestions.length}</span> 个问题
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="database-content">
        {filteredQuestions.length === 0 ? (
          <div className="database-empty">
            <div className="database-empty-icon">🔍</div>
            <p className="database-empty-title">没有找到匹配的问题</p>
            <p className="database-empty-hint">试试调整搜索关键词，或更换状态 / 分组筛选条件</p>
          </div>
        ) : (
        Object.entries(groupedQuestions).map(([groupName, groupQuestions]) => (
          <div key={groupName} className="database-group">
            {groupBy !== 'none' && (
              <div className="group-header">
                <span className="group-name">{groupName}</span>
                <span className="group-count">({groupQuestions.length})</span>
              </div>
            )}

            {viewMode === 'table' ? (
              <table className="database-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('text')} style={{ cursor: 'pointer', width: '40%' }}>
                      问题 {sortBy === 'text' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer', width: '15%' }}>
                      状态 {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ width: '20%' }}>关联知识点</th>
                    <th style={{ width: '10%' }}>答案</th>
                    <th style={{ width: '15%' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {groupQuestions.map((q) => {
                    const isEditing = editingId === q.id;
                    const isEditingAnswer = editingAnswerId === q.id;
                    const relatedLabel = getRelatedNodeLabel(q);

                    if (isEditing) {
                      return (
                        <tr key={q.id}>
                          <td colSpan={5}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                className="input"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                autoFocus
                                style={{ flex: 1, fontSize: 13 }}
                              />
                              <button onClick={handleSaveEdit} className="btn btn-primary btn-sm">✓</button>
                              <button onClick={handleCancelEdit} className="btn btn-sm">✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    if (isEditingAnswer) {
                      return (
                        <tr key={q.id}>
                          <td colSpan={5}>
                            <QuestionAnswerEditor
                              question={q}
                              nodePool={nodePool}
                              onSave={handleSaveAnswer}
                              onCancel={handleCancelAnswerEdit}
                            />
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={q.id}
                        className={q.id === selectedQuestionId ? 'row-selected' : undefined}
                        onClick={() => handleQuestionClick(q)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{q.text}</td>
                        <td>
                          <span className={`status-badge status-${q.status}`}>
                            {getStatusLabel(q.status)}
                          </span>
                        </td>
                        <td>
                          {relatedLabel ? (
                            <span
                              className="qdb-related-chip"
                              title={`关联: ${relatedLabel}`}
                            >
                              🔗 {relatedLabel}
                            </span>
                          ) : (
                            <span className="qdb-muted">-</span>
                          )}
                        </td>
                        <td>
                          {q.answer ? (
                            <span className="qdb-answered-flag">
                              ✓ 已填写
                            </span>
                          ) : (
                            <span className="qdb-muted">-</span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
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
                              onClick={(e) => handleToggleStatus(q.id, e)}
                              title="切换状态"
                            >
                              🔄
                            </button>
                            <button
                              className="btn-icon-sm"
                              onClick={(e) => handleStartEdit(q, e)}
                              title="编辑"
                            >
                              ✎
                            </button>
                            <button
                              className="btn-icon-sm"
                              onClick={(e) => handleDeleteQuestion(q.id, q.text, e)}
                              title="删除"
                              style={{ color: '#ef4444' }}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="database-cards">
                {groupQuestions.map((q) => {
                  const isEditing = editingId === q.id;
                  const isEditingAnswer = editingAnswerId === q.id;
                  const relatedLabel = getRelatedNodeLabel(q);

                  if (isEditing) {
                    return (
                      <div key={q.id} className="question-card question-card-editing">
                        <input
                          className="input"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          style={{ flex: 1, fontSize: 13, marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={handleSaveEdit} className="btn btn-primary btn-sm">✓ 保存</button>
                          <button onClick={handleCancelEdit} className="btn btn-sm">✕ 取消</button>
                        </div>
                      </div>
                    );
                  }

                  if (isEditingAnswer) {
                    return (
                      <div key={q.id} className="question-card question-card-editing">
                        <QuestionAnswerEditor
                          question={q}
                          nodePool={nodePool}
                          onSave={handleSaveAnswer}
                          onCancel={handleCancelAnswerEdit}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={q.id}
                      className={`question-card${q.id === selectedQuestionId ? ' question-card-selected' : ''}`}
                      onClick={() => handleQuestionClick(q)}
                    >
                      <div className="question-card-header">
                        <span className={`status-badge status-${q.status}`}>
                          {getStatusLabel(q.status)}
                        </span>
                        <div className="question-card-actions">
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
                            onClick={(e) => handleToggleStatus(q.id, e)}
                            title="切换状态"
                          >
                            🔄
                          </button>
                          <button
                            className="btn-icon-sm"
                            onClick={(e) => handleStartEdit(q, e)}
                            title="编辑"
                          >
                            ✎
                          </button>
                          <button
                            className="btn-icon-sm"
                            onClick={(e) => handleDeleteQuestion(q.id, q.text, e)}
                            title="删除"
                            style={{ color: '#ef4444' }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                      <div className="question-card-body">
                        <p className="question-card-text">{q.text}</p>

                        {/* 关联知识点 */}
                        {relatedLabel && (
                          <div style={{ marginTop: 8 }}>
                            <span
                              className="qdb-related-chip"
                              title={`关联: ${relatedLabel}`}
                            >
                              🔗 {relatedLabel}
                            </span>
                          </div>
                        )}

                        {/* 答案预览 */}
                        {q.answer && (
                          <div className="qdb-answer-preview">
                            <div className="qdb-answer-preview-title">
                              💬 答案
                            </div>
                            <div className="qdb-answer-preview-text">
                              {q.answer.length > 100 ? q.answer.substring(0, 100) + '...' : q.answer}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
        )}
      </div>
    </div>
  );
}
