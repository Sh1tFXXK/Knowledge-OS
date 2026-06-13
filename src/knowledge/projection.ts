import type { AtomBinding, KnowledgeNode, ViewDimension, ViewSection } from '../types';

export interface MatrixProjection {
  ownerId: string;
  owner: KnowledgeNode;
  dimension: ViewDimension;
  section: ViewSection;
  binding: AtomBinding;
}

export function resolveSectionAtoms(
  section: ViewSection,
  nodePool: Record<string, KnowledgeNode>,
): AtomBinding[] {
  const atoms = [...section.atoms];
  const seen = new Set(atoms.map((atom) => atom.nodeId));

  for (const tag of section.config?.tagQuery ?? []) {
    for (const node of Object.values(nodePool)) {
      if (!node.tags?.includes(tag) || seen.has(node.id)) continue;
      atoms.push({ nodeId: node.id });
      seen.add(node.id);
    }
  }

  return atoms.filter((atom) => !!nodePool[atom.nodeId]);
}

export function collectProjectedNodeIds(
  viewDimensions: ViewDimension[] | undefined,
  nodePool: Record<string, KnowledgeNode>,
): Set<string> {
  const ids = new Set<string>();
  for (const dim of viewDimensions ?? []) {
    for (const section of dim.sections) {
      for (const atom of resolveSectionAtoms(section, nodePool)) {
        ids.add(atom.nodeId);
      }
    }
  }
  return ids;
}

export function removeNodeRefsFromViewDimensions(
  viewDimensions: ViewDimension[] | undefined,
  removedIds: Set<string>,
): ViewDimension[] | undefined {
  if (!viewDimensions) return undefined;

  return viewDimensions.map((dim) => ({
    ...dim,
    sections: dim.sections.map((section) => ({
      ...section,
      atoms: section.atoms.filter((atom) => !removedIds.has(atom.nodeId)),
    })),
    groups: dim.groups
      ?.map((group) => ({
        ...group,
        nodeId: group.nodeId && removedIds.has(group.nodeId) ? undefined : group.nodeId,
        members: group.members.filter((memberId) => !removedIds.has(memberId)),
      }))
      .filter((group) => group.members.length > 0 || !!group.nodeId),
  }));
}

export function findMatrixProjections(
  nodePool: Record<string, KnowledgeNode>,
  nodeId: string,
): MatrixProjection[] {
  const projections: MatrixProjection[] = [];

  for (const [ownerId, owner] of Object.entries(nodePool)) {
    for (const dimension of owner.viewDimensions ?? []) {
      for (const section of dimension.sections) {
        if (section.layout !== 'matrix') continue;
        const binding = section.atoms.find((atom) => atom.nodeId === nodeId);
        if (!binding) continue;
        projections.push({ ownerId, owner, dimension, section, binding });
      }
    }
  }

  return projections;
}
