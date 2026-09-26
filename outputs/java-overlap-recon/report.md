# java 子树重叠侦察报告

> **性质**：只读侦察，未改动任何 `data/*.json`。
> **数据基线**：`010796a`（core-library-methods 收口后）—— 树 3214 / 池 3857 / 边 4162。
> **复跑**：`node scripts/recon-java-libs-overlap.mjs --dump outputs/java-overlap-recon/nodes-dump.md` · `node scripts/recon-java-overlap-detail.mjs --dump outputs/java-overlap-recon/detail.md`

---

## 摘要：是的，重叠确凿 —— 而且是 **5 层**，不是一个层面的重复

先纠正一个前提：`类 / 类库 / 常用类库` **不是三个同类兄弟在互相重复**，它们性质完全不同：

| java 下的子树 | 规模（含自身） | 实际性质 | 一句话判定 |
|---|---|---|---|
| `类` | 16 | **`java.lang.Object` 的成员/子类展示树**（Object → Number/Math/Optional/String/StringBuilder/StringBuffer/Files/Scanner + 构造函数/方法） | 5 个成员位被"常用类库条目"占用 ⇒ **错位** |
| `类库` | 5 | **弃用的平行库树**：只有 2 项内容 —— 一个 50 条全限定名的「大全清单」+ 一个 `Base64`（内容挂成**树子节点**而非 tabs） | **整体应并入 `常用类库`** |
| `常用类库` | 44 | **维护中的主库**：43 项实体内容，其中含字节流/字符流组、5 个导入型总集、I/O·NIO 系列 | 唯一有正文与 tab 体系的一棵 |

**重叠分为 5 层**（详细举证见 §4）：

| 层 | 类型 | 处数 | 最严重的一处 |
|---|---|---|---|
| L1 | **身份级**：同一池实体被挂在两处 | **4**（String / StringBuilder / StringBuffer / **Scanner**） | 同一张卡，两处渲染**完全相同**的 36 / 3 / 3 / 26 个 tab |
| L2 | **双实体级**：同一个类存在两个池实体 | **1**（`java.nio.file.Files`） | `def`、`comparison` 两 tab **逐字节相等**，方法覆盖 **29/29 全等** |
| L3 | **平行库树级**：`类库` vs `常用类库` 同主题两棵树 | **1 组**（含 1 个索引节点 + 1 个内容节点） | `类库/常用` 列的 50 个全限定类名中，**10 个已是 `常用类库` 的节点** |
| L4 | **跨区级**：内容/主题跑到 java 之外 | **3**（Servlet / 对象 / Enum） | Servlet 同实体挂在 `特殊类` 与 `软件框架/JavaWeb` 两处 |
| L5 | **索引级**：清单节点复述全树已有条目 | **1**（`类库/常用` 复述 50 个 JDK 类名 + 12 个第三方框架） | 其中 Spring/MyBatis/Hibernate 在 `软件框架` 区**另有 36 个节点** |

> 若你说的「**扫描**」指 `java.util.Scanner` —— 它正是 L1 那 4 处之一，同时挂在 `类/java.lang.Object/Scanner` 与 `常用类库/java.util.Scanner`。

---

## 1. 侦察范围与方法

- **数据源**：`data/tree-data.json`（树）· `data/node-pool.json`（实体）· `data/knowledge-edges.json`（边）；自建"全树挂载索引"（每个 `nodeRef` 的全部树路径）。
- **六个维度**：① 身份级多挂载 ② 同名不同实体 ③ 方法/API 名交集 ④ tags 语义面 ⑤ 内容规模 ⑥ 边表端点。
- **口径声明**：`nodeRef` 相同 = 同一池实体（**同一张卡**）；`nodeRef` 不同但主题相同 = **两个实体**（真正的冗余，需要合并或归位）。这两者后果完全不同，全程分开统计。

---

## 2. java 的直接子结构（20 个）

