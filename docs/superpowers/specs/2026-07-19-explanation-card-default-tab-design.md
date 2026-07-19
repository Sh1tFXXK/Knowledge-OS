# Explanation Card Default Tab Design

## Goal

Stop imposing the legacy four-tab explanation structure on newly created knowledge nodes.

## Behavior

- A new knowledge node starts with one explanation tab: `定义` (`id: def`).
- New nodes no longer receive the default `机制`, `边界`, or `来源` tabs.
- Users may continue to add, rename, and remove non-definition tabs manually.
- The default `定义` tab remains protected from deletion.

## Existing Data

Existing knowledge nodes are not migrated. Their current tabs and content remain unchanged, including existing `机制`, `边界`, and `来源` tabs.

## Ownership

The default is created only by `createEmptyExplanation`. The explanation-card view renders the tabs stored on each node and does not synthesize missing legacy tabs.

## Verification

- A focused test must assert that `createEmptyExplanation` returns exactly one `定义` tab.
- Existing explanation-card tab editing checks must continue to pass.
- The TypeScript build must pass.
