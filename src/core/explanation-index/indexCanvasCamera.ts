export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasFocusTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export type CanvasOverviewLabelKind = 'group' | 'node';
export type CanvasOverviewLabelPresentation = 'badge' | 'cell';

export interface CanvasOverviewLabel {
  id: string;
  entityId: string;
  label: string;
  kind: CanvasOverviewLabelKind;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
}

export interface PositionedCanvasOverviewLabel {
  id: string;
  entityId: string;
  label: string;
  kind: CanvasOverviewLabelKind;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  presentation: CanvasOverviewLabelPresentation;
}

interface CanvasOverviewScreenCandidate {
  label: CanvasOverviewLabel;
  screenLeft: number;
  screenTop: number;
  screenWidth: number;
  screenHeight: number;
}

const MIN_SCALE = 0.005;
const MAX_SCALE = 2.4;
const CONTENT_PADDING = 52;
const FOCUS_CONTEXT_WIDTH = 520;
const FOCUS_CONTEXT_HEIGHT = 320;
const OVERVIEW_LABEL_MIN_WIDTH = 72;
const OVERVIEW_LABEL_MIN_HEIGHT = 22;
const OVERVIEW_LABEL_MAX_WIDTH = 180;
const OVERVIEW_LABEL_GAP = 4;
const OVERVIEW_LABEL_INSET = 6;
const OVERVIEW_CELL_MIN_FONT_SIZE = 3;
const OVERVIEW_CELL_MAX_FONT_SIZE = 10;

export const READABLE_SCALE = 0.84;

