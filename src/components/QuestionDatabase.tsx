import { useState, useMemo } from 'react';
import { useGraphStore } from '../store/useGraph';
import type { Question } from '../types';

type ViewMode = 'table' | 'cards';
type SortBy = 'text' | 'status' | 'created';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'status' | 'keyword';

export default function QuestionDatabase() {
  const questions = useGraphStore((s) => s.questions);
  const nodePool = useGraphStore((s) => s.nodePool);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const addNotification = useGraphStore((s) => s.addNotification);
  const toggleQuestion = useGraphStore((s) => s.toggleQuestion);
  const removeQuestion = useGraphStore((s) => s.removeQuestion);
  const updateQuestion = useGraphStore((s) => s.updateQuestion);
  const answerQuestion = useGraphStore((s) => s.answerQuestion);
  const linkQuestionToNode = useGraphStore((s) => s.linkQuestionToNode);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('text');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswer, setEditAnswer] = useState('');

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
          const keywords = ['MVCC', 'SQL', '索引', '事务', 'InnoDB', 'B+树', '优化'];
          const found = keywords.find(kw => q.text.includes(kw));
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
    // 如果有关联节点，直接跳转
    if (q.relatedNodeId && nodePool[q.relatedNodeId]) {
      setSelectedNode(q.relatedNodeId);
      addNotification(`已定位到关联知识点: ${nodePool[q.relatedNodeId].label}`, 'success');
      return;
    }

    // 查找相关节点
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
      setSelectedNode(foundNodeId);
      addNotification(`已定位到相关知识点`, 'success');
    } else {
      addNotification(`未找到相关知识点`, 'info');
    }
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
    setEditAnswer(q.answer || '');
  };

  const handleSaveAnswer = () => {
    if (editingAnswerId) {
      const trimmed = editAnswer.trim();
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
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            共 {filteredQuestions.length} 个问题
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="database-content">
        {Object.entries(groupedQuestions).map(([groupName, groupQuestions]) => (
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
                                style={{ flex: 1, fontSize: 11 }}
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                                style={{ fontSize: 11, resize: 'vertical' }}
                              />
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <button onClick={handleSaveAnswer} className="btn btn-primary btn-sm">✓ 保存答案</button>
                                <button onClick={handleCancelAnswerEdit} className="btn btn-sm">✕ 取消</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={q.id} onClick={() => handleQuestionClick(q)} style={{ cursor: 'pointer' }}>
                        <td>{q.text}</td>
                        <td>
                          <span className={`status-badge status-${q.status}`}>
                            {getStatusLabel(q.status)}
                          </span>
                        </td>
                        <td>
                          {relatedLabel ? (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: 'var(--accent-blue-dim)',
                                color: 'var(--accent-blue)',
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}
                              title={`关联: ${relatedLabel}`}
                            >
                              🔗 {relatedLabel}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {q.answer ? (
                            <span style={{ fontSize: 10, color: 'var(--accent-green)' }}>
                              ✓ 已填写
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>-</span>
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
                          style={{ flex: 1, fontSize: 11, marginBottom: 8 }}
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
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8 }}>
                          {q.text}
                        </div>
                        <textarea
                          className="input"
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          placeholder="输入答案..."
                          autoFocus
                          rows={4}
                          style={{ fontSize: 11, resize: 'vertical', marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={handleSaveAnswer} className="btn btn-primary btn-sm">✓ 保存答案</button>
                          <button onClick={handleCancelAnswerEdit} className="btn btn-sm">✕ 取消</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={q.id}
                      className="question-card"
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
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: 'var(--accent-blue-dim)',
                                color: 'var(--accent-blue)',
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}
                              title={`关联: ${relatedLabel}`}
                            >
                              🔗 {relatedLabel}
                            </span>
                          </div>
                        )}

                        {/* 答案预览 */}
                        {q.answer && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: '6px 8px',
                              background: 'var(--bg-secondary)',
                              borderRadius: '4px',
                              fontSize: 10,
                              color: 'var(--text-tertiary)',
                              maxHeight: '60px',
                              overflow: 'hidden',
                              position: 'relative'
                            }}
                          >
                            <div style={{ fontWeight: 500, color: 'var(--accent-green)', marginBottom: 4 }}>
                              💬 答案
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
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
        ))}
      </div>
    </div>
  );
}
