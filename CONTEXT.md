# Knowledge-OS Domain Context

## Core Language

- **Knowledge node** — a stable, independently addressable semantic object or assertion target. It is not a document heading and it is not a source record.
- **Semantic relation** — a typed, directed relation directly supported by source content: structure, classification, dependency, causality, state transition, constraint, evidence, or reference.
- **Source span** — the original line range that grounds a node or relation.
- **Navigation projection** — a tree or index generated from semantic relations for browsing. It is not the canonical knowledge structure.
- **Semantic draft** — the validated intermediate representation produced before node, edge, question, and view projections are written.

## Import Principle

Knowledge-OS treats Markdown as a lossless transport format, not as the knowledge model. Headings, paragraphs, lists, tables, code blocks, and citations are evidence used by a semantic compiler. The compiler may produce multiple roots and multiple projections. A source document never becomes a mandatory knowledge node.

## Invariants

1. A node is created only when the content is independently addressable without losing meaning.
2. A relation is persisted only when its direction and meaning are directly grounded in source spans.
3. Navigation parentage is derived from structure or classification relations; causality and dependency remain graph relations.
4. Every imported node and relation remains traceable to source spans.
5. A semantic import may produce a forest. Disconnected roots are valid.
