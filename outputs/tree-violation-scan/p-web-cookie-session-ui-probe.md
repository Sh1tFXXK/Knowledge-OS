# P-WEB-COOKIE-SESSION · UI 无头实测

- 时间：2026-09-21T14:07Z（本机 2026-09-21 22:07）
- 方法：`npm run build` → `vite preview --port 4192`（`KNOWLEDGE_OS_DATA_DIR=<临时目录>`）→ 无头 Chromium（CDP 9333）
- 结论：**PASS**（8/8）
- 探针：`<临时目录>/smoke.mjs` —— **一次性产物，用后即删**（按 AGENTS.md；断言与结论留在本文件）

## 被测数据的可靠性

临时数据目录的五个文件是**落盘后真源的逐字节副本**（`Buffer.compare === 0`，tree/node-pool/knowledge-edges/evolution-events/questions 全部相等；
sha256 前缀 tree=2d1e6f95… pool=04588237… edges=99242496… evo=4319cbdf… questions=0f212d17…）。
⇒ 本次实测打在**本批真正写进 `data/` 的那份数据**上，不是另造的样本，也不是批前快照。

## 断言

| 项 | 断言 | 结果 | 读数 |
|---|---|---|---|
| T1 | `知识宇宙/计算机科学/网络/网络协议/HTTP` 下有可见的 `Cookie`（协议层归位） | PASS | 子节点 = [HTTP Request, HTTP Response, Cookie]，三者 `visible=true` |
| T2 | `网络/应用层/Web 状态管理` 可见子节点 = `[Session, URL 重写, Token]`（三解法齐备、顺序正确） | PASS | 实测一致 |
| T3 | `JavaWeb/Servlet` 子节点末三项 = `[javax.servlet.http.Cookie, HttpSession, Session 生命周期与配置]` | PASS | 六子 = [HttpServletRequest, HttpServletResponse, 生命周期, javax.servlet.http.Cookie, HttpSession, Session 生命周期与配置] |
| T4a | 点 `URL 重写`：面包屑含 `Web 状态管理`，详情渲染其 rootContent | PASS | 面包屑 `… / 应用层 / Web 状态管理 / URL 重写`；正文含「把会话标识编码进 URL 的会话跟踪方案」 |
| T4b | 点 `Token`：面包屑含 `Token`，详情渲染其 rootContent | PASS | 面包屑 `… / Web 状态管理 / Token`；正文含「JWT」「Bearer 令牌」 |
| T5 | 点 `javax.servlet.http.Cookie`：维度「绑定的协议本体」+ 原子 `Cookie` + 点原子跳 HTTP Cookie 本体 | PASS | 芯片 `["绑定的协议本体 ✎ x"]` · 原子标签 `Cookie` · 点跳后详情为「Cookie：客户端状态载体…」 |
| T5b | 点 `HttpSession`：维度「绑定的概念本体」+ 原子 `Session` + 点原子跳 Session 本体 | PASS | 芯片 `["绑定的概念本体 ✎ x"]` · 原子标签 `Session` · 点跳后详情为「Session：服务端会话状态存储…」 |
| T6 | 刷新页面后复测：Web 状态管理 三子 / Servlet 末三 / Cookie 的维度与原子 均保持 | PASS | 刷新后逐项复现 |

## 为什么必须实测（不能只看 JSON）

本批的核心裁决是「**协议机制不进 JavaWeb，JavaWeb 只留类型抽象**」，它在数据层只能看到「有个 viewDimensions 字段」，
只有渲染层能证明三件事同时成立：

1. **Cookie 真的在 HTTP 协议层**（T1 断言的是 HTTP 之下的可见子节点，不是「树里存在名为 Cookie 的节点」）；
2. **三解法真的平铺在通用 Web 问题域下**（T2 断言 Web 状态管理 的子项集合与顺序，而不是三节点各自在不在树里）；
3. **引用而非拥有**：T5/T5b 点开 JavaWeb 下的两个类型抽象，其「视图」渲染出对**协议本体 / 概念本体**的引用原子，
   点原子可跳转过去 —— 该引用走 `viewDimensions[].sections[].atoms[].nodeId` → **池查表**，与树挂载无关
   ⇒ 这是「JavaWeb 里放的是类型抽象、本体不在 JavaWeb」在 UI 上真正成立的唯一证据。

## 探针自身的缺陷（工具缺陷，非产品缺陷）

| # | 症状 | 成因 | 修法 |
|---|---|---|---|
| 1 | 首跑 7/8：T4a 报 `NO_HIT`（`URL 重写` 找不到） | 探针的 `walk()` 把当前作用域存在 `__kos.scope`，T3 结束停在 Servlet 子层，T4a 未重新定位就点了 `URL 重写` | T4a 开头补一次 `walk(Web 状态管理)`；**改的是取数路径，不是把期望放宽**（T4b 同款断言首跑即过，反证产品无缺陷） |
| 2 | 首跑整体挂死、CDP `Runtime.evaluate` 无响应 | 前序探针遗留 6 个重页面标签（每个都加载 3.8k 池实体）把渲染进程压住 | 关掉全部遗留标签后重跑；**不影响任何断言读数** |

## 统计

- 全过程 **0 未捕获异常**（`Runtime.evaluate` 无 exceptionDetails）
- 折叠只靠 CSS（`display:none`），故可见性断言用 `getClientRects().length > 0`，先点文件夹图标展开再读数
- 树搜索/受控输入走原生 value setter + `input` 事件；React 合成点击走 `dispatchEvent(new MouseEvent('click',{bubbles:true}))`
- 三条命令全绿：`npx tsc --noEmit` EXIT 0 · `npm run build` EXIT 0 · `npm test` 68/68
