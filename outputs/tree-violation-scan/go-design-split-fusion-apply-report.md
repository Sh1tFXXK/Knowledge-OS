# go-design-split-fusion — apply 报告

- 批次：`go-design-split-fusion`（Go 语言设计解释卡拆分融合，用户裁决：SURVIVOR=`k_goexplain_design` / HISTORY=`k_1787722763547_no5htk` / GENERICS=`k_go_generic` / NEW=`k_go_versioning`）
- 脚本：`scripts/apply-go-design-split-fusion.mjs`（默认 dry-run；dry-run 全绿后 `--apply` 落盘）
- 执行时间：2026-09-24（apply 备份时间戳 10-40-55Z）
- 基线：HEAD `33a5902`（外部漂移采纳批登记后），`data/backups/go-design-split-fusion-2026-09-24T10-40-55-308Z/` 六文件快照与 `HEAD:data/` 六文件逐字节相等（Buffer.compare 6/6 IDENTICAL，2026-09-24 复核）。

## 五段切分（P1..P5 锚串）

DONOR = `k_goexplain_design.card.rootContent`（1709 字）：

| 段 | 起点 → 终点锚 | 去向 |
| --- | --- | --- |
| P1 | 「静态类型 和 运行时 效率」→「受到激励。」 | SURVIVOR（保留） |
| P2 | 「Go于2009年11月正式发布」→「并不是最重要的。」 | HISTORY（追加） |
| P3 | 「泛型\n初始版本的Go缺乏」→「版本1.18中添加到Go中。」 | GENERICS（追加，剥 CSS 残渣+标题行） |
| P4 | 「Versioning\nGo 1 guarantees」→「over potential breaking changes.」 | NEW 节点 `k_go_versioning`（rootContent，含标题行） |
| P5 | 「设计\n2015年Rob Pike的讲座」→「来实现。」 | SURVIVOR（追加，剥 failed-verification 残渣+标题行） |

## G1–G7 闸（dry-run 与 --apply 两轮全 PASS）

- **G1 零造数据**：五段独立切分后 `cuts.join('\n\n') === DONOR`（1709 字逐字节拼回）。
- **G3 剥杂质**：P3 剥 `.mw-parser-output.monospaced{...}` CSS 残渣；P5 剥 `[failed verification – see discussion]`；两段剥标题行（`泛型\n` / `设计\n`）；`\n{3,}` 压平。
- **G4 防重复/防覆盖**：HISTORY / GENERICS 以旧文为底追加（旧文逐字节保留，仅去尾空白）；NEW 节点存在即中止，绝不覆盖。
- **G5 负对照**：`['goroutine 泄漏探测器', 'Go 2.0 规范', '泛型即可协程']` 三串不命中（首版误选 `~int | ~float64`——本就在泛型卡既有代码例里，已换）。
- **G6 备份**：`data/backups/go-design-split-fusion-2026-09-24T10-40-55-308Z/`（六文件，apply 前自动拍摄；gitignore 覆盖，不入库）。
- **G7 写后自检**：变更集合恰为 3 改（SURVIVOR/HISTORY/GENERICS）+ 1 增（`k_go_versioning`）；池 3871→3872；go 子 15→16；边 4161→4162。
- **结构 Δ**：树 `tree_1790219617527_m6qc7d`（核心设计思想）下新增叶子「版本策略」；边 +1 treebind。

## 剥离清单（用户裁决的结构处置）

1. P2（时间线动机/发布史）→ 历史卡 `k_1787722763547_no5htk`。
2. P3（泛型时间线）→ 泛型卡 `k_go_generic`。
3. P4（Versioning 段）→ 新建子节点 `k_go_versioning`（版本策略）挂树。

融合顺序裁决：用户答复「？这个不是知识本身的属性」→ 按「先定义后演进」处理（SURVIVOR = P1 设计目标 + P5 Pike 讲座；时间线内容全部外迁），已留档于 manifest provenance。
