export default function SupertagPanel({ tags }: { tags: readonly string[] }) {
  return (
    <div className="supertag-strip">
      {tags.map((tag) => (
        <span
          key={tag}
          className="concept-supertag concept-supertag--readonly"
          title={`super tag: ${tag}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
