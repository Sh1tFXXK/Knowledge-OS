import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

/**
 * 大列表渐进渲染：先渲染前 initial 条，哨兵元素进入视口附近时自动扩容。
 * resetKey 变化（搜索词 / 过滤 / 排序）时回到初始渲染量。
 * 返回的 sentinelRef 需挂到列表末尾的哨兵元素上（应无条件渲染，保持元素稳定）。
 */
export function useProgressiveRender(
  resetKey: string,
  totalCount: number,
  initial = 200,
  step = 400,
): { renderLimit: number; sentinelRef: RefObject<HTMLDivElement | null> } {
  const [renderLimit, setRenderLimit] = useState(initial);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRenderLimit(initial);
  }, [resetKey, initial]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setRenderLimit((current) => {
          const next = current + step;
          return next > totalCount + step ? current : next;
        });
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [step, totalCount, initial]);

  return { renderLimit, sentinelRef };
}

/** 防抖值：输入高频变化（如搜索框）时延迟提交，避免每次按键都触发昂贵重算。 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
