# ADR-0001: Semantic Import Is Graph-First

## Status

Accepted — 2026-08-10

## Context

The original document importer promoted Markdown headings into a single article root and a hierarchy of chapter nodes. That preserves an outline, but it confuses presentation structure with knowledge structure. It cannot represent independent roots, cross-cutting dependencies, causal chains, or state transitions without inventing parent-child relationships.

## Decision

External sources are normalized to Markdown, then compiled into a semantic draft before persistence. The semantic draft contains independently addressable nodes, directly grounded typed relations, and source spans. A source record is provenance only and is never required to be a knowledge node. Navigation trees are projections derived primarily from structure and classification relations; a semantic import may produce a forest.

The compiler has two adapters:

- A semantic adapter, currently an OpenAI-compatible analyzer, for arbitrary prose and Markdown.
- A literal outline adapter retained as a lossless fallback when no semantic analyzer is configured. It must be reported as outline mode, not represented as semantic inference.

## Consequences

- Ordinary documents can create multiple roots and cross-root relations.
- `knowledge-edges.json` becomes part of ordinary document import, not only specialized importers.
- Source line ranges become part of node and relation provenance.
- Markdown headings remain useful input evidence but no longer have authority over node identity.
- Identity consolidation across unrelated imports remains a separate seam; an importer must not merge nodes solely because labels look similar.
