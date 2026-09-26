# go-design-split-fusion — 批次 README

> Go 语言设计解释卡（`k_goexplain_design`，1709 字，五个主题挤一张）五段拆分融合：留精华、并时间线、立新节点。
> 状态 **COMMITTED** · 内容提交 `90d8c55` · 登记 `be94cd0` · manifest `batch-manifests/go-design-split-fusion.json`
> 本文件为**唯一保留文档**：原 `plan` / `apply-report` / `verification` / `ui-probe` 四份报告已无损收编于下文（docs chore 提交，2026-09-24）。

| 验收项 | 读数 |
| --- | --- |
| 独立验证（verify，不 import apply） | **14 / 14 PASS**，failures=0 |
| UI 无头探针（CDP） | **7 / 7 PASS**，pageExceptions 0 / consoleErrors 0（含刷新复测） |
| 回归 | `tsc --noEmit` 0 · `npm test` 68/68 |
| 就绪门 | **READY** · blockers=[] |
| 结构 Δ（实际落盘） | 池 3871→**3872** · 树 3227→**3228**（go 子 15→16）· 边 4161→**4162** |

---

## 1. 背景与触发

- 用户粘贴 Go 维基百科原文（无指令）→ AskUserQuestion 裁决：**「这是 go 语言设计的解释卡，拆分融合」**。
- 两项结构裁决：① Versioning（版本策略）段拆出去 → **新建子节点挂树**；② 泛型时间线并入 `k_go_generic` 的顺序 → 用户答「？这个不是知识本身的属性」⇒ 按**「先定义后演进」**处理（现有正文在前、融合段在后），留档开放事项。
- 前置处置：工作树发现 **15 小时外部漂移**（并发会话 Spring Boot 批 + 本批涉及的 Go 卡编辑），用户裁决**「全部采纳不还原」**⇒ 先落采纳批 `bbac1b7`（内容）/`33a5902`（登记）推进 HEAD，本批从新 HEAD 干净起步。
- 祖先前景：`HEAD(33a5902):data/` 六文件 ↔ apply 备份快照 **逐字节相等 6/6**（Buffer.compare，node-pool 11735022 B · sha256 前 16 位 036fe47cb3ed15f2）⇒ Ancestor Gate 前景 PASS，无漂移夹带。

## 2. 病灶（plan）

`k_goexplain_design`（语言设计）一张卡挤了**五个主题**（1709 字，行已被压平）：
①设计目标 ②历史/成功归因 ③泛型时间线 ④Versioning（英文）⑤Pike 2015 设计讲座。
其中 ②③④ 在 Go 子树已有专属节点（历史 89 字 / 泛型 620 字 / 无版本节点）。

## 3. 角色 → id 映射（硬纪律：具名绑定 id，禁用 A/B）

| 角色 | id | label | 动作 |
| --- | --- | --- | --- |
| SURVIVOR | `k_goexplain_design` | 语言设计 | 留 P1 设计目标 + P5 Pike 讲座，**420 字**（原 1709）；迁出 P2/P3/P4 |
| HISTORY | `k_1787722763547_no5htk` | 历史 | 融合 P2（现有 89 字在前，编年顺序），89 → **363 字** |
| GENERICS | `k_go_generic` | 泛型 | 融合 P3 时间线（现有用法正文在前），620 → **950 字** |
| NEW | `k_go_versioning` | 版本策略 | 新建池实体 + 挂树 go 子节点 + 1 条 treebind 边；内容 = P4 照搬（不翻译），**577 字** |

## 4. 段切分与剥离清单

**切分（锚串，P1..P5 + 分隔符拼回必须 == DONOR 原文逐字节）**

