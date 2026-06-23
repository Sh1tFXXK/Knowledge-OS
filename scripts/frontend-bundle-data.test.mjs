import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('production javascript does not inline the knowledge node payload', () => {
  execFileSync('npm', ['run', 'build'], { stdio: 'pipe', shell: true });

  const assetsDir = path.resolve('dist/assets');
  const jsFiles = fs.readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
  assert.ok(jsFiles.length > 0, 'expected built javascript assets');

  const combined = jsFiles
    .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
    .join('\n');

  assert.equal(
    combined.includes('React 导入导出机制'),
    false,
    'knowledge node content should be loaded from data files, not inlined into the JS bundle',
  );
});
