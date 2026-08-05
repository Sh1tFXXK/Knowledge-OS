import {
  Focus,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

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

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  ariaLabel: string;
  children: ReactNode;
  contentKey: string;
  contentSize: CanvasSize;
  focusTarget?: CanvasFocusTarget;
  overlay?: ReactNode;
  /** 提供后：左键空白拖拽变为框选，松开后回调世界坐标矩形 */
  onMarqueeSelect?: (rect: WorldRect, additive: boolean) => void;
  /** 提供后：空白双击回调世界坐标（替代默认的聚焦/适应行为） */
  onBlankDoubleClick?: (worldX: number, worldY: number) => void;
  /** 空白单击（pointerdown preventDefault 会抑制原生 click，由此回调代替） */
  onBlankClick?: () => void;
}

interface PanGesture {
  pointerId: number;
  button: number;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
  moved: boolean;
}

interface MarqueeGesture {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
}

interface BlankClickGesture {
  at: number;
  clientX: number;
  clientY: number;
}

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

interface CanvasWheelEvent {
  clientX: number;
  clientY: number;
  deltaY: number;
  preventDefault: () => void;
}

interface CanvasPointerEvent {
  button: number;
  clientX: number;
  clientY: number;
  currentTarget: HTMLDivElement;
  pointerId: number;
  target: EventTarget | null;
  shiftKey: boolean;
  preventDefault: () => void;
}

interface CanvasKeyboardEvent {
  code: string;
  key: string;
  target: EventTarget | null;
  preventDefault: () => void;
}

