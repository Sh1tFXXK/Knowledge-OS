# 批次边界声明 · 分级治理规则

> 2026-09-25 起施行（用户裁决：选「分级」方案，废止「每批必建 manifest」的一刀切）。
> 规范正文见根 `README.md` 第十一篇；本文件是**该篇的分级细则 + 目录说明**。

## 0. 为什么分级

「一个改动一个 manifest」覆盖了最坏场景，但也让**单文件补录**这类改动背上了写 JSON 的成本，
结果是规范被绕过、声明事后补 —— 反而失去意义。分级的目的是把**机器断言**留在最需要它的地方：

- 硬不变量（`commitPathspec ≡ writeSet`、`writeSet ∩ declaredExternalSet = ∅`）
  **在任何级别都不消失**，只是 S 级由 manifest 文件承载、M 级由 commit message 内联承载。
- 漂移归属歧义风险越高，声明越重。

## 1. 三级判定

| 级别 | 触发条件（**命中任一即升到该级**） | 流程 | 产物 |
|---|---|---|---|
| **S**（完整 manifest） | ① 删除 > 10 节点 ② 存在跨会话漂移 ③ 结构重构（树/本体变动）④ writeSet 跨多类（data + scripts + outputs） | 完整 manifest + 就绪门全闸 | `batch-manifests/<id>.json` |
| **M**（轻量声明） | 单文件数据改动 / 内容补录 / 标签修正 / 单卡编辑 | 备份 + verify 脚本 + **commit message 内联声明** | 无新文件 |
| **L**（免声明） | 文档 typo / 脚本注释 / 纯 chore（非 data、非规范） | 直接 commit | 无 |

判定口诀：**动 data ⇒ 至少 M；动多个 data 文件或涉及删除 ⇒ S；不动 data ⇒ L。**

⚠️ **升级规则**：M 级开跑后若发现跨会话漂移、或改动范围扩大到多文件/删除类，
**立即升为 S 级**并补 manifest（先例：`delete-go` 批开始时看似单域清理，实际 39 节点 + 跨会话漂移 ⇒ S 级）。

## 2. S 级：完整 manifest

- 文件：`batch-manifests/<batchId>.json`，字段见 `_template.json` 与 README 第十一篇 §2。
- 三集合硬不变量不变：`writeSet`（= git add 唯一来源）/ `governanceSet` / `declaredExternalSet`。
- 就绪门：`node scripts/verify-phase1-commit-readiness.mjs --batch <id>`（默认即 S 级）。

## 3. M 级：commit message 内联声明

不建文件，声明写在**提交信息的 trailer 区**（正文之后、空行分隔），由就绪门解析：

```text
<标题行>

<正文>

Batch-Id: delete-go
Batch-Level: M
Batch-BaseRef: 1b1f712
Batch-Backup: data/backups/delete-golang-domain-20260925T225319
Batch-WriteSet: data/node-pool.json, scripts/apply-x.mjs
Batch-GovernanceSet: README.md
Batch-ExternalSet: src/styles/main.css
Batch-ExcludedSet: outputs/tree-violation-scan/readiness-delete-go.json
```

字段口径与 S 级 manifest **完全一致**（`Batch-WriteSet` ≡ `writeSet`，其余同理）：

| trailer | 对应 manifest 字段 | 必填 |
|---|---|---|
| `Batch-Id` | `batchId` | ✅ |
| `Batch-Level` | —（固定 `M`） | ✅ |
| `Batch-WriteSet` | `writeSet` | ✅ |
| `Batch-BaseRef` | `baseRef` | 建议 |
| `Batch-Backup` | `preBatchSnapshot` | 建议（Ancestor Gate 需要） |
| `Batch-GovernanceSet` | `governanceSet` | 可选 |
| `Batch-ExternalSet` | `declaredExternalSet` | 可选 |
| `Batch-ExcludedSet` | `excludedSet` | 可选 |

多路径用**英文逗号 + 空格**分隔。trailer 区必须是 `Key: value` 单行形态，
且**不能**含通配串（`inSet` 只认精确路径与尾斜杠前缀，写了等于没写）。

就绪门用法：

```bash
# 声明已写进上一次提交（自动读 git log -1）
node scripts/verify-phase1-commit-readiness.mjs --level M

# 声明还没提交（先给脚本看）
node scripts/verify-phase1-commit-readiness.mjs --level M --commit-msg-file .git/COMMIT_MSG
```

M 级**仍然跑全部闸门**（Ancestor / Timeline / Delta / pathspec / exclusion / tests），
只是声明来源从文件换成 commit message —— 「跳过 manifest 检查」= **不要求 manifest 文件**，
**不是**跳过闸门。硬不变量照旧机器断言。

## 4. L 级：免声明

不动 `data/`、不改治理规范时直接 commit。就绪门可跑个形式检查：

```bash
node scripts/verify-phase1-commit-readiness.mjs --level L   # 打印状态摘要，恒 exit 0
```

## 5. 存量 36 份 manifest

**归档保留，不迁不删**。它们是历史审计证据（含 `expectedDelta` id 清单、`testBaseline` 口径），
结构化数据塞进 markdown 会不可解析，单文件 append 在并发会话下易冲突 —— 故维持原样。
新批次按本文件的分级判定决定建不建新文件。
