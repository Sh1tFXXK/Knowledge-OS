import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve('src/core/sections/SemanticFieldView.tsx'), 'utf8');
const css = fs.readFileSync(path.resolve('src/styles/components.css'), 'utf8');

assert.doesNotMatch(css, /\.dc-field-atom\s*\{[^}]*position:\s*absolute/, 'physical atom cards must not be absolute-positioned by byte offset');

assert.match(source, /interface FieldTrack/, 'classification standards must be modeled as projection tracks');
assert.match(source, /dc-field-track-grid/, 'classification standards must render inside the projection field');
assert.match(source, /dc-field-cloud-stack/, 'semantic projection field cloud layer missing');
assert.match(source, /buildSemanticFieldClouds/, 'semantic field clouds must be computed in viewport space');
assert.match(source, /buildSemanticFieldConnections/, 'semantic field connections must be computed from clouds to atoms');
assert.match(source, /buildAtomFieldSpans/, 'semantic field must project atoms with physical offset and size spans');
assert.match(source, /standardPhysicalSegments/, 'semantic standards must split discontinuous physical spans');
assert.match(source, /semanticSize/, 'field cloud size must be driven by semantic coverage');
assert.match(source, /--field-x/, 'field clouds must use independent viewport coordinates');
assert.match(source, /dc-field-projection-links/, 'semantic projection links layer missing');
assert.match(source, /fieldConnections\.length\s*>\s*0/, 'projection links must render only when a standard is active');
assert.match(source, /buildSemanticFieldConnections\(fieldClouds,\s*atoms,\s*atomSpans,\s*activeStandard\)/, 'projection links must use physical atom spans');
assert.doesNotMatch(source, /dc-field-cloud-stack"\s+aria-hidden="true"/, 'semantic viewport must expose interactive field clouds');
assert.match(source, /members:\s*inferProjectionMembers/, 'projection nodes must infer their covered atoms');
assert.match(source, /dc-field-atom-membership/, 'atom cards must show their covering semantic fields');
assert.match(source, /dc-field-atom-measure/, 'physical atom cards must expose a separate true span marker');
assert.match(source, /useAtomRect<HTMLElement>\(atom\.nodeId,\s*registerAtomRect\)/, 'semantic-field atoms must register rects for group overlays');
assert.match(source, /const openStandard = \(standard: SemanticStandard\) => \{\s*setFocusedStandardId\(standard\.id\);\s*\};/, 'classification nodes must focus the field instead of navigating away');
assert.match(source, /section\.title\s*\?\?\s*'原子布局'/, 'bottom atom rail must use a generic layout label');

for (const stale of [
  '标签只选择光场',
  '字节布局',
  '物理顺序',
  'dc-field-footer',
  'dc-field-classification',
  'dc-field-taxonomy',
  'dc-field-standard-cluster',
  'dc-field-standard-summary',
  'dc-field-standard-axis',
  'dc-field-tag-grid',
  'dc-field-relation-link',
  'dc-field-atom-code',
  'fieldRanges',
  'range.left',
  'range.width',
  '--field-left',
  '--field-top',
]) {
  assert.doesNotMatch(source, new RegExp(stale), `stale semantic-field source marker remains: ${stale}`);
  assert.doesNotMatch(css, new RegExp(stale), `stale semantic-field CSS marker remains: ${stale}`);
}

console.log('semantic field view checks passed');
