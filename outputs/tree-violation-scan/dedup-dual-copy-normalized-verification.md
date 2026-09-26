# DEDUP-DUAL-COPY-NORMALIZED · 独立验证

> ✅ **状态：已执行（2026-09-24 02:0x，GMT+8）。**
> 执行通道已恢复，验证器实跑一次，读数见下表「实测」列；本文件已由待跑执行单改写为实测证据。

- 时间：2026-09-24 02:04 GMT+8 实跑（起草于同日 01:3x，起草版为未执行执行单）
- 命令：`node scripts/verify-dedup-dual-copy-normalized.mjs`
- 退出码：**0** · **839 PASS / 0 FAIL**（`grep -c '^PASS'` = 839）
- 方法：从 apply 前六文件快照 `outputs/tree-violation-scan/dedup-dual-copy-normalized-snapshot/` ↔ 当前 `data/` **反推**，**不 import apply 脚本**（分类/方向逻辑在验证器内独立重写一遍）
- 落盘后真源：`data/node-pool.json` = 11734824 字节 · sha256 `c81c7dceafbf18f24da11780a41dfc0eb1b601152cfcbe6339101d0dee006b09`

## 实测读数

| 项 | 检查 | 结果 | 实测读数 |
|---|---|---|---|
| V1 | manifest 标识本批 | ✅ PASS | `PASS snapshot manifest identifies normalized dual-copy batch` |
| V2 | 快照六文件与 manifest 记录的 `bytes` + `sha256` 相符 | ✅ PASS | 6/6：tree 1943524 · pool 12375696 · edges 1138695 · questions 1403138 · evolution 3773 · chains 2157 |
| V3 | **非池数据不可变**（`Buffer.compare === 0`） | ✅ PASS | 5/5 字节相等 |
| V4 | 源池总量 = 3870 | ✅ PASS | `source pool count = 3870 [3870]` |
| V5 | 源池六类分组计数 = 硬门 | ✅ PASS | `strict 0 / approx 396 / label-prefix 406 / other 555 / root-empty 1577 / multi-or-none 936` |
| V6 | 独立重算目标集 = 802 且与 `manifest.targets` id 集合相等 | ✅ PASS | `source target set has 802 cards [802]` · `manifest target set equals independently reconstructed target set [manifest=802]` |
| V7 | 逐卡证据相符（`kind`/`direction`/`rootHash`/`tabHash`/`tabId`/`tabLabel`） | ✅ PASS | 802/802 逐卡 `manifest evidence matches source: <id>` |
| V8 | 源方向分布 = 461 / 127 / 214 | ✅ PASS | `tab=461` · `root=127` · `tie=214` |
| V9 | 当前池总量 = 3870（0 增 0 删） | ✅ PASS | `current pool count = 3870 [3870]` |
| V10 | **变更集合恰为这 802 张** | ✅ PASS | `changed entity set is exactly the 802 targets [changed=802]` |
| V11 | 逐实体结果精确（三路分支 + 非目标逐对象字节等价） | ✅ PASS | `all target mutations and non-target preservation are exact` |
| V12 | 分层 80 张样本（48 tab / 8 root / 24 tie） | ✅ PASS | `tab 48` · `root 8` · `tie 24` · `all 80 sampled cards preserve the chosen content branch and clear tabs` |
| V13 | 后置归类计数 | ✅ PASS | `strict 0 / approx 0 / label-prefix 0 / other 555 / root-empty 1577 / multi-or-none 1738`（802 张全部落入 `multi-or-none`：936 + 802 = 1738） |
| V14 | INFO 披露被丢弃的 tab 外壳标签 | ✅ PASS（INFO 非 FAIL） | `INFO tab shell labels dropped with the shell (intentional, not migrated): 802/802 e.g. aop_aproxy="定义" aop_minterceptor="定义" aop_minvoke="定义"` |
| V15 | 退出码 / 总结行 | ✅ PASS | `Verification passed: 802-card normalized dual-copy cleanup is exact.` · 退出码 0 |

## V14 补齐：tab 外壳标签全量普查（此前因 grep `-c` 假 0 而放弃，改 node 结构化统计）

普查对象 = 快照中 802 张目标卡的**全部** tab 外壳标签（不是抽样、不是 grep 计数）：

| 标签取值 | 张数 |
|---|---|
| `定义` | 570 |
| `定义（MySQL 实例）` | 229 |
| `JDK 26 API` | 1 |
| `ServerSocketChannel（TCP服务端通道）` | 1 |
| `SocketChannel（TCP客户端通道）` | 1 |
| **合计** | **802**（空标签 0，不同取值 5） |

- 与起草期仅有的 3 个实证样例一致（`定义` ×1 实证 → 实测 570；`定义（MySQL 实例）` ×2 实证 → 实测 229），**没有出现实证外的新类别**，故「外壳标签无信息量、丢弃属有意损失」的裁决成立。
- 唯一 3 张非「定义」类标签（`JDK 26 API` / `ServerSocketChannel（TCP服务端通道）` / `SocketChannel（TCP客户端通道）`）虽字面有信息，但其内容已整体并入 `rootContent`，且节点 `label` 保留同名，未见信息损失。
- 全量清单落盘：`outputs/tree-violation-scan/dedup-dual-copy-normalized-dropped-tab-labels.json`。

## tsc / build / test（2026-09-24 02:0x 实跑）

- `npx tsc --noEmit` → 退出码 **0**（无输出）
- `npm run build` → 退出码 **0**（`✓ built in 3.39s`，仅 chunk >500kB 的既有告警）
- `npm test` → 退出码 **0**，`tests 68 · pass 68 · fail 0`（比上一批记录的 62 多 6 条：`versionChains` 用例 10 条已并入）

本批只改 `data/node-pool.json` 与两个 `.mjs` 脚本，未触碰 `src/**` ⇒ 测试基线与构建均不受影响，与预期一致。

## 与 apply 报告的关系

- 有盘上证据的部分见 `dedup-dual-copy-normalized-apply-report.md`（目标集口径、461/127/214 全量基线、三路逐卡旁证、两条已知项）。
- 本文件 V1–V15 全部由**独立复跑**的 stdout 填实，未引用 apply 脚本的自断言。

## 派生发现（不在本批范围，另行登记）

- **读态解释卡恒渲染 `rootContent`**：`defaultExplanationSelection()`（`src/knowledge/explanationIndex.ts:106`）无论有无 tab 都返回 `Root`，前端也没有「卡内页签条」组件 ⇒ 卡内 tab 在读态**根本不参与渲染**。
- 由此：全库 **1644 张**「tabs 非空但 `rootContent` 为空」的卡在解释卡读态是**空白**的；本批 802 张已全部把内容搬进 `rootContent`（该项实测 **0/802**），剩余 1644 张为既有现象，与本批无关，建议单独立项。
