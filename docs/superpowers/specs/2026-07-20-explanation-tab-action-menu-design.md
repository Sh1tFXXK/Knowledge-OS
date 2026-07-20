# Explanation Tab Action Menu Design

## Goal

Remove the control crowding in the explanation-card tab matrix without changing explanation data, recursive tab/page ownership, persistence, or existing mutations.

## Scope

- Replace the separate rename, add-child, and delete controls on vertical tabs with one `More` trigger.
- Replace the separate add-child and delete controls on horizontal definition pages with one `More` trigger.
- Keep the existing standalone `+ Page` controls that add a new top-level tab or page.
- Keep all current rename, add-child, delete, selection, confirmation, and edit behavior.
- Do not add dependencies or change store APIs.

## Interaction

Each user-managed tab or page owns a compact overflow menu. The active item always shows its `More` trigger. Inactive items reveal the trigger on hover or keyboard focus. Opening a trigger shows only actions valid for that item:

- `Add child` is always available for real tabs and pages.
- `Rename` follows the current rules: top-level tabs and all pages may be renamed.
- `Delete` follows the current rules: the definition tab cannot be deleted, the last top-level tab/page cannot be deleted, and child items can be deleted.

Only one menu may be open at a time. Selecting an action closes the menu before starting the existing form or mutation. Clicking outside the menu or pressing Escape closes it without changing data.

## Presentation

The trigger is a stable 24 by 24 pixel icon button placed at the trailing edge of the item. Tab and page labels reserve space for one control only, so long labels retain substantially more readable width. The menu is a compact, dark surface aligned to the trigger. Destructive delete uses the existing red accent and is visually separated from constructive actions.

The menu uses text labels with small familiar symbols because its actions are not all safe to infer from icons alone. The trigger and actions expose accessible names and keyboard focus styles.

## State Ownership

`ExplanationCard` continues to own all view state. It adds one typed local menu target describing whether a tab or page menu is open and the selected item id. Store actions remain the only mutation path. No render-visible state is mutated outside React state transitions.

## Testing

- Add a source-binding regression test that requires the shared overflow menu and trigger markup.
- Assert the old independent tab/page action buttons are no longer rendered.
- Assert the menu contains add-child, rename, and conditional delete actions.
- Run the full script test suite and the production build.
- Verify the explanation card visually at normal and narrow right-panel widths, including keyboard focus and menu placement.

