# B 类（对比与区别型）处置记录 · 2026-09-12

> 宪法原则一 §1.5 代谢留痕。处置对象：五类违规扫描（`scripts/scan-tree-violations.mjs`，2026-09-12 13:01）第二类 · 对比与区别型全部 5 条。处置依据：宪法原则二 §2.5（树只长名词——对比形态不得成为树节点，正确载体为问题库）。

## 处置对象与动作总表

| 原树节点 | nodeRef（壳，池内保留） | 动作 |
|---|---|---|
| 公平与非公平获取锁的区别 | `k_1786026134480_l4zxsc` | 卸树 → `q_cmp_fair_lock` → steps 补双侧（公平锁/非公平锁/重入锁） |
| 各种内存模型之间的关系 | `k_1785931432129_axjwn9` | 卸树 → `q_cmp_memory_models`（steps 3 内存模型本体，一次到位） |
| CyclicBarrier和CountDownLatch的区别 | `k_1786090300883_brm9sq` | 卸树 → 已有卡 `q_1785772885753_inwxvu` 补 steps（CyclicBarrier/CountDownLatch/闭锁） |
| Hibernate 和 iBatis 的区别 | `k_vault_javamybatishibernateibatis_1mvvfq` | 卸树 → `q_cmp_hibernate_ibatis` → 补建 Hibernate 本体后 steps 补双侧 |
| 与雅加达企业 beans (EJB) 的关系 | `k_1784509153854_vab6c6` | 卸树 → `q_cmp_spring_ejb` → 补建 EJB 本体后 steps 补双侧 |

## 门禁执行（宪法原则一）

- **门一 · 零活引用**：五节点卸树前已核——`viewDimensions` 原子绑定、evolution-events、其他边均不引用（此前孤立对比叶）。
- **门二 · 内容迁移**：正文全部保留在壳内（壳不删）；问题卡经由 `answerSteps` 活引用指向**本体名词**，草稿生成走本体卡片而非壳。
- **门三 · 隔离与回滚**：备份两批——`data/backups/b-category-comparison-2026-09-12T11-08-58/`（主处置）、`data/backups/b-category-side-bodies-2026-09-12T11-45-58-021Z/`（侧本体补全）；壳全部标 `status: archived-redirect`，隔离期后按三重门禁定去留。
- **treebind 镜像边**：卸树后 5 条 `treebind:<parent>:<child>` 残留边已同步删除（与 UI `removeTreeNode` 行为对齐，避免悬空树 ID 引用）。

## 侧本体补全（第二轮，同日）

扫描发现三张 `q_cmp_*` 卡只挂单侧——**被比较对象在池内无本体**，违反「answerSteps 引用双方基础节点」的处置要求：

| 补建本体 | ID | 挂载 | 正文来源 |
|---|---|---|---|
| Hibernate | `k_1789213558020_f1h0imz` | 软件符号与工具/软件框架 | 收编自壳正文（O/R Mapping 定义段） |
| EJB（企业 JavaBeans） | `k_1789213558020_6rswrz3` | 软件符号与工具/软件框架 | 收编自壳正文（组件规范 + Pitchfork/Spring 关系段） |
| 公平锁 | `k_1789213558020_84f3pr4` | 锁/重入锁 | 收编自壳正文（FIFO 定义段） |
| 非公平锁 | `k_1789213558020_2w9cmeo` | 锁/重入锁 | 收编自壳正文（吞吐定义段） |

公平锁/非公平锁按宪法原则三判为「同一维度（获取策略）的两个并列本体」，不是「A 与 B」捆绑——重入锁作为宿主保留在 steps 第三步。

## 数字变化

| 指标 | 处置前 | 处置后 |
|---|---:|---:|
| 树条目 | 3290 | **3289**（-5 卸树 +4 侧本体） |
| 树内 B 类模式残留 | 5 | **0**（复跑扫描确认） |
| 问题总数 | 758 | **762**（+4 新卡；inwxvu 为既有卡补 steps） |
| answerSteps 写入 | 1 | **7** |
| 节点池 | 3843 | 3847（+4 本体；壳 5 个保留隔离中） |
| knowledge-edges | 4070 | 4065（-5 treebind 残留） |

## 遗留与后续

- 壳 5 个处于隔离期（archived-redirect），待稳定后按三重门禁评估融合或受控删除——公平/非公平壳的定义材料已收编进本体，是首批候选。
- 本轮只处理 B 类 5 条。A/C/D/E 四类共 249 条在 `violation-list.md` 待处置，建议批次：E+B（已完成）→ C 叶子壳 → D（需写 mechanismSpec/viewDimensions）→ 带子树的 A 与章节壳。
