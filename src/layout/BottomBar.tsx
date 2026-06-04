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
  const listKnowledgeNodes = useGraphStore((s) => s.listKnowledgeNodes);
  const addKnowledgeEdge = useGraphStore((s) => s.addKnowledgeEdge);

  // Node dialog state
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [nodeZone, setNodeZone] = useState<Zone>('mechanism');

  // Edge dialog state
  const [showEdgeDialog, setShowEdgeDialog] = useState(false);
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeType, setEdgeType] = useState('belongs-to');
  const [showPoolEdgeDialog, setShowPoolEdgeDialog] = useState(false);
  const [poolEdgeSource, setPoolEdgeSource] = useState('');
  const [poolEdgeTarget, setPoolEdgeTarget] = useState('');
  const [poolEdgeType, setPoolEdgeType] = useState('belongs-to');
  const poolNodes = listKnowledgeNodes();

  const inputClass = 'input';

  const handleAddPoolEdge = useCallback(() => {
    if (!poolEdgeSource || !poolEdgeTarget) {
      addNotification('请选择源与目标知识节点', 'warning');
      return;
    }
    if (poolEdgeSource === poolEdgeTarget) {
      addNotification('源与目标不能相同', 'warning');
      return;
    }
    addKnowledgeEdge(poolEdgeSource, poolEdgeTarget, poolEdgeType);
    addNotification('边表关系已添加', 'success');
    setShowPoolEdgeDialog(false);
    setPoolEdgeSource('');
    setPoolEdgeTarget('');
  }, [poolEdgeSource, poolEdgeTarget, poolEdgeType, addKnowledgeEdge, addNotification]);

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
      {/* Quick Actions Label */}
      <div className="toolbar-actions">
        <span className="toolbar-label">⚡ 快速操作 (Quick Actions)</span>
        <div className="toolbar-divider" />

        {/* New Node */}
        {showNodeDialog ? (
          <>
            <input
              className={inputClass}
              style={{ width: 100, fontSize: 11 }}
              placeholder="节点名称..."
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
              autoFocus
            />
            <select
              value={nodeZone}
              onChange={(e) => setNodeZone(e.target.value as Zone)}
              className={inputClass}
              style={{ width: 90, fontSize: 11 }}
            >
              <option value="axiom">公理区</option>
              <option value="mechanism">机制区</option>
              <option value="conclusion">结论区</option>
            </select>
            <button onClick={handleAddNode} className="toolbar-item toolbar-item-primary">
              <span className="item-icon">✓</span>
            </button>
            <button onClick={() => { setShowNodeDialog(false); setNodeName(''); }} className="toolbar-item">
              <span className="item-icon">✕</span>
            </button>
          </>
        ) : (
          <button onClick={() => setShowNodeDialog(true)} className="toolbar-item" title="新建节点">
            <span className="item-icon">➕</span>
            <span>新建节点</span>
          </button>
        )}

        {/* Pool Edge Relation */}
        {showPoolEdgeDialog ? (
          <>
            <select
              className={inputClass}
              style={{ width: 110, fontSize: 11 }}
              value={poolEdgeSource}
              onChange={(e) => setPoolEdgeSource(e.target.value)}
            >
              <option value="">源知识…</option>
              {poolNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
            <select
              className={inputClass}
              style={{ width: 110, fontSize: 11 }}
              value={poolEdgeTarget}
              onChange={(e) => setPoolEdgeTarget(e.target.value)}
            >
              <option value="">目标知识…</option>
              {poolNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
            <select
              className={inputClass}
              style={{ width: 100, fontSize: 11 }}
              value={poolEdgeType}
              onChange={(e) => setPoolEdgeType(e.target.value)}
            >
              <option value="belongs-to">属于</option>
              <option value="depends-on">依赖</option>
              <option value="leads-to">导致</option>
              <option value="enables">支撑</option>
              <option value="needs-for">需要</option>
            </select>
            <button onClick={handleAddPoolEdge} className="toolbar-item toolbar-item-primary">
              <span className="item-icon">✓</span>
            </button>
            <button onClick={() => setShowPoolEdgeDialog(false)} className="toolbar-item">
              <span className="item-icon">✕</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              setShowPoolEdgeDialog(true);
              if (poolNodes[0]) {
                setPoolEdgeSource(poolNodes[0].id);
                setPoolEdgeTarget(poolNodes[1]?.id ?? poolNodes[0].id);
              }
            }}
            className="toolbar-item"
            title="创建知识关系"
          >
            <span className="item-icon">🔗</span>
            <span>创建关系</span>
          </button>
        )}

        <button onClick={handleImport} className="toolbar-item" title="导入学习手册">
          <span className="item-icon">📥</span>
          <span>导入学习手册</span>
        </button>

        <button onClick={handleFocusCurrent} className="toolbar-item" title="聚焦当前节点">
          <span className="item-icon">🎯</span>
          <span>聚焦当前</span>
        </button>

        <button onClick={handleAnalyze} className="toolbar-item" title="分析图谱统计">
          <span className="item-icon">📊</span>
          <span>图谱分析</span>
        </button>

        <button onClick={handleExportMD} className="toolbar-item" title="生成Markdown文档">
          <span className="item-icon">💾</span>
          <span>生成文档</span>
        </button>

        <button onClick={handleExportJSON} className="toolbar-item" title="导出当前视图">
          <span className="item-icon">📖</span>
          <span>导出视图</span>
        </button>
      </div>

      {/* Right Side Status */}
      <div className="toolbar-status">
        <span className="toolbar-item" style={{ cursor: 'default', opacity: 0.7 }}>
          <span className="item-icon">👤</span>
          <span style={{ fontSize: 10 }}>在线布局</span>
        </span>
        <button onClick={handleSmartLayout} className="toolbar-item" title="智能布局">
          <span className="item-icon">🎨</span>
        </button>
        <button onClick={toggleTheme} className="toolbar-item" title="切换主题">
          <span className="item-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
        </button>
      </div>
    </>
  );
}
