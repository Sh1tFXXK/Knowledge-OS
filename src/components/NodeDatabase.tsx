import { useState, useMemo } from 'react';
import { useGraphStore } from '../store/useGraph';
import type { KnowledgeNode } from '../types';

type ViewMode = 'table' | 'cards';
type SortBy = 'name' | 'role' | 'created' | 'dimensions';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'role' | 'dimension' | 'shared';

export default function NodeDatabase() {
  const nodePool = useGraphStore((s) => s.nodePool);
  const perspectives = useGraphStore((s) => s.perspectives);
  const openCard = useGraphStore((s) => s.openCard);
  const removeKnowledgeNode = useGraphStore((s) => s.removeKnowledgeNode);
  const updateKnowledgeNodeMeta = useGraphStore((s) => s.updateKnowledgeNodeMeta);
  const addNotification = useGraphStore((s) => s.addNotification);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDimension, setFilterDimension] = useState<string>('all');

  // 收集所有存在的维度（动态从节点中提取）
  const allDimensions = useMemo(() => {
    const dims = new Set<string>();
    Object.values(nodePool).forEach((n) => n.dimensions?.forEach((d) => dims.add(d)));
    return [...dims].sort();
  }, [nodePool]);

  // 获取所有节点
  const nodes = useMemo(() => {
    return Object.entries(nodePool).map(([id, node]) => ({
      id,
      ...node,
    }));
  }, [nodePool]);

  // 搜索和过滤
  const filteredNodes = useMemo(() => {
    let result = nodes;

    // 搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((node) =>
        node.label.toLowerCase().includes(query) ||
        node.card?.title?.toLowerCase().includes(query) ||
        node.card?.tabs?.some(tab => tab.content.toLowerCase().includes(query))
      );
    }

    // 角色过滤
    if (filterRole !== 'all') {
      result = result.filter((node) => node.role === filterRole);
    }

    // 维度过滤
    if (filterDimension !== 'all') {
      result = result.filter((node) =>
        node.dimensions?.includes(filterDimension)
      );
    }

    return result;
  }, [nodes, searchQuery, filterRole, filterDimension]);

  // 排序
  const sortedNodes = useMemo(() => {
    const sorted = [...filteredNodes];
    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.label.localeCompare(b.label, 'zh-CN');
          break;
        case 'role':
          compareValue = (a.role || '').localeCompare(b.role || '', 'zh-CN');
          break;
        case 'dimensions':
          compareValue = (a.dimensions?.length || 0) - (b.dimensions?.length || 0);
          break;
        default:
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [filteredNodes, sortBy, sortOrder]);

  // 分组
  const groupedNodes = useMemo(() => {
    if (groupBy === 'none') {
      return { '全部': sortedNodes };
    }

    const groups: Record<string, typeof sortedNodes> = {};

    sortedNodes.forEach((node) => {
      let groupKey = '未分类';

      switch (groupBy) {
        case 'role':
          groupKey = node.role === 'axiom' ? '公理'
            : node.role === 'mechanism' ? '机制'
            : node.role === 'conclusion' ? '结论'
            : node.role === 'subsystem' ? '子系统'
            : '其他';
          break;
        case 'dimension':
          const dims = node.dimensions || [];
          groupKey = dims.length > 0 ? dims[0] : '无维度';
          break;
        case 'shared':
          groupKey = node.shared ? '共享节点' : '普通节点';
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(node);
    });

    return groups;
  }, [sortedNodes, groupBy]);

  const handleNodeClick = (nodeId: string) => {
    openCard(nodeId);
    addNotification('已定位到节点', 'success');
  };

  const handleDeleteNode = (nodeId: string, label: string) => {
    if (window.confirm(`确定要删除节点"${label}"吗？这将同时删除所有引用。`)) {
      removeKnowledgeNode(nodeId);
      addNotification('节点已删除', 'success');
    }
  };

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="node-database">
      {/* 工具栏 */}
      <div className="database-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="input"
            placeholder="搜索节点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 200, fontSize: 11 }}
          />

          <select
            className="input"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ width: 100, fontSize: 11 }}
          >
            <option value="all">所有角色</option>
            <option value="axiom">公理</option>
            <option value="mechanism">机制</option>
            <option value="conclusion">结论</option>
            <option value="subsystem">子系统</option>
          </select>

          <select
            className="input"
            value={filterDimension}
            onChange={(e) => setFilterDimension(e.target.value)}
            style={{ width: 120, fontSize: 11 }}
          >
            <option value="all">所有维度</option>
            {allDimensions.map((dim) => (
              <option key={dim} value={dim}>{dim}</option>
            ))}
          </select>

          <select
            className="input"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            style={{ width: 100, fontSize: 11 }}
          >
            <option value="none">不分组</option>
            <option value="role">按角色</option>
            <option value="dimension">按维度</option>
            <option value="shared">按共享</option>
          </select>
        </div>

        <div className="toolbar-right">
          <button
            className={`btn-icon${viewMode === 'table' ? ' active' : ''}`}
            onClick={() => setViewMode('table')}
            title="表格视图"
          >
            ☰
          </button>
          <button
            className={`btn-icon${viewMode === 'cards' ? ' active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="卡片视图"
          >
            ▦
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            共 {filteredNodes.length} 个节点
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="database-content">
        {Object.entries(groupedNodes).map(([groupName, groupNodes]) => (
          <div key={groupName} className="database-group">
            {groupBy !== 'none' && (
              <div className="group-header">
                <span className="group-name">{groupName}</span>
                <span className="group-count">({groupNodes.length})</span>
              </div>
            )}

            {viewMode === 'table' ? (
              <table className="database-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                      名称 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => toggleSort('role')} style={{ cursor: 'pointer' }}>
                      角色 {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => toggleSort('dimensions')} style={{ cursor: 'pointer' }}>
                      维度 {sortBy === 'dimensions' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>标签</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {groupNodes.map((node) => (
                    <tr key={node.id} onClick={() => handleNodeClick(node.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {node.shared && <span title="共享节点">⟳</span>}
                          <span>{node.label}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge role-${node.role || 'plain'}`}>
                          {node.role === 'axiom' ? '公理'
                            : node.role === 'mechanism' ? '机制'
                            : node.role === 'conclusion' ? '结论'
                            : node.role === 'subsystem' ? '子系统'
                            : '-'}
                        </span>
                      </td>
                      <td>
                        <div className="dimension-tags">
                          {node.dimensions?.map((dim) => (
                            <span key={dim} className="dimension-tag">{dim}</span>
                          )) || '-'}
                        </div>
                      </td>
                      <td>
                        {node.tags?.length ? node.tags.join(', ') : '-'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-icon-sm"
                          onClick={() => handleDeleteNode(node.id, node.label)}
                          title="删除"
                          style={{ color: '#ef4444' }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="database-cards">
                {groupNodes.map((node) => (
                  <div
                    key={node.id}
                    className="node-card"
                    onClick={() => handleNodeClick(node.id)}
                  >
                    <div className="node-card-header">
                      <span className="node-card-title">
                        {node.shared && <span>⟳ </span>}
                        {node.label}
                      </span>
                      <button
                        className="btn-icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id, node.label);
                        }}
                        title="删除"
                        style={{ color: '#ef4444' }}
                      >
                        🗑
                      </button>
                    </div>
                    <div className="node-card-body">
                      <div className="node-card-meta">
                        <span className={`role-badge role-${node.role || 'plain'}`}>
                          {node.role === 'axiom' ? '公理'
                            : node.role === 'mechanism' ? '机制'
                            : node.role === 'conclusion' ? '结论'
                            : node.role === 'subsystem' ? '子系统'
                            : '其他'}
                        </span>
                      </div>
                      {node.dimensions && node.dimensions.length > 0 && (
                        <div className="dimension-tags">
                          {node.dimensions.map((dim) => (
                            <span key={dim} className="dimension-tag">{dim}</span>
                          ))}
                        </div>
                      )}
                      {node.card?.tabs?.[0] && (
                        <div className="node-card-preview">
                          {node.card.tabs[0].content.substring(0, 100)}
                          {node.card.tabs[0].content.length > 100 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
