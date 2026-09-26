# P-WEB-HTTP-SCOPE · 只读预检

- 生成时间：2026-09-14T16:33:43.652Z
- 数据目录：`E:\project\Knowledge-OS\data`
- 结论：**PREFLIGHT_OK**（13/13）

## 裁决依据

用户 2026-09-15 裁决：源残留节点删除；HTTP Request/Response 回归 HTTP 本体；HttpServletRequest/Response 留 JavaWeb 作引用类型；Web 属性作用域归 Servlet 生命周期，不与 HTTP Request/Response 绑定。

## 门

| 门 | 说明 | 结果 | 读数 |
|---|---|---|---|
| G1-parents | 目标挂载父节点全部存在（HTTP / JavaWeb / Servlet-javaweb 复用位） | PASS | HTTP=true 网络协议=true JavaWeb=true |
| G2-id-free | 新建池 id / 树 id 全部无冲突 | PASS | 池冲突=无 树冲突=无 |
| G3-reuse-servlet | 复用的 Servlet 池实体存在且 kind=concept | PASS | label=Servlet kind=concept rootLen=858 |
| G4-move-src | 四个移动源在位且当前父节点符合预期 | PASS | 请求报文:OK | 响应报文:OK | Web 属性作用域:OK | Servlet 生命周期:OK |
| G5-delete-src | 删除目标全部在位（残留树节点 / 残留池实体 / 错误边 / 其 treebind） | PASS | 树节点=true 池实体=true 错误边=true treebind=true |
| G6-shell-lossless | 「报文格式」卸树后内容损失为 0（子项只含待移动两条，自身无正文/无非空 tab） | PASS | 子项=[tree_1786898852112_uph5k3,tree_1786898862413_xhmyno] rc=undefined tab长度=[0,0] |
| G7-ref-mechanism | 引用机制 = viewDimensions[].sections[].atoms[].nodeId 形状可用（样例 k_java_fw_mybatis） | PASS | 样例原子=4 个，首个 nodeId=asplit_mybatis_executor |
| G8-colon-safe | 本批涉及的父 treeId 均不含冒号（split(':') 陷阱不适用） | PASS | 已核 5 个 id，全不含冒号 |
| G9-backup | 备份存在且与当前真源逐字节一致 | PASS | tree-data.json:逐字节相同 | knowledge-edges.json:逐字节相同 | node-pool.json:逐字节相同 | evolution-events.json:逐字节相同 |
| G10-dangling-baseline | 悬空基线记录（nodeRef 悬空 0 · treebind 不可解析 18，既有债不得劣化） | PASS | nodeRef 悬空=0 | treebind 总数=2661 不可解析=18 |
| G11-migrate-src | 待迁移的源残留原文 tab 存在且非空 | PASS | tab=asplit:s18:s13:orig label=Request、Response 与作用域（原文） len=796 |
| G12-baseline | 计数基线 = 树 3212（含顶层宇宙节点）/ 池 3855 / 边 4159 | PASS | 树=3212 池=3855 边=4159 |
| G13-evo-free | 演化事件 id 无同名批次冲突 | PASS | 现有事件=7，p-web-http-scope 冲突=false |

## 预期变化

- 树：+5 −1 −1 = +3（3212 → 3215）
- 池：+4 −1 = +3（3855 → 3858）
- 边：删 6 条（含错误声明 asplit:s18:req-scope 与 5 条旧 treebind）· 加 9 条 treebind = +3（4159 → 4162）
- 演化事件：+1（7 → 8）