`java` 路径 `/计算机科学/软件符号与工具/编程语言/java`，`nodeRef = k_1782746457581_30q8ao`，子树 **1+1128 = 1129 节点**。

与本次问题直接相关的是其中 5 个：

| # | 子节点 | nodeRef | 子树（含自身） | 池 label |
|---|---|---|---|---|
| 5 | 特殊类 | `k_1784340459554_wxadvs` | 7 | 特殊类 |
| 6 | **类库** | `k_1784343188560_x1gylq` | **5** | 类库 |
| 10 | **类** | `k_1785339432462_ff5zs4` | **16** | 类 |
| 14 | 对象 | `k_1783238676302_ggr3kg` | 11 | 对象 |
| 16 | **常用类库** | `k_java_common_libraries` | **44** | Java 常用类库 |

（其余 15 个：类加载机制 28 · java并发编程 547 · 锁 54 · 版本 3 · 执行系统 82 · Documentation 1 · 在 Java 平台之外的使用 2 · Java syntax 192 · 集合框架 49 · 反射 58 · 面向对象 4 · 包 5 · 序列化 6 · 阻塞 I/O 2 · 非阻塞 I/O 12）

---

## 3. 三棵目标子树的完整节点清单

### 3.1 `java > 类`（16 节点）

```
java.lang (36字)                        ← k_java_source_…_s_package_…
└── Object (331)                        ← k_java_syntax_java_lang_object_yk8ls4  ⚠️ 与 Java syntax 区共用
    ├── Number (422)
    ├── Math (151) ├── 作用 (427) └── 常见方法 (864)
    ├── 类的构造函数 (20)
    ├── 方法 (2703)
    ├── Optional (165) └── 方法 (2770)
    ├── String            ← k_java_lang_string            ⚠️ 与 常用类库 共用同一实体
    ├── StringBuilder     ← k_java_lang_stringbuilder     ⚠️ 同上
    ├── StringBuffer      ← k_java_lang_stringbuffer      ⚠️ 同上
    ├── Files ≈           ← k_1785378637961_iecl2a        ⚠️ 是 java.nio.file.Files 的**第二份拷贝**
    └── Scanner           ← k_java_util_scanner           ⚠️ 与 常用类库 共用同一实体
```

**这一棵是"污染最重"的**：15 个成员位里有 **5 个**（String / StringBuilder / StringBuffer / **Files** / Scanner）实为"常用类库条目"，其中 **Files 与 Scanner 根本不是 `java.lang` 的类**（`java.nio.file.Files` / `java.util.Scanner`），却被摆成 `java.lang.Object` 的成员。

### 3.2 `java > 类库`（5 节点）

```
常用 (2801字)     ← k_1787744960960_nuqg5v   正文 = 「Java 常用类库大全（全限定名称）」清单表
Base64 (277)     ← k_1787852488347_zqzfjo   正文 = java.util.Base64 简介
├── 内嵌类 (311)  ← k_1787852533507_uv8rwh
└── 方法 (821)    ← k_1787852618831_l95bj1   （Base64 静态方法表）
```

- `类库/常用` **不是内容节点，是索引节点**：一张"全限定类名 + 简要说明"的表，覆盖 java.lang / java.util / java.io / java.nio / java.time / java.net，外加「二、主流第三方类库」（JUnit 5 · JUnit 4 · Mockito · SLF4J · Log4j 1.x · Log4j 2.x · Spring Framework · Spring Boot · Hibernate · MyBatis · Jackson · Gson · Maven · Gradle）。
- `类库/Base64` 是**唯一一节"类库"独有内容**：java.util.Base64，且以"树子节点"形态组织（`内嵌类` / `方法`），与全库 tabs 体系不一致。
- 整棵 `类库` 的边只有 **5 条（去重后）**：`java→类库`、`类库→常用`、`类库→Base64`、`Base64→内嵌类`、`Base64→方法`，**零外部引用** ⇒ 合并/摘除代价极低。

### 3.3 `java > 常用类库`（44 节点）

43 个实体项，可分 5 组：

