# 阶段一 · 精确提交候选集（`commit ⏸️` 等外部 node-pool 收敛）

> **路径：A（已选定）** —— 让外部会话先正常提交/收敛 `node-pool.json`，再提交本批。
> **明确否决路径 B**（`git hash-object -w` + `update-index --cacheinfo` 的构造式提交）。

生成时间：2026-09-14 · 落盘前基线：`data/backups/phase1-oop-os-2026-09-14T07-37-26-424Z/`

---

## 0. 提交纪律：**时间线漂移 ≠ 祖先差异**（两者正交，必须同时验证）

这是本阶段新确立、已写入项目提交纪律的一条：

| 检查 | 问的问题 | 依据 | 局限 |
|---|---|---|---|
| **时间线漂移**（G2 家族） | 自 reconcile 快照以来，**已跟踪文件有没有被再次写入**？ | `outputs/.../worktree-fingerprint.json`（mtime + md5 快照） | 若改动**早于**快照就已存在，它检测不到 |
| **祖先差异** | 我们动手前的基线，与 **HEAD（祖先提交）** 是不是同一个东西？ | `git show HEAD:data/<f>` 与落盘前备份的**逐字节**比对 | 无（这是判定「提交 = 本批」的唯一硬依据） |

**为什么必须两者都做**：APPLY 时 G2 闸门是 ✅（"外部会话未再写入"），但那只证明**自快照以来**没新增。
它**完全不能**回答「HEAD 是否干净」—— 本次 `node-pool.json` 正是反例：
**G2 ✅，但 HEAD 与基线差 127 个既有实体**。

> ⚠️ 补充坑：**不要**在 Git Bash 里用 `git show ... | node` 管道算 md5（本次给出过相反结论）。
> 一律用单个 Node 进程 `execSync('git show ...', {encoding:'buffer'})` + `Buffer.compare`，
> 并同时报「原文相等 / 规范化相等」两列。

### 本次双检结论

| 检查 | 结论 |
|---|---|
| 时间线漂移 | ✅ 自快照（15:22）以来**外部零新增写入**；3 个「新增修改」+ 1 个「md5 变化」**全部是本批 APPLY 自身**（tree-data / knowledge-edges / evolution-events 在 APPLY 后才变成 M；node-pool 因本批新增 6 实体而 md5 变化） |
| 祖先差异 | ⛔ `node-pool.json` 的 **HEAD ≠ 基线**（127 个既有实体的 `tags` / `viewDimensions` 差异），其余 3 件逐字节相等 |

## 1. 三方关系（钉死）

```
HEAD ──(祖先差异，必须为 0)──► Phase1 落盘前备份 ──(Phase1 Δ，须恰为本批)──► 当前工作树
 │                                    │                                        │
 │                                    │                                        └─ 含外部 127 条打标改动（未提交）
 │                                    └─ tree/pool/edges/questions/events 快照
 └─ 落后于基线的祖先提交
```

**目标态**：外部批次提交后，`HEAD(node-pool) == Phase1 落盘前备份`，
此后 `Phase1 对 node-pool 的 Δ` 必须**只包含本批新增 6 个实体 + 已声明的 1 处改名同步**。

## 2. 就绪核验（一条命令，可复跑）

```sh
node scripts/verify-phase1-commit-readiness.mjs           # 退出码 0=READY，1=NOT_READY
node scripts/verify-phase1-commit-readiness.mjs --batch <id>    # 任意批次
node scripts/verify-phase1-commit-readiness.mjs --skip-tests     # 快跑
```

**该脚本自 2026-09-14 起为 manifest 驱动** —— 写集不再硬编码在脚本里，而来自
`batch-manifests/phase1.json`（规范见 `docs/BATCH_MANIFEST.md`）。提交 pathspec 也由它生成，**勿手写**。

它执行 6 项检查，外加 **3 个不变量闸门**（`manifestGate` / `pathspecGate` / `exclusionGate`），并落盘
`outputs/tree-violation-scan/readiness-<batchId>.json`（**按批次分文件**；该文件是每次运行的快照，刻意不入库）：

