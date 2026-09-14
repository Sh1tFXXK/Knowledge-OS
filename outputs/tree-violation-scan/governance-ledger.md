# Knowledge-OS 治理台账（Ledger）

> 用途：**唯一的开放线程索引**。只记状态与指针，不复制内容 —— 正文在各专项文档里。
> 方法论依据（已入宪）：`docs/CONSTITUTION.md` **v1.1** 原则三 **3.1 / 3.2 / 3.6** + 序章元纪律；
> 推导过程与实证：`docs/adr/0002-identity-and-observation-discipline.md`（纪律① 身份判据 · 纪律② 观察纪律）。
> 维护约定：每条线程必须有 `状态` / `依据` / `下一步触发条件` 三项；状态词只用
> `✅ 完成` · `⏸️ 阻塞` · `📝 已登记` · `🔍 待裁决`（不得混用「不同」与「异常」）。

最后更新：2026-09-14

---

## 一、当前状态总览

```text
Phase 1 APPLY        ✅   树 3215→3219 · 池 3849→3855 · 边 4158→4166
独立验证             ✅   存量债 Δ≤0（重复挂载 89→87 改善）· npm test 44/44
审计闭合             ✅   evolution-event introducedNodes 2→6 + 挂载数基线口径修正
提交                 ⏸️   等 node-pool 外部批次收敛（路径 A；路径 B 已明确否决）
asplit_*             🔍   登记 ✅ · dry-run ✅ · **谓词已修正**（HIGH 68 / MEDIUM 38 / BLOCK 27）· 待人工裁决 · apply ⏸️
T4 · RC-01           ✅   已裁决：intentional-alias（方案 A，数据零改动；检测器保留、只出证据）
T6 · 宪法修订        ✅   已完成：CONSTITUTION v1.0 → v1.1（3.1 补充 / 3.2 补充 / 新增 3.6 + 元纪律）
字段一致性规则       ✅   已升级为可执行检测规范（ADR-0002），检测器契约 = evidence-only
批次边界机制         ✅   加固：exclusionGate + 归属强度三分 + 生成物按批次分文件
```

## 二、线程登记表

