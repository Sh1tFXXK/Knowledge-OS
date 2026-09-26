# versions-v1 UI 探针报告

- 时刻：2026-09-15T07:54:44.454Z
- 环境：vite preview :4192（KNOWLEDGE_OS_DATA_DIR 指向真数据只读副本）+ 无头 Chromium CDP
- 探针 v2 修正：①选实体后轮询等待版本链 strip 稳定（重挂载+异步 fetch 瞬时窗口，量具时序缺陷）；
  ②「未选中态」前提不成立（rail 由宿主在选中后渲染），改为断言无链实体不渲染空壳。

- ✅ A1 页面装载（tree-node-row > 0） — rows=1
- ✅ A2 选中无链实体（Bean 生命周期）
- ✅ A2 无链实体不渲染版本链（无空壳） — strip=false
- ✅ A3 选中 Spring
- ✅ A3 事件轨 release 徽标 ×2 — ["发布","发布"]
- ✅ A3 Spring 版本链 1 链 3 节点 — chains=1
- ✅ A3 Spring 链序 v4.0→v5.0→v6.0 — Spring Framework 4.0 → Spring Framework 5.0 → Spring Framework 6.0
- ✅ A3 链内箭头 ×2 — arrows=2
- ✅ A4 v5.0 标注「需 Java 8」 — ["需 Java 8"]
- ✅ A4 v6.0 标注「需 Java 17」 — ["需 Java 17"]
- ✅ A5 选中 java
- ✅ A5 java 版本链 1 链 3 节点 v8→v11→v17 — Java 8 → Java 11 → Java 17
- ✅ A5 LTS 徽标 ×3 — LTS | LTS | LTS
- ✅ A5 java 侧 requires 徽标 ×0（依赖标注在依赖方） — [[],[],[]]
- ✅ A6 版本 id 零泄漏（索引图未渲染版本端点）
- ✅ A7 刷新后选中 Spring
- ✅ A7 刷新复测：事件徽标 ×2 + 链 3 节点 + 箭头 ×2 — badges=["发布","发布"] nodes=3 arrows=2
- ✅ A7 刷新复测：requires 标注仍在 — ["需 Java 8"]

**结论：18/18**