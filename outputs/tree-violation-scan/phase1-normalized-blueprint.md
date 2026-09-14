# 阶段一 Normalized Blueprint（簇 1 + 簇 4）

> 生成时间 2026-09-14T07:07:59.238Z · **只读**：本文件只是规格，未写任何 data/
> 源：`data/tree-data.json`（结构） + `data/node-pool.json`（nodeRef/tags 只读）
> 机器可读版：`outputs/tree-violation-scan/phase1-operations.json`

## 0. 操作总览（原始蓝图 18 行 → 规范化后 20 个操作单元）

| opId | 簇 | action | 状态 | 说明 |
|---|---|---|---|---|
| `C1-01` | 簇1 | `decision` | 🔶 待裁决 | 在 `面向对象 > 类` 下设立唯一的 `类的分类` 树节点 |
| `C1-02` | 簇1 | `rename` | ✅ READY | 在 面向对象 > 类 下设立唯一的 `类的分类` 树节点 + 所有形态平铺其下 |
| `C1-03` | 簇1 | `move` | 🔶 待裁决 | `抽象类` 从 `Java syntax > 修饰符 > 抽象类` 移入 `类 > 类的分类 |
| `C1-04` | 簇1 | `move` | 🔶 待裁决 | `内部类` 从 `类（编程） > 分类 > 局部类与内部类` 移入 `类 > 类的分类` |
| `C1-05` | 簇1 | `noop` | ⛔ 无效 | `具体类/最终类/封闭类/局部类/匿名类/元类` 移入 `类 > 类的分类` |
| `C1-09` | 簇1 | `rewire` | 🔶 待裁决 | （蓝图未写，规范化过程中查出）「Java 具象隔离」的真正前提 |
| `C1-06` | 簇1 | `set-field` | 📝 规格不全 | 在 `类的分类` 内部编排 `viewDimensions`（按抽象/继承/作用域/生命周期 |
| `C1-07` | 簇1 | `rewire` | ⛔ 无效 | `Java 密封类 --[implements]--> 封闭类` |
| `C1-08` | 簇1 | `rewire` | 🔶 待裁决 | `Java syntax` 下只留 Java 独有语法，用 `implements` 连到  |
| `C4-01` | 簇4 | `move` | ✅ READY | `管理程序 (Hypervisor)` 从 `程序分析 > … > 探查器类型 > 管理程序 |
| `C4-02` | 簇4 | `move` | ✅ READY | `模拟器 (Emulator)` 同上 |
| `C4-03` | 簇4 | `create` | ✅ READY | 目标中间层 `系统组织 > 操作系统 > I/O 多路复用` |
| `C4-04` | 簇4 | `move` | ⏳ 等 create | `select` 从 `操作系统 > select与epoll` 迁到 `操作系统 > I/ |
| `C4-05` | 簇4 | `move` | ⏳ 等 create | `epoll` 同上 |
| `C4-06` | 簇4 | `create` | ✅ READY | 目标中间层 `系统组织 > 操作系统 > 系统调用与 I/O` |
| `C4-07` | 簇4 | `move` | ⏳ 等 create | `零拷贝` 迁到 `操作系统 > 系统调用与 I/O` |
| `C4-08` | 簇4 | `noop` | ⛔ 无效 | 解散 `算法 > 数据结构 > 数据结构` 内层壳，`线性结构` 等提级 |
| `C4-09` | 簇4 | `noop` | ⛔ 无效 | 解散 `数据库 > 备份与恢复 > 备份和恢复` 重复容器 |
| `C4-10` | 簇4 | `move` | 📝 规格不全 | 纠正 `物化视图` 的物理挂载 |
| `C4-11` | 簇4 | `move` | 📝 规格不全 | 纠正 `PipedInputStream` 的物理挂载 |

## 1. 逐操作规格

### `C1-01` · decision · NEEDS_DECISION

- **蓝图原文**：在 `面向对象 > 类` 下设立唯一的 `类的分类` 树节点
- **renderingContract**：本操作不产生边
- **precondition**：
  - ⏸ 待用户补规格/裁决：宿主容器选哪个
- **postcondition**：
- 📌 蓝图目标 `面向对象 > 类` 的 id 是 `governance:canonical:…`，是治理 canonical 锚点（0 孩），**不能当容器**。真正的工作容器是同层的 `类（编程）`。

### `C1-02` · rename · READY

- **蓝图原文**：在 面向对象 > 类 下设立唯一的 `类的分类` 树节点 + 所有形态平铺其下
- **依赖**：`C1-01`
- **targetIds**（禁止只写名字）：
  - treeId=`tree_class_programming_classification` · nodeRef=`k_class_programming_classification` · 10孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 分类`
