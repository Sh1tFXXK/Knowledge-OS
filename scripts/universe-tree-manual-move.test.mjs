import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('src/layout/UniverseTree.tsx'), 'utf8');

assert.match(source, /type DirectoryTransferAction = 'move' \| 'copy'/);
assert.match(source, /type DirectoryTransferDialogState = \{/);
assert.match(source, /interface TreeDirectoryOption \{/);
assert.match(source, /onMove: \(nodeId: string, label: string\) => void/);
assert.match(source, /移动到\.\.\./);
assert.match(source, /const \[transferDialog, setTransferDialog\] = useState<DirectoryTransferDialogState \| null>\(null\)/);
assert.match(source, /const directoryOptions = useMemo\(\(\) => collectDirectoryOptions\(treeData\), \[treeData\]\)/);
assert.match(source, /const transferSourceOptions = useMemo/);
assert.match(source, /const transferTargetOptions = useMemo/);
assert.match(source, /const handleConfirmTransfer = useCallback/);
assert.match(source, /moveTreeNode\(sourceId, transferDialog\.targetId\)/);
assert.match(source, /function collectDirectoryOptions\(root: TreeNode\): TreeDirectoryOption\[\]/);
assert.match(source, /function filterDirectoryOptions/);
assert.match(source, /function isInvalidManualMoveTarget/);
assert.match(source, /function isInvalidDirectoryTransferTarget/);
assert.match(source, /findTreeParent\(root, sourceId\)/);
assert.match(source, /findTreeNodeById\(source, targetId\)/);

console.log('universe tree manual move checks passed');
