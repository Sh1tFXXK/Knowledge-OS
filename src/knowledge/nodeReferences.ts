import type { KnowledgeNode } from '../types';

export interface KnowledgeReference {
  nodeId: string;
  /** Text used for matching, including aliases derived from a bilingual title. */
  label: string;
  /** Canonical knowledge-node title shown in the link tooltip. */
  nodeLabel: string;
  /** Protected titles consume their full span without becoming clickable. */
  protected: boolean;
}

export const KnowledgeReferencePartKind = {
  Text: 0,
  Reference: 1,
} as const;

export interface KnowledgeReferenceTextPart {
  kind: typeof KnowledgeReferencePartKind.Text;
  text: string;
}

export interface KnowledgeReferenceNodePart {
  kind: typeof KnowledgeReferencePartKind.Reference;
  text: string;
  reference: KnowledgeReference;
}

export type KnowledgeReferencePart =
  | KnowledgeReferenceTextPart
  | KnowledgeReferenceNodePart;

function isAsciiWordCharacter(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z0-9_]/.test(value);
}

function containsHanCharacter(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function isHanCharacter(value: string | undefined): boolean {
  return value !== undefined && /[\u3400-\u9fff]/.test(value);
}

function isCompoundJoiner(value: string): boolean {
  return /^[级式型类层端侧间内外前后上下中性化态域]+$/.test(value);
}

function collectWordBoundaries(text: string): ReadonlySet<number> {
  const boundaries = new Set<number>([0, text.length]);
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  for (const segment of segmenter.segment(text)) {
    boundaries.add(segment.index);
    boundaries.add(segment.index + segment.segment.length);
  }
  return boundaries;
}

function hasValidBoundaries(
  text: string,
  start: number,
  label: string,
  wordBoundaries: ReadonlySet<number>,
): boolean {
  const first = label[0];
  const last = label[label.length - 1];
  const before = start > 0 ? text[start - 1] : undefined;
  const after = text[start + label.length];

  if (isAsciiWordCharacter(first) && isAsciiWordCharacter(before)) return false;
  if (isAsciiWordCharacter(last) && isAsciiWordCharacter(after)) return false;
  if (
    Array.from(label).length === 1
    && containsHanCharacter(label)
    && (isHanCharacter(before) || isHanCharacter(after))
  ) {
    return false;
  }
  if (
    containsHanCharacter(label)
    && (!wordBoundaries.has(start) || !wordBoundaries.has(start + label.length))
  ) {
    return false;
  }
  return true;
}

function knowledgeReferenceTerms(label: string): string[] {
  const terms = new Set<string>();
  const addTerm = (value: string) => {
    const term = value.trim();
    if (term) terms.add(term);
  };

  addTerm(label);
  for (const part of label.split(/\s+\/\s+|\s*[|｜]\s*/)) {
    addTerm(part);
    const parenthetical = part.match(/^(.+?)\s*[（(]([^）)]+)[）)]$/);
    if (parenthetical) {
      addTerm(parenthetical[1]);
      addTerm(parenthetical[2]);
    }
  }

  return Array.from(terms).sort((left, right) =>
    right.length - left.length || left.localeCompare(right, 'zh-CN'),
  );
}

