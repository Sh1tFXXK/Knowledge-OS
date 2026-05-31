import { useGraphStore } from '../store/useGraph';
import { useState } from 'react';

export default function BottomBar() {
  const addNotification = useGraphStore(s => s.addNotification);
  const addNode = useGraphStore(s => s.addNode);
  const addEdge = useGraphStore(s => s.addEdge);
  const getAllNodes = useGraphStore(s => s.getAllNodes);
  const axioms = useGraphStore(s => s.axioms);
  const mechanisms = useGraphStore(s => s.mechanisms);
  const conclusions = useGraphStore(s => s.conclusions);
  const edges = useGraphStore(s => s.edges);
  const selectedNodeId = useGraphStore(s => s.selectedNodeId);
  const theme = useGraphStore(s => s.theme);
  const toggleTheme = useGraphStore(s => s.toggleTheme);

  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);

  const allNodes = getAllNodes();

  const handleNewNode = () => {
    const name = prompt('节点名称：');
    if (!name) return;
    const zone = prompt('区域 (axiom/mechanism/conclusion)：', 'mechanism') as any;
    const colors: Record<string, string> = { axiom: '#8b5cf6', mechanism: '#ec4899', conclusion: '#06b6d4' };
    const zoneY: Record<string, number> = { axiom: 0.12, mechanism: 0.38, conclusion: 0.62 };
    const newNode: any = {
      id: 'n_react_' + Date.now(),
      label: name,
      x: 0.2 + Math.random() * 0.6,
      y: (zoneY[zone] || 0.38) + (Math.random() - 0.5) * 0.06,
      color: colors[zone] || '#8b5cf6',
      size: 28,
      zone: zone || 'mechanism',
      phase: Math.random() * Math.PI * 2,
      glow: true,
    };
    addNode(newNode, zone || 'mechanism');
    addNotification(`节点 "${name}" 已创建`, 'success');
  };

  const handleNewRelation = () => {
    if (allNodes.length < 2) { addNotification('至少需要两个节点', 'warning'); return; }
    const sourceId = prompt('源节点ID：' + allNodes.map(n => `\n  ${n.id} (${n.label})`).join(''));
    const targetId = prompt('目标节点ID：' + allNodes.map(n => `\n  ${n.id} (${n.label})`).join(''));
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) { addNotification('源和目标不能相同', 'warning'); return; }
    if (!allNodes.find(n => n.id === sourceId) || !allNodes.find(n => n.id === targetId)) {
      addNotification('节点ID无效', 'error'); return;
    }
    const type = prompt('关系类型 (uses/references/depends_on/derives)：', 'references') || 'references';
    addEdge({
      id: 'e_react_' + Date.now(),
      source: sourceId, target: targetId,
      type, label: type
    });
    addNotification(`关系已创建`, 'success');
  };

  const handleAnalyze = () => {
    const totalNodes = allNodes.length;
    const totalEdges = edges.length;
    const density = totalNodes > 1 ? ((2 * totalEdges) / (totalNodes * (totalNodes - 1)) * 100).toFixed(2) : '0';
    const avgDegree = totalNodes > 0 ? (2 * totalEdges / totalNodes).toFixed(2) : '0';
    const msg = `节点: ${totalNodes} (公理${axioms.length}/机制${mechanisms.length}/结论${conclusions.length}) | 边: ${totalEdges} | 密度: ${density}% | 平均度: ${avgDegree}`;
    addNotification(msg, 'info');
    alert(`图谱分析\n\n${msg.replace(/\|/g, '\n')}`);
  };

  const handleExport = () => {
    const data = { axioms, mechanisms, conclusions, edges, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `knowledge-os-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    addNotification('图谱数据已导出', 'success');
  };

  const handleGenerateDoc = () => {
    let md = `# Knowledge OS - 知识图谱文档\n\n> ${new Date().toLocaleString()}\n\n`;
    md += `## 公理层\n${axioms.map(n => `- ${n.label}`).join('\n')}\n\n`;
    md += `## 机制层\n${mechanisms.map(n => `- ${n.label}`).join('\n')}\n\n`;
    md += `## 结论层\n${conclusions.map(n => `- ${n.label}`).join('\n')}\n\n`;
    md += `## 关系 (${edges.length}条)\n${edges.map(e => `- ${allNodes.find(n=>n.id===e.source)?.label||e.source} → ${allNodes.find(n=>n.id===e.target)?.label||e.target}`).join('\n')}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `knowledge-os-doc.md`; a.click();
    URL.revokeObjectURL(url);
    addNotification('文档已生成', 'success');
  };

  const TOOLS = [
    { label: '新建节点', action: handleNewNode },
    { label: '新建关系', action: handleNewRelation },
    { type: 'sep' as const },
    { label: '图谱分析', action: handleAnalyze },
    { label: '生成文档', action: handleGenerateDoc },
    { label: '导出图谱', action: handleExport },
  ];

  return (
    <footer style={{
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px',
      background: 'rgba(14,20,38,0.85)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(120,160,255,0.12)', height: '100%'
    }}>
      <span style={{ fontSize: 11, color: '#8a98ba', fontWeight: 600, marginRight: '8px' }}>快捷操作</span>
      {TOOLS.map((t, i) =>
        'type' in t && t.type === 'sep' ? (
          <div key={i} style={{ width: 1, height: 20, background: 'rgba(120,160,255,0.15)', margin: '0 4px' }} />
        ) : (
          <button key={i} onClick={'action' in t ? t.action : undefined} style={{
            padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(120,160,255,0.15)',
            background: 'transparent', color: '#a0aec0', fontSize: 11,
            cursor: 'pointer', whiteSpace: 'nowrap'
          }}>{'label' in t ? t.label : ''}</button>
        )
      )}

      <div style={{ flex: 1 }} />

      <button onClick={toggleTheme} style={{
        padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(120,160,255,0.15)',
        background: 'transparent', color: '#a0aec0', fontSize: 11, cursor: 'pointer'
      }}>
        主题: {theme === 'dark' ? '星际深空' : '明亮白昼'}
      </button>
    </footer>
  );
}