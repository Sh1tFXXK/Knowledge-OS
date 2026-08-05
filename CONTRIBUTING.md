# Development Workflow

This repository uses a trunk-based workflow with one long-lived branch.

## Branches

- `main` is the only long-lived branch and must remain buildable.
- Create short-lived branches from the latest `main` using `codex/<topic>`.
- Keep each branch focused on one coherent change.
- Do not use personal, tool-generated, backup, or environment names as permanent branches.

## Change Flow

1. Update `main` and create a focused branch.
2. Implement and test the change locally.
3. Run `npm test` and `npm run build` before merging.
4. Rebase on the latest `main` when the branch has diverged.
5. Merge through a reviewed pull request, preferring squash or fast-forward history.
6. Delete the local and remote branch after it is merged.

Work in progress, recovery snapshots, generated artifacts, and failing changes must not be merged into `main`. Use a stash or a local backup bundle for temporary recovery state instead of permanent backup branches.

## Releases

Use annotated tags for releases. Do not create long-lived release branches unless the release process genuinely requires parallel maintenance.
