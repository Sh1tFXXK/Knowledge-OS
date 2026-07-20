# Explanation Tab Action Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate crowded explanation-tab and definition-page controls into one accessible overflow menu per item.

**Architecture:** Keep all behavior inside `ExplanationCard` and reuse the existing store actions and form states. Add one focused menu component plus typed local open-menu state, then replace the current independent action buttons with menu items. CSS changes reserve space for a single trigger and position a compact menu without changing the explanation-card layout grid.

**Tech Stack:** React 19, TypeScript, Zustand, CSS, Node test runner, Vite

---

### Task 1: Add the action-menu regression test

**Files:**
- Create: `scripts/explanation-tab-action-menu.test.mjs`
- Test: `src/panels/ExplanationCard.tsx`
- Test: `src/styles/components.css`

- [ ] **Step 1: Write the failing test**

Create a source-binding test that reads `ExplanationCard.tsx` and `components.css` and asserts:

```js
assert.match(source, /function ItemActionMenu/);
assert.match(source, /className="explanation-item-menu-trigger"/);
assert.match(source, /className="explanation-item-menu"/);
assert.doesNotMatch(source, /className="card-tab-add-child"/);
assert.doesNotMatch(source, /className="definition-page-add-child"/);
assert.match(styles, /\.explanation-item-menu-trigger/);
assert.match(styles, /\.explanation-item-menu\s*\{/);
```

- [ ] **Step 2: Run the test to verify RED**

Run: `node --test scripts/explanation-tab-action-menu.test.mjs`

Expected: FAIL because the shared menu and trigger do not exist and the old independent controls are still rendered.

### Task 2: Implement the shared overflow menu

**Files:**
- Modify: `src/panels/ExplanationCard.tsx`

- [ ] **Step 1: Add typed local menu state**

Add a discriminated union for tab and page menu targets and a single `openActionMenu` state. Add Escape and outside-click handling with cleanup.

- [ ] **Step 2: Add the focused menu component**

Implement `ItemActionMenu` with a `More actions` trigger, conditional `Add child`, `Rename`, and `Delete` buttons, accessible names, and event propagation guards.

- [ ] **Step 3: Replace vertical tab controls**

Render one menu for every real tab. Preserve current permissions by passing `canRename` and `canRemove`. Menu actions call the existing callbacks and close the menu first.

- [ ] **Step 4: Replace horizontal page controls**

Render one menu for every non-renaming page. Preserve current delete constraints and the existing add-child and rename forms.

- [ ] **Step 5: Run the focused test to verify GREEN**

Run: `node --test scripts/explanation-tab-action-menu.test.mjs`

Expected: PASS.

### Task 3: Restyle labels, trigger, and menu

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: Reserve one trailing control width**

Remove the old padding variants for two and three buttons. Give tab and page labels enough right padding for one 24 pixel trigger.

- [ ] **Step 2: Add trigger visibility rules**

Keep the trigger visible on active items and open menus. Reveal it on hover and `:focus-within` for inactive items. Include a visible keyboard focus ring.

- [ ] **Step 3: Add menu surface and menu-item states**

Position the menu at the item trailing edge with a stable width, readable labels, purple constructive hover states, and red destructive hover states. Keep it above adjacent rows with an explicit z-index.

- [ ] **Step 4: Remove obsolete action-control rules**

Delete the CSS for `.card-tab-close`, `.card-tab-rename`, `.card-tab-add-child`, `.definition-page-close`, and `.definition-page-add-child` after their markup is gone.

- [ ] **Step 5: Re-run the focused test**

Run: `node --test scripts/explanation-tab-action-menu.test.mjs`

Expected: PASS.

### Task 4: Verify behavior and layout

**Files:**
- Verify: `src/panels/ExplanationCard.tsx`
- Verify: `src/styles/components.css`

- [ ] **Step 1: Run explanation-card regression tests**

Run: `node --test scripts/explanation-card-binding.test.mjs scripts/explanation-tab-action-menu.test.mjs scripts/explanation-legacy-tabs.test.mjs scripts/explanation-default-tabs.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite exits with code 0.

- [ ] **Step 4: Verify visually**

Start Vite, open the explanation card, and inspect normal and narrow right-panel widths. Confirm active triggers remain visible, inactive triggers appear on hover/focus, menus stay within the panel, labels do not collide, and add/rename/delete flows still open the existing forms or mutations.

