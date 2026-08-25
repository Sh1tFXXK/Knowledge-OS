export function normalizeSupertag(value: string): string {
  return value.normalize('NFKC').trim().replace(/^#+/, '').trim();
}

export function supertagKey(value: string): string {
  return normalizeSupertag(value).toLowerCase();
}

export function normalizeSupertags(values: readonly string[]): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const tag = normalizeSupertag(value);
    const key = supertagKey(tag);
    if (key && !unique.has(key)) unique.set(key, tag);
  }
  return Array.from(unique.values());
}

export function hasSupertag(
  tags: readonly string[] | undefined,
  candidate: string,
): boolean {
  const candidateKey = supertagKey(candidate);
  return !!candidateKey && !!tags?.some((tag) => supertagKey(tag) === candidateKey);
}

export function areSupertagsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((tag, index) => supertagKey(tag) === supertagKey(right[index]));
}
