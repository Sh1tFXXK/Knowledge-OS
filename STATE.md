# STATE.md — 沉积层剖面（2026-09-11）

> 事实 + 判断。不写愿景。规则与判断标准已上收至 [docs/CONSTITUTION.md](docs/CONSTITUTION.md)（五原则宪法，2026-09-12 颁布）；本文只记现状与数字，执行序列见宪法「执行与验证」节。上一版：2026-09-09。考古摘要：`outputs/archaeology-*.json`；能力盘点：`outputs/capability-audit/`（主交付为自包含 HTML）。

---

## 1. 数据里现在有什么

**规模**：节点 **3843** · 边 **4070** · tree 条目 **3290**（09-06 后重建过目录树，3192→3290）· 问题 **758** · 演化事件 **2**

**ID 身份（2026-09-09 考古结论，仍然有效）**

| 模式 | 约数 | 含义 |
|---|---:|---|
| `k_<13位时间戳>_<rand>` | 978 | `genId('k')` — **每次新建新 id，不幂等** |
| `k_*` 其他（含 `k_dict_`531） | ~800 | 多轮命名实验残留 |
| topic / `mysql_` / `concept_` / `theory_` slug | ~800 | 偏人工/专题命名 |
| `k_java_type_<sha16>` | 409 | JDK/源码导入，稳定摘要 |
| `k_wiki_{zh\|en}_*` | 380 | 路径派生；section 带 `_sN` |
| `k_vault_*` | 193 | vault/笔记路径派生 |
| `k_acm2012_*` | 144 | ACM CCS 分类 |
| 其余（web/n_/demo…） | <60 | |

**重导结论不变**：同一概念允许多批 id 共存（「页 / page」「数据结构」等多身）；稳定 id 只存在于 java/wiki/web/vault 派生方案；UI 路径不幂等。

**孤儿（09-09 测得，规模未再验证）**：不在 tree 647 · 不连边 898 · 既无树又无边 628（主体在 `k_dict_`/C13）。**边无 dimensions ≠ 坏数据**：importer/UI 的 `belongs-to`/`extends` 默认不写 dims，75% 无 dims 是方法指纹不是缺陷。

**死字段已物理删除（09-10）**：`definitionPages`、`provenance` 全库清除，schema 与代码同步收缩。

---

## 2. 09-10 → 09-11 发生了什么（本轮沉积）

**代码（已提交，全部验收过）**

| 事项 | 位置 | 状态 |
|---|---|---|
| 语义导入链整链删除 | 曾在 `scripts/import/semantic-*.mjs` + `ai-organizer` | **已删**。期望产物 `k_document_*`/`k_semantic_*` = 0，从未成功沉积；领域约束保留在 docs |
| 数据加载四层防护 | `dataValidation.ts` / `filePersistence.ts` / `useGraph.ts`（`blockedSlices`+`reloadFromFiles`）/ `ErrorBoundary`+`DataLoadBanner` | 已落地，验收 23/23 全绿。错误信封 fatal、失败切片不进 state 不回写、白屏有兜底 |
| 分类矩阵画丢/画重修复 | `core/sections/OrthogonalMatrixView.tsx` | 已修：所有 section 共同贡献原子列 + 分类块按区间重叠分 lane。demo_lock 5 section 全可见 |
| answerSteps 可选结构定位 | `types.ts` + `knowledge/answerComposer.ts` + `QuestionAnswerEditor.tsx` | 已落地，验收 29/29。步骤按稳定 `dimensionId/sectionId` 定位，丢定位退化为整节点不丢步；`q_lock_1` 已写入 6 步（1 整节点 + demo_lock 全 5 section）——**全库第一份非空 answerSteps** |
| 死代码清理 | useGraph 20 个 action、9 个文件、`@vitejs/plugin-react`、ReasoningKernel→FocusStage 改名 | knip/depcheck 复核后清掉 |

**一次性脚本（验收完即删，git 历史可找回）**：`verify-p0-guards` / `verify-lock-matrix` / `verify-answer-steps` / `set-lock-q1-steps` / `serialize-fuse` / `audit-expression-capability` / `temporal-regression` / `check_tx_perf*`。范式（CDP + 临时数据目录 + 磁盘真源断言）沉淀在工作日志，不在代码库。

**根目录清理**：30+ 个 6~8 月的 vite/timeline/link 开发日志、散落 PNG、`diag-check.json`、`gui-test-screenshots/`、`output/`（含 MinerU 中间产物与旧审计报告）、`.tmp_*` 全清；`.kimchi`/`.understand-anything`/`.tmp-*`/`ocr-output` 进 gitignore。**保留**：`outputs/`（考古摘要、能力盘点、融合试验材料、knip/depcheck 终版报告）、`docs/notes|sources`（导入审计原文）、`data/backups/`（gitignore 内）。

---

