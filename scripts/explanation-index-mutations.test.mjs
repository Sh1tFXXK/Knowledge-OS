import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readProjectFile(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

const mutations = readProjectFile('src/knowledge/explanationIndexMutations.ts');
const explanationIndex = readProjectFile('src/knowledge/explanationIndex.ts');
const indexView = readProjectFile('src/core/ExplanationIndexView.tsx');
const defaults = readProjectFile('src/knowledge/defaults.ts');
const store = readProjectFile('src/store/useGraph.ts');

assert.doesNotMatch(mutations, /childCount < 2/);
assert.match(mutations, /childCount < 1/);
assert.match(mutations, /selection\.kind === ExplanationSelectionKind\.Root[\s\S]*createBlankTab/);
assert.match(explanationIndex, /if \(!firstTab\)[\s\S]*ExplanationSelectionKind\.Root/);
assert.doesNotMatch(explanationIndex, /tags: string\[\]/);
assert.doesNotMatch(explanationIndex, /tags: page\.tags \?\? \[\]/);
assert.doesNotMatch(explanationIndex, /tags: tab\.tags \?\? \[\]/);
assert.match(defaults, /tabs: \[\]/);
assert.match(indexView, /useState\('1'\)/);
assert.match(indexView, /min="1"/);
assert.match(indexView, /childCount < 1/);
assert.match(indexView, /isRoot \? '＋子格' : '＋同级'/);
assert.doesNotMatch(indexView, /canAddSibling = !locked && !isRoot/);
assert.match(store, /if \(tabId === DEFINITION_TAB_ID && !isTopLevel\) return;/);
assert.doesNotMatch(store, /existing\.card\.tabs\.length <= 1\) return;/);

console.log('explanation index mutation checks passed');
