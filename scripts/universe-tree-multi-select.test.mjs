import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('src/layout/UniverseTree.tsx'), 'utf8');
const storeSource = fs.readFileSync(path.resolve('src/store/useGraph.ts'), 'utf8');

assert.match(source, /selectedTreeIds: ReadonlySet<string>/);
assert.match(source, /onToggleSelection: \(treeId: string\) => void/);
assert.match(source, /className="tree-node-select"/);
assert.match(source, /isBulkSelected \? 'bulk-selected' : ''/);
assert.match(source, /const \[selectedTreeNodeIds, setSelectedTreeNodeIds\] = useState<Set<string>>/);
assert.match(source, /const selectedTreeIds = useMemo/);
assert.match(source, /normalizeSelectedTreeIds\(treeData, \[\.\.\.selectedTreeNodeIds\]\)/);
assert.match(source, /const handleToggleTreeSelection = useCallback/);
assert.match(source, /const handleDeleteSelected = useCallback/);
assert.match(source, /tree-selection-bar/);
assert.match(source, /handleOpenTransferDialog\('move', selectedTreeIds\)/);
assert.match(source, /handleOpenTransferDialog\('copy', selectedTreeIds\)/);
assert.match(source, /event\?\.metaKey \|\| event\?\.ctrlKey/);
assert.match(source, /const \[draggingTreeNodeIds, setDraggingTreeNodeIds\] = useState<string\[\]>\(\[\]\)/);
assert.match(source, /selectedTreeIds\.includes\(nodeId\) \? selectedTreeIds : \[nodeId\]/);
assert.match(source, /moveTreeNodes\(sourceIds, nextParentId\)/);
assert.match(source, /copyTreeNodes\(transferSourceIds, transferDialog\.targetId\)/);
assert.match(source, /moveTreeNodes\(transferSourceIds, transferDialog\.targetId\)/);
assert.match(source, /function normalizeSelectedTreeIds\(root: TreeNode, ids: string\[\]\): string\[\]/);

assert.match(storeSource, /copyTreeNode: \(nodeId: string, nextParentId: string\) => boolean/);
assert.match(storeSource, /copyTreeNodes: \(nodeIds: string\[\], nextParentId: string\) => number/);
assert.match(storeSource, /moveTreeNodes: \(nodeIds: string\[\], nextParentId: string\) => number/);
assert.match(storeSource, /copyTreeNode: \(nodeId, nextParentId\) => \{/);
assert.match(storeSource, /copyTreeNodes: \(nodeIds, nextParentId\) => \{/);
assert.match(storeSource, /moveTreeNodes: \(nodeIds, nextParentId\) => \{/);

console.log('universe tree multi-select checks passed');
