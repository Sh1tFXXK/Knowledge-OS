# 待提交数据差异的三方拆解与定性（只读）

> 生成 2026-09-14T12:28:16.340Z · 模式 `READ_ONLY` —— 未 kill 进程、未回滚、未提交。

## 0. 结论

**`DRIFT_DECOMPOSABLE`**

「HEAD → 当前」的全部差异可干净二分为：外部批次（node-pool 127 键 + questions 1 条）+ 阶段一批次（node-pool 6 新增 + 1 修改），交集为 0。因此 T2 的阻塞项不是「等外部收敛」，而是「外部批次尚未获得一次独立提交」。

## 1. 为什么要四方基线（口径缺口）

`reconcile-external-changes.mjs` 只用「HEAD / 落盘前备份 / 当前工作树」三方。apply 落盘之后，
它会把**本任务自己的写入**（tree-data / edges / evolution-events 的落盘 + CONSTITUTION.md）判成「外部又在写入」，
于是输出「外部未收敛 → 建议继续等」。**这个结论是错的**，缺的是第四方：

| 方 | 来源 | 作用 |
|---|---|---|
| ① HEAD | `git show HEAD:<path>` | 已提交态 |
| ② 落盘前备份 | `data/backups/phase1-oop-os-2026-09-14T07-37-26-424Z/` | apply 前字节快照 |
| ③ apply 基线 md5 | `apply-baseline.json`（frozenAt 2026-09-14T07:30:42.043Z） | 把「本任务自己写的东西」剔除干净的锚点 |
| ④ 当前工作树 | `data/<file>` | 待提交态 |

| 基线一致性（② ≡ ③） | 结果 |
|---|---|
| `tree-data.json` | ✅ md5 相符 `362226dd44c538c1d06a0f02e0a7a305` |
| `node-pool.json` | ✅ md5 相符 `8ab8701dea416f2a41200fe6edefecfb` |
| `knowledge-edges.json` | ✅ md5 相符 `158231499bca2a2b400f2d1cc8ae45c1` |
| `evolution-events.json` | ✅ md5 相符 `957ba7549630124f2f3e1ec9449097ba` |
| `questions.json` | ✅ md5 相符 `91c39b6e9738f7290023265ac680aa5b` |

## 2. 拆解结果：两个批次，交集为 0

| 文件 | HEAD 键 | 备份键 | 当前键 | 外部差异 | 本批差异 | 可铺满 | 不相交 |
|---|---:|---:|---:|---:|---:|---|---|
| `node-pool.json` | 3849 | 3849 | 3855 | 127 | 7 | ✅ | ✅ |
| `questions.json` | 783 | 783 | 783 | 1 | 0 | ✅ | ✅ |
| `tree-data.json` | 5 | 5 | 5 | 0 | 1 | ✅ | ✅ |
| `knowledge-edges.json` | 4158 | 4158 | 4166 | 0 | 902 | ✅ | ✅ |
| `evolution-events.json` | 2 | 2 | 3 | 0 | 1 | ✅ | ✅ |

**注意**：`tree-data.json` / `knowledge-edges.json` / `evolution-events.json` 的外部差异为 **0** ——
它们 HEAD ≡ 备份，即**这三个文件的全部差异都是阶段一自己的**。外部批次只碰了 2 个文件。

### 2.1 外部批次 = `nodepool-tag-normalization`（候命名）

- `data/node-pool.json`：**127 键**内容差异，**无键增删**（HEAD 3849 键 = 备份 3849 键）
- `data/questions.json`：**1 条**（761）

| 字段 | 命中节点数 | 定性 |
|---|---:|---|
| `tags` | 125 | 首项归一化为「实体自身规范名」 |
| `viewDimensions` | 3 | 清理**悬空**原子引用 |
| `card` | 1 | 补齐缺失字段（rootContent） |
| `label` | 0 | — |

### 2.2 tags 改动的三个模式

| 模式 | 条数 | 含义 |
|---|---:|---|
| `PREPEND_ONE_AT_HEAD` | 76 | 新增一个值并置于首位（该值 = 实体规范名） |
| `PURE_REORDER` | 26 | 集合不变，把规范名提到首位（把「xxx详解 / 入门」降位） |
| `SET_CHANGE` | 23 | 集合本身变了（正体：全角括号 → 半角，等价值替换；另一条为删除重复标签） |