| 组 | 成员 | 备注 |
|---|---|---|
| **A. 单类卡** | java.lang.String / StringBuilder / StringBuffer / java.util.Scanner / java.nio.file.Files / java.lang.Enum | **前 4 个与 `类` 共实体**；Files 与 `类` 下的 `Files` 构成双实体 |
| **B. 日期时间** | java.util.Date / Calendar / GregorianCalendar | |
| **C. I/O 流组** | java.io 字节流（+InputStream/OutputStream/其他字节流/4 个子流）、java.io 字符流（+Reader/Writer/桥接流/其他字符流/2 个子流） | 层级用树表达，tab 仅 1 个占位 |
| **D. 导入型总集** | Java 8 Stream(19630字) / Java 网络编程 Socket(6709) / JDBC 连接 MySQL(3342) / Java 发送邮件 JavaMail(8891) / Character 类(1844) | **全树各处只挂 1 次**，不是重复项 |
| **E. 文件与 NIO** | File 类(+File类/RandomAccessFile/目录操作)、控制台 I/O(+控制台IO)、Selector使用、**Files工具类**、Path、FileSystem | `Files工具类`(k_nio_files_util) 与 A 组 `java.nio.file.Files` 是**近超集关系**（实测：覆盖 B 的 **27/29** 个方法，B 独有 `lines` / `newByteChannel`；另从其正文抽到 **23 个 B 未收录**的方法名） |

---

## 4. 重叠逐层举证

### 4.1 L1 · 身份级：同一池实体挂在两处（4 处）

| 池实体 | label | 挂载 1 | 挂载 2 |
|---|---|---|---|
| `k_java_lang_string` | java.lang.String | `类/java.lang/Object/String` | `常用类库/java.lang.String` |
| `k_java_lang_stringbuilder` | java.lang.StringBuilder | `类/java.lang/Object/StringBuilder` | `常用类库/java.lang.StringBuilder` |
| `k_java_lang_stringbuffer` | java.lang.StringBuffer | `类/java.lang/Object/StringBuffer` | `常用类库/java.lang.StringBuffer` |
| `k_java_util_scanner` | java.util.Scanner | `类/java.lang/Object/Scanner` | `常用类库/java.util.Scanner` |

**后果（关键）**：tabs 挂在**池实体**上，不在树节点上 ⇒ 这两处的**内容完全同一份**。四处分别渲染 **36 / 3 / 3 / 26** 个 tab，两处一模一样。**在任一处补方法 tab，另一处同时变化** —— 上一批 core-library-methods 给其中 `String`(+33) 与 `Scanner`(+23) 补了方法 tab（StringBuilder/StringBuffer 本批未动），这 56 个 tab 现在**同时**出现在 `类` 与 `常用类库` 两处。

**tags 佐证**：`类` 子树 15 个节点的 tags 高频词是 `java×5 · jdk×5 · **常用类库×5**` —— 这 5 个实体**自己声明**属于"常用类库"，却被挂在 `类` 下。

### 4.2 L2 · 双实体级：`java.nio.file.Files` 有两份（1 处，最严重）

| | A：`类/java.lang/Object/Files` | B：`常用类库/java.nio.file.Files` |
|---|---|---|
| 池 id | `k_1785378637961_iecl2a` | `k_java_nio_file_files` |
| label / tags | `"Files"` / `["Files","java","jdk","**常用类库**","java.nio.file","nio"]` | `"java.nio.file.Files"` |
| 正文 | 140 字（`java.nio.file.Files 是 Java NIO…实用工具类`） | 63 字 |
| tabs | def / comparison / **methods(2132字表格)** / bestPractices = **4** | def / comparison / + **29 个逐方法 tab** = **31** |
| 边 | 1 条（treebind 自 Object） | 5 条（含 2 条子节点 + 2 条与其他机制的对比边） |

**同源铁证（逐字节级）**：

