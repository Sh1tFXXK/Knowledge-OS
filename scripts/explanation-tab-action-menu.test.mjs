import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

function readProjectFile(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

test('explanation tabs use one shared action menu instead of crowded action buttons', () => {
  const source = readProjectFile('src/panels/ExplanationCard.tsx');
  const styles = readProjectFile('src/styles/components.css');

  assert.match(source, /function ItemActionMenu/);
  assert.match(source, /className="explanation-item-menu-trigger"/);
  assert.match(source, /className="explanation-item-menu"/);
  assert.match(source, /新增子页/);
  assert.match(source, /重命名/);
  assert.match(source, /删除/);
  assert.doesNotMatch(source, /className="card-tab-add-child"/);
  assert.doesNotMatch(source, /className="definition-page-add-child"/);
  assert.doesNotMatch(source, /className="card-tab-close"/);
  assert.doesNotMatch(source, /className="definition-page-close"/);
  assert.match(styles, /\.explanation-item-menu-trigger\s*\{/);
  assert.match(styles, /\.explanation-item-menu\s*\{/);
  assert.match(
    styles,
    /\.definition-pages-multirow\s*\{[\s\S]*margin:\s*-13px -13px -10px[\s\S]*width:\s*calc\(100% \+ 26px\)/,
  );
  assert.match(
    styles,
    /\.card-content > \.markdown-view\s*\{[\s\S]*margin:\s*-10px -13px 96px[\s\S]*min-height:\s*185px[\s\S]*width:\s*calc\(100% \+ 26px\)/,
  );
});
