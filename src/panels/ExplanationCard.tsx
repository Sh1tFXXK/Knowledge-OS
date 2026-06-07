import { useState, useEffect } from 'react';
import { useGraphStore } from '../store/useGraph';
import { findTreeNodeById } from '../knowledge/treeUtils';
import type { ExplanationTab } from '../types';

export default function ExplanationCard() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedTreeNodeId = useGraphStore((s) => s.selectedTreeNodeId);
  const getKnowledgeExplanation = useGraphStore((s) => s.getKnowledgeExplanation);
  const getTreeSupplement = useGraphStore((s) => s.getTreeSupplement);
  const updateKnowledgeTab = useGraphStore((s) => s.updateKnowledgeTab);
  const updatePathSupplementContent = useGraphStore((s) => s.updatePathSupplementContent);
  const addKnowledgeNode = useGraphStore((s) => s.addKnowledgeNode);
  const linkTreeToKnowledge = useGraphStore((s) => s.linkTreeToKnowledge);
  const selectTreeEntry = useGraphStore((s) => s.selectTreeEntry);
  const addNotification = useGraphStore((s) => s.addNotification);
  const updateKnowledgeNodeMeta = useGraphStore((s) => s.updateKnowledgeNodeMeta);
  const treeData = useGraphStore((s) => s.treeData);
  const nodeMeta = useGraphStore((s) =>
    selectedNodeId ? s.nodePool[selectedNodeId] : undefined,
  );

  const explanation = getKnowledgeExplanation();
  const supplement = getTreeSupplement();
  const [activeTab, setActiveTab] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const selectedTreeNode = selectedTreeNodeId
    ? findTreeNodeById(treeData, selectedTreeNodeId)
    : null;
  const suggestedLabel = selectedTreeNode?.name.trim() ?? '';
  const createLabel = (newLabel.trim() || suggestedLabel).trim();

  useEffect(() => {
    if (explanation?.tabs[0]) {
      const first = explanation.tabs[0];
      setActiveTab(first.id || first.label);
    } else {
      setActiveTab('');
    }
  }, [selectedNodeId, selectedTreeNodeId, explanation?.nodeId]);

  useEffect(() => {
    if (explanation || !selectedTreeNodeId) return;
    setNewLabel(suggestedLabel);
  }, [explanation, selectedTreeNodeId, suggestedLabel]);

  const handleCreateForCurrentTree = () => {
    if (!selectedTreeNodeId) return;
    if (!createLabel) {
      addNotification('请先填写知识名称', 'warning');
      return;
    }

    const id = addKnowledgeNode(createLabel);
    if (!id) {
      addNotification('创建失败：知识名称为空', 'warning');
      return;
    }

    linkTreeToKnowledge(selectedTreeNodeId, id);
    selectTreeEntry(selectedTreeNodeId);
    addNotification(`已创建并绑定当前目录项: ${createLabel}`, 'success');
    setNewLabel('');
  };

  const handleCreateInPool = () => {
    const label = newLabel.trim();
    if (!label) {
      addNotification('请先填写知识名称', 'warning');
      return;
    }

    const id = addKnowledgeNode(label);
    if (id) {
      addNotification(`已加入节点池: ${label}`, 'success');
      setNewLabel('');
    }
  };

  const supplementTabs = supplement?.tabs ?? [];
  const pathTab: ExplanationTab | null =
    explanation && selectedTreeNodeId
      ? supplementTabs[0] ?? {
          id: 'path',
          label: '路径补充',
          content: '',
        }
      : null;

  const allTabs: ExplanationTab[] = explanation
    ? [
        ...explanation.tabs,
        ...(pathTab
          ? [
              {
                ...pathTab,
                label: pathTab.label.startsWith('路径·')
                  ? pathTab.label
                  : `路径·${pathTab.label}`,
              },
            ]
          : []),
        ...supplementTabs.slice(1).map((tab) => ({
          ...tab,
          label: tab.label.startsWith('路径·') ? tab.label : `路径·${tab.label}`,
        })),
      ]
    : [];

  const activeContent =
    allTabs.find((t) => (t.id || t.label) === activeTab) || allTabs[0];
  const isPoolTab =
    !!explanation &&
    !!activeContent &&
    explanation.tabs.some((t) => (t.id || t.label) === activeTab);

  const isPathTab = !!pathTab && (pathTab.id || pathTab.label) === activeTab;

  if (!explanation) {
    return (
      <div className="right-section explanation-panel">
        <div style={{ padding: 16, fontSize: 12 }}>
          <p className="text-muted" style={{ marginBottom: 12, fontStyle: 'italic' }}>
            {selectedTreeNodeId
              ? '该目录项是文件夹，或尚未关联节点池。'
              : '从左侧目录添加知识，或在下方创建解释卡。'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className="input"
              placeholder={suggestedLabel || '知识名称，如 SQL语句'}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            {selectedTreeNodeId ? (
              <button
                className="btn btn-primary btn-sm"
                disabled={!createLabel}
                onClick={handleCreateForCurrentTree}
              >
                创建知识并绑定当前目录项
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                disabled={!newLabel.trim()}
                onClick={handleCreateInPool}
              >
                仅加入节点池
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-section explanation-panel">
      <div className="right-section-header">
        <div className="right-section-title">
          <span>📋</span>
          <span>解释卡</span>
          <span className="title-en">(内涵 · 词条)</span>
        </div>
      </div>

      <div className="explanation-card">
        <div className="explanation-card-header">
          <div className="explanation-card-node">
            {explanation.title}{' '}
            <span className="node-en">({selectedNodeId})</span>
            {selectedTreeNodeId && (
              <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                · 当前目录路径
              </span>
            )}
          </div>
        </div>

        <div className="card-tabs">
          {allTabs.map((tab) => (
            <button
              key={tab.id || tab.label}
              className={`card-tab${(tab.id || tab.label) === activeTab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id || tab.label)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card-content" id="card-content-body">
          {isPoolTab && activeContent?.id ? (
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 72, resize: 'vertical', fontSize: 12 }}
              value={activeContent.content}
              placeholder={`填写「${activeContent.label}」…`}
              onChange={(e) =>
                selectedNodeId &&
                updateKnowledgeTab(selectedNodeId, activeContent.id, e.target.value)
              }
            />
          ) : isPathTab && selectedTreeNodeId ? (
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 72, resize: 'vertical', fontSize: 12 }}
              value={activeContent?.content ?? ''}
              placeholder="填写此导航路径下的补充说明（方言、上下文等）…"
              onChange={(e) => updatePathSupplementContent(selectedTreeNodeId, e.target.value)}
            />
          ) : (
            <p className="text-muted">{activeContent?.content || '无内容'}</p>
          )}
        </div>

        {selectedNodeId && (
          <details className="card-meta-details">
            <summary>高级 · 角色与维度</summary>
            <select
              className="input"
              style={{ fontSize: 11, width: '100%', marginTop: 6 }}
              value={nodeMeta?.role ?? 'plain'}
              onChange={(e) =>
                updateKnowledgeNodeMeta(selectedNodeId, {
                  role: e.target.value as import('../types').KnowledgeRole,
                })
              }
            >
              <option value="plain">普通</option>
              <option value="axiom">公理</option>
              <option value="mechanism">机制</option>
              <option value="conclusion">结论</option>
              <option value="subsystem">子系统</option>
            </select>
            <input
              className="input"
              style={{ fontSize: 11, width: '100%', marginTop: 6 }}
              placeholder="维度标签，逗号分隔"
              value={(nodeMeta?.dimensions ?? []).join(',')}
              onChange={(e) => {
                const dimensions = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                updateKnowledgeNodeMeta(selectedNodeId, { dimensions });
              }}
            />
          </details>
        )}

        {(explanation.notes || supplement?.notes) && (
          <div
            className="card-content"
            style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 8 }}
          >
            {explanation.notes && (
              <div className="card-note">
                <span className="card-note-label">备注:</span>
                <span className="card-note-text">{explanation.notes}</span>
              </div>
            )}
            {supplement?.notes && (
              <div className="card-note">
                <span className="card-note-label">路径:</span>
                <span className="card-note-text">{supplement.notes}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
