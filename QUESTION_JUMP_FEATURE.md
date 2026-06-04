# 问题库点击跳转功能

## 功能说明

点击问题库中的问题时，系统会自动查找相关的知识节点，并在中心视图显示对应的知识结构。

## 实现逻辑

### 1. 智能关键词匹配

**匹配策略：**
1. **精确匹配**：问题文本包含节点名称
   - "说说 MVCC 的实现原理" → 找到 "MVCC" 节点
   - "什么是 Read View" → 找到 "Read View" 节点

2. **关键词匹配**：使用预定义关键词列表
   - 支持中英文：mvcc, read view, undo, 版本链, 事务, isolation 等
   - 支持模糊匹配：部分关键词匹配

### 2. 视图跳转

找到相关节点后：
- ✅ 更新 `focusNodeId` - 中心图谱重新聚焦到该节点
- ✅ 更新 `selectedNodeId` - 右侧显示该节点的解释卡
- ✅ 清除 `selectedTreeNodeId` - 不绑定到特定目录位置

## 修改的文件

### 1. `src/panels/QuestionBank.tsx`

**添加的功能：**
```typescript
const nodePool = useGraphStore((s) => s.nodePool);
const setSelectedNode = useGraphStore((s) => s.setSelectedNode);

const handleQuestionClick = (q, e) => {
  // Shift+点击或右键：切换状态
  if (e?.shiftKey || e?.button === 2) {
    // 切换问题状态
    return;
  }

  // 普通点击：查找相关节点
  const questionText = q.text.toLowerCase();
  let foundNodeId = null;

  // 1. 精确匹配节点名称
  for (const [nodeId, node] of Object.entries(nodePool)) {
    if (questionText.includes(node.label.toLowerCase())) {
      foundNodeId = nodeId;
      break;
    }
  }

  // 2. 关键词匹配
  if (!foundNodeId) {
    const keywords = ['mvcc', 'read view', 'undo', '版本链', ...];
    // 匹配逻辑
  }

  // 3. 跳转到找到的节点
  if (foundNodeId) {
    setSelectedNode(foundNodeId);
  }
};
```

### 2. `src/store/useGraph.ts`

**修复 `setSelectedNode` 函数：**
```typescript
setSelectedNode: (id) => set({ 
  selectedNodeId: id, 
  focusNodeId: id,  // 同时更新 focusNodeId，触发图谱跳转
  selectedTreeNodeId: null 
}),
```

## 交互行为

### 问题库交互
1. **普通点击** → 跳转到相关知识节点，中心图谱重新聚焦
2. **Shift + 点击** → 切换问题状态（未答 → 已答 → 忘答）
3. **右键点击** → 切换问题状态

### 示例

| 问题 | 匹配的节点 | 效果 |
|------|-----------|------|
| 说说 MVCC 的实现原理？ | MVCC | 图谱聚焦到 MVCC 及相关节点 |
| 什么是 Read View？ | Read View | 图谱聚焦到 Read View |
| RR 与 RC 在 MVCC 下的区别？ | MVCC | 图谱聚焦到 MVCC |
| B+树和哈希索引的区别是什么？ | B+树索引 | 图谱聚焦到 B+树 |
| InnoDB 的 MVCC 如何实现？ | MVCC 或 InnoDB | 图谱聚焦到相关节点 |

## 支持的关键词

中英文混合：
- mvcc, read view, readview
- undo, redo, binlog
- 版本链, 隔离, 索引
- b+树, btree, hash
- innodb, myisam
- 事务, transaction
- 死锁, deadlock
- buffer, acid

## 优势

1. **快速定位**：点击问题直接跳转到相关知识点
2. **智能匹配**：支持中英文、模糊匹配
3. **学习闭环**：问题 → 知识点 → 详细解释
4. **减少操作**：无需手动在目录树中查找

## 未来优化

1. **问题关联**：在问题数据中直接存储关联的节点 ID
2. **多节点匹配**：一个问题可能关联多个知识点
3. **相似度计算**：使用更智能的文本匹配算法
4. **用户标记**：允许用户手动关联问题和节点

## 修改日期
2026年6月3日
