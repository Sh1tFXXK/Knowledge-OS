# Knowledge-OS 治理台账（Ledger）

> 用途：**唯一的开放线程索引**。只记状态与指针，不复制内容 —— 正文在各专项文档里。
> 方法论依据（已入宪）：`docs/CONSTITUTION.md` **v1.1** 原则三 **3.1 / 3.2 / 3.6** + 序章元纪律；
> 推导过程与实证：`docs/adr/0002-identity-and-observation-discipline.md`（纪律① 身份判据 · 纪律② 观察纪律）。
> 维护约定：每条线程必须有 `状态` / `依据` / `下一步触发条件` 三项；状态词只用
> `✅ 完成` · `⏸️ 阻塞` · `📝 已登记` · `🔍 待裁决`（不得混用「不同」与「异常」）。

最后更新：2026-09-14（T2 / T7 / T9 关闭；T3-P0 apply `e7a7627`；**T3-P0.1 已裁决并 apply** —— 采用「卸树留池」→ `BLOCK 3 → 0`、生效范围 `133 → 130`）

---

## 一、当前状态总览

```text
Phase 1 APPLY        ✅   已提交 16288ff（树 3219 · 池 3855 · 边 4166）
治理基线             ✅   已提交 e93dda5（CONSTITUTION v1.1 3.1/3.2/3.6 + ADR-0002 + BATCH_MANIFEST）
T2 · 阶段一提交      ✅   已关闭 —— 真阻塞项是「单文件双批次」，不是「等外部会话」
T7 · 外部打标 127    ✅   已提交 0ccecae（blob 级提交，工作树零触碰）
T9 · T3-P0 前置      ✅   已提交 e7a7627（treeId 7 改 + treebind 边 id 46 改 · 零结构变更）
T3 · asplit_* 语义化 🔷   主线**唯一**开放线程（生效 130 · HIGH 92 / MEDIUM 38 / BLOCK 0）
T5 · 检测器独立化    🔧   引擎已建成，待 T3 apply 时同步出证
```

**主线（T3）后续路径**：

```text
T3-P0 7 个祖先语义化                     ✅ 已提交 e7a7627（8 门就绪 + 独立验证 21/21 + UI 实测 13/13）
  ↓
133 项重新计算                            ✅ HIGH 92 / MEDIUM 38 / BLOCK 3
  ↓
3 条 MySQL 服务层 BLOCK                   ✅ 用户裁决「卸树留池」→ 已 apply（见 T3-P0.1）
                                          删 3 个 tree mount · 池实体 3 个全留 · 维度原子 3/3 可解析
                                          → BLOCK 3 → 0 · 生效范围 133 → 130
  ↓
T10 · 导入命名空间 id 充当持久 id          📝 已登记，**明令不并入 T3**，T3 冻结后另立
  ↓
38 条 MEDIUM review                       ⏭ T3-P1
  ↓
映射冻结（130 ≈ 130）                      ⏭ MAPPING_FREEZE_OK
  ↓
T3 apply → 独立验证 → T3 commit
  ↓
OOP / CS / DB / 虚拟化 / I/O 结构批次
  ↓
Problem Model
  ↓
全库 Governance Gate
```

> 与之前最大的不同：**已经有一个干净的 Phase 1 Git 基线**。从此每个批次都真正做到
> 「一个批次 / 一个 manifest / 一个明确 writeSet / 一个 dry-run / 一个 apply / 一个独立验证 / 一个 commit」，
> 不会再出现 T2 那种「状态上像在等别人，实际是两个批次共用一个文件」的混乱。

---

## 二、主线（开放线程）