| 检查 | 内容 | 闸门 |
|---|---|---|
| A · 祖先差异 | 4+1 个数据文件 `HEAD ↔ 落盘前备份` 逐字节 + 内容差异键计数 | **Ancestor Gate** |
| B · 时间线漂移 | `unexpectedDrift = trackedDrift − (writeSet ∪ governanceSet ∪ declaredExternalSet)` 须为 ∅ | **Timeline Gate** |
| C · 本批 Δ | 备份→当前：新增 / 修改 / 删除，逐项对照 `manifest.expectedDelta` | Delta Gate |
| D · 在飞文件归属强度 | **三分**：正向认领 / 精确排除 / 仅目录前缀排除⚠️ / 无人认领⛔ | 信息项 |
| E · 候选件齐备性 | §3 列出的脚本/产出是否都在 | Candidates Gate |
| F · 测试基线 | tracked / peer / working-tree **三分**（见 §7） | Tests Gate |

不变量闸门（对所有 manifest 生效，**与上面 6 项检查正交**）：

| 闸门 | 判据 | 后果 |
|---|---|---|
| `manifestGate` | 全部 `batch-manifests/*.json` 可解析 | 任一损坏 → BLOCK（损坏的声明会让文件被误判成「未登记」） |
| `pathspecGate` | `writeSet ∩ (governanceSet ∪ declaredExternalSet) = ∅` | 相交 → BLOCK（pathspec 只取 writeSet，绝不并入） |
| `exclusionGate` | `writeSet ∩ excludedSet = ∅` | 相交 → BLOCK（同一路径不可能既提交又硬排除） |

> ⚠️ **检查 D 的归属强度三分**（2026-09-14 修正）：旧实现把 `excludedSet` 当作「已被某批次声明」，
> 于是一个宽目录前缀（`outputs/tree-violation-scan/`）会把**其实无人认领**的新文件静默吞掉 ——
> 实证：`t3-mapping-review.md` 就这样漏出了 T3 dry-run 写集。`excludedSet` 是**负向声明**，不构成认领。

> ⛔ **两闸正交，绝不能合并**：Ancestor Gate 问「提交该文件 = 提交本批吗」，Timeline Gate 问「还有没有别人在写」。
> 二者的区别与 `allowedDrift ≠ pathspec` 的辨析见 `docs/BATCH_MANIFEST.md` §3/§4。

**当前运行结果：`NOT_READY`**

```
闸门：manifestGate=PASS · pathspecGate=PASS · exclusionGate=PASS · ancestorGate=BLOCK ·
      timelineGate=PASS · deltaGate=PASS · candidatesGate=PASS · testsGate=PASS
唯一阻塞：Ancestor Gate —— data/node-pool.json 的 HEAD ≠ 落盘前基线（内容差异 127 键）
```

> B 闸已于 2026-09-14 改为并集判定后转 **PASS**：`docs/CONSTITUTION.md` 归入 `governanceSet`
> —— **允许漂移，但不由本批提交**（由 `governance-v1.1` 批次提交）。此前它被误报成「写集之外的漂移」。
>
> 同日新增 `manifestGate` / `pathspecGate` / `exclusionGate`（见上表）；检查 D 改为归属强度三分。
> 四批次（phase1 / governance-v1.1 / t3-registration / t3-dryrun）三项不变量闸门现均 **PASS**，
> 「无人认领 0 个 · 仅目录前缀排除 0 个」。


## 3. 候选集

### 3.1 数据（4 件，必须同进同出）

| 文件 | 祖先差异 | 说明 |
|---|---|---|
| `data/tree-data.json` | ✅ 逐字节相等 | 提交 diff 即本批操作 |
| `data/knowledge-edges.json` | ✅ 逐字节相等 | 同上 |
| `data/evolution-events.json` | ✅ 逐字节相等 | 同上（含审计修正后的版本） |
| `data/node-pool.json` | ⛔ **不等（127 条外部改动）** | 唯一阻塞项 |

