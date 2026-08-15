import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataIntegrity } from './data-integrity.mjs';
import { writeFileAtomically } from './import/web-link-importer.mjs';
import { TAXONOMY_CONTAINER_SPECS } from './taxonomy-domain-placements.mjs';

const DATABASE_THEORY_REF_TREE_ID = 'database_principles_database_theory';

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function findTreeParent(root, id) {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = findTreeParent(child, id);
    if (found) return found;
  }
  return null;
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function detachTreeNode(root, id) {
  if (!root.children) return null;
  const index = root.children.findIndex((child) => child.id === id);
  if (index >= 0) return root.children.splice(index, 1)[0];
  for (const child of root.children) {
    const found = detachTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function appendChildren(parent, children) {
  const byId = new Map((parent.children ?? []).map((child) => [child.id, child]));
  for (const child of children) {
    if (!byId.has(child.id)) byId.set(child.id, child);
  }
  parent.children = [...byId.values()];
}

function createTaxonomyNode(id, label, description) {
  return {
    id,
    label,
    role: 'subsystem',
    tags: [label, 'taxonomy'],
    card: {
      nodeId: id,
      title: label,
      tabs: [{ id: 'def', label: '定义', content: description }],
    },
  };
}

function setDefinition(node, title, description) {
  const existingTabs = node.card?.tabs ?? [];
  const definitionIndex = existingTabs.findIndex((tab) => tab.id === 'def');
  const nextDefinition = { id: 'def', label: '定义', content: description };
  const tabs = definitionIndex >= 0
    ? existingTabs.map((tab, index) => (index === definitionIndex ? nextDefinition : tab))
    : [nextDefinition, ...existingTabs];
  node.label = title;
  node.role = node.role ?? 'subsystem';
  node.tags = [...new Set([...(node.tags ?? []), title, 'taxonomy'])];
  node.card = { ...(node.card ?? {}), nodeId: node.id, title, tabs };
}

function cleanGeneratedDomainDefinition(node) {
  const tabs = node.card?.tabs ?? [];
  const definitionIndex = tabs.findIndex((tab) => tab.id === 'def');
  if (definitionIndex < 0) return;
  const current = tabs[definitionIndex].content ?? '';
  const cleaned = current
    .replace(/^独立门派：[^\n]+\n\n/, '')
    .replace(/\n\n当前归入 \d+ 个(?: MySQL)? 知识节点。?$/, '')
    .trim();
  node.card.tabs[definitionIndex] = { ...tabs[definitionIndex], content: cleaned };
}

function moveTreeNode(tree, nodeId, targetId, stats) {
  const target = findTreeNode(tree, targetId);
  if (!target) throw new Error(`Missing taxonomy target ${targetId} for ${nodeId}`);
  const node = findTreeNode(tree, nodeId);
  if (!node) return false;
  const currentParent = findTreeParent(tree, nodeId);
  if (currentParent?.id === targetId) return false;
  const detached = detachTreeNode(tree, nodeId);
  appendChildren(target, [detached]);
  stats.treeEntriesMoved += 1;
  return true;
}

function mergeContainerInto(tree, sourceId, targetId, stats) {
  const source = findTreeNode(tree, sourceId);
  if (!source) return false;
  const target = findTreeNode(tree, targetId);
  if (!target) throw new Error(`Missing taxonomy merge target ${targetId}`);
  appendChildren(target, source.children ?? []);
  const detached = detachTreeNode(tree, sourceId);
  if (!detached) throw new Error(`Could not detach taxonomy container ${sourceId}`);
  stats.containersRemoved += 1;
  stats.childrenPreserved += source.children?.length ?? 0;
  return true;
}

function removeEmptyContainer(tree, containerId, stats) {
  const container = findTreeNode(tree, containerId);
  if (!container) return false;
  if ((container.children ?? []).length > 0) {
    throw new Error(`Refusing to remove non-empty taxonomy container ${containerId}`);
  }
  detachTreeNode(tree, containerId);
  stats.containersRemoved += 1;
  return true;
}

function ensureDatabasePrinciples(tree, nodePool, stats) {
  const spec = TAXONOMY_CONTAINER_SPECS.find((item) => item.id === 'database_principles');
  const parent = findTreeNode(tree, spec.parentTreeId);
  if (!parent) throw new Error(`Missing database principles parent ${spec.parentTreeId}`);

  let container = findTreeNode(tree, spec.id);
  if (!container) {
    container = { id: spec.id, name: spec.name, count: 0, nodeRef: spec.id, children: [] };
    appendChildren(parent, [container]);
    stats.treeEntriesAdded += 1;
  } else {
    moveTreeNode(tree, spec.id, spec.parentTreeId, stats);
    container.name = spec.name;
    container.nodeRef = spec.id;
  }

  if (!nodePool[spec.id]) {
    nodePool[spec.id] = createTaxonomyNode(spec.id, spec.name, spec.description);
    stats.knowledgeNodesAdded += 1;
  } else {
    setDefinition(nodePool[spec.id], spec.name, spec.description);
  }

  if (!(container.children ?? []).some((child) => child.id === DATABASE_THEORY_REF_TREE_ID)) {
    appendChildren(container, [{
      id: DATABASE_THEORY_REF_TREE_ID,
      name: '数据库理论',
      count: 0,
      nodeRef: 'school_database_theory',
      children: [],
    }]);
    stats.treeEntriesAdded += 1;
  }
}

function normalizeTaxonomyKnowledge(nodePool) {
  for (const spec of TAXONOMY_CONTAINER_SPECS) {
    if (!nodePool[spec.id]) continue;
    setDefinition(nodePool[spec.id], spec.name, spec.description);
  }

  const generalDefinitions = {
    school_information_retrieval: ['信息检索', '研究信息的组织、索引、检索、排序与相关性评价。'],
    theory_domain_algorithms: ['算法', '研究算法的设计、正确性、复杂度与执行策略。'],
    theory_domain_network_protocols: ['网络协议', '研究网络通信规则、分层协议、寻址、连接和互操作机制。'],
    theory_domain_statistics: ['统计学', '研究数据的收集、描述、推断以及不确定性。'],
    theory_domain_information_theory: ['信息论', '研究信息量、编码、压缩、传输以及通信极限。'],
    theory_domain_numerical_analysis: ['数值分析', '研究数值计算方法的精度、稳定性、收敛性和误差。'],
  };
  for (const [nodeId, [title, definition]] of Object.entries(generalDefinitions)) {
    if (nodePool[nodeId]) setDefinition(nodePool[nodeId], title, definition);
  }

  for (const [nodeId, node] of Object.entries(nodePool)) {
    if (nodeId.startsWith('theory_domain_')) cleanGeneratedDomainDefinition(node);
  }
}

function rebuildTreeBindings(edges, tree, nodePool) {
  const bindings = [];
  function visit(parent) {
    for (const child of parent.children ?? []) {
      if (
        parent.nodeRef
        && child.nodeRef
        && parent.nodeRef !== child.nodeRef
        && nodePool[parent.nodeRef]
        && nodePool[child.nodeRef]
      ) {
        bindings.push({
          id: `treebind:${parent.id}:${child.id}`,
          source: parent.nodeRef,
          target: child.nodeRef,
          type: 'belongs-to',
          label: 'contains',
          relationKind: 'structure',
          dimensions: [...new Set([
            ...(nodePool[parent.nodeRef]?.dimensions ?? []),
            ...(nodePool[child.nodeRef]?.dimensions ?? []),
          ])],
        });
      }
      visit(child);
    }
  }
  visit(tree);
  return [...edges.filter((edge) => !edge.id.startsWith('treebind:')), ...bindings];
}

export function consolidateTaxonomyProjections({ tree, nodePool, edges }) {
  const stats = {
    treeEntriesMoved: 0,
    treeEntriesAdded: 0,
    containersRemoved: 0,
    childrenPreserved: 0,
    knowledgeNodesAdded: 0,
  };

  ensureDatabasePrinciples(tree, nodePool, stats);

  moveTreeNode(tree, 'theory_domain_relational_algebra', 'database_principles', stats);
  moveTreeNode(tree, 'theory_domain_normalization_theory', 'database_principles', stats);
  moveTreeNode(tree, 'theory_domain_transaction_theory', 'database_principles', stats);
  moveTreeNode(tree, 'theory_domain_recovery_theory', 'database_principles', stats);
  moveTreeNode(tree, 'tree_1784714555221_9s0o64', 'database_principles', stats);
  moveTreeNode(tree, 'tree_1784731127850_969dqg', 'theory_domain_normalization_theory', stats);
  moveTreeNode(tree, 'tree_1784728125587_k8xecl', 'theory_domain_distributed_systems', stats);
  removeEmptyContainer(tree, 'school_database_theory', stats);

  moveTreeNode(
    tree,
    'theory_domain_information_retrieval',
    'tree_acm2012_information_systems_information_retrieval',
    stats,
  );
  removeEmptyContainer(tree, 'school_information_retrieval', stats);

  for (const domainId of [
    'theory_domain_programming_language_theory',
    'theory_domain_regular_expression_theory',
    'theory_domain_compiler_principles',
  ]) {
    moveTreeNode(
      tree,
      domainId,
      'tree_acm2012_software_notations_tools_programming_languages',
      stats,
    );
  }
  moveTreeNode(
    tree,
    'tree_1784821733779_70dps6',
    'theory_domain_programming_language_theory',
    stats,
  );
  moveTreeNode(
    tree,
    'tree_wiki_en_program_analysis',
    'tree_acm2012_software_notations_tools_programming_languages',
    stats,
  );
  removeEmptyContainer(tree, 'school_programming_languages', stats);

  moveTreeNode(tree, 'theory_domain_data_structures', 'tree_acm2012_algorithms', stats);
  for (const domainId of [
    'theory_domain_operating_systems',
    'theory_domain_computer_architecture',
    'theory_domain_storage_systems',
    'theory_domain_distributed_systems',
  ]) {
    moveTreeNode(tree, domainId, 'tree_acm2012_systems_organization', stats);
  }
  moveTreeNode(tree, 'theory_domain_concurrency_theory', 'tree_acm2012_concurrency', stats);
  moveTreeNode(
    tree,
    'tree_1784705818188_3q5ekp',
    'theory_domain_transaction_theory',
    stats,
  );
  mergeContainerInto(
    tree,
    'theory_domain_network_protocols',
    'tree_acm2012_networks_network_protocols',
    stats,
  );
  removeEmptyContainer(tree, 'school_systems', stats);

  mergeContainerInto(tree, 'theory_domain_algorithms', 'tree_acm2012_algorithms', stats);
  mergeContainerInto(tree, 'tree_wiki_zh_数据库', 'demo_db', stats);

  normalizeTaxonomyKnowledge(nodePool);
  const nextEdges = rebuildTreeBindings(edges, tree, nodePool);
  return { tree, nodePool, edges: nextEdges, stats };
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dataDir = path.join(projectRoot, 'data');
  const apply = process.argv.includes('--apply');
  const paths = {
    tree: path.join(dataDir, 'tree-data.json'),
    nodePool: path.join(dataDir, 'node-pool.json'),
    edges: path.join(dataDir, 'knowledge-edges.json'),
    questions: path.join(dataDir, 'questions.json'),
    timeline: path.join(dataDir, 'timeline.json'),
  };
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  const [tree, nodePool, edges, questions, timeline] = await Promise.all(
    Object.values(paths).map(readJson),
  );
  const before = {
    treeEntries: collectTreeNodes(tree).length,
    knowledgeNodes: Object.keys(nodePool).length,
    nonBindingEdges: edges.filter((edge) => !edge.id.startsWith('treebind:')).length,
  };
  const beforeSnapshot = JSON.stringify({ tree, nodePool, edges });
  const result = consolidateTaxonomyProjections({ tree, nodePool, edges });
  const issues = validateDataIntegrity({
    tree: result.tree,
    nodePool: result.nodePool,
    edges: result.edges,
    questions,
    timeline,
  });
  if (issues.length > 0) {
    throw new Error(`Taxonomy consolidation left ${issues.length} issue(s):\n${issues.slice(0, 20).join('\n')}`);
  }

  const after = {
    treeEntries: collectTreeNodes(result.tree).length,
    knowledgeNodes: Object.keys(result.nodePool).length,
    nonBindingEdges: result.edges.filter((edge) => !edge.id.startsWith('treebind:')).length,
  };
  const afterSnapshot = JSON.stringify({
    tree: result.tree,
    nodePool: result.nodePool,
    edges: result.edges,
  });
  let backupDir = null;
  const changed = beforeSnapshot !== afterSnapshot;
  if (apply && changed) {
    backupDir = path.join(dataDir, 'backups', `taxonomy-consolidation-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });
    await Promise.all(Object.values(paths).map((filePath) => (
      fs.copyFile(filePath, path.join(backupDir, path.basename(filePath)))
    )));
    await Promise.all([
      writeFileAtomically(paths.tree, `${JSON.stringify(result.tree, null, 2)}\n`),
      writeFileAtomically(paths.nodePool, `${JSON.stringify(result.nodePool, null, 2)}\n`),
      writeFileAtomically(paths.edges, `${JSON.stringify(result.edges, null, 2)}\n`),
    ]);
  }

  console.log(JSON.stringify({ apply, changed, backupDir, before, after, ...result.stats }, null, 2));
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
