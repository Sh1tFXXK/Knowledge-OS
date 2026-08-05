import {
  UnifiedIndexEdgeKind,
  type UnifiedIndexGraphEdge,
  type UnifiedIndexGraphNode,
} from './indexGraphLayout';

export type EdgeRoutingMode = 'detail' | 'compact' | 'overview';
export type NodeSide = 'top' | 'right' | 'bottom' | 'left';

export interface EdgeRoutePoint {
  x: number;
  y: number;
}

export interface EdgeRouteSegment {
  start: EdgeRoutePoint;
  end: EdgeRoutePoint;
}

export interface EdgeRoute {
  edgeId: string;
  d: string;
  segments: readonly EdgeRouteSegment[];
  labelX: number;
  labelY: number;
  sourceSide: NodeSide;
  targetSide: NodeSide;
}

export interface EdgeBundleBranch {
  edgeId: string;
  d: string;
  segments: readonly EdgeRouteSegment[];
  targetSide: NodeSide;
}

export interface EdgeBundleRoute {
  id: string;
  kind: UnifiedIndexGraphEdge['kind'];
  edgeIds: readonly string[];
  trunkD: string;
  trunkSegments: readonly EdgeRouteSegment[];
  labelX: number;
  labelY: number;
  sourceSide: NodeSide;
  branches: readonly EdgeBundleBranch[];
}

export interface EdgeRoutingPlan {
  routes: readonly EdgeRoute[];
  bundles: readonly EdgeBundleRoute[];
}

type Port = EdgeRoutePoint;

type RouteOrientation = 'vertical' | 'horizontal' | 'arc';

interface EdgeGeometry {
  edge: UnifiedIndexGraphEdge;
  source: UnifiedIndexGraphNode;
  target: UnifiedIndexGraphNode;
  orientation: RouteOrientation;
  sourceSide: NodeSide;
  targetSide: NodeSide;
}

interface BundleDraft {
  id: string;
  kind: UnifiedIndexGraphEdge['kind'];
  source: UnifiedIndexGraphNode;
  sourceSide: NodeSide;
  orientation: 'vertical' | 'horizontal';
  geometries: readonly EdgeGeometry[];
}

interface PortRequest {
  key: string;
  node: UnifiedIndexGraphNode;
  side: NodeSide;
  otherAxis: number;
}

interface RoutingModeConfig {
  minimumBundleSize: number;
  targetBandTolerance: number;
  minimumSharedLength: number;
}

const PORT_PADDING = 16;
const ARC_BASE_OFFSET = 14;
const ARC_GAP = 12;
const MIN_ARC_COORDINATE = 8;
const SAME_LAYER_TOLERANCE = 24;
const BUNDLE_CLEARANCE = 8;
const MIN_TARGET_SPREAD = 36;

const MODE_CONFIG: Record<EdgeRoutingMode, RoutingModeConfig> = {
  detail: {
    minimumBundleSize: 3,
    targetBandTolerance: 64,
    minimumSharedLength: 34,
  },
  compact: {
    minimumBundleSize: 2,
    targetBandTolerance: 104,
    minimumSharedLength: 26,
  },
  overview: {
    minimumBundleSize: 2,
    targetBandTolerance: 180,
    minimumSharedLength: 18,
  },
};

function sideCenter(node: UnifiedIndexGraphNode, side: NodeSide): Port {
  switch (side) {
    case 'top':
      return { x: node.position.x, y: node.position.y - node.size.height / 2 };
    case 'right':
      return { x: node.position.x + node.size.width / 2, y: node.position.y };
    case 'bottom':
      return { x: node.position.x, y: node.position.y + node.size.height / 2 };
    case 'left':
      return { x: node.position.x - node.size.width / 2, y: node.position.y };
  }
}

function sideLength(node: UnifiedIndexGraphNode, side: NodeSide): number {
  return side === 'top' || side === 'bottom' ? node.size.width : node.size.height;
}

function sideAxis(side: NodeSide, point: Port): number {
  return side === 'top' || side === 'bottom' ? point.x : point.y;
}

function isProjection(kind: UnifiedIndexGraphEdge['kind']): boolean {
  return kind === UnifiedIndexEdgeKind.Projection;
}

