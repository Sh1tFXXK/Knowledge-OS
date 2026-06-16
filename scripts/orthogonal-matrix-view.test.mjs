import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dimensionCanvas = fs.readFileSync(path.resolve('src/core/DimensionCanvas.tsx'), 'utf8');
const orthogonalViewPath = path.resolve('src/core/sections/OrthogonalMatrixView.tsx');
const typesSource = fs.readFileSync(path.resolve('src/types.ts'), 'utf8');
const migrateSource = fs.readFileSync(path.resolve('src/knowledge/migrateViewDimensions.ts'), 'utf8');
const css = fs.readFileSync(path.resolve('src/styles/components.css'), 'utf8');
const nodePool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));
const plainDimensionCanvas = dimensionCanvas.replace(/\s+/g, ' ');

assert.ok(fs.existsSync(orthogonalViewPath), 'OrthogonalMatrixView component file missing');

const orthogonalView = fs.readFileSync(orthogonalViewPath, 'utf8');

assert.match(
  plainDimensionCanvas,
  /<OrthogonalMatrixView[^>]*dimensions=\{dimsList\}/,
  'DimensionCanvas must render OrthogonalMatrixView with all dimensions',
);
assert.match(
  orthogonalView,
  /dimensionId: row\.dimension\.id,[\s\S]*sectionId: segment\.group\.sectionId,[\s\S]*groupId: segment\.group\.group \? segment\.group\.id : undefined/,
  'Band editing must target the explicit row dimension and category section/group',
);
assert.match(
  plainDimensionCanvas,
  /saveAtomToDimensions/,
  'DimensionCanvas must support saving one atom into multiple axis dimensions',
);
assert.match(
  typesSource,
  /export interface ClassificationScopeMeta/,
  'ViewDimension must carry typed scoped-classification metadata',
);
assert.match(
  typesSource,
  /target: 'object' \| 'parts' \| 'children'/,
  'Classification scope target must be a typed union, not a free string',
);
assert.doesNotMatch(
  typesSource,
  /ClassificationIndexRowMeta|indexRows/,
  'Index row metadata must not leak into the core scope model; ordering is the atom order itself',
);
assert.match(
  orthogonalView,
  /interface ClassificationScope/,
  'OrthogonalMatrixView must model typed classification scopes',
);
assert.match(
  orthogonalView,
  /interface ClassificationBandRow/,
  'OrthogonalMatrixView must model typed classification band rows',
);
assert.match(
  orthogonalView,
  /interface ClassificationBandSegment/,
  'OrthogonalMatrixView must model typed merged horizontal band segments',
);
assert.match(
  orthogonalView,
  /buildClassificationScopes/,
  'OrthogonalMatrixView must group dimensions by classification scope',
);
assert.match(
  orthogonalView,
  /buildOrderedAtoms/,
  'OrthogonalMatrixView must derive one shared atom header row per matrix scope',
);
assert.match(
  orthogonalView,
  /buildClassificationBandRows/,
  'OrthogonalMatrixView must derive classification rows from typed dimensions',
);
assert.match(
  orthogonalView,
  /buildContiguousSegments/,
  'Band rows must split non-contiguous category members into explicit segments',
);
assert.doesNotMatch(
  orthogonalView,
  /buildAtomIndexRows|indexRows|dc-band-index/,
  'Matrix must not render separate physical-index rows; the atom order is the physical order',
);
assert.doesNotMatch(
  orthogonalView,
  /rows\.filter\(\(row\) => row\.values\.some/,
  'Configured index rows must render even when all cells are empty',
);
assert.match(
  orthogonalView,
  /gridColumn: `\$\{segment\.start \+ 1\} \/ span \$\{segment\.span\}`/,
  'Category bands must render as horizontally merged grid spans',
);
assert.match(
  orthogonalView,
  /dc-scope-shell/,
  'Scoped classification view must render one shell per target scope',
);
assert.match(
  orthogonalView,
  /dc-scope-overall-categories/,
  'Object-level scopes must render compact overall category chips',
);
assert.match(
  orthogonalView,
  /dc-band-slot/,
  'Classification band view must keep editable empty atom slots',
);
assert.match(
  orthogonalView,
  /onAddRow/,
  'Classification band view must expose a direct add-row edit action',
);
assert.match(
  orthogonalView,
  /onAddRow: \(scope\?: ClassificationScopeMeta\) => void/,
  'Add-row actions must be able to pass the target classification scope',
);
assert.match(
  orthogonalView,
  /onAddRow\(scope\.meta\)/,
  'Scope-local add-row buttons must create the row with the full configured scope metadata',
);
assert.match(
  plainDimensionCanvas,
  /createDimension = \(rawName: string, scope: ClassificationScopeMeta \| undefined = activeDim\?\.scope\)/,
  'New dimensions must inherit the active or requested classification scope',
);
assert.match(
  orthogonalView,
  /onRenameRow/,
  'Classification band row headers must expose rename actions',
);
assert.match(
  orthogonalView,
  /onDeleteRow/,
  'Classification band row headers must expose delete actions',
);
assert.match(
  orthogonalView,
  /onCategoryEdit/,
  'Classification band blocks must expose category label edit actions',
);
assert.match(
  orthogonalView,
  /onAtomHeaderEdit/,
  'Atom headers must expose an edit action linked to their projection binding',
);
assert.match(
  orthogonalView,
  /dc-band-slot-label/,
  'Empty band slots must show an explicit bind affordance',
);
assert.doesNotMatch(
  orthogonalView,
  /if \(segments\.length === 0\) return \[\]/,
  'Empty dimensions must still render as editable band rows',
);
assert.doesNotMatch(
  orthogonalView,
  /orderedAtoms\.length === 0 \|\| rows\.length === 0/,
  'Matrix scopes must keep their fixed structure even when atoms or rows are not populated yet',
);
assert.match(
  orthogonalView,
  /Math\.max\(scope\.orderedAtoms\.length, 1\)/,
  'Matrix scopes must keep a visible grid column when no atom columns are configured yet',
);
assert.doesNotMatch(
  orthogonalView,
  /value \|\| '-'/,
  'Empty index cells must stay empty instead of being filled with generic placeholders',
);
assert.match(
  plainDimensionCanvas,
  /startCategoryEdit/,
  'DimensionCanvas must own category edit state for band labels',
);
assert.match(
  plainDimensionCanvas,
  /commitCategoryEdit/,
  'DimensionCanvas must persist category edits through viewDimensions',
);
assert.match(
  plainDimensionCanvas,
  /createDimension/,
  'DimensionCanvas must share row creation with existing dimension creation state',
);
assert.match(
  plainDimensionCanvas,
  /renameDimensionWithPrimarySection/,
  'Row rename must keep the auto-created primary section title in sync with the dimension name',
);
assert.doesNotMatch(
  plainDimensionCanvas,
  /dim\.id === renamingDimId \? \{ \.\.\.dim, name \} : dim/,
  'Dimension rename must not leave stale default section titles behind',
);
assert.match(
  migrateSource,
  /scope: dim\.scope/,
  'View dimension migration must preserve scope metadata',
);
assert.match(
  css,
  /\.dc-band-shell/,
  'Classification band shell styles missing',
);
assert.match(
  css,
  /\.dc-scope-shell/,
  'Scoped classification shell styles missing',
);
assert.match(
  css,
  /\.dc-scope-overall-chip/,
  'Object-level category chip styles missing',
);
assert.match(
  css,
  /\.dc-band-block/,
  'Classification band block styles missing',
);
assert.match(
  css,
  /\.dc-band-row-actions/,
  'Classification band row action styles missing',
);
assert.match(
  css,
  /\.dc-band-atom-edit/,
  'Classification band atom edit styles missing',
);

for (const stale of ['obj["type"]', 'row[3]', 'switch (cell']) {
  assert.doesNotMatch(orthogonalView, new RegExp(stale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `string/positional architecture marker remains: ${stale}`);
}

const pageNode = Object.values(nodePool).find((node) => node.label === 'Page');
assert.ok(pageNode, 'Page node missing from node pool');
const pageTypeDimension = pageNode.viewDimensions?.find((dim) => dim.id === 'page_type');
assert.ok(pageTypeDimension, 'Page object-level type dimension missing');
assert.equal(pageTypeDimension.name, '按页类型', 'Page type dimension should use the classification-standard label');
assert.equal(pageTypeDimension.scope?.target, 'object', 'Page type dimension must be scoped to Page itself');
assert.equal(pageTypeDimension.scope?.name, 'Page 整体', 'Page type dimension should live in the Page overall scope');
assert.doesNotMatch(
  JSON.stringify(pageTypeDimension),
  /"title":"12"|\"title\":\s*\"12\"/,
  'Page type row must not persist the stale temporary category label "12"',
);
assert.ok(
  pageTypeDimension.sections[0]?.atoms.length >= 4,
  'Page type scope should bind page-type category atoms',
);

const pageStructureDimension = pageNode.viewDimensions?.find((dim) => dim.id === 'page_structure');
assert.ok(pageStructureDimension, 'Page internal structure dimension missing');
assert.equal(pageStructureDimension.name, '按功能大类', 'Page parts primary row should be a classification standard');
assert.equal(pageStructureDimension.scope?.target, 'parts', 'Page structure dimension must be scoped to Page.parts');

const pageRecordShapeDimension = pageNode.viewDimensions?.find((dim) => dim.id === 'page_record_shape');
assert.ok(pageRecordShapeDimension, 'Page record-shape row missing');
assert.equal(pageRecordShapeDimension.scope?.id, pageStructureDimension.scope?.id, 'Page parts classification standards must share one matrix scope');

const pageStructureAtoms = pageStructureDimension.sections[0]?.atoms ?? [];
assert.deepEqual(
  pageStructureAtoms.map((atom) => atom.attrs?.physicalOrder),
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined],
  'physicalOrder must not be stored as an atom attr; the order is implicit in the atom sequence',
);
assert.deepEqual(
  pageStructureAtoms.map((atom) => atom.attrs?.physicalPosition),
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined],
  'physicalPosition must not be stored as an atom attr',
);
const pageStructureLabels = pageStructureAtoms.map((atom) => nodePool[atom.nodeId]?.label);
assert.deepEqual(
  pageStructureLabels,
  ['File Header', 'Page Header', 'Infimum + Supremum', 'User Records', 'Free Space', 'Page Directory', 'File Trailer'],
  'Page parts atom order must be the physical layout itself, not a classification-contiguous reordering',
);
assert.ok(
  pageStructureDimension.groups?.some((group) =>
    group.label === '通用部分' && group.members.length === 3,
  ),
  'Common part group should include File Header, Page Header, and File Trailer',
);
assert.ok(
  pageRecordShapeDimension.groups?.some((group) =>
    group.label === '行记录' && group.members.length === 2,
  ),
  'Record-shape row should classify Infimum+Supremum and User Records as row records',
);

console.log('orthogonal matrix view checks passed');
