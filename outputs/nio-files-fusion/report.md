# NIO-FILES-FUSION（D 批）· 只读预检报告

> 生成时间：2026-09-15T19:50:47.884Z · **本报告由脚本机械产出，所有数字均计算得出（T3 纪律：报告内不出现手写数字）**

## ✅ 前置断言通过（四方树节点与池实体齐备）

## 1. 三方 + 一方的挂载形态

| 角色 | 实体 | 树节点 | 路径 | 挂载 | rootContent | tabs | 方法 tab |
|---|---|---|---|---|---|---|---|
| 承接方 | `k_java_nio_file_files` java.nio.file.Files | `tree_java_nio_file_files` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 类库 > java.nio.file.Files | 1 | 63 字 | 32 | **29** |
| 待融合 | `k_nio_files_util` Files工具类 | `tree_nio_files_util` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 类库 > Files工具类 | 1 | 0 字 | 1 | — (def 4539 字) |
| 索引导览 | `k_1787916226907_9aq9u6` 常见用法 | `tree_1787916227408_nkaljw` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 类库 > java.nio.file.Files > 常见用法 | 1 | 2131 字 | 0 | — (子 0) |
| 最佳实践 | `k_1787916124192_mow0sq` 最佳实践 | `tree_1787916125075_qsrbco` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 类库 > java.nio.file.Files > 最佳实践 | 1 | 723 字 | 0 | — (子 0) |

**承接方的非方法 tab**：`def/定义(278)` · `comparison/与传统IO对比(287)` · `bestPractices/最佳实践(291)`

**承接方的树子节点**：最佳实践[tree_1787916125075_qsrbco] · 常见用法[tree_1787916227408_nkaljw]

## 2. ★ 方法对齐（三方）

- 承接方 A 的方法 tab = **29**
- 待融合 B（Files工具类）机械提取方法 = **49**
- 索引导览 C（常见用法）机械提取方法 = **29**

| 关系 | 个数 | 说明 |
|---|---|---|
| A ∩ B | 27 | 两边都有（★ 即「重叠」） |
| A ∩ C | 29 | **C 的方法集与 A 的 tab 逐个全等** |
| B ∩ C | 27 | |
| **A − B（承接方有、工具类缺）** | **2** | ★ 这就是「缺口」（工具类导览不全），非缺陷 |
| A − C | 0 | |
| **仅 B 有（A/C 皆无）** | **22** | ★ 融合的净增量 |
| 仅 C 有（A/B 皆无） | 0 | |
| **B∪C 有而 A 无** | **22** | ★★ 融合要给 A 补的方法数 |
| **A − (B∪C)（真缺口，无人可补）** | **0** | 与上一行是**两个不同的判据**，勿混 |

- A ⊆ B（工具类含全部 tab 方法）：**否**
- A ⊆ (B∪C)：**是**
- C ⊆ A：**是**

**仅 B 有的 22 个方法**：

`notExists` · `isSymbolicLink` · `isHidden` · `createSymbolicLink` · `createLink` · `readString` · `writeString` · `walk` · `walkFileTree` · `setLastModifiedTime` · `getOwner` · `setOwner` · `getAttribute` · `setAttribute` · `readAttributes` · `isSameFile` · `getFileStore` · `getPosixFilePermissions` · `setPosixFilePermissions` · `newWatchService` · `register` · `take`

**A − B 的 2 个**（A 有而工具类缺）：`lines` · `newByteChannel`

**仅 C 有的 0 个**：（无）

## 3. 待融合方 B 的非方法资产

- 签名行合计 **61** 行（去重后 49 个方法名；重载行 12 行）
- 带返回类型的签名 9 行 · **不带返回类型 40 行**（← 体例不一致，提取器必须容忍）
- 分节 **8** 个 · 非签名 bullet **18** 条 = 枚常量 11 + 视图类引用 5 + 说明性条目 2

> ⚠️ **口径说明**：首版把「bullet 里没有 `(`」一律叫「选项常量」，把 `BasicFileAttributeView：…`、`监听事件：…` 这类也算了进去 ⇒ 名不副实。现按三分类分开统计（枚常量 / 视图类引用 / 说明性条目）。