function geometryForEdge(
  edge: UnifiedIndexGraphEdge,
  source: UnifiedIndexGraphNode,
  target: UnifiedIndexGraphNode,
): EdgeGeometry {
  if (isProjection(edge.kind)) {
    return {
      edge,
      source,
      target,
      orientation: 'arc',
      sourceSide: 'top',
      targetSide: 'top',
    };
  }

  const deltaX = target.position.x - source.position.x;
  const deltaY = target.position.y - source.position.y;
  if (Math.abs(deltaY) >= SAME_LAYER_TOLERANCE) {
    const sourceAbove = deltaY > 0;
    return {
      edge,
      source,
      target,
      orientation: 'vertical',
      sourceSide: sourceAbove ? 'bottom' : 'top',
      targetSide: sourceAbove ? 'top' : 'bottom',
    };
  }

  if (Math.abs(deltaX) >= 1) {
    const sourceLeft = deltaX > 0;
    return {
      edge,
      source,
      target,
      orientation: 'horizontal',
      sourceSide: sourceLeft ? 'right' : 'left',
      targetSide: sourceLeft ? 'left' : 'right',
    };
  }

  return {
    edge,
    source,
    target,
    orientation: 'arc',
    sourceSide: 'top',
    targetSide: 'top',
  };
}

function primaryPosition(geometry: EdgeGeometry): number {
  return geometry.orientation === 'vertical'
    ? geometry.target.position.y
    : geometry.target.position.x;
}

function orthogonalPosition(geometry: EdgeGeometry): number {
  return geometry.orientation === 'vertical'
    ? geometry.target.position.x
    : geometry.target.position.y;
}

function segmentHitsNode(
  start: Port,
  end: Port,
  node: UnifiedIndexGraphNode,
): boolean {
  const left = node.position.x - node.size.width / 2 - BUNDLE_CLEARANCE;
  const right = node.position.x + node.size.width / 2 + BUNDLE_CLEARANCE;
  const top = node.position.y - node.size.height / 2 - BUNDLE_CLEARANCE;
  const bottom = node.position.y + node.size.height / 2 + BUNDLE_CLEARANCE;

  if (start.x === end.x) {
    const minimumY = Math.min(start.y, end.y);
    const maximumY = Math.max(start.y, end.y);
    return start.x > left && start.x < right && maximumY > top && minimumY < bottom;
  }

  if (start.y === end.y) {
    const minimumX = Math.min(start.x, end.x);
    const maximumX = Math.max(start.x, end.x);
    return start.y > top && start.y < bottom && maximumX > left && minimumX < right;
  }

  return false;
}

function segmentIsClear(
  start: Port,
  end: Port,
  nodes: readonly UnifiedIndexGraphNode[],
  excludedNodeIds: ReadonlySet<string>,
): boolean {
  return nodes.every((node) => (
    excludedNodeIds.has(node.id) || !segmentHitsNode(start, end, node)
  ));
}

function branchCoordinate(
  sourcePort: Port,
  targetPorts: readonly Port[],
  orientation: 'vertical' | 'horizontal',
): number {
  const sourceCoordinate = orientation === 'vertical' ? sourcePort.y : sourcePort.x;
  const targetCoordinates = targetPorts.map((port) => (
    orientation === 'vertical' ? port.y : port.x
  ));
  const nearestTarget = targetCoordinates.reduce((nearest, coordinate) => (
    Math.abs(coordinate - sourceCoordinate) < Math.abs(nearest - sourceCoordinate)
      ? coordinate
      : nearest
  ));
  return (sourceCoordinate + nearestTarget) / 2;
}