> 为什么必须同进同出：树里本批新增 6 个实体的 `nodeRef` 只存在于 pool 中。
> 撇下 `node-pool` 会让提交后的仓库「树引用了不存在的实体」，自相矛盾。

### 3.2 脚本（8 件）

`plan-phase1-relocation.mjs` · `normalize-phase1-blueprint.mjs` · `dryrun-phase1.mjs` ·
`apply-phase1.mjs` · `patch-phase1-evolution-event.mjs` · `metrics-phase1.mjs` ·
`reconcile-external-changes.mjs` · `export-tree-listing.mjs` ·
`verify-phase1-commit-readiness.mjs`

### 3.3 产出（`outputs/tree-violation-scan/`）

`apply-baseline.json` · `phase1-relocation-preflight.md` · `phase1-normalized-blueprint.md` ·
`phase1-operations.json` · `phase1-dryrun-report.md` · `phase1-dryrun-plan.json` ·
`phase1-apply-preflight.md` · `phase1-apply-report.md`（含附录 A） · `phase1-apply-plan.json` ·
`phase1-metrics.json` · `phase1-commit-candidateset.md` ·
`evolution-event-prepatch.json` · `nodepool-external-drift.json` · `case-rename-field-coherence.md` ·
`external-change-baseline.json` · `external-change-baseline.md` · `worktree-fingerprint.json` ·
`outputs/universe-tree-listing/`

⚠️ **`readiness-<batchId>.json` 不在上表**（2026-09-14 起）：它是核验脚本**每次运行的快照**（含时间戳与漂移计数，
跑一次变一次），刻意**不入库**，已登记在各 manifest 的 `excludedSet` 精确路径里。

⚠️ `external-change-baseline.*` / `worktree-fingerprint.json` 是**含其他会话在飞状态的指纹快照**
（仅 md5 与状态码，无源码内容）。若不想把「他人未提交状态的快照」写进历史，可排除这 3 个，
代价是失去 G2 闸门与检查 B 的可复算依据。

### 3.4 另属后续批次的登记件（**已裁决：不随本批提交 → Commit C**）

`scripts/scan-asplit-treeid-refs.mjs` ·
`outputs/tree-violation-scan/batch-asplit-treeid-semanticization-plan.md` ·
`outputs/tree-violation-scan/asplit-treeid-inventory.json` ·
`outputs/tree-violation-scan/asplit-treeid-ref-matrix.json`

> 这 4 件是 `asplit_*` 后续批次的**登记材料**（`REGISTERED / NOT EXECUTED`，**零数据变化**）。
> **用户 2026-09-14 裁决**：不随 Phase 1 提交，单独成 **Commit C**（manifest：`batch-manifests/t3-registration.json`）。
> 理由：不能让「未来计划」与「已经发生的数据变化」混在一个提交里。
> 真正执行 133 项时另立 **Commit D**（`t3-semanticization`），Git 历史保持 A→B→C→D 可读。

**本批产生的治理文档（**已裁决：独立成 Commit B**）：**

`docs/CONSTITUTION.md`（**v1.1**：原则三 3.1 / 3.2 补充 + 新增 3.6 + 序章元纪律；T6 已完成）·
`docs/adr/0002-identity-and-observation-discipline.md`（ADR-0002：两条纪律 + 字段一致性规则，已入宪）·
`outputs/tree-violation-scan/governance-ledger.md`（治理台账：T1–T7 线程索引）·
`docs/BATCH_MANIFEST.md`（**新增**：批次边界声明规范）+ `batch-manifests/`

> **用户 2026-09-14 裁决**：走独立 **Commit B**（manifest：`batch-manifests/governance-v1.1.json`）。
> 理由：**数据重构 ≠ 治理规则演进** —— 回滚 Phase 1 时不应被迫回滚已经成立的治理原则。
> 这些路径同时登记进本批 manifest 的 `governanceSet`：**允许漂移，但不由本批提交**
> —— 这正是 B 闸（Timeline Gate）由「误报」转为 PASS 的原因。


