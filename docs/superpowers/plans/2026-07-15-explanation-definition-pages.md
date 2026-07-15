# Explanation Definition Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-managed, separately persisted definition pages to the explanation card.

**Architecture:** Reuse `KnowledgeNode.card.tabs` as the definition-page store. Add narrow Zustand actions for creating and deleting tabs, keep content edits in `updateKnowledgeTab`, and keep directory supplements outside this flow. `ExplanationCard` owns only transient form and selected-tab UI state.

**Tech Stack:** React, TypeScript, Zustand, CSS, Node source-binding tests, Vite.

---

### Task 1: Add explicit tab mutations to the store

**Files:**
- Modify: `src/store/useGraph.ts`
- Test: `scripts/explanation-card-binding.test.mjs`

- [ ] **Step 1: Add public store action assertions**

Assert that the store exposes `addKnowledgeTab` and `removeKnowledgeTab`, and that both actions update `card.tabs` through the existing persistence path.

- [ ] **Step 2: Implement the actions**

Use the existing `updateKnowledgeCard` action and stable ids:

```ts
addKnowledgeTab: (knowledgeId: string, label: string) => string | null;
removeKnowledgeTab: (knowledgeId: string, tabId: string) => void;
```

`addKnowledgeTab` trims and rejects an empty label, rejects a missing or locked node, creates an id based on the node id plus a timestamp, appends `{ id, label, content: '' }`, persists, and returns the id. `removeKnowledgeTab` rejects missing/locked nodes and refuses to remove the final tab before persisting the filtered tab list.

- [ ] **Step 3: Run the binding test**

Run `node --test scripts/explanation-card-binding.test.mjs` and confirm the store contract assertions pass.

### Task 2: Add page creation and deletion controls to the explanation card

**Files:**
- Modify: `src/panels/ExplanationCard.tsx`
- Modify: `src/styles/components.css`
- Test: `scripts/explanation-card-binding.test.mjs`

- [ ] **Step 1: Add the page form behavior**

Add local state for the new page label and form visibility. Add a `+ page` control beside the definition tabs. On submit, call `addKnowledgeTab(selectedNodeId, draft)`, select the returned id, enter edit mode, and clear the form. Escape cancels the form. Empty labels do nothing except show the existing notification.

- [ ] **Step 2: Add a close control to user-managed tabs**

Render a close button only for tabs from `explanation.tabs`, never for `pathTab` or other directory supplement tabs. Call `removeKnowledgeTab` and move selection to the first remaining definition tab when the active page is removed. Prevent removing the final definition page.

- [ ] **Step 3: Style the compact controls**

Keep the existing one-line compact header and horizontally scrollable tab strip. Add only focused rules for the add-page control, page editor, and tab close button; do not restore the removed bottom toolbar or the old domain-specific block.

- [ ] **Step 4: Run the binding test**

Run `node --test scripts/explanation-card-binding.test.mjs` and confirm the new controls are present and directory supplement tabs are excluded from removal behavior.

### Task 3: Type-check and browser regression verification

**Files:**
- No additional source files.

- [ ] **Step 1: Build the application**

Run `npm run build`. Expected result: exit code 0 with no TypeScript or JSX errors.

- [ ] **Step 2: Verify the black-screen regression**

Reload `http://localhost:5173/`, select a concept, switch between definition pages, add a page, edit it, reload the concept, and remove the added page. Confirm the card remains visible and the new content survives the reload.

- [ ] **Step 3: Inspect the final diff**

Run `git diff -- src/store/useGraph.ts src/panels/ExplanationCard.tsx src/styles/components.css scripts/explanation-card-binding.test.mjs` and confirm no folder-derived tag logic, automatic supertag logic, or unrelated toolbar changes were introduced by this feature.