| 分节 | 行数 | bullet | 枚常量 | 视图类 | 说明 |
|---|---|---|---|---|---|
| (前言/无分节) | 1 | 0 | 0 | 0 | 0 |
| 文件存在与类型判断 | 6 | 6 | 0 | 0 | 0 |
| 创建与删除 | 9 | 9 | 0 | 0 | 0 |
| 复制与移动 | 9 | 8 | 4 | 0 | 0 |
| 文件读写 | 22 | 21 | 7 | 0 | 0 |
| 目录遍历 | 8 | 8 | 0 | 0 | 0 |
| 文件属性 | 18 | 17 | 0 | 5 | 0 |
| 其他实用方法 | 5 | 5 | 0 | 0 | 0 |
| WatchService（文件变更监听） | 5 | 5 | 0 | 0 | 2 |

**枚常量全文（11 条）**——A 侧只在 bestPractices 里消费了 2 条，未解释其含义：

- StandardCopyOption.REPLACE_EXISTING：覆盖已存在的目标
- StandardCopyOption.COPY_ATTRIBUTES：复制文件属性
- StandardCopyOption.ATOMIC_MOVE：原子移动（move 专用）
- LinkOption.NOFOLLOW_LINKS：不跟随符号链接
- StandardOpenOption.READ：读模式
- StandardOpenOption.WRITE：写模式
- StandardOpenOption.APPEND：追加模式
- StandardOpenOption.TRUNCATE_EXISTING：截断已有文件
- StandardOpenOption.CREATE：不存在则创建
- StandardOpenOption.CREATE_NEW：不存在则创建，已存在抛异常
- StandardOpenOption.DELETE_ON_CLOSE：关闭时删除

**视图类引用（5 条）**：

- BasicFileAttributeView：基本属性（所有平台）
- DosFileAttributeView：DOS 属性（Windows）
- PosixFileAttributeView：POSIX 属性（Unix/Linux，含权限）
- AclFileAttributeView：ACL 权限
- FileOwnerAttributeView：所有者

**说明性条目（2 条）**：

- 监听事件：ENTRY_CREATE、ENTRY_DELETE、ENTRY_MODIFY、OVERFLOW
- 可用于热部署、文件同步、配置变更监听等场景

### ★ 同行程多方法（口径差来源，1 行）

> 提取器只取行内**第一个** `(` 前的方法名 ⇒ 这些行里的第二个方法名不会被计入「45/49」这类数字。
> 这正是「人工数 23 个 vs 机械算 22 个」的差额来源，**必须显式报出而不是悄悄取一个**。

- - 通过 watchService.take()/poll() 获取变更事件

## 4. 重叠方法的文本丰富度（前 12 个）

| 方法 | A tab 标签 | A 字数 | B 行字数 | B 带返回类型 | C 行字数 | C 带返回类型 |
|---|---|---|---|---|---|---|
| `copy` | copy() | 84 | 60 | false | 71 | true |
| `move` | move() | 78 | 64 | false | 76 | true |
| `delete` | delete() | 38 | 36 | false | 36 | true |
| `deleteIfExists` | deleteIfExists() | 54 | 48 | false | 52 | true |
| `exists` | exists() | 68 | 57 | true | 66 | true |
| `isDirectory` | isDirectory() | 74 | 61 | true | 70 | true |
| `isRegularFile` | isRegularFile() | 78 | 65 | true | 74 | true |
| `isReadable` | isReadable() | 49 | 28 | false | 47 | true |
| `isWritable` | isWritable() | 49 | 28 | false | 47 | true |
| `isExecutable` | isExecutable() | 52 | 31 | false | 50 | true |
| `size` | size() | 42 | 28 | false | 40 | true |
| `getLastModifiedTime` | getLastModifiedTime() | 84 | 64 | false | 80 | true |

## 5. tab 数越界判据（决定方案Ⅰ/Ⅲ是否可接受）

- 全库实体 **3852** 个 · tab 合计 **4061**
- tab 数分布：≤1 的有 **3479** 个 · ≥10 的有 **5** 个 · ≥40 的有 **0** 个
- 最大 = **36** · 次大 = **32**
- **tab 数超过承接方现有 32 的实体，全库只有 1 个**

