/** 每个知识作用域记住上次选择的事件（本地 UI 偏好，不属于图数据文件）。null 表示显式选择了「稳定知识」。 */
const STORAGE_KEY = 'knowledge-os:temporal-preferences';

function hasStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export type LastSelectedEventByScope = Record<string, string | null>;

export function loadLastSelectedEventByScope(): LastSelectedEventByScope {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string | null] =>
          typeof entry[0] === 'string'
          && (typeof entry[1] === 'string' || entry[1] === null),
      ),
    );
  } catch {
    return {};
  }
}

export function saveLastSelectedEvent(scopeRootId: string, eventId: string | null): void {
  if (!hasStorage() || !scopeRootId) return;
  try {
    const current = loadLastSelectedEventByScope();
    current[scopeRootId] = eventId;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // 忽略存储访问失败（隐私模式等）
  }
}

export function clearTemporalPreferences(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略存储访问失败
  }
}
