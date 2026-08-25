import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
const indexSource = fs.readFileSync(path.resolve('src/core/ExplanationIndexView.tsx'), 'utf8');
const layoutCss = fs.readFileSync(path.resolve('src/styles/layout.css'), 'utf8');

assert.match(appSource, /const \[isIndexFocusMode, setIsIndexFocusMode\] = useState\(false\)/);
assert.match(appSource, /activeView === 'index' && !!selectedNodeId && isIndexFocusMode/);
assert.match(appSource, /className=\{isIndexFocusActive \? 'is-index-focus' : undefined\}/);
assert.match(appSource, /isFocusMode=\{isIndexFocusActive\}/);
assert.match(appSource, /onToggleFocusMode=/);

assert.match(indexSource, /Maximize2/);
assert.match(indexSource, /Minimize2/);
assert.match(indexSource, /恢复目录和详情栏/);
assert.match(indexSource, /索引视图占满屏幕/);

assert.match(layoutCss, /#app\.is-index-focus\s*\{[\s\S]*grid-template-columns:\s*0 minmax\(0, 1fr\) 0/);
assert.match(layoutCss, /#app\.is-index-focus \.left-panel,[\s\S]*#app\.is-index-focus \.right-panel[\s\S]*visibility:\s*hidden/);

console.log('index focus layout checks passed');
