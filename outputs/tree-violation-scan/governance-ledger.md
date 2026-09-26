# Knowledge-OS 治理台账（Ledger）

> 用途：**唯一的开放线程索引**。只记状态与指针，不复制内容 —— 正文在各专项文档里。
> 方法论依据（已入宪）：`docs/CONSTITUTION.md` **v1.1** 原则三 **3.1 / 3.2 / 3.6** + 序章元纪律；
> 推导过程与实证：`docs/adr/0002-identity-and-observation-discipline.md`（纪律① 身份判据 · 纪律② 观察纪律）。
> 维护约定：每条线程必须有 `状态` / `依据` / `下一步触发条件` 三项；状态词只用
> `✅ 完成` · `⏸️ 阻塞` · `📝 已登记` · `🔍 待裁决`（不得混用「不同」与「异常」）。

最后更新：2026-09-15（T3-P2 / T13 关闭；**P-WEB-HTTP-SCOPE 已 apply** —— a-split 源残留节点拆解 + HTTP / Servlet 本体归位，树 3212→**3215** · 池 3855→**3858** · 边 4159→**4161**，独立验证 20/20 · UI 11/11）

---

## 一、当前状态总览

```text
Phase 1 APPLY        ✅   已提交 16288ff（树 3219 · 池 3855 · 边 4166）
治理基线             ✅   已提交 e93dda5（CONSTITUTION v1.1 3.1/3.2/3.6 + ADR-0002 + BATCH_MANIFEST）
T2 · 阶段一提交      ✅   已关闭 —— 真阻塞项是「单文件双批次」，不是「等外部会话」
T7 · 外部打标 127    ✅   已提交 0ccecae（blob 级提交，工作树零触碰）
T9 · T3-P0 前置      ✅   已提交 e7a7627（treeId 7 改 + treebind 边 id 46 改 · 零结构变更）
T3 · asplit_* 语义化 ✅   **本批收口** —— 130/130 APPROVED · `MAPPING_FREEZE_OK` · 树内 asplit_* 130→0
T5 · 检测器独立化    🔧   引擎已建成 · ① 已执行（T3-P1 apply 时同步出证：130 案例命中 0）
P-WEB · HTTP/Servlet 本体归位 ✅  已 apply —— 树 3212→3215 · 池 3855→3858 · 边 4159→4161（独立验证 20/20 · UI 11/11）
```

**主线（T3）后续路径**：

