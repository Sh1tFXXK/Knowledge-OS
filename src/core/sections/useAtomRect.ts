import { useLayoutEffect, useRef } from 'react';
import type { RegisterAtomRect } from './SectionRenderer';

export function useAtomRect<T extends HTMLElement = HTMLDivElement>(
  nodeId: string,
  registerAtomRect: RegisterAtomRect,
) {
  const ref = useRef(null) as { current: T | null };

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => registerAtomRect(nodeId, element.getBoundingClientRect());
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('scroll', update, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update, true);
      registerAtomRect(nodeId, null);
    };
  }, [nodeId, registerAtomRect]);

  return ref;
}
