import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const repoRoot = process.cwd();
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-os-mechanism-projection-'));
const sourceFiles = [
  'src/types.ts',
  'src/knowledge/containment.ts',
  'src/knowledge/treeUtils.ts',
  'src/mechanism/core.ts',
  'src/mechanism/knowledgeProjection.ts',
  'src/mechanism/validation.ts',
];

for (const relativePath of sourceFiles) {
  const sourcePath = path.resolve(repoRoot, relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
  });
  const outputPath = path.join(outDir, relativePath.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, transpiled.outputText, 'utf8');
}

const require = createRequire(import.meta.url);
const { inspectKnowledgeMechanism, projectKnowledgeMechanism } = require(
  path.join(outDir, 'src/mechanism/knowledgeProjection.js'),
);

test.after(() => fs.rmSync(outDir, { recursive: true, force: true }));

test('Java thread mechanism is derived from persisted knowledge data', () => {
  const nodePool = readJson('data/node-pool.json');
  const knowledgeEdges = readJson('data/knowledge-edges.json');
  const treeData = readJson('data/tree-data.json');
  const projection = projectKnowledgeMechanism({
    focusNodeId: 'k_1785934396536_as412a',
    nodePool,
    knowledgeEdges,
    treeData,
  });

  assert.ok(projection);
  assert.equal(nodePool.k_java_class_loading_mechanism, undefined, 'legacy duplicate root removed');
  assert.equal(
    treeData.children?.some((node) => node.id === 'tree_java_class_loading_mechanism'),
    false,
    'legacy duplicate directory removed',
  );
  assert.equal(projection.mechanismNodeId, 'k_1785934396536_as412a');
  assert.equal(projection.origin, 'k_java_thread_instance');
  assert.equal(projection.model.entities.length, 13, 'root plus twelve mechanism entities');
  assert.equal(projection.model.relations.length, 26, 'tree bindings and domain relations share one graph');
  assert.equal(projection.process.steps.length, 12, 'only transition edges become process steps');
  assert.equal(projection.process.steps[0].relationId, 'edge_java_thread_enters_new');
  assert.equal(projection.process.steps[1].relationId, 'edge_java_thread_starts_runnable');
  assert.ok(
    projection.model.relations.some(
      (relation) => relation.id === 'edge_java_thread_monitor_guards_waiting',
    ),
    'context relations remain visible in the logic graph',
  );
  assert.ok(
    projection.process.steps.every(
      (step) => step.relationId !== 'edge_java_thread_monitor_guards_waiting',
    ),
    'context relations must not become playback steps',
  );

  const stateProjection = projectKnowledgeMechanism({
    focusNodeId: 'k_java_thread_state_running',
    nodePool,
    knowledgeEdges,
    treeData,
  });
  assert.ok(stateProjection);
  assert.equal(
    stateProjection.mechanismNodeId,
    'k_1785934396536_as412a',
    'mechanism members resolve back to their owning mechanism',
  );
  assert.equal(stateProjection.model.entities.length, 13);
});

test('ordinary knowledge never becomes a mechanism by accident', () => {
  const nodePool = {
    root: {
      id: 'root',
      label: 'Static concept',
      card: { nodeId: 'root', title: 'Static concept', tabs: [] },
    },
    other: {
      id: 'other',
      label: 'Related concept',
      card: { nodeId: 'other', title: 'Related concept', tabs: [] },
    },
  };
  const treeData = { id: 'tree-root', name: 'Root', count: 0, nodeRef: 'root' };
  const projection = projectKnowledgeMechanism({
    focusNodeId: 'root',
    nodePool,
    knowledgeEdges: [{
      id: 'ordinary-edge',
      source: 'root',
      target: 'other',
      type: 'related-to',
      label: 'related to',
    }],
    treeData,
  });

  assert.equal(projection, null);
});

test('an asserted mechanism without a complete contract is rejected with reasons', () => {
  const nodePool = {
    root: {
      id: 'root',
      label: 'Incomplete mechanism',
      kind: 'mechanism',
      card: { nodeId: 'root', title: 'Incomplete mechanism', tabs: [] },
    },
  };
  const treeData = { id: 'tree-root', name: 'Root', count: 0, nodeRef: 'root' };
  const inspection = inspectKnowledgeMechanism({
    focusNodeId: 'root',
    nodePool,
    knowledgeEdges: [],
    treeData,
  });

  assert.equal(inspection.mechanismNodeId, 'root');
  assert.equal(inspection.validation?.valid, false);
  assert.ok(inspection.validation?.errors.includes('缺少 MechanismSpec'));
  assert.equal(projectKnowledgeMechanism({
    focusNodeId: 'root',
    nodePool,
    knowledgeEdges: [],
    treeData,
  }), null);
});

test('Java class loading is a validated mechanism, not a generic graph', () => {
  const nodePool = readJson('data/node-pool.json');
  const knowledgeEdges = readJson('data/knowledge-edges.json');
  const treeData = readJson('data/tree-data.json');
  const projection = projectKnowledgeMechanism({
    focusNodeId: 'k_1782820185793_jpet7h',
    nodePool,
    knowledgeEdges,
    treeData,
  });

  assert.ok(projection);
  assert.equal(projection.model.entities.length, 18);
  assert.equal(projection.process.steps.length, 11);
  assert.equal(projection.validation.valid, true);
  assert.ok(
    projection.model.entities.some((entity) => entity.id === 'k_java_class_state_initialized'),
  );
  assert.ok(
    projection.model.relations.some((relation) => relation.id === 'edge_java_class_parent_delegation'),
  );
});

test('mechanism panel has no runtime example registry', () => {
  const panelSource = fs.readFileSync(
    path.resolve(repoRoot, 'src/components/MechanismLensPanel.tsx'),
    'utf8',
  );
  assert.match(panelSource, /projectKnowledgeMechanism/);
  assert.doesNotMatch(panelSource, /MECHANISM_REGISTRY/);
  assert.doesNotMatch(panelSource, /javaThreadLifecycleModel|innodbStructureModel/);
  const explanationCardSource = fs.readFileSync(
    path.resolve(repoRoot, 'src/panels/ExplanationCard.tsx'),
    'utf8',
  );
  assert.match(explanationCardSource, /MechanismSpecEditor/);
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8'));
}
