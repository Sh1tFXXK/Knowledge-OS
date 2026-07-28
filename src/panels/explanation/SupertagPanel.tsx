export default function SupertagPanel({
  tags,
  onOpenTag,
}: {
  tags: readonly string[];
  onOpenTag: (tag: string) => void;
}) {
  return (
    <div className="supertag-strip">
      {tags.map((tag) => (
        <button
          type="button"
          key={tag}
          className="concept-supertag concept-supertag--link"
          aria-label={`在 Supertag 库中查看 ${tag}`}
          title={`在 Supertag 库中查看 ${tag}`}
          onClick={() => onOpenTag(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