| 段 | 起点 → 终点锚 | 去向 |
| --- | --- | --- |
| P1 | 「静态类型 和 运行时 效率」→「受到激励。」 | SURVIVOR（保留） |
| P2 | 「Go于2009年11月正式发布」→「并不是最重要的。」 | HISTORY（追加） |
| P3 | 「泛型\n初始版本的Go缺乏」→「版本1.18中添加到Go中。」 | GENERICS（追加，剥 CSS 残渣+标题行） |
| P4 | 「Versioning\nGo 1 guarantees」→「over potential breaking changes.」 | NEW `k_go_versioning`（rootContent，含标题行） |
| P5 | 「设计\n2015年Rob Pike的讲座」→「来实现。」（卡尾） | SURVIVOR（追加，剥校验残渣+标题行） |

**剥离清单（strip-injected-artifacts 先例，逐项登记）**

1. `[failed verification – see discussion]` ×1（P5，wiki 校验标记）
2. `.mw-parser-output.monospaced{font-family:monospace,monospace}` ×1（P3，wiki CSS 残渣 → 剩 `go2go`）
3. 段首标题行剥离 ×2：P3 的 `泛型\n`（与目标节点 label 逐字重复）、P5 的 `设计\n`（与 SURVIVOR label 重复）；P4 的 `Versioning\n` **保留**（与中文 label「版本策略」不重复，原文形态）

## 5. 零造数据闸门（plan 硬规则）

- 每个 P 段切分前必须在 DONOR `includes()` 命中；迁入后（剥后串）必须在目标卡 `includes()` 命中
- P1..P5 + 分隔符拼回 === DONOR 逐字节（未归类段必须 0）
- 负对照 ≥3：不得命中任何输出卡
- HISTORY / GENERICS 现有正文**逐字节保留**（融合是追加不是覆盖）

## 6. apply 报告（`scripts/apply-go-design-split-fusion.mjs`，默认 dry-run；dry-run 全绿后 `--apply`）

**G1–G7 闸（两轮全 PASS）**

- **G1 零造数据**：五段独立切分后 `cuts.join('\n\n') === DONOR`（1709 字逐字节拼回）
- **G3 剥杂质**：P3 剥 CSS 残渣；P5 剥 `[failed verification…]`；两段剥标题行；`\n{3,}` 压平
- **G4 防重复/防覆盖**：HISTORY / GENERICS 以旧文为底追加（仅去尾空白）；NEW 节点存在即中止，绝不覆盖
- **G5 负对照**：`['goroutine 泄漏探测器','Go 2.0 规范','泛型即可协程']` 三串不命中（⚠️ 首版误选 `~int | ~float64`——本就在泛型卡既有代码例里，已换）
- **G6 备份**：`data/backups/go-design-split-fusion-2026-09-24T10-40-55-308Z/`（六文件：node-pool 11735022 B / tree-data 1943794 B / knowledge-edges 1138979 B / questions 1403060 B / evolution-events 3773 B / version-chains 2157 B；apply 前自动拍摄，gitignore 覆盖，不入库，本地可复跑）
- **G7 写后自检**：变更集合恰为 3 改（SURVIVOR/HISTORY/GENERICS）+ 1 增（`k_go_versioning`）；池 3871→3872；go 子 15→16；边 4161→4162

## 7. 独立验证（`scripts/verify-go-design-split-fusion.mjs`，不 import apply，从备份快照反推，期望值独立构建）

实跑两次（apply 后 + 提交前），**14/14 PASS · failures=0 · 退出码 0**：

```
PASS  V1 五段独立重切拼回 === before DONOR  [1709 字]
PASS  V3 SURVIVOR 正文 = P1 + P5（剥后）
PASS  V3b HISTORY 正文 = 旧89字 + P2（旧文逐字节保留）
PASS  V3c GENERICS 正文 = 旧620字 + P3（旧文逐字节保留）
PASS  V3d NEW 节点 = P4（Versioning 原文含标题行）
PASS  V3e NEW tags 沿库内惯例
PASS  V4 负对照 3 串不命中
PASS  V4b 杂质全库输出卡零残留
PASS  V5 池 Δ = +1/-0/3 改  [added=k_go_versioning modified=k_1787722763547_no5htk,k_goexplain_design,k_go_generic]
PASS  V5b 池 3871→3872
PASS  V6 go 子 15→16 且新叶子正确
PASS  V6b 摘除新叶子后整树与 before 逐字节等价（树除 go 子外零改动）
PASS  V6c 边 4161→4162 且形态正确
PASS  V6d 既有边零改动
```

