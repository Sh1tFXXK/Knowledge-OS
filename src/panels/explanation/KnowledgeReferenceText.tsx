import {
  KnowledgeReferencePartKind,
  splitKnowledgeReferences,
  type KnowledgeReference,
} from '../../knowledge/nodeReferences';

export default function KnowledgeReferenceText({
  text,
  references,
  onOpenReference,
}: {
  text: string;
  references: readonly KnowledgeReference[];
  onOpenReference?: (nodeId: string) => void;
}) {
  return (
    <>
      {splitKnowledgeReferences(text, references).map((part, index) => {
        if (part.kind === KnowledgeReferencePartKind.Text) {
          return <span key={`text-${index}`}>{part.text}</span>;
        }

        if (!onOpenReference) {
          return (
            <mark key={`${part.reference.nodeId}-${index}`} className="knowledge-reference">
              {part.text}
            </mark>
          );
        }

        return (
          <button
            key={`${part.reference.nodeId}-${index}`}
            type="button"
            className="knowledge-reference knowledge-reference--link"
            title={`打开知识点：${part.reference.nodeLabel}`}
            onClick={() => onOpenReference(part.reference.nodeId)}
          >
            {part.text}
          </button>
        );
      })}
    </>
  );
}