export function clampCanvasScale(scale: number): number {
  if (!Number.isFinite(scale)) return scale === Number.POSITIVE_INFINITY ? MAX_SCALE : MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function shouldShowCanvasOverviewLabels(scale: number): boolean {
  return clampCanvasScale(scale) < READABLE_SCALE;
}

export function canvasContentAspectRatio(
  viewport: CanvasSize,
  padding = CONTENT_PADDING,
): number {
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  return availableWidth / availableHeight;
}

function estimatedOverviewLabelWidth(label: string): number {
  return Array.from(label.trim()).reduce((width, character) => (
    width + (/[^\x00-\xff]/.test(character) ? 12 : 7)
  ), 20);
}

function nativeCanvasTitleIsVisible(
  candidate: CanvasOverviewScreenCandidate,
  scale: number,
  viewport: CanvasSize,
): boolean {
  const titleWidth = Math.min(
    candidate.screenWidth,
    estimatedOverviewLabelWidth(candidate.label.label) * Math.max(0.8, scale),
  );
  const titleHeight = Math.min(candidate.screenHeight, 16 * scale);
  const centerX = candidate.screenLeft + candidate.screenWidth / 2;
  const centerY = candidate.screenTop + candidate.screenHeight / 2;
  return centerX - titleWidth / 2 >= 0
    && centerX + titleWidth / 2 <= viewport.width
    && centerY - titleHeight / 2 >= 0
    && centerY + titleHeight / 2 <= viewport.height;
}

function overviewLabelsOverlap(
  left: PositionedCanvasOverviewLabel,
  right: PositionedCanvasOverviewLabel,
): boolean {
  return !(
    left.left + left.width + OVERVIEW_LABEL_GAP <= right.left
    || right.left + right.width + OVERVIEW_LABEL_GAP <= left.left
    || left.top + left.height + OVERVIEW_LABEL_GAP <= right.top
    || right.top + right.height + OVERVIEW_LABEL_GAP <= left.top
  );
}

function overviewBadgePositions(
  screenLeft: number,
  screenTop: number,
  screenWidth: number,
  screenHeight: number,
  width: number,
  viewport: CanvasSize,
): Array<{ left: number; top: number }> {
  const left = Math.max(4, screenLeft + OVERVIEW_LABEL_INSET);
  const top = Math.max(4, screenTop + OVERVIEW_LABEL_INSET);
  const right = Math.min(
    viewport.width - 4,
    screenLeft + screenWidth - OVERVIEW_LABEL_INSET,
  );
  const bottom = Math.min(
    viewport.height - 4,
    screenTop + screenHeight - OVERVIEW_LABEL_INSET,
  );
  const maxLeft = right - width;
  const maxTop = bottom - OVERVIEW_LABEL_MIN_HEIGHT;
  if (maxLeft < left || maxTop < top) return [];

  const horizontalPositions: number[] = [];
  const appendHorizontalPosition = (value: number) => {
    const normalized = Math.min(maxLeft, Math.max(left, value));
    if (horizontalPositions.some((position) => Math.abs(position - normalized) < 0.5)) return;
    horizontalPositions.push(normalized);
  };
  appendHorizontalPosition(left);
  appendHorizontalPosition(screenLeft + (screenWidth - width) / 2);
  appendHorizontalPosition(maxLeft);
  for (
    let position = left + width + OVERVIEW_LABEL_GAP;
    position < maxLeft;
    position += width + OVERVIEW_LABEL_GAP
  ) {
    appendHorizontalPosition(position);
  }

  const positions: Array<{ left: number; top: number }> = [];
  for (
    let positionTop = top;
    positionTop <= maxTop + 0.5;
    positionTop += OVERVIEW_LABEL_MIN_HEIGHT + OVERVIEW_LABEL_GAP
  ) {
    for (const positionLeft of horizontalPositions) {
      positions.push({ left: positionLeft, top: Math.min(positionTop, maxTop) });
    }
  }
  return positions;
}

function overviewCellTextUnits(label: string): number {
  return Array.from(label.trim()).reduce((units, character) => (
    units + (/[^\x00-\xff]/.test(character) ? 1 : 0.62)
  ), 0);
}

function overviewCellFontSize(label: string, width: number, height: number): number {
  const textUnits = Math.max(1, overviewCellTextUnits(label));
  for (
    let fontSize = OVERVIEW_CELL_MAX_FONT_SIZE;
    fontSize >= OVERVIEW_CELL_MIN_FONT_SIZE;
    fontSize -= 0.5
  ) {
    const unitsPerLine = Math.max(0.5, (width - 2) / fontSize);
    const lineCount = Math.ceil(textUnits / unitsPerLine);
    if (lineCount * fontSize * 1.05 <= height) return fontSize;
  }
  return OVERVIEW_CELL_MIN_FONT_SIZE;
}

export function positionCanvasOverviewLabels(
  labels: readonly CanvasOverviewLabel[],
  camera: CameraState,
  viewport: CanvasSize,
): PositionedCanvasOverviewLabel[] {
  const showNodeLabels = shouldShowCanvasOverviewLabels(camera.scale);
  const candidates: CanvasOverviewScreenCandidate[] = labels
    .map((label) => ({
      label,
      screenLeft: camera.offsetX + label.x * camera.scale,
      screenTop: camera.offsetY + label.y * camera.scale,
      screenWidth: label.width * camera.scale,
      screenHeight: label.height * camera.scale,
    }))
    .filter((candidate) => (
      candidate.screenLeft < viewport.width
      && candidate.screenTop < viewport.height
      && candidate.screenLeft + candidate.screenWidth > 0
      && candidate.screenTop + candidate.screenHeight > 0
    ));
  const nodeCandidatesByEntityId = new Map(
    candidates
      .filter((candidate) => candidate.label.kind === 'node')
      .map((candidate) => [candidate.label.entityId ?? candidate.label.id, candidate]),
  );
  const cellLabels = showNodeLabels
    ? candidates
      .filter((candidate) => candidate.label.kind === 'node')
      .map((candidate): PositionedCanvasOverviewLabel | null => {
      const left = Math.max(0, candidate.screenLeft);
      const top = Math.max(0, candidate.screenTop);
      const width = Math.min(viewport.width, candidate.screenLeft + candidate.screenWidth) - left;
      const height = Math.min(viewport.height, candidate.screenTop + candidate.screenHeight) - top;
      if (width <= 0 || height <= 0) return null;
      const label = candidate.label.label.trim() || '?';
      const fontSize = overviewCellFontSize(label, width, height);
      return {
        id: candidate.label.id,
        entityId: candidate.label.entityId ?? candidate.label.id,
        label,
        kind: candidate.label.kind,
        left,
        top,
        width,
        height,
        fontSize,
        presentation: 'cell',
      };
      })
      .filter((label): label is PositionedCanvasOverviewLabel => !!label)
    : [];
  const badgeCandidates = candidates
    .filter((candidate) => candidate.label.kind === 'group')
    .sort((left, right) => (
      right.label.priority - left.label.priority
      || right.screenWidth * right.screenHeight - left.screenWidth * left.screenHeight
    ));
  const badgeLabels: PositionedCanvasOverviewLabel[] = [];

  for (const candidate of badgeCandidates) {
    const entityId = candidate.label.entityId ?? candidate.label.id;
    const nativeCandidate = nodeCandidatesByEntityId.get(entityId);
    if (
      !showNodeLabels
      && nativeCandidate
      && nativeCanvasTitleIsVisible(nativeCandidate, camera.scale, viewport)
    ) {
      continue;
    }
    const visibleLeft = Math.max(0, candidate.screenLeft);
    const visibleRight = Math.min(viewport.width, candidate.screenLeft + candidate.screenWidth);
    const availableWidth = Math.min(OVERVIEW_LABEL_MAX_WIDTH, visibleRight - visibleLeft - 12);
    if (availableWidth < OVERVIEW_LABEL_MIN_WIDTH) continue;
    const width = Math.min(
      availableWidth,
      Math.max(OVERVIEW_LABEL_MIN_WIDTH, estimatedOverviewLabelWidth(candidate.label.label)),
    );
    const base: PositionedCanvasOverviewLabel = {
      id: candidate.label.id,
      entityId,
      label: candidate.label.label,
      kind: candidate.label.kind,
      left: 0,
      top: 0,
      width,
      height: OVERVIEW_LABEL_MIN_HEIGHT,
      fontSize: 10,
      presentation: 'badge',
    };
    const position = overviewBadgePositions(
      candidate.screenLeft,
      candidate.screenTop,
      candidate.screenWidth,
      candidate.screenHeight,
      width,
      viewport,
    ).find((candidatePosition) => !badgeLabels.some((current) => overviewLabelsOverlap(
      current,
      { ...base, ...candidatePosition },
    )));
    if (!position) continue;
    badgeLabels.push({ ...base, ...position });
  }

  const badgeEntityIds = new Set(badgeLabels.map((label) => label.entityId));
  return [
    ...cellLabels.filter((label) => !badgeEntityIds.has(label.entityId)),
    ...badgeLabels,
  ];
}

export function fitCanvasContent(
  viewport: CanvasSize,
  content: CanvasSize,
  padding = CONTENT_PADDING,
  minimumScale = MIN_SCALE,
): CameraState {
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const scale = clampCanvasScale(Math.max(
    minimumScale,
    Math.min(
      availableWidth / Math.max(1, content.width),
      availableHeight / Math.max(1, content.height),
      1,
    ),
  ));

  return {
    offsetX: (viewport.width - content.width * scale) / 2,
    offsetY: (viewport.height - content.height * scale) / 2,
    scale,
  };
}

export function fitReadableCanvasContent(
  viewport: CanvasSize,
  content: CanvasSize,
  _focusTarget?: CanvasFocusTarget,
): CameraState {
  const camera = fitCanvasContent(viewport, content, CONTENT_PADDING, READABLE_SCALE);
  const availableWidth = Math.max(1, viewport.width - CONTENT_PADDING * 2);
  const availableHeight = Math.max(1, viewport.height - CONTENT_PADDING * 2);
  return {
    offsetX: content.width * camera.scale > availableWidth
      ? CONTENT_PADDING
      : camera.offsetX,
    offsetY: content.height * camera.scale > availableHeight
      ? CONTENT_PADDING
      : camera.offsetY,
    scale: camera.scale,
  };
}

export function focusCanvasTarget(
  viewport: CanvasSize,
  target: CanvasFocusTarget,
): CameraState {
  const scale = clampCanvasScale(Math.min(
    Math.max(1, viewport.width - CONTENT_PADDING * 2) / FOCUS_CONTEXT_WIDTH,
    Math.max(1, viewport.height - CONTENT_PADDING * 2) / FOCUS_CONTEXT_HEIGHT,
    1.35,
  ));

  return {
    offsetX: viewport.width / 2 - target.x * scale,
    offsetY: viewport.height / 2 - target.y * scale,
    scale,
  };
}

export function zoomCanvasAtPoint(
  camera: CameraState,
  pointX: number,
  pointY: number,
  nextScale: number,
): CameraState {
  const scale = clampCanvasScale(nextScale);
  const worldX = (pointX - camera.offsetX) / camera.scale;
  const worldY = (pointY - camera.offsetY) / camera.scale;

  return {
    offsetX: pointX - worldX * scale,
    offsetY: pointY - worldY * scale,
    scale,
  };
}