- **targetPath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类`
- **relationChanges**：无（不产生/不改边）
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体存在且唯一命中：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 分类`
  - ✓ 主体不是 governance 锚点（否）
  - ✓ 同层无重名
  - 改名须同步补池 `label` 并把新名并入 `tags`（搜索依赖 tags）
- **postcondition**：
  - 树条目 name = 类的分类
  - 池节点 label = 类的分类，且 tags 同时含新旧名
  - 子树拓扑零变化（孩子数与全部后代 treeId 不变）
- 📌 **9 行「移动」其实塌缩成这 1 个改名**：现有 `分类` 已含 10 个形态，改名后即在位，无需逐个搬。

### `C1-03` · move · NEEDS_DECISION

- **蓝图原文**：`抽象类` 从 `Java syntax > 修饰符 > 抽象类` 移入 `类 > 类的分类`
- **targetIds**（禁止只写名字）：
  - treeId=`tree_java_syntax_zh_1hqaeyr` · nodeRef=`k_1784295376153_uiovkk` · 0孩 · **该池实体全树挂载 3 处**
  - treeId=`tree_1784295376195_3l31hb` · nodeRef=`k_1784295376153_uiovkk` · 0孩 · **该池实体全树挂载 3 处**
  - treeId=`tree_1786343651438_q205rt` · nodeRef=`k_1784295376153_uiovkk` · 0孩 · **该池实体全树挂载 3 处**
- **目标父容器**：
  - treeId=`tree_class_programming_classification` · nodeRef=`k_class_programming_classification` · 10孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 修饰符 > 抽象类`
- **targetPath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 分类 > 抽象类`
- **renderingContract**：implements 不在白名单 → 索引图 `if (!kind) continue` 直接丢弃；写了也不可见
- **precondition**：
  - ⚠️ 主体同名 **3 处** → 必须逐条指定 treeId，禁止按名批量移
  - ⛔ **这 3 处其实指向同一个池实体** `k_1784295376153_uiovkk`（全树挂载 3 处）→ 「移动」只搬其中一个挂载点，另外 2 处仍在原地；且 `supplement` 是树条目级的，只有一个挂载点能看到页签
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 修饰符`
  - ✓ 目标父容器存在：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 分类`
  - ✓ 目标父容器下无同名
  - ⏸ 待用户补规格/裁决：移哪一份 / 是否新建理论本体
- **postcondition**：
  - 原父节点 childIds 不再含 `tree_java_syntax_zh_1hqaeyr`，孩子数 −1
  - 新父节点 childIds 含 `tree_java_syntax_zh_1hqaeyr`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）
- 📌 树里 `抽象类` 有 **3 处，全在 Java 侧**（修饰符下 / 继承下 / Java类下），且 **3 处的 nodeRef 完全相同**（`k_1784295376153_uiovkk`，rootContent 仅 232 字）→ 不是「三份副本」，是**同一个池实体被挂 3 次**。所以蓝图「搬一份过去」在语义上不成立：搬走一个挂载点，另外两处仍留在 Java 树里。正确做法是**新建 OOP 理论本体节点**，Java 侧用 `implements` 回指。

### `C1-04` · move · NEEDS_DECISION

- **蓝图原文**：`内部类` 从 `类（编程） > 分类 > 局部类与内部类` 移入 `类 > 类的分类`
- **targetIds**（禁止只写名字）：
  - treeId=`tree_1784044129452_61ft68` · nodeRef=`k_1784044129424_ffqm4z` · 4孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_1786353277269_msn0ma91g` · nodeRef=`k_1784044129424_ffqm4z` · 0孩 · **该池实体全树挂载 2 处**
- **目标父容器**：
  - treeId=`tree_class_programming_classification` · nodeRef=`k_class_programming_classification` · 10孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 声明 > 内部类`