### 3.5 明确排除（其他会话产物 / 本批未写）

| 类别 | 文件 |
|---|---|
| 前端源码 | `src/core/TemporalIndexWorkspace.tsx`、`src/core/explanation-index/UnifiedIndexGraph.tsx`、`src/core/explanation-index/indexGraphLayout.ts`、`src/knowledge/explanationIndex.ts`、`src/knowledge/treeUtils.ts`、`src/store/useGraph.ts`、`src/styles/components.css`、`src/styles/index-diagram.css` |
| 文档/元文件 | `README.md`、`CONTEXT.md`、`STATE.md`、`AGENTS.md`、`.gitignore`、`docs/ARCHITECTURE.md`、`docs/PROJECT_INTRODUCTION.md` |
| 测试 | `scripts/tree-utils.test.mjs`（M）、`scripts/index-graph-layout.test.mjs`（??，09-13） |
| 数据 | `data/questions.json`（外部改动；本批未写，md5 与 preflight 基线一致） |

> ⚠️ `src/core/explanation-index/indexGraphLayout.ts` 是 APPLY 的 **G7 守卫文件**
> （md5 与基线一致，闸门 ✅），它当前显示 `M` 是**其他会话**改的，与阶段一无关。
> 提交时**绝不能**把它 `git add` 进来。

**用户 2026-09-14 裁决：以下三项归 peer 会话，两个自有批次都不收编。**

```text
AGENTS.md                             （??，09-13 16:02，项目代理工作约定）
scripts/index-graph-layout.test.mjs   （??，未跟踪，2 项测试）
src/core/explanation-index/indexGraphLayout.ts （M，G7 守卫文件）
```

> 理由：后两者属**同一逻辑闭环** —— 该测试正是为 `indexGraphLayout.ts` 的那套修改新增的。
> 收编进来会把两个独立工作流人为绑定，并让本批的测试口径失真（见 §7）。
> 这三项已登记进 `batch-manifests/phase1.json` 的 `declaredExternalSet`：**允许漂移，不由本批提交**
> —— 这也是就绪核验检查 D 从「18 个归属不明的在飞文件」降为 **0 个未登记文件** 的原因。

## 4. 解锁流程（外部批次真正提交后照此执行）

**提交结构（2026-09-14 用户裁决：三个独立提交，不合并）**

```text
Commit A  Phase 1 数据 + 实现/审计        ← batch-manifests/phase1.json
Commit B  CONSTITUTION v1.1 + ADR-0002 + 治理台账 + 批次边界规范
                                          ← batch-manifests/governance-v1.1.json
Commit C  T3 asplit_* 登记（REGISTERED / NOT EXECUTED）
                                          ← batch-manifests/t3-registration.json
```

> 分开的理由：**数据重构 ≠ 治理规则演进**。回滚 Phase 1 时不应被迫回滚已成立的治理原则；
> 「未来计划」（C）也不能与「已发生的数据变化」（A）混在一个提交里。

```text
① 重跑：node scripts/verify-phase1-commit-readiness.mjs
     要求：ancestorGate / timelineGate / deltaGate / candidatesGate / testsGate **全部 PASS**
     （当前仅 ancestorGate=BLOCK；其余四门已 PASS）
② 若 ① 全绿 → 重新生成本文档（§3 清单与数字一律以脚本输出为准）
③ git add <脚本打印的 pathspec>（= manifest.writeSet，**勿手写**）
④ git status --short | grep '^[MARD]' 复核暂存结果
     ⚠️ git add 遇任一无效 pathspec 会整体中止，必须复核
⑤ 反查无夹带：git diff --cached --name-only 不得出现 §3.5 的任何一项
⑥ 提交 A → 再按 governance-v1.1 / t3-registration 的 writeSet 提交 B、C
⑦ 仍不碰任何其他 M 文件
```

## 5. 观察项：改名的同位字段（**T4 已裁决：`ACCEPTED / INTENTIONAL`，数据零改动**）

### 5.1 事实

簇 1 把「分类」重命名为「类的分类」时，池实体 `k_class_programming_classification`：