| 排名 | 实体 | tabs |
|---|---|---|
| 1 | `k_java_lang_string` java.lang.String | 36 |
| 2 | `k_java_nio_file_files` java.nio.file.Files | 32 |
| 3 | `k_java_util_scanner` java.util.Scanner | 26 |
| 4 | `n_u4va719e` 数据库 | 25 |
| 5 | `k_wiki_en_outline_of_databases` 数据库概览（维基来源全文） | 12 |
| 6 | `k_acm2012_software_organization_virtual_machines` 虚拟机 | 9 |

- 类库(常用类库) 子树口径：实体 45 个 · >32 tab 的 1 个 · ≥20 tab 的 3 个

## 6. 边分布

- 提到两个实体/两个树节点的边共 **6** 条：

| 边 id | type | relationKind | source → target | dimensions |
|---|---|---|---|---|
| `treebind:tree_java_common_libraries:tree_java_nio_file_files` | belongs-to | structure | k_java_common_libraries → k_java_nio_file_files | ["java"] |
| `treebind:tree_java_nio_file_files:tree_1787916125075_qsrbco` | belongs-to | structure | k_java_nio_file_files → k_1787916124192_mow0sq | ["java","jdk-api"] |
| `treebind:tree_java_nio_file_files:tree_1787916227408_nkaljw` | belongs-to | structure | k_java_nio_file_files → k_1787916226907_9aq9u6 | ["java","jdk-api"] |
| `edge_io_nio_vs_files` | related-to | dependency | asplit_blocking_io_model → k_java_nio_file_files | ["java"] |
| `edge_java_io_vs_nio_files` | contrasts-with | comparison | asplit_blocking_io_model → k_java_nio_file_files | ["java"] |
| `treebind:tree_java_common_libraries:tree_nio_files_util` | belongs-to | structure | k_java_common_libraries → k_nio_files_util | ["java","jdk-api"] |

- 承接方父边存在：**✅** · 待融合方父边存在：**✅**

## 7. 方案与 Δ 预览

| 方案 | 名称 | A 的 tab 后 | Δ树 | Δ池 | Δ边 |
|---|---|---|---|---|---|
| Ⅰ | 全量吸收制（连 B 的重叠行也并入，不丢任何字） | 55 | -1 | -1 | -1 |
| Ⅱ | 整段并入制 | 33 | -1 | -1 | -1 |
| Ⅲ | 融合去重制（方法补 tab + 非签名资产收 tab + 重叠不重复收录） | 55 | -1 | -1 | -1 |
| Ⅳ | 导览重构制（A 的 tab 数不变，融合成果落在子节点导览上） | 32 | -1 | -1 | -1 |

### 方案 Ⅰ · 全量吸收制（连 B 的重叠行也并入，不丢任何字）

**动作**：把 B 的 22 个独有方法各建 1 个方法 tab；B 的 18 条非签名 bullet 收 1 个 tab；B 的 27 条**重叠行追加进 A 的对应既有 tab**；删 B

- ✅ 零判读风险：B 的每一个字都有落点
- ✅ 与 A 既有方法 tab 同构（家族惯例：方法一 tab）
- ✅ 新方法可独立索引/编辑/被 tag 库收录
- ⚠️ **改动面最大**：A 的 27 个既有 tab 全被改写（内容变长、双源混写）
- ⚠️ tab 数冲到全库第一（见 tabStats）
- ⚠️ richness 表显示 A 侧原本更全 ⇒ 追加 B 的重叠行多为**信息增益为零的填充**

### 方案 Ⅱ · 整段并入制

**动作**：B 的 def 全文（4539 字）作为 1 个 tab 并入 A；删 B

- ✅ 改动最小、零信息损失、与 A 批 bestPractices 搬运同形
- ✅ tab 数不变 ⇒ 不越界
- ⚠️ B 的 27 个与 A 重叠的方法**在一/两个实体内部重复描述**（真正意义的「重叠」没消除）
- ⚠️ 22 个新方法仍是一坨清单里的文本，不可独立索引

### 方案 Ⅲ · 融合去重制（方法补 tab + 非签名资产收 tab + 重叠不重复收录）

**动作**：A 侧保留既有 29 个方法 tab（其内容为既有事实源）；B 的 22 个独有方法补成 22 个方法 tab；B 的 18 条非签名 bullet（枚常量 11 + 视图类 5 + 说明 2）连同 8 个分节框架收成 1 个 tab；B 的 27 条重叠行不收录；删 B