```
tab def        : A=278字  B=278字   逐字节相等 = true
tab comparison : A=287字  B=287字   逐字节相等 = true
A 的 methods tab 抽出的方法名        29 个
B 的 29 个方法 tab id              29 个
交集                                29  ← 仅A 0 个，仅B 0 个
```

即：**A = B 去掉"方法原子化" + 多一个 `bestPractices`(291字)**。
⇒ A 是**原子化之前的孪生遗留**，唯一独有资产是 `bestPractices` 那 291 字。

### 4.3 L3 · 平行库树级：`类库` vs `常用类库`

- **零身份级重叠**：`类库` 的 4 个实体与 `常用类库` 的 43 个实体**没有任何共同 nodeRef**。
- 但**主题级完全重叠**：`类库/常用` 的清单里，**10 个全限定类名已经是 `常用类库` 的实体节点**：
  `java.lang.String` · `java.lang.StringBuilder` · `java.lang.StringBuffer` · `java.util.Scanner` · `java.util.Date` · `java.util.Calendar` · `java.util.GregorianCalendar` · `java.nio.file.Files` · `java.io.InputStream` · `java.io.OutputStream`
- 且 `类库/Base64` 的内容（java.util.Base64）在 `常用类库` 下**不存在** ⇒ `类库` 不是 `常用类库` 的子集，它有独有内容。

### 4.4 L4 · 跨区级：内容/主题跑到 java 之外（本 5 棵子树相关 3 处）

| 池实体 | 挂载 1（java 内） | 挂载 2（java 外） |
|---|---|---|
| `k_java_syntax_java_lang_object_yk8ls4`（java.lang.Object） | `类/java.lang/Object` | `Java syntax/Java 语法要素/通用类型/java.lang.Object` |
| `k_1784340526295_skm8iw`（Servlet） | `特殊类/Servlet` | `软件框架/JavaWeb/Servlet` |
| `k_java_lang_enum`（java.lang.Enum） | `常用类库/java.lang.Enum` | `编程语言理论/类型系统/数据类型/引用类型/enum` |
| `k_1783238676302_ggr3kg`（对象） | `对象` | `编程范式/面向对象/对象` |

另外 `特殊类` 的其余 5 项（小程序 / JavaServer Pages / Swing 应用程序 / JavaFX 应用程序 / 泛型）**全树只挂 1 次**，其中 `Servlet` 实体的 tabs 里还留着批次产物 `migrated:asplit_http_request_response` ⇒ 该子树是"待正名的临时收容所"，不是重复项。

### 4.5 L5 · 索引级：`类库/常用` 在复述全树

`类库/常用` 正文 2801 字 / 50 个全限定类名 + 12 个第三方框架。这些名字所代表的知识**在树里绝大多数已有实体节点**：

| 清单提到的 | 树中另有节点 |
|---|---|
| Spring | **25** 个（`软件框架/Spring/…`） |
| MyBatis | **10** 个（`软件框架/Mybatis/…`） |
| Hibernate | 1 个（`软件框架/Hibernate`） |
| ArrayList / HashMap | 各 1 个（`java/集合框架/Iterable/Collection/…`） |
| ExecutorService | 1 个（`java/java并发编程/juc/concurrent/java.util.concurrent/ExecutorService`） |
| JUnit / Mockito / SLF4J / Log4j / Jackson / Gson / Maven / Gradle | **0 个**（树里确实没有） |

⇒ `类库/常用` 的**索引价值非零**（8 个第三方库树里没有），但**它与 `常用类库` 同义**，且横跨 3 个区（java / 软件框架 / 集合框架）。

---

## 5. 量化汇总

