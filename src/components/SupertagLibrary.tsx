import { useMemo, useState } from 'react';
import { collectTreeReferencesByNodeRef } from '../knowledge/treeUtils';
import {
  collectSupertagMaterialGroups,
  supertagMaterialSignature,
  SupertagMaterialKind,
  type SupertagMaterial,
} from '../knowledge/supertagMaterials';
import { useGraphStore } from '../store/useGraph';
import MarkdownView from '../panels/explanation/MarkdownView';

enum SupertagLibraryMode {
  Materials = 'materials',
  Compare = 'compare',
}

function compactText(text: string, max = 180): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function materialKindLabel(kind: SupertagMaterialKind): string {
  if (kind === SupertagMaterialKind.Tab) return '标题';
  if (kind === SupertagMaterialKind.Page) return '子页';
  return '节点';
}

function materialPathLabel(material: SupertagMaterial): string {
  return material.path.length > 0 ? material.path.join(' / ') : '节点表述';
}

export default function SupertagLibrary() {
  const nodePool = useGraphStore((state) => state.nodePool);
  const treeData = useGraphStore((state) => state.treeData);
  const openCard = useGraphStore((state) => state.openCard);
  const setActiveExplanationSelection = useGraphStore(
    (state) => state.setActiveExplanationSelection,
  );
  const selectedSupertag = useGraphStore((state) => state.selectedSupertag);
  const openSupertag = useGraphStore((state) => state.openSupertag);
  const addNotification = useGraphStore((state) => state.addNotification);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(SupertagLibraryMode.Materials);

  const groups = useMemo(
    () => collectSupertagMaterialGroups(nodePool),
    [nodePool],
  );

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;

    return groups.filter((group) => {
      if (group.tag.toLowerCase().includes(normalizedQuery)) return true;
      return group.materials.some((material) =>
        material.nodeLabel.toLowerCase().includes(normalizedQuery) ||
        material.label.toLowerCase().includes(normalizedQuery) ||
        material.content.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [groups, query]);

  const activeGroup =
    filteredGroups.find((group) => group.tag === selectedSupertag) ?? filteredGroups[0] ?? null;

  const domainPathsByNode = useMemo(() => {
    const paths = new Map<string, string[]>();
    for (const material of activeGroup?.materials ?? []) {
      if (paths.has(material.nodeId)) continue;
      const domains = collectTreeReferencesByNodeRef(treeData, material.nodeId)
        .map((reference) => reference.path.slice(1, -1).join(' / '))
        .filter(Boolean);
      paths.set(material.nodeId, [...new Set(domains)]);
    }
    return paths;
  }, [activeGroup, treeData]);

  const signatureCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const material of activeGroup?.materials ?? []) {
      const signature = supertagMaterialSignature(material);
      if (!signature) continue;
      counts.set(signature, (counts.get(signature) ?? 0) + 1);
    }
    return counts;
  }, [activeGroup]);

  const handleOpenMaterial = (material: SupertagMaterial) => {
    openCard(material.nodeId);
    setActiveExplanationSelection(material.selection);
    addNotification(`已打开 ${material.nodeLabel}`, 'success');
  };

  return (
    <div className="supertag-library">
      <div className="database-toolbar">
        <div className="toolbar-left">
          <input
            className="input supertag-library-search"
            value={query}
            placeholder="搜索 super tag 或材料..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="toolbar-right">
          <span className="supertag-library-count">
            {filteredGroups.length} 个 super tag · {filteredGroups.reduce((sum, group) => sum + group.materials.length, 0)} 个材料
          </span>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="supertag-library-empty">暂无 super tag</div>
      ) : (
        <div className="supertag-library-body">
          <aside className="supertag-index" aria-label="Super tag 列表">
            {filteredGroups.map((group) => (
              <button
                key={group.tag}
                type="button"
                className={`supertag-index-item${activeGroup?.tag === group.tag ? ' is-active' : ''}`}
                onClick={() => openSupertag(group.tag)}
              >
                <span className="supertag-index-name">{group.tag}</span>
                <span className="supertag-index-count">{group.materials.length}</span>
              </button>
            ))}
          </aside>

          <section className="supertag-detail" aria-label="Super tag 材料">
            {activeGroup && (
              <>
                <div className="supertag-detail-head">
                  <div>
                    <h3>{activeGroup.tag}</h3>
                    <p>{activeGroup.materials.length} 段材料 · {activeGroup.nodeCount} 个领域知识节点</p>
                  </div>
                  <div className="supertag-mode-switch" role="tablist" aria-label="展示方式">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === SupertagLibraryMode.Materials}
                      className={mode === SupertagLibraryMode.Materials ? 'is-active' : ''}
                      onClick={() => setMode(SupertagLibraryMode.Materials)}
                    >
                      材料
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === SupertagLibraryMode.Compare}
                      className={mode === SupertagLibraryMode.Compare ? 'is-active' : ''}
                      onClick={() => setMode(SupertagLibraryMode.Compare)}
                    >
                      对比
                    </button>
                  </div>
                </div>

                {mode === SupertagLibraryMode.Materials ? (
                  <div className="supertag-material-grid">
                    {activeGroup.materials.map((material) => {
                      const preview = compactText(material.content);
                      const domains = domainPathsByNode.get(material.nodeId) ?? [];
                      return (
                        <button
                          key={`${material.tag}:${material.id}`}
                          type="button"
                          className="supertag-material-card"
                          onClick={() => handleOpenMaterial(material)}
                        >
                          <span className="supertag-material-head">
                            <strong>{material.nodeLabel}</strong>
                            <span className="supertag-material-kind">
                              {materialKindLabel(material.kind)}
                            </span>
                          </span>
                          <span className="supertag-material-location">
                            {materialPathLabel(material)}
                          </span>
                          {domains.length > 0 && (
                            <span className="supertag-material-domain">{domains.join(' · ')}</span>
                          )}
                          <span className="supertag-material-preview">
                            {preview || '暂无正文'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="supertag-comparison" role="list">
                    {activeGroup.materials.map((material) => {
                      const signature = supertagMaterialSignature(material);
                      const sameCount = signature ? signatureCounts.get(signature) ?? 0 : 0;
                      const domains = domainPathsByNode.get(material.nodeId) ?? [];
                      return (
                        <article
                          key={`${material.tag}:${material.id}`}
                          className="supertag-comparison-column"
                          role="listitem"
                        >
                          <header>
                            <button
                              type="button"
                              title={`打开 ${material.nodeLabel}`}
                              onClick={() => handleOpenMaterial(material)}
                            >
                              {material.nodeLabel}
                            </button>
                            <span className={sameCount > 1 ? 'is-shared' : 'is-distinct'}>
                              {sameCount > 1 ? `${sameCount} 段一致` : '独有表述'}
                            </span>
                          </header>
                          <div className="supertag-comparison-meta">
                            <strong>{materialPathLabel(material)}</strong>
                            {domains.length > 0 && <span>{domains.join(' · ')}</span>}
                          </div>
                          <div className="supertag-comparison-content">
                            {material.content.trim() ? (
                              <MarkdownView content={material.content} />
                            ) : (
                              <p className="text-muted">暂无正文</p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
