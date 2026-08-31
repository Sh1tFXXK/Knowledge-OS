// 实证：结构化后的「MySQL 组合索引」在索引视图中以方框+嵌套连线呈现逻辑树。
// 驱动真实 buildUnifiedIndexGraph + 真实 node-pool/tree-data。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const SRC = (p) => path.resolve('src', p);
function transpile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  });
  const mod = { exports: {} };
  const req = (spec) => {
    const base = path.basename(spec);
    const map = {
      containment: SRC('knowledge/containment.ts'),
      explanationIndex: SRC('knowledge/explanationIndex.ts'),
      explanationTree: SRC('knowledge/explanationTree.ts'),
      types: SRC('types.ts'),
      treeBinding: SRC('knowledge/treeBinding.ts'),
      indexGraphLayout: SRC('core/explanation-index/indexGraphLayout.ts'),
    };
    if (!map[base]) throw new Error('unknown require: ' + spec);
    return load(map[base]);
  };
  const cache = loadCache.get(file);
  if (cache) return cache.exports;
  vm.runInNewContext(out.outputText, { exports: mod.exports, module: mod, require: req }, { filename: file });
  loadCache.set(file, mod);
  return mod.exports;
}
const loadCache = new Map();
function load(file) {
  if (loadCache.has(file)) return loadCache.get(file).exports;
  const source = fs.readFileSync(file, 'utf8');
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  });
  const mod = { exports: {} };
  const req = (spec) => {
    const base = path.basename(spec);
    const map = {
      containment: SRC('knowledge/containment.ts'),
      explanationIndex: SRC('knowledge/explanationIndex.ts'),
      explanationTree: SRC('knowledge/explanationTree.ts'),
      types: SRC('types.ts'),
      treeBinding: SRC('knowledge/treeBinding.ts'),
      indexGraphLayout: SRC('core/explanation-index/indexGraphLayout.ts'),
    };
    if (!map[base]) throw new Error('unknown require: ' + spec);
    return load(map[base]);
  };
  vm.runInNewContext(out.outputText, { exports: mod.exports, module: mod, require: req }, { filename: file });
  loadCache.set(file, mod);
  return mod.exports;
}

test('组合索引的索引视图把左前缀结构画成方框 + 嵌套连线', () => {
  const { buildUnifiedIndexGraph } = load(SRC('core/explanation-index/indexGraphLayout.ts'));
  const { buildExplanationIndex } = load(SRC('knowledge/explanationIndex.ts'));
  const { buildTreeProjectionContainmentEdges } = load(SRC('knowledge/treeBinding.ts'));

  const pool = JSON.parse(fs.readFileSync('data/node-pool.json', 'utf8'));
  const tree = JSON.parse(fs.readFileSync('data/tree-data.json', 'utf8'));

  // 找到 MySQL 组合索引 的树节点
  let entry = null;
  (function w(n) { if (n.nodeRef === 'demo_composite_index') entry = n; for (const c of (n.children || [])) w(c); })(tree);
  assert.ok(entry, 'tree entry for demo_composite_index');

  const containmentEdges = buildTreeProjectionContainmentEdges(entry);
  const layout = buildUnifiedIndexGraph({
    ownerId: 'demo_composite_index',
    ownerLabel: pool['demo_composite_index'].label,
    index: buildExplanationIndex(pool['demo_composite_index'].card),
    relationRootId: 'demo_composite_index',
    relationRootLabel: pool['demo_composite_index'].label,
    relationGraph: { nodes: [], edges: [], maxDepth: 0 },
    knowledgeEdges: [],
    containmentEdges,
    nodePool: pool,
  });

  const EXPECTED = [
    'leftmost_prefix_rule', 'lpf_case_in_order', 'lpf_case_skip_left', 'lpf_case_reordered',
    'joint_index_sort_structure', 'jis_first_column_global', 'jis_second_column_local', 'jis_skip_leftmost_corollary',
  ];
  const nodeIds = new Set(layout.nodes.map((n) => n.knowledgeNodeId));
  for (const id of EXPECTED) {
    assert.ok(nodeIds.has(id), `索引视图缺少方框: ${id}`);
    const box = layout.nodes.find((n) => n.knowledgeNodeId === id);
    assert.ok((box.content || '').length > 0, `${id} 方框无正文`);
  }
  // 嵌套连线：frame 的 nodeId 是 graph id（knowledge:<id>），按后缀归一
  const frameRect = (id) => {
    const f = layout.containmentFrames.find((x) => x.nodeId === `knowledge:${id}` || x.nodeId === id);
    if (!f) return null;
    const r = f.rect ?? f;
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  const ownerR = frameRect('demo_composite_index');
  const ruleR = frameRect('leftmost_prefix_rule');
  const jointR = frameRect('joint_index_sort_structure');
  assert.ok(ownerR && ruleR && jointR, '缺少法则/排序结构嵌套框');
  assert.ok(ruleR.left >= ownerR.left && ruleR.top >= ownerR.top
    && ruleR.left + ruleR.width <= ownerR.left + ownerR.width
    && ruleR.top + ruleR.height <= ownerR.top + ownerR.height, '法则框未嵌在组合索引框内');
  assert.ok(jointR.left >= ruleR.left && jointR.top >= ruleR.top
    && jointR.left + jointR.width <= ruleR.left + ruleR.width
    && jointR.top + jointR.height <= ruleR.top + ruleR.height, '排序结构框未嵌在法则框内');
  console.log('布局: nodes=%d containmentFrames=%d edges=%d', layout.nodes.length, layout.containmentFrames.length, layout.edges.length);
  console.log('嵌套: owner%s ⊃ rule%s ⊃ joint%s',
    `${Math.round(ownerR.left)},${Math.round(ownerR.top)}`, `${Math.round(ruleR.left)},${Math.round(ruleR.top)}`, `${Math.round(jointR.left)},${Math.round(jointR.top)}`);
});
