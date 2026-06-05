# 图谱节点点击行为修复

## 问题描述
原来点击中心图谱的节点时，会重新提取子图并改变视图焦点，导致图谱跳转。用户希望：
- 点击**左侧目录树** → 图谱跳转到对应节点
- 点击**中心图谱节点** → 只在右侧显示解释卡，图谱不变

## 解决方案

### 核心思路
引入两个独立的状态：
- `focusNodeId`：用于控制图谱视图的焦点（决定显示哪些节点）
- `selectedNodeId`：用于控制右侧解释卡显示哪个节点

### 修改的文件

#### 1. `src/store/useGraph.ts`

**添加新状态：**
```typescript
focusNodeId: string | null;
```

**修改 `selectTreeEntry` 函数：**
```typescript
selectTreeEntry: (treeNodeId) => {
  const state = get();
  const treeNode = findTreeNodeById(state.treeData, treeNodeId);
  if (!treeNode) return;
  const nodeId = resolvePoolIdFromTreeNode(treeNode);
  set({
    selectedTreeNodeId: treeNodeId,
    selectedNodeId: nodeId,
    focusNodeId: nodeId,  // 同时更新焦点
  });
},
```

**保留 `setSelectedNodeOnly` 函数：**
```typescript
setSelectedNodeOnly: (id) => set({ selectedNodeId: id }),
```

#### 2. `src/core/ReasoningKernel.tsx`

**使用 `focusNodeId` 提取子图：**
```typescript
const focusNodeId = useGraphStore((s) => s.focusNodeId);

const pack = useMemo(
  () => extractSubgraph(nodePool, knowledgeEdges, { 
    focus: focusNodeId,  // 使用 focusNodeId 而不是 selectedNodeId
    scope: 'local', 
    dimension 
  }),
  [nodePool, knowledgeEdges, focusNodeId, dimension],
);
```

**节点点击使用 `setSelectedNodeOnly`：**
```typescript
onClick={() => setSelectedNodeOnly(isSelected ? null : n.id)}
```

## 行为变化

### 之前
- 点击左侧目录树 → 更新 `selectedNodeId` → 图谱重新提取 ✅
- 点击图谱节点 → 更新 `selectedNodeId` → 图谱重新提取 ❌

### 现在
- 点击左侧目录树 → 同时更新 `focusNodeId` 和 `selectedNodeId` → 图谱重新提取 ✅
- 点击图谱节点 → 只更新 `selectedNodeId` → **图谱保持不变** ✅

## 测试步骤

1. 刷新页面
2. 点击左侧目录树的"MVCC"节点
   - ✅ 中心图谱应该聚焦到 MVCC 相关节点
   - ✅ 右侧显示 MVCC 的解释卡
3. 点击图谱中的"Undo Log"节点
   - ✅ 图谱保持不变（仍然显示 MVCC 相关节点）
   - ✅ 右侧切换到 Undo Log 的解释卡
4. 点击图谱中的"版本链"节点
   - ✅ 图谱保持不变
   - ✅ 右侧切换到版本链的解释卡

## 优势

1. **更好的用户体验**：点击图谱节点不会破坏当前的视图上下文
2. **清晰的职责分离**：
   - 目录树控制视图焦点（where to look）
   - 图谱节点点击控制详情展示（what to inspect）
3. **保持图谱稳定**：用户可以在当前视图下浏览多个节点的详情

## 修改日期
2026年6月3日
