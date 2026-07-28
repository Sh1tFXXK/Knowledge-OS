import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useGraphStore } from '../store/useGraph';
import { questionsForNode } from '../knowledge/questionLink';
import ExplanationCard from '../panels/ExplanationCard';
import MarkdownView from '../panels/explanation/MarkdownView';
import RelationNetworkSkeleton from '../panels/RelationNetworkSkeleton';

/** 右侧面板：解释卡 → 问题 → 关系网占位 */
export default function RightSidePanel({
  onResizeStart,
}: {
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const focusNodeId = useGraphStore((s) => s.focusNodeId);
  const questions = useGraphStore((s) => s.questions);

  const siblingQuestions = useMemo(
    () => (focusNodeId ? questionsForNode(questions, focusNodeId) : []),
    [questions, focusNodeId],
  );
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);

  useEffect(() => {
    setOpenQuestionId(null);
  }, [focusNodeId]);

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
                return (
                  <article
                    key={q.id}
                    className={`right-question-card${isOpen ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="right-question-card-trigger"
                      aria-expanded={isOpen}
                      onClick={() => setOpenQuestionId(isOpen ? null : q.id)}
                    >
                      <span className="right-question-card-question">{q.text}</span>
                    </button>
                    {isOpen && (
                      <div
                        className={`right-question-card-answer${q.answer?.trim() ? '' : ' is-empty'}`}
                      >
                        {q.answer?.trim() ? (
                          <MarkdownView content={q.answer} />
                        ) : (
                          '暂无答案'
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>

        <RelationNetworkSkeleton />
      </div>
    </aside>
  );
}
