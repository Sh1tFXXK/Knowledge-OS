import { useEffect, useMemo, useState } from 'react';
import { useGraphStore } from '../store/useGraph';
import {
  collectTreeReferencesByNodeRef,
  findTreeNodeById,
  type TreeNodeReference,
} from '../knowledge/treeUtils';
import { findMatrixProjections } from '../knowledge/projection';
import { findPagePath, findTabPath } from '../knowledge/explanationTree';
import {
  defaultExplanationSelection,
  explicitPagesForTab,
  isExplanationContentSelectionValid,
} from '../knowledge/explanationIndex';
import { ExplanationSelectionKind } from '../types';
import { KnowledgeNodeKind } from '../types';
import { createEmptyMechanismSpec } from '../mechanism';
import MarkdownView from './explanation/MarkdownView';
import ExplanationTableSection from './explanation/ExplanationTableSection';
import ProjectionReferences from './explanation/ProjectionReferences';
import SupertagPanel from './explanation/SupertagPanel';
import KnowledgePointTimeline from '../components/KnowledgePointTimeline';
import MechanismSpecEditor from './explanation/MechanismSpecEditor';
import { collectKnowledgeReferences } from '../knowledge/nodeReferences';

export default function ExplanationCard() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedTreeNodeId = useGraphStore((state) => state.selectedTreeNodeId);
  const getKnowledgeExplanation = useGraphStore((state) => state.getKnowledgeExplanation);
  const updateKnowledgeTab = useGraphStore((state) => state.updateKnowledgeTab);
  const updateKnowledgeTabPage = useGraphStore((state) => state.updateKnowledgeTabPage);
  const updateKnowledgeRootContent = useGraphStore((state) => state.updateKnowledgeRootContent);
  const updateKnowledgeRootTable = useGraphStore((state) => state.updateKnowledgeRootTable);
  const updateKnowledgeTabTable = useGraphStore((state) => state.updateKnowledgeTabTable);
  const updateKnowledgeTabPageTable = useGraphStore(
    (state) => state.updateKnowledgeTabPageTable,
  );
  const updatePathSupplementContent = useGraphStore(
    (state) => state.updatePathSupplementContent,
  );
  const updatePathSupplementTable = useGraphStore((state) => state.updatePathSupplementTable);
  const addKnowledgeNode = useGraphStore((state) => state.addKnowledgeNode);
  const linkTreeToKnowledge = useGraphStore((state) => state.linkTreeToKnowledge);
  const selectTreeEntry = useGraphStore((state) => state.selectTreeEntry);
  const addNotification = useGraphStore((state) => state.addNotification);
  const updateKnowledgeNodeMeta = useGraphStore((state) => state.updateKnowledgeNodeMeta);
  const updateKnowledgeEdgeRelationKind = useGraphStore(
    (state) => state.updateKnowledgeEdgeRelationKind,
  );
  const setActiveView = useGraphStore((state) => state.setActiveView);
  const treeData = useGraphStore((state) => state.treeData);
  const nodePool = useGraphStore((state) => state.nodePool);
  const knowledgeEdges = useGraphStore((state) => state.knowledgeEdges);
  const openCard = useGraphStore((state) => state.openCard);
  const openSupertag = useGraphStore((state) => state.openSupertag);
  const activeExplanationSelection = useGraphStore(
    (state) => state.activeExplanationSelection,
  );
  const setActiveExplanationSelection = useGraphStore(
    (state) => state.setActiveExplanationSelection,
  );
  const nodeMeta = useGraphStore((state) =>
    selectedNodeId ? state.nodePool[selectedNodeId] : undefined,
  );

  const explanation = getKnowledgeExplanation();
  const [newLabel, setNewLabel] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const selectedTreeNode = selectedTreeNodeId
    ? findTreeNodeById(treeData, selectedTreeNodeId)
    : null;
  const contextRefs: TreeNodeReference[] = useMemo(
    () => (selectedNodeId ? collectTreeReferencesByNodeRef(treeData, selectedNodeId) : []),
    [selectedNodeId, treeData],
  );
  const activeSelection =
    activeExplanationSelection?.nodeId === selectedNodeId
      ? activeExplanationSelection
      : null;
  const activePathContext =
    activeSelection?.kind === ExplanationSelectionKind.Path
      ? contextRefs.find((context) => context.treeNodeId === activeSelection.treeNodeId) ?? null
      : null;
  const activeContext =
    activePathContext ??
    contextRefs.find((context) => context.treeNodeId === selectedTreeNodeId) ??
    contextRefs[0] ??
    null;
  const activeContextSupplement = activeContext?.supplement ?? null;
  const suggestedLabel = selectedTreeNode?.name.trim() ?? '';
  const createLabel = (newLabel.trim() || suggestedLabel).trim();

  const updateNodeKind = (value: string) => {
    if (!selectedNodeId || !nodeMeta) return;
    const kind = value ? value as KnowledgeNodeKind : undefined;
    updateKnowledgeNodeMeta(selectedNodeId, {
      kind,
      role: kind === KnowledgeNodeKind.Mechanism
        ? 'mechanism'
        : nodeMeta.role === 'mechanism'
          ? 'plain'
          : nodeMeta.role,
      mechanismSpec: kind === KnowledgeNodeKind.Mechanism
        ? nodeMeta.mechanismSpec ?? createEmptyMechanismSpec(selectedNodeId)
        : undefined,
    });
  };

  const activeTabId =
    activeSelection?.kind === ExplanationSelectionKind.Content ? activeSelection.tabId : '';
  const activePageId =
    activeSelection?.kind === ExplanationSelectionKind.Content
      ? activeSelection.pageId
      : null;
  const activeTabPath = useMemo(() => {
    if (
      !explanation ||
      activeSelection?.kind !== ExplanationSelectionKind.Content ||
      !activeTabId
    ) {
      return [];
    }
    return findTabPath(explanation.tabs, activeTabId) ?? [];
  }, [activeSelection?.kind, activeTabId, explanation]);
  const activeTab = activeTabPath[activeTabPath.length - 1] ?? null;
  const activePagePath = useMemo(() => {
    if (!explanation || !activeTab || !activePageId) return [];
    return findPagePath(explicitPagesForTab(explanation, activeTab), activePageId) ?? [];
  }, [activePageId, activeTab, explanation]);
  const activePage = activePagePath[activePagePath.length - 1] ?? null;
  const activePathTab =
    activeSelection?.kind === ExplanationSelectionKind.Path
      ? activeContextSupplement?.tabs?.find(
          (tab) => (tab.id || tab.label) === activeSelection.tabId,
        ) ?? null
      : null;
  const activeContent =
    activeSelection?.kind === ExplanationSelectionKind.Root
      ? (explanation.rootContent ?? '')
      : (activePathTab?.content ?? activePage?.content ?? activeTab?.content ?? '');
  const activeTable =
    activeSelection?.kind === ExplanationSelectionKind.Root
      ? explanation.rootTable
      : activeSelection?.kind === ExplanationSelectionKind.Path
        ? activePathTab?.table
        : activePage
          ? activePage.table
          : activeTab?.table;
  const activeTags = Array.from(
    new Set([
      ...(nodeMeta?.tags ?? []),
      ...(activeSelection?.kind === ExplanationSelectionKind.Content
        ? activePage?.tags ?? activeTab?.tags ?? []
        : []),
    ]),
  );
  const knowledgeReferences = useMemo(
    () => collectKnowledgeReferences(
      nodePool,
      selectedNodeId ? new Set([selectedNodeId]) : new Set<string>(),
    ),
    [nodePool, selectedNodeId],
  );

  const matrixProjections = selectedNodeId
    ? findMatrixProjections(nodePool, selectedNodeId)
    : [];

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
    addNotification(`已创建并绑定当前目录项：${createLabel}`, 'success');
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
      addNotification(`已加入节点池：${label}`, 'success');
      setNewLabel('');
    }
  };

  useEffect(() => {
    setIsEditing(false);

    if (!explanation || !selectedNodeId) {
      setActiveExplanationSelection(null);
      return;
    }

    const isValidContentSelection =
      activeExplanationSelection?.kind === ExplanationSelectionKind.Content &&
      isExplanationContentSelectionValid(explanation, activeExplanationSelection);
    const isValidPathSelection =
      activeExplanationSelection?.kind === ExplanationSelectionKind.Path &&
      activeExplanationSelection.nodeId === selectedNodeId &&
      (!selectedTreeNodeId || activeExplanationSelection.treeNodeId === selectedTreeNodeId) &&
      contextRefs.some(
        (context) =>
          context.treeNodeId === activeExplanationSelection.treeNodeId &&
          context.supplement?.tabs?.some(
            (tab) => (tab.id || tab.label) === activeExplanationSelection.tabId,
          ),
      );
    const isValidRootSelection =
      activeExplanationSelection?.kind === ExplanationSelectionKind.Root &&
      activeExplanationSelection.nodeId === selectedNodeId;

    if (!isValidContentSelection && !isValidPathSelection && !isValidRootSelection) {
      setActiveExplanationSelection(defaultExplanationSelection(explanation));
    }
    // Selection initialization only follows node or directory-context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, selectedTreeNodeId, explanation?.nodeId]);

  useEffect(() => {
    setIsEditing(false);
  }, [activeSelection]);

  useEffect(() => {
    if (explanation || !selectedTreeNodeId) return;
    setNewLabel(suggestedLabel);
  }, [explanation, selectedTreeNodeId, suggestedLabel]);

  if (!explanation) {
    return (
      <div className="right-section explanation-panel">
        <div style={{ padding: 16, fontSize: 12 }}>
          <p className="text-muted" style={{ marginBottom: 12, fontStyle: 'italic' }}>
            {selectedTreeNodeId
              ? '该目录项尚未关联知识实体。'
              : '从左侧节点树选择节点。'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className="input"
              placeholder={suggestedLabel || '知识名称，如 SQL 语句'}
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
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
      <div className="explanation-card">
        <div className="explanation-card-header explanation-card-header--compact">
          <div className="explanation-card-supertag-inline" aria-label="当前方格 super tags">
            <SupertagPanel tags={activeTags} onOpenTag={openSupertag} />
          </div>

          <div className="explanation-card-header-actions">
            <KnowledgePointTimeline />
            <button
              type="button"
              className={`btn btn-sm explanation-edit-toggle${isEditing ? ' is-active' : ''}`}
              onClick={() => setIsEditing((value) => !value)}
            >
              <span>{isEditing ? '预览' : '编辑'}</span>
            </button>
          </div>
        </div>

        <div className="explanation-card-body explanation-card-body--content-only">
          <div className="card-content" id="card-content-body">
            {isEditing ? (
              <div className="explanation-content-editor">
                <section className="knowledge-kind-editor">
                  <label htmlFor="knowledge-kind-select">知识性质</label>
                  <select
                    id="knowledge-kind-select"
                    className="input"
                    value={nodeMeta?.kind ?? ''}
                    onChange={(event: { target: { value: string } }) => updateNodeKind(event.target.value)}
                  >
                    <option value="">未分类</option>
                    {Object.values(KnowledgeNodeKind).map((kind) => (
                      <option key={kind} value={kind}>{kind === KnowledgeNodeKind.Mechanism ? '机制' : kind}</option>
                    ))}
                  </select>
                </section>
                {selectedNodeId && nodeMeta?.kind === KnowledgeNodeKind.Mechanism ? (
                  <MechanismSpecEditor
                    node={nodeMeta}
                    nodePool={nodePool}
                    knowledgeEdges={knowledgeEdges}
                    treeData={treeData}
                    onChange={(mechanismSpec) => updateKnowledgeNodeMeta(selectedNodeId, { mechanismSpec })}
                    onChangeEdgeKind={updateKnowledgeEdgeRelationKind}
                    onOpenMechanism={() => setActiveView('mechanism')}
                  />
                ) : null}
                <ExplanationTableSection
                  table={activeTable}
                  editing
                  onChange={(table) => {
                    if (!selectedNodeId || !activeSelection) return;
                    if (activeSelection.kind === ExplanationSelectionKind.Root) {
                      updateKnowledgeRootTable(selectedNodeId, table);
                      return;
                    }
                    if (activeSelection.kind === ExplanationSelectionKind.Path && activeContext) {
                      updatePathSupplementTable(activeContext.treeNodeId, activeSelection.tabId, table);
                      return;
                    }
                    if (activeSelection.kind === ExplanationSelectionKind.Content && activeTab) {
                      if (activePage) {
                        updateKnowledgeTabPageTable(
                          selectedNodeId,
                          activeTab.id,
                          activePage.id,
                          table,
                        );
                      } else {
                        updateKnowledgeTabTable(selectedNodeId, activeTab.id, table);
                      }
                    }
                  }}
                />
                {activeSelection?.kind === ExplanationSelectionKind.Root ? (
                  <textarea
                    className="explanation-editor"
                    value={explanation.rootContent ?? ''}
                    placeholder="填写概念总述..."
                    onChange={(event) => {
                      if (!selectedNodeId) return;
                      updateKnowledgeRootContent(selectedNodeId, event.target.value);
                    }}
                  />
                ) : activeSelection?.kind === ExplanationSelectionKind.Path &&
                  activePathTab &&
                  activeContext ? (
                    <textarea
                      className="explanation-editor"
                      value={activePathTab.content ?? ''}
                      placeholder="填写当前路径下的补充说明..."
                      onChange={(event) =>
                        updatePathSupplementContent(activeContext.treeNodeId, event.target.value)
                      }
                    />
                  ) : activeSelection?.kind === ExplanationSelectionKind.Content && activeTab ? (
                    <textarea
                      className="explanation-editor"
                      value={activePage?.content ?? activeTab.content}
                      placeholder="填写当前标题的内容..."
                      onChange={(event) => {
                        if (!selectedNodeId) return;
                        if (activePage) {
                          updateKnowledgeTabPage(
                            selectedNodeId,
                            activeTab.id,
                            activePage.id,
                            event.target.value,
                          );
                          return;
                        }
                        updateKnowledgeTab(selectedNodeId, activeTab.id, event.target.value);
                      }}
                    />
                  ) : (
                    <p className="text-muted">当前索引项没有正文</p>
                  )}
              </div>
            ) : (
              <>
                {activeContent.trim() || !activeTable ? (
                  <MarkdownView
                    content={activeContent}
                    references={knowledgeReferences}
                    onOpenReference={openCard}
                  />
                ) : null}
                <ExplanationTableSection table={activeTable} editing={false} onChange={() => undefined} />
              </>
            )}

            {selectedNodeId && matrixProjections.length > 0 && (
              <ProjectionReferences
                currentNodeId={selectedNodeId}
                nodePool={nodePool}
                projections={matrixProjections}
                onOpenOwner={openCard}
              />
            )}

            {(explanation.notes || activeContextSupplement?.notes) && (
              <div className="card-note-container">
                {explanation.notes && (
                  <div className="card-note">
                    <span className="card-note-label">备注:</span>
                    <span className="card-note-text">{explanation.notes}</span>
                  </div>
                )}
                {activeContextSupplement?.notes && (
                  <div className="card-note">
                    <span className="card-note-label">路径:</span>
                    <span className="card-note-text">{activeContextSupplement.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