- ✅ 消除「27 条重叠」与「22 条丢失」两个问题
- ✅ 新方法可独立索引
- ✅ 非签名资产首次有归属（A 的 bestPractices 只引用了 StandardCopyOption/StandardOpenOption 却没解释）
- ⚠️ tab 数冲到全库第一
- ⚠️ 需要逐条判定「A tab 内容是否够用」（richness 表即此判据）

### 方案 Ⅳ · 导览重构制（A 的 tab 数不变，融合成果落在子节点导览上）

**动作**：A 的 29 个方法 tab **原样不动**；把 B∪C 的 51 个方法合并成一份规范导览写进 A 的子节点「常见用法」（现 29 方法 / 2131 字 → 合并后 51 方法）；B 的 18 条非签名 bullet 一并并入该导览；删 B

- ✅ **tab 数完全不越界**（A 保持 32）
- ✅ 方法覆盖从 29 升到 51（补齐 22 个），且**一处导览即全**
- ✅ 顺带修复导览的陈旧（现只有 29 个方法 = A 的 tab 全集，缺 B 的 22 个）
- ✅ 与家族分工一致：A 的 tab = 精选方法，子节点导览 = 全量清单
- ⚠️ 新增的 22 个方法**不作为独立 tab** ⇒ 不可被 tag 库/索引图单独索引
- ⚠️ 导览是 rootContent 长文，不如 tab 那样可逐条编辑

> 本批只动池（+0 实体 / −1 实体 / 1 实体被改）+ 树（−1 节点）+ 边（−1 条）⇒ 树 3205→3204 · 池 3852→3851 · 边 4157→4156（若同时删 C 则再 −1/−1/−1）。

## 8. 决策点（待用户裁决）

### D1 · 融合方向与主体

- B(工具类) → A(java.nio.file.Files)，A 为唯一事实源 ★
- A → B（反向）
- 双方都留（不融合）

> 建议：B → A：A 是树上的规范节点（直接挂 类库、有 2 个子节点、有 4 条边），B 是孤立叶子

### D2 · 融合方案（Ⅰ 全量吸收 / Ⅱ 整段并入 / Ⅲ 融合去重 / Ⅳ 导览重构）

- Ⅰ 全量吸收制（55 tab，A 的 27 个既有 tab 被改写）
- Ⅱ 整段并入制（33 tab，零损失但冗余留存）
- Ⅲ 融合去重制（55 tab，重叠丢弃；richness 表支持 A 侧更全）
- Ⅳ 导览重构制（32 tab 不变，融合成果落在子节点导览）

> 建议：Ⅲ 与 Ⅳ 是最有竞争力的两个：Ⅲ 结构最规范（方法一 tab，家族惯例）但 tab 数到 55；Ⅳ 不越界且顺带修复 C 的陈旧，代价是 22 个新方法不作独立 tab

### D3 · tab 数越界的取舍（仅方案Ⅰ/Ⅲ 需要）

- 接受 55 tab（全库第一，现最大 36）
- 只补「高价值」子集（需另定判据）
- 改用方案Ⅱ 或 Ⅳ（tab 数不变）

> 建议：待用户裁决 —— 全库 >32 tab 的实体只有 1 个，扩到 55 是显著越界；但类库家族本身就是方法一 tab 的形状（≥20 tab 的 3 个都在本子树）

### D4 · 索引导览「常见用法」(29 方法 / 2131 字) 的去留

- 留（作为人类可读导览，与 A 的 tab 并存）★
- 删（其方法集已被 A 的 tab 全覆盖）
- 用融合后的完整导览覆盖它

> 建议：★ 本条是本批**新发现**：C 的方法集与 A 的 29 个方法 tab **逐个全等** ⇒ C 是 A 的 tab 的来源导览。它不是「重叠缺陷」而是「同一实体的两种视图」，删它属结构清理而非内容融合，建议另裁或留

### D5 · A − B：承接方有而工具类缺的 2 个方法（`lines` / `newByteChannel`）

- 无需动作（A 已有，B 只是导览不全）★
- 补进融合后的导览

> 建议：★ A 已有 ⇒ 无缺口；仅作记录。注意与「真缺口 A − (B∪C) = 0 个」区分开

### D6 · 结果实体/节点的命名与 treeId

- 沿用 A 的现有 id（不改名）★
- 改名并语义化

> 建议：★ 沿用 —— 本批是内容融合，改名属另一类批次且会扩大写集