| 字段 | 值 | 状态 |
|---|---|---|
| `label` | `类的分类` | 已同步 |
| `tags` | `["分类","类","面向对象","编程","类的分类"]` | 已同步（**旧名 `分类` 保留在 tags 中充当别名**） |
| `card.title` | `分类` | **仍是旧名** |

### 5.2 ⚠️ 但我上一轮把它判为「不一致（缺陷）」是**过度断言** —— 此处更正

只读全省侦察（`node` 内联查询，未改动任何数据）表明：**本项目不存在「这些字段必须相等」的不变量**。

| 检查 | 数量 / 基数 | 构成 |
|---|---|---|
| `label` ≠ `card.title` | **79 / 3855** | 互为子串 68（富化/截断，明显有意）· 互不包含 11（重写标题，亦明显有意） |
| 树 `name` ≠ 池 `label` | **67 / 3219**（已绑定） | 互为子串 43 · 互不包含 24 |
| `card.nodeId` ≠ 池键 | **0** | ✅ 这一条才是真正的不变量 |

反例（明显是有意为之，不是缺陷）：

```
label「默认导出」        card.title「默认导出 (Default Export)」
label「日志文件」        card.title「日志文件 / log file」
label「enum」            树 name「java.lang.Enum」
label「beta」            树 name「MySQL Beta / MySQL 测试版」
label「系统性能瓶颈定位」 card.title「如何发现瓶颈」
```

可见 `label` / 树 `name` 承担**规范短名**，`card.title` / 树 `name` 常被用作**富化展示标题**（双语、限定词、
更口语化的表述）。**两者允许不同。**

### 5.3 因此正确的表述与规则

- ❌ 错误规则（我上一轮曾这么写）：~~「改名必须同步『全部』同位字段」~~ —— 会产生 146 个误报。
- ✅ **正确规则**：
  > **语义改名时，先判定每个同位字段的角色**：`label` 是身份耦合字段（必须同步）；
  > `card.title` / 树 `name` 属展示层，**允许多样化，不得自动"修正"**。
  > 唯一需要警惕的签名是：**某字段的值恰好等于「该实体改名前的旧值」**（改名残留）。
  > 该签名只能在**改名当时**、拿改名前的基线做**旧值反查**才能检出 —— 不是靠事后字段等值比对。

- 本案例落在 `subset` 类（`title` 是 `label` 的截断，即保留旧名片段），**与另外 68 例同属一个类别**，
  因此**不能从数据断言它是缺陷** —— 它是「有意保留短名」还是「改名漏改」，**需要业务判断**。

### 5.4 处置（T4 已裁决 · 2026-09-14）

- **裁决：方案 A · 判为有意保留（`ACCEPTED / INTENTIONAL`）** —— `card.title = 分类` **不修**。
  依据：旧名同时留在 `tags` 中（别名 / 历史检索价值），全库 79 例证明展示层富化是常态。
- **本批（及任何结构批次）不做任何修改**（符合用户裁决：不塞回本批）。
- **检测器保留**，契约固化为 evidence-only：只出 `{staleSignature, severity, disposition}`，
  **不输出** `action` / `autoFix`（检测器找证据；治理规则判证据）。
- 完整案例与规则：`case-rename-field-coherence.md`；方法论：`docs/adr/0002-*.md`。
- 后续若要把检测器独立成改名流程的标准前置步骤，走独立线程 T5（已登记）。

## 6. 解锁后的精确提交命令（pathspec 白名单）

> **自 2026-09-14 起，本节的命令以核验脚本打印的为准 —— 勿手写。**
> 脚本从 `batch-manifests/phase1.json` 的 `writeSet` 生成 pathspec，写集与提交命令从此同源。

```sh
# 直接用脚本打印的 pathspec（= manifest.writeSet，32 项）
node scripts/verify-phase1-commit-readiness.mjs | sed -n '/git add/,/^$/p'
```

<details><summary>等价的手写形式（仅作对照，容易过期）</summary>

