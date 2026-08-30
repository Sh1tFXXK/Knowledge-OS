import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
const rightPanelSource = fs.readFileSync(path.resolve('src/layout/RightSidePanel.tsx'), 'utf8');
const systemConnectionSource = fs.readFileSync(path.resolve('src/panels/SystemConnectionMap.tsx'), 'utf8');
const layoutCss = fs.readFileSync(path.resolve('src/styles/layout.css'), 'utf8');

assert.match(appSource, /RIGHT_PANEL_MIN_WIDTH/);
assert.match(appSource, /RIGHT_PANEL_MAX_WIDTH/);
assert.match(appSource, /const \[rightPanelWidth, setRightPanelWidth\]/);
assert.match(appSource, /function clampRightPanelWidth/);
assert.match(appSource, /startRightPanelResize/);
assert.match(appSource, /--right-panel-width/);
assert.match(appSource, /onResizeStart=\{startRightPanelResize\}/);

assert.match(rightPanelSource, /onResizeStart/);
assert.match(rightPanelSource, /right-panel-resize-handle/);
assert.match(rightPanelSource, /SystemConnectionMap/);
assert.match(rightPanelSource, /answerQuestion\(questionId, answerDraft\)/);
assert.match(rightPanelSource, /right-question-answer-input/);
assert.match(rightPanelSource, /event\.ctrlKey \|\| event\.metaKey/);
assert.match(rightPanelSource, /编辑答案/);
assert.doesNotMatch(rightPanelSource, /RelationNetworkSkeleton/);
assert.doesNotMatch(rightPanelSource, /import RelationNetwork from/);

assert.match(layoutCss, /\.right-panel\s*\{[\s\S]*position:\s*relative/);
assert.match(layoutCss, /\.right-panel-resize-handle\s*\{[\s\S]*cursor:\s*col-resize/);
assert.match(layoutCss, /body\.is-resizing-right-panel/);
assert.match(systemConnectionSource, /buildSystemConnectionGraph/);
assert.match(systemConnectionSource, /system-connection-panel/);

console.log('right panel resize checks passed');