## 3. 表达能力盘点（2026-09-11，只读实证）

主交付：`outputs/capability-audit/系统表达能力盘点.html`（单文件自包含，含 9 张实拍）。要点文件：`.workbuddy/memory/表达能力盘点-要点.md`。**做机制/维度/树投影改动前先读它。**

**使用度（3843 节点里）**

- viewDimensions：**27 个节点**（0.7%）；33 维度 / 42 section / 260 原子绑定。layout：grid 40、matrix 1、btree 1；**stack/tree/chain/tagQuery 全 0**。
- `mechanismSpec`：**8 个节点**（kind=mechanism 的有 20 个 → 12 个「自称机制」无 spec 投影不出）。
- 问题卡：relatedNodeId 736 有指向、22 空；answerSteps **1/758**（只有 q_lock_1）——通道刚打通。
- `canonicalKey` 641 / `aliases` 89：**src/ 里零消费方**（纯账本字段；宪法门一扫描把 aliases 列入活引用检查）。
- `TreeRefSupplement`（路径特化 tab）14 个树节点在用——宪法原则二 §2.2 跨语境投影的落点之一。
- 树里 **88 个重复 nodeRef**（182 个树节点，跨一级分支 8 个）——曾判「合法用法」，**宪法序章 #3 已修正为待净化债务**（单一家园，跨语境改投影承载）。

**结构性事实（会咬人的）**

1. **排列是语义**：分类带 `start/span` 来自成员在 `orderedAtoms` 的下标 → 改原子顺序/增删原子 = 静默改结构含义。融合节点改引用会改下标，需 `buildContiguousSegments` 前后对比。
2. **结构两套机制**：树包含存边（`treebind:`/`treeprojection:` + belongs-to，单归属 first-wins）；组嵌套不存（GroupOverlay 现场算）。
3. **时态索引结构两来源**：树包含边 + 事件 `introducedNodes` 现场造边，事件优先；读历史进只读门禁。
4. **机制图读 `relationKind` 不读 `type`**：边 `type` 是自由文本 21 种、`relationKind` 是受控枚举 8 种，`caches`/`writes-to` 这类自由文本进不了机制图。
5. **词汇表不闭合**：`kind:'Concept'` 203 个 vs `'concept'` 106 个（枚举只认小写）；`relationKind:'comparison'` 4 条无枚举；`classification`/`evidence` 枚举 0 使用。
6. **答案正文是一次性快照，answerSteps 是活引用**，无反向同步——「本体改了下游跟不跟」第一样本是「不跟」。

**实拍暴露的数据问题（待处理清单）**：题目带 `#` 残留、一行并三道题（##38+39+40 错挂斜表方案）、`==与equals区别` 近似重复、MarkdownView 不剥 HTML 注释导致 `jdk-doc-v2:sha256` 溯源哈希泄漏进正文、MinerU 图片是临时 CDN 链接（未本地化）。

---

## 4. 哪些是手工的、不可覆盖的（不变）

- 近确定手工/专题：`concept_*`/`theory_*`/多数 `mysql_*` slug/topic_slug/`demo_*` — 有 dims、命名可读。
- 近确定机器可再生成：`k_java_type_*`/`k_wiki_*`/`k_web_*`/`k_acm2012_*`/`k_vault_*`。
- **分不出来的**：C12 `k_<timestamp>_`（923）与 C13 `k_dict_`（531）——无 origin 字段，不回填、不预设标签，等数据自己归纳。

---

## 5. 方法信不信（账本）

| 方法 | 还信？ | 判断 |
|---|---|---|
| Wikipedia CLI（`lib/import-wikipedia`） | 是 | 池内证据足 |
| JDK collections / java-source API | 是 | 正式入口仍在（npm scripts） |
| Web-link API | 是 | 小但干净 |
| 文档导入（document/mineru） | 是 | 题库/文章/自动三模式；`docs/notes` 审计链完整 |
| ~~语义草稿链（draft/projector/persistence/ai-organizer）~~ | **已否** | 从未沉积，已整链删除；约束留在 docs 供重做时参考 |
| `genId('k')` UI 新建 | 否（作身份） | 能用不幂等，重导必复制 |
| 不明 `k_dict_*` 批 | 否 | 第一批整批融合/处置候选（知识不删） |
| `genId` 之外的一切 UI 写路径 | 是（作编辑） | 四层防护后坏数据不进 store 不回写 |
| Governance/ontology 报告 | 否（作运行态） | 已退休进 `outputs/`，无视图消费 |

---

## 6. 现在认为稳定的不变量

