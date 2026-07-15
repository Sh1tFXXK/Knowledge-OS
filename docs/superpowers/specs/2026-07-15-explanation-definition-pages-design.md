# Explanation Definition Pages

## Goal

Allow each concept explanation card to store multiple user-named definitions, such as a shared definition, a Java definition, or a textbook definition, without mixing those pages with directory-path supplements.

## Design

The existing `KnowledgeNode.card.tabs` remains the single source of truth. Each definition page is an `ExplanationTab` with its own stable id, label, and content. The first existing tab remains the default definition page. The explanation card renders these tabs and provides a compact `+ page` action for adding a named empty page.

Page creation and deletion go through explicit store actions so the component does not assemble or persist the whole card. `addKnowledgeTab` creates a unique tab id, appends the tab, persists the node, and returns the new id. `removeKnowledgeTab` removes a non-final tab and selects a remaining page in the view. Existing `updateKnowledgeTab` continues to own content edits.

Directory supplements remain separate. They continue to appear as path-specific tabs when a directory reference is active, but they are not included in the user-managed definition-page add/remove flow.

## Interaction

- Click `+ page`, enter a non-empty page name, and confirm with Enter or the add button.
- The new page is selected immediately and opens empty in edit mode.
- A definition page can be removed through its close control, except the last remaining definition page.
- The current page content is saved through the existing update path.
- No page is inferred from a folder name, context label, or supertag.

## Verification

The feature is verified by source binding tests for the public controls and store actions, TypeScript production build, and a browser reload to confirm the explanation card remains renderable when no explanation is selected.
