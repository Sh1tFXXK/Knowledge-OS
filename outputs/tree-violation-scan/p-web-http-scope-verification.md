# P-WEB-HTTP-SCOPE · 独立验证

- 时间：2026-09-14T16:35:22.546Z
- 方法：从 `data/backups/p-web-http-scope-2026-09-14T16-26-47-000Z` 快照 ↔ 当前真源**反推**，不 import apply 脚本
- 结论：**PASS**（20/20）

| 项 | 说明 | 结果 | 读数 |
|---|---|---|---|
| V1 | 备份快照可读且四文件齐备 | PASS | tree=3212 pool=3855 edges=4159 |
| V2 | 树计数 3212 → 3215（+5 新建 −1 残留 −1 报文格式） | PASS | 3212 → 3215 |
| V3 | 池计数 3855 → 3858（+4 本体 −1 残留实体） | PASS | 3855 → 3858 |
| V4 | 边计数 4159 → 4161（删 7 加 9，净 +2） | PASS | 4159 → 4161 |
| V5 | 四个移动挂载的「父节点迁移」与声明逐条相符（反推，非断言计数） | PASS | 4 条全部相符 |
| V6 | 树节点增删集合恰为本批声明（+5 新建 / −2 卸除），无夹带 | PASS | 新增=[tree_concept_http_request,tree_concept_http_response,tree_java_fw_http_servlet_request,tree_java_fw_http_servlet_response,tree_java_fw_servlet] 删除=[tree_1786898830078_iopwk0,tree_java_fw_http_request_response] |
| V7 | 不存在名为「HTTP Request/Response」的复合概念节点 | PASS | 命中=0 |
| V8 | HTTP Request / HTTP Response 是两个独立 concept，且挂载在 网络>网络协议>HTTP 下 | PASS | 父=tree_1786898710541_l4hgm2 / tree_1786898710541_l4hgm2 kind=Concept/Concept |
| V9 | 请求报文 / 响应报文 已从「报文格式」翻转归入 HTTP Request / HTTP Response | PASS | tree_concept_http_request / tree_concept_http_response |
| V10 | JavaWeb 下 Servlet 居首，其子项为 HttpServletRequest / HttpServletResponse / 生命周期 | PASS | Servlet 子项=[HttpServletRequest / HttpServletResponse / 生命周期] JavaWeb 首项=Servlet |
| V11 | Web 属性作用域 不再与 HTTP Request/Response 绑定，已归 生命周期；错误父子边为 0 | PASS | 父=tree_java_fw_servlet_lifecycle 错误边=0 |
| V12 | 源残留节点与池实体均已删除 | PASS | 树=false 池=false |
| V13 | 「报文格式」已卸树、池实体保留（0 内容损失） | PASS | 树=false 池=true |
| V14 | 悬空未劣化：nodeRef 悬空 0；treebind 不可解析仍为 18（既有债，本批未新增） | PASS | nodeRef 悬空 备份=0 现状=0 | treebind 不可解析 备份=18 现状=18（同口径对比，不得劣化） |
| V15 | 本批新增的 treebind 全部可解析（无新增悬空） | PASS | 新增=9 不可解析=0 |
| V16 | 内容无损迁移：原文 9 个关键片段全部保留在迁移 tab 中 | PASS | 原文长度=796 迁移 tab 长度=580 缺失=[] |
| V17 | Java 侧类型的引用原子全部可解析到协议本体（不走树，走池查表） | PASS | 原子=concept_http_request,concept_http_response 悬空=0 |
| V18 | 四个新本体 rootContent 均非空（≥60 字） | PASS | http_request=305 http_response=304 http_servlet_request=168 http_servlet_response=159 |
| V19 | 演化事件 +1 且为本批唯一一条、changes 非空 | PASS | 7 → 8；本批事件 changes=11 |
| V20 | node-pool 中与批无关实体未被动（抽样：Servlet 本体 label 未改、mybatis 宿主维度完好） | PASS | Servlet.label=Servlet mybatis 原子=4 |