- **targetPath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 分类 > 内部类`
- **renderingContract**：implements 不在白名单 → 索引图 `if (!kind) continue` 直接丢弃；写了也不可见
- **precondition**：
  - ⚠️ 主体同名 **2 处** → 必须逐条指定 treeId，禁止按名批量移
  - ⛔ **这 2 处其实指向同一个池实体** `k_1784044129424_ffqm4z`（全树挂载 2 处）→ 「移动」只搬其中一个挂载点，另外 1 处仍在原地；且 `supplement` 是树条目级的，只有一个挂载点能看到页签
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java类 > 声明`
  - ✓ 目标父容器存在：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 分类`
  - ✓ 目标父容器下无同名
  - ⏸ 待用户补规格/裁决：移哪一份 / 是否新建理论本体
- **postcondition**：
  - 原父节点 childIds 不再含 `tree_1784044129452_61ft68`，孩子数 −1
  - 新父节点 childIds 含 `tree_1784044129452_61ft68`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）
- 📌 `局部类与内部类` 这个壳**不存在**（蓝图现状描述错误）。`内部类` 有 2 份，都在 Java 侧（`Java类 > 声明 > 内部类` 带 4 孩 / `Java类 > 内部类`）。

### `C1-05` · noop · VOID

- **蓝图原文**：`具体类/最终类/封闭类/局部类/匿名类/元类` 移入 `类 > 类的分类`
- **targetIds**（禁止只写名字）：
  - treeId=`asplit_s1_asplit_concrete_class` · nodeRef=`asplit_concrete_class` · 0孩
  - treeId=`tree_class_programming_final_class` · nodeRef=`k_1784045589643_icc5oo` · 0孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_1784045589689_drgfh8` · nodeRef=`k_1784045589643_icc5oo` · 0孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_class_programming_sealed_class` · nodeRef=`k_class_programming_sealed_class` · 0孩
  - treeId=`asplit_s1_asplit_local_class` · nodeRef=`asplit_local_class` · 0孩
  - treeId=`tree_class_programming_anonymous_class` · nodeRef=`k_1784044171635_8etz45` · 0孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_1784044171666_9yd2is` · nodeRef=`k_1784044171635_8etz45` · 0孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_class_programming_metaclass` · nodeRef=`k_class_programming_metaclass` · 0孩
- **renderingContract**：本操作不产生边
- **precondition**：
  - 无需执行（蓝图假设不成立）
- **postcondition**：
  - 确认零 diff：本操作不应对 data/ 产生任何变化
- 📌 **这 6 个已经在目标容器里了**（现 `分类` 的成员）→ 改名后即在位，移动动作不存在。蓝图把「已经对了的事」也列成了要做的事。但其中 `最终类`/`匿名类` 另有隐情，见 C1-09。

### `C1-09` · rewire · NEEDS_DECISION

- **蓝图原文**：（蓝图未写，规范化过程中查出）「Java 具象隔离」的真正前提
- **targetIds**（禁止只写名字）：
  - treeId=`tree_class_programming_final_class` · nodeRef=`k_1784045589643_icc5oo` · 0孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_1784045589689_drgfh8` · nodeRef=`k_1784045589643_icc5oo` · 0孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_class_programming_anonymous_class` · nodeRef=`k_1784044171635_8etz45` · 0孩 · **该池实体全树挂载 2 处**
  - treeId=`tree_1784044171666_9yd2is` · nodeRef=`k_1784044171635_8etz45` · 0孩 · **该池实体全树挂载 2 处**
- **renderingContract**：本操作不产生边
- **precondition**：
  - 主体命中 4 处
  - ⏸ 待用户补规格/裁决：是否拆分共享池实体
- **postcondition**：
  - 边两端 nodeRef 都能在池中解析（否则悬空）
  - 边 type ∈ 索引图白名单，或明确接受「仅在类型关系视图可见」
- 📌 `分类` 的 10 个成员里，`最终类` 与 `匿名类` **各自只有一个池实体，却被挂了 2 次** —— 一次在 OOP `分类` 下，一次在 Java `Java类` 下（`k_1784045589643_icc5oo` / `k_1784044171635_8etz45`）。也就是说 **OOP 侧与 Java 侧现在共享同一个实体**，正文只有一份。所谓「Java 具象隔离」在数据上根本做不到 —— 除非**把这两个共享实体拆成两个池节点**（OOP 本体 + Java 具象），并各自重指挂载。这一步不在蓝图任何一行里，却是本簇真正的活。

### `C1-06` · set-field · NEEDS_SPEC

- **蓝图原文**：在 `类的分类` 内部编排 `viewDimensions`（按抽象/继承/作用域/生命周期 4 个 Grid 视角）
- **renderingContract**：本操作不产生边
- **precondition**：
  - ⏸ 待用户补规格/裁决：目标路径或成员清单
- **postcondition**：
- 📌 `viewDimensions` 是真字段且 `grid`/`matrix` 合法，但每个 `ViewSection` **必须绑 `atoms`（指向池内原子）**，4 个视角 × 若干 section 需要逐条给成员原子 id。蓝图只给了视角名，**规格不足以落盘**。

### `C1-07` · rewire · VOID

- **蓝图原文**：`Java 密封类 --[implements]--> 封闭类`
- **renderingContract**：implements 不在白名单 → 索引图 `if (!kind) continue` 直接丢弃；写了也不可见
- **precondition**：
  - ❌ 主体 `密封类` 零命中
- **postcondition**：
  - 边两端 nodeRef 都能在池中解析（否则悬空）
  - 边 type ∈ 索引图白名单，或明确接受「仅在类型关系视图可见」
- 📌 `密封类` **全树零命中** → 端点不存在，照写即悬空边（直接违反「0 悬空」验收）。且即便建了，`implements` 也不在索引图白名单。

### `C1-08` · rewire · NEEDS_DECISION

- **蓝图原文**：`Java syntax` 下只留 Java 独有语法，用 `implements` 连到 OOP 本体
- **targetIds**（禁止只写名字）：
  - treeId=`tree_1784043760890_bptgal` · nodeRef=`k_1784043760861_gcvn05` · 12孩
- **renderingContract**：implements 不在白名单 → 索引图 `if (!kind) continue` 直接丢弃；写了也不可见
- **precondition**：
  - 主体命中 1 处
  - ⏸ 待用户补规格/裁决：是否接受「类型关系视图才可见」
- **postcondition**：
  - 边两端 nodeRef 都能在池中解析（否则悬空）
  - 边 type ∈ 索引图白名单，或明确接受「仅在类型关系视图可见」
- 📌 `implements` 是真实边类型（数据 239 条）且 `TypeRelationKind` 认它 —— 但**只在类型关系视图可见**，索引图会丢弃。若期望在索引图/机制视图看到，必须改用白名单内的 7 种，或先扩白名单（改 `src/`，属另一批）。

### `C4-01` · move · READY

- **蓝图原文**：`管理程序 (Hypervisor)` 从 `程序分析 > … > 探查器类型 > 管理程序` 迁到 `编译原理 > 执行 > 虚拟机 > 虚拟化技术`
- **targetIds**（禁止只写名字）：
  - treeId=`final_atomic_hypervisor` · nodeRef=`atomic_hypervisor` · 0孩
- **目标父容器**：
  - treeId=`tree_wiki_en_virtual_machine_s5` · nodeRef=`k_wiki_en_virtual_machine_s5` · 2孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 管理程序`