function isBundleVisuallySuitable(
  geometries: readonly EdgeGeometry[],
  nodes: readonly UnifiedIndexGraphNode[],
  config: RoutingModeConfig,
): boolean {
  const first = geometries[0];
  if (!first || first.orientation === 'arc') return false;
  const orientation = first.orientation;
  const sourcePort = sideCenter(first.source, first.sourceSide);
  const targetPorts = geometries.map((geometry) => sideCenter(geometry.target, geometry.targetSide));
  const branch = branchCoordinate(sourcePort, targetPorts, orientation);
  const sourceCoordinate = orientation === 'vertical' ? sourcePort.y : sourcePort.x;
  if (Math.abs(branch - sourceCoordinate) < config.minimumSharedLength) return false;

  const targetAxes = targetPorts.map((port) => (
    orientation === 'vertical' ? port.x : port.y
  ));
  if (Math.max(...targetAxes) - Math.min(...targetAxes) < MIN_TARGET_SPREAD) return false;

  const targetIds = new Set(geometries.map((geometry) => geometry.target.id));
  const sharedExclusions = new Set([first.source.id, ...targetIds]);
  if (orientation === 'vertical') {
    const busStart = { x: Math.min(sourcePort.x, ...targetAxes), y: branch };
    const busEnd = { x: Math.max(sourcePort.x, ...targetAxes), y: branch };
    if (!segmentIsClear(sourcePort, { x: sourcePort.x, y: branch }, nodes, sharedExclusions)) {
      return false;
    }
    if (!segmentIsClear(busStart, busEnd, nodes, sharedExclusions)) return false;
    return geometries.every((geometry, index) => segmentIsClear(
      { x: targetPorts[index].x, y: branch },
      targetPorts[index],
      nodes,
      new Set([first.source.id, geometry.target.id]),
    ));
  }

  const busStart = { x: branch, y: Math.min(sourcePort.y, ...targetAxes) };
  const busEnd = { x: branch, y: Math.max(sourcePort.y, ...targetAxes) };
  if (!segmentIsClear(sourcePort, { x: branch, y: sourcePort.y }, nodes, sharedExclusions)) {
    return false;
  }
  if (!segmentIsClear(busStart, busEnd, nodes, sharedExclusions)) return false;
  return geometries.every((geometry, index) => segmentIsClear(
    { x: branch, y: targetPorts[index].y },
    targetPorts[index],
    nodes,
    new Set([first.source.id, geometry.target.id]),
  ));
}

function collectBundleDrafts(
  geometries: readonly EdgeGeometry[],
  nodes: readonly UnifiedIndexGraphNode[],
  mode: EdgeRoutingMode,
): BundleDraft[] {
  const config = MODE_CONFIG[mode];
  const groups = new Map<string, EdgeGeometry[]>();
  for (const geometry of geometries) {
    if (geometry.orientation === 'arc') continue;
    const key = [
      geometry.source.id,
      geometry.edge.kind,
      geometry.orientation,
      geometry.sourceSide,
      geometry.targetSide,
    ].join('|');
    const group = groups.get(key) ?? [];
    group.push(geometry);
    groups.set(key, group);
  }

  const bundles: BundleDraft[] = [];
  for (const group of groups.values()) {
    group.sort((left, right) => primaryPosition(left) - primaryPosition(right));
    const clusters: EdgeGeometry[][] = [];
    for (const geometry of group) {
      const cluster = clusters[clusters.length - 1];
      if (!cluster) {
        clusters.push([geometry]);
        continue;
      }
      const previous = cluster[cluster.length - 1];
      if (Math.abs(primaryPosition(geometry) - primaryPosition(previous)) <= config.targetBandTolerance) {
        cluster.push(geometry);
      } else {
        clusters.push([geometry]);
      }
    }

    const collectSuitableSubclusters = (
      cluster: EdgeGeometry[],
      clusterId: string,
    ): void => {
      if (cluster.length < config.minimumBundleSize) return;
      const orderedByTarget = [...cluster].sort(
        (left, right) => orthogonalPosition(left) - orthogonalPosition(right),
      );
      if (isBundleVisuallySuitable(orderedByTarget, nodes, config)) {
        const first = orderedByTarget[0];
        if (!first || first.orientation === 'arc') return;
        bundles.push({
          id: `bundle:${first.source.id}:${String(first.edge.kind)}:${first.sourceSide}:${clusterId}`,
          kind: first.edge.kind,
          source: first.source,
          sourceSide: first.sourceSide,
          orientation: first.orientation,
          geometries: orderedByTarget,
        });
        return;
      }

      let splitIndex = -1;
      let largestPrimaryGap = 0;
      for (let index = 1; index < cluster.length; index += 1) {
        const gap = primaryPosition(cluster[index]) - primaryPosition(cluster[index - 1]);
        if (gap <= largestPrimaryGap) continue;
        largestPrimaryGap = gap;
        splitIndex = index;
      }
      if (splitIndex <= 0) return;
      collectSuitableSubclusters(cluster.slice(0, splitIndex), `${clusterId}:a`);
      collectSuitableSubclusters(cluster.slice(splitIndex), `${clusterId}:b`);
    };

    clusters.forEach((cluster, clusterIndex) => {
      collectSuitableSubclusters(cluster, String(clusterIndex));
    });
  }
  return bundles;
}

