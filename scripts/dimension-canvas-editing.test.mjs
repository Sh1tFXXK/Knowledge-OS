import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('src/core/DimensionCanvas.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

assert.match(source, /updateKnowledgeNodeLabel/);
assert.match(source, /updateKnowledgeNodeMeta/);
assert.match(source, /updateKnowledgeTab/);
assert.match(source, /updateKnowledgeViewDimensions/);
assert.match(source, /dc-edit-action/);
assert.match(source, /dc-chip-edit/);
assert.match(source, /dc-child-edit-panel/);
assert.match(source, /onChildEdit/);
assert.match(source, /placeholder="节点名称"/);
assert.match(source, /placeholder="维度名称"/);
assert.match(source, /placeholder="分类节点名称"/);
assert.doesNotMatch(source, /addKnowledgeEdge/);
assert.doesNotMatch(source, /removeKnowledgeEdge/);

console.log('dimension canvas editing checks passed');
