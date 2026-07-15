# Explanation Card UI Hierarchy

## Goal

Make the right-side explanation card readable when main pages, definition pages, and supertags are all present and frequently used. All three navigation layers remain visible, but each receives a distinct visual role so they no longer look like one crowded row of interchangeable tags.

## Scope

This is a presentation and interaction-layout change. It does not add a state domain, change explanation data, rename tabs, remove mechanism content, or alter persistence.

The change is limited to the explanation card and its existing focused child panels:

- The main explanation pages move from a horizontal tab strip to a narrow vertical navigation rail.
- Supertags remain content anchors at the top of the active page.
- Definition pages remain a horizontal secondary navigation inside the definition page.
- The explanation-card header stops rendering the node role badge. The observed `mechanism` badge disappears, while the role value remains stored and continues to be visible in role-oriented views such as the node library.

## Information Hierarchy

The card uses four visually distinct levels:

1. The compact header contains the current environment path and the edit/preview action.
2. The vertical rail contains main pages such as Definition, Mechanism, Boundary, Source, and path supplements.
3. The content header contains supertags as semantic anchors.
4. The Definition page contains its own compact definition-page selector.

The main rail is navigation, definition pages are secondary navigation, and supertags are content metadata. They must not share the same border, radius, color, and selected-state treatment.

## Layout

`ExplanationCard` keeps its existing state ownership and store calls. The card itself becomes a two-column CSS grid below the full-width header:

- The navigation rail uses a stable narrow track sized for the longest built-in page label.
- The active page content uses `minmax(0, 1fr)` so text, forms, and grids can shrink without overflowing the right panel.
- The rail stretches with the card and uses a quiet surface separated by a single right border.
- Main page labels stack vertically. Active state uses a restrained background and a left indicator.
- Long dynamic labels, especially path supplements, are limited to two wrapped lines. The full label remains available through the control's accessible name and tooltip.
- Add-page remains at the bottom of the rail.
- Delete controls appear on hover and keyboard focus, while their accessible names remain available to assistive technology.

At narrow right-panel widths, the rail becomes slightly narrower but does not switch back to horizontal tabs. Labels remain readable and do not overlap the content. The content column owns wrapping for supertags and definition pages.

## Component Behavior

The current `activeTab`, `activeDefinitionPageId`, and edit state remain view-owned by `ExplanationCard`. Existing store actions remain the only mutation path.

The rail renders the existing typed `allTabs` collection. Selecting a rail item follows the current selection behavior, including resetting definition-page selection when the Definition page is opened. Path supplements continue to use the same selection and update logic.

`SupertagPanel` keeps its current add, remove, compare, and summarize behavior. Its strip wraps inside the content column. Remove controls become visually subordinate and are emphasized only on hover or focus.

Definition pages keep their current add, select, edit, preview, and delete behavior. The selector is presented as a compact segmented row under the supertag strip. It may wrap, but each page label stays intact.

## Data Integrity

No stored role, tab, definition page, tag, or path supplement is deleted or migrated. Hiding the role badge affects only explanation-card rendering.

The main Mechanism page remains available in the vertical rail. Existing node role metadata remains unchanged.

## Accessibility

- Navigation containers use semantic navigation labels.
- Active main and definition pages expose `aria-current="page"`.
- Icon-only add and delete controls retain explicit accessible names and tooltips.
- Hover-only visual affordances are also revealed by `:focus-visible`.
- Text and active indicators maintain the existing dark-theme contrast level.

## Verification

Verification covers:

- Existing explanation-card binding tests updated for the vertical rail and removed role-badge rendering.
- Production TypeScript/Vite build.
- Browser checks at the current desktop viewport and a narrow right-panel width.
- Main-page switching, definition-page switching, supertag activation, add forms, edit/preview mode, and path supplement selection.
- Visual checks for wrapping, clipping, overlap, and horizontal overflow.
- Console error inspection after interaction and reload.
