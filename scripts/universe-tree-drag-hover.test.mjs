import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('src/layout/UniverseTree.tsx'), 'utf8');

assert.match(source, /const \[openedByDrag, setOpenedByDrag\] = useState\(false\)/);
assert.match(source, /const dragCloseTimerRef = useRef<number \| null>\(null\)/);
assert.match(source, /const dragExpandTimerRef = useRef<number \| null>\(null\)/);
assert.match(source, /const DRAG_EXPAND_DWELL_MS = 650/);
assert.match(source, /const openForDragFocus = \(\) => \{/);
assert.match(source, /const scheduleDragExpand = \(\) => \{/);
assert.match(source, /setOpenedByDrag\(true\)/);
assert.match(source, /const scheduleDragAutoClose = \(\) => \{/);
assert.match(source, /cancelDragExpand\(\)/);
assert.match(source, /if \(!openedByDrag\) return/);
assert.match(source, /window\.setTimeout\(\(\) => \{/);
assert.match(source, /setOpenedByDrag\(false\)/);
assert.match(source, /if \(e\.currentTarget\.contains\(e\.relatedTarget as Node \| null\)\) return/);
assert.match(source, /onDragEnter=\{handleDragEnter\}/);
assert.match(source, /onDragLeave=\{handleDragLeave\}/);
assert.match(source, /scheduleDragExpand\(\)/);
assert.match(source, /cancelDragAutoClose\(\);\s*scheduleDragExpand\(\);/);

console.log('universe tree drag-hover checks passed');