**tags[0] 与「实体自身规范名」的关系（127 键全量）**：

| 判定 | 条数 |
|---|---:|
| tags[0] 精确等于自身 `label` | 101 |
| tags[0] 是自身 `label` 的全/半角括号等价写法 | 26 |
| tags[0] 是树里的 name（但不是自身 label） | 0 |
| ⚠️ 三者都不是（旧值残留 / 引用他实体嫌疑） | **0** |

> 这一列是**关键判据**：宪法 §3.6 区分「身份耦合字段」与「展示字段」，`tags[0]` 是 alias-bearing 位。
> 若这批把 `tags[0]` 设成了**某个实体的旧名**，那它就是 T4 型 stale value，**不可提交**。实测 0 例。

### 2.3 viewDimensions：移除的是悬空引用（修复，非破坏）

| 节点 | label | 被移除的 atom | 该 nodeId 在当前池中存在？ |
|---|---|---|---|
| `n_55jiel25` | 计算机科学 | n_9hr0nvvv | ❌ **不存在 = 悬空** |
| `n_web_dev` | Web 开发 | react_export_import | ❌ **不存在 = 悬空** |
| `asplit_java_io_group` | java.io | k_file_console_group | ❌ **不存在 = 悬空** |
| `asplit_java_io_group` | java.io | k_java_io_nio | ❌ **不存在 = 悬空** |

### 2.4 card：补齐缺失字段

| 节点 | 新增字段 | 删除字段 | 变更字段 | tabs 未变 |
|---|---|---|---|---|
| `k_1789213558020_6rswrz3` | rootContent | — | — | ✅ |

## 3. 阶段一批次 = `phase1`

- 新增 6 键：`k_1789371087163_g81kcs`, `k_1789371087163_e9iafm`, `k_1789371436917_zo0k0j`, `k_1789371087163_g0db3p`, `k_1789371087163_25m6ob`, `k_1789371087163_b7qj6l`
- 内容修改 1 键：`k_class_programming_classification`
- 未声明新增（缺陷口径，须 0）：**0** ✅
- 声明未使用（预分配余量，观察项）：1 个 `k_1789371087163_1nvhv9` —— 同一语义实体多个来源，最终只建一个，属正常
- `data/tree-data.json` / `data/knowledge-edges.json` / `data/evolution-events.json` 的差异**全部**属本批。

## 4. 不变量断言

| 不变量 | 违反 | 结果 | 备注 |
|---|---:|---|---|
| card.nodeId ≡ 池键 | 0 | ✅ | 真正的不变量 |
| 外部改动不含键增删 | 0 | ✅ | HEAD 3849 键 = 备份 3849 键 |
| 外部 ∩ 本批 = ∅ | 0 | ✅ | 交集 0 个 |
| 两批恰好铺满 HEAD→当前 | 0 | ✅ | 6 新增 + 128 内容差异 = 外部 0+127 + 本批 6+1 |
| tags[0] 均可解释为「实体自身规范名」 | 0 | ✅ | 精确 101 + 全半角等价 26 + 仅在树名 0 |
| viewDimensions 移除项均为悬空引用 | 0 | ✅ | 3 个节点 · 4 个原子 |
| 备份目录 ≡ apply 基线 md5 | 0 | ✅ | apply-baseline.frozenAt 2026-09-14T07:30:42.043Z |
| 本批新增键 ⊆ apply-baseline.newIds（无未声明新增） | 0 | ✅ | 声明 7 个 · 实测 6 个 · 未声明新增 0 个 |
| 声明未使用的 id（观察项，非缺陷） | 0 | ✅ | k_1789371087163_1nvhv9 —— 预分配余量（同一语义实体多个来源，最终只建一个） |
| 外部改动早于本次 apply（非本任务产物） | 0 | ✅ | 落盘前备份的 md5 ≡ apply-baseline（apply 前 7 分钟）→ 127 键在 apply 之前就已在工作树里 |

## 5. 收敛性证据