| # | 线程 | 状态 | 依据 / 详情 | 下一步触发条件 |
|---|---|---|---|---|
| T1 | **阶段一数据 + 审计闭合** | ✅ 完成 | `phase1-apply-report.md`（含附录 A 审计修正、附录 B 观察项） | — |
| T2 | **阶段一提交** | ✅ **已完成**（commit `16288ff` · 2026-09-14 20:43） | `phase1-commit-candidateset.md` · `readiness-phase1.json` · `nodepool-drift-classification.{json,md}` | 原状态「⏸️ 等外部会话收敛」**是错的** —— 重新核验后确认外部早已收敛（静默 7.47h），真阻塞项是「**`node-pool.json` 单文件承载两批次**，git 暂存为文件级 ⇒ 任何提交都整文件夹带对方」。处置：由 T7 经 blob 级提交先行推进 HEAD → 祖先闸门转 ✅ → 8 闸门全 PASS → 按脚本生成 pathspec 提交。树 3215→3219 · 池 3849→3855 · 边 4158→4166 |
| T3 | **`asplit_*` treeId 语义化** | 🔍 待裁决（等 **T9** 先执行） | 登记：`batch-asplit-treeid-semanticization-plan.md` · `asplit-treeid-inventory.json` · `asplit-treeid-ref-matrix.json` · `scripts/scan-asplit-treeid-refs.mjs`。<br>dry-run：`t3-dryrun-report.md`（含 §2.0 谓词修正）· `asplit-treeid-mapping.draft.json` · **`t3-mapping-review.md`** | **①** ⏳ 先做完 **T9**（7 个伪语义祖先的前置语义化）；<br>**②** T9 apply 后重跑 dry-run，读数应为 **HIGH 92 / MEDIUM 38 / BLOCK 3**；<br>**③** T3-P1：逐条裁决 38 条 MEDIUM；<br>**④** 冻结 133 映射（`133/133 ∧ pending=0 ∧ needs-review=0 ∧ blocked=0 ∧ gap≤3 ∧ 语义来源校验通过`）→ `MAPPING_FREEZE_OK` → 才可 apply；<br>**⑤** 剩余 3 条 projection 族 BLOCK 转结构批次。**1521 条不扩范围** |
| T4 | **RC-01 同位字段一致性** | ✅ 已裁决 | `case-rename-field-coherence.md` §5（结论：`ACCEPTED / INTENTIONAL`）· `readiness-<batchId>.json` → `residuals` | — （检测器随 T5 独立化；契约已固化为 evidence-only） |
| T5 | **字段一致性检测器独立化** | 🔧 引擎已建成 | `scripts/rename-evidence.mjs`（**evidence-only**，含 `baseCount`/`counterexamples`/`falsePositiveAnalysis`，内建 action/autoFix 自检）· 范例 `outputs/rename-evidence/case-rc01.json` · `batch-manifests/t5-rename-evidence.json` · **宪法 3.6** · ADR-0002 | ① T3 apply 时同步用它出证；<br>② **等 phase1 提交后**再把 `verify-phase1-commit-readiness.mjs` 内联的 `residuals` 改为 import 本引擎（现在 import 会让 phase1 依赖未入库文件）；<br>③ 后续 rename 批次统一复用 |
| T6 | **宪法修订（3.1 / 3.2 / 新增 3.6）** | ✅ 完成 | `docs/CONSTITUTION.md` v1.1（序章 v1.1 修正条款 + 元纪律）· ADR-0002 → 已上升为宪法执行原则 | — （后续 `asplit_*` / T5 直接引用 v1.1 3.1 / 3.2 / 3.6） |
| T7 | **node-pool 127 条外部打标改动** | ✅ **已完成**（commit `0ccecae`，经用户授权「路线 A」） | `nodepool-external-drift.json` · `nodepool-drift-classification.{json,md}` · `scripts/classify-nodepool-external-drift.mjs` · `batch-manifests/nodepool-tag-normalization.json` | 原纪律「由**其他会话**负责提交；本台账仅登记事实，不代管」**已正式解除**（用户 2026-09-14 显式授权，授权事实与时点记于台账 `requiresGovernanceApprovalNote`）。四方基线定性 `DRIFT_DECOMPOSABLE`（10 条不变量全绿，外部 127+1 / 本批 6+1 恰好铺满）→ blob 级提交（index 指向备份态 blob `fa533a3a`，工作树零触碰）。定性与处方见 `nodepool-drift-classification.md` §6 |
| T8 | **批次边界机制加固** | ✅ 完成 | `docs/BATCH_MANIFEST.md` §3.1/§3.2 · `verify-phase1-commit-readiness.mjs`（`exclusionGate` + 检查 D 归属强度三分 + **未跟踪目录展开** + `readiness-<batchId>.json`） | — （触发源：同日四次「声明写了但没生效」：`t3-mapping-review.md` 漏出写集 / 通配串永不命中 / 报告文件名共用 / 未跟踪目录折叠） |
| T9 | **T3-P0 · 7 个伪语义祖先的前置语义化** | 🔍 **待人工裁决**（提案已出，零数据变化） | `batch-manifests/t3-p0.json`（`READY_TO_COMMIT`）· `t3-p0-naming.proposal.json`（7 条命名提案 + 逐条 4 级证据）· `t3-p0-dryrun-plan.json` · `t3-p0-report.md` · **`t3-p0-review.md`** · `scripts/dryrun-t3-p0-ancestors-semanticization.mjs` | **① 逐条裁决 7 个名字**（通过 / 改名 / 另裁）；<br>**② 裁定 openDecision D1**（P0 后 gap=0 子项用「父全名+slug」还是「父去末段+slug」）与 **D2**（域 slug 命名空间是否作为 1521 批次统一约定）；<br>**③** 全部 approved + D1/D2 已定 → `t3-p0` apply（备份 → 8 闸门 → 落盘 → 独立复验 → 单独提交） |

## 三、长期纪律速查（已入宪 · CONSTITUTION v1.1）

```text
① entity identity ≠ tree mount                          【宪法 3.1】
   先判实体语义，再决定保留哪个 identity。
   判据 = 实体正文（计分阈值 3），不是挂载位置。
   保留 identity 的一侧 = 原实体语义所属的那一侧。

② observation ≠ defect                                  【宪法 3.2】
   先把单案例在全库范围内证伪，再提升为治理规则。
   任何「缺陷」断言必须附基数（命中/全体）与反例样本。
   状态词只用 观察 / 待裁决 / 缺陷 三级，不得混用。

③ 元纪律：规则从可复现实证抽象，不从单案例直觉上升     【宪法 序章 v1.1】
   入宪/成规前须给出 命中数 / 全体数 + 反例样本；给不出基数者只记观察项。

④ 检测器找证据；治理规则判证据                          【宪法 3.6】
   检测器契约 = evidence-only（只出 staleSignature/severity/disposition，
   不出 action/autoFix）；处置由治理规则或人工裁决。
```

字段角色速查（宪法 3.6）：

```text
身份耦合字段：label · tree.name · card.nodeId · 代码按值引用字段   → 必须语义一致
展示字段：    card.title · card.tabs[].label                      → 允许富化，禁止自动回写
检测对象：    旧值残留（字段值 == 改名前的旧值）—— 只报「等于旧值」，不报「不等于新值」
检测器契约：  evidence-only —— 只出 {staleSignature, severity, disposition}
              「检测器找证据；治理规则判证据」，检测器不得内联处置（无 action/autoFix）
```

## 四、台账自身

- 本文件属**治理文档**（与批次产出不同类）。它是否随 T2 一并提交，由用户裁决；
  建议与 T6 的宪法修订一起走一个「治理文档」提交，保持 commit 语义单一。
- 新增开放线程时**只在本表加行**，不要把正文写进来。
