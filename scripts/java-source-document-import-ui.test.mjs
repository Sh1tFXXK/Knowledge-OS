import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('document import exposes the isolated Java source mode', () => {
  const dialog = fs.readFileSync(
    path.resolve('src/components/DocumentImportDialog.tsx'),
    'utf8',
  );
  const panel = fs.readFileSync(
    path.resolve('src/components/JavaSourceImportPanel.tsx'),
    'utf8',
  );
  const client = fs.readFileSync(
    path.resolve('src/knowledge/documentImport.ts'),
    'utf8',
  );
  const api = fs.readFileSync(
    path.resolve('scripts/import/link-import-api.mjs'),
    'utf8',
  );

  assert.match(dialog, /DocumentImportSourceKind\.JavaSource/);
  assert.match(dialog, /<JavaSourceImportPanel/);
  assert.match(panel, /importJavaSource\(\{ source, parentTreeNodeId, translate \}\)/);
  assert.match(panel, /<TreeDestinationPicker/);
  assert.match(client, /fetch\('\/api\/import-java-source'/);
  assert.match(api, /server\.middlewares\.use\('\/api\/import-java-source'/);
  assert.match(api, /enqueueImport\(\(\) => importJavaSource/);
});
