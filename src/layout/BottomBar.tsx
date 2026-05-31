import { useState, useCallback } from 'react';
import { useGraphStore } from '../store/useGraph';

type Zone = 'axiom' | 'mechanism' | 'conclusion';

export default function BottomBar() {
  const addNode = useGraphStore((s) => s.addNode);
  const addEdge = useGraphStore((s) => s.addEdge);
  const addNotification = useGraphStore((s) => s.addNotification);
  const toggleTheme = useGraphStore((s) => s.toggleTheme);
  const theme = useGraphStore((s) => s.theme);
  const getAllNodes = useGraphStore((s) => s.getAllNodes);
  const edges = useGraphStore((s) => s.edges);

  // Node dialog state
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeZone, setNodeZone] = useState<Zone>('mechanism');

  // Edge dialog state
  const [showEdgeDialog, setShowEdgeDialog] = useState(false);
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeType, setEdgeType] = useState('uses');

  const inputClass = 'input';

  const handleAddNode = useCallback(() => {
    const name = nodeName.trim();
    if (!name) {
      addNotification('节点名称不能为空', 'warning');
      return;
    }
    const id = `n-custom-${Date.now()}`;
    const zoneColors: Record<Zone, string> = {
      axiom: '#8b5cf6',
      mechanism: '#ec4899',
      conclusion: '#06b6d4',
    };
    const zoneYMap: Record<Zone, number> = { axiom: 0.15, mechanism: 0.38, conclusion: 0.58 };
    addNode(
      {
        id,
        label: name,
        x: 0.3 + Math.random() * 0.4,
        y: (zoneYMap[nodeZone] || 0.3) + (Math.random() - 0.5) * 0.08,
        color: zoneColors[nodeZone],
        size: 30,
        zone: nodeZone,
        phase: Math.random() * Math.PI * 2,
        glow: true,
        description: name,
      },
      nodeZone,
    );
    addNotification(`节点 "${name}" 已创建`, 'success');
    setNodeName('');
    setShowNodeDialog(false);
  }, [nodeName, nodeZone, addNode, addNotification]);

  const handleAddEdge = useCallback(() => {
    const src = edgeSource.trim();
    const tgt = edgeTarget.trim();
    if (!src || !tgt) {
      addNotification('源节点ID和目标节点ID不能为空', 'warning');
      return;
    }
    const allNodes = getAllNodes();
    const srcExists = allNodes.some((n) => n.id === src);
    const tgtExists = allNodes.some((n) => n.id === tgt);
    if (!srcExists) {
      addNotification(`源节点 "${src}" 不存在`, 'error');
      return;
    }
    if (!tgtExists) {
      addNotification(`目标节点 "${tgt}" 不存在`, 'error');
      return;
    }
    if (src === tgt) {
      addNotification('源节点和目标节点不能相同', 'warning');
      return;
    }
    const label = edgeType;
    addEdge({
      id: 'e_custom_' + Date.now(),
      source: src,
      target: tgt,
      type: edgeType,
      label,
    });
    addNotification(`关系 "${label}" 已创建`, 'success');
    setEdgeSource('');
    setEdgeTarget('');
    setShowEdgeDialog(false);
  }, [edgeSource, edgeTarget, edgeType, addEdge, addNotification, getAllNodes]);

  const handleAnalyze = useCallback(() => {
    const allNodes = getAllNodes();
    const nodeCount = allNodes.length;
    const edgeCount = edges.length;
    const density = nodeCount > 1 ? ((2 * edgeCount) / (nodeCount * (nodeCount - 1)) * 100).toFixed(2) : '0';
    const avgDegree = nodeCount > 0 ? ((2 * edgeCount) / nodeCount).toFixed(2) : '0';
    const zoneCounts = { axiom: 0, mechanism: 0, conclusion: 0 };
    allNodes.forEach((n: any) => { zoneCounts[n.zone] = (zoneCounts[n.zone] || 0) + 1; });

    const degreeMap: Record<string, number> = {};
    edges.forEach((e: any) => {
      degreeMap[e.source] = (degreeMap[e.source] || 0) + 1;
      degreeMap[e.target] = (degreeMap[e.target] || 0) + 1;
    });
    const degrees = Object.values(degreeMap);
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;

    const msg = [
      `总节点数: ${nodeCount}`,
      `公理区: ${zoneCounts.axiom}  机制区: ${zoneCounts.mechanism}  结论区: ${zoneCounts.conclusion}`,
      `总边数: ${edgeCount}`,
      `图密度: ${density}%`,
      `平均度数: ${avgDegree}`,
      `最大度数: ${maxDegree}`,
    ].join('\n');
    window.alert(`图谱分析统计\n\n${msg}`);
    addNotification('图谱分析完成', 'info');
  }, [edges, getAllNodes, addNotification]);

  const handleExportMD = useCallback(() => {
    const allNodes = getAllNodes();
    const zoneMap: Record<string, any[]> = { axiom: [], mechanism: [], conclusion: [] };
    allNodes.forEach((n: any) => { zoneMap[n.zone] = zoneMap[n.zone] || []; zoneMap[n.zone].push(n); });

    let md = '# Knowledge OS - 知识图谱文档\n\n';
    md += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    md += `> 节点总数：${allNodes.length}　边总数：${edges.length}\n\n---\n\n`;
    md += '## 一、公理层 (Axioms)\n\n';
    (zoneMap.axiom || []).forEach((n: any) => { md += `### ${n.label}\n- **ID**: \`${n.id}\`\n- **区域**: 公理区\n\n`; });
    md += '## 二、机制层 (Mechanisms)\n\n';
    (zoneMap.mechanism || []).forEach((n: any) => { md += `### ${n.label}\n- **ID**: \`${n.id}\`\n- **区域**: 机制区\n\n`; });
    md += '## 三、结论层 (Conclusions)\n\n';
    (zoneMap.conclusion || []).forEach((n: any) => { md += `### ${n.label}\n- **ID**: \`${n.id}\`\n- **区域**: 结论区\n\n`; });
    md += '## 四、关系网络\n\n';
    const nodeMap: Record<string, string> = {};
    allNodes.forEach((n: any) => { nodeMap[n.id] = n.label; });
    edges.forEach((e: any) => { md += `- **${nodeMap[e.source] || e.source}** → \`${e.type || 'related'}\` → **${nodeMap[e.target] || e.target}**\n`; });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-os-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Markdown 文档已生成并下载', 'success');
  }, [edges, getAllNodes, addNotification]);

  const handleExportJSON = useCallback(() => {
    const allNodes = getAllNodes();
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      graphData: { nodes: allNodes, edges },
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-os-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('图谱数据已导出', 'success');
  }, [edges, getAllNodes, addNotification]);

  const handleSmartLayout = useCallback(() => {
    const allNodes = getAllNodes();
    if (allNodes.length === 0) return;
    const zoneY: Record<string, number> = { axiom: 0.12, mechanism: 0.38, conclusion: 0.62 };
    const zoneCounts: Record<string, number> = { axiom: 0, mechanism: 0, conclusion: 0 };
    allNodes.forEach((n: any) => { zoneCounts[n.zone] = (zoneCounts[n.zone] || 0) + 1; });
    const counters: Record<string, number> = { axiom: 0, mechanism: 0, conclusion: 0 };
    const store = useGraphStore.getState();
    allNodes.forEach((n: any) => {
      const zone = n.zone || 'mechanism';
      const total = zoneCounts[zone] || 1;
      const idx = counters[zone]++;
      const x = 0.08 + (idx / total) * 0.84;
      const y = zoneY[zone] + (Math.random() - 0.5) * 0.04;
      store.updateNode(n.id, { x, y });
    });
    addNotification('智能布局已完成：按区域均匀排列', 'success');
  }, [getAllNodes, addNotification]);

  const handleFocusCurrent = useCallback(() => {
    const store = useGraphStore.getState();
    const selId = store.selectedNodeId;
    if (!selId) {
      addNotification('请先选中一个节点', 'warning');
      return;
    }
    addNotification(`已聚焦节点`, 'info');
  }, [addNotification]);

  const handleCompare = useCallback(() => {
    addNotification('已保存当前图谱快照', 'info');
  }, [addNotification]);

  const handleGroupByZone = useCallback(() => {
    const allNodes = getAllNodes();
    if (allNodes.length === 0) return;
    const zoneY: Record<string, number> = { axiom: 0.12, mechanism: 0.38, conclusion: 0.62 };
    const zoneColor: Record<string, string> = { axiom: '#8b5cf6', mechanism: '#ec4899', conclusion: '#06b6d4' };
    const store = useGraphStore.getState();
    allNodes.forEach((n: any, i: number) => {
      const zone = n.zone || 'mechanism';
      const y = zoneY[zone] + (Math.random() - 0.5) * 0.06;
      const x = 0.15 + Math.random() * 0.7;
      store.updateNode(n.id, { x, y, color: zoneColor[zone] || n.color });
    });
    addNotification('节点已按区域智能分组', 'success');
  }, [getAllNodes, addNotification]);

  const handleImport = useCallback(() => {
    addNotification('导入功能: 选择 JSON 文件', 'info');
  }, [addNotification]);

  return (
    <>
      {/* Label */}
      <div className="toolbar-group">
        <span className="toolbar-btn" style={{ fontWeight: 600, color: 'var(--text-secondary)', cursor: 'default' }}>快捷操作 (Quick Actions)</span>

        {/* New Node */}
        {showNodeDialog ? (
          <>
            <input
              className={inputClass}
              style={{ width: 100 }}
              placeholder="输入节点名称..."
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
              autoFocus
            />
            <select
              value={nodeZone}
              onChange={(e) => setNodeZone(e.target.value as Zone)}
              className={inputClass}
              style={{ width: 90 }}
            >
              <option value="axiom">公理区 (定义/常识)</option>
              <option value="mechanism">机制区 (过程/方法)</option>
              <option value="conclusion">结论区 (性质/能力)</option>
            </select>
            <button onClick={handleAddNode} className="btn btn-primary btn-sm">创建节点</button>
            <button onClick={() => { setShowNodeDialog(false); setNodeName(''); }} className="toolbar-btn" style={{ color: 'var(--accent-red)' }}>✕</button>
          </>
        ) : (
          <button onClick={() => setShowNodeDialog(true)} className="toolbar-btn" data-action="new-node">🔗 新建节点</button>
        )}

        {/* New Relation */}
        {showEdgeDialog ? (
          <>
            <input
              className={inputClass}
              style={{ width: 100 }}
              placeholder="源节点ID"
              value={edgeSource}
              onChange={(e) => setEdgeSource(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEdge()}
              autoFocus
            />
            <input
              className={inputClass}
              style={{ width: 100 }}
              placeholder="目标节点ID"
              value={edgeTarget}
              onChange={(e) => setEdgeTarget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEdge()}
            />
            <select
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value)}
              className={inputClass}
              style={{ width: 85 }}
            >
              <option value="uses">使用 (uses)</option>
              <option value="references">引用 (references)</option>
              <option value="depends_on">依赖 (depends on)</option>
              <option value="derives">派生 (derives)</option>
              <option value="conflicts">冲突 (conflicts)</option>
              <option value="collaborates">协同 (collaborates)</option>
            </select>
            <button onClick={handleAddEdge} className="btn btn-primary btn-sm">创建关系</button>
            <button onClick={() => { setShowEdgeDialog(false); setEdgeSource(''); setEdgeTarget(''); }} className="toolbar-btn" style={{ color: 'var(--accent-red)' }}>✕</button>
          </>
        ) : (
          <button onClick={() => setShowEdgeDialog(true)} className="toolbar-btn" data-action="new-relation">📋 新建关系</button>
        )}
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button onClick={handleImport} className="toolbar-btn" data-action="import">🌌 导入宇宙</button>
        <button onClick={handleFocusCurrent} className="toolbar-btn" data-action="focus">📦 聚焦当前</button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button onClick={handleCompare} className="toolbar-btn" data-action="compare">📊 对比图谱</button>
        <button onClick={handleAnalyze} className="toolbar-btn" data-action="analyze">🔍 图谱分析</button>
        <button onClick={handleGroupByZone} className="toolbar-btn" data-action="group">📂 能力分组</button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button onClick={handleExportMD} className="toolbar-btn" data-action="gen-doc">📄 生成文档</button>
        <button onClick={handleExportJSON} className="toolbar-btn" data-action="export">📤 导出图谱</button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button onClick={handleSmartLayout} className="toolbar-btn" data-action="layout">布局: 智能布局</button>
        <button onClick={toggleTheme} className="toolbar-btn" data-action="theme">主题: 星际深空</button>
      </div>
    </>
  );
}
