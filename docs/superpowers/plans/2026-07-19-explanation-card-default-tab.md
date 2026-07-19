# Explanation Card Default Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make newly created knowledge nodes start with only the `定义` explanation tab while leaving every existing node unchanged.

**Architecture:** Keep the behavior owned by `createEmptyExplanation`, which is already the single construction path for new node cards. Add a runtime test that transpiles the focused TypeScript module and calls the factory directly; do not add migration code or presentation-layer filtering.

**Tech Stack:** TypeScript, Node.js test runner, TypeScript `transpileModule`, React/Vite build

---

### Task 1: Lock the New Default Contract

**Files:**
- Create: `scripts/explanation-default-tabs.test.mjs`
- Modify: `src/knowledge/defaults.ts`

- [ ] **Step 1: Write the failing factory test**

Create `scripts/explanation-default-tabs.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

async function loadDefaultsModule() {
  const source = fs.readFileSync(path.resolve('src/knowledge/defaults.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

test('new explanations start with only the definition tab', async () => {
  const { createEmptyExplanation } = await loadDefaultsModule();
  const explanation = createEmptyExplanation('k_java', 'Java');

  assert.deepEqual(explanation.tabs, [
    { id: 'def', label: '定义', content: '' },
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run:

```bash
node --test scripts/explanation-default-tabs.test.mjs
```

Expected: FAIL because `createEmptyExplanation` still returns `定义`, `机制`, `边界`, and `来源`.

- [ ] **Step 3: Replace the legacy four-tab factory output**

In `src/knowledge/defaults.ts`, remove `EXPLANATION_TAB_LABELS` and replace `createEmptyExplanation` with:

```ts
export function createEmptyExplanation(nodeId: string, title: string): NodeExplanation {
  return {
    nodeId,
    title,
    tabs: [
      {
        id: 'def',
        label: '定义',
        content: '',
      },
    ],
  };
}
```

Do not change `createKnowledgeNode`, existing JSON data, or explanation-card rendering.

- [ ] **Step 4: Run the focused test and verify the green state**

Run:

```bash
node --test scripts/explanation-default-tabs.test.mjs
```

Expected: PASS with one passing test.

- [ ] **Step 5: Run explanation-card regression checks**

Run:

```bash
node --test scripts/explanation-card-binding.test.mjs
```

Expected: PASS and print `explanation card binding checks passed`.

- [ ] **Step 6: Run the complete test suite**

Run:

```bash
npm test
```

Expected: all `scripts/*.test.mjs` tests pass.

- [ ] **Step 7: Run the production build**

Run:

```bash
npm run build
```

Expected: Vite completes the production build without TypeScript or bundling errors.

- [ ] **Step 8: Commit the implementation**

```bash
git add scripts/explanation-default-tabs.test.mjs src/knowledge/defaults.ts
git commit -m "fix: simplify explanation card defaults"
```
