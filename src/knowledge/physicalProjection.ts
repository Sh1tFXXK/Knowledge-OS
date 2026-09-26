import type { AtomBinding, ViewSection } from '../types';

/**
 * Span projection — converts a domain's own attribute keys into viewport spans.
 *
 * This is NOT part of the universal classification model. `offset`/`size`,
 * `physicalOrder`, `physicalPosition`, byte offsets, etc. are all per-domain
 * specializations. A section that wants a physical / spatial view declares
 * which atom attribute encodes position and extent (via `config.positionAttr`
 * and `config.extentAttr`); this module reads that contract and stays generic.
 *
 * Default keys (`offset` / `size`) are kept only so existing stack sections
 * keep rendering before they declare their own keys.
 */

export interface SpanConfig {
  positionKey: string;
  extentKey: string;
  total: number | null;
}

const DEFAULT_POSITION_KEY = 'offset';
const DEFAULT_EXTENT_KEY = 'size';

/** Human label for a span key, falling back to the key itself. */
export function spanKeyLabel(key: string | undefined, fallback: string): string {
  if (!key || key === DEFAULT_POSITION_KEY) return 'Offset';
  if (key === DEFAULT_EXTENT_KEY) return 'Size';
  return fallback || key;
}

/** Resolve a section's span projection contract, or null when none applies. */
export function readSpanConfig(section: ViewSection): SpanConfig {
  const positionKey = section.config?.positionAttr ?? DEFAULT_POSITION_KEY;
  const extentKey = section.config?.extentAttr ?? DEFAULT_EXTENT_KEY;
  const rawTotal = section.config?.total;
  const numericTotal = typeof rawTotal === 'string' ? Number(rawTotal) : rawTotal;
  const total = Number.isFinite(numericTotal) && (numericTotal as number) > 0
    ? (numericTotal as number)
    : null;

  return { positionKey, extentKey, total };
}

/** Read a single numeric atom attribute under a projection key. */
function numericAttr(atom: AtomBinding, key: string): number | null {
  const value = atom.attrs?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

/** Read the projected position of an atom under a span config. */
export function readPosition(atom: AtomBinding, config: SpanConfig): number | null {
  return numericAttr(atom, config.positionKey);
}

/** Read the projected extent of an atom under a span config. */
export function readExtent(atom: AtomBinding, config: SpanConfig): number | null {
  return numericAttr(atom, config.extentKey);
}
