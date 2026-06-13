import type { AtomBinding, KnowledgeNode, SectionLayout, ViewDimension, ViewSection } from '../../types';
import { GridSection } from './GridSection';
import { StackSection } from './StackSection';
import { TreeSection } from './TreeSection';
import { ChainSection } from './ChainSection';
import { MatrixSection } from './MatrixSection';

export type AtomRectMap = Map<string, DOMRect>;

export type RegisterAtomRect = (nodeId: string, rect: DOMRect | null) => void;

export interface SectionProps {
  section: ViewSection;
  atoms: AtomBinding[];
  dimension: ViewDimension;
  nodePool: Record<string, KnowledgeNode>;
  selectedNodeId: string | null;
  groupSelectedIds: Set<string>;
  onAtomClick: (nodeId: string) => void;
  onAtomEdit: (sectionId: string, nodeId?: string) => void;
  onToggleGroupAtom: (nodeId: string) => void;
  registerAtomRect: RegisterAtomRect;
}

type SectionComponent = (props: SectionProps) => any;

export const LAYOUT_RENDERERS: Record<SectionLayout, SectionComponent> = {
  stack: StackSection,
  grid: GridSection,
  tree: TreeSection,
  chain: ChainSection,
  matrix: MatrixSection,
};

export function SectionRenderer(props: SectionProps) {
  const Renderer = LAYOUT_RENDERERS[props.section.layout];
  return <Renderer {...props} />;
}