| 项 | 值 |
|---|---|
| HEAD 提交 | `5a605e3` @ 2026-09-14T12:38:30+08:00 |
| 外部批次写入时刻 | **2026-09-14T05:00:11.127Z**（取自 `q_cmp_spring_ejb.updatedAt`） |
| 自报时刻 ≡ 文件 mtime | ✅ 吻合（差 <5s）：`2026-09-14T05:00:11.711Z` —— 本任务从未触碰 `questions.json`，故 mtime 仍停在外部写入那一刻 |
| 127 键早于本次 apply | ✅ 落盘前备份 md5 ≡ apply 基线 md5（`node-pool.json` 的 mtime 已被 15:37 的 apply 覆盖，只能靠 md5 锚定） |
| 距今静默时长 | **7.47 小时**（0 次写入） |
| 落盘前备份快照 | `phase1-oop-os-2026-09-14T07-37-26-424Z` @ 2026-09-14T07:37:26.450Z |

## 6. 处方

**T2 的阻塞项不是「等外部收敛」，而是「外部批次已收敛 7 小时但从未获得一次独立提交」** ——
`data/node-pool.json` 一个文件里同时承载两个批次，而 git 暂存是**文件级**，所以任何后续提交都必然夹带对方。

### 6.1 提交方案（blob 级，**工作树零触碰**）

| 目标 | index blob | HEAD blob | 字节 | ≡ apply 基线 md5 | 携带本任务产物 | 判定 |
|---|---|---|---:|---|---|---|
| `data/node-pool.json` | `fa533a3aa1db` | `cbc7a1712cbc` | 12649591 | ✅ | 0 项 | CLEAN |
| `data/questions.json` | git add（当前态即外部态 —— 本任务从未触碰该文件） | — | — | —（本任务从未触碰） | 0 项 | CLEAN |

```bash
unset CODEBUDDY_TOOL_CALL_ID
git hash-object -w data/backups/phase1-oop-os-2026-09-14T07-37-26-424Z/node-pool.json          # 写入备份态 blob
git update-index --cacheinfo 100644,fa533a3aa1dba0ce6c0bb4c436a7ac3345d9a496,data/node-pool.json
git add data/questions.json scripts/classify-nodepool-external-drift.mjs \
        outputs/tree-violation-scan/nodepool-drift-classification.json \
        outputs/tree-violation-scan/nodepool-drift-classification.md \
        batch-manifests/nodepool-tag-normalization.json
git commit -m "data: 外部打标归一化落盘 — tags[0] 规范名归一 127 键 + 悬空视图原子清理 3 处（外部会话 13:00 写入，经逐键定性后独立提交）"
# 提交后复验：HEAD:data/node-pool.json 的 blob 必须 = fa533a3aa1dba0ce6c0bb4c436a7ac3345d9a496
#           且 git diff HEAD -- data/node-pool.json 必须只剩本任务的 6 新增 + 1 修改
```

**提交后必须成立**：
- HEAD:data/node-pool.json blob ≡ fa533a3aa1dba0ce6c0bb4c436a7ac3345d9a496
- git status 中 data/node-pool.json 仍为 ` M`（工作树保留本任务改动）
- phase1 的 Ancestor Gate 转为 ✅（HEAD ≡ 落盘前备份）
- git revert / git reset --hard 5a605e3 可完整回滚（备份态 blob 已在对象库）

### 6.2 两条路对比

| | 做法 | 优点 | 代价 |
|---|---|---|---|
| **A（推荐）** | 外部批次独立成一次提交（上面的 blob 级方案）；随后 phase1 的 Ancestor Gate 自动转绿 | 归属清晰 · 工作树零风险 · 可精确回滚 · phase1 的 diff 恰好 = 本批操作 | 属「代第三方提交」→ **需治理授权** |
| B | 把外部 127+1 键显式声明为 phase1 的 `coCommittedExternalSet`，一次提交 | 只提交一次 | 违反「一批次一提交」；必须放宽 Ancestor Gate 判据（触碰「不要靠重定义期望值让闸门变绿」的纪律） |

> 两条路都**不需要等任何人**。差别只在提交归属，不在技术可行性。

## 7. 附带发现：`reconcile-external-changes.mjs` 的漂移口径在 apply 之后失效

该脚本只用「HEAD / 落盘前备份 / 当前工作树」三方，缺「本任务自己的写入记录」这第四方。
apply 落盘之后重跑它，会把自己写的 3 个 data 文件 + `docs/CONSTITUTION.md` 判成「外部仍在写入」，
于是输出「外部仍在写入（5 处）→ 外部批次未收敛 → 建议继续等」—— **这个结论是错的**，
而 T2 的「等外部」状态正是被这条错误结论长期锁住的。修法即本脚本采用的四方基线。
