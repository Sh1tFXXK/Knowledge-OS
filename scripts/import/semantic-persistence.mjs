function findTreeNodeById(root, treeNodeId) {
  if (root.id === treeNodeId) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNodeById(child, treeNodeId);
    if (found) return found;
  }
  return null;
}

function removeManagedTreeEntries(root, treeIdPrefix) {
  root.children = (root.children ?? [])
    .filter((child) => !child.id.startsWith(treeIdPrefix));
  for (const child of root.children) removeManagedTreeEntries(child, treeIdPrefix);
}

function persistedNode(node) {
  const {
    parentId: _parentId,
    treeId: _treeId,
    treeName: _treeName,
    ...value
  } = node;
  return value;
}

export function applySemanticImportAtTreeNode({
  pool,
  tree,
  edges,
  projected,
  parentTreeNodeId,
}) {
  const parent = findTreeNodeById(tree, parentTreeNodeId);
  if (!parent) throw new Error(`父目录 treeNodeId="${parentTreeNodeId}" 未找到`);
  const nodeIdPrefix = `k_${projected.managedPrefix}_`;
  const treeIdPrefix = `tree_${projected.managedPrefix}_`;
  const edgeIdPrefix = `edge_${projected.managedPrefix}_`;
  if (parent.id.startsWith(treeIdPrefix)) {
    throw new Error('不能把语义导入挂载到它自身生成的目录中');
  }

  const desiredNodeIds = new Set(projected.nodes.map((node) => node.id));
  for (const id of Object.keys(pool)) {
    if (id.startsWith(nodeIdPrefix) && !desiredNodeIds.has(id)) delete pool[id];
  }
  for (const node of projected.nodes) pool[node.id] = persistedNode(node);

  removeManagedTreeEntries(tree, treeIdPrefix);
  const nodesByParent = new Map();
  for (const node of projected.nodes) {
    const children = nodesByParent.get(node.parentId) ?? [];
    children.push(node);
    nodesByParent.set(node.parentId, children);
  }
  const buildTreeEntry = (node) => ({
    id: node.treeId,
    name: node.treeName,
    count: 0,
    nodeRef: node.id,
    children: (nodesByParent.get(node.id) ?? []).map(buildTreeEntry),
  });
  parent.children ??= [];
  parent.children.push(...(nodesByParent.get(null) ?? []).map(buildTreeEntry));

  const retainedEdges = edges.filter((edge) => !edge.id.startsWith(edgeIdPrefix));
  edges.splice(0, edges.length, ...retainedEdges, ...projected.edges);
}
