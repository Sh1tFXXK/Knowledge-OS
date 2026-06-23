# Frontend Data Bundle Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove bundled knowledge JSON from the production entry chunk while preserving the existing `/api/data` file-loading behavior.

**Architecture:** Keep state ownership in `useGraphStore`; change only the initial data boundary. `state.ts` owns a true empty persisted-state shape, `filePersistence.ts` owns async file loading, and `demoSeed.ts` remains the explicit demo-data materializer.

**Tech Stack:** Vite, React 19, Zustand, Node built-in test runner.

---

### Task 1: Protect The Bundle Boundary

**Files:**
- Create: `scripts/frontend-bundle-data.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('production javascript does not inline the knowledge node payload', () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build; node --test scripts/frontend-bundle-data.test.mjs`

Expected: FAIL because the current built JS contains `React 导入导出机制`.

### Task 2: Introduce True Empty State

**Files:**
- Modify: `src/knowledge/state.ts`

- [ ] **Step 1: Replace demo-backed empty state with typed empty state**

`createEmptyAppState()` should return the minimal valid `PersistedAppState` directly: root tree, empty node pool, empty edges, empty graph arrays, empty questions, empty rules, empty perspectives, empty subsystems, empty inference responses.

- [ ] **Step 2: Keep invalid states impossible**

The root `TreeNode` must have a concrete `nodeRef` string and empty `children`; no nullable root fields.

### Task 3: Load Demo Data Asynchronously

**Files:**
- Modify: `src/knowledge/filePersistence.ts`
- Modify: `src/store/useGraph.ts`

- [ ] **Step 1: Add `loadCompleteStateFromFiles()`**

This helper should call `loadStateFromFiles()`, merge it over `createEmptyAppState()`, migrate `nodePool`, and return a full `PersistedAppState`.

- [ ] **Step 2: Remove static demo import from store**

`useGraph.ts` should no longer import `createInitialAppState`. `initialize()` and `loadDemoData()` should await `loadCompleteStateFromFiles()`.

- [ ] **Step 3: Preserve reset semantics**

`resetAllKnowledge()` should still clear storage and persist an empty state. It should not reload bundled demo data.

### Task 4: Verify

**Files:**
- Existing tests only.

- [ ] **Step 1: Run focused bundle regression**

Run: `npm run build; node --test scripts/frontend-bundle-data.test.mjs`

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Compare build output**

Run: `npm run build`

Expected: production JS chunk is materially smaller than the baseline `1,807.74 kB`.
