import { useState } from 'react';
import { nodeExplanations } from '../data';
import { useGraphStore } from '../store/useGraph';

export default function ExplanationCard() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const [activeTab, setActiveTab] = useState('定义');

  const explanation = selectedNodeId ? nodeExplanations[selectedNodeId] : null;

  if (!explanation) {
    return (
      <div className="right-section">
        <div
          className="text-muted"
          style={{
            textAlign: 'center',
            padding: 20,
            fontStyle: 'italic',
            fontSize: 12,
          }}
        >
          请选择图谱中的节点
        </div>
      </div>
    );
  }

  const tabNames = explanation.tabs;
  if (!tabNames || tabNames.length === 0) return null;
  const activeContent = tabNames.find((t: any) => (t.id || t.label) === activeTab) || tabNames[0];

  return (
    <>
      {/* Header */}
      <div className="right-section-header">
        <div className="right-section-title">
          <span>📋</span><span>解释卡</span>
          <span className="title-en">(Explanation Card)</span>
        </div>
        <div className="right-section-actions">
          <button className="btn btn-icon btn-sm">⋮</button>
        </div>
      </div>

      <div className="explanation-card">
        {/* Card Header */}
        <div className="explanation-card-header">
          <div className="explanation-card-node">
            节点：{explanation.title} <span className="node-en">({explanation.nodeId})</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="card-tabs">
          {tabNames.map((tab: any) => (
            <button
              key={tab.id || tab.label}
              className={`card-tab${(tab.id || tab.label) === activeTab ? ' active' : ''}`}
              data-tab={tab.id || tab.label}
              onClick={() => setActiveTab(tab.id || tab.label)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card-content" id="card-content-body">
          <p>{activeContent?.content || activeContent}</p>
        </div>

        {/* Notes */}
        {explanation.notes && (
          <div className="card-content" style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 8 }}>
            {Array.isArray(explanation.notes)
              ? explanation.notes.map((n: any, i: number) => (
                  <div className="card-note" key={i}>
                    <span className="card-note-label">{n.label}:</span>
                    <span className="card-note-text">{n.text}</span>
                  </div>
                ))
              : <p>{explanation.notes}</p>
            }
          </div>
        )}

        {/* Footer */}
        <div className="card-footer">
          <span style={{ cursor: 'pointer' }} id="btn-view-related">👁 查看相关节点 ({explanation.relatedCount || 0})</span>
        </div>
      </div>
    </>
  );
}
