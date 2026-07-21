import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('existing system tabs remain available in the explanation matrix', () => {
  const cardSource = fs.readFileSync(path.resolve('src/panels/ExplanationCard.tsx'), 'utf8');
  const migrationSource = fs.readFileSync(path.resolve('src/knowledge/migrateViewDimensions.ts'), 'utf8');

  assert.match(cardSource, /const visibleTabs = explanation\?\.tabs \?\? \[\]/);
  assert.doesNotMatch(cardSource, /HIDDEN_LEGACY_TAB_IDS/);
  assert.doesNotMatch(cardSource, /isVisibleMainTab/);
  assert.doesNotMatch(migrationSource, /LEGACY_EXPLANATION_TAB_IDS/);
  assert.doesNotMatch(migrationSource, /stripLegacyExplanationTabs/);
});
