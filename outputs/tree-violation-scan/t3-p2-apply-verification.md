# T3-P2 独立验证报告

- 批前快照：`data/backups/t3-p2-2026-09-14T15-27-15-288Z`
- 方法：不 import apply 脚本；由 快照 ↔ 工作树 逐结构比对**反推**改动，再与宣称比对
- 生成：2026-09-14T15:28:04.058Z

| # | 断言 | 结果 | 详情 |
|---|---|---|---|
| V1 | 树节点净变化 = 恰好 4 个删除 · 0 个新增 | ✅ PASS | 删 4：tree_java_fw_mybatis_executor, tree_java_fw_mybatis_statement_handler, tree_java_fw_mybatis_parameter_handler, tree_java_fw_mybatis_resultset_handler · 增 0 |
| V2 | 反推：4 个被删节点均为叶子且同父（单父 ⇒ 一次 detachChild 批次） | ✅ PASS | 均叶子=true · 父集合=["tree_java_fw_mybatis"] |
| V3 | 宿主 tree_java_fw_mybatis：children 15→11，顺序 = 原顺序去掉 4 个 | ✅ PASS | before=15 after=11 顺序保持=true |
| V4 | 边净变化 = 恰好 4 条删除 · 0 条新增 | ✅ PASS | 删 4：treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_executor | treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_statement_handler | treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_parameter_handler | treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_resultset_handler · 增 0 |
| V5 | 被删 4 条边 = 逐字可预测的 `treebind:<宿主>:<被删子>`（4/4） | ✅ PASS | 预测=treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_executor | treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_parameter_handler | treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_resultset_handler | treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_statement_handler |
| V6 | 其余 4159 条边逐字节不变 ∧ 顺序不变 | ✅ PASS | 条数 4163→4159 · 逐字节=true |
| V7 | 其余 3212 个节点「除 children 外」逐字节不变 ∧ children id 列表仅宿主一处变化 | ✅ PASS | 非 children 字段差异节点=0 · children 列表变化节点=["tree_java_fw_mybatis"]（期望恰为 ["tree_java_fw_mybatis"]；祖先只因嵌套而序列化变化，不属字段改动） |
| V8 | node-pool.json 与 questions.json 逐字节零改动 | ✅ PASS | pool=true · questions=true |
| V9 | 4 个池实体保留 ∧ 网格 mybatis_plugin_grid atoms 逐字不变 ∧ 4/4 可解析 | ✅ PASS | 实体 4/4 · 网格 before=["asplit_mybatis_executor","asplit_mybatis_statement_handler","asplit_mybatis_parameter_handler","asplit_mybatis_resultset_handler"] after=["asplit_mybatis_executor","asplit_mybatis_statement_handler","asplit_mybatis_parameter_handler","asplit_mybatis_resultset_handler"] · 可解析 4/4 |
| V10 | 被删 4 个树节点的 nodeRef 全部仍在池中（知识实体未丢） | ✅ PASS | 悬空 nodeRef=0 |
| V11 | 三类悬空均不劣化：nodeRef / treebind / viewDimension atom | ✅ PASS | nodeRef 0→0 · treebind 18→18 · atom 0→0 |
| V12 | 审计事件 +1（6→7）∧ 既有 6 条逐条不变 ∧ 新事件记录 4 个池 ref | ✅ PASS | 新事件 id=event:tree-refactor:t3-p2:1789399635504 · 4 ref 命中=4 · 既有不变=true |
| V13 | 被删 4 个 treeId 在 池/题库/审计叙述外 0 残留 | ✅ PASS | 0 |

## 结论

```
INDEPENDENT_VERIFY_PASS 13/13
```