| # | 线程 | 状态 | 依据 / 详情 | 下一步触发条件 |
|---|---|---|---|---|
| T3 | **`asplit_*` treeId 语义化** | 🔷 进行中（前置 T9 / T3-P0.1 均已解除 → **生效范围 130**，读数 HIGH 92 / MEDIUM 38 / **BLOCK 0**） | 登记：`batch-asplit-treeid-semanticization-plan.md` · `asplit-treeid-inventory.json` · `asplit-treeid-ref-matrix.json` · `scripts/scan-asplit-treeid-refs.mjs`。<br>pre-P0 dry-run：`t3-dryrun-report.md`（HIGH 68 / MEDIUM 38 / BLOCK 27）· `t3-mapping-review.md`。<br>**post-P0 重算**：`t3-dryrun-report-after-p0.md` · `t3-mapping-review-after-p0.md` · `asplit-treeid-mapping.draft-after-p0.json`。<br>**post-P0.1 重算**：`t3-dryrun-report-after-p01.md` · `t3-mapping-review-after-p01.md` · `asplit-treeid-mapping.draft-after-p01.json`（`DRY_RUN_OK` / `MAPPING_FREEZE_PENDING_REVIEW`） | **①** ✅ 前置已解除（T9 apply 完成 → **HIGH 92 / MEDIUM 38 / BLOCK 3**）；<br>**②** ✅ **3 条 MySQL 服务层 BLOCK 已按「卸树留池」处置并 apply**（T3-P0.1）：只删 3 个 tree mount、池实体 3 个全留、宿主 `viewDimensions` 原子引用不变 → `BLOCK 3 → 0`、生效范围 `133 → 130`。**未造任何 `tree_mysql_*` 名字**（该域已有 9,758 字 / 37 节点规范子树）⇒ 这 3 项已从「treeId 语义化问题」转化为正确的**引用/挂载治理结果**；<br>**③** ⏭ **T3-P1**：逐条裁决 38 条 MEDIUM（`MAPPING_FREEZE_PENDING_REVIEW` 的唯一待办，非闸门失败）；<br>**④** 冻结映射（`pending=0 ∧ needs-review=0 ∧ blocked=0 ∧ gap≤3 ∧ 语义来源校验通过`）→ `MAPPING_FREEZE_OK` → 才可 apply；<br>**⑤** ⚠️ 冻结前须复核 **D1 操作化读法**（见 `t3-p0-naming.proposal.json` → `openDecisions[0].operationalization.ambiguityFlag`）。**1521 条不扩范围** |
| T10 | **导入命名空间 id 充当持久实体 id**（P0.1 核验顺带发现，**未排期**） | 📝 已登记 · 等 T3 冻结后再裁决 | 详见 `t3-p0.1-mysql-service-layer-verdict.md` §六。三项均为**独立于 T3** 的 id 形态债：<br>① **`projection:*` 树 id 237 个（占全树 7.4%）**，其中 **227 个自身有正文**（`MySQL 查询执行计划` 273 字 / 24 后代 · `慢查询日志` 571 字 / 5 后代 · `projection:mysql-term:*` 172 个挂正常语义父下）⇒ **「以 `projection:` 开头」本身不足以定罪**，需单独裁决其合法性；<br>② `asplit_s2_asplit_*` 双前缀 **56 / 133**；<br>③ `atomic_atomic_*` 双前缀 **9** | **明令不得并入 T3**，也不得在 P0.1 顺带处置。T3 冻结完成后单独立项裁决 |
| T5 | **字段一致性检测器独立化** | 🔧 引擎已建成 | `scripts/rename-evidence.mjs`（**evidence-only**，含 `baseCount`/`counterexamples`/`falsePositiveAnalysis`，内建 action/autoFix 自检）· 范例 `outputs/rename-evidence/case-rc01.json` · `batch-manifests/t5-rename-evidence.json` · **宪法 3.6** · ADR-0002 | ① T3 apply 时同步用它出证；<br>② ⏭ phase1 已提交（`16288ff`）→ **可以把 `verify-phase1-commit-readiness.mjs` 内联的 `residuals` 改为 import 本引擎**（此前 import 会让 phase1 依赖未入库文件）；<br>③ 后续 rename 批次统一复用 |

