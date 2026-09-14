# 批次边界声明（Batch Manifest）规范

> 2026-09-14 立项，**项目级规范**。每一个可提交批次都必须有一份 `batch-manifests/<batchId>.json`。

## 0. 为什么需要它

同一天里连续暴露三次**归属歧义**，根因是同一个 —— 没有显式声明，只能靠人工解释：

| 症状 | 根因 |
|---|---|
| B 闸把 `docs/CONSTITUTION.md` 的改动报成「本批写集之外的漂移」 | 治理文件没有独立集合，与批次写集共用一个白名单 |
| `npm test 44/44` 在干净克隆上不可复现（只有 42） | 没有声明「哪些测试属于已跟踪基线、哪些属他人在飞」 |
| `AGENTS.md` 与他人测试文件算谁的，说不清 | 没有「外部声明集」与「硬排除集」 |

于是提交前总要人工回答「这个文件是不是我们改的？这个 M 是不是外部的？」。
Manifest 让系统直接回答。

## 1. 位置与命名

- 目录：`batch-manifests/`，位于**仓库根**。
  ⚠️ 不能放 `.workbuddy/` —— 该目录在 `.gitignore` 里，声明文件必须随批次一起入库。
- 文件名 = `batchId`：`phase1.json` · `governance-v1.1.json` · `t3-registration.json`
- 模板：`batch-manifests/_template.json`

## 2. 字段表

| 字段 | 类型 | 含义 |
|---|---|---|
| `batchId` | string | 批次标识，与文件名一致 |
| `title` | string | 人类可读标题 |
| `baseRef` | string | 批次开始时的 `HEAD` 短 sha（祖先基准） |
| `preBatchSnapshot` | string | 落盘前备份目录（A 闸的比对对象） |
| `writeSet` | string[] | **本批能写、且要提交**的路径（提交 pathspec = 它） |
| `governanceSet` | string[] | 同期进行的**治理/方法论文档**改动：允许漂移，但**不由本批提交** |
| `declaredExternalSet` | string[] | 已确认属**其他会话/其他批次**的在飞文件：允许漂移，不提交 |
| `excludedSet` | string[] | **负向声明**：硬排除（本批绝不碰），提交时反查用。⚠️ **不构成认领** —— 见 §3.1 |
| `generatedArtifacts` | string[] | 本批产出的报告/台账（`writeSet` 的子集，便于追溯） |
| `expectedDelta` | object | 逐文件声明预期差异：`{ added, modified, removed }` |
| `testBaseline` | object | 测试基线口径，见 §6 |
| `gates` | object | 本批要过的闸门与判据 |
| `commitSubjectHint` | string | 建议的提交信息首行 |

## 3. 三个集合与 `unexpectedDrift`

```text
allowedDrift    = writeSet ∪ governanceSet ∪ declaredExternalSet
unexpectedDrift = trackedDrift − allowedDrift
判定            : unexpectedDrift == ∅
```

关键区分（**最容易混、且已锁死为硬不变量**的一点）：

```text
allowedDrift  ≠ pathspec
```

- `allowedDrift`（Timeline Gate）回答「**谁的改动**」→ 只影响**是否阻塞**。
- `pathspec`（提交）回答「**提交什么**」→ 只取 `writeSet`。
- 所以治理文件「允许漂移但不由本批提交」是自洽的：它被 `governanceSet` 豁免阻塞，
  再由它自己的批次（`governance-v1.1.json`）提交。

### ⛔ 硬不变量（2026-09-14 锁死，机器断言）

```text
commitPathspec ≡ writeSet          永远不并入 governanceSet / declaredExternalSet
writeSet ∩ (governanceSet ∪ declaredExternalSet) = ∅
writeSet ∩ excludedSet = ∅
```

目的是让「声明了大量外部文件」**不可能**导致自动提交器顺手把它们提交进去 ——
`declaredExternalSet` 只能解除漂移阻塞，**绝不进入自动生成的 pathspec**。

该不变量由 `verify-phase1-commit-readiness.mjs` 的 **`pathspecGate`** 与 **`exclusionGate`** 强制：
一旦 `writeSet` 与另两个集合（或与 `excludedSet`）相交，闸门直接 BLOCK 并列出越界路径。

### 3.1 `excludedSet` 是负向声明，**不是认领**（2026-09-14 实证）

`excludedSet` 回答的是「本批绝不碰什么」，**不等于**「这个文件有人管」。
把两者混为一谈会产生**静默归属漏洞**：

| 反模式 | 后果 |
|---|---|
| `excludedSet` 放**宽目录前缀**（如 `outputs/tree-violation-scan/`） | 该目录下**其实无人认领**的新文件被静默吞掉，核验报「0 个未登记」 |
| `excludedSet` 放**通配串**（如 `phase1-*.json`） | 匹配器只认「精确路径」与「尾斜杠前缀」→ 通配串**永不命中**，写了等于没写 |
| 同一路径同时在 `writeSet` 与 `excludedSet` | 自相矛盾（`exclusionGate` BLOCK） |
| 声明**文件级**路径、但该文件所在目录整体未跟踪 | git 把未跟踪目录折叠成一条 `?? dir/` → 文件级声明匹配不上，被误判「无人认领」 |

