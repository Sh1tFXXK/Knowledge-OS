# Explanation Card UI Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crowded horizontal explanation-card controls with a vertical main-page rail while keeping supertags and definition pages visible and removing the redundant role badge from the card header.

**Architecture:** `ExplanationCard` continues to own selection and edit state, and the Zustand store remains the only mutation path. A new view-only body wrapper lays out the existing typed `allTabs` navigation beside the existing content; CSS gives main pages, supertags, and definition pages distinct visual treatments without changing persisted data.

**Tech Stack:** React 19, TypeScript, Zustand, vanilla CSS, Node test runner, Vite

---

## File Map

- Modify `scripts/explanation-card-binding.test.mjs`: lock the semantic markup, role-badge removal, vertical rail, subordinate delete controls, and narrow-column overflow rules.
- Modify `src/panels/ExplanationCard.tsx`: remove only the header role rendering, add the two-column body wrapper, make the main pages semantic navigation, and expose active-page state.
- Modify `src/panels/explanation/SupertagPanel.tsx`: add explicit names and tooltips to the icon-only remove and save controls.
- Modify `src/styles/components.css`: implement the vertical rail, restyle the three navigation levels, move the edit toggle out of inline styles, and make narrow content grids shrink safely.
- Do not modify `src/store/useGraph.ts`, `src/types.ts`, or any file under `data/`.

### Task 1: Lock and implement the semantic card structure

**Files:**
- Modify: `scripts/explanation-card-binding.test.mjs:20-55`
- Modify: `src/panels/ExplanationCard.tsx:311-500`
- Modify: `src/panels/explanation/SupertagPanel.tsx:70-120`

- [ ] **Step 1: Add failing markup assertions**

Add these assertions beside the existing explanation-card source checks:

```js
assert.match(source, /className="explanation-card-body"/);
assert.match(source, /<nav className="card-tabs" aria-label="解释页">/);
assert.match(source, /aria-current=\{tabId === activeTab \? 'page' : undefined\}/);
assert.match(source, /aria-current=\{page\.id === activeDefinitionPage\?\.id \? 'page' : undefined\}/);
assert.match(source, /className=\{`btn btn-sm explanation-edit-toggle\$\{isEditing \? ' is-active' : ''\}`\}/);
assert.match(source, /title="添加页面"/);
assert.match(source, /title="添加定义页"/);
assert.doesNotMatch(source, /role-badge role-/);
assert.doesNotMatch(source, /nodeMeta\?\.role/);
assert.match(supertagSource, /title=\{`移除 supertag: \$\{tag\}`\}/);
assert.match(supertagSource, /aria-label="保存 supertag"/);
assert.match(supertagSource, /title="保存 supertag"/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
node --test scripts/explanation-card-binding.test.mjs
```

Expected: FAIL on the first new assertion because `explanation-card-body` does not exist yet.

- [ ] **Step 3: Remove the role badge and convert the edit button to a class-owned style**

Replace the current header body with this structure. Keep `activeContextLabel`, `activeContextTitle`, and the existing click behavior:

```tsx
<div className="explanation-card-header explanation-card-header--compact">
  <div className="ec-meta-view">
    <div className="ec-title-row">
      {activeContextLabel && (
        <span className="context-env-chip" title={activeContextTitle}>
          {activeContextLabel}
        </span>
      )}
    </div>
  </div>
  <button
    type="button"
    className={`btn btn-sm explanation-edit-toggle${isEditing ? ' is-active' : ''}`}
    onClick={() => setIsEditing(!isEditing)}
  >
    <span>{isEditing ? '预览' : '编辑'}</span>
  </button>
</div>
```

Do not mutate or clear `nodeMeta.role`; this removes only the explanation-card rendering.

- [ ] **Step 4: Add the semantic body wrapper and active-page attributes**

Immediately after the header, wrap the current navigation and `card-content` as shown by this exact structural diff:

```diff
-        <div className="card-tabs">
+        <div className="explanation-card-body">
+          <nav className="card-tabs" aria-label="解释页">
           {allTabs.map((tab) => {
             const tabId = tab.id || tab.label;
             const isTopLevelTab = explanation.tabs.some((item) => item.id === tab.id);
             const canRemove =
               isTopLevelTab && tabId !== definitionTab?.id && explanation.tabs.length > 1;
             return (
               <div key={tabId} className="card-tab-item">
                 <button
                   type="button"
                   className={`card-tab${tabId === activeTab ? ' active' : ''}`}
+                  aria-current={tabId === activeTab ? 'page' : undefined}
+                  title={tab.label}
                   onClick={() => {
                     setActiveTab(tabId);
                     if (tabId === definitionTab?.id && definitionPages[0]) {
                       setActiveDefinitionPageId(definitionPages[0].id);
                     }
                     setIsEditing(false);
                   }}
                 >
                   {tab.label}
                 </button>
```

Keep the current `canRemove` block and add-page form/button in the same order, then change the navigation closing tag and leave the current content block directly after it:

```diff
-        </div>
+          </nav>

-        <div className="card-content" id="card-content-body">
+          <div className="card-content" id="card-content-body">
```

After the current `card-content` closing tag, add one wrapper closing tag before the existing `explanation-card` closing tag:

```diff
           </div>
+        </div>
       </div>
```

On each definition-page button, add the active-page attribute and full label without changing its click handler:

```tsx
<button
  type="button"
  className={`definition-page-tab${page.id === activeDefinitionPage?.id ? ' active' : ''}`}
  aria-current={page.id === activeDefinitionPage?.id ? 'page' : undefined}
  title={page.label}
  onClick={() => {
    setActiveDefinitionPageId(page.id);
    setIsEditing(false);
  }}
>
  {page.label}
</button>
```

Add `title="添加页面"` to the main-page confirmation button and `title="添加定义页"` to the definition-page confirmation button. In `SupertagPanel`, keep the current handlers and add the missing tooltip/name attributes:

```tsx
<button
  type="button"
  className="supertag-remove"
  aria-label={`移除 supertag: ${tag}`}
  title={`移除 supertag: ${tag}`}
  onClick={() => handleRemoveSupertag(tag)}
>
  ×
</button>
```

```tsx
<button
  type="button"
  className="supertag-save"
  aria-label="保存 supertag"
  title="保存 supertag"
  onClick={handleAddSupertag}
>
  ✓
</button>
```

- [ ] **Step 5: Run the focused test and production build**

Run:

```powershell
node --test scripts/explanation-card-binding.test.mjs
npm run build
```

Expected: the binding test passes and Vite completes without TypeScript or JSX errors.

- [ ] **Step 6: Commit only when the overlapping files contain no unrelated user edits**

Inspect first:

```powershell
git diff -- scripts/explanation-card-binding.test.mjs src/panels/ExplanationCard.tsx src/panels/explanation/SupertagPanel.tsx
```

If the diff is fully in scope, commit it:

```powershell
git add -- scripts/explanation-card-binding.test.mjs src/panels/ExplanationCard.tsx src/panels/explanation/SupertagPanel.tsx
git commit -m "refactor: structure explanation card navigation"
```

If either file contains unrelated pre-existing changes, do not commit or discard them; leave the implementation unstaged and report that condition.

### Task 2: Implement the visual hierarchy and narrow-panel behavior

**Files:**
- Modify: `scripts/explanation-card-binding.test.mjs:95-115`
- Modify: `src/styles/components.css:126-710`

- [ ] **Step 1: Add failing CSS contract assertions**

Add these assertions beside the existing `componentsCss` checks:

```js
assert.match(componentsCss, /\.explanation-card-body\s*\{[\s\S]*grid-template-columns:\s*clamp\(64px,\s*22%,\s*78px\)\s+minmax\(0,\s*1fr\)/);
assert.match(componentsCss, /\.card-tabs\s*\{[\s\S]*flex-direction:\s*column/);
assert.match(componentsCss, /\.card-tab\.active\s*\{[\s\S]*border-left-color:\s*var\(--accent-purple\)/);
assert.match(componentsCss, /\.card-tab\s*\{[\s\S]*-webkit-line-clamp:\s*2/);
assert.match(componentsCss, /\.card-tab-close\s*\{[\s\S]*opacity:\s*0/);
assert.match(componentsCss, /\.card-tab-item:hover \.card-tab-close/);
assert.match(componentsCss, /\.supertag-wrap:hover \.supertag-remove/);
assert.match(componentsCss, /\.definition-page-item:hover \.definition-page-close/);
assert.match(componentsCss, /\.card-content\s*\{[\s\S]*min-width:\s*0/);
assert.doesNotMatch(componentsCss, /\.context-env-chip::after/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
node --test scripts/explanation-card-binding.test.mjs
```

Expected: FAIL because `.explanation-card-body` and the vertical rail rules are not present.

- [ ] **Step 3: Add the body grid, compact header control, and independent metadata styles**

Add or replace the relevant rules with the following:

```css
.explanation-card-body {
  display: grid;
  grid-template-columns: clamp(64px, 22%, 78px) minmax(0, 1fr);
  flex: 1;
  min-height: 0;
}

.explanation-edit-toggle {
  flex: 0 0 auto;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 4px;
  border-color: var(--border-secondary);
  background: rgba(255, 255, 255, 0.025);
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}

.explanation-edit-toggle:hover,
.explanation-edit-toggle.is-active {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.1);
  color: var(--text-primary);
}

.context-env-chip {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1;
}

.concept-supertag {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
  padding: 4px 8px;
  border: 1px solid rgba(6, 182, 212, 0.4);
  border-radius: 999px;
  background: rgba(6, 182, 212, 0.1);
  color: var(--accent-cyan);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
```

Delete the shared `.context-env-chip, .concept-supertag` rule and delete `.context-env-chip::after`; without a following role badge, the slash would be a dangling separator.

- [ ] **Step 4: Replace the horizontal tab block with the vertical rail**

Replace the current rules from `/* Tabs */` through `.card-tab.active` with:

```css
/* Main explanation page rail */
.card-tabs {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border-right: 1px solid var(--border-secondary);
  background: rgba(255, 255, 255, 0.015);
  scrollbar-width: thin;
}

.card-tab-item {
  position: relative;
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  min-width: 0;
}

.card-tab {
  width: 100%;
  min-height: 38px;
  padding: 8px 18px 8px 9px;
  border: 0;
  border-left: 2px solid transparent;
  background: transparent;
  color: var(--text-tertiary);
  font-family: var(--font-sans);
  font-size: 10px;
  line-height: 1.3;
  text-align: left;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.card-tab:hover {
  background: rgba(255, 255, 255, 0.035);
  color: var(--text-secondary);
}

.card-tab.active {
  border-left-color: var(--accent-purple);
  background: rgba(139, 92, 246, 0.1);
  color: var(--text-primary);
  font-weight: 600;
}

.card-tab-close {
  position: absolute;
  top: 50%;
  right: 2px;
  width: 18px;
  height: 22px;
  padding: 0;
  transform: translateY(-50%);
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: opacity var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.card-tab-item:hover .card-tab-close,
.card-tab-item:focus-within .card-tab-close,
.card-tab-close:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.card-tab-close:hover {
  background: rgba(239, 68, 68, 0.12);
  color: var(--accent-red);
}

.card-tab-add {
  align-self: stretch;
  min-height: 30px;
  margin: 8px 6px;
  padding: 5px 4px;
  border: 1px dashed var(--border-secondary);
  border-radius: 4px;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 10px;
  white-space: normal;
  cursor: pointer;
}

.card-tab-add:hover {
  border-color: rgba(139, 92, 246, 0.5);
  color: var(--text-primary);
}

.card-tab-add-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px;
  margin: 7px 5px;
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 4px;
  overflow: hidden;
}

.card-tab-add-input {
  width: 100%;
  min-width: 0;
  padding: 5px;
  border: 0;
  outline: 0;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  font-size: 10px;
}

.card-tab-add-confirm {
  width: 20px;
  border: 0;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}
```

