# EVOLUTION-V2 · apply 报告

- 时间：2026-09-15T04:28:22.723Z
- 模式：--apply（已写盘）
- 数据目录：data

## 事件清退

- 删除 6 条操作日志（Repository History，改由 git + batch-manifests 承载）：
  - event:tree-refactor:phase1:1789371446647
  - event:tree-refactor:t3-p0:1789391683976
  - event:tree-refactor:t3-p0.1:1789393855508
  - event:tree-refactor:t3-p1:1789396485052
  - event:tree-refactor:t3-p2:1789399635504
  - event:tree-refactor:p-web-http-scope:1789403714212
- 保留 2 条知识事件并补 `type:"release"`：event:spring:4 · event:spring:5
- 本批不向 evolution-events.json 追加任何事件（被清退行为的反面）。

## 闸门

- PASS · A1-count · 现状恰为 8 条事件（实际 8）
- PASS · A2-repo-ids · 6 条操作日志的 id 与声明逐一相符（event:tree-refactor:phase1:1789371446647 · event:tree-refactor:t3-p0:1789391683976 · event:tree-refactor:t3-p0.1:1789393855508 · event:tree-refactor:t3-p1:1789396485052 · event:tree-refactor:t3-p2:1789399635504 · event:tree-refactor:p-web-http-scope:1789403714212）
- PASS · A3-keep-ids · 保留的 2 条知识事件恰为 Spring 4 / Spring 5（event:spring:4 · event:spring:5）
- PASS · A4-keep-no-type · 保留事件当前均无 type 字段（补 type 才有意义）
- PASS · A5-keep-historical-time · 保留事件的 occurredAt 是真实历史时间（2013/2017），不是批次时刻（2013-12-12 · 2017-09-28）
- PASS · A6-repo-time · 被删事件无真实历史时间（缺失或 2026 批次时刻 → 操作日志自证）（2026-09-14 · 2026-09-14 · 2026-09-14 · 2026-09-14 · 2026-09-14 · (无 occurredAt)）
- PASS · P1-count · 落盘后恰为 2 条（实际 2）
- PASS · P2-ids · 落盘后 id 集合恰为 Spring 4/5
- PASS · P3-type · 两条事件均带 type:"release"
- PASS · P4-untouched · 除新增 type 外逐字段与原文一致（deep-equal minus type）
- PASS · P5-residue · tree-refactor 残留为 0

裁决：**APPLY_OK**