> 最后一条的解法：检查 D 会把**未跟踪目录展开成文件**再匹配（否则「声明了却判无人认领」）。
> 必须展开而不是把目录当成已认领 —— 否则声明一个目录前缀就能遮蔽其下所有未声明文件。

实证：T3 dry-run 的产物 `t3-mapping-review.md` 因第一条反模式漏出了 `writeSet`，
是同一天里第四次同类事故（**声明写了，但没生效**）。
故核验脚本的检查 D 按归属强度**三分**：正向认领 ✅ / 精确排除 ✅ / 仅目录前缀排除 ⚠️ / 无人认领 ⛔。

### 3.2 生成物落盘路径必须**按批次分文件**

反例：`verify-phase1-commit-readiness.mjs` 原固定写 `phase1-commit-readiness.json`，
于是任何 `--batch X` 运行都会覆盖它 → 该文件**无法归属任何批次**。
现改为 `readiness-<batchId>.json`，并在各 manifest 的 `excludedSet` 里精确登记（**不入库**：
它是每次运行的快照，含时间戳与漂移计数，跑一次变一次，提交它会留下永久 `M`）。

## 4. 两闸正交，**绝不能合并**

```text
Ancestor Gate   HEAD ↔ preBatchSnapshot        逐字节   → 「提交该文件 = 提交本批」是否成立
Timeline Gate   trackedDrift − allowedDrift == ∅        → 「还有没有别人在写」
```

- Ancestor Gate 是**唯一硬依据**：它不通过，提交就会夹带他人改动。
- Timeline Gate 通过**推不出** Ancestor Gate 通过（2026-09-14 实证：G2 ✅ 但 `node-pool` 的 HEAD 与基线差 127 个既有实体）。
- 合并二者会得出错误结论 —— 它们问的是两个不同问题。

## 5. 提交结构：一个批次一个提交，生命周期不同就分开

```text
Commit A   Phase 1 数据 + 实现/审计        ← phase1.json
Commit B   Constitution v1.1 + ADR + 台账  ← governance-v1.1.json
Commit C   T3 asplit_* 登记（仅登记）      ← t3-registration.json
Commit D   T3 asplit_* 实际迁移            ← 执行时另立
```

理由：**数据重构 ≠ 治理规则演进**。回滚 Phase 1 时不应被迫回滚已经成立的治理原则。
同一逻辑也适用 `tests`：测试与其对应的源码属同一闭包，由产生它们的批次提交（见 §6）。

## 6. 测试基线口径（不再写「`npm test` = N/N」）

`npm test` 是零参数 `node --test`，会**自动发现**所有 `*.test.mjs` —— 包括**未跟踪**的。
所以「工作树总项数」不等于「仓库基线项数」。每次报数必须三分：

```text
tracked baseline tests  = 42    ← 已跟踪测试文件贡献，批次验收以它为准
peer-added tests        =  2    ← 来自未跟踪文件（他人批次），不计入本批验收
working-tree total      = 44    ← 两者相加，只在口头沟通时用
```

Phase 1 的干净提交验收 = **42/42**。
等 peer 的测试与源码一起进入它自己的提交后，才形成新的全库基线 44/44。

## 7. 纪律

1. **批次开跑前先写 manifest**，不要事后补 —— 否则写集是「回忆出来的」，又会退化成人工解释。
2. `writeSet` 是 `git add` 的**唯一来源**；提交命令从 manifest 生成，不手写。
3. 新发现的外部改动 → **登记进 `declaredExternalSet` 并注明归属依据**，不要只用 `git checkout` 规避。
4. `expectedDelta` 必须**量化**（条数 + 具体 id 清单），否则 C 类闸门无法判定「超出声明」。
5. manifest 本身随**它所属的批次**提交；模板与规范（本文件）随治理提交。
6. `excludedSet` **只写精确路径**（或确有大意的目录，且必须自知它会遮蔽其下一切）。
   ⛔ 禁止写通配串 —— 匹配器不认，写了等于没写（静默失效的声明比缺声明更危险）。
   ⛔ 不要用宽目录前缀代替逐文件声明：它会把「其实无人认领」的文件吞掉（见 §3.1）。
7. 任何脚本的**生成物路径必须带 `batchId`**（如 `readiness-<batchId>.json`）。
   共用一个固定文件名 = 该文件永远无法归属任何批次。
8. 新增/改名产物后**重跑核验**，确认检查 D 的「仅目录前缀排除⚠️」与「无人认领⛔」都是 0。
