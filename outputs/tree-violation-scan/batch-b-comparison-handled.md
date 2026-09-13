# 处置记录 · 第二类「对比与区别」5 条 → 问题库（2026-09-12）

> 性质：已执行批次的代谢留痕（宪法原则一 §1.5）。判断标准：原则二 §2.5（树只长名词，对比型正确载体=问题库）+ 原则五（每问有归处、骨架优先、入口卫生）。
> 证据链：只读扫描 `scripts/scan-tree-violations.mjs` → `violation-list.md` B 类 5 条（本批前基线：树 3290 · 题 758 · steps 1 张）→ 探查记录 `b5-scan2.txt` / `b5-scan3.txt` → 本批处置 → 复测（44 断言全绿，见下）→ 扫描复跑 **B 类 = 0 条**。
> 回滚备份：`data/backups/b-category-comparison-2026-09-12T11-08-58/`（四切片原样副本 + README）。一次性脚本按既定政策用后即删（方法摘要见文末）。

## 处置总览

| # | 原树条目（已卸载） | 壳节点（已标 archived-redirect，正文保留） | 问题卡 | relatedNodeId（挂树✓池内✓） | answerSteps 引用 |
|---|---|---|---|---|---|
| B1 | 公平与非公平获取锁的区别 @ 锁/重入锁 | `k_1786026134480_l4zxsc` | **新建** `q_cmp_fair_lock` | `k_1786017169554_blpxjf` 重入锁 | 重入锁 ×1 |
| B2 | 各种内存模型之间的关系 @ 内存模型/处理器的内存模型 | `k_1785931432129_axjwn9` | **新建** `q_cmp_memory_models` | `k_1784367508652_7bajap` 内存模型 | 内存模型（语言级 JMM）→ 处理器的内存模型（硬件级）→ 顺序一致性内存模型（理论参考） |
| B3 | CyclicBarrier和CountDownLatch的区别 @ 同步屏障CyclicBarrier | `k_1786090300883_brm9sq` | **升级既有** `q_1784954488087_1nxeeg`「CyclicBarrier与CountDownLatch比较」＋**清洗既有** `q_1785772885753_inwxvu` | `k_1786089851947_drblzk` 同步屏障CyclicBarrier | 同步屏障CyclicBarrier → CountDownLatch（java.util.concurrent，javadoc）→ 闭锁 |
| B4 | Hibernate 和 iBatis 的区别 @ Mybatis | `k_vault_javamybatishibernateibatis_1mvvfq` | **新建** `q_cmp_hibernate_ibatis` | `k_java_fw_mybatis` Mybatis | Mybatis ×1（答案取壳 tab[def] 权威全文 3065 字） |
| B5 | 与雅加达企业 beans (EJB) 的关系 @ Spring | `k_1784509153854_vab6c6` | **新建** `q_cmp_spring_ejb` | `k_java_fw_spring` Spring | Spring ×1（答案首句「这个容器」→「Spring 容器」代词修复） |

## 机器初判与裁决依据（逐条）

- **B1** 公平/非公平在池内**无独立节点**（全池 `/公平/` 零命中）；正文 128 字讲的是 ReentrantLock 的两种获取策略 → 问题卡指向宿主「重入锁」，steps 仅一方可锚。**双方缺席 = 内展需求信号**（原则五 §5.5 → 原则四排期：公平/非公平宜作「重入锁」的 section 或原子）。
- **B2** 壳正文点名的三方在池内**全部存在且挂树、均有正文**——本批唯一「真双方（三方）」样本，steps 三方齐引。
- **B3** 题库扫描发现**两张既有同指题**（`1nxeeg` 书面式 + `inwxvu` 乱码口语式），壳再挂树即三重复。裁决：选 `1nxeeg` 为正主（题干干净、kind=comparison、答案与壳互补不重叠）——并入壳 216 字、修指向（原指「常见类」容器壳 → 同步屏障本体）、补三步 steps；`inwxvu` 按 §5.4 做入口卫生（题文与答案的空格乱码为导入损伤，重构复原、指向归位、steps 同步），**两卡同指重复保留待融合裁决**（见待确认点 1）。CountDownLatch 的书式节点 `k_1786089247552_qt3bs0` 正文为空，锚 javadoc 版与「闭锁」概念节点。
- **B4** Hibernate 池内无节点（全池 `/Hibernate/i` 零命中，iBatis 即 MyBatis 前身，MyBatis 侧本体在树）。答案不用 rootContent 而用 tab[def]：root 是带标题前缀的扁平化复制品，tab 为原本。Hibernate 缺席记信号。
- **B5** EJB 池内无节点；「关系」型条目按 §2.5 定罪表归 B（`之间的关系$` 模式）。指向 Spring 本体，steps 一方可锚。

