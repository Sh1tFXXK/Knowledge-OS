import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Folder, Search } from 'lucide-react';
import type { TreeNode } from '../types';

export interface TreeDestination {
  id: string;
  name: string;
  path: string;
  depth: number;
}

export function collectTreeDestinations(root: TreeNode): TreeDestination[] {
  const destinations: TreeDestination[] = [];
  const visit = (node: TreeNode, parents: string[]) => {
    const path = [...parents, node.name];
    destinations.push({
      id: node.id,
      name: node.name,
      path: path.join(' / '),
      depth: parents.length,
    });
    for (const child of node.children ?? []) visit(child, path);
  };
  visit(root, []);
  return destinations;
}

interface TreeDestinationPickerProps {
  destinations: TreeDestination[];
  value: string;
  disabled?: boolean;
  onChange: (treeNodeId: string) => void;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function destinationScore(destination: TreeDestination, query: string): number {
  const name = normalizeSearch(destination.name);
  const path = normalizeSearch(destination.path);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if (path.includes(query)) return 3;
  return Number.POSITIVE_INFINITY;
}

function resultDestinations(
  destinations: TreeDestination[],
  query: string,
  selectedId: string,
): TreeDestination[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) {
    const selected = destinations.find((destination) => destination.id === selectedId);
    const initial = destinations.filter((destination) => destination.depth <= 1);
    return [...new Map([selected, ...initial]
      .filter((destination): destination is TreeDestination => Boolean(destination))
      .map((destination) => [destination.id, destination])).values()]
      .slice(0, 12);
  }

  return destinations
    .map((destination) => ({
      destination,
      score: destinationScore(destination, normalizedQuery),
    }))
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) => left.score - right.score
      || left.destination.depth - right.destination.depth
      || left.destination.path.localeCompare(right.destination.path, 'zh-CN'))
    .slice(0, 12)
    .map((item) => item.destination);
}

export default function TreeDestinationPicker({
  destinations,
  value,
  disabled = false,
  onChange,
}: TreeDestinationPickerProps) {
  const rootRef = useRef(null) as { current: HTMLDivElement | null };
  const searchRef = useRef(null) as { current: HTMLInputElement | null };
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = destinations.find((destination) => destination.id === value) ?? destinations[0];
  const results: TreeDestination[] = useMemo(
    () => resultDestinations(destinations, query, value),
    [destinations, query, value],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openPicker = () => {
    if (disabled) return;
    setQuery('');
    setIsOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  return (
    <div ref={rootRef} className="tree-destination-picker">
      <button
        type="button"
        className="tree-destination-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => isOpen ? setIsOpen(false) : openPicker()}
      >
        <Folder size={15} aria-hidden="true" />
        <span className="tree-destination-selected">
          <strong>{selected?.name ?? '选择目录'}</strong>
          <small>{selected?.path ?? '未找到目录'}</small>
        </span>
        <ChevronDown className={isOpen ? 'is-open' : ''} size={15} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="tree-destination-popover">
          <label className="tree-destination-search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              placeholder="搜索目录名称或路径"
              value={query}
              onChange={(event: { target: { value: string } }) => setQuery(event.target.value)}
            />
          </label>
          <div className="tree-destination-results" role="listbox" aria-label="项目目录">
            {results.length > 0 ? results.map((destination) => (
              <button
                key={destination.id}
                type="button"
                className={`tree-destination-option${destination.id === value ? ' is-selected' : ''}`}
                role="option"
                aria-selected={destination.id === value}
                onClick={() => {
                  onChange(destination.id);
                  setIsOpen(false);
                }}
              >
                <span>
                  <strong>{destination.name}</strong>
                  <small>{destination.path}</small>
                </span>
                {destination.id === value && <Check size={14} aria-hidden="true" />}
              </button>
            )) : (
              <div className="tree-destination-empty">没有匹配的目录</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