function allocatePorts(requests: readonly PortRequest[]): Map<string, Port> {
  const grouped = new Map<string, PortRequest[]>();
  for (const request of requests) {
    const key = `${request.node.id}|${request.side}`;
    const group = grouped.get(key) ?? [];
    group.push(request);
    grouped.set(key, group);
  }

  const ports = new Map<string, Port>();
  for (const group of grouped.values()) {
    const first = group[0];
    if (!first) continue;
    group.sort((left, right) => left.otherAxis - right.otherAxis);
    const center = sideCenter(first.node, first.side);
    const available = Math.max(0, sideLength(first.node, first.side) - PORT_PADDING * 2);
    group.forEach((request, index) => {
      const offset = group.length === 1
        ? 0
        : -available / 2 + (available * index) / (group.length - 1);
      ports.set(request.key, first.side === 'top' || first.side === 'bottom'
        ? { x: center.x + offset, y: center.y }
        : { x: center.x, y: center.y + offset });
    });
  }
  return ports;
}

function buildPortRequests(
  geometries: readonly EdgeGeometry[],
  bundles: readonly BundleDraft[],
): { requests: PortRequest[]; bundledEdgeIds: ReadonlySet<string> } {
  const requests: PortRequest[] = [];
  const bundledEdgeIds = new Set<string>();
  for (const bundle of bundles) {
    const targetCenter = bundle.geometries.reduce(
      (sum, geometry) => sum + sideAxis(bundle.sourceSide, geometry.target.position),
      0,
    ) / bundle.geometries.length;
    requests.push({
      key: `${bundle.id}|source`,
      node: bundle.source,
      side: bundle.sourceSide,
      otherAxis: targetCenter,
    });
    for (const geometry of bundle.geometries) {
      bundledEdgeIds.add(geometry.edge.id);
      requests.push({
        key: `${geometry.edge.id}|target`,
        node: geometry.target,
        side: geometry.targetSide,
        otherAxis: sideAxis(geometry.targetSide, geometry.source.position),
      });
    }
  }

  for (const geometry of geometries) {
    if (bundledEdgeIds.has(geometry.edge.id)) continue;
    requests.push({
      key: `${geometry.edge.id}|source`,
      node: geometry.source,
      side: geometry.sourceSide,
      otherAxis: sideAxis(geometry.sourceSide, geometry.target.position),
    });
    requests.push({
      key: `${geometry.edge.id}|target`,
      node: geometry.target,
      side: geometry.targetSide,
      otherAxis: sideAxis(geometry.targetSide, geometry.source.position),
    });
  }
  return { requests, bundledEdgeIds };
}

