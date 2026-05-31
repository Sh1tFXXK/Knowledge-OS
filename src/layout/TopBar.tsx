import { useState } from 'react';
import { useGraphStore } from '../store/useGraph';

const VIEWS = [
  { icon: '🌌', label: '宇宙视图', id: 'universe' },
  { icon: '⚙️', label: '系统视图', id: 'system' },
  { icon: '🔗', label: '关系视图', id: 'relation' },
  { icon: '💎', label: '能力视图', id: 'ability', active: true },
  { icon: '📅', label: '时间线视图', id: 'timeline' },
  { icon: '📊', label: '多维视图', id: 'multi' },
  { icon: '🤖', label: 'AI 助理', id: 'ai' },
];

const BREADCRUMB = ['Universe', 'Computer Science', 'Backend', 'Database', 'MySQL', 'Transaction', 'MVCC'];

const TOPICS = [
  { id: 'concurrency', label: '并发控制' },
  { id: 'visibility', label: '可见性' },
  { id: 'version', label: '版本管理' },
  { id: 'isolation', label: '隔离策略' },
];

export default function TopBar() {
  const [activeTopic, setActiveTopic] = useState('concurrency');
  const activeView = useGraphStore((s) => s.activeView);
  const setActiveView = useGraphStore((s) => s.setActiveView);
  const addNotification = useGraphStore((s) => s.addNotification);

  const handleViewClick = (view: (typeof VIEWS)[0]) => {
    setActiveView(view.id);
    addNotification(`已切换到 ${view.label}`, 'info');
  };

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

      {/* View Navigation */}
      <nav className="header-nav">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className={`header-nav-item${(v.active && !activeView) || activeView === v.id ? ' active' : ''}`}
            data-view={v.id}
            onClick={() => handleViewClick(v)}
          >
            <span className="nav-icon">{v.icon}</span><span>{v.label}</span>
          </button>
        ))}
      </nav>

      {/* Breadcrumb */}
      <div className="header-breadcrumb" id="header-breadcrumb">
        {BREADCRUMB.map((b, i) => (
          <span key={i}>
            <span className={i === BREADCRUMB.length - 1 ? 'active' : ''} data-crumb={i}>{b}</span>
            {i < BREADCRUMB.length - 1 && <span className="sep">›</span>}
          </span>
        ))}
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        {/* Topic Tabs */}
        <div className="header-tab-group">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              className={`header-tab-btn${activeTopic === t.id ? ' active' : ''}`}
              data-topic={t.id}
              onClick={() => setActiveTopic(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* User Avatar */}
        <div className="header-user" title="Visionary">V</div>
      </div>
    </>
  );
}
