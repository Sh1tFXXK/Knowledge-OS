/**
 * 给所有没有 nodeRef 但有 children 的 tree 节点自动生成知识节点。
 * 树中每一项都是节点，不再有"文件夹"概念。
 */
import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.resolve(__dirname, '../data');

const nodePool = JSON.parse(fs.readFileSync(path.join(dataDir, 'node-pool.json'), 'utf8')) as Record<string, any>;
const treeData = JSON.parse(fs.readFileSync(path.join(dataDir, 'tree-data.json'), 'utf8')) as any;
const questions = JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8')) as any[];
const inferenceResponses = JSON.parse(fs.readFileSync(path.join(dataDir, 'inference-responses.json'), 'utf8')) as Record<string, string>;
const subsystems = JSON.parse(fs.readFileSync(path.join(dataDir, 'subsystems.json'), 'utf8')) as any[];

function genId(): string {
  return 'n_' + Math.random().toString(36).slice(2, 10);
}

/** 为 tree node 生成知识节点 */
function ensureNodeRef(treeNode: any): string | null {
  if (treeNode.nodeRef) return treeNode.nodeRef;

  // 有 children 的，从 children 生成 viewDimensions
  if (treeNode.children && treeNode.children.length > 0) {
    const dims: any[] = [];
    const childRefs: Array<{ label: string; nodeId?: string; desc?: string; treeChildId: string }> = [];

    for (const child of treeNode.children) {
      const childNodeId = ensureNodeRef(child);
      childRefs.push({
        label: child.name,
        nodeId: childNodeId ?? undefined,
        treeChildId: child.id,
      });
    }

    // 按角色/类型分组
    const withNode = childRefs.filter(c => c.nodeId);
    const withoutNode = childRefs.filter(c => !c.nodeId);

    if (withNode.length > 0) {
      dims.push({
        id: genId(),
        name: '子项',
        color: '#8b5cf6',
        children: withNode.map(c => ({ label: c.label, nodeId: c.nodeId! })),
      });
    }
    if (withoutNode.length > 0) {
      dims.push({
        id: genId(),
        name: '子目录',
        color: '#58B2DC',
        children: withoutNode.map(c => ({ label: c.label })),
      });
    }

    const nodeId = genId();
    nodePool[nodeId] = {
      id: nodeId,
      label: treeNode.name,
      role: dims.length > 0 ? 'subsystem' : 'plain',
      dimensions: [],
      viewDimensions: dims,
      card: {
        nodeId,
        title: treeNode.name,
        tabs: [
          { id: 'def', label: '定义', content: `"${treeNode.name}" 分类目录，包含 ${withNode.length} 个知识节点和 ${withoutNode.length} 个子目录。` },
          { id: 'mech', label: '机制', content: '作为分类节点组织相关知识，不承载具体机制。' },
          { id: 'bound', label: '边界', content: '分类范围由子项定义。' },
          { id: 'source', label: '来源', content: '自动生成的分类节点。' },
        ],
      },
    };
    treeNode.nodeRef = nodeId;
    return nodeId;
  }

  // 无 children 无 nodeRef —— 生成占位节点
  const nodeId = genId();
  nodePool[nodeId] = {
    id: nodeId,
    label: treeNode.name,
    role: 'plain',
    dimensions: [],
    card: {
      nodeId,
      title: treeNode.name,
      tabs: [
        { id: 'def', label: '定义', content: `"${treeNode.name}" 待补充内容。` },
        { id: 'mech', label: '机制', content: '待补充。' },
        { id: 'bound', label: '边界', content: '待补充。' },
        { id: 'source', label: '来源', content: '待补充。' },
      ],
    },
  };
  treeNode.nodeRef = nodeId;
  return nodeId;
}

// 自顶向下处理整棵树
ensureNodeRef(treeData);

// 写回
fs.writeFileSync(path.join(dataDir, 'node-pool.json'), JSON.stringify(nodePool, null, 2));
fs.writeFileSync(path.join(dataDir, 'tree-data.json'), JSON.stringify(treeData, null, 2));
fs.writeFileSync(path.join(dataDir, 'universe-tree.json'), JSON.stringify(treeData, null, 2));

console.log('Done!');
console.log('Total nodes in pool:', Object.keys(nodePool).length);