export function collectKnowledgeReferences(
  nodePool: Record<string, KnowledgeNode>,
  excludedNodeIds: ReadonlySet<string> = new Set<string>(),
): KnowledgeReference[] {
  const referencesByLabel = new Map<string, KnowledgeReference>();

  const nodes = Object.values(nodePool).sort((left, right) =>
    left.label.localeCompare(right.label, 'zh-CN') || left.id.localeCompare(right.id),
  );
  for (const node of nodes) {
    const protectedTitle = excludedNodeIds.has(node.id);
    for (const label of knowledgeReferenceTerms(node.label)) {
      const normalizedLabel = label.toLocaleLowerCase();
      const reference: KnowledgeReference = {
        nodeId: node.id,
        label,
        nodeLabel: node.label,
        protected: protectedTitle,
      };
      const existing = referencesByLabel.get(normalizedLabel);
      const referenceIsCanonical = label === node.label;
      const existingIsCanonical = existing?.label === existing?.nodeLabel;
      if (
        !existing
        || (protectedTitle && !existing.protected)
        || (protectedTitle === existing.protected && referenceIsCanonical && !existingIsCanonical)
      ) {
        referencesByLabel.set(normalizedLabel, reference);
      }
    }
  }

  return Array.from(referencesByLabel.values()).sort((left, right) =>
    right.label.length - left.label.length
    || left.label.localeCompare(right.label, 'zh-CN')
    || left.nodeId.localeCompare(right.nodeId),
  );
}

export function splitKnowledgeReferences(
  text: string,
  references: readonly KnowledgeReference[],
): KnowledgeReferencePart[] {
  if (!text || references.length === 0) {
    return text ? [{ kind: KnowledgeReferencePartKind.Text, text }] : [];
  }

  const normalizedText = text.toLocaleLowerCase();
  const wordBoundaries = collectWordBoundaries(text);
  const referencesByFirstCharacter = new Map<string, KnowledgeReference[]>();
  for (const reference of references) {
    const firstCharacter = reference.label[0]?.toLocaleLowerCase();
    if (!firstCharacter) continue;
    referencesByFirstCharacter.set(firstCharacter, [
      ...(referencesByFirstCharacter.get(firstCharacter) ?? []),
      reference,
    ]);
  }
  const parts: KnowledgeReferencePart[] = [];
  let textStart = 0;
  let cursor = 0;

  while (cursor < text.length) {
    const candidates = referencesByFirstCharacter.get(normalizedText[cursor]) ?? [];
    const reference = candidates.find(({ label }) => {
      const normalizedLabel = label.toLocaleLowerCase();
      return normalizedText.startsWith(normalizedLabel, cursor)
        && hasValidBoundaries(text, cursor, label, wordBoundaries);
    });

    if (!reference) {
      cursor += 1;
      continue;
    }

    if (cursor > textStart) {
      parts.push({
        kind: KnowledgeReferencePartKind.Text,
        text: text.slice(textStart, cursor),
      });
    }

    const end = cursor + reference.label.length;
    if (reference.protected) {
      parts.push({
        kind: KnowledgeReferencePartKind.Text,
        text: text.slice(cursor, end),
      });
    } else {
      parts.push({
        kind: KnowledgeReferencePartKind.Reference,
        text: text.slice(cursor, end),
        reference,
      });
    }
    cursor = end;
    textStart = end;
  }

  if (textStart < text.length) {
    parts.push({ kind: KnowledgeReferencePartKind.Text, text: text.slice(textStart) });
  }

  const wholeParts: KnowledgeReferencePart[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.kind !== KnowledgeReferencePartKind.Reference) {
      wholeParts.push(part);
      continue;
    }

    let endIndex = index + 1;
    let combinedText = part.text;
    let referenceCount = 1;
    while (endIndex < parts.length) {
      const nextPart = parts[endIndex];
      if (nextPart.kind === KnowledgeReferencePartKind.Reference) {
        combinedText += nextPart.text;
        referenceCount += 1;
        endIndex += 1;
        continue;
      }
      const followingPart = parts[endIndex + 1];
      if (
        followingPart?.kind === KnowledgeReferencePartKind.Reference
        && isCompoundJoiner(nextPart.text)
      ) {
        combinedText += nextPart.text + followingPart.text;
        referenceCount += 1;
        endIndex += 2;
        continue;
      }
      break;
    }

    if (referenceCount > 1) {
      wholeParts.push({ kind: KnowledgeReferencePartKind.Text, text: combinedText });
      index = endIndex - 1;
      continue;
    }

    wholeParts.push(part);
  }

  return wholeParts;
}
