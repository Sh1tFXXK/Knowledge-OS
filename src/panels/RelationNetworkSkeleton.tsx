export default function RelationNetworkSkeleton() {
  return (
    <section
      className="right-section relation-panel relation-panel-skeleton"
      aria-label="关系网加载中"
      aria-busy="true"
    >
      <div className="relation-skeleton" aria-hidden="true">
        <div className="relation-skeleton-toolbar">
          <span className="relation-skeleton-label" />
          <span className="relation-skeleton-meta" />
        </div>
        <div className="relation-skeleton-canvas">
          <span className="relation-skeleton-line relation-skeleton-line--one" />
          <span className="relation-skeleton-line relation-skeleton-line--two" />
          <span className="relation-skeleton-line relation-skeleton-line--three" />
          <span className="relation-skeleton-node relation-skeleton-node--center" />
          <span className="relation-skeleton-node relation-skeleton-node--top" />
          <span className="relation-skeleton-node relation-skeleton-node--left" />
          <span className="relation-skeleton-node relation-skeleton-node--right" />
        </div>
      </div>
    </section>
  );
}
