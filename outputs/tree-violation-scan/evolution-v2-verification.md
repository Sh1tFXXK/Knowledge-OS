# EVOLUTION-V2 · 独立验证报告（INDEPENDENT_VERIFY_PASS 10/10）

- 时间：2026-09-15 12:35（提交前）；本文件为留档副本，验证脚本 = `scripts/verify-evolution-v2.mjs`
- 方法：**不 import apply 脚本**，由批前快照 `data/backups/evolution-v2-2026-09-15T04-27-05-000Z` ↔ 工作树逐结构比对**反推**本批改动，再与 manifest 宣称比对。
- 祖先证据：V1 用单进程 `execFileSync(git show HEAD:…) + Buffer.compare` 证明快照 ≡ HEAD（96719B 全等）。
- 归档说明：本文件生成于内容提交 `f5ebe9c` 之后，**不在该批 writeSet 内**（与 `readiness-*.json` 同类，属事后归档证据），随下一个治理/文档批次入库。

## 闸门读数

| # | 闸门 | 断言 | 结果 |
|---|---|---|---|
| V1 | snapshot-is-head | 快照 evolution-events.json 与 HEAD 逐字节一致（祖先证据成立） | PASS（96719B = 96719B） |
| V2 | counts | 事件数 8 → 2 | PASS |
| V3 | removed-exact | 被删 id 集合恰为本批声明的 6 条，无夹带 | PASS（6/6 逐项相符） |
| V4 | kept-untouched | 保留事件除新增 `type:"release"` 外逐字段与快照一致（deep-equal minus type） | PASS |
| V5 | residue | 工作树 tree-refactor 残留为 0 | PASS |
| V6 | historical-time | 现存事件 occurredAt 均为真实历史时间（2013-12-12 / 2017-09-28，非 2026 批次时刻） | PASS |
| V7 | other-data-untouched | tree / pool / edges / questions 逐字节零改动（4/4） | PASS |
| V8 | negative-old-dropped | **负对照**：旧快照数据（8 条，无 type）经新 `normalizeEvolutionEvents` 产出 **0 条** —— 操作日志不可能以「无类型」形态复活进演化图 | PASS |
| V9 | normalize-projection | 新数据 normalize → 2 条 · type=release · `eventsForIndexScope(k_java_fw_spring)` 取到 2 条 | PASS |
| V10 | format | 落盘文件以换行结尾、2 空格缩进 | PASS |

**裁决：INDEPENDENT_VERIFY_PASS 10/10**

## 量具缺陷留案（修仪器，不改期望值 —— 宪法 §3.2）

V10 首跑 FAIL 是**量具缺陷**：缩进断言写成 `/^\s{2}"/`，但 JSON 顶层数组的行首元素是 `  {` 而非 `  "`，该正则永不命中。经 `od -c` 复核文件尾字节为 `]\n`、缩进 2 空格 —— **文件本身正确**。修法 = 改断言为 `/^ {2}\{/m`，复跑 10/10。
