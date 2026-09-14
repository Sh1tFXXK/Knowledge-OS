# P-WEB-HTTP-SCOPE · UI 无头实测

- 时间：2026-09-14T16:42Z（本机 2026-09-15 00:42）
- 方法：`npm run build` → `vite preview --port 4192`（`KNOWLEDGE_OS_DATA_DIR=.tmp-pweb-ui`，只读）→ 无头 Chromium（CDP 9337）
- 结论：**PASS**（11/11）
- 探针：`scripts/shell-fusion/probe-p-web-http-scope.mjs` —— **一次性产物，用后即删**（按 AGENTS.md；断言与结论留在本文件）

## 被测数据的可靠性

`.tmp-pweb-ui/` 是**落盘后真源的逐字节副本**（tree / edges / pool / events / questions 五文件全部 `Buffer.compare === 0`）。
⇒ 本次实测打在**本批真正写进 `data/` 的那份数据**上，不是另造的样本，也不是批前快照。

## 断言

| 项 | 断言 | 结果 | 读数 |
|---|---|---|---|
| U1 | 宇宙树挂载节点数 = 3215（+5 新建 −2 卸除） | PASS | 实测 3215 |
| U2 | 「HTTP Request」/「HTTP Response」出现在树里，且不再有复合名「HTTP Request/Response」 | PASS | HTTP Request=true · HTTP Response=true · 复合名=false |
| U3 | 「请求报文」/「响应报文」仍在树里，而空壳父层「报文格式」已不在树 | PASS | 请求报文=true · 响应报文=true · 报文格式=false |
| U4 | JavaWeb 下出现「Servlet」，且旧名「Servlet 生命周期」已被「生命周期」取代 | PASS | Servlet=true · HttpServletRequest=true · HttpServletResponse=true · 生命周期=true · 旧名=false |
| U5 | 「Web 属性作用域」仍在树（已迁到「生命周期」下） | PASS | 存在=true |
| U6 | 「HTTP Request」的 DOM 路径为 `知识宇宙 > … > HTTP > HTTP Request` | PASS | `universe > … > tree_1786898710541_l4hgm2 > tree_concept_http_request` |
| U7 | 「请求报文」的 DOM 路径落在 HTTP Request 之下（层级已翻转） | PASS | `… > tree_concept_http_request > tree_1786898852112_uph5k3` |
| U8 | 「Servlet」是 JavaWeb 的直接子项，「HttpServletRequest」落其下 | PASS | `… > tree_java_fw_javaweb > tree_java_fw_servlet` · `… > tree_java_fw_servlet > tree_java_fw_http_servlet_request` |
| U9 | 「Web 属性作用域」落在「生命周期」之下（不再与 HTTP Request/Response 绑定） | PASS | `… > tree_java_fw_servlet > tree_java_fw_servlet_lifecycle > tree_java_fw_web_attribute_scope` |
| U10 | 点「HttpServletRequest」→「视图」后可渲染出对协议本体的引用（HTTP Request） | PASS | 原子标签含 `"HTTP Request"` |
| U11 | 刷新后复测：节点数 3215、HTTP Request 与 Servlet 仍在、复合名仍不存在 | PASS | 挂载=3215 · 刷新后=3215 · HTTP Request=true · Servlet=true · 复合名=false |

## 为什么必须实测（不能只看 JSON）

两条关键结论**只能由渲染层证明**：

1. **引用而非拥有**：U10 点开 JavaWeb 下的「HttpServletRequest」，其「视图」渲染出对**协议本体**「HTTP Request」的引用。
   该引用走 `viewDimensions[].sections[].atoms[].nodeId` → **池查表**，与树挂载无关
   ⇒ 这是「JavaWeb 里放的是引用类型、本体不在 JavaWeb」在 UI 上真正成立的唯一证据。
2. **层级翻转真的落到 DOM**：U7 / U9 断言的是**祖先链**而不是「节点存在」——
   「请求报文」若仍挂在「报文格式」下，U7 会失败；「Web 属性作用域」若仍挂 JavaWeb 直接下，U9 会失败。

## 探针自身的两处缺陷（工具缺陷，非产品缺陷）

| # | 症状 | 成因 | 修法 |
|---|---|---|---|
| 1 | 首跑 0/11，所有断言读数为空 | CDP 连到了 **browser 级**端点 `/json/version`，`Runtime.evaluate` 返回体里没有 `result` | 改用 `/json/list`，取 `type === 'page'` 的 target 的 `webSocketDebuggerUrl` |
| 2 | 7/11 —— U6–U9 全 FAIL，报祖先链为空 | 探针假设 `data-tree-node-id` 会出现在**祖先**元素上；实际该属性只在 `.tree-node-row` 上，祖先层是 `.tree-node > .tree-node-children` 包装器 | 祖先链改为「沿 `.tree-node-children` 上溯 → 取其父 `.tree-node` → 再取 `:scope > .tree-node-row`」 |

两处都**保留在案而非抹掉**：改的是**判据的取数方式**，不是把期望值放宽到能过（宪法 §3.2）。

## 统计

- 挂载节点：DOM 中 `[data-tree-node-id]` = **3215**（与 `/api/data` 面一致）
- 折叠只靠 CSS（`display:none`），挂载数恒定 ⇒ 等待条件用「等 `=== 3215`」而非「等 `> 0`」
- 全过程 **0 未捕获异常**
