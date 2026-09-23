# DEDUP-DUAL-COPY-NORMALIZED · APPLY 报告

- 时间：2026-09-24（本文件由**只读审计重建**；真实落盘发生在本会话之前的工作段）
- 数据目录：`data/`（真源）· apply 前六文件快照：`outputs/tree-violation-scan/dedup-dual-copy-normalized-snapshot/`
- 脚本：`scripts/apply-dedup-dual-copy-normalized.mjs`（默认 dry-run；`--apply` 落盘；`--snapshot-dir` 建快照）
- 裁决依据：**三路「保留更干净一侧」** —— 按空行数取更干净的一侧，**绝不默认以 tab 覆盖 root**

> **证据来源声明**：本环境无 bash（`run_terminal_command` 一律返回 `Bash is required but was not found`），
> 故本文件**不含 apply stdout 的逐行抄录，也不含复跑读数**。下表每一项 PASS 都由**盘上证据**支撑并在「读数」列标注来源；
> 无法从盘上直接取证的项标 `推断`，并给出推断链。待跑清单见文末。
> 另：manifest 与现库在 §5 的三张分层旁证上一致，但「是否存在过多次运行或手工介入」无法从盘上排除，
> 需靠验证文件 V1–V13 复跑裁定。

## 一、目标集口径（②③档 = 802 张）

| 档 | 判定式（`classifyCard`） | 张数 |
|---|---|---:|
| ② approx | 唯一 tab，且 `norm(rootContent) === norm(tab.content)` | 396 |
| ③ label-prefix | 唯一 tab，且 `norm(rootContent) === norm(label) + norm(tab.content)` | 406 |
| — | 合计目标集 | **802** |

其余档位（同一次全量分类）：`strict=0`（root 与 tab 逐字相等）· `other=555` · `root-empty=1577` · `multi-or-none=936`，
池总量 3870。

## 二、与先前预测数的差异（477/78/194 → 461/127/214）

- `477/78/194` 是**扫描器的 749 张长文本子集**（`norm` 长度 > 50 门槛）下的方向分布；
- 全量 802 张的真实基线为 `tab=461 / root=127 / tie=214`（来源：`manifest.json.directionCounts`）；
- 两套数不构成矛盾：前者是子集口径，后者是全量口径。脚本以全量 461/127/214 为**硬门**，并把该子集差异写入本报告。
- 连带的口径漂移（已在本会话修正）：`scripts/plan-dedup-dual-copy-normalized.mjs` 原用 `/\n\n/` 计空行，apply/verify 用 `/\n[ \t]*\n/`（含只带空格的空行）。
  两者在含空格空行上会分叉，故 `scripts/plan-dedup-dual-copy-normalized.mjs` 已对齐到后者，且默认只读（`--write` 才落 `.plan-802.json`）。

## 三、源门禁

| 项 | 说明 | 结果 | 读数（来源） |
|---|---|---|---|
| G1 | 池总量 = 3870 | PASS | 3870（`manifest.sourcePoolCount`） |
| G2 | 六类分组计数 = 硬编码期望（本批**先定义后执行**的基线门） | PASS | strict 0 / approx 396 / label-prefix 406 / other 555 / root-empty 1577 / multi-or-none 936（`EXPECTED_GROUPS`） |
| G3 | 目标集精确 = 802 | PASS | 802（`manifest.targetCount`） |
| G4 | 每张目标卡仍是「单 tab + root 非空 + 归一化候选」 | PASS | `manifest.targets[*].kind ∈ {approx,label-prefix}` 逐条成立 |
| G5 | 目标 tab 的 `id` 不被 `tree-data.json` 引用（防树侧悬空） | PASS | 写入顺序：门禁失败即 `throw`、manifest 不会落盘；manifest 在盘 ⇒ 该门禁已通过 |
| G6 | 目标卡无 `supplement.tabs` 需同步 | PASS | 同上 |
| G7 | tab 无「不可无损迁移」的附加字段（`pages` 非空 / `tags` 未在 entity 层冗余） | PASS | 主证：与 G5/G6 同理（门禁先于 manifest 落盘）。旁证降级：本环境检索计数模式出现假 0，grep 未采信；`tabMetadata` 的逐条普查归验证器复核 |
| G8 | 方向门禁 `tab=461 / root=127 / tie=214`，且三路覆盖全部目标 | PASS | `manifest.directionCounts`；461+127+214 = 802 |

## 四、判定与变更规则（逐行可复核）

```js
blankParagraphCount = (s) => (s.match(/\n[ \t]*\n/g) || []).length   // 方向代理
direction = tabBlank > rootBlank ? 'tab' : rootBlank > tabBlank ? 'root' : 'tie'
// 变更
if (direction === 'tab') card.rootContent = card.tabs[0].content     // 仅在 tab 侧更干净时
card.tabs = []                                                       // 三路一致：清空 tab 外壳
```

## 五、逐卡旁证（只读复核：快照 ↔ 现库）

