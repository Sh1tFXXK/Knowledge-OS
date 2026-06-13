import type { SemanticGroup } from '../../types';
import type { AtomRectMap } from './SectionRenderer';

interface Props {
  groups: SemanticGroup[];
  atomRects: AtomRectMap;
  /** 必须指向 Section 流式滚动容器（.dc-sections-wrap）——坐标以其内容空间计算 */
  containerRef: { current: HTMLDivElement | null };
  onGroupClick: (nodeId: string) => void;
}

export function GroupOverlay({ groups, atomRects, containerRef, onGroupClick }: Props) {
  const container = containerRef.current;
  if (!container || groups.length === 0) return null;

  const containerRect = container.getBoundingClientRect();
  // 覆盖层随内容滚动，坐标需折算到内容空间（视口坐标 + 滚动偏移）
  const scrollLeft = container.scrollLeft;
  const scrollTop = container.scrollTop;

  const boxes = groups
    .map((group) => {
      const rects = group.members
        .map((memberId) => atomRects.get(memberId))
        .filter((rect): rect is DOMRect => !!rect);
      if (rects.length === 0) return null;

      const left = Math.min(...rects.map((rect) => rect.left)) - containerRect.left + scrollLeft;
      const right = Math.max(...rects.map((rect) => rect.right)) - containerRect.left + scrollLeft;
      const top = Math.min(...rects.map((rect) => rect.top)) - containerRect.top + scrollTop;
      const bottom = Math.max(...rects.map((rect) => rect.bottom)) - containerRect.top + scrollTop;
      return { group, left, right, top, bottom, span: bottom - top };
    })
    .filter((box): box is NonNullable<typeof box> => !!box);

  if (boxes.length === 0) return null;

  // 跨度小的括号贴近内容，跨度大的依次外移——嵌套组（如 行记录 ⊂ 记录部分）不重叠
  const ranked = [...boxes].sort((a, b) => a.span - b.span);
  const rankOf = new Map(ranked.map((box, index) => [box.group.id, index]));

  return (
    <div className="dc-group-overlay" aria-hidden={false}>
      <svg className="dc-group-overlay-svg">
        {boxes.map(({ group, left, top, bottom }) => {
          const rank = rankOf.get(group.id) ?? 0;
          const x = Math.max(4, left - 14 - rank * 14);
          const mid = (top + bottom) / 2;
          return (
            <path
              key={group.id}
              className="dc-group-brace"
              d={`M ${x + 10} ${top} C ${x} ${top} ${x} ${mid - 10} ${x + 10} ${mid} C ${x} ${mid + 10} ${x} ${bottom} ${x + 10} ${bottom}`}
            />
          );
        })}
      </svg>
      {boxes.map(({ group, right, top, bottom }) => {
        const rank = rankOf.get(group.id) ?? 0;
        const mid = (top + bottom) / 2;
        return (
          <button
            key={group.id}
            type="button"
            className="dc-group-chip"
            style={{ left: right + 8 + rank * 4, top: mid - 11 + rank * 24 }}
            disabled={!group.nodeId}
            title={group.nodeId ? '点击打开逻辑类解释卡' : undefined}
            onClick={() => group.nodeId && onGroupClick(group.nodeId)}
          >
            {`{ ${group.label}`}
          </button>
        );
      })}
    </div>
  );
}
