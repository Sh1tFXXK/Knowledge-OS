# Development Workflow

This repository uses a lightweight Git Flow with two long-lived branches.

## Long-Lived Branches

- `main` contains releasable code and is the source for release tags.
- `develop` is the integration branch for the next release and the default base for daily work.

Both branches must remain buildable. Direct feature development on `main` is not allowed.

## Short-Lived Branches

- `feature/<topic>` starts from `develop` for new behavior.
- `fix/<topic>` starts from `develop` for non-production defects.
- `release/<version>` starts from `develop` only when a release needs stabilization.
- `hotfix/<topic>` starts from `main` for urgent production corrections.

Delete short-lived local and remote branches after they are merged. Do not keep personal, tool-generated, backup, or environment branches.

## Change Flow

1. Update `develop` and create one focused short-lived branch.
2. Implement the change without mixing unrelated work.
3. Run `npm test` and `npm run build`.
4. Rebase on the latest target branch before review.
5. Merge `feature/*` and `fix/*` into `develop`, preferring squash history.
6. Merge a prepared release into `main`, tag it, and synchronize the result back to `develop`.
7. Merge a hotfix into both `main` and `develop`.

Work in progress, recovery snapshots, generated artifacts, and failing changes must not be merged into `main`. Use a stash or a local Git bundle for temporary recovery state instead of permanent backup branches.