| 指标 | 数值 |
|---|---|
| `java` 子树节点 | 1129（含自身）；直接子节点 20 |
| 本次 5 棵目标子树池实体总数 | **79** |
| 其中在全树挂载 >1 次 | **8**（4 处 L1 + Object + 对象 + Servlet + Enum） |
| `java` 子树内部多挂载实体 | **38**（27 跨直接子节点 / 11 同子节点内）—— 绝大多数是 `并发/集合框架/反射` 的「外部引用类型」外壳，属**已知系统性现象** |
| `类` 与 `常用类库` 共享实体 | **4** |
| Files 双实体方法覆盖 | **29 / 29 全等**；def/comparison 逐字节相等 |
| `类库/常用` 清单命中 `常用类库` 实体名 | **10 / 50** |
| `类库` 子树相关边 | **5** 条（含 1 条从 java 进） |
| Files 双实体边 | A **1** 条 / B **5** 条 |

---

## 6. 若合并：代价面

| 动作 | 影响面 | 风险 |
|---|---|---|
| 删 `类/Files`(A)，把 `bestPractices` 移入 B | 树 −1；A 的 1 条 treebind 边须删；B 加 1 tab | **低**（唯一独有资产 291 字，先搬运再删） |
| `类` 下 4 个 L1 成员位卸树（保留 常用类库 的） | 树 −4；`类` 由 16 → 11 节点；4 条 treebind 边须删 | **中**（会改变 `类` 的语义面貌：它不再是"Object 的成员树"而是"Object 小家族"） |
| `类库` 整棵并入 `常用类库` | 树 −5（或 −3 若保留容器）；`Base64` 需从"树子节点"改写成 **tabs**；`类库/常用` 需裁决去留 | **中高**（Base64 内容需重构形态） |
| 删 `类库/常用`（索引节点） | 树 −1；丢失 8 个树中不存在的第三方库索引信息 | **高**（信息有损，需你裁决是否先建实体再删） |
| `类库/Base64` 改 tabs 后入 `常用类库` | 树 −3（内嵌类/方法 收进 tabs）；池 +1~0 | 中（形态变换，可逆） |

**注意一个全局约束**：`类` 与 `常用类库` 共享的 4 个实体是**同一张卡**，所以"卸树"只是拆掉一个挂载点，**不会丢内容**；但 `Files` 双实体是**两张卡**，"删一个"会真丢内容 ⇒ 必须先搬运。

---

## 7. 建议处置（分档，待裁决）

- **档 A（低风险，可先做）**：`类/Files`(A) 的 `bestPractices` 搬入 `k_java_nio_file_files` → 删 A（树 −1 / 边 −1）。
- **档 B（中风险）**：`类` 下 `String / StringBuilder / StringBuffer / Scanner` 四个成员位卸树（内容不丢，`常用类库` 那份保留），`类` 收敛为"Object 及其真正的 lang 家族（Number/Math/Optional/…）"。
- **档 C（需你裁决）**：`类库` 整棵的归宿 ——
  - C1：`Base64`（含内嵌类/方法）改写成 tabs 后并入 `常用类库`，然后删 `类库`；
  - C2：`类库/常用`（50 条大全清单）**留、改、删**三选一：留则改名明确其"索引"身份并只挂一处；改则压缩为 `常用类库` 的 rootContent 索引段；删则需先确认 8 个第三方库条目是否已在别处落地（当前树里没有）。
- **档 D（并入下一批一并做）**：`Files工具类`(k_nio_files_util) → 并入 `java.nio.file.Files`（近超集：覆盖 B 的 27/29 方法，另多 23 个）——你此前已定为"融合批"内容。

---

## 8. 边界与未做事项

- 本次**只读**，未改任何 `data/*.json`；产出为 `outputs/java-overlap-recon/` 下 2 份转储 + 本报告 + 2 个只读脚本。
- **未判定**：`类库/常用` 该留改删（信息有损，属你的裁决）；`类库` 删还是保留容器。
- **未展开**：`特殊类`（Servlet 跨区 / 其余 5 项待正名）、`对象`（对象头/Mark Word 与"面向对象/对象"跨区）、`java.lang.Object` 在 `Java syntax` 区的重复挂载 —— 已量化但不在本次三棵树范围内，可作为后续批次。
- 新脚本与产物尚未入库（无批次认领），需在后续批次的 manifest 里登记。