| 分支 | 卡 | 快照（apply 前） | 现库（`data/`） | 结论 |
|---|---|---|---|---|
| tab | `aop_aproxy` | `tabs[0] = {id:"def", label:"定义", content:"用户调用目标对象…"}` | `tabs: []` 且 `rootContent` = 该 tab 正文 | 取 tab 侧 ✅ |
| root | `asplit_bias_acquire` | `rootContent = "线程进入同步代码块\n\n线程首次访问…"`（root 空行 1 · tab 空行 0） | `rootContent` **逐字不变**，`tabs: []` | 取 root 侧、未被 tab 覆盖 ✅ |
| tie | `demo_lock` | `rootContent = "**MySQL 锁机制** …"` · `tabs[0].label = "定义（MySQL 实例）"` | `rootContent` **逐字节相同**，`tabs: []` | 平手保留 root ✅ |

行号（便于复核）：`aop_aproxy` → data `node-pool.json:150306` / 快照 `:154337`；
`asplit_bias_acquire` → data `:153895` / 快照 `:158262`；`demo_lock` → data `:434` / 快照 `:458`、`:467`。
（802 张分层样本 48 tab / 8 root / 24 tie 的**全量**核对属独立验证器的职责，见验证文件。）

## 六、计数与波及面

| 项 | 前 | 后 | 说明 |
|---|---:|---:|---|
| 池实体 | 3870 | **3870** | 本批 0 增 0 删（只改 `card` 内部） |
| 树 / 边 / 问题 / 演化事件 / 版本链 | — | 未写 | apply 只写 `node-pool.json`；其余五文件期望与快照**逐字节相同**（待验证器复核） |

## 七、已知刻意损失与残余（需知，不再静默）

### 7.1 tab 外壳 label 随外壳一并丢弃 —— **有意**

- 事实：`card.tabs = []` 带走 `tab.label`。实测样例：`def` → 「定义」（`aop_aproxy`）、`def` → 「定义（MySQL 实例）」（`demo_lock`）。
- 处置：认定为**有意丢弃**（tab 外壳=冗余容器；正文已按方向归并到 `rootContent`）。本批起：
  - apply 的 manifest 逐卡记录 `tabLabel`，并新增 INFO 行披露非空标签数；
  - verify 新增向后兼容断言（manifest 有 `tabLabel` 时必须与源一致）+ 一行 INFO 披露被丢弃的标签数。
- 路线差异（务必知悉）：`scripts/shell-fusion/final87-core.mjs:179,185` 的 `mergeAndRetire` 走的是
  `mirrorSupplement(hostTreeId, { id: tabId, label: tabLabel, content })` —— **把外壳 label 镜像进 `supplement.tabs`**。
  本批**不镜像**。两条路线并存，别把本批当成漏做。
- 盘上那份 manifest 生成于本次改动**之前**，不含 `tabLabel`；本批的非空标签清单需补跑
  `scripts/plan-dedup-dual-copy-normalized.mjs --pool outputs/tree-violation-scan/dedup-dual-copy-normalized-snapshot/node-pool.json`。

### 7.2 ③档 root/tie 分支保留 label 前缀 —— **待定夺**

- 事实：`asplit_bias_acquire`（③ label-prefix，方向 root）落盘后 `rootContent` 仍以 label 原文
  「线程进入同步代码块」开头，即正文里保留了一行**与标题重复**的标签行。
- 不一致点：`scripts/plan-dedup-dual-copy-normalized.mjs` 把这类卡注释为「**剥前缀**但保留 root 的卡」，而 apply 只在 tab 分支替换 `rootContent`，
  root/tie 分支**逐字保留**（含前缀）⇒ 注释描述与实现不符。
- 成因：空行数代理在 ③ 档会偏向「标题+正文」的 root 侧（它多一个空行），于是保住了重复标题。
- 现状：**不动数据**（剥前缀属新的语义变更，需单独批次 + 独立验收），本报告仅登记。

### 7.3 口径漂移 —— **已修（本会话）**

见 §2 末段；`scripts/plan-dedup-dual-copy-normalized.mjs` 已对齐空行定义、默认不落盘、可 `--pool` 指向快照复核。

## 八、待跑验收（本机无 bash，**未执行**）

```bash
node scripts/verify-dedup-dual-copy-normalized.mjs
npx tsc --noEmit && npm run build && npm test
```

- 独立验证：`dedup-dual-copy-normalized-verification.md` —— **⬜ 未执行**（该文件为待跑执行单与预期值）
- UI 无头实测：`dedup-dual-copy-normalized-ui-probe.md` —— **⬜ 未执行**（同上）
- 标签清单与 461/127/214 ↔ 477/78/194 差集：`scripts/plan-dedup-dual-copy-normalized.mjs --pool <快照>/node-pool.json`（默认只读）

> 数据已落盘且有旁证，但**「本批已完成」的最终结论在验证器与 UI 实测跑通前不成立**（宪法「执行与验证」顺序：先扫描、再清单、后动手、最后复测）。
