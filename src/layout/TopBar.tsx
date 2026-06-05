import { useGraphStore } from '../store/useGraph';
import { getTreePathNames } from '../knowledge/treeUtils';

const VIEWS = [
  { icon: '🌌', label: '宇宙视图', labelEn: 'Universe Tree', id: 'universe' },
  { icon: '🗄️', label: '节点库', labelEn: 'Node Database', id: 'database' },
  { icon: '❓', label: '问题库', labelEn: 'Question Database', id: 'questions' },
  { icon: '🔧', label: '系统视图', labelEn: 'System View', id: 'system' },
  { icon: '🔗', label: '关系视图', labelEn: 'Relation View', id: 'relation' },
  { icon: '⚡', label: '能力规则', labelEn: 'Ability Rules', id: 'ability' },
  { icon: '⏱️', label: '时间线', labelEn: 'Timeline', id: 'timeline' },
  { icon: '🎭', label: '多维共存', labelEn: 'Multi-Perspective', id: 'multi' },
];

export default function TopBar() {
  const activeView = useGraphStore((s) => s.activeView);
  const setActiveView = useGraphStore((s) => s.setActiveView);
  const treeData = useGraphStore((s) => s.treeData);
  const selectedTreeNodeId = useGraphStore((s) => s.selectedTreeNodeId);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const nodePool = useGraphStore((s) => s.nodePool);

  const breadcrumb = selectedTreeNodeId
    ? getTreePathNames(treeData, selectedTreeNodeId)
    : selectedNodeId && nodePool[selectedNodeId]
      ? [nodePool[selectedNodeId].label]
      : [treeData.name];

  return (
    <>
      {/* Logo */}
      <div className="header-logo">
        <div className="header-logo-icon">K</div>
        <div>
          <div className="header-logo-text">Knowledge OS</div>
          <div className="header-logo-version">v3.0 Ultimate</div>
        </div>
      </div>

      {/* View Tabs */}
      <nav className="header-nav">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`header-nav-item${activeView === v.id ? ' active' : ''}`}
            title={v.labelEn}
            onClick={() => setActiveView(v.id)}
          >
            <span className="nav-icon">{v.icon}</span>
            <span className="nav-label">{v.label}</span>
          </button>
        ))}
      </nav>

      {/* Breadcrumb Navigation */}
      <div className="header-breadcrumb" id="header-breadcrumb">
        {breadcrumb.map((b, i) => (
          <span key={i}>
            <span className={i === breadcrumb.length - 1 ? 'active' : ''}>{b}</span>
            {i < breadcrumb.length - 1 && <span className="sep">›</span>}
          </span>
        ))}
      </div>

      {/* Right Actions */}
      <div className="header-actions">
        <button className="btn-icon" title="搜索">
          <span>🔍</span>
        </button>
        <button className="btn-icon" title="3D模式">
          <span>🎲</span>
        </button>
        <button className="btn-icon" title="全屏">
          <span>⛶</span>
        </button>
        <button className="btn-icon" title="通知">
          <span>🔔</span>
        </button>
        <button className="btn-icon" title="设置">
          <span>⚙️</span>
        </button>
        <div className="header-user" title="Visionary">
          V
        </div>
      </div>
    </>
  );
}
