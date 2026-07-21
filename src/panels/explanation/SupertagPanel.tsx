import { useEffect, useState } from 'react';
import type { KnowledgeNode, NotificationItem } from '../../types';

function normalizeSupertag(value: string): string {
  return value.replace(/^#+/, '').trim();
}

export default function SupertagPanel({
  node,
  updateKnowledgeNodeMeta,
  addNotification,
  activeSupertag,
  onActiveSupertagChange,
}: {
  node: KnowledgeNode;
  updateKnowledgeNodeMeta: (
    id: string,
    patch: Partial<Pick<KnowledgeNode, 'role' | 'dimensions' | 'tags'>>,
  ) => void;
  addNotification: (message: string, type: NotificationItem['type']) => void;
  activeSupertag: string;
  onActiveSupertagChange: (tag: string) => void;
}) {
  const [isAddingSupertag, setIsAddingSupertag] = useState(false);
  const [supertagDraft, setSupertagDraft] = useState('');
  const nodeTags = node.tags ?? [];

  useEffect(() => {
    setIsAddingSupertag(false);
    setSupertagDraft('');
  }, [node.id]);

  const handleAddSupertag = () => {
    const tag = normalizeSupertag(supertagDraft);
    if (!tag) {
      addNotification('请先输入 supertag', 'warning');
      return;
    }
    const tags = Array.from(new Set([...nodeTags, tag]));
    updateKnowledgeNodeMeta(node.id, { tags });
    onActiveSupertagChange(tag);
    setSupertagDraft('');
    setIsAddingSupertag(false);
    addNotification(`已添加 supertag: ${tag}`, 'success');
  };

  const handleRemoveSupertag = (tag: string) => {
    updateKnowledgeNodeMeta(node.id, {
      tags: nodeTags.filter((item) => item !== tag),
    });
    if (activeSupertag === tag) onActiveSupertagChange('');
  };

  return (
    <>
      <div className="supertag-strip">
        {isAddingSupertag ? (
          <span className="supertag-editor">
            <input
              className="supertag-input"
              value={supertagDraft}
              placeholder="supertag"
              autoFocus
              onChange={(event) => setSupertagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddSupertag();
                if (event.key === 'Escape') {
                  setIsAddingSupertag(false);
                  setSupertagDraft('');
                }
              }}
            />
            <button
              type="button"
              className="supertag-save"
              aria-label="保存 supertag"
              title="保存 supertag"
              onClick={handleAddSupertag}
            >
              ✓
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="concept-supertag concept-supertag--add"
            onClick={() => setIsAddingSupertag(true)}
          >
            + supertag
          </button>
        )}

        {nodeTags.map((tag) => (
          <span key={tag} className="supertag-wrap">
            <button
              type="button"
              className={`concept-supertag${activeSupertag === tag ? ' is-active' : ''}`}
              aria-label={`supertag 锚点: ${tag}`}
              title={`supertag 锚点: ${tag}`}
              onClick={() => {
                onActiveSupertagChange(activeSupertag === tag ? '' : tag);
              }}
            >
              {tag}
            </button>
            <button
              type="button"
              className="supertag-remove"
              aria-label={`移除 supertag: ${tag}`}
              title={`移除 supertag: ${tag}`}
              onClick={() => handleRemoveSupertag(tag)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </>
  );
}