- **targetPath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 虚拟机 > 虚拟化技术 > 管理程序`
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体唯一命中：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 管理程序`
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度`
  - ✓ 目标父容器存在：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 虚拟机 > 虚拟化技术`
  - ✓ 目标父容器下无同名
- **postcondition**：
  - 原父节点 childIds 不再含 `final_atomic_hypervisor`，孩子数 −1
  - 新父节点 childIds 含 `final_atomic_hypervisor`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）
- 📌 蓝图现状路径的父名写作 `探查器类型`，真实父是 `探查器类型中的数据粒度`；目标父容器**已存在**（2 孩），无需新建。

### `C4-02` · move · READY

- **蓝图原文**：`模拟器 (Emulator)` 同上
- **targetIds**（禁止只写名字）：
  - treeId=`final_atomic_emulator` · nodeRef=`atomic_emulator` · 0孩
- **目标父容器**：
  - treeId=`tree_wiki_en_virtual_machine_s5` · nodeRef=`k_wiki_en_virtual_machine_s5` · 2孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 模拟器`
- **targetPath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 虚拟机 > 虚拟化技术 > 模拟器`
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体唯一命中：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 模拟器`
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度`
  - ✓ 目标父容器存在：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 虚拟机 > 虚拟化技术`
  - ✓ 目标父容器下无同名
- **postcondition**：
  - 原父节点 childIds 不再含 `final_atomic_emulator`，孩子数 −1
  - 新父节点 childIds 含 `final_atomic_emulator`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）

### `C4-03` · create · READY

- **蓝图原文**：目标中间层 `系统组织 > 操作系统 > I/O 多路复用`
- **目标父容器**：
  - treeId=`theory_domain_operating_systems` · nodeRef=`theory_domain_operating_systems` · 32孩
- **renderingContract**：本操作不产生边
- **precondition**：
  - 父容器存在：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统`
  - ✓ 父容器下无同名子节点
  - 新建后须分配 treeId + nodeRef，并建 treebind 边