```sh
git add \
  data/tree-data.json data/node-pool.json data/knowledge-edges.json data/evolution-events.json \
  scripts/plan-phase1-relocation.mjs scripts/normalize-phase1-blueprint.mjs \
  scripts/dryrun-phase1.mjs scripts/apply-phase1.mjs \
  scripts/patch-phase1-evolution-event.mjs scripts/metrics-phase1.mjs \
  scripts/reconcile-external-changes.mjs scripts/export-tree-listing.mjs \
  scripts/verify-phase1-commit-readiness.mjs \
  outputs/tree-violation-scan/apply-baseline.json \
  outputs/tree-violation-scan/phase1-*.md outputs/tree-violation-scan/phase1-*.json \
  outputs/tree-violation-scan/evolution-event-prepatch.json \
  outputs/tree-violation-scan/nodepool-external-drift.json \
  outputs/tree-violation-scan/case-rename-field-coherence.md \
  outputs/tree-violation-scan/external-change-baseline.json \
  outputs/tree-violation-scan/external-change-baseline.md \
  outputs/tree-violation-scan/worktree-fingerprint.json \
  outputs/universe-tree-listing/ \
  batch-manifests/phase1.json

# 复核暂存结果（⚠️ add 遇任一无效 pathspec 会整体中止，必须复核）
git status --short | grep '^[MARD]'

# 反查是否夹带
git diff --cached --name-only \
  | grep -E '^src/|^docs/|README|CONTEXT|STATE|AGENTS|tree-utils\.test|index-graph-layout\.test|questions\.json' \
  && echo '❌ 有夹带，撤回' || echo '✅ 无夹带'
```

</details>

## 7. 提交前最终核对清单

- [ ] `verify-phase1-commit-readiness.mjs` 退出码为 **0（READY）**
- [ ] 五门全 PASS：`ancestorGate` / `timelineGate` / `deltaGate` / `candidatesGate` / `testsGate`
- [ ] **Ancestor Gate**：`tree-data` / `node-pool` / `knowledge-edges` / `evolution-events` 四件全部逐字节相等
- [ ] **Timeline Gate**：`unexpectedDrift == ∅`（= 检查 D 的未登记文件也为 0）
- [ ] **Delta Gate**：`unexpectedModified` 为空；`added` == manifest 声明的 6 个新实体
- [ ] **Tests Gate**：`tracked 42/42` 全绿（见下方口径）
- [ ] manifest 的 `testBaseline` 与实际输出一致（脚本会报不符项）
- [ ] `git diff --cached --name-only` 中**无** §3.5 的任何路径
- [ ] `readiness-<batchId>.json` 是**这次**运行生成的（不要提交过期快照）
- [ ] 提交信息含：动作清单 / 规模 before→after（树 3215→3219 · 池 3849→3855 · 边 4158→4166）/
      验收结果（五门 PASS · **`npm test` 42/42（tracked）** · 存量债 Δ≤0）/
      **已知观察**（`k_class_programming_classification` 的 `card.title` 仍为旧名「分类」——
      全省 79+67 例同类差异，**T4 已裁决为有意保留（intentional-alias，数据零改动）**，见 §5；
      133 个 `asplit_*` treeId 另批处理；node-pool 127 条外部改动由他人会话负责）

### 测试口径（2026-09-14 起，不再写单一 N/N）

`npm test` = 零参数 `node --test`，会**自动发现未跟踪**的 `*.test.mjs`。必须三分：

```text
tracked baseline tests = 42   ← 已跟踪 6 个测试文件，本批验收以它为准
peer-added tests       =  2   ← scripts/index-graph-layout.test.mjs（?? 未跟踪，他人批次）
working-tree total     = 44   ← 仅口头沟通使用；干净克隆上只有 42
```

`scripts/index-graph-layout.test.mjs` 与对方修改的
`src/core/explanation-index/indexGraphLayout.ts` 属**同一逻辑闭环**（该测试正是为那套修改新增的），
故**必须与其源码同批、由产生它们的会话提交** —— 我们两批都不收编它。
