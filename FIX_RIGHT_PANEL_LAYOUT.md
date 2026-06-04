# 右侧面板布局修改

## 修改内容

### 1. 移除 Tab 切换，改为垂直排列

**之前：**
- 右侧面板有 4 个 Tab（词条、推理、关系、问题）
- 需要点击 Tab 切换内容
- 一次只能看一个面板

**现在：**
- 所有面板垂直排列显示
- 可以上下滚动查看所有内容
- 一次性看到所有信息

### 2. 增加面板宽度

**之前：** `300px`
**现在：** `420px`

增加了 120px，让内容显示更宽松。

## 修改的文件

### 1. `src/layout/RightSidePanel.tsx`
- ✅ 移除了 Tab 切换逻辑
- ✅ 移除了 `useState` 和 Tab 导航
- ✅ 直接渲染所有面板组件

```tsx
export default function RightSidePanel() {
  return (
    <aside className="right-panel" id="right-panel">
      <div className="right-panel-body">
        <InferenceEngine />
        <ExplanationCard />
        <QuestionBank />
        <RelationNetwork />
      </div>
    </aside>
  );
}
```

### 2. `src/styles/main.css`
- ✅ 增加右侧面板宽度：`300px` → `420px`

### 3. `src/styles/layout.css`
- ✅ 修改 `.right-panel-body` 为可滚动的垂直布局
- ✅ 添加 `gap` 间距
- ✅ 子元素设置为 `flex-shrink: 0`

```css
.right-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-md);
}

.right-panel-body > * {
  flex-shrink: 0;
}
```

## 面板显示顺序

从上到下：
1. **推理引擎 (Inference Engine)** - 输入问题，查看推理结果
2. **解释卡 (Explanation Card)** - 显示当前选中节点的详细解释
3. **问题库 (Question Bank)** - 查看和管理问题列表
4. **关系网 (Relation Network)** - 显示节点关系的可视化图谱

## 优势

1. **更好的信息密度**：一次看到所有相关信息，无需切换
2. **更自然的浏览**：上下滚动比点击切换更符合阅读习惯
3. **更宽的显示空间**：420px 宽度让内容显示更舒适
4. **更少的交互成本**：不需要记住信息在哪个 Tab

## 测试

刷新页面后，右侧应该能看到：
- ✅ 所有面板垂直排列
- ✅ 可以上下滚动查看
- ✅ 面板之间有合适的间距
- ✅ 宽度更宽，内容显示更清晰

## 修改日期
2026年6月3日
