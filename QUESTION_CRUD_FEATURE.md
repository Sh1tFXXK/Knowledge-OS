# 问题库增删改查功能

## 功能概述

为问题库添加了完整的 CRUD（增删改查）功能，用户可以方便地管理问题。

## 功能列表

### ✅ 1. 查看（Read）
- 显示所有问题列表
- 显示问题状态（✅已答复、⭐未答复、❌忘答存疑）
- 显示问题总数

### ✅ 2. 新增（Create）
- 点击"新建问题"按钮
- 输入问题文本
- 按 Enter 保存，按 Escape 取消
- 自动持久化到 localStorage

### ✅ 3. 编辑（Update）
- 悬浮在问题上显示编辑按钮 ✎
- 点击编辑按钮进入编辑模式
- 修改问题文本
- 按 Enter 保存，按 Escape 取消
- ✓ 确认保存，✕ 取消编辑

### ✅ 4. 删除（Delete）
- 悬浮在问题上显示删除按钮 🗑
- 点击删除按钮
- 弹出确认对话框
- 确认后删除问题

### ✅ 5. 状态切换
- **普通点击**：跳转到相关知识节点
- **Shift + 点击图标**：切换问题状态
- **右键点击图标**：切换问题状态
- 状态循环：未答 → 已答 → 忘答 → 未答

## 修改的文件

### 1. `src/store/useGraph.ts`

**添加的方法：**
```typescript
// 删除问题
removeQuestion: (id: string) => void;

// 更新问题文本
updateQuestion: (id: string, text: string) => void;
```

**实现：**
```typescript
removeQuestion: (id) => {
  set((s) => ({
    questions: s.questions.filter((q) => q.id !== id),
  }));
  persist();
},

updateQuestion: (id, text) => {
  const trimmed = text.trim();
  if (!trimmed) return;
  set((s) => ({
    questions: s.questions.map((q) =>
      q.id === id ? { ...q, text: trimmed } : q,
    ),
  }));
  persist();
},
```

### 2. `src/panels/QuestionBank.tsx`

**添加的状态：**
```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [editText, setEditText] = useState('');
```

**添加的方法：**
- `handleStartEdit()` - 开始编辑问题
- `handleSaveEdit()` - 保存编辑
- `handleCancelEdit()` - 取消编辑
- `handleDeleteQuestion()` - 删除问题

**改进的 UI：**
- 悬浮显示编辑和删除按钮
- 编辑模式：内联编辑输入框
- 确认/取消按钮

### 3. `src/styles/components.css`

**新增样式：**
```css
.question-item:hover .question-actions {
  opacity: 1;
}

.question-item.question-editing {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.4);
}

.question-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.btn-icon-sm {
  padding: 2px 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-icon-sm:hover {
  background: var(--accent-purple-dim);
  color: var(--accent-purple);
}
```

## 交互说明

### 查看问题
- 问题列表垂直排列
- 显示图标、文本、操作按钮

### 新增问题
1. 点击底部"+ 新建问题"
2. 输入问题文本
3. 按 Enter 或点击"添加"按钮保存
4. 按 Escape 取消

### 编辑问题
1. 悬浮在问题上
2. 点击右侧的 ✎ 编辑按钮
3. 修改文本
4. 点击 ✓ 保存或按 Enter
5. 点击 ✕ 取消或按 Escape

### 删除问题
1. 悬浮在问题上
2. 点击右侧的 🗑 删除按钮
3. 确认删除对话框
4. 点击"确定"删除

### 切换状态
1. **Shift + 点击图标** 或 **右键点击图标**
2. 状态循环切换：⭐未答 → ✅已答 → ❌忘答 → ⭐未答

### 跳转到知识节点
1. **普通点击问题文本或图标**
2. 自动匹配相关知识节点
3. 中心图谱跳转到该节点

## 用户体验优化

1. **悬浮显示按钮**：减少视觉干扰，需要时才显示
2. **内联编辑**：直接在列表中编辑，无需弹窗
3. **快捷键支持**：Enter 保存，Escape 取消
4. **确认删除**：防止误删
5. **即时反馈**：操作后显示通知消息
6. **自动持久化**：所有修改自动保存

## 数据持久化

所有操作（增删改查）都会自动调用 `persist()` 函数，将数据保存到 `localStorage`，确保刷新页面后数据不丢失。

## 示例场景

### 场景 1：添加新问题
```
用户：想添加一个关于 Buffer Pool 的问题
操作：
1. 点击"+ 新建问题"
2. 输入："Buffer Pool 的 LRU 算法如何工作？"
3. 按 Enter
结果：问题添加到列表，状态为"未答复"
```

### 场景 2：编辑问题
```
用户：发现问题表述不清晰
操作：
1. 悬浮在问题上
2. 点击 ✎ 编辑按钮
3. 修改文本
4. 按 Enter 保存
结果：问题文本已更新
```

### 场景 3：标记问题为已答
```
用户：已经理解这个问题
操作：
1. Shift + 点击问题图标
2. 状态从 ⭐未答 变为 ✅已答
结果：问题标记为已答复，图标变绿
```

### 场景 4：删除问题
```
用户：这个问题不再需要
操作：
1. 悬浮在问题上
2. 点击 🗑 删除按钮
3. 确认删除
结果：问题从列表中移除
```

## 技术亮点

1. **状态管理**：使用 Zustand 统一管理
2. **类型安全**：TypeScript 类型检查
3. **响应式 UI**：悬浮效果和过渡动画
4. **数据持久化**：localStorage 自动保存
5. **用户友好**：快捷键、确认对话框、通知消息

## 修改日期
2026年6月3日
