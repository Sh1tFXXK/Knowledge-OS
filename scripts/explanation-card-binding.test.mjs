import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('src/panels/ExplanationCard.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const componentsCss = fs.readFileSync(path.resolve('src/styles/components.css'), 'utf8');

assert.match(source, /findTreeNodeById/);
assert.match(source, /const suggestedLabel = selectedTreeNode\?\.name\.trim\(\) \?\? ''/);
assert.match(source, /const createLabel = \(newLabel\.trim\(\) \|\| suggestedLabel\)\.trim\(\)/);
assert.match(source, /addKnowledgeNode\(createLabel\)/);
assert.match(source, /linkTreeToKnowledge\(selectedTreeNodeId, id\)/);
assert.match(source, /selectTreeEntry\(selectedTreeNodeId\)/);
assert.match(source, /disabled=\{!createLabel\}/);
assert.doesNotMatch(source, /createKnowledgeAndLink/);
assert.doesNotMatch(source, /className="ec-meta-chips"/);
assert.doesNotMatch(source, /editingMeta/);
assert.doesNotMatch(source, /setEditingMeta/);
assert.doesNotMatch(source, /metaLabel/);
assert.doesNotMatch(source, /metaRole/);
assert.doesNotMatch(source, /metaTags/);
assert.doesNotMatch(source, /KnowledgeRole/);
assert.match(componentsCss, /\.markdown-view\s*\{[\s\S]*font-size:\s*14px/);
assert.match(componentsCss, /\.markdown-view p\s*\{[\s\S]*font-size:\s*14px/);
assert.match(componentsCss, /\.explanation-card-node\s*\{[\s\S]*font-size:\s*12px/);
assert.match(componentsCss, /\.card-tab\s*\{[\s\S]*font-size:\s*10px/);

console.log('explanation card binding checks passed');
