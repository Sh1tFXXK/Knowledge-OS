import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

function readProjectFile(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

test('recursive title cells expose one compact structural action menu', () => {
  const source = readProjectFile('src/panels/explanation/RecursiveTitleMatrix.tsx');
  const styles = readProjectFile('src/styles/components.css');

  assert.match(source, /className="title-matrix-tools-trigger"/);
  assert.match(source, /className="title-matrix-tools-menu"/);
  assert.match(source, />分裂</);
  assert.match(source, />添加同级</);
  assert.match(source, />编辑标题</);
  assert.match(source, />\s*合并\s*</);
  assert.match(source, /删除/);
  assert.match(source, /className="title-matrix-weight-control"/);
  assert.match(styles, /\.title-matrix-tools-trigger\s*\{/);
  assert.match(styles, /\.title-matrix-tools-menu\s*\{/);
  assert.match(styles, /\.title-matrix-weight-control\s*\{/);
});
