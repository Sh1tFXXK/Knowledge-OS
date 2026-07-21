import { useMemo, useState } from 'react';
import { useGraphStore } from '../store/useGraph';
import type { KnowledgeNode } from '../types';

interface SupertagGroup {
  tag: string;
  nodes: KnowledgeNode[];
}

function firstContent(node: KnowledgeNode): string {
  const tab = node.card.tabs.find((item) => item.content.trim());
  return tab?.content.replace(/\s+/g, ' ').trim() ?? '';
}

function compactText(text: string, max = 150): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function roleLabel(role: KnowledgeNode['role']): string {
  if (role === 'axiom') return '公理';
  if (role === 'mechanism') return '机制';
  if (role === 'conclusion') return '结论';
  if (role === 'subsystem') return '子系统';
  return '普通';
}

export default function SupertagLibrary() {
  const nodePool = useGraphStore((s) => s.nodePool);
  const openCard = useGraphStore((s) => s.openCard);
  const addNotification = useGraphStore((s) => s.addNotification);
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const groups = useMemo<SupertagGroup[]>(() => {
    const byTag = new Map<string, KnowledgeNode[]>();

    Object.values(nodePool).forEach((node) => {
      node.tags?.forEach((rawTag) => {
        const tag = rawTag.trim();
        if (!tag) return;
        byTag.set(tag, [...(byTag.get(tag) ?? []), node]);
      });
    });

    return [...byTag.entries()]
      .map(([tag, nodes]) => ({
        tag,
        nodes: [...nodes].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
      }))
      .sort((a, b) => b.nodes.length - a.nodes.length || a.tag.localeCompare(b.tag, 'zh-CN'));
  }, [nodePool]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;

    return groups.filter((group) => {
      if (group.tag.toLowerCase().includes(normalizedQuery)) return true;
      return group.nodes.some((node) =>
        node.label.toLowerCase().includes(normalizedQuery) ||
        firstContent(node).toLowerCase().includes(normalizedQuery),
      );
    });
  }, [groups, query]);

  const activeGroup =
    filteredGroups.find((group) => group.tag === selectedTag) ?? filteredGroups[0] ?? null;

  const handleOpenNode = (node: KnowledgeNode) => {
    openCard(node.id);
    addNotification(`已打开 ${node.label}`, 'success');
  };

  return (
    <div className="supertag-library">
      <div className="database-toolbar">
        <div className="toolbar-left">
          <input
            className="input supertag-library-search"
            value={query}
            placeholder="搜索 supertag 或节点..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="toolbar-right">
          <span className="supertag-library-count">
            {filteredGroups.length} 个 supertag · {filteredGroups.reduce((sum, group) => sum + group.nodes.length, 0)} 个材料
          </span>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="supertag-library-empty">
          暂无 supertag
        </div>
      ) : (
        <div className="supertag-library-body">
          <aside className="supertag-index" aria-label="Supertag 列表">
            {filteredGroups.map((group) => (
              <button
                key={group.tag}
                type="button"
                className={`supertag-index-item${activeGroup?.tag === group.tag ? ' is-active' : ''}`}
                onClick={() => setSelectedTag(group.tag)}
              >
                <span className="supertag-index-name">{group.tag}</span>
                <span className="supertag-index-count">{group.nodes.length}</span>
              </button>
            ))}
          </aside>

          <section className="supertag-detail" aria-label="Supertag 材料">
            {activeGroup && (
              <>
                <div className="supertag-detail-head">
                  <div>
                    <h3>{activeGroup.tag}</h3>
                    <p>{activeGroup.nodes.length} 个材料挂在这个 supertag 上</p>
                  </div>
                </div>

                <div className="supertag-material-grid">
                  {activeGroup.nodes.map((node) => {
                    const preview = firstContent(node);
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className="supertag-material-card"
                        onClick={() => handleOpenNode(node)}
                      >
                        <span className="supertag-material-head">
                          <strong>{node.label}</strong>
                          <span className={`role-badge role-${node.role ?? 'plain'}`}>
                            {roleLabel(node.role)}
                          </span>
                        </span>
                        <span className="supertag-material-preview">
                          {compactText(preview) || '暂无卡片内容'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