**关键断言说明**

- **V1**：verify 内**独立重写**五段锚串并从 before DONOR 重切，拼回逐字节相等 ⇒ 零造数据。
- **V3b/V3c**：追加段前旧文逐字节保留（`startsWith(before…)`）⇒ 只增不覆盖。
- **V6b**：在 after 树的**深克隆**上摘除新叶 `tree_go_versioning` 后与 before 整树逐字节等价 ⇒ 树除 go 子树外零改动（别名污染教训：不能在原对象上摘）。
- **V4**：三串库内不存在的内容不命中输出 ⇒ 证明断言非永真。

**回归**：`tsc --noEmit` 0 · `npm test` 68/68（apply 后实测）。

## 8. UI 探针（临时数据目录 + vite preview 4192 + 无头 Chromium CDP 9341）

套路：临时数据目录 `.tmp-ui-data-gosplit/`（六文件，apply 后 data 复制）+ `vite preview 4192`（`/api/data?file=<f>` 服务端复核：池 3872 · 四节点 rootContent 长度 420/363/950/577 与磁盘一致）+ CDP 9341，屏蔽 `*fonts.googleapis.com*`。

实跑 **7/7 PASS · pageExceptions 0 · consoleErrors 0**（刷新复测含在内）：

| # | 项 | 读数 |
| --- | --- | --- |
| T0 | 应用加载无异常 | PASS · pageExceptions=0 consoleErrors=0 |
| T1 | 语言设计卡（SURVIVOR 瘦身） | PASS · len=420 · 含 P1 设计目标 / 反 C++ 动机 / 2015 Pike 讲座 / goroutine 原语 = true/true/true/true |
| T2 | 历史卡（HISTORY 融合） | PASS · len=363 · 含旧 2007 动机 / 2009-11 发布 / 1.0@2012-03 / 工程工作 = true/true/true/true |
| T3 | 泛型卡（GENERICS 融合） | PASS · len=950 · 含旧用法 / 2018 草案 / go2go / 1.18 落地 = true；**CSS 残渣 mw-parser-output = false**（零残留） |
| T4 | 版本策略卡（NEW） | PASS · len=577 · 含兼容承诺 / go1.[major].[patch] / never reach 2.0 = true/true/true |
| T4b | 树上「版本策略」叶子可见 | PASS · 展开 4 层祖先 folder icon 后 visible=true |
| T5 | 刷新后复现 | PASS · 版本策略 / 语言设计均能再次打开 · pageExceptions=0 |

歧义 label 处理：「语言设计」树/表 3 行、「历史」22 行匹配 → `openUntilAnchor(label, anchorTight)` 逐行点开至锚点命中（T1 matchedRow=3 · T2 matchedRow=22），打开的均验证为目标卡（len 与磁盘 rootContent 长度一致）。

临时产物处置：探针脚本 `.tmp-uiprobe-gosplit.mjs`、临时数据目录、Chrome profile 用后即删（AGENTS.md 约定；Chrome profile 被 safe-delete 回收站路由拦死，以 `cmd //c "rd /s /q"` 删除）。

## 9. 量具修复与教训（均为缺陷修复，未改期望值）