function buildBundleRoute(bundle: BundleDraft, ports: ReadonlyMap<string, Port>): EdgeBundleRoute | null {
  const sourcePort = ports.get(`${bundle.id}|source`) ?? sideCenter(bundle.source, bundle.sourceSide);
  const targetPorts = bundle.geometries.map((geometry) => (
    ports.get(`${geometry.edge.id}|target`) ?? sideCenter(geometry.target, geometry.targetSide)
  ));
  const branch = branchCoordinate(sourcePort, targetPorts, bundle.orientation);

  if (bundle.orientation === 'vertical') {
    const minimumX = Math.min(sourcePort.x, ...targetPorts.map((port) => port.x));
    const maximumX = Math.max(sourcePort.x, ...targetPorts.map((port) => port.x));
    const sourceBranch = { x: sourcePort.x, y: branch };
    const busStart = { x: minimumX, y: branch };
    const busEnd = { x: maximumX, y: branch };
    return {
      id: bundle.id,
      kind: bundle.kind,
      edgeIds: bundle.geometries.map((geometry) => geometry.edge.id),
      trunkD: [
        `M ${sourcePort.x} ${sourcePort.y}`,
        `L ${sourcePort.x} ${branch}`,
        `M ${minimumX} ${branch}`,
        `L ${maximumX} ${branch}`,
      ].join(' '),
      trunkSegments: [
        { start: sourcePort, end: sourceBranch },
        { start: busStart, end: busEnd },
      ],
      labelX: (minimumX + maximumX) / 2,
      labelY: branch - 6,
      sourceSide: bundle.sourceSide,
      branches: bundle.geometries.map((geometry, index) => ({
        edgeId: geometry.edge.id,
        d: `M ${targetPorts[index].x} ${branch} L ${targetPorts[index].x} ${targetPorts[index].y}`,
        segments: [{
          start: { x: targetPorts[index].x, y: branch },
          end: targetPorts[index],
        }],
        targetSide: geometry.targetSide,
      })),
    };
  }

  const minimumY = Math.min(sourcePort.y, ...targetPorts.map((port) => port.y));
  const maximumY = Math.max(sourcePort.y, ...targetPorts.map((port) => port.y));
  const sourceBranch = { x: branch, y: sourcePort.y };
  const busStart = { x: branch, y: minimumY };
  const busEnd = { x: branch, y: maximumY };
  return {
    id: bundle.id,
    kind: bundle.kind,
    edgeIds: bundle.geometries.map((geometry) => geometry.edge.id),
    trunkD: [
      `M ${sourcePort.x} ${sourcePort.y}`,
      `L ${branch} ${sourcePort.y}`,
      `M ${branch} ${minimumY}`,
      `L ${branch} ${maximumY}`,
    ].join(' '),
    trunkSegments: [
      { start: sourcePort, end: sourceBranch },
      { start: busStart, end: busEnd },
    ],
    labelX: branch,
    labelY: (minimumY + maximumY) / 2 - 6,
    sourceSide: bundle.sourceSide,
    branches: bundle.geometries.map((geometry, index) => ({
      edgeId: geometry.edge.id,
      d: `M ${branch} ${targetPorts[index].y} L ${targetPorts[index].x} ${targetPorts[index].y}`,
      segments: [{
        start: { x: branch, y: targetPorts[index].y },
        end: targetPorts[index],
      }],
      targetSide: geometry.targetSide,
    })),
  };
}

