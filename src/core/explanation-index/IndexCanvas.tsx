import {
  Focus,
  Maximize2,
  Scan,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fitCanvasContent,
  fitReadableCanvasContent,
  focusCanvasTarget,
  positionCanvasOverviewLabels,
  shouldShowCanvasOverviewLabels,
  zoomCanvasAtPoint,
  type CanvasOverviewLabel,
  type CameraState,
  type CanvasFocusTarget,
  type CanvasSize,
} from './indexCanvasCamera';

export type { CanvasFocusTarget, CanvasOverviewLabel, CanvasSize } from './indexCanvasCamera';

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  ariaLabel: string;
  children: ReactNode;
  contentSize: CanvasSize;
  focusTarget?: CanvasFocusTarget;
  overlay?: ReactNode;
  overviewLabels?: readonly CanvasOverviewLabel[];
  onViewportSizeChange?: (size: CanvasSize) => void;
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

const BLANK_DOUBLE_CLICK_DELAY = 360;
const BLANK_DOUBLE_CLICK_DISTANCE = 6;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('button, input, textarea, select, a');
}

export function IndexCanvas({
  ariaLabel,
  children,
  contentSize,
  focusTarget,
  overlay,
  overviewLabels,
  onViewportSizeChange,
  onMarqueeSelect,
  onBlankDoubleClick,
  onBlankClick,
}: Props) {
  const viewportRef = useRef(null) as { current: HTMLDivElement | null };
  const worldRef = useRef(null) as { current: HTMLDivElement | null };
  const panGestureRef = useRef(null) as { current: PanGesture | null };
  const marqueeGestureRef = useRef(null) as { current: MarqueeGesture | null };
  const blankClickRef = useRef(null) as { current: BlankClickGesture | null };
  const spacePressedRef = useRef(false) as { current: boolean };
  const measuredViewportSizeRef = useRef(null) as { current: CanvasSize | null };
  const fittedViewportSizeRef = useRef(null) as { current: CanvasSize | null };
  const suppressClickRef = useRef(false) as { current: boolean };
  // 相机手势（滚轮缩放 / 空白拖拽平移）期间绕过 React 状态：
  // 世界内容可能有数万个 DOM 节点，逐事件 setState 会整树 reconcile。
  // 手势中只直写 transform（合成器路径），停顿后/结束时才同步回 React 状态。
  const cameraRef = useRef(null) as { current: CameraState | null };
  const cameraSyncTimerRef = useRef(null) as { current: number | null };
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
  const showOverviewLabels = shouldShowCanvasOverviewLabels(camera.scale);
  const positionedOverviewLabels = useMemo(() => positionCanvasOverviewLabels(
    overviewLabels ?? [],
    camera,
    viewportSize,
  ), [
    camera.offsetX,
    camera.offsetY,
    camera.scale,
    overviewLabels,
    viewportSize.height,
    viewportSize.width,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      const rect = viewport.getBoundingClientRect();
      const nextSize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      const measuredSize = measuredViewportSizeRef.current;
      if (measuredSize?.width === nextSize.width && measuredSize.height === nextSize.height) return;
      measuredViewportSizeRef.current = nextSize;
      setViewportSize(nextSize);
      onViewportSizeChange?.(nextSize);
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [onViewportSizeChange]);

  const applyCameraTransform = (next: CameraState) => {
    cameraRef.current = next;
    const world = worldRef.current;
    if (world) {
      world.style.transform = `translate3d(${next.offsetX}px, ${next.offsetY}px, 0) scale(${next.scale})`;
    }
  };

  // React 状态里的相机（按钮缩放、适配等）变化时同步直写 transform 与 ref
  useEffect(() => {
    applyCameraTransform(camera);
  }, [camera]);

  useEffect(() => () => {
    if (cameraSyncTimerRef.current !== null) window.clearTimeout(cameraSyncTimerRef.current);
  }, []);

  const scheduleCameraStateSync = () => {
    if (cameraSyncTimerRef.current !== null) window.clearTimeout(cameraSyncTimerRef.current);
    cameraSyncTimerRef.current = window.setTimeout(() => {
      cameraSyncTimerRef.current = null;
      setCamera(cameraRef.current ?? camera);
    }, 140);
  };

  const fitOverview = () => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    setCamera(fitCanvasContent(viewportSize, contentSize));
  };

  const fitReadable = () => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    setCamera(fitReadableCanvasContent(viewportSize, contentSize, focusTarget));
  };

  const focusSelection = () => {
    if (!focusTarget || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    setCamera(focusCanvasTarget(viewportSize, focusTarget));
  };

  useEffect(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const fittedSize = fittedViewportSizeRef.current;
    if (fittedSize?.width === viewportSize.width && fittedSize.height === viewportSize.height) return;
    const frame = window.requestAnimationFrame(() => {
      fittedViewportSizeRef.current = viewportSize;
      setCamera(fitCanvasContent(viewportSize, contentSize));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [contentSize.height, contentSize.width, viewportSize.height, viewportSize.width]);

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
    const current = cameraRef.current ?? camera;
    const next = zoomCanvasAtPoint(
      current,
      pointX,
      pointY,
      current.scale * Math.exp(-event.deltaY * 0.0014),
    );
    applyCameraTransform(next);
    scheduleCameraStateSync();
  };

  const clientToWorld = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    const cam = cameraRef.current ?? camera;
    return {
      x: (clientX - rect.left - cam.offsetX) / cam.scale,
      y: (clientY - rect.top - cam.offsetY) / cam.scale,
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
    const startCamera = cameraRef.current ?? camera;
    panGestureRef.current = {
      pointerId: event.pointerId,
      button: event.button,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: startCamera.offsetX,
      startOffsetY: startCamera.offsetY,
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
    applyCameraTransform({
      ...cameraRef.current!,
      offsetX: gesture.startOffsetX + deltaX,
      offsetY: gesture.startOffsetY + deltaY,
    });
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
    // 平移手势结束：把手势期间直写的相机同步回 React 状态（一次性渲染）
    setCamera(cameraRef.current!);
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
    else fitReadable();
  };

  const detailClass = camera.scale < 0.46
    ? ' is-overview'
    : camera.scale < 0.76
      ? ' is-compact'
      : '';

  return (
    <div
      ref={viewportRef}
      className={`index-canvas${detailClass}${showOverviewLabels ? ' has-overview-labels' : ''}${isPanning ? ' is-panning' : ''}`}
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
        else fitReadable();
      }}
    >
      <div
        ref={worldRef}
        className="index-canvas-world"
        style={{
          width: contentSize.width,
          height: contentSize.height,
          transform: `translate3d(${camera.offsetX}px, ${camera.offsetY}px, 0) scale(${camera.scale})`,
        }}
      >
        {children}
      </div>

      {positionedOverviewLabels.map((label) => (
        <div
          key={label.id}
          className={`index-canvas-overview-label is-${label.kind} is-${label.presentation}`}
          aria-hidden="true"
          style={{
            left: label.left,
            top: label.top,
            width: label.width,
            height: label.height,
            fontSize: label.fontSize,
          }}
        >
          {label.label}
        </div>
      ))}

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
        <button type="button" title="清晰适配" aria-label="清晰适配" onClick={fitReadable}>
          <Scan size={15} />
        </button>
        <button type="button" title="全览" aria-label="全览" onClick={fitOverview}>
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
