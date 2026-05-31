import { useState } from 'react';
import { useGraphStore } from '../store/useGraph';

interface TreeNode {
  id: string;
  name: string;
  count: number;
  icon: string;
  expanded?: boolean;
  active?: boolean;
  children?: TreeNode[];
}

const treeData: TreeNode = {
  id: 'universe', name: 'Universe', count: 128523, icon: '🌌', expanded: true,
  children: [{
    id: 'cs', name: 'Computer Science', count: 48651, icon: '💻', expanded: true,
    children: [{
      id: 'backend', name: 'Backend', count: 24510, icon: '⚙️', expanded: true,
      children: [{
        id: 'database', name: 'Database', count: 8742, icon: '🗄️', expanded: true,
        children: [{
          id: 'mysql', name: 'MySQL', count: 1293, icon: '🐬', expanded: true,
          children: [
            { id: 'mysql-base', name: '基础概念', count: 33, icon: '📘' },
            { id: 'mysql-storage', name: '存储引擎', count: 98, icon: '💾' },
            { id: 'mysql-index', name: '索引', count: 156, icon: '📑' },
            { id: 'mysql-tx', name: '事务', count: 87, icon: '🔄', expanded: true,
              children: [
                { id: 'acid', name: 'ACID', count: 15, icon: '⚗️' },
                { id: 'isolation', name: '隔离级别', count: 24, icon: '🔒' },
                { id: 'mvcc', name: 'MVCC', count: 18, icon: '👁️', active: true, expanded: true,
                  children: [
                    { id: 'mvcc-undo', name: 'Undo Log', count: 3, icon: '📝' },
                    { id: 'mvcc-readview', name: 'Read View', count: 4, icon: '👀' },
                    { id: 'mvcc-visibility', name: '可见性判断', count: 5, icon: '🔍' },
                    { id: 'mvcc-lock', name: '锁机制', count: 3, icon: '🔐' },
                    { id: 'mvcc-deadlock', name: '死锁检测', count: 2, icon: '⚠️' },
                    { id: 'mvcc-replication', name: '主从复制', count: 1, icon: '📡' },
                  ]
                }
              ]
            },
          ]
        }]
      }]
    }]
  }]
};

const PERSPECTIVES = [
  { id: 'tx', name: '事务视角', nameEn: 'Transactional', color: '#8b5cf6' },
  { id: 'storage', name: '存储视角', nameEn: 'Storage', color: '#ec4899' },
  { id: 'perf', name: '性能视角', nameEn: 'Performance', color: '#06b6d4' },
  { id: 'arch', name: '架构视角', nameEn: 'Architecture', color: '#f59e0b' },
  { id: 'time', name: '时间线视角', nameEn: 'Timeline', color: '#10b981' },
  { id: 'semantic', name: '语义视角', nameEn: 'Semantic', color: '#6366f1' },
  { id: 'logic', name: '逻辑视角', nameEn: 'Logical', color: '#ef4444' },
  { id: 'graph', name: '图视角', nameEn: 'Graph', color: '#14b8a6' },
];

const TreeItem = ({ node, level = 0, onSelect }: { node: TreeNode; level?: number; onSelect?: (node: TreeNode) => void }) => {
  const [isOpen, setIsOpen] = useState(level < 5);
  const hasChildren = !!(node.children && node.children.length > 0);

  return (
    <div>
      <div
        className={`tree-item ${node.active ? 'selected' : ''}`}
        onClick={() => { if (hasChildren) setIsOpen(!isOpen); onSelect?.(node); }}
        style={{
          display: 'flex', alignItems: 'center', padding: '3px 6px', cursor: 'pointer',
          borderRadius: '4px', fontSize: 11, marginBottom: 1, marginLeft: level * 10,
          color: node.active ? '#aee7ff' : '#8a98ba',
          background: node.active ? 'rgba(110,231,255,0.1)' : 'transparent',
        }}
      >
        <span style={{ marginRight: 4, opacity: hasChildren ? 1 : 0, fontSize: 8, width: 10 }}>{isOpen ? '▼' : '▶'}</span>
        <span style={{ marginRight: 4, fontSize: 12 }}>{node.icon}</span>
        <span style={{ flex: 1 }}>{node.name}</span>
        <span style={{ opacity: 0.4, fontSize: 9 }}>{node.count.toLocaleString()}</span>
      </div>
      {hasChildren && isOpen && (
        <div>{node.children!.map(child => <TreeItem key={child.id} node={child} level={level + 1} onSelect={onSelect} />)}</div>
      )}
    </div>
  );
};

export default function UniverseTree() {
  const setSelectedNode = useGraphStore(s => s.setSelectedNode);
  const addNotification = useGraphStore(s => s.addNotification);
  const currentPerspective = useGraphStore(s => s.currentPerspective);
  const setPerspective = useGraphStore(s => s.setCurrentPerspective);
  const [search, setSearch] = useState('');

  const handleSelect = (node: TreeNode) => {
    const nodeIdMap: Record<string, string> = {
      'mvcc-undo': 'n-undo', 'mvcc-readview': 'n-readview', 'mvcc-visibility': 'n-visibility',
      'mvcc-lock': 'n-locks', 'mvcc-deadlock': 'n-deadlock', 'mvcc-replication': 'n-replication',
      'mvcc': 'n-mvcc', 'acid': 'n-acid', 'isolation': 'n-isolation',
      'mysql-tx': 'n-transaction', 'mysql-index': 'n-index',
    };
    const mappedId = nodeIdMap[node.id];
    if (mappedId) {
      setSelectedNode(mappedId);
      addNotification(`已选中: ${node.name}`, 'info');
    }
  };

  return (
    <div style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#dfe7f5', marginBottom: '6px', borderBottom: '1px solid rgba(120,160,255,0.12)', paddingBottom: '6px' }}>
        📂 宇宙目录 <span style={{ color: '#8a98ba', fontWeight: 400, fontSize: 9 }}>(Universe Tree)</span>
      </div>

      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <span style={{ position: 'absolute', left: 8, top: 5, fontSize: 11 }}>🔍</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索知识..."
          style={{
            width: '100%', padding: '4px 8px 4px 24px', borderRadius: '6px',
            border: '1px solid rgba(120,160,255,0.15)', background: 'rgba(10,16,32,0.6)',
            color: '#dfe7f5', fontSize: 11, outline: 'none'
          }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }} className="universe-tree">
        <TreeItem node={treeData} level={0} onSelect={handleSelect} />
      </div>

      {/* Perspectives */}
      <div style={{ borderTop: '1px solid rgba(120,160,255,0.12)', paddingTop: '8px', marginTop: '4px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#dfe7f5', marginBottom: '6px' }}>
          🔮 多维投影面 <span style={{ color: '#8a98ba', fontWeight: 400, fontSize: 9 }}>(Perspectives)</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {PERSPECTIVES.map(p => (
            <button key={p.id}
              onClick={() => { setPerspective(currentPerspective?.id === p.id ? null : p); addNotification(`视角: ${p.name}`, 'info'); }}
              style={{
                padding: '2px 8px', borderRadius: '10px', border: `1px solid ${p.color}40`,
                background: currentPerspective?.id === p.id ? `${p.color}20` : 'transparent',
                color: currentPerspective?.id === p.id ? p.color : '#8a98ba',
                fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >{p.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}