- [ ] **Step 5: Make supertag and definition delete controls subordinate**

Extend the current rules with:

```css
.supertag-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-secondary);
}

.supertag-remove,
.definition-page-close {
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.supertag-wrap:hover .supertag-remove,
.supertag-wrap:focus-within .supertag-remove,
.supertag-remove:focus-visible,
.definition-page-item:hover .definition-page-close,
.definition-page-item:focus-within .definition-page-close,
.definition-page-close:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.definition-pages {
  margin: 0 0 14px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--border-secondary);
}

.definition-pages-head,
.supertag-panel-head,
.domain-lens-head,
.domain-lens-detail-head {
  flex-wrap: wrap;
}

.definition-page-item {
  position: relative;
}

.definition-page-tab {
  padding-right: 20px;
}

.definition-page-close {
  position: absolute;
  top: 50%;
  right: 2px;
  margin: 0;
  transform: translateY(-50%);
}

.supertag-compare-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 148px), 1fr));
}

.domain-lens-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 152px), 1fr));
}

.card-content {
  min-width: 0;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-secondary);
}
```

Keep the existing hover, active, input, and panel-detail rules that are not replaced above.

- [ ] **Step 6: Run focused tests and build**

Run:

```powershell
node --test scripts/explanation-card-binding.test.mjs scripts/right-panel-resize.test.mjs
npm run build
```

Expected: both focused test files pass and Vite builds successfully.

- [ ] **Step 7: Commit only when the CSS/test files contain no unrelated user edits**

Inspect first:

```powershell
git diff -- scripts/explanation-card-binding.test.mjs src/styles/components.css
```

If the diff is fully in scope, commit it:

```powershell
git add -- scripts/explanation-card-binding.test.mjs src/styles/components.css
git commit -m "style: clarify explanation card hierarchy"
```

If the files include unrelated pre-existing work, leave the implementation unstaged and preserve those edits.

### Task 3: Verify interaction, responsive behavior, and regressions

**Files:**
- Verify: `src/panels/ExplanationCard.tsx`
- Verify: `src/styles/components.css`
- Verify: `scripts/explanation-card-binding.test.mjs`
- Verify: `src/panels/explanation/SupertagPanel.tsx`

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm test
```

Expected: all explanation-card and resize tests pass. If the pre-existing MySQL taxonomy assertion still fails, confirm its output is unchanged from the baseline and report it separately; do not modify taxonomy data as part of this UI task.

- [ ] **Step 2: Verify the default 360px right panel in the browser**

Open `http://localhost:5173`, select the existing `字节码` concept, and verify:

- The explanation header shows the environment but no role badge.
- Definition, Mechanism, Boundary, Source, and path pages appear in the left rail.
- Clicking each main page updates the content and exposes `aria-current="page"` only on the active control.
- Supertags remain above the page content and wrap independently from definition pages.
- Definition pages remain visible and switch content without changing the main page selection.
- Delete controls remain quiet until hover or keyboard focus.

- [ ] **Step 3: Verify the minimum 280px right panel**

Drag the existing right-panel resize handle to its minimum width and verify:

- The rail stays between 64px and 78px wide.
- No control text overlaps the content column.
- The card has no horizontal scrollbar.
- Long path labels wrap inside the rail and expose the full label through `title`.
- Supertag comparison items and domain-lens cards collapse to one column instead of overflowing.

- [ ] **Step 4: Exercise non-destructive interaction states**

Without saving new data, open and cancel the main-page add form, definition-page add form, and supertag add form with Escape. Toggle edit/preview, activate a supertag, and switch back to the Definition page.

Expected: forms stay inside their owning column, selection remains coherent, and no layout shift causes the rail or content to overlap.

- [ ] **Step 5: Check console errors and reload persistence**

Reload the page, reselect the concept, and inspect browser console errors.

Expected: zero new console errors; existing explanation content, mechanism page, role metadata, supertags, and definition pages remain unchanged.

- [ ] **Step 6: Review the final diff**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors. Only the four scoped implementation files should contain new task changes; unrelated dirty files remain untouched.
