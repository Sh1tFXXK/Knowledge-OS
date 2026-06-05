# 数据流联动修复 - 完整方案

## 问题分析

### 当前存在的数据流问题

1. **问题 → 答案分离**
   - `Question` 只有 `answered: boolean`
   - 答案存储在独立的 `inferenceResponses: Record<string, string>`
   - 问题和答案之间没有明确关联

2. **问题 → 节点分离**
   - 问题没有字段关联到知识节点
   - 只能通过文本匹配来猜测关联

3. **删除不级联**
   - 删除知识节点时，相关问题、答案、引用没有级联清理
   - 导致数据不一致

4. **数据孤岛**
   - 问题库、节点库、推理引擎各自独立
   - 缺乏统一的数据流管理

## 解决方案

### 1. 扩展 Question 类型

**修改前：**
```typescript
export interface Question {
  id: string;
  text: string;
  answered: boolean;
}
```

**修改后：**
```typescript
export interface Question {
  id: string;
  text: string;
  answered: boolean;
  /** 关联的知识节点 ID（可选） */
  relatedNodeId?: string;
  /** 答案内容（可选） */
  answer?: string;
  /** 创建时间 */
  createdAt?: number;
  /** 更新时间 */
  updatedAt?: number;
}
```

### 2. 新增 Store 方法

#### answerQuestion - 保存问题答案
```typescript
answerQuestion: (id: string, answer: string) => {
  set((s) => ({
    questions: s.questions.map((q) =>
      q.id === id
        ? { ...q, answer: answer.trim(), answered: true, updatedAt: Date.now() }
        : q,
    ),
  }));
  persist();
}
```

#### linkQuestionToNode - 关联问题到节点
```typescript
linkQuestionToNode: (questionId: string, nodeId: string) => {
  const state = get();
  if (!state.nodePool[nodeId]) return;

  set((s) => ({
    questions: s.questions.map((q) =>
      q.id === questionId
        ? { ...q, relatedNodeId: nodeId, updatedAt: Date.now() }
        : q,
    ),
  }));
  persist();
}
```

### 3. 增强 removeKnowledgeNode - 级联删除

**修改前：**
只删除节点和边，清除目录树引用

**修改后：**
```typescript
removeKnowledgeNode: (knowledgeId) => {
  const state = get();

  // 1. 删除节点
  const { [knowledgeId]: _, ...nodePool } = state.nodePool;

  // 2. 删除相关的边
  const knowledgeEdges = state.knowledgeEdges.filter(
    (e) => e.source !== knowledgeId && e.target !== knowledgeId,
  );

  // 3. 清除目录树中的引用
  const treeData = cloneTree(state.treeData);
  const clearRef = (node: TreeNode) => {
    if (node.nodeRef === knowledgeId) node.nodeRef = undefined;
    node.children?.forEach(clearRef);
  };
  clearRef(treeData);

  // 4. 清除相关问题的关联（不删除问题，只清除关联）
  const questions = state.questions.map((q) =>
    (q as any).relatedNodeId === knowledgeId
      ? { ...q, relatedNodeId: undefined }
      : q
  );

  // 5. 删除相关的推理响应
  const deletedNode = state.nodePool[knowledgeId];
  const inferenceResponses = { ...state.inferenceResponses };
  if (deletedNode?.label && inferenceResponses[deletedNode.label]) {
    delete inferenceResponses[deletedNode.label];
  }

  set({
    nodePool,
    knowledgeEdges,
    treeData,
    questions,
    inferenceResponses,
    selectedNodeId: state.selectedNodeId === knowledgeId ? null : state.selectedNodeId,
    focusNodeId: state.focusNodeId === knowledgeId ? null : state.focusNodeId,
  });
  persist();
}
```

### 4. 改进 addQuestion - 支持关联节点

**修改前：**
```typescript
addQuestion: (text: string) => void;
```

**修改后：**
```typescript
addQuestion: (text: string, relatedNodeId?: string) => void;
```

实现：
```typescript
addQuestion: (text, relatedNodeId) => {
  const trimmed = text.trim();
  if (!trimmed) return;
  set((s) => ({
    questions: [
      ...s.questions,
      {
        id: genId('q'),
        text: trimmed,
        answered: false,
        relatedNodeId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
  }));
  persist();
}
```

### 5. 智能关联 - 自动关联问题到节点

在 QuestionBank 组件中，点击问题时：

```typescript
// 1. 优先使用已关联的节点
if (q.relatedNodeId && nodePool[q.relatedNodeId]) {
  setSelectedNode(q.relatedNodeId);
  return;
}

// 2. 智能匹配节点
const questionText = q.text.toLowerCase();
let foundNodeId: string | null = null;

for (const [nodeId, node] of Object.entries(nodePool)) {
  if (questionText.includes(node.label.toLowerCase())) {
    foundNodeId = nodeId;
    // 3. 自动关联
    linkQuestionToNode(q.id, nodeId);
    break;
  }
}

// 4. 跳转到节点
if (foundNodeId) {
  setSelectedNode(foundNodeId);
}
```

