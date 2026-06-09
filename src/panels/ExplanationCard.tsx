import { useState, useEffect } from 'react';
import { useGraphStore } from '../store/useGraph';
import { findTreeNodeById } from '../knowledge/treeUtils';
import type { ExplanationTab } from '../types';

// Inline formatting helper for bold (**text**) and inline code (`code`)
function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Combine both patterns into one to match in order
  const inlineRegex = /(\*\*|`)(.*?)\1/g;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    const textBefore = text.substring(currentIndex, match.index);
    if (textBefore) {
      parts.push(textBefore);
    }
    
    const type = match[1];
    const innerText = match[2];
    
    if (type === '**') {
      parts.push(<strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{innerText}</strong>);
    } else {
      parts.push(
        <code key={match.index} style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '4px',
          padding: '2px 5px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#e2e8f0',
          margin: '0 2px'
        }}>{innerText}</code>
      );
    }
    currentIndex = inlineRegex.lastIndex;
  }

  const textAfter = text.substring(currentIndex);
  if (textAfter) {
    parts.push(textAfter);
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

// Beautiful Premium Markdown & Codeblock Viewer Component
function MarkdownView({ content }: { content: string }) {
  if (!content) return <p className="text-muted" style={{ fontStyle: 'italic', opacity: 0.7 }}>无内容</p>;

  // Split content by code blocks: ```[lang]\n[code]\n```
  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
  let currentIndex = 0;

  const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(currentIndex, match.index);
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore });
    }
    parts.push({ type: 'code', lang: match[1], content: match[2] });
    currentIndex = codeBlockRegex.lastIndex;
  }

  const textAfter = content.substring(currentIndex);
  if (textAfter) {
    parts.push({ type: 'text', content: textAfter });
  }

  return (
    <div className="markdown-view" style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-secondary)' }}>
      {parts.map((part, partIdx) => {
        if (part.type === 'code') {
          return (
            <div key={partIdx} className="code-block-container" style={{ margin: '14px 0', position: 'relative' }}>
              {part.lang && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 12,
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.4)',
                  padding: '2px 6px',
                  background: 'rgba(0,0,0,0.3)',
                  borderBottomLeftRadius: '4px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em'
                }}>
                  {part.lang}
                </div>
              )}
              <pre style={{
                background: 'rgba(15,15,25,0.65)',
                border: '1px solid var(--border-secondary)',
                borderRadius: '8px',
                padding: '12px 14px',
                overflowX: 'auto',
                margin: 0,
                fontFamily: '"Fira Code", Consolas, "Courier New", Courier, monospace',
                fontSize: '12px',
                lineHeight: '1.6',
                color: '#e2e8f0',
                boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)'
              }}>
                <code style={{ fontFamily: 'inherit', color: 'inherit' }}>{part.content}</code>
              </pre>
            </div>
          );
        }

        // Handle text part: split into paragraphs (separated by double newlines)
        const blocks = part.content.split(/\n\s*\n/);
        return blocks.map((block, blockIdx) => {
          const trimmedBlock = block.trim();
          if (!trimmedBlock) return null;

          // Check if block is a list
          if (trimmedBlock.startsWith('* ') || trimmedBlock.startsWith('- ') || trimmedBlock.match(/^\d+\.\s/)) {
            const lines = trimmedBlock.split('\n');
            return (
              <ul key={blockIdx} style={{ paddingLeft: '20px', margin: '12px 0', listStyleType: 'disc' }}>
                {lines.map((line, lineIdx) => {
                  const contentOnly = line.replace(/^([\*\-\s]|\d+\.\s)+/, '');
                  return (
                    <li key={lineIdx} style={{ margin: '8px 0', fontSize: '13px', lineHeight: '1.65' }}>
                      {renderInlineFormatting(contentOnly)}
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Check if block is a heading/warning/special block
          if (trimmedBlock.startsWith('【') && trimmedBlock.includes('】')) {
            const headingMatch = trimmedBlock.match(/^【(.*?)】([\s\S]*)$/);
            if (headingMatch) {
              const headingTitle = headingMatch[1];
              const remainingBody = headingMatch[2].trim();
              const isWarning = headingTitle.includes('警告') || headingTitle.includes('危险') || headingTitle.includes('⚠️') || headingTitle.includes('陷阱');

              return (
                <div key={blockIdx} style={{
                  margin: '18px 0',
                  padding: '12px 16px',
                  background: isWarning ? 'rgba(239, 68, 68, 0.05)' : 'rgba(139, 92, 246, 0.04)',
                  borderLeft: isWarning ? '3px solid #ef4444' : '3px solid var(--accent-purple)',
                  borderRadius: '6px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: isWarning ? '#ef4444' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{isWarning ? '⚠️' : '⚡'}</span>
                    <span>{headingTitle}</span>
                  </h4>
                  {remainingBody && (
                    <div style={{ margin: 0, fontSize: '13px', lineHeight: '1.65', color: 'var(--text-secondary)' }}>
                      {renderInlineFormatting(remainingBody)}
                    </div>
                  )}
                </div>
              );
            }
          }

          // Default paragraph
          return (
            <p key={blockIdx} style={{ margin: '12px 0', fontSize: '13px', lineHeight: '1.65', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
              {renderInlineFormatting(trimmedBlock)}
            </p>
          );
        });
      })}
    </div>
  );
}

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
  const [isEditing, setIsEditing] = useState(false);

  const selectedTreeNode = selectedTreeNodeId
    ? findTreeNodeById(treeData, selectedTreeNodeId)
    : null;
  const suggestedLabel = selectedTreeNode?.name.trim() ?? '';
  const createLabel = (newLabel.trim() || suggestedLabel).trim();

  // Reset Edit Mode back to Preview Mode when active node, tree item, or active tab switches
  useEffect(() => {
    setIsEditing(false);
    if (explanation?.tabs[0]) {
      const first = explanation.tabs[0];
      setActiveTab(first.id || first.label);
    } else {
      setActiveTab('');
    }
  }, [selectedNodeId, selectedTreeNodeId, explanation?.nodeId]);

  // Turn edit mode off when tabs change in same card
  useEffect(() => {
    setIsEditing(false);
  }, [activeTab]);

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
              ? '该节点尚未关联知识实体。'
              : '从左侧节点树选择节点。'}
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
        <div className="explanation-card-header" style={{ padding: '8px 12px' }}>
          <div className="explanation-card-node" style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
            {explanation.title}{' '}
            <span className="node-en" style={{ wordBreak: 'break-all' }}>({selectedNodeId})</span>
            {selectedTreeNodeId && (
              <span className="text-xs text-muted" style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>
                · 当前目录路径
              </span>
            )}
          </div>
          {/* Edit / Read Mode Switcher */}
          <button
            type="button"
            className="btn btn-sm"
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '4px',
              background: isEditing ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)',
              borderColor: isEditing ? 'var(--accent-purple)' : 'var(--border-secondary)',
              color: isEditing ? 'var(--accent-purple)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
            onClick={() => setIsEditing(!isEditing)}
          >
            <span>{isEditing ? '👁️ 预览' : '✍️ 编辑'}</span>
          </button>
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
          {isEditing ? (
            isPoolTab && activeContent?.id ? (
              <textarea
                className="input"
                style={{
                  width: '100%',
                  minHeight: '280px',
                  resize: 'vertical',
                  fontSize: '13px',
                  fontFamily: '"Fira Code", Consolas, monospace',
                  lineHeight: '1.6',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-secondary)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
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
                style={{
                  width: '100%',
                  minHeight: '280px',
                  resize: 'vertical',
                  fontSize: '13px',
                  fontFamily: '"Fira Code", Consolas, monospace',
                  lineHeight: '1.6',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-secondary)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
                value={activeContent?.content ?? ''}
                placeholder="填写此导航路径下的补充说明（方言、上下文等）…"
                onChange={(e) => updatePathSupplementContent(selectedTreeNodeId, e.target.value)}
              />
            ) : (
              <p className="text-muted">{activeContent?.content || '无内容'}</p>
            )
          ) : (
            <MarkdownView content={activeContent?.content ?? ''} />
          )}



          {(explanation.notes || supplement?.notes) && (
            <div
              className="card-note-container"
              style={{ borderTop: '1px solid var(--border-secondary)', marginTop: 16, paddingTop: 12, paddingBottom: 4 }}
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
    </div>
  );
}
