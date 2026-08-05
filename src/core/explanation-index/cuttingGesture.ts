export interface CuttingPoint {
  x: number;
  y: number;
}

export interface CuttingSegment {
  start: CuttingPoint;
  end: CuttingPoint;
}

export interface CuttingRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CuttingNodeTarget {
  id: string;
  rect: CuttingRect;
  deletable: boolean;
}

export interface CuttingEdgeTarget {
  id: string;
  segments: readonly CuttingSegment[];
  deletable: boolean;
}

export interface CuttingHits {
  nodeIds: readonly string[];
  edgeIds: readonly string[];
}

const EPSILON = 0.000001;

function cross(left: CuttingPoint, middle: CuttingPoint, right: CuttingPoint): number {
  return (
    (middle.x - left.x) * (right.y - left.y)
    - (middle.y - left.y) * (right.x - left.x)
  );
}

function pointOnSegment(point: CuttingPoint, segment: CuttingSegment): boolean {
  if (Math.abs(cross(segment.start, segment.end, point)) > EPSILON) return false;
  return (
    point.x >= Math.min(segment.start.x, segment.end.x) - EPSILON
    && point.x <= Math.max(segment.start.x, segment.end.x) + EPSILON
    && point.y >= Math.min(segment.start.y, segment.end.y) - EPSILON
    && point.y <= Math.max(segment.start.y, segment.end.y) + EPSILON
  );
}

export function segmentsIntersect(left: CuttingSegment, right: CuttingSegment): boolean {
  const leftStart = cross(left.start, left.end, right.start);
  const leftEnd = cross(left.start, left.end, right.end);
  const rightStart = cross(right.start, right.end, left.start);
  const rightEnd = cross(right.start, right.end, left.end);

  if (
    ((leftStart > EPSILON && leftEnd < -EPSILON) || (leftStart < -EPSILON && leftEnd > EPSILON))
    && ((rightStart > EPSILON && rightEnd < -EPSILON) || (rightStart < -EPSILON && rightEnd > EPSILON))
  ) {
    return true;
  }

  return (
    (Math.abs(leftStart) <= EPSILON && pointOnSegment(right.start, left))
    || (Math.abs(leftEnd) <= EPSILON && pointOnSegment(right.end, left))
    || (Math.abs(rightStart) <= EPSILON && pointOnSegment(left.start, right))
    || (Math.abs(rightEnd) <= EPSILON && pointOnSegment(left.end, right))
  );
}

function pointInRect(point: CuttingPoint, rect: CuttingRect): boolean {
  return (
    point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom
  );
}

export function segmentIntersectsRect(segment: CuttingSegment, rect: CuttingRect): boolean {
  if (pointInRect(segment.start, rect) || pointInRect(segment.end, rect)) return true;

  const topLeft = { x: rect.left, y: rect.top };
  const topRight = { x: rect.right, y: rect.top };
  const bottomRight = { x: rect.right, y: rect.bottom };
  const bottomLeft = { x: rect.left, y: rect.bottom };
  return [
    { start: topLeft, end: topRight },
    { start: topRight, end: bottomRight },
    { start: bottomRight, end: bottomLeft },
    { start: bottomLeft, end: topLeft },
  ].some((boundary) => segmentsIntersect(segment, boundary));
}

export function collectCuttingHits(
  cuttingLine: CuttingSegment,
  nodes: readonly CuttingNodeTarget[],
  edges: readonly CuttingEdgeTarget[],
): CuttingHits {
  return {
    nodeIds: nodes
      .filter((node) => node.deletable && segmentIntersectsRect(cuttingLine, node.rect))
      .map((node) => node.id),
    edgeIds: edges
      .filter((edge) => (
        edge.deletable
        && edge.segments.some((segment) => segmentsIntersect(cuttingLine, segment))
      ))
      .map((edge) => edge.id),
  };
}
