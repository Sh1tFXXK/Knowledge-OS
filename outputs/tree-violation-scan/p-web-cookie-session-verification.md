# P-WEB-COOKIE-SESSION · 独立验证

- 时间：2026-09-21T13:36:20.843Z
- 方法：从 `data/backups/p-web-cookie-session-2026-09-21T13-29-17-000Z` 快照 ↔ 当前真源**反推**，不 import apply 脚本
- 结论：**PASS**（20/20）

| 项 | 说明 | 结果 | 读数 |
|---|---|---|---|
| V1 | 备份快照可读（tree / pool / edges） | PASS | tree=3216 pool=3860 edges=4151 |
| V2 | 树计数 3216 → 3221（+5 新建，本批 0 删除） | PASS | 3216 → 3221 |
| V3 | 池计数 3860 → 3865（+5 新建，0 删除） | PASS | 3860 → 3865 |
| V4 | 边计数 4151 → 4155（删 4 加 8，净 +4） | PASS | 4151 → 4155 |
| V5 | 三个 mover 的父节点迁移与裁决逐条相符（反推，非断言计数） | PASS | 3 条全部相符：Web 状态管理→应用层 · Session→Web 状态管理 · Cookie→HTTP |
| V6 | 树节点增删集合恰为本批声明（+5 新建 / −0 删除），无夹带 | PASS | 新增=[tree_concept_token,tree_concept_url_rewrite,tree_java_fw_http_servlet_cookie,tree_java_fw_http_servlet_session,tree_java_fw_session_lifecycle] 删除=[] |
| V7 | 既有节点自身字段（剔除 children）零改动；children 有变的恰为 5 个声明父节点（无夹带） | PASS | 自身字段有变=0 · children 有变=5 [tree_1786898710541_l4hgm2,tree_1786874260927_9y92b2,tree_java_fw_javaweb,tree_java_fw_servlet,tree_java_fw_web_state_management] 越界=0 |
| V8 | Cookie 挂到 HTTP 之下、池实体保留未删、JavaWeb 不再直接含 Cookie | PASS | Cookie 父=tree_1786898710541_l4hgm2 池=true JavaWeb 直含=false |
| V9 | Web 状态管理挂 网络>应用层 之下；子项 = Session / URL 重写 / Token（Session 居首） | PASS | 父=tree_1786874260927_9y92b2 子=[Session / URL 重写 / Token] |
| V10 | Servlet 下六项（含 javax.servlet.http.Cookie / HttpSession / Session 生命周期与配置）；JavaWeb 不再直接含三 mover | PASS | Servlet 子=[HttpServletRequest / HttpServletResponse / 生命周期 / javax.servlet.http.Cookie / HttpSession / Session 生命周期与配置] · JavaWeb 首项=Servlet 残留=0 |
| V11 | 与树矛盾的结构声明 asplit:s18:session-state 已删；依赖边 atomic:s1:session-cookie 保留 | PASS | 错误边=0 依赖边=1 |
| V12 | 边增删集合恰为本批声明（删 4 加 8），既有边内容有变 = 0（无夹带） | PASS | 删=[asplit:s18:session-state, vaweb:atomic_atomic_cookie, web:atomic_k_dict_ef30sdky, va_fw_web_state_management] 加=8 既有边有变=0 |
| V13 | 本批新增 8 条 treebind 全部可解析，且 source/target 与两端树节点 nodeRef 一一相符 | PASS | treebind=8 不可解析=0 映射不符=0 |
| V14 | 悬空未劣化：无新增 nodeRef 悬空（既有债 container:key_constraint 原样保留，同节点同内容）；treebind 不可解析不增（0 → 0） | PASS | nodeRef 悬空 备份=1[container:key_constraint] 现状=1[container:key_constraint] 新增=0 既有债原样=true(key_constraint|键与约束 / key & constraint|chapter_db_03) | treebind 不可解析 备份=0 现状=0 |
| V15 | 内容无损：三个 mover 池实体 3/3 逐字节未变；三个 mover 树节点自身字段 3/3 逐字节未变（移动不丢内容） | PASS | 池 3/3 · 树自身字段 3/3（children 变化由 V7 单独断言） |
| V16 | 五个新本体 rootContent 均非空（≥60 字）；两条引用原子可解析到协议/概念本体（走池查表，不走树） | PASS | url_rewrite=142 token=139 http_servlet_cookie=293 http_servlet_session=263 session_lifecycle=279 · 原子=[atomic_cookie,k_dict_ef30sdky] 悬空=0 |
| V17 | 引用两端语义正确：javax.servlet.http.Cookie / HttpSession 是 type 抽象且其「被引用本体」不在 JavaWeb 直接子项内 | PASS | kind=Concept/Concept |
| V18 | evolution-events.json 与 questions.json 逐字节零改动（本批不写 evo：2026-09-15 裁决） | PASS | evo=相等 questions=相等 · evo 字节=3773 |
| V19 | 相邻既有实体未被误伤（Servlet 本体 label / JSP 节点 / mybatis 宿主视图维度） | PASS | Servlet.label=Servlet JSP=true mybatis 原子=4 |
| V20 | 树上无重复 treeId（mover 迁移未造成重复挂载） | PASS | 重复=0 |