---

## 三、已完成（归档，不再维护）

> 保留这些行的唯一目的是**留指针**：新会话读到它们时知道「这件事已经做完了、证据在哪」，
> 不需要重新核验，也不该把它们当成开放线程。

| # | 线程 | 结论 | 证据 / commit |
|---|---|---|---|
| T1 | 阶段一数据 + 审计闭合 | ✅ 完成 | `phase1-apply-report.md`（附录 A 审计修正 · 附录 B 观察项） |
| T2 | **阶段一提交** | ✅ 完成 · **已从主线移出** | commit `16288ff`。**旧状态「⏸️ 等外部会话收敛」是错的** —— 核验证实外部早已收敛（写入 `2026-09-14T05:00:11.127Z`，静默 7.47h，且**早于** HEAD `5a605e3`）。真阻塞项 = **`data/node-pool.json` 单文件承载两批次**（外部 127 键 + 本批 6 新增 1 修改），git 暂存为**文件级** ⇒ 任何提交都整文件夹带对方。元凶是 `reconcile-external-changes.mjs` 只有三方基线、缺第四方「本任务自己的写入」，apply 后重跑会把自己写的文件判成「外部仍在写入」→ 输出假的「未收敛」。处置：T7 经 blob 级提交先行推进 HEAD → 祖先闸门转 ✅ → 8 闸门全 PASS → 按脚本生成 pathspec 提交。详情：`nodepool-drift-classification.{json,md}` §6 |
| T4 | RC-01 同位字段一致性 | ✅ 已裁决：`ACCEPTED / INTENTIONAL`（方案 A，数据零改动；检测器保留、只出证据） | `case-rename-field-coherence.md` §5 |
| T6 | 宪法修订（3.1 / 3.2 / 新增 3.6） | ✅ 完成 | commit `e93dda5` · `docs/CONSTITUTION.md` v1.1（序章 v1.1 修正条款 + 元纪律）· ADR-0002 |
| T7 | **node-pool 127 条外部打标改动** | ✅ 完成 · **已从主线移出** | commit `0ccecae`（经用户授权「路线 A」）。原纪律「由**其他会话**负责提交；本台账仅登记事实，不代管」**已正式解除**（授权事实与时点记于 `batch-manifests/nodepool-tag-normalization.json` 的 `requiresGovernanceApprovalNote`）。四方基线定性 `DRIFT_DECOMPOSABLE`（10 条不变量全绿：外部 127+1 / 本批 6+1 恰好铺满 HEAD→当前）→ blob 级提交（index 指向备份态 blob `fa533a3a`，工作树零触碰）。台账订正 `3a47ba6` / `f5fcf68` |
| T8 | 批次边界机制加固 | ✅ 完成 | `docs/BATCH_MANIFEST.md` §3.1/§3.2 · `verify-phase1-commit-readiness.mjs`（`exclusionGate` + 检查 D 归属强度三分 + 未跟踪目录展开 + `readiness-<batchId>.json`） |
| T9 | **T3-P0 · 7 个伪语义祖先的前置语义化** | ✅ 完成（提案 `897e289` · apply 见 `batch-manifests/t3-p0-apply.json`） | 7 个名字**全部批准**（用户 2026-09-14 21:10，按提案原名不改）· **D1** 选 B（带限定条件）· **D2** 采纳 `tree_<domain>_<semantic-slug>` 并附硬限制「domain 只是 ID namespace，不是 ontology 判定」。<br>apply：只改 7 个 treeId + 46 条 treebind 边 id；**树 3219 节点、边 4166 条、池 3855 节点全部不变**；非 id 字段零变化；边 endpoint 零触碰；池与题库逐字节零改动。<br>9/9 闸门 ✅ · 独立验证 21/21 `INDEPENDENT_VERIFY_PASS` · 写后复验 `REAL_APPLY_VERIFIED` · 就绪门 8/8 `READY` · UI 无头实测 13/13 · **已提交 `e7a7627`**（22 项写集，pathspec 由就绪门生成）。<br>产物：`t3-p0-apply-report.md` · `t3-p0-apply-verification.md` · `t3-p0-apply-plan.json` · `t3-p0-apply-baseline.json` · `scripts/apply-t3-p0-ancestor-semanticization.mjs` · `scripts/verify-t3-p0-apply.mjs` |
| T11 | **T3-P0.1 · MySQL 服务层 3 条孤儿挂载的「卸树留池」** | ✅ 完成（裁决 + apply 见 `batch-manifests/t3-p0.1.json`） | **为什么曾经看似是命名问题、实际不是**：这 3 项（`备份恢复工具` / `安全管理工具` / `集群管理工具`）gap 均 6，看上去该给一个 `tree_mysql_*` 名字。只读核验（`t3-p0.1-mysql-service-layer-verdict.md`）证明宿主 `服务层` 是 `projection:` 空壳（自身 0 字）、同层 10 子跨 4 种 id 规范含 4 个零字占位，而该域**已有 9,758 字 / 37 节点的规范子树** → **给它们命名会同时固化投影宿主 + 与既有体系永久重复**。<br>裁决=「卸树留池」：`tree-data` 删 3 个 mount · `node-pool` 3 个实体全留 · `viewDimensions` 原子引用不变。<br>apply：树 3219→3216 · 边 4166→4163（恰 3 条 treebind）· 池/题库**逐字节零改动**；非 id 字段变化 **0**；`nodeRef` 悬空 **0** · 新增悬空 treebind **0**（18 条为批前既有）· 维度原子 **3/3** 可解析且批前批后集合完全一致 · UI 无头实测 **17/17**（退回「视图」后 4 个原子照旧渲染 —— 走的是池，证明渲染无树依赖）。<br>15/15 前置闸门 · 独立验证 **20/20** `INDEPENDENT_VERIFY_PASS` · 写后复验 `REAL_APPLY_VERIFIED` · 就绪门 8/8 `READY` · **已提交**（pathspec 由就绪门生成）。<br>**同批修掉 dry-run 脚本两个判据缺陷**（宪法 §3.2：不得改期望值让闸门变绿）：① 范围自校验硬编码 `=== 133` → 改为**从台账已登记声明推导**并追加两条实质断言（声明内部自洽 + 退出项确已离树），配 **2 条负对照**证明闸门仍有牙；② `blocked=0` 时误报「冻结闸门 BLOCK：0 条…」「仍有 0 条无法命名 → 不可能归零」—— 两句都以 0 作主语的**事实错误**，改为三态区分（真阻塞 / 复核队列 / 覆盖缺口）。|

---

## 四、长期纪律速查（已入宪 · CONSTITUTION v1.1）

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

**字段角色判据同样适用于「残留」类断言**（T9 apply 的独立验证实证）：

```text
身份承载数据（tree-data / knowledge-edges / node-pool / questions）里的 treeId 是**身份** → 改名后必须 0 残留。
evolution-events 的 changes[].before / after 是**审计叙述** → **必须**保留旧 id，否则审计失去意义。
⇒ 「旧 id 残留 0」不得全局一刀切，必须按字段角色拆成两条断言。
```

---

## 五、台账自身

- 本文件属**治理文档**（与批次产出不同类）。现行做法：随**引起它的那个批次**一起提交并列入该 manifest 的 `writeSet`
  （T9 的台账更新即随 `t3-p0-apply` 提交），避免为纯登记单独制造一次无内容的提交。
- 新增开放线程时**只在本表加行**，不要把正文写进来。
- **主线只放真正开放着的线程**；关闭的线程移入 §三 归档区，并在结论里写清「为什么曾经看似阻塞、实际阻塞在哪」——
  这条信息比「已完成」三个字值钱得多（T2 就是反例：一个错误的状态词把整条主线锁了几小时）。