interface CanvasClickEvent {
  clientX: number;
  clientY: number;
  target: EventTarget | null;
  preventDefault: () => void;
  stopPropagation: () => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.4;
const CONTENT_PADDING = 52;
const FOCUS_CONTEXT_WIDTH = 520;
const FOCUS_CONTEXT_HEIGHT = 320;
const BLANK_DOUBLE_CLICK_DELAY = 360;
const BLANK_DOUBLE_CLICK_DISTANCE = 6;

export function clampCanvasScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function fitCanvasContent(
  viewport: CanvasSize,
  content: CanvasSize,
  padding = CONTENT_PADDING,
): CameraState {
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const scale = clampCanvasScale(Math.min(
    availableWidth / Math.max(1, content.width),
    availableHeight / Math.max(1, content.height),
    1,
  ));

  return {
    offsetX: (viewport.width - content.width * scale) / 2,
    offsetY: (viewport.height - content.height * scale) / 2,
    scale,
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('button, input, textarea, select, a');
}

export function IndexCanvas({
  ariaLabel,
  children,
  contentKey,
  contentSize,
  focusTarget,
  overlay,
  onMarqueeSelect,
  onBlankDoubleClick,
  onBlankClick,
}: Props) {
  const viewportRef = useRef(null) as { current: HTMLDivElement | null };
  const panGestureRef = useRef(null) as { current: PanGesture | null };
  const marqueeGestureRef = useRef(null) as { current: MarqueeGesture | null };
  const blankClickRef = useRef(null) as { current: BlankClickGesture | null };
  const spacePressedRef = useRef(false) as { current: boolean };
  const fittedContentKeyRef = useRef(null) as { current: string | null };
  const suppressClickRef = useRef(false) as { current: boolean };
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 }) as [
    CanvasSize,
    StateSetter<CanvasSize>,
  ];
  const [camera, setCamera] = useState({ offsetX: 0, offsetY: 0, scale: 1 }) as [
    CameraState,
    StateSetter<CameraState>,
  ];
  const [isPanning, setIsPanning] = useState(false) as [boolean, StateSetter<boolean>];
  const [marqueeRect, setMarqueeRect] = useState(null) as [
    { left: number; top: number; width: number; height: number } | null,
    StateSetter<{ left: number; top: number; width: number; height: number } | null>,
  ];

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const fitAll = () => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    setCamera(fitCanvasContent(viewportSize, contentSize));
  };

  const focusSelection = () => {
    if (!focusTarget || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    setCamera(focusCanvasTarget(viewportSize, focusTarget));
  };

  useEffect(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    if (fittedContentKeyRef.current === contentKey) return;
    fittedContentKeyRef.current = contentKey;
    setCamera(fitCanvasContent(viewportSize, contentSize));
  }, [contentKey, contentSize.height, contentSize.width, viewportSize.height, viewportSize.width]);

  const zoomAtViewportCenter = (factor: number) => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    setCamera((current: CameraState) => zoomCanvasAtPoint(
      current,
      viewportSize.width / 2,
      viewportSize.height / 2,
      current.scale * factor,
    ));
  };

  const handleWheel = (event: CanvasWheelEvent) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const pointX = event.clientX - rect.left;
    const pointY = event.clientY - rect.top;
    const factor = Math.exp(-event.deltaY * 0.0014);
    setCamera((current: CameraState) => zoomCanvasAtPoint(
      current,
      pointX,
      pointY,
      current.scale * factor,
    ));
  };

  const clientToWorld = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - camera.offsetX) / camera.scale,
      y: (clientY - rect.top - camera.offsetY) / camera.scale,
    };
  };

  const handlePointerDown = (event: CanvasPointerEvent) => {
    const isMiddleButton = event.button === 1;
    const isBlankPrimary = event.button === 0 && !isInteractiveTarget(event.target);
    const isSpacePrimary = event.button === 0 && spacePressedRef.current;

    // 框选模式：左键空白拖拽 = 框选（平移改用中键 / 空格+左键）
    if (isBlankPrimary && !isSpacePrimary && onMarqueeSelect) {
      viewportRef.current?.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      marqueeGestureRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
      };
      return;
    }

    if (!isMiddleButton && !isBlankPrimary && !isSpacePrimary) return;

    event.preventDefault();
    viewportRef.current?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    panGestureRef.current = {
      pointerId: event.pointerId,
      button: event.button,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: camera.offsetX,
      startOffsetY: camera.offsetY,
      moved: false,
    };
    setIsPanning(true);
  };

  const handlePointerMove = (event: CanvasPointerEvent) => {
    const marquee = marqueeGestureRef.current;
    if (marquee && marquee.pointerId === event.pointerId) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const left = Math.min(marquee.startClientX, event.clientX) - rect.left;
      const top = Math.min(marquee.startClientY, event.clientY) - rect.top;
      const width = Math.abs(event.clientX - marquee.startClientX);
      const height = Math.abs(event.clientY - marquee.startClientY);
      if (width + height > 4) marquee.moved = true;
      setMarqueeRect({ left, top, width, height });
      return;
    }
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startClientX;
    const deltaY = event.clientY - gesture.startClientY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) gesture.moved = true;
    setCamera((current: CameraState) => ({
      ...current,
      offsetX: gesture.startOffsetX + deltaX,
      offsetY: gesture.startOffsetY + deltaY,
    }));
  };

  const finishPan = (event: CanvasPointerEvent) => {
    const marquee = marqueeGestureRef.current;
    if (marquee && marquee.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      marqueeGestureRef.current = null;
      setMarqueeRect(null);
      if (marquee.moved && onMarqueeSelect) {
        blankClickRef.current = null;
        const start = clientToWorld(marquee.startClientX, marquee.startClientY);
        const end = clientToWorld(event.clientX, event.clientY);
        onMarqueeSelect({
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        }, event.shiftKey);
        // 抑制框选结束后的 click（避免触发空白清除高亮/选择）
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      } else if (!marquee.moved) {
        const now = Date.now();
        const previous = blankClickRef.current;
        const isDoubleClick = !!previous
          && now - previous.at <= BLANK_DOUBLE_CLICK_DELAY
          && Math.abs(event.clientX - previous.clientX) <= BLANK_DOUBLE_CLICK_DISTANCE
          && Math.abs(event.clientY - previous.clientY) <= BLANK_DOUBLE_CLICK_DISTANCE;
        if (isDoubleClick && onBlankDoubleClick) {
          blankClickRef.current = null;
          const world = clientToWorld(event.clientX, event.clientY);
          onBlankDoubleClick(world.x, world.y);
        } else {
          blankClickRef.current = {
            at: now,
            clientX: event.clientX,
            clientY: event.clientY,
          };
          onBlankClick?.();
        }
      }
      return;
    }
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (gesture.moved && gesture.button === 0) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    panGestureRef.current = null;
    setIsPanning(false);
  };

  const handleKeyDown = (event: CanvasKeyboardEvent) => {
    if (event.code === 'Space') {
      spacePressedRef.current = true;
      event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() !== 'f' || isInteractiveTarget(event.target)) return;
    event.preventDefault();
    if (focusTarget) focusSelection();
    else fitAll();
  };

  const detailClass = camera.scale < 0.46
    ? ' is-overview'
    : camera.scale < 0.76
      ? ' is-compact'
      : '';

  return (
    <div
      ref={viewportRef}
      className={`index-canvas${detailClass}${isPanning ? ' is-panning' : ''}`}
      tabIndex={0}
      aria-label={ariaLabel}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPan}
      onPointerCancel={finishPan}
      onKeyDown={handleKeyDown}
      onKeyUp={(event: CanvasKeyboardEvent) => {
        if (event.code === 'Space') spacePressedRef.current = false;
      }}
      onBlur={() => {
        spacePressedRef.current = false;
      }}
      onClickCapture={(event: CanvasClickEvent) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
      onDoubleClick={(event: CanvasClickEvent) => {
        if (isInteractiveTarget(event.target)) return;
        if (onBlankDoubleClick) return;
        if (focusTarget) focusSelection();
        else fitAll();
      }}
    >
      <div
        className="index-canvas-world"
        style={{
          width: contentSize.width,
          height: contentSize.height,
          transform: `translate3d(${camera.offsetX}px, ${camera.offsetY}px, 0) scale(${camera.scale})`,
        }}
      >
        {children}
      </div>

      {marqueeRect && (
        <div
          className="index-canvas-marquee"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}

      {overlay && <div className="index-canvas-overlay">{overlay}</div>}

      <div className="index-canvas-toolbar" role="toolbar" aria-label="画布控制">
        <button type="button" title="缩小" aria-label="缩小" onClick={() => zoomAtViewportCenter(0.82)}>
          <ZoomOut size={15} />
        </button>
        <output aria-label="缩放比例">{Math.round(camera.scale * 100)}%</output>
        <button type="button" title="放大" aria-label="放大" onClick={() => zoomAtViewportCenter(1.22)}>
          <ZoomIn size={15} />
        </button>
        <span className="index-canvas-toolbar-divider" />
        <button type="button" title="适应全部" aria-label="适应全部" onClick={fitAll}>
          <Maximize2 size={15} />
        </button>
        <button
          type="button"
          title="聚焦选中"
          aria-label="聚焦选中"
          disabled={!focusTarget}
          onClick={focusSelection}
        >
          <Focus size={15} />
        </button>
      </div>
    </div>
  );
}
