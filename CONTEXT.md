# Knowledge-OS Domain Context

> Governed by [docs/CONSTITUTION.md](docs/CONSTITUTION.md) — the constitution supersedes any conflicting statement below (invariants 6/7 were rewritten by Constitution Principle 1 in v1.0).

## Core Language

- **Knowledge node** — a stable, independently addressable semantic object or assertion target. It is not a document heading and it is not a source record.
- **Semantic relation** — a typed, directed relation directly supported by source content: structure, classification, dependency, causality, state transition, constraint, evidence, or reference.
- **Source span** — the original line range that grounds a node or relation.
- **Navigation projection** — a tree or index generated from semantic relations for browsing. It is not the canonical knowledge structure.
- **Internal structure** — the dimensions/sections/atom-bindings carried on the node itself (`viewDimensions`); the preferred home for a concept's multi-facet decomposition.

## Import Principle

Knowledge-OS treats Markdown as a lossless transport format, not as the knowledge model. Headings, paragraphs, lists, tables, code blocks, and citations are evidence used by the importers. An import may produce multiple roots and multiple projections. A source document never becomes a mandatory knowledge node.

## Invariants

1. A node is created only when the content is independently addressable without losing meaning.
2. A relation is persisted only when its direction and meaning are directly grounded in source spans.
3. Navigation parentage is derived from structure or classification relations; causality and dependency remain graph relations.
4. Every imported node and relation remains traceable to source spans.
5. A semantic import may produce a forest. Disconnected roots are valid.
6. **(Constitution P1)** Physical deletion is the terminal step of metabolism, never a daily operation, and requires the triple gate: zero live references (questions / evolution events / viewDimensions / tree / edges / cross-links and aliases), content already migrated or never present, and an isolated rollback backup with an independent, self-explaining commit. Default discipline stays "do not delete".
7. **(Constitution P1)** Deduplication means content fusion: fold the substance of the retired node into the kept card, unmount the duplicate from the tree, and mark it `archived-redirect`. The retired shell may then exit the pool only through the triple gate of invariant 6.
8. Question `relatedNodeId` must resolve to a node that exists in the pool and is mounted on the tree, so tree-linked navigation and card jumps always land. Answer steps are live references (`answerSteps` with stable structure locators); the composed answer text is a regenerable snapshot, and the regeneration path must stay functional.
