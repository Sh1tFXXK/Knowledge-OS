import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourcePath = path.resolve('src/core/explanation-index/cuttingGesture.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});
const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
  require,
}, { filename: sourcePath });

const { collectCuttingHits } = module.exports;

function rectTarget(id, left, top, right, bottom, deletable = true) {
  return { id, rect: { left, top, right, bottom }, deletable };
}

function edgeTarget(id, segments, deletable = true) {
  return { id, segments, deletable };
}

test('a Project Graph style cutting line continuously warns every crossed node', () => {
  const nodes = [
    rectTarget('cloneable', 100, 100, 180, 150),
    rectTarget('random-access', 220, 100, 320, 150),
    rectTarget('serializable', 360, 100, 450, 150),
  ];
  const hits = collectCuttingHits(
    { start: { x: 70, y: 125 }, end: { x: 340, y: 125 } },
    nodes,
    [],
  );

  assert.deepEqual([...hits.nodeIds], ['cloneable', 'random-access']);
});

test('crossing a shared trunk warns every original relationship represented by it', () => {
  const sharedTrunk = { start: { x: 200, y: 200 }, end: { x: 500, y: 200 } };
  const edges = [
    edgeTarget('implements-cloneable', [
      sharedTrunk,
      { start: { x: 260, y: 200 }, end: { x: 260, y: 120 } },
    ]),
    edgeTarget('implements-random-access', [
      sharedTrunk,
      { start: { x: 380, y: 200 }, end: { x: 380, y: 120 } },
    ]),
  ];
  const hits = collectCuttingHits(
    { start: { x: 320, y: 170 }, end: { x: 320, y: 230 } },
    [],
    edges,
  );

  assert.deepEqual(
    [...hits.edgeIds].sort(),
    ['implements-cloneable', 'implements-random-access'],
  );
});

test('warning targets are recomputed from the current cutting line instead of accumulating', () => {
  const nodes = [
    rectTarget('left', 100, 100, 180, 150),
    rectTarget('right', 260, 100, 340, 150),
  ];
  const first = collectCuttingHits(
    { start: { x: 80, y: 125 }, end: { x: 200, y: 125 } },
    nodes,
    [],
  );
  const second = collectCuttingHits(
    { start: { x: 240, y: 125 }, end: { x: 360, y: 125 } },
    nodes,
    [],
  );

  assert.deepEqual([...first.nodeIds], ['left']);
  assert.deepEqual([...second.nodeIds], ['right']);
});

test('locked nodes and relations never enter the warning set', () => {
  const cut = { start: { x: 0, y: 50 }, end: { x: 200, y: 50 } };
  const hits = collectCuttingHits(
    cut,
    [rectTarget('locked-node', 50, 20, 100, 80, false)],
    [edgeTarget('locked-edge', [{ start: { x: 120, y: 0 }, end: { x: 120, y: 100 } }], false)],
  );

  assert.deepEqual([...hits.nodeIds], []);
  assert.deepEqual([...hits.edgeIds], []);
});
