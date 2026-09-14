# T3-P1 · UI 无头实测

> 目标 http://127.0.0.1:4192/ · 探针 `scripts/shell-fusion/probe-t3-p1.mjs`（一次性，用后即删）
> 关键前提：`UniverseTree` 的 children **始终渲染**，折叠只靠 CSS `display:none`（`src/styles/layout.css:450`）
> ⇒ `[data-tree-node-id]` 覆盖全树，**全部 130 个改名可在 DOM 中一次性断言**，无需逐级展开

# UI_VERIFY_PASS —— 11/11

| # | 断言 | 结果 | 依据 |
|---|---|---|---|
| 1 | A1 页面加载成功（#app + 左栏 + 中区存在） | ✅ | title=Knowledge OS v3.0 |
| 2 | A2 左栏目录树渲染出全树节点（全部在 DOM，折叠仅 CSS 隐藏） | ✅ | [data-tree-node-id] 数量 = 3216 |
| 3 | A3 DOM 中无任一 asplit_* 树 id（身份引用归零） | ✅ | 命中 0 |
| 4 | A4 全部 130 个新 treeId 均在 DOM 中渲染 | ✅ | 缺失 0 |
| 5 | A5 39 个重推导项逐条落进 DOM | ✅ | 缺失 0 |
| 6 | A6 点选改名节点后右侧详情面版渲染出该节点名 | ✅ | clicked · 面板含「BASE理论」=true |
| 7 | A7 切到索引视图后中间区渲染出画布/SVG | ✅ | 按钮=IX时态索引 · canvas+svg = 271 |
| 8 | A8 全过程中无未捕获运行时异常 | ✅ | 异常 0 |
| 9 | A9 刷新后复测：仍无 asplit_* 且新 id 仍在 | ✅ | {"total":3216,"asplit":0,"hasNew":true} |
| 10 | A10 数据面：/api/data 全树 asplit_* = 0 且 130 个新 id 全在 | ✅ | 节点 3216 · asplit_ 残留 0 · 缺失新 id 0 |
| 11 | A11 数据面：边内无 asplit_ 的 treebind 端点（source/target 不参与 treeId 改名） | ✅ | {"total":4163,"tb":2665,"asplitInTb":0,"endpointAsplit":248}（endpoint 含 asplit_ 的是**池 ref 命名空间**，本批明令不改） |