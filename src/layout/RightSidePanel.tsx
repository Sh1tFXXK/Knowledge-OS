import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useGraphStore } from '../store/useGraph';
import { questionsForNode } from '../knowledge/questionLink';
import ExplanationCard from '../panels/ExplanationCard';
import RelationNetworkSkeleton from '../panels/RelationNetworkSkeleton';
import type { Question, NotificationItem } from '../types';

/** 右侧面板：解释卡 → 问题 → 关系网占位 */
export default function RightSidePanel({
  onResizeStart,
}: {
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const questions = useGraphStore((s) => s.questions);
  const selectedQuestionId = useGraphStore((s) => s.selectedQuestionId);
  const setSelectedQuestion = useGraphStore((s) => s.setSelectedQuestion);
  const answerQuestion = useGraphStore((s) => s.answerQuestion);
  const addQuestion = useGraphStore((s) => s.addQuestion);
  const updateQuestion = useGraphStore((s) => s.updateQuestion);
  const removeQuestion = useGraphStore((s) => s.removeQuestion);
  const addNotification = useGraphStore((s) => s.addNotification);

  const siblingQuestions = useMemo(
    () => (focusNodeId ? questionsForNode(questions, focusNodeId) : []),
    [questions, focusNodeId],
  );

  const selectedQuestion =
    siblingQuestions.find((q) => q.id === selectedQuestionId) ?? null;

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
              siblingQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`right-question-item ${q.id === selectedQuestionId ? 'active' : ''} ${q.answered ? 'done' : ''}`}
                  onClick={() => setSelectedQuestion(q.id === selectedQuestionId ? null : q.id)}
                >
                  <span className="rq-dot">{q.answered ? '●' : '○'}</span>
                  <span className="rq-text">{q.text}</span>
                  <span
                    className="rq-item-del"
                    title="删除问题"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`确定要删除问题"${q.text}"吗？`)) {
                        removeQuestion(q.id);
                        addNotification('问题已删除', 'success');
                      }
                    }}
                  >
                    ✕
                  </span>
                </div>
              ))
            )}
          </div>
          <QuickAnswer
            question={selectedQuestion}
            focusNodeId={focusNodeId}
            answerQuestion={answerQuestion}
            updateQuestion={updateQuestion}
            addQuestion={(text) => {
              if (focusNodeId) addQuestion(text, focusNodeId);
            }}
            addNotification={addNotification}
          />
        </div>

        <RelationNetworkSkeleton />
      </div>
    </aside>
  );
}

function QuickAnswer({
  question,
  focusNodeId,
  answerQuestion,
  updateQuestion,
  addQuestion,
  addNotification,
}: {
  question: Question | null;
  focusNodeId: string | null;
  answerQuestion: (id: string, answer: string) => void;
  updateQuestion: (id: string, text: string) => void;
  addQuestion: (text: string) => void;
  addNotification: (msg: string, type: NotificationItem['type']) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [editAnswerVal, setEditAnswerVal] = useState('');
  const [editingText, setEditingText] = useState(false);
  const [editTextVal, setEditTextVal] = useState('');
  const [newText, setNewText] = useState('');

  const handleSaveAnswer = () => {
    if (!question) return;
    answerQuestion(question.id, editAnswerVal.trim());
    setEditingAnswer(false);
    addNotification('答案已保存', 'success');
  };

  const handleSaveText = () => {
    if (!question) return;
    if (editTextVal.trim()) {
      updateQuestion(question.id, editTextVal.trim());
      addNotification('问题已更新', 'success');
    }
    setEditingText(false);
  };

  const noQuestionAdd = () => {
    if (newText.trim() && focusNodeId) {
      addQuestion(newText.trim());
      setNewText('');
      addNotification('已添加问题', 'success');
    }
  };

  if (!question) {
    // 没有选中问题，仍可新建（关联当前目录焦点）
    return (
      <div className="rq-footer">
        <QuickAdd newText={newText} setNewText={setNewText} onAdd={noQuestionAdd} disabled={!focusNodeId} />
        {!focusNodeId && (
          <div className="rq-hint">先在左侧目录选择知识点即可提问</div>
        )}
      </div>
    );
  }

  return (
    <div className="rq-detail">
      <div className="rq-detail-bar">
        <span className={`rq-status ${question.answered ? 'done' : ''}`}>
          {question.answered ? '已答' : '待答'}
        </span>
        <span className="rq-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起 ▲' : '展开 ▼'}
        </span>
      </div>
      {expanded && (
        <div className="rq-detail-body">
          {/* 问题文本：可编辑 */}
          {editingText ? (
            <div className="rq-edit">
              <textarea
                className="input"
                value={editTextVal}
                onChange={(e) => setEditTextVal(e.target.value)}
                placeholder="编辑问题…"
                rows={2}
                autoFocus
              />
              <div className="rq-edit-actions">
                <button className="btn btn-primary btn-sm" onClick={handleSaveText}>保存</button>
                <button className="btn btn-sm" onClick={() => setEditingText(false)}>取消</button>
              </div>
            </div>
          ) : (
            <div className="rq-detail-text-row">
              <div className="rq-detail-text">{question.text}</div>
              <button
                className="btn-icon-sm rq-edit-text-btn"
                title="编辑问题"
                onClick={() => { setEditTextVal(question.text); setEditingText(true); }}
              >
                ✎
              </button>
            </div>
          )}

          {/* 答案：可编辑 */}
          {editingAnswer ? (
            <div className="rq-edit">
              <textarea
                className="input"
                value={editAnswerVal}
                onChange={(e) => setEditAnswerVal(e.target.value)}
                placeholder="写答案…"
                rows={3}
                autoFocus
              />
              <div className="rq-edit-actions">
                <button className="btn btn-primary btn-sm" onClick={handleSaveAnswer}>保存</button>
                <button className="btn btn-sm" onClick={() => setEditingAnswer(false)}>取消</button>
              </div>
            </div>
          ) : question.answer ? (
            <div
              className="rq-answer"
              title="双击编辑答案"
              onDoubleClick={() => { setEditAnswerVal(question.answer || ''); setEditingAnswer(true); }}
            >
              {question.answer}
              <button
                className="btn-icon-sm rq-edit-answer-btn"
                title="编辑答案"
                onClick={(e) => { e.stopPropagation(); setEditAnswerVal(question.answer || ''); setEditingAnswer(true); }}
              >
                ✎
              </button>
            </div>
          ) : (
            <button
              className="btn btn-sm"
              onClick={() => { setEditAnswerVal(''); setEditingAnswer(true); }}
            >
              ✎ 写答案
            </button>
          )}
        </div>
      )}
      <QuickAdd newText={newText} setNewText={setNewText} onAdd={noQuestionAdd} disabled={!focusNodeId} />
    </div>
  );
}

function QuickAdd({
  newText,
  setNewText,
  onAdd,
  disabled,
}: {
  newText: string;
  setNewText: (v: string) => void;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <button
        className="btn btn-sm rq-add-btn"
        onClick={() => setShow(true)}
        disabled={disabled}
        title={disabled ? '先选择知识点' : '新建问题（关联当前知识点）'}
      >
        ＋ 提问
      </button>
    );
  }
  return (
    <div className="rq-add">
      <input
        className="input"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder="新问题…"
        onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') setShow(false); }}
        autoFocus
      />
      <button className="btn btn-primary btn-sm" onClick={onAdd}>添加</button>
      <button className="btn btn-sm" onClick={() => setShow(false)}>取消</button>
    </div>
  );
}