- **postcondition**：
  - 新条目存在且挂对位置：path = 操作系统 > I/O 多路复用
  - 其池节点 nodeRef 可解析，label 与名一致，tags 含自身名（仓库惯例）
  - 新增 treebind 边：treebind:<parentTreeId>:<newTreeId>
- 📌 全树零命中 → 必须新建。

### `C4-04` · move · BLOCKED_UNTIL_CREATE

- **蓝图原文**：`select` 从 `操作系统 > select与epoll` 迁到 `操作系统 > I/O 多路复用`
- **依赖**：`C4-03`
- **targetIds**（禁止只写名字）：
  - treeId=`asplit_s1_asplit_select_io` · nodeRef=`asplit_select_io` · 0孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > select`
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体唯一命中：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > select`
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统`
  - ❌ 目标父容器 `操作系统 > I/O 多路复用` 不存在（需先 create）
- **postcondition**：
  - 原父节点 childIds 不再含 `asplit_s1_asplit_select_io`，孩子数 −1
  - 新父节点 childIds 含 `asplit_s1_asplit_select_io`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）
- 📌 **没有 `select与epoll` 这个容器**（现状描述错误）：`select` 与 `epoll` 是 `操作系统` 下的两个独立兄弟。

### `C4-05` · move · BLOCKED_UNTIL_CREATE

- **蓝图原文**：`epoll` 同上
- **依赖**：`C4-03`
- **targetIds**（禁止只写名字）：
  - treeId=`asplit_s1_asplit_epoll` · nodeRef=`asplit_epoll` · 0孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > epoll`
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体唯一命中：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > epoll`
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统`
  - ❌ 目标父容器 `操作系统 > I/O 多路复用` 不存在（需先 create）
- **postcondition**：
  - 原父节点 childIds 不再含 `asplit_s1_asplit_epoll`，孩子数 −1
  - 新父节点 childIds 含 `asplit_s1_asplit_epoll`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）

### `C4-06` · create · READY

- **蓝图原文**：目标中间层 `系统组织 > 操作系统 > 系统调用与 I/O`
- **目标父容器**：
  - treeId=`theory_domain_operating_systems` · nodeRef=`theory_domain_operating_systems` · 32孩
- **renderingContract**：本操作不产生边
- **precondition**：
  - 父容器存在：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统`
  - ✓ 父容器下无同名子节点
  - 新建后须分配 treeId + nodeRef，并建 treebind 边
- **postcondition**：
  - 新条目存在且挂对位置：path = 操作系统 > 系统调用与 I/O
  - 其池节点 nodeRef 可解析，label 与名一致，tags 含自身名（仓库惯例）
  - 新增 treebind 边：treebind:<parentTreeId>:<newTreeId>

### `C4-07` · move · BLOCKED_UNTIL_CREATE

- **蓝图原文**：`零拷贝` 迁到 `操作系统 > 系统调用与 I/O`
- **依赖**：`C4-06`
- **targetIds**（禁止只写名字）：
  - treeId=`tree_io_zero_copy` · nodeRef=`k_io_zero_copy` · 1孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 零拷贝`
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体唯一命中：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 零拷贝`
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 系统组织 > 操作系统`
  - ❌ 目标父容器 `操作系统 > 系统调用与 I/O` 不存在（需先 create）
- **postcondition**：
  - 原父节点 childIds 不再含 `tree_io_zero_copy`，孩子数 −1
  - 新父节点 childIds 含 `tree_io_zero_copy`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）

### `C4-08` · noop · VOID

- **蓝图原文**：解散 `算法 > 数据结构 > 数据结构` 内层壳，`线性结构` 等提级
- **targetIds**（禁止只写名字）：
  - treeId=`governance:canonical:n_6dgtsmpj` · nodeRef=`n_6dgtsmpj` · 2孩 · **⚠️ governance 锚点**
  - treeId=`theory_domain_data_structures` · nodeRef=`theory_domain_data_structures` · 8孩
