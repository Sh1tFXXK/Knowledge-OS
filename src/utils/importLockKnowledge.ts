/**
 * 导入 MySQL 锁机制知识到 Knowledge OS
 * 使用方式：在浏览器控制台执行 window.importLockKnowledge()
 */

import { useGraphStore } from '../store/useGraph';
import { genId } from '../knowledge/defaults';
import type { KnowledgeNode, KnowledgeEdge, Question } from '../types';

interface ImportData {
  perspectives?: Array<{
    id: string;
    name: string;
    nameEn: string;
    color: string;
    description?: string;
  }>;
  nodes: Array<{
    id: string;
    label: string;
    role?: string;
    dimensions?: string[];
    card: {
      nodeId: string;
      title: string;
      tabs: Array<{
        id: string;
        label: string;
        content: string;
      }>;
    };
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    label: string;
    dimensions?: string[];
  }>;
  questions: Array<{
    text: string;
    relatedNodeId?: string;
    answer?: string;
  }>;
}

export async function importLockKnowledge() {
  try {
    // 加载 JSON 数据
    const response = await fetch('/import-lock-knowledge-v2.json');
    const data: ImportData = await response.json();

    const store = useGraphStore.getState();

    console.log('🚀 开始导入 MySQL 锁机制知识...');

    // 0. 导入自定义维度（perspectives）
    if (data.perspectives && data.perspectives.length > 0) {
      console.log('🔮 导入自定义维度...');

      // 过滤掉已存在的维度（避免重复）
      const existingIds = new Set(store.perspectives.map(p => p.id));
      const newPerspectives = data.perspectives.filter(p => !existingIds.has(p.id));

      if (newPerspectives.length > 0) {
        const allPerspectives = [...store.perspectives, ...newPerspectives];
        useGraphStore.setState({ perspectives: allPerspectives });
        console.log(`✅ 导入了 ${newPerspectives.length} 个维度视角`);
        newPerspectives.forEach(p => {
          console.log(`   - ${p.name} (${p.nameEn}): ${p.description || ''}`);
        });
      } else {
        console.log(`⚠️ 所有维度已存在，跳过导入`);
      }
    }

    // 1. 导入节点到 nodePool
    console.log('📦 导入知识节点...');
    const importedNodes: Record<string, KnowledgeNode> = {};
    for (const node of data.nodes) {
      const knowledgeNode: KnowledgeNode = {
        id: node.id,
        label: node.label,
        role: node.role as any,
        dimensions: node.dimensions,
        card: node.card,
      };
      importedNodes[node.id] = knowledgeNode;
    }

    // 合并到现有 nodePool
    const newNodePool = { ...store.nodePool, ...importedNodes };
    useGraphStore.setState({ nodePool: newNodePool });
    console.log(`✅ 导入了 ${data.nodes.length} 个知识节点`);

    // 2. 导入边到 knowledgeEdges
    console.log('🔗 导入知识关系...');
    const importedEdges: KnowledgeEdge[] = data.edges.map(edge => ({
      id: genId('edge'),
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: edge.label,
      dimensions: edge.dimensions,
    }));

    const newEdges = [...store.knowledgeEdges, ...importedEdges];
    useGraphStore.setState({ knowledgeEdges: newEdges });
    console.log(`✅ 导入了 ${importedEdges.length} 条知识关系`);

    // 3. 导入问题到 questions
    console.log('❓ 导入问题...');
    const importedQuestions: Question[] = data.questions.map(q => ({
      id: genId('q'),
      text: q.text,
      answered: !!q.answer,
      relatedNodeId: q.relatedNodeId,
      answer: q.answer,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const newQuestions = [...store.questions, ...importedQuestions];
    useGraphStore.setState({ questions: newQuestions });
    console.log(`✅ 导入了 ${importedQuestions.length} 个问题`);

    // 4. 更新宇宙目录树 - 在 MySQL -> 事务 下添加锁机制节点
    console.log('🌳 更新宇宙目录树...');
    const treeData = store.treeData;

    // 查找 MySQL -> 事务 节点
    const findNode = (node: any, path: string[]): any => {
      if (path.length === 0) return node;
      const [first, ...rest] = path;
      const child = node.children?.find((c: any) => c.id === first);
      return child ? findNode(child, rest) : null;
    };

    const txNode = findNode(treeData, ['cs', 'database', 'mysql', 'mysql_tx']);

    if (txNode && txNode.children) {
      // 添加锁机制的树节点
      const lockTreeNodes = [
        {
          id: 'mysql_lock_mechanism',
          name: '锁机制',
          count: 0,
          icon: '🔐',
          nodeRef: 'lock_mechanism',
          expanded: true,
          children: [
            { id: 'mysql_shared_lock', name: '共享锁', count: 0, icon: '📖', nodeRef: 'shared_lock' },
            { id: 'mysql_exclusive_lock', name: '排他锁', count: 0, icon: '✍️', nodeRef: 'exclusive_lock' },
            { id: 'mysql_table_lock', name: '表级锁', count: 0, icon: '🗃️', nodeRef: 'table_lock' },
            { id: 'mysql_row_lock', name: '行级锁', count: 0, icon: '📝', nodeRef: 'row_lock' },
            { id: 'mysql_page_lock', name: '页面锁', count: 0, icon: '📄', nodeRef: 'page_lock' },
            { id: 'mysql_optimistic', name: '乐观锁', count: 0, icon: '😊', nodeRef: 'optimistic_lock' },
            { id: 'mysql_pessimistic', name: '悲观锁', count: 0, icon: '😰', nodeRef: 'pessimistic_lock' },
            { id: 'mysql_lock_comparison', name: '锁粒度对比', count: 0, icon: '⚖️', nodeRef: 'lock_granularity_comparison' },
            { id: 'mysql_engine_lock', name: '引擎锁支持', count: 0, icon: '🔧', nodeRef: 'lock_engine_support' },
          ],
        },
      ];

      // 查找是否已经存在锁机制节点
      const existingLockIndex = txNode.children.findIndex((c: any) => c.id === 'mysql_lock_mechanism' || c.nodeRef === 'lock_mechanism');

      if (existingLockIndex >= 0) {
        // 替换现有节点
        txNode.children[existingLockIndex] = lockTreeNodes[0];
        console.log('✅ 更新了现有的锁机制目录节点');
      } else {
        // 添加新节点
        txNode.children.push(lockTreeNodes[0]);
        console.log('✅ 添加了锁机制目录节点');
      }

      useGraphStore.setState({ treeData: { ...treeData } });
    } else {
      console.warn('⚠️ 未找到 MySQL -> 事务 节点，无法更新目录树');
    }

    // 5. 持久化到 localStorage
    const snapshot = {
      version: 2,
      treeData: store.treeData,
      nodePool: store.nodePool,
      knowledgeEdges: store.knowledgeEdges,
      graph: {
        axioms: store.axioms,
        mechanisms: store.mechanisms,
        conclusions: store.conclusions,
        edges: store.edges,
      },
      questions: store.questions,
      rules: store.rules,
      perspectives: store.perspectives,
      subSystems: store.subSystems,
      inferenceResponses: store.inferenceResponses,
    };

    localStorage.setItem('knowledge-os:app-state-v1', JSON.stringify(snapshot));
    console.log('💾 数据已持久化到 localStorage');

    // 6. 显示成功通知
    store.addNotification('✅ MySQL 锁机制知识导入成功！', 'success');

    console.log('🎉 导入完成！');
    console.log('📊 统计：');
    if (data.perspectives) {
      console.log(`   - 维度视角：${data.perspectives.length} 个`);
    }
    console.log(`   - 知识节点：${data.nodes.length} 个`);
    console.log(`   - 知识关系：${data.edges.length} 条`);
    console.log(`   - 问题库：${data.questions.length} 个问题`);
    console.log('💡 提示：');
    console.log('   1. 刷新页面后即可在左侧目录看到 MySQL → 事务 → 锁机制');
    console.log('   2. 在左下角「🔮 多维视图」中可以切换不同维度视角');
    console.log('   3. 切换维度后，关系网络只显示该维度相关的节点和边');

    return {
      success: true,
      perspectives: data.perspectives?.length || 0,
      nodes: data.nodes.length,
      edges: data.edges.length,
      questions: data.questions.length,
    };
  } catch (error) {
    console.error('❌ 导入失败:', error);
    useGraphStore.getState().addNotification('导入失败：' + (error as Error).message, 'error');
    return { success: false, error: (error as Error).message };
  }
}

// 暴露到 window 对象供控制台调用
if (typeof window !== 'undefined') {
  (window as any).importLockKnowledge = importLockKnowledge;
}
