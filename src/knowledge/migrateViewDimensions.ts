import type { AtomBinding, KnowledgeNode, ViewDimension, ViewSection } from '../types';
import { createKnowledgeNode } from './defaults';
import type { PersistedAppState } from './state';

const LEGACY_EXPLANATION_TAB_IDS = new Set(['mech', 'bound', 'source']);

type LegacyDimChild = {
  label: string;
  desc?: string;
  nodeId?: string;
};

type LegacyViewDimension = {
  id: string;
  name: string;
  color: string;
  hint?: string;
  scope?: ViewDimension['scope'];
  children?: LegacyDimChild[];
  sections?: ViewSection[];
  groups?: ViewDimension['groups'];
};

function stableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `k_auto_${hash.toString(36)}`;
}

function findNodeIdByLabel(pool: Record<string, KnowledgeNode>, label: string): string | null {
  const normalized = label.trim();
  if (!normalized) return null;
  for (const node of Object.values(pool)) {
    if (node.label === normalized) return node.id;
  }
  return null;
}

function ensureAtomNode(
  pool: Record<string, KnowledgeNode>,
  ownerId: string,
  dimId: string,
  child: LegacyDimChild,
): string | null {
  if (child.nodeId && pool[child.nodeId]) return child.nodeId;

  const label = child.label.trim();
  if (!label) return null;

  const existingId = findNodeIdByLabel(pool, label);
  if (existingId) return existingId;

  const id = stableId(`${ownerId}:${dimId}:${label}`);
  if (!pool[id]) {
    const node = createKnowledgeNode(label, id);
    if (child.desc) {
      node.card.tabs = node.card.tabs.map((tab, index) =>
        index === 0 ? { ...tab, content: child.desc ?? '' } : tab,
      );
    }
    pool[id] = node;
  }
  return id;
}

function isMigratedDimension(dim: LegacyViewDimension): dim is ViewDimension {
  return Array.isArray(dim.sections);
}

function stripLegacyExplanationTabs(node: KnowledgeNode): KnowledgeNode{
  const tabs = node.card.tabs.filter((tab) =>
    !LEGACY_EXPLANATION_TAB_IDS.has(tab.id));
  return tabs.length === node.card.tabs.length
    ? node
    : { ...node, card: { ...node.card, tabs } };
}
export function migrateNodePool(
  inputPool: Record<string, KnowledgeNode>,
): Record<string, KnowledgeNode> {
  const pool: Record<string, KnowledgeNode> = Object.fromEntries(
    Object.entries(inputPool).map(([id, node]) => [id,
     stripLegacyExplanationTabs(node)]),
  );

  for (const [nodeId, node] of Object.entries(inputPool)) {
    if (!node.viewDimensions?.length) continue;

    const migrated = (node.viewDimensions as LegacyViewDimension[]).map((dim): ViewDimension => {
      if (isMigratedDimension(dim)) {
        return {
          id: dim.id,
          name: dim.name,
          color: dim.color,
          hint: dim.hint,
          scope: dim.scope,
          sections: dim.sections.map((section) => ({
            ...section,
            atoms: section.atoms.filter((atom) => !!pool[atom.nodeId]),
          })),
          groups: dim.groups?.map((group) => ({
            ...group,
            members: group.members.filter((memberId) => !!pool[memberId]),
          })),
        };
      }

      const atoms = (dim.children ?? [])
        .map((child) => {
          const resolvedId = ensureAtomNode(pool, nodeId, dim.id, child);
          if (!resolvedId) return null;
          return {
            nodeId: resolvedId,
            desc: child.desc,
          };
        })
        .filter(Boolean) as AtomBinding[];

      return {
        id: dim.id,
        name: dim.name,
        color: dim.color,
        hint: dim.hint,
        scope: dim.scope,
        sections: [
          {
            id: `${dim.id}_main`,
            title: dim.name,
            layout: 'grid',
            atoms,
          },
        ],
      };
    });

    pool[nodeId] = {
      ...pool[nodeId],
      viewDimensions: migrated,
    };
  }

  return pool;
}

export function migrateAppState<T extends Partial<PersistedAppState>>(state: T): T {
  if (!state.nodePool) return state;
  return {
    ...state,
    nodePool: migrateNodePool(state.nodePool),
  };
}
