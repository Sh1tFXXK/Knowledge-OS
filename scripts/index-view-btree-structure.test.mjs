// 实证：B+树底层结构节点树在索引视图中呈现为嵌套方框（结构=视觉）。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const SRC = (p) => path.resolve('src', p);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
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
  cache.set(file, mod);
  return mod.exports;
}

test('B+树底层结构在索引视图中呈现为嵌套方框+结构连线', () => {
  const { buildUnifiedIndexGraph } = load(SRC('core/explanation-index/indexGraphLayout.ts'));
  const { buildExplanationIndex } = load(SRC('knowledge/explanationIndex.ts'));
  const { buildTreeProjectionContainmentEdges } = load(SRC('knowledge/treeBinding.ts'));

  const pool = JSON.parse(fs.readFileSync('data/node-pool.json', 'utf8'));
  const tree = JSON.parse(fs.readFileSync('data/tree-data.json', 'utf8'));
  let entry = null;
  (function w(n) { if (n.nodeRef === 'demo_btree') entry = n; for (const c of (n.children || [])) w(c); })(tree);
  assert.ok(entry, 'demo_btree tree entry');

  const layout = buildUnifiedIndexGraph({
    ownerId: 'demo_btree',
    ownerLabel: pool['demo_btree'].label,
    index: buildExplanationIndex(pool['demo_btree'].card),
    relationRootId: 'demo_btree',
    relationRootLabel: pool['demo_btree'].label,
    relationGraph: { nodes: [], edges: [], maxDepth: 0 },
    knowledgeEdges: [],
    containmentEdges: buildTreeProjectionContainmentEdges(entry),
    nodePool: pool,
  });

  const EXPECTED = ['btree_structure', 'bts_root_page', 'bts_internal', 'bts_slot', 'bts_key_ptr', 'bts_leaf', 'bts_entry', 'bts_double_linked', 'bts_pointers', 'bts_height_io'];
  const nodeIds = new Set(layout.nodes.map((n) => n.knowledgeNodeId));
  for (const id of EXPECTED) {
    assert.ok(nodeIds.has(id), `缺少方框: ${id}`);
  }
  const rect = (id) => {
    const f = layout.containmentFrames.find((x) => x.nodeId === `knowledge:${id}`);
    if (!f) return null;
    const r = f.rect ?? f;
    return r;
  };
  const structR = rect('btree_structure');
  const internalR = rect('bts_internal');
  const leafR = rect('bts_leaf');
  assert.ok(structR && internalR && leafR, '缺少结构嵌套框');
  assert.ok(internalR.left >= structR.left && internalR.top >= structR.top
    && internalR.left + internalR.width <= structR.left + structR.width
    && internalR.top + internalR.height <= structR.top + structR.height, '内部节点框未嵌在结构框内');
  assert.ok(leafR.left >= structR.left && leafR.top >= structR.top
    && leafR.left + leafR.width <= structR.left + structR.width
    && leafR.top + leafR.height <= structR.top + structR.height, '叶子节点框未嵌在结构框内');
  console.log('布局: nodes=%d containmentFrames=%d', layout.nodes.length, layout.containmentFrames.length);
  console.log('嵌套: 结构(%d,%d) ⊃ 内部(%d,%d) & 叶子(%d,%d)',
    Math.round(structR.left), Math.round(structR.top), Math.round(internalR.left), Math.round(internalR.top), Math.round(leafR.left), Math.round(leafR.top));
});
