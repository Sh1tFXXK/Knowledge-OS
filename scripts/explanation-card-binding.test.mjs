import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('src/panels/ExplanationCard.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

assert.match(source, /findTreeNodeById/);
assert.match(source, /const suggestedLabel = selectedTreeNode\?\.name\.trim\(\) \?\? ''/);
assert.match(source, /const createLabel = \(newLabel\.trim\(\) \|\| suggestedLabel\)\.trim\(\)/);
assert.match(source, /addKnowledgeNode\(createLabel\)/);
assert.match(source, /linkTreeToKnowledge\(selectedTreeNodeId, id\)/);
assert.match(source, /selectTreeEntry\(selectedTreeNodeId\)/);
assert.match(source, /disabled=\{!createLabel\}/);
assert.doesNotMatch(source, /createKnowledgeAndLink/);

console.log('explanation card binding checks passed');
