import { useMemo, useState } from 'react';
import { useGraphStore } from '../store/useGraph';
import { questionsForNode } from '../knowledge/questionLink';
import ExplanationCard from '../panels/ExplanationCard';
import RelationNetwork from '../panels/RelationNetwork';

/** 右侧面板：解释卡 → 问题 → 关系网 */
export default function RightSidePanel() {
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const questions = useGraphStore((s) => s.questions);
  const selectedQuestionId = useGraphStore((s) => s.selectedQuestionId);
  const setSelectedQuestion = useGraphStore((s) => s.setSelectedQuestion);
  const answerQuestion = useGraphStore((s) => s.answerQuestion);
  const addQuestion = useGraphStore((s) => s.addQuestion);
  const addNotification = useGraphStore((s) => s.addNotification);

  const siblingQuestions = useMemo(
    () => (focusNodeId ? questionsForNode(questions, focusNodeId) : []),
    [questions, focusNodeId],
  );

  return (
    <aside className="right-panel" id="right-panel">
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
                <button
                  key={q.id}
                  className={`right-question-item ${q.id === selectedQuestionId ? 'active' : ''} ${q.answered ? 'done' : ''}`}
                  onClick={() => setSelectedQuestion(q.id === selectedQuestionId ? null : q.id)}
                >
                  <span className="rq-dot">{q.answered ? '●' : '○'}</span>
                  <span className="rq-text">{q.text}</span>
                </button>
              ))
            )}
          </div>
          <QuickAnswer
            question={siblingQuestions.find((q) => q.id === selectedQuestionId) ?? null}
            answerQuestion={answerQuestion}
            addQuestion={(text) => {
              if (focusNodeId) addQuestion(text, focusNodeId);
            }}
            addNotification={addNotification}
            focusNodeId={focusNodeId}
          />
        </div>

        <RelationNetwork />
      </div>
    </aside>
  );
}

function QuickAnswer({
  question,
  answerQuestion,
  addQuestion,
  addNotification,
  focusNodeId,
}: {
  question: import('../types').Question | null;
  answerQuestion: (id: string, answer: string) => void;
  addQuestion: (text: string) => void;
  addNotification: (msg: string, type: string) => void;
  focusNodeId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [newText, setNewText] = useState('');

  if (!question) {
    // 没有选中问题，但可以新建
    return (
      <div className="rq-footer">
        <QuickAdd
          newText={newText}
          setNewText={setNewText}
          onAdd={() => {
            if (newText.trim() && focusNodeId) {
              addQuestion(newText.trim());
              setNewText('');
              addNotification('已添加问题', 'success');
            }
          }}
        />
      </div>
    );
  }

  const handleSave = () => {
    answerQuestion(question.id, editVal.trim());
    setEditing(false);
    addNotification('答案已保存', 'success');
  };

  return (
    <div className="rq-detail">
      <div className="rq-detail-bar">
        <span className={`rq-status ${question.answered ? 'done' : ''}`}>
          {question.answered ? '已答' : '待答'}
        </span>
        <span
          className="rq-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '收起 ▲' : '展开 ▼'}
        </span>
      </div>
      {expanded && (
        <div className="rq-detail-body">
          <div className="rq-detail-text">{question.text}</div>
          {editing ? (
            <div className="rq-edit">
              <textarea
                className="input"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                placeholder="写答案…"
                rows={3}
                autoFocus
              />
              <div className="rq-edit-actions">
                <button className="btn btn-primary btn-sm" onClick={handleSave}>保存</button>
                <button className="btn btn-sm" onClick={() => setEditing(false)}>取消</button>
              </div>
            </div>
          ) : question.answer ? (
            <div className="rq-answer" onDoubleClick={() => { setEditVal(question.answer || ''); setEditing(true); }}>
              {question.answer}
            </div>
          ) : (
            <button className="btn btn-sm" onClick={() => { setEditVal(''); setEditing(true); }}>✎ 写答案</button>
          )}
        </div>
      )}
      <QuickAdd
        newText={newText}
        setNewText={setNewText}
        onAdd={() => {
          if (newText.trim() && focusNodeId) {
            addQuestion(newText.trim());
            setNewText('');
            addNotification('已添加问题', 'success');
          }
        }}
      />
    </div>
  );
}

function QuickAdd({
  newText,
  setNewText,
  onAdd,
}: {
  newText: string;
  setNewText: (v: string) => void;
  onAdd: () => void;
}) {
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <button className="btn btn-sm rq-add-btn" onClick={() => setShow(true)}>
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