```text
T3-P0 7 个祖先语义化                     ✅ 已提交 e7a7627（8 门就绪 + 独立验证 21/21 + UI 实测 13/13）
  ↓
133 项重新计算                            ✅ HIGH 92 / MEDIUM 38 / BLOCK 3
  ↓
3 条 MySQL 服务层 BLOCK                   ✅ 用户裁决「卸树留池」→ 已 apply（T3-P0.1 / 120b9ee）
                                          删 3 个 tree mount · 池实体 3 个全留 · 维度原子 3/3 可解析
                                          → BLOCK 3 → 0 · 生效范围 133 → 130
  ↓
T10 · 导入命名空间 id 充当持久 id          📝 已登记，**明令不并入 T3**，T3 冻结后另立
  ↓
38 条 MEDIUM review                       ✅ **T3-P1：批量证据裁决（不再逐条开会）**
                                          10 条件统一执行 → 130/130 APPROVED · blocked 0
                                          判据修复：dry-run 谓词过度排除 `^tree_`（23 条受影响，crossHash=0）
                                          命名空间从 ACM 分类路径拉回**域命名空间**（D2 namespacePolicy）
  ↓
映射冻结（130 ≈ 130）                      ✅ `MAPPING_FREEZE_OK`（8/8 冻结前置条件）
  ↓
T3 apply → 独立验证 → T3 commit            ✅ apply 9/9 门 · 独立验证 20/20 · UI 实测 11/11
                                          tree 3216 / 边 4163 / 池 3855 全不变；只改 130 个 treeId + 145 条 treebind id
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
| T3 | **`asplit_*` treeId 语义化** | ✅ **已收口**（T3-P1 批量裁决 + apply）| 登记：`batch-asplit-treeid-semanticization-plan.md` · `asplit-treeid-inventory.json` · `asplit-treeid-ref-matrix.json` · `scripts/scan-asplit-treeid-refs.mjs`。<br>pre-P0：`t3-dryrun-report.md`（HIGH 68 / MEDIUM 38 / BLOCK 27）。<br>post-P0：`t3-dryrun-report-after-p0.md` · `asplit-treeid-mapping.draft-after-p0.json`。<br>post-P0.1：`t3-dryrun-report-after-p01.md` · `t3-mapping-review-after-p01.md` · `asplit-treeid-mapping.draft-after-p01.json`（`DRY_RUN_OK` / `MAPPING_FREEZE_PENDING_REVIEW`）。<br>**本批（T3-P1）**：`t3-p1-adjudication.md` · `asplit-treeid-mapping.FINAL.json`（`MAPPING_FREEZE_OK`）· `t3-p1-apply-{baseline,plan,preflight,report}.{json,md}` · `t3-p1-apply-verification.md` · `t3-p1-ui-probe.md` · `scripts/{adjudicate-t3-p1-mapping,apply-t3-p1-asplit-semanticization,verify-t3-p1-apply}.mjs` | **①** ✅ 前置 T9 / T3-P0.1 均已解除；<br>**②** ✅ T3-P0.1：3 条 MySQL 服务层 BLOCK 按「卸树留池」处置 → `BLOCK 3 → 0`、生效范围 `133 → 130`；<br>**③** ✅ **T3-P1：38 条 MEDIUM 批量证据裁决**（用户 2026-09-14 定性「不要再当成 38 次人工会议」→ 从「逐项审批」切换到「批量证据裁决」）：<br>　· **判据修复（根因）**：`dryrun-t3-asplit-semanticization.mjs:104` 的 `TREE_SHAPE=/^tree_[a-z0-9_]+$/` **附加了 `^tree_` 前缀要求**，把本树既有的人工语义 id 族（`theory_domain_*` / `react_root` / `demo_*` / `chapter_*`）误判为「非语义」→ 命名空间被抬到 **ACM CCS 分类层**，产出 `tree_acm2012_software_notations_tools_programming_*` 这类 6 段路径 id。实测 **23/38** 条命中更近语义祖先，**crossHash = 0**（未放宽到时间戳）；<br>　· 该缺陷同时造成一条**硬规则违反**：`asplit_s132_base_theory` 在冻结谓词下产出含 13 位时间戳的 `tree_acm2012_systems_k_1783170416767_yaym2f` → 修正后为 `tree_distributed_systems_base_theory`，违反自动消失；<br>　· **命名空间回到 D2 规范**：`namingRule.namespacePolicy` 明文禁止「祖先长 id 的机械拼接」→ 39 项重推导为域命名空间（`java_concurrency` / `java_thread` / `java_syntax` / `pl_theory` / `compiler` / `db` / `javascript` / `jvm` / `operating_systems` / `distributed_systems` / `algorithms` …），91 项沿用既定值且**零漂移**（不变性证明）；<br>　· **D1 操作化读法复核**（⑤ 与 `openDecisions[0].ambiguityFlag` 的强制门）：用 130 条真实 id 复核后，以 D2 `namespaceRegistry` 的**子树覆盖**语义裁定为 **R2**（一律剥离父末段）—— 因为 registry 把命名空间定义为「子树域」而非「父节点全名」，R1 与 registry 自相矛盾；R1 备选及其逐条 delta 已留在报告与 FINAL.json 里，**一句话即可翻转**；<br>**④** ✅ 冻结：`MAPPING_FREEZE_OK`，8/8 前置条件（`approved 130 / pending 0 / needs-review 0 / blocked 0`，档位迁移 HIGH→HIGH 92 · MEDIUM→MEDIUM 27 · MEDIUM→HIGH 11）；<br>**⑤** ✅ apply：9/9 门 · 独立验证 **20/20** `INDEPENDENT_VERIFY_PASS` · 写后复验 `REAL_APPLY_VERIFIED` · UI 无头实测 **11/11**。树 3216 / 边 4163 / 池 3855 **全不变**；只改 **130 个 treeId + 145 条 treebind 边 id**；非 id 字段变化 **0**；endpoint **零触碰**；池与题库**逐字节零改动**；**树内 `asplit_*` 身份引用 130 → 0**；悬空 nodeRef `0 → 0`；悬空 treebind `18 → 18`（批前既有）。<br>**⑥** ⚠️ 本批另修一个**漏改陷阱**：145 条 treebind 中有 **4 条**另一端是 `projection:*`（自身含 `:`），P0 用的非贪婪 `/^treebind:(.+?):(.+)$/` 在这 4 条上会**错切并漏改** → 改用「在已知 treeId 全集里找合法切分点」的冒号安全解析器，独立验证第 11 条点名了这 4 条。**1521 条不扩范围**（另批）|
| T12 | **T3-P1 · 130 项 asplit_* treeId 语义化（批量证据裁决）** | ✅ 完成（见 `batch-manifests/t3-p1.json`） | **裁决形态**：10 条件统一执行 + 8/8 冻结前置 + 130/130 APPROVED，**不再逐条人工确认**。裁决脚本只读真源，产出 FINAL 映射与证据报告；落盘与独立验证各自独立成脚本（apply 9 门 / verify 20 断言）。<br>**判据纪律（宪法 §3.2）**：修正的是**谓词的过度排除**（附加 `^tree_` 前缀要求，与文件自身 98–103 行注释声明的意图不符），**不是**为了闸门变绿而改期望值 —— 证据 = 23 条受影响 + `crossHash=0` 反例分析 + 91 条不变性零漂移。<br>**T5 检测器已按登记同步出证**：130 案例喂入 `scripts/rename-evidence.mjs` → **有命中 0 · 命中点 0 · 严重度全 🟢**（"改名后全库无旧值残留"），且契约自检通过（无 `action`/`autoFix`）—— 与 `verify-t3-p1-apply.mjs` 属**不同引擎的互相确认**（T5 查字段级 stale signature，verify 查树/边全序列化旧 id 串）。 |
| T10 | **导入命名空间 id 充当持久实体 id** ＋ **nodeRef 引用完整性**（P0.1 / T3-AUDIT 顺带发现，**未排期**） | 📝 已登记 · 等 T3 冻结后再裁决 | 详见 `t3-p0.1-mysql-service-layer-verdict.md` §六、`t10-node-ref-integrity.md`。四项均为**独立于 T3** 的 id / 引用债：<br>① **`projection:*` 树 id 237 个（占全树 7.4%）**，其中 **227 个自身有正文**（`MySQL 查询执行计划` 273 字 / 24 后代 · `慢查询日志` 571 字 / 5 后代 · `projection:mysql-term:*` 172 个挂正常语义父下）⇒ **「以 `projection:` 开头」本身不足以定罪**，需单独裁决其合法性；<br>② `asplit_s2_asplit_*` 双前缀 **56 / 133**；<br>③ `atomic_atomic_*` 双前缀 **9**；<br>④ 🆕 **`nodeRef` 引用完整性（identity-ref-integrity）· 观察项**：树节点 `react_root`（名「React」）的 `nodeRef = asplit_module_export`（池实体 label「模块导出」），而它的**后代** `tree_javascript_module_export` 用的是同一个 ref ⇒ **点「React」会渲染出「模块导出」的卡片**。池里**没有** label 为 React 的实体。<br>　· **判据**：*一个节点的 `nodeRef` 被它自己的**后代**复用 ⇒ 该节点的 `nodeRef` 极可能写错*。全树命中 **1** 条。<br>　· ⚠️ 对照：**「同一池实体多挂载」本身不是缺陷判据**（全树 87 ref / 180 节点，合法系统性现象）—— 只有共用的两方构成**祖先—后代**关系时才可疑。<br>　· **不修的原因**：池里没有 React 本体实体 ⇒ 修它要先**造一个池实体**（属内容建设，不是引用修复）；且须先定性「历史导入错误」还是「当初把 React 概述与模块导出归并了」——**两种成因修法不同**，还要连带复核它 11 个子节点的归属。<br>　· **真修时的验证**：不能只看 JSON —— 必须点开树里的「React」，断言渲染出的卡片标题是 React 而非「模块导出」（范式见 `t3-p2-ui-probe.md`） | **明令不得并入 T3**，也不得在 P0.1 / T3-P2 顺带处置。T3 冻结完成后单独立项裁决 |
| T13 | **T3-P2 · MyBatis 4 个插件点展示原子的卸树留池** | ✅ 完成（见 `batch-manifests/t3-p2.json`） | **来源**：T3-AUDIT 的 A/B/C 分类（`medium-classification.json`）扫出 4 条 B 类（`VIEW_ONLY`）——4/4 均为宿主池实体 `k_java_fw_mybatis` 的 `viewDimensions.mybatis_plugin` / section `mybatis_plugin_grid`（「四大对象插件点」，grid）的 atom。<br>**处置**：与 T3-P0.1 **同构** —— 删 4 个 tree mount + 4 条 treebind 边；**池实体与网格 atom 逐字不变**；题组不动。树 3216→**3212** · 边 4163→**4159** · 池 3855 不变。<br>**关键证据（不能只看 JSON）**：无头实测「Mybatis → 视图 tab → 4 个 atom 全部可见」**10/10 PASS**（`t3-p2-ui-probe.md`）—— 维度原子走池查表，卸树后照旧渲染。<br>**附带发现**：同一判据扫全树，发现 `nodeRef` 是「别人展示原子」的树节点 **211** 条（本批范围内 4 条）⇒ **B 规则是活的**；并扫出 ④ `react_root` 串线，**登记进 T10，本批不处置**（未扩大范围）。 | 无后续；若将来对 `nodeRef` 串线立项，从 T10 ④ 起 |
| T5 | **字段一致性检测器独立化** | 🔧 引擎已建成 · **① 已执行** | `scripts/rename-evidence.mjs`（**evidence-only**，含 `baseCount`/`counterexamples`/`falsePositiveAnalysis`，内建 action/autoFix 自检）· 范例 `outputs/rename-evidence/case-rc01.json` · `batch-manifests/t5-rename-evidence.json` · **宪法 3.6** · ADR-0002 | ① ✅ **T3-P1 apply 时已同步出证**：`outputs/rename-evidence/t3-p1-evidence.json`（130 案例 · **命中 0** · 全 🟢 · 契约自检通过）；基数读数：字段值=某实体 label 10458/3855 · `card.nodeId ≠ 池键` **0**；<br>② ⏭ phase1 已提交（`16288ff`）→ **可以把 `verify-phase1-commit-readiness.mjs` 内联的 `residuals` 改为 import 本引擎**（此前 import 会让 phase1 依赖未入库文件）；<br>③ 后续 rename 批次统一复用；<br>④ 🆕 **P-WEB 批跑就绪门时观察到的检测器误报（登记，未修）** —— 内联 `residuals` 的判据是「字段值恰等于该实体**改名前的旧值**」。当实体**只改了 `card`、`label` 没变**时，旧值 ≡ 新值 ⇒ 该实体自身所有等于 label 的字段**全部自命中**。本批 3 个被改实体中 **2 个属此类**（基数 2/3）：`k_1784340526295_skm8iw`（Servlet）与 `asplit_web_attribute_scope` 的 `label` 一项被判 🔴 `defect-candidate`，而该 label **与改前逐字相同**，不构成任何残留。⇒ 建议 T5 引擎给「**未改名**实体」加前置过滤（**是否改名应由 label 是否变更判定，而不是由「实体被改过」推断**）。**本批未就地修**（就绪门脚本的改动属 T5 范围，且会污染本批 writeSet） |
| T14 | **P-WEB-HTTP-SCOPE · a-split 源残留节点拆解 ＋ HTTP / Servlet 本体归位** | ✅ 完成（见 `batch-manifests/p-web-http-scope.json`） | **来源**：用户问「`HTTP Request/Response` 这个为什么没拆，位置也不对」→ 排查结论：它是 **a-split 源残留节点**（`supplement.tabs[0].id = asplit:s18:s13:orig`，标签「（原文）」），**不是拆分产物**；且它与 `asplit_web_attribute_scope` 在**树上互为兄弟**，却有一条非 treebind 结构边 `asplit:s18:req-scope` 声明二者是父子 ⇒ **树与边自相矛盾**。<br>**用户裁决（2026-09-15）**：① 删源残留节点；② `HTTP Request` / `HTTP Response` **回归 HTTP 本体**（计算机网络 > 网络协议 > HTTP）；③ `HttpServletRequest` / `HttpServletResponse` **留在 JavaWeb 作引用类型**（不是 HTTP 本体）；④ `Web 属性作用域` **归 Servlet 生命周期**，不与 HTTP Request/Response 绑定；⑤「请求报文 / 响应报文」是 HTTP Request/Response 的**传输表示**，归其下；⑥「**先做本体拆分，再修 JavaWeb 视图引用；不要在树上搬来搬去**」。<br>**落地**：树 3212→**3215**（+5 新建 −2 卸除）· 池 3855→**3858**（+4 本体 −1 残留实体；另 3 个既有实体改 `card` / `label`）· 边 4159→**4161**（删 7 含错误声明 `asplit:s18:req-scope`，加 9 treebind）· 事件 7→8。<br>**关键机制**：JavaWeb 里放的是**引用**不是本体 —— 走 `viewDimensions[].sections[].atoms[].nodeId` **池查表**，与树挂载无关（T3-P2 B 类机制的同构复用）。<br>**证据**：只读预检 `p-web-http-scope-preflight.md` **13/13** · 独立验证 `p-web-http-scope-verification.md` **20/20**（**不 import apply**，由批前快照反推）· UI 无头实测 `p-web-http-scope-ui-probe.md` **11/11**（含「点 HttpServletRequest → 视图渲染出 HTTP Request」与「祖先链层级已翻转」两类**只能由渲染层证明**的断言）。<br>**过程中修掉的真缺陷（非仪器）**：独立验证 V14 逼出一条**悬空 treebind** —— 卸「报文格式」时漏删其上游边 `treebind:<HTTP>:<报文格式>`；回滚重跑后 20/20。**仪器缺陷 2 处**（报告已留案、改的是取数方式不是期望值）：预检 G12 的树计数把顶层宇宙节点误当容器；UI 探针祖先链取数假设错误（`data-tree-node-id` 只在 `.tree-node-row` 上，祖先层是 `.tree-node > .tree-node-children` 包装器）。 | 无后续 |

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
