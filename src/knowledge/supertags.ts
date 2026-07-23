export function normalizeSupertag(value: string): string {
  return value.replace(/^#+/, '').trim();
}

export function normalizeSupertags(values: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const tag = normalizeSupertag(value);
    if (tag) unique.add(tag);
  }
  return Array.from(unique);
}

export function areSupertagsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((tag, index) => tag === right[index]);
}