## 卸载与门的状态

- 树条目：3290 → **3285**（5 条全卸；卸前复核子树=0，无需重挂方案）。
- 镜像边：5 条 `treebind:父:子` belongs-to 边随条目一并清除（对齐 UI `removeTreeNode` 第 7 步；树包含存边是树的镜像，条目没了边留着会造成时态视图假包含）→ 边 4070 → **4065**。五棵树 ID 全切片零残留。
- 壳节点：**不删**。`status='archived-redirect'`（先例：`demo_table_lock` 等），正文原样保留 = 隔离期。门一现状：题卡不引用壳（steps 引双方）、树与边已清、无事件/vd 引用——**壳已达零活引用态**，物理移除留待隔离期后按门三另批执行。
- 门二：五条正文全部迁入问题卡 answer（B4=tab 全文；B3=入正主卡；迁移后壳内保留原文一份，融合后壳可出口）。

## 题库计数

- 问题 758 → **762**（+4 新建；1nxeeg/inwxvu 就地升级不算新增）。空 relatedNodeId：22 → **22**（inwxvu 原指向坏节点，本批修指向不算减账）。
- **answerSteps 非空卡 1 → 7**（全库 0.9%；本批 +6，是宪法原则五「骨架优先」继 q_lock_1 后最大一次落子）。

## 复测（一次性断言脚本，44/44 全绿）

树 3285 · 五条目不在树 · 壳 5/5 标记且正文保留 · 六张卡 relatedNodeId 池内+挂树（不变量 8）· steps 全部可解析 · 草稿可再生成（最厚 9158 字 = B2 三方 JMM 正文）· kind=comparison · inwxvu 乱码清零 · 扫描复跑 B 类 0 条（全库定罪 254 → 249）。

## 待确认点（下批人工裁决）

1. **B3 两卡同指重复**（`1nxeeg` × `inwxvu`）：按原则三融合为一张？若合，保留哪张题干、哪张答案段落作正（两者答案视角互补：1nxeeg=重置/AQS 本质，inwxvu=countDown-await 操作组合/目的论）。
2. **公平/非公平锁、Hibernate、EJB 双方节点缺席**：是否为三处对比补内展结构（重入锁加 section；Mybatis/Spring 加对比原子）——原则四「被问答引用的核心机制必须有承载」。
3. **壳物理删除隔离期**：5 壳已零活引用，是否并入原则一 k_dict 尸骸处置批次一起走门三。
4. `q_cmp_*` 四卡的 difficulty 赋值（basic/basic/intermediate/basic）为机器初判，可在题库视图人工校准。

---

*方法摘要（脚本已删，git 可找回本文件）：备份四切片 → 建卡（正文从池内壳节点直接读取，不手抄）→ 卸树条目（带子树即中止）→ 标壳 → 剥 treebind 镜像边 → 独立只读复测。全过程未跑任何 UI。若浏览器端 Knowledge-OS 仍开着旧会话，其下次保存会被数据 API 的 mtime 冲突检测拒绝（409），刷新即可装载新盘——防旧内存态覆盖，无需担心。*
