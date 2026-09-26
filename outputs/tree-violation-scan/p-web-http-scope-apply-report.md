# P-WEB-HTTP-SCOPE · APPLY 报告

- 时间：2026-09-14T16:35:14.899Z
- 数据目录：`E:\project\Knowledge-OS\data`

## 预检

| 项 | 说明 | 结果 | 读数 |
|---|---|---|---|
| P1 | HTTP Request/Response 已在 HTTP 下且是独立概念 | PASS | tree_1786898710541_l4hgm2 / tree_1786898710541_l4hgm2 |
| P2 | 请求报文挂在 HTTP Request 下、响应报文挂在 HTTP Response 下 | PASS | tree_concept_http_request / tree_concept_http_response |
| P3 | JavaWeb 下 Servlet 存在且为第 1 个子项 | PASS | 第 1 项=tree_java_fw_servlet |
| P4 | Servlet 下为 HttpServletRequest / HttpServletResponse / 生命周期 | PASS | HttpServletRequest / HttpServletResponse / 生命周期 |
| P5 | Web 属性作用域已归 生命周期，不再是 JavaWeb 直接子项 | PASS | 父=tree_java_fw_servlet_lifecycle |
| P6 | 源残留节点与「报文格式」已不在树 | PASS | residue=false fmt=false |
| P7 | 错误边 asplit:s18:req-scope 已删除 | PASS | 命中=0 |
| P8 | 池实体：4 个新建到位、残留池实体已删、报文格式池实体保留 | PASS | residuePool=false fmtPool=true |
| P9 | 引用原子指向的两个本体内存在于池 | PASS | concept_http_request |
| P10 | 内容迁移无损：原文关键片段全部落在迁移 tab 里 | PASS | 关键片段（HttpServletRequest/写入 Response/ServletContext 等 7 项）均在迁移 tab 中 |

## 计数

- 前：树 3212 / 池 3855 / 边 4159 / 事件 7
- 后：树 3215 / 池 3858 / 边 4161 / 事件 8

## 操作日志

- 新建池实体 4：concept_http_request, concept_http_response, concept_http_servlet_request, concept_http_servlet_response
- 建立引用（viewDimensions 展示原子）2：HttpServletRequest → HTTP Request；HttpServletResponse → HTTP Response
- 内容迁移：Servlet(k_1784340526295_skm8iw) / 作用域(asplit_web_attribute_scope) 各挂原文 tab
- 树结构：HTTP Request/Response 回归 HTTP；JavaWeb 下新建 Servlet（首位）含 HttpServletRequest / HttpServletResponse / 生命周期；作用域移入生命周期
- 卸树留池：报文格式(tree_1786898830078_iopwk0) —— 池实体保留，0 内容损失
- 删除节点：tree_java_fw_http_request_response + 池实体 asplit_http_request_response（内容已迁移）
- 改名：tree_java_fw_servlet_lifecycle 「Servlet 生命周期」→「生命周期」（树 name 与池 label 同位同步）
- 边：删 7 条（含错误声明 asplit:s18:req-scope），加 9 条 treebind