function buildStandaloneRoutes(
  geometries: readonly EdgeGeometry[],
  ports: ReadonlyMap<string, Port>,
): EdgeRoute[] {
  const routes: EdgeRoute[] = [];
  const verticalGroups = new Map<string, EdgeGeometry[]>();
  const horizontalGroups = new Map<string, EdgeGeometry[]>();
  const arcGroups = new Map<string, EdgeGeometry[]>();

  for (const geometry of geometries) {
    if (geometry.orientation === 'vertical') {
      const upperY = Math.min(geometry.source.position.y, geometry.target.position.y);
      const lowerY = Math.max(geometry.source.position.y, geometry.target.position.y);
      const key = `${Math.round(upperY)}|${Math.round(lowerY)}`;
      const group = verticalGroups.get(key) ?? [];
      group.push(geometry);
      verticalGroups.set(key, group);
      continue;
    }
    if (geometry.orientation === 'horizontal') {
      const leftX = Math.min(geometry.source.position.x, geometry.target.position.x);
      const rightX = Math.max(geometry.source.position.x, geometry.target.position.x);
      const key = `${Math.round(leftX)}|${Math.round(rightX)}`;
      const group = horizontalGroups.get(key) ?? [];
      group.push(geometry);
      horizontalGroups.set(key, group);
      continue;
    }
    const ceiling = Math.round(Math.min(
      geometry.source.position.y - geometry.source.size.height / 2,
      geometry.target.position.y - geometry.target.size.height / 2,
    ));
    const group = arcGroups.get(String(ceiling)) ?? [];
    group.push(geometry);
    arcGroups.set(String(ceiling), group);
  }

  const channelY = new Map<string, number>();
  for (const group of verticalGroups.values()) {
    let regionTop = -Infinity;
    let regionBottom = Infinity;
    for (const geometry of group) {
      const upper = geometry.source.position.y < geometry.target.position.y
        ? geometry.source
        : geometry.target;
      const lower = upper === geometry.source ? geometry.target : geometry.source;
      regionTop = Math.max(regionTop, upper.position.y + upper.size.height / 2);
      regionBottom = Math.min(regionBottom, lower.position.y - lower.size.height / 2);
    }
    if (regionBottom - regionTop < 12) {
      const middle = (regionTop + regionBottom) / 2;
      regionTop = middle - 6;
      regionBottom = middle + 6;
    }
    group.sort((left, right) => {
      const leftSource = ports.get(`${left.edge.id}|source`) ?? sideCenter(left.source, left.sourceSide);
      const leftTarget = ports.get(`${left.edge.id}|target`) ?? sideCenter(left.target, left.targetSide);
      const rightSource = ports.get(`${right.edge.id}|source`) ?? sideCenter(right.source, right.sourceSide);
      const rightTarget = ports.get(`${right.edge.id}|target`) ?? sideCenter(right.target, right.targetSide);
      return (leftSource.x + leftTarget.x) - (rightSource.x + rightTarget.x);
    });
    group.forEach((geometry, index) => {
      channelY.set(
        geometry.edge.id,
        regionTop + ((regionBottom - regionTop) * (index + 1)) / (group.length + 1),
      );
    });
  }

  const channelX = new Map<string, number>();
  for (const group of horizontalGroups.values()) {
    let regionLeft = -Infinity;
    let regionRight = Infinity;
    for (const geometry of group) {
      const left = geometry.source.position.x < geometry.target.position.x
        ? geometry.source
        : geometry.target;
      const right = left === geometry.source ? geometry.target : geometry.source;
      regionLeft = Math.max(regionLeft, left.position.x + left.size.width / 2);
      regionRight = Math.min(regionRight, right.position.x - right.size.width / 2);
    }
    if (regionRight - regionLeft < 12) {
      const middle = (regionLeft + regionRight) / 2;
      regionLeft = middle - 6;
      regionRight = middle + 6;
    }
    group.sort((left, right) => {
      const leftSource = ports.get(`${left.edge.id}|source`) ?? sideCenter(left.source, left.sourceSide);
      const leftTarget = ports.get(`${left.edge.id}|target`) ?? sideCenter(left.target, left.targetSide);
      const rightSource = ports.get(`${right.edge.id}|source`) ?? sideCenter(right.source, right.sourceSide);
      const rightTarget = ports.get(`${right.edge.id}|target`) ?? sideCenter(right.target, right.targetSide);
      return (leftSource.y + leftTarget.y) - (rightSource.y + rightTarget.y);
    });
    group.forEach((geometry, index) => {
      channelX.set(
        geometry.edge.id,
        regionLeft + ((regionRight - regionLeft) * (index + 1)) / (group.length + 1),
      );
    });
  }

  const arcCoordinate = new Map<string, number>();
  for (const [ceilingKey, group] of arcGroups) {
    const ceiling = Number(ceilingKey);
    group.sort((left, right) => {
      const leftSource = ports.get(`${left.edge.id}|source`) ?? sideCenter(left.source, left.sourceSide);
      const leftTarget = ports.get(`${left.edge.id}|target`) ?? sideCenter(left.target, left.targetSide);
      const rightSource = ports.get(`${right.edge.id}|source`) ?? sideCenter(right.source, right.sourceSide);
      const rightTarget = ports.get(`${right.edge.id}|target`) ?? sideCenter(right.target, right.targetSide);
      return Math.abs(leftSource.x - leftTarget.x) - Math.abs(rightSource.x - rightTarget.x);
    });
    group.forEach((geometry, index) => {
      arcCoordinate.set(
        geometry.edge.id,
        Math.max(MIN_ARC_COORDINATE, ceiling - ARC_BASE_OFFSET - index * ARC_GAP),
      );
    });
  }

  for (const geometry of geometries) {
    const sourcePort = ports.get(`${geometry.edge.id}|source`)
      ?? sideCenter(geometry.source, geometry.sourceSide);
    const targetPort = ports.get(`${geometry.edge.id}|target`)
      ?? sideCenter(geometry.target, geometry.targetSide);
    if (geometry.orientation === 'vertical') {
      const channel = channelY.get(geometry.edge.id) ?? (sourcePort.y + targetPort.y) / 2;
      const sourceTurn = { x: sourcePort.x, y: channel };
      const targetTurn = { x: targetPort.x, y: channel };
      routes.push({
        edgeId: geometry.edge.id,
        d: [
          `M ${sourcePort.x} ${sourcePort.y}`,
          `L ${sourcePort.x} ${channel}`,
          `L ${targetPort.x} ${channel}`,
          `L ${targetPort.x} ${targetPort.y}`,
        ].join(' '),
        segments: [
          { start: sourcePort, end: sourceTurn },
          { start: sourceTurn, end: targetTurn },
          { start: targetTurn, end: targetPort },
        ],
        labelX: (sourcePort.x + targetPort.x) / 2,
        labelY: channel - 6,
        sourceSide: geometry.sourceSide,
        targetSide: geometry.targetSide,
      });
      continue;
    }
    if (geometry.orientation === 'horizontal') {
      const channel = channelX.get(geometry.edge.id) ?? (sourcePort.x + targetPort.x) / 2;
      const sourceTurn = { x: channel, y: sourcePort.y };
      const targetTurn = { x: channel, y: targetPort.y };
      routes.push({
        edgeId: geometry.edge.id,
        d: [
          `M ${sourcePort.x} ${sourcePort.y}`,
          `L ${channel} ${sourcePort.y}`,
          `L ${channel} ${targetPort.y}`,
          `L ${targetPort.x} ${targetPort.y}`,
        ].join(' '),
        segments: [
          { start: sourcePort, end: sourceTurn },
          { start: sourceTurn, end: targetTurn },
          { start: targetTurn, end: targetPort },
        ],
        labelX: channel,
        labelY: (sourcePort.y + targetPort.y) / 2 - 6,
        sourceSide: geometry.sourceSide,
        targetSide: geometry.targetSide,
      });
      continue;
    }
    const arc = arcCoordinate.get(geometry.edge.id)
      ?? Math.min(sourcePort.y, targetPort.y) - ARC_BASE_OFFSET;
    const sourceTurn = { x: sourcePort.x, y: arc };
    const targetTurn = { x: targetPort.x, y: arc };
    routes.push({
      edgeId: geometry.edge.id,
      d: [
        `M ${sourcePort.x} ${sourcePort.y}`,
        `L ${sourcePort.x} ${arc}`,
        `L ${targetPort.x} ${arc}`,
        `L ${targetPort.x} ${targetPort.y}`,
      ].join(' '),
      segments: [
        { start: sourcePort, end: sourceTurn },
        { start: sourceTurn, end: targetTurn },
        { start: targetTurn, end: targetPort },
      ],
      labelX: (sourcePort.x + targetPort.x) / 2,
      labelY: arc - 6,
      sourceSide: geometry.sourceSide,
      targetSide: geometry.targetSide,
    });
  }
  return routes;
}

export function computeEdgeRoutingPlan(
  nodes: readonly UnifiedIndexGraphNode[],
  edges: readonly UnifiedIndexGraphEdge[],
  mode: EdgeRoutingMode = 'detail',
): EdgeRoutingPlan {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const geometries: EdgeGeometry[] = [];
  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) continue;
    geometries.push(geometryForEdge(edge, source, target));
  }

  const bundles = collectBundleDrafts(geometries, nodes, mode);
  const { requests, bundledEdgeIds } = buildPortRequests(geometries, bundles);
  const ports = allocatePorts(requests);
  const standaloneGeometries = geometries.filter((geometry) => !bundledEdgeIds.has(geometry.edge.id));

  return {
    routes: buildStandaloneRoutes(standaloneGeometries, ports),
    bundles: bundles
      .map((bundle) => buildBundleRoute(bundle, ports))
      .filter((bundle): bundle is EdgeBundleRoute => bundle !== null),
  };
}
