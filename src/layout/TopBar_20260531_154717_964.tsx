import { useGraphStore } from '../store/useGraph';

const NAV_ITEMS = [
  { icon: '🌌', label: '宇宙视图', id: 'universe' },
  { icon: '⚙️', label: '系统视图', id: 'system' },
  { icon: '🔗', label: '关系视图', id: 'relation' },
  { icon: '💎', label: '能力视图', id: 'ability' },
  { icon: '📅', label: '时间线视图', id: 'timeline' },
  { icon: '📊', label: '多维视图', id: 'multi' },
  { icon: '🤖', label: 'AI 助理', id: 'ai' },
];

const TOPICS = ['并发控制', '可见性', '版本管理', '隔离策略'];

const BREADCRUMB = ['Universe', 'Computer Science', 'Backend', 'Database', 'MySQL', 'Transaction', 'MVCC'];

export default function TopBar() {
  const activeView = useGraphStore(s => s.activeView);
  const setActiveView = useGraphStore(s => s.setActiveView);
  const addNotification = useGraphStore(s => s.addNotification);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      background: 'rgba(14,20,38,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(120,160,255,0.12)', gap: '20px', height: '100%'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, color: '#fff'
        }}>K</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#dfe7f5', lineHeight: 1.2 }}>Knowledge OS</div>
          <div style={{ fontSize: 9, color: '#8a98ba', lineHeight: 1.2 }}>v3.0 Ultimate</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            onClick={() => { setActiveView(item.id); addNotification(`已切换到 ${item.label}`, 'info'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '6px', border: 'none',
              background: activeView === item.id ? 'rgba(139,92,246,0.18)' : 'transparent',
              color: activeView === item.id ? '#a78bfa' : '#8a98ba',
              fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: 12 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {BREADCRUMB.map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              fontSize: 11, color: i === BREADCRUMB.length - 1 ? '#dfe7f5' : '#8a98ba',
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}>{item}</span>
            {i < BREADCRUMB.length - 1 && <span style={{ color: '#4a5588', fontSize: 12 }}>›</span>}
          </span>
        ))}
      </div>

      {/* Topic Tabs */}
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {TOPICS.map(topic => (
          <button key={topic} style={{
            padding: '3px 10px', borderRadius: '14px', border: '1px solid rgba(120,160,255,0.2)',
            background: topic === '并发控制' ? 'rgba(139,92,246,0.2)' : 'transparent',
            color: topic === '并发控制' ? '#a78bfa' : '#8a98ba',
            fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap'
          }}>{topic}</button>
        ))}
      </div>

      {/* User */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 600, fontSize: 13, color: '#fff', flexShrink: 0
      }}>V</div>
    </header>
  );
}