- **renderingContract**：本操作不产生边
- **precondition**：
  - 无需执行（蓝图假设不成立）
- **postcondition**：
  - 确认零 diff：本操作不应对 data/ 产生任何变化
- 📌 **没有内层壳**：`线性结构` 已是 `数据结构` 的直接子节点（早已是平的）。真正的问题是**同名双胞** —— 治理节点 `governance:canonical:n_6dgtsmpj`(2 孩) 与真容器 `theory_domain_data_structures`(8 孩) 同名同路径并存。该问题不在本蓝图任何一行里。

### `C4-09` · noop · VOID

- **蓝图原文**：解散 `数据库 > 备份与恢复 > 备份和恢复` 重复容器
- **renderingContract**：本操作不产生边
- **precondition**：
  - 无需执行（蓝图假设不成立）
- **postcondition**：
  - 确认零 diff：本操作不应对 data/ 产生任何变化
- 📌 `备份与恢复` / `备份和恢复` **两个名字在全树零命中** → 不是「去重」，是「没有这个东西」。

### `C4-10` · move · NEEDS_SPEC

- **蓝图原文**：纠正 `物化视图` 的物理挂载
- **targetIds**（禁止只写名字）：
  - treeId=`tree_wiki_en_database_s16_s17` · nodeRef=`k_wiki_en_database_s17` · 0孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库设计 > 视图 > 物化视图`
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体唯一命中：`知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库设计 > 视图 > 物化视图`
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库设计 > 视图`
  - ⏸ 蓝图未给目标路径 → 规格不完整，无法求值前置条件
  - ⏸ 待用户补规格/裁决：目标路径或成员清单
- **postcondition**：
  - 原父节点 childIds 不再含 `tree_wiki_en_database_s16_s17`，孩子数 −1
  - 新父节点 childIds 含 `tree_wiki_en_database_s16_s17`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）
- 📌 蓝图**未给目标路径** → 规格不完整。现状：`数据库管理 > 数据库 > 数据库设计 > 视图 > 物化视图`。

### `C4-11` · move · NEEDS_SPEC

- **蓝图原文**：纠正 `PipedInputStream` 的物理挂载
- **targetIds**（禁止只写名字）：
  - treeId=`final_atomic_piped_input_stream` · nodeRef=`atomic_piped_input_stream` · 0孩
- **sourcePath**：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 线程间通信 > PipedInputStream`
- **renderingContract**：本操作不产生边
- **precondition**：
  - ✓ 主体唯一命中：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 线程间通信 > PipedInputStream`
  - ✓ 当前父节点：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 线程间通信`
  - ⏸ 蓝图未给目标路径 → 规格不完整，无法求值前置条件
  - ⏸ 待用户补规格/裁决：目标路径或成员清单
- **postcondition**：
  - 原父节点 childIds 不再含 `final_atomic_piped_input_stream`，孩子数 −1
  - 新父节点 childIds 含 `final_atomic_piped_input_stream`，孩子数 +1
  - 该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）
  - treebind 边按 `treebind:<newParentTreeId>:<treeId>` 重建，且旧边删除
  - 池节点未被删除、未被退休（只搬位置）
- 📌 蓝图**未给目标路径** → 规格不完整。现状：`java > java并发编程 > 线程间通信 > PipedInputStream`。

## 2. 依赖顺序（拓扑）

```text
C1-01  →  C1-02
C4-03  →  C4-04
C4-03  →  C4-05
C4-06  →  C4-07
```

## 3. 闸门

- 本阶段**只到 Normalized Blueprint**：不 dry-run、不写盘、不 kill 5173、不碰他人改动。
- `⛔ VOID` 的 4 项（C1-05 / C1-07 / C4-08 / C4-09）建议直接从阶段一划掉。
- `📝 NEEDS_SPEC`（C1-06 / C4-10 / C4-11）与 `🔶 NEEDS_DECISION`（C1-01 / C1-03 / C1-04 / C1-08）需先裁决，否则 dry-run 无意义。
- 可立即 dry-run 的范围：**C4-01 / C4-02 / C4-03 / C4-04 / C4-05 / C4-06 / C4-07**（2 create + 5 move）。