1. **apply G5 负对照选串**：`~int | ~float64` 本就在泛型卡既有代码例里 ⇒ 换三串专用负对照。
2. **UI T1 锚串漏括号**：原文「轻量级进程（goroutines），通道和select语句」中 `goroutines` 后有 `）`，锚串漏掉即恒假 ⇒ 修为含括号全串。教训：**includes 断言的锚串先在数据上本地验一遍**。
3. **UI T4b 树展开交互**：展开在 `.tree-node-icon--folder`（role=button，`setIsOpen` 本地 state，默认折叠，`aria-expanded` 判别）；**点 `.tree-node-row` 只是 onSelect 不展开** ⇒ 自底向上收集未展开 folder icon 逐个 dispatch click。
4. **verify split 陷阱**：`split(sep, '')` 第二参是 limit ⇒ 必须 `rm(s,x)=s.split(x).join('')`；V6b 摘新叶必须在深克隆上做。
5. **preview 假失败**：`npx vite preview ... & sleep 4 && curl` 报 http=000 ≠ 没起来——先 `netstat -ano | grep -E ":(4192)\b"` 查陈旧进程（本次 4192 其实已在监听，curl 打太早）。
6. **取证脚本笔误**：DFS 祖先链 `chain.push(...path)` 会把整条链带出，曾误报挂载点为 demo_cs；真挂载即 go 节点（V6b 逐字节等价早已证明），判挂载以 verify 断言为准。

## 10. 结构 Δ 与提交链

- 新树节点 **`tree_go_versioning`**（name=版本策略，nodeRef=`k_go_versioning`，挂 `tree_1786618025853_3qn55e`/go 下，go 子 15→16）
- 新边 **`treebind:tree_1786618025853_3qn55e:tree_go_versioning`**（source=`k_1786618025492_dmwekx` · target=`k_go_versioning` · type=belongs-to · relationKind=structure）
- 就绪门：**READY · blockers=[]**（报告 `outputs/tree-violation-scan/readiness-go-design-split-fusion.json`，excludedSet，不入库）
- 提交：① `90d8c55` 内容提交（writeSet 10 项 = data 三件 + apply/verify 脚本 + 四报告 + manifest；staged 机检 ≡ writeSet，blob 级无 pathspec）② `be94cd0` 登记 manifest COMMITTED + commitSha
- ⚠️ **口径提醒**：顶部读数表的 Δ（3871→3872 / 3227→3228 / 4161→4162）是**实际落盘值**；原 plan 里的 3870→3871 / 3203→3204 / 4155→4156 是 plan 起草时（baseRef `c943c66`，采纳批推进 HEAD **之前**）的预期值，两者勿混用。

## 11. 开放事项

- 融合顺序「先定义后演进」系用户含糊裁决（「这个不是知识本身的属性」）下的定案；若后续给出明确顺序偏好，需另批调整 HISTORY/GENERICS 段内次序（当前均为旧文在前、融合段在后）。
- P4 含英文原句（`Go 1 guarantees compatibility…`）未翻译，与库内其他 wiki 卡中英混排惯例一致，未做归一。
- 读态空白债 1644 张（前批登记的独立 UX 债）与本批无关，不阻塞不顺手修。

## 12. 收编说明（docs chore）

原四份报告内容已全部收编于本文，原文路径与对应章节：

| 原文件（已删） | 收编至 |
| --- | --- |
| `go-design-split-fusion-plan.md` | §2 病灶 · §3 角色映射 · §4 切分剥离 · §5 零造数据闸门 · plan 已证事实（语言设计树节点为叶子 ⇒ 读态无容器宿主问题；三个既有实体各恰 1 条 treebind 边，本子树 1:1 成立）· 预期 Δ（口径提醒） |
| `go-design-split-fusion-apply-report.md` | §6 apply G1–G7 |
| `go-design-split-fusion-verification.md` | §7 独立验证 |
| `go-design-split-fusion-ui-probe.md` | §8 UI 探针 |

仍在库的支撑文件：`scripts/apply-go-design-split-fusion.mjs`（默认 dry-run，`--apply` 才写）· `scripts/verify-go-design-split-fusion.mjs`（可复跑）· `batch-manifests/go-design-split-fusion.json`（四集合 + expectedDelta + gates，COMMITTED）· apply 备份 `data/backups/go-design-split-fusion-2026-09-24T10-40-55-308Z/`（gitignore，本地可复跑）。
