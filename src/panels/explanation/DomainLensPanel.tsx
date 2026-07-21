import { useEffect, useState } from 'react';
import type { TreeNodeReference } from '../../knowledge/treeUtils';
import type { KnowledgeNode } from '../../types';
import MarkdownView from './MarkdownView';

type SupertagMode = 'extract' | 'compare' | 'summarize';

function compactText(text: string, max = 88): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function contextPathLabel(reference: TreeNodeReference): string {
  const visiblePath = reference.path.slice(1);
  const parentPath = visiblePath.length > 1 ? visiblePath.slice(0, -1) : visiblePath;
  return parentPath.join(' / ') || reference.name;
}

function contextFullPath(reference: TreeNodeReference): string {
  return reference.path.slice(1).join(' / ') || reference.name;
}

function primaryContextContent(reference: TreeNodeReference): string {
  return reference.supplement?.tabs?.[0]?.content?.trim() ?? '';
}

function firstTabSummary(node: KnowledgeNode, max = 96): string {
  const text = node.card.tabs[0]?.content?.replace(/\s+/g, ' ').trim() ?? '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function DomainLensPanel({
  contexts,
  activeContextId,
  selectedTreeNodeId,
  showDetail,
  nodePool,
  activeSupertag,
  onPickContext,
  onOpenTreeContext,
  onOpenNode,
}: {
  contexts: TreeNodeReference[];
  activeContextId: string | null;
  selectedTreeNodeId: string | null;
  showDetail: boolean;
  nodePool: Record<string, KnowledgeNode>;
  activeSupertag: string;
  onPickContext: (treeNodeId: string) => void;
  onOpenTreeContext: (treeNodeId: string) => void;
  onOpenNode: (nodeId: string | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [supertagMode, setSupertagMode] = useState<SupertagMode>('extract');
  const visibleLimit = 6;
  const activeContext = contexts.find((context) => context.treeNodeId === activeContextId) ?? contexts[0];
  const activeSupertagMembers = activeSupertag
    ? Object.values(nodePool).filter((member) => member.tags?.includes(activeSupertag))
    : [];
  const activeIsHidden =
    !!activeContext &&
    contexts.slice(0, visibleLimit).every((context) => context.treeNodeId !== activeContext.treeNodeId);
  const baseVisibleContexts = showAll ? contexts : contexts.slice(0, visibleLimit);
  const visibleContexts =
    !showAll && activeIsHidden
      ? [...baseVisibleContexts.slice(0, Math.max(visibleLimit - 1, 0)), activeContext]
      : baseVisibleContexts;
  const remainingCount = Math.max(contexts.length - visibleContexts.length, 0);

  useEffect(() => {
    setShowAll(false);
  }, [contexts]);

  useEffect(() => {
    setSupertagMode('extract');
  }, [activeSupertag]);

  if (contexts.length === 0 && !activeSupertag) return null;

  return (
    <section className="domain-lens-block" aria-label="领域镜头">
      <div className="domain-lens-head">
        <div>
          <div className="domain-lens-title">领域镜头</div>
          <div className="domain-lens-subtitle">
            {contexts.length > 0 ? `${contexts.length} 个目录引用同一概念` : '当前概念暂无目录引用'}
            {activeSupertag ? ` · supertag ${activeSupertag} 聚合 ${activeSupertagMembers.length} 个材料` : ''}
          </div>
        </div>
        {contexts.length > visibleLimit && (
          <button type="button" className="domain-lens-more" onClick={() => setShowAll((value) => !value)}>
            {showAll ? '收起' : `更多 ${remainingCount}`}
          </button>
        )}
      </div>

      {contexts.length > 0 && (
        <div className="domain-lens-grid">
          {visibleContexts.map((context) => {
            const isActive = context.treeNodeId === activeContext?.treeNodeId;
            const isSelectedPath = context.treeNodeId === selectedTreeNodeId;
            const summary = primaryContextContent(context) || context.supplement?.notes || '该领域尚未写具体化解释';
            return (
              <button
                key={context.treeNodeId}
                type="button"
                className={`domain-lens-card${isActive ? ' is-active' : ''}`}
                onClick={() => onPickContext(context.treeNodeId)}
              >
                <span className="domain-lens-domain">{contextPathLabel(context)}</span>
                <span className="domain-lens-name">{context.name}</span>
                <span className="domain-lens-summary">{compactText(summary)}</span>
                {isSelectedPath && <span className="domain-lens-current">当前路径</span>}
              </button>
            );
          })}
        </div>
      )}

      {activeSupertag && (
        <section className="supertag-panel domain-lens-supertag" aria-label={`supertag 锚点 ${activeSupertag}`}>
          <div className="supertag-panel-head">
            <div>
              <div className="supertag-panel-title">{activeSupertag}</div>
              <div className="supertag-panel-subtitle">
                {activeSupertagMembers.length} 个材料挂在这个锚点上，可继续归纳父类
              </div>
            </div>
            <div className="supertag-panel-actions">
              <button type="button" className={supertagMode === 'extract' ? 'is-active' : ''} onClick={() => setSupertagMode('extract')}>材料</button>
              <button type="button" className={supertagMode === 'compare' ? 'is-active' : ''} onClick={() => setSupertagMode('compare')}>相似</button>
              <button type="button" className={supertagMode === 'summarize' ? 'is-active' : ''} onClick={() => setSupertagMode('summarize')}>父类</button>
            </div>
          </div>
          {supertagMode === 'extract' && (
            <div className="supertag-member-list">
              {activeSupertagMembers.map((member) => (
                <button key={member.id} type="button" onClick={() => onOpenNode(member.id)}>
                  <span>{member.card.title}</span>
                  <small>{firstTabSummary(member) || '暂无定义内容'}</small>
                </button>
              ))}
            </div>
          )}
          {supertagMode === 'compare' && (
            <div className="supertag-compare-grid">
              {activeSupertagMembers.map((member) => (
                <div key={member.id} className="supertag-compare-item">
                  <strong>{member.card.title}</strong>
                  <p>{firstTabSummary(member, 160) || '暂无定义内容'}</p>
                </div>
              ))}
            </div>
          )}
          {supertagMode === 'summarize' && (
            <p className="supertag-summary">
              {activeSupertag} 是这个系统里的抽象锚点：先收集相似材料，再比较差异，最后沉淀为父类候选。
              当前材料：{activeSupertagMembers.map((member) => member.card.title).join('、') || '暂无成员'}。
            </p>
          )}
        </section>
      )}

      {showDetail && activeContext && !activeSupertag && (
        <div className="domain-lens-detail">
          <div className="domain-lens-detail-head">
            <div>
              <div className="domain-lens-detail-title">{activeContext.name}</div>
              <div className="domain-lens-detail-path">{contextFullPath(activeContext)}</div>
            </div>
            <button
              type="button"
              className="domain-lens-open"
              onClick={() => onOpenTreeContext(activeContext.treeNodeId)}
              disabled={activeContext.treeNodeId === selectedTreeNodeId}
            >
              定位目录
            </button>
          </div>
          {primaryContextContent(activeContext) ? (
            <MarkdownView content={primaryContextContent(activeContext)} />
          ) : (
            <p className="text-muted domain-lens-empty">这个领域还没有具体化解释。</p>
          )}
        </div>
      )}
    </section>
  );
}
