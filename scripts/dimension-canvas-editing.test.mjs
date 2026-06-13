import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dcSource = fs.readFileSync(path.resolve('src/core/DimensionCanvas.tsx'), 'utf8');
const rendererSource = fs.readFileSync(path.resolve('src/core/sections/SectionRenderer.tsx'), 'utf8');

// ── DimensionCanvas assertions ────────────────────────────────────────────
assert.match(dcSource, /resolveSectionAtoms/, 'resolveSectionAtoms import missing');
assert.match(dcSource, /SectionRenderer/, 'SectionRenderer usage missing');
assert.match(dcSource, /GroupOverlay/, 'GroupOverlay usage missing');
assert.match(dcSource, /updateKnowledgeViewDimensions/, 'updateKnowledgeViewDimensions missing');
assert.match(dcSource, /onAtomEdit/, 'onAtomEdit prop missing');
assert.match(dcSource, /dc-child-edit-panel/, 'dc-child-edit-panel class missing');
// Five layout options must be listed
assert.match(dcSource, /'stack'/, "layout 'stack' missing");
assert.match(dcSource, /'grid'/, "layout 'grid' missing");
assert.match(dcSource, /'tree'/, "layout 'tree' missing");
assert.match(dcSource, /'chain'/, "layout 'chain' missing");
assert.match(dcSource, /'matrix'/, "layout 'matrix' missing");
// Binding desc placeholder must indicate projection-only scope
assert.match(dcSource, /投影特化描述/, '投影特化描述 placeholder missing');
// Must NOT touch graph structure from dimension editing
assert.doesNotMatch(dcSource, /addKnowledgeEdge/, 'addKnowledgeEdge must not appear in DimensionCanvas');
assert.doesNotMatch(dcSource, /removeKnowledgeEdge/, 'removeKnowledgeEdge must not appear in DimensionCanvas');

// ── SectionRenderer assertions ────────────────────────────────────────────
assert.match(rendererSource, /stack:\s*StackSection/, "LAYOUT_RENDERERS missing 'stack'");
assert.match(rendererSource, /grid:\s*GridSection/, "LAYOUT_RENDERERS missing 'grid'");
assert.match(rendererSource, /tree:\s*TreeSection/, "LAYOUT_RENDERERS missing 'tree'");
assert.match(rendererSource, /chain:\s*ChainSection/, "LAYOUT_RENDERERS missing 'chain'");
assert.match(rendererSource, /matrix:\s*MatrixSection/, "LAYOUT_RENDERERS missing 'matrix'");

console.log('dimension canvas editing checks passed');