## 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                       Knowledge OS                          │
│                                                             │
│  ┌──────────────┐   relatedNodeId   ┌──────────────┐      │
│  │   Question   │ ───────────────→   │ KnowledgeNode│      │
│  │              │                     │              │      │
│  │  - id        │                     │  - id        │      │
│  │  - text      │   ← auto link       │  - label     │      │
│  │  - answer    │                     │  - card      │      │
│  │  - answered  │                     │              │      │
│  └──────────────┘                     └──────────────┘      │
│         │                                     │              │
│         │ cascade                    cascade │              │
│         │ clear                      delete  │              │
│         ▼                                     ▼              │
│  ┌──────────────┐                     ┌──────────────┐      │
│  │  (orphaned)  │                     │   TreeNode   │      │
│  │              │                     │   nodeRef    │      │
│  └──────────────┘                     └──────────────┘      │
│                                               │              │
│                                      cascade │              │
│                                      clear   │              │
│                                               ▼              │
│                                        ┌──────────────┐      │
│                                        │KnowledgeEdge │      │
│                                        │source/target │      │
│                                        └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 使用场景

### 场景 1：创建问题并关联节点

```typescript
// 用户在查看 MVCC 节点时添加问题
const selectedNodeId = 'demo_mvcc';
addQuestion('MVCC 如何实现非锁定读？', selectedNodeId);
```

### 场景 2：回答问题

```typescript
// 用户回答问题
const questionId = 'q_123';
const answer = 'MVCC 通过 Undo Log 和 Read View 实现非锁定读...';
answerQuestion(questionId, answer);
```

### 场景 3：删除节点 - 级联清理

```typescript
// 删除 MVCC 节点
removeKnowledgeNode('demo_mvcc');

// 自动处理：
// 1. 删除节点本身
// 2. 删除所有相关的边
// 3. 清除目录树中的引用
// 4. 清除问题的关联（relatedNodeId 设为 undefined）
// 5. 删除推理响应
// 6. 清除选中状态
```

### 场景 4：智能关联

```typescript
// 用户点击问题 "什么是 Read View？"
handleQuestionClick(question);

// 自动：
// 1. 搜索包含 "Read View" 的节点
// 2. 找到节点 ID 'demo_readview'
// 3. 调用 linkQuestionToNode(q.id, 'demo_readview')
// 4. 跳转到该节点
```

## 数据一致性保证

### 1. 引用完整性
- 删除节点时，清除所有引用该节点的地方
- 添加关联时，检查目标节点是否存在

### 2. 时间戳
- 创建时记录 `createdAt`
- 修改时更新 `updatedAt`
- 便于追踪和排序

### 3. 级联操作
- 删除节点 → 清除问题关联
- 删除节点 → 删除相关边
- 删除节点 → 清除目录树引用
- 删除节点 → 删除推理响应

### 4. 双向关联
- 问题 → 节点（relatedNodeId）
- 节点 → 问题（通过查询实现）

## 未来改进

### 短期
- [ ] 问题可以关联多个节点
- [ ] 节点显示关联的问题数量
- [ ] 批量关联/取消关联

### 中期
- [ ] 问题答案的版本历史
- [ ] 问题和答案的评分系统
- [ ] 智能推荐相关问题

### 长期
- [ ] AI 自动生成答案
- [ ] 知识图谱分析
- [ ] 学习路径生成

## 已修改的文件

1. **`src/types.ts`**
   - ✅ 扩展 `Question` 接口

2. **`src/store/useGraph.ts`**
   - ✅ 新增 `answerQuestion` 方法
   - ✅ 新增 `linkQuestionToNode` 方法
   - ✅ 增强 `removeKnowledgeNode` 方法（级联删除）
   - ✅ 改进 `addQuestion` 方法（支持关联）
   - ✅ 改进所有问题相关方法（添加时间戳）

3. **下一步需要修改**
   - ⏳ `src/panels/QuestionBank.tsx` - 支持答案显示和编辑
   - ⏳ `src/components/QuestionDatabase.tsx` - 支持答案和关联
   - ⏳ `src/panels/InferenceEngine.tsx` - 集成问题答案

## 测试清单

- [ ] 创建问题时可以关联节点
- [ ] 点击问题自动跳转到关联节点
- [ ] 回答问题后，答案被保存
- [ ] 删除节点时，相关问题的关联被清除
- [ ] 删除节点时，相关边被删除
- [ ] 删除节点时，目录树引用被清除
- [ ] 删除节点时，推理响应被删除
- [ ] 智能匹配能正确关联问题到节点

## 修改日期
2026年6月3日
