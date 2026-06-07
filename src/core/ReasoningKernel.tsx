import { useGraphStore } from '../store/useGraph';
import DimensionCanvas from './DimensionCanvas';
import SubsystemStrip from './SubsystemStrip';

/** 中心主镜头：所有树节点统一为知识节点，不做文件夹/节点区分 */
export default function ReasoningKernel() {
  const nodePool = useGraphStore((s) => s.nodePool);
  const focusNodeId = useGraphStore((s) => s.focusNodeId);

  const focusNode = focusNodeId ? nodePool[focusNodeId] : null;

  if (!focusNode) {
    return (
      <div className="kernel-shell kernel-shell--empty">
        <div className="kernel-empty-icon">🌌</div>
        <span>选中左侧目录节点</span>
        <span className="kernel-empty-sub">此处显示知识视图</span>
      </div>
    );
  }

  const viewDims = focusNode.viewDimensions;

  return (
    <div className="kernel-shell">
      <div className="kernel-shell-main">
        <DimensionCanvas node={focusNode} viewDimensions={viewDims ?? []} />
      </div>

      <SubsystemStrip focusNodeId={focusNodeId} />
    </div>
  );
}