1. **身份不唯一**：同一现实概念允许多 id；只有 java/wiki/web/vault 等派生方案幂等。
2. **tree 是投影主索引**：活知识 ≈ 有 `nodeRef`；重复 nodeRef 是待净化债务（宪法原则二 §2.1，单一家园）。
3. **card.tabs 恒为数组**（可空）；`definitionPages`/`provenance` 已物理删除，不再是字段。
4. **持久化切片**只有五个：`node-pool` / `knowledge-edges` / `tree-data` / `questions` / `evolution-events`（时态索引只读无 mutator）。
5. **失败切片双禁**：不进 state、不回写盘（09-11 起是机制保证，不是约定）。
6. **结构引用用稳定 ID**：answerSteps 定位记 `dimensionId/sectionId`，增删 section 不指错；机制归属读 `relationKind`。

---

## 7. 执行序列（宪法化后重排）

五原则宪法的完整判断标准与验收指标见 [docs/CONSTITUTION.md](docs/CONSTITUTION.md)「执行与验证」节。当前债务按宪法落点排队：

**① 原则一 · k_dict 尸骸处置（首个受控删除试点）**：`k_dict_*` 中「不在 tree 且无边」约 430+ 节点。先跑门一零活引用扫描（questions / evolution-events / viewDimensions / tree / edges / 别名六处）→ 零命中者出处置清单（格式沿用 `outputs/merge-trial-batch1-review.md`，融合试验材料已备好 144 组候选与 6 组样例）→ 按三重门禁分批走融合或受控删除，每批独立备份 + 独立提交。

**② 原则二 · 目录净化**：88 组重复 nodeRef 改为单一家园 + 投影承载（supplement / 类型边 / Tag 库路径查询）；647 个无树节点清点归入「待挂载 / 已退休 / 显式豁免」三态。

**③ 原则五 · 问答闭环扩面**：q_lock_1 是唯一 answerSteps 消费者。给 3~5 个已有结构的高频问题（demo_btree 5 section、demo_optimistic）补 steps，验证「结构定位 + 草稿生成」在非 lock 样本上成立；顺手清 22 个空 relatedNodeId 与题库入口卫生问题（`#` 残留、一行并三题、近似重复）。

**④ 原则四 · 词汇表闭合**（盘点 §5）：`Concept`→`concept` 归一、`comparison` 边归属、`classification/evidence` 用不用——一次只读清点后决定，不先改枚举。

**顺序纪律**：① 的扫描证据同时是 ② 无树清点的输入；③ 与 ② 互不阻塞；④ 独立。任何一步动刀前先只读扫描、后出清单、再动手、最后复测——宪法「执行与验证」节的顺序不可颠倒。

---

## 8. 工程现状速记

- 分支 `optimize/performance`；`data/node-pool.json` 存在少量未提交 UI 漂移（rootContent 写入/tag 增删/ReentrantLock 正文重排，无语义变化，待定夺是否随下批数据提交）。
- 测试基线：`npm test` 34/34（单元，`scripts/*.test.mjs`）；typecheck 0 错；build 正常（chunk >500kB 警告为既有）。浏览器回归范式见工作日志（无脚本文件）。
- scripts/ 只剩四类：`*.test.mjs`（npm test 挂载）+ `smoke-data-api.mjs` + `scan-tree-violations.mjs`（宪法 §2.6 常驻验收器，可复跑）+ `scripts/import/`（正式导入器）。一次性脚本用后即删是既定政策。
- `outputs/` 是「阶段产物层」：考古摘要、能力盘点、融合试验、终版 knip/depcheck 报告、违规扫描与处置记录；不进运行时、不被代码引用。

## 9. 五类违规处置进度（2026-09-12 起）

扫描基线：树 3290 条目定罪 254 条（`outputs/tree-violation-scan/`，清单含路径/子树/正文/题库重合）。处置顺序按危险度逆序：E+B → C 叶子壳 → D → 带子树 A/章节壳。

| 类 | 定罪 | 已处置 | 记录 |
|---|---:|---:|---|
| B 对比型 | 5 | **5（完成）** | `outputs/tree-violation-scan/b-category-disposition.md` |
| E 提问型 | 12 | 0 | 待 |
| C 教程壳 | 39（含 15 章节壳带 675 子节点） | 0 | 待；章节壳=去序号改实名，非删 |
| D 过程片段 | 43 | 0 | 待；步骤进 mechanismSpec、优缺点进 viewDimensions |
| A 捆绑型 | 155（真捆绑约 144） | 0 | 待；带子树 38 条需先定重挂方案 |

B 类附带产物：问题库 +4 卡（762）；answerSteps 1→7；补建 4 个缺失本体（Hibernate/EJB/公平锁/非公平锁，挂 软件框架 与 重入锁 下）；5 壳隔离中（archived-redirect，备份两批在 data/backups/）。

---

*摸清标准自检：java/wiki/web/vault/acm/demo/topic_slug 30 秒内点名方法；`k_dict_*`/多数 `k_<timestamp>_` 仍说「分不出来」；动结构（原子顺序/成员增删/节点融合）前先想「排列是语义」那条；动机制图前先读盘点要点文件。*
