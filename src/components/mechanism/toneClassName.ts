import { VisualTone } from '../../mechanism';

export const TONE_CLASS: Record<VisualTone, string> = {
  [VisualTone.Active]: 'is-active',
  [VisualTone.Traversed]: 'is-traversed',
  [VisualTone.Mutated]: 'is-mutated',
  [VisualTone.Guarded]: 'is-guarded',
  [VisualTone.Persisted]: 'is-persisted',
  [VisualTone.Released]: 'is-released',
};

export function toneClassName(tone?: VisualTone | null): string {
  return tone ? TONE_CLASS[tone] : '';
}
