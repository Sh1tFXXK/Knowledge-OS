# 阶段一 APPLY 预检报告（未写盘）

> 生成时间 2026-09-14T07:37:19.087Z
> 模式 `preflight` · implements 口径 `consistent` · **未写盘**

## 0. 闸门

| 闸门 | 检查项 | 结果 | 依据 |
|---|---|---|---|
| `G1` | 数据文件 md5 与 dry-run 基线一致 | ✅ | 5 个文件全部一致 |
| `G2` | 外部会话未再写入已跟踪文件 | ✅ | 17 个已跟踪文件 md5 全部一致 |
| `G7` | 索引图白名单源文件未被改动 | ✅ | src/core/explanation-index/indexGraphLayout.ts md5 一致 |
| `G3` | 每个共享实体拆分都有明确语义角色 | ✅ | 抽象类=ontology(HIGH) · 内部类=reference(HIGH) · 最终类=reference(MANUAL) · 匿名类=ontology(HIGH) |
| `G4` | 每个 treeId 恰好映射一个目标实体 | ✅ | 11 个 treeId 映射明确（含 9 个既有挂载点） |
| `G5` | treebind 增 / 删 / 改 与预期逐条配对 | ✅ | 删除 5 条、新增 9 条、改 target 5 条，全部命中预期集合，无非相关变动 |
| `G6` | implements 变更数符合当前口径 | ✅ | 实际新增非 treebind 边 4 条（口径 consistent，期望 4）：impl:abstract_class:k_1789371087163_g81kcs, impl:inner_class:k_1784044129424_ffqm4z, impl:final_class:k_1784045589643_icc5oo, impl:anonymous_class:k_1789371087163_g0db3p ⚠️ 你的闸门原文写「explicitly approved 2 changes」，但变体 B 把 抽象类、内部类 也变成了本体/具象对 → 语义一致应为 4 条。此处按 4 条，需要你确认；严格按字面 2 条请用 --implements-mode=minimal。 |
| `G8` | dev server 不会静默覆盖本次写入 | ✅ | 5173 是 vite dev（含 /api/data 写通道）→ 已主动 GET 4/4 个文件，武装 mtime 守卫；浏览器后续旧的 PUT 将收到 409 EXTERNAL_MODIFICATION 而非覆盖 |

**闸门全绿（8/8）**

## 1. 语义判定（ontology vs reference）

> 判据：**实体语义优先于挂载路径；挂载路径不是 Ontology 身份证明。**
> 打分 = 语言强信号（代码围栏 +5 / Java 字面 +3 / 类声明语法 +3 / Java API +3 / 面经语料 +3）
> ＋ tags·页签含 Java 各 +3 ＋ 弱信号（`final class` +1）；阈值 3，≥3 判 reference，否则 ontology。

| 实体 | 正文 | javaScore | 角色 | 置信度 | 判定依据 |
|---|---|---|---|---|---|
| `抽象类` | 337 字 | 0 | **ontology** | HIGH | ±0 通用 OOP 语义表述 |
| `内部类` | 3801 字 | 20 | **reference** | HIGH | +5 含语言代码围栏；+3 正文出现 Java 字面；+3 Java 类/接口声明语法；+3 Java API / 语法片段；+3 tags 含 ["Java面试突击"]；+3 页签标题含 ["JAVA 内部类"]；  代码围栏计数 20（10 段） |
| `最终类` | 81 字 | 1 | **reference**（人工推翻 ontology） | MANUAL | +1 出现 “final class”（Java/C# 术语拼写；但该概念本身与语言无关）；±0 通用 OOP 语义表述 |
| `匿名类` | 42 字 | 0 | **ontology** | HIGH | ±0 通用 OOP 语义表述 |

## 2. 新实体 id（沿用仓库 genId，批次信息不入 identity）

| 用途 | id |
|---|---|
| java:abstract_class | `k_1789371087163_g81kcs` |
| java:anonymous_class | `k_1789371087163_g0db3p` |
| ontology:inner_class | `k_1789371087163_e9iafm` |
| ontology:final_class | `k_1789371436917_zo0k0j` |
| os_layer:C4-03 | `k_1789371087163_25m6ob` |
| os_layer:C4-06 | `k_1789371087163_b7qj6l` |

id 来源：baseline(已冻结) · 生成器：`src/knowledge/defaults.ts` 的 `genId()`（`k_<Date.now()>_<base36×6>`）

## 3. 总账

| 指标 | before | after | Δ |
|---|---|---|---|
| 树条目 | 3215 | 3219 | +4 |
| 池节点 | 3849 | 3855 | +6 |
| 边 | 4158 | 4166 | +8 |
| 悬空 nodeRef（树） | 0 | 0 | — |

### 3.1 边影响（真实 diff，按 id 对齐）

| 类别 | 数量 | 明细 |
|---|---|---|
| 删除 treebind | 5 | treebind:theory_domain_operating_systems:asplit_s1_asplit_epoll<br>treebind:theory_domain_operating_systems:asplit_s1_asplit_select_io<br>treebind:theory_domain_operating_systems:tree_io_zero_copy<br>treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_emulator<br>treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_hypervisor |
| 新增 treebind | 9 | treebind:theory_domain_operating_systems:tree_concept_io_multiplexing<br>treebind:theory_domain_operating_systems:tree_concept_syscall_io<br>treebind:tree_class_programming_classification:tree_class_programming_abstract_class<br>treebind:tree_class_programming_classification:tree_class_programming_inner_class<br>treebind:tree_concept_io_multiplexing:asplit_s1_asplit_epoll<br>treebind:tree_concept_io_multiplexing:asplit_s1_asplit_select_io<br>treebind:tree_concept_syscall_io:tree_io_zero_copy<br>treebind:tree_wiki_en_virtual_machine_s5:final_atomic_emulator<br>treebind:tree_wiki_en_virtual_machine_s5:final_atomic_hypervisor |
| 新增 implements | 4 | impl:abstract_class:k_1789371087163_g81kcs<br>impl:inner_class:k_1784044129424_ffqm4z<br>impl:final_class:k_1784045589643_icc5oo<br>impl:anonymous_class:k_1789371087163_g0db3p |
| 同 id 改 target（treebind） | 5 | treebind:tree_class_programming_classification:tree_class_programming_final_class：k_1784045589643_icc5oo → k_1789371436917_zo0k0j<br>treebind:tree_1784044092244_76wkqz:tree_1784044171666_9yd2is：k_1784044171635_8etz45 → k_1789371087163_g0db3p<br>treebind:tree_1784044457742_waame9:tree_java_syntax_zh_1hqaeyr：k_1784295376153_uiovkk → k_1789371087163_g81kcs<br>treebind:tree_java_syntax_zh_scbpwz:tree_1784295376195_3l31hb：k_1784295376153_uiovkk → k_1789371087163_g81kcs<br>treebind:tree_1784043760890_bptgal:tree_1786343651438_q205rt：k_1784295376153_uiovkk → k_1789371087163_g81kcs |

## 4. 验收断言（基线 vs 模拟态）

| # | 断言 | 基线 | 变更后 | Δ | 判定 |
|---|---|---|---|---|---|
| 1 | 树 treeId 全局唯一 | 0 | 0 | 0 | ✅ |
| 2 | 树 nodeRef 全部命中池实体 | 0 | 0 | 0 | ✅ |
| 3 | 边端点全部命中池实体 | 27 | 27 | 0 | ⚠️ 存量 |
| 4 | 每个非根条目有 treebind（不得增加缺失） | 789 | 789 | 0 | ⚠️ 存量 |
| 5 | 无条目被多条 treebind 挂载（不得增加） | 47 | 47 | 0 | ⚠️ 存量 |
| 6 | 改动条目 treebind 与树父子一致 | 0 | 0 | 0 | ✅ |
| 7 | 树无环 | 0 | 0 | 0 | ✅ |
| 8 | 拆分对不再共享 nodeRef | — | 0 | — | ✅ |

**本批引入新违规：0 项** → ✅ 无

## 4.5 ⚠️ 需要你确认的决策点（口径分歧，不是缺陷）

| # | 分歧 | 原文 vs 判定 | 影响 | 一行命令 |
|---|---|---|---|---|
| D1 | **implements 条数** | 闸门原文「only the explicitly approved **2** changes」；但变体 B 后本体/具象对共 **4** 组（抽象类、内部类 各新增一组） | 现按 **4** 条。若走 2 条，抽象类 的 Java 具象与 内部类 的本体将**没有关系边**，模型无法表达「它是它的具象」 | `--implements-mode=minimal` |

> 两项都不改变操作规模（树 +4 / 池 +6），只影响 2 条边与 1 处正文归属。**确认后一条命令即可落盘。**

## 5. 写集与外部改动的相交性

- 本次触碰的既有池实体：`k_class_programming_classification`
- 文件层面：双方都会写 `node-pool.json`（这是**共享文件**，不可避免）
- 节点层面：与外部批次改动的 127 个节点**无交集** → 无共同节点
- 字段层面：**无重叠** —— 外部只动 `tags`、本次只动 `label`/`tags`，且作用于不同节点
- 外部批次与阶段一的目标集碰撞：`asplit_concrete_class`, `asplit_local_class`, `asplit_select_io`, `asplit_epoll`

> 结论：**写集在节点与字段两个层面不相交**。文件共享只影响 git 暂存的粒度，不影响数据正确性。

## 6. 逐操作 before → after

### `C1-02` · rename · 分类 → 类的分类（就地改名）

- **targetIds**：`{"treeId":"tree_class_programming_classification","ref":"k_class_programming_classification"}`
- **before**：`{"name":"分类","kids":10,"poolLabel":"分类","tags":["分类","类","面向对象","编程"]}`
- **after**：`{"name":"类的分类","kids":10,"poolLabel":"类的分类","tags":["分类","类","面向对象","编程","类的分类"]}`
- **边影响**：无：treeId 不变 → treebind id 不变；仅改池 label 与 tags
- **验收**：
  - 树条目 name = 类的分类
  - 池 label = 类的分类，tags 同时含 分类 与 类的分类
  - 孩子数与后代 treeId 逐条不变

### `C1-09/abstract_class` · split-entity · 按语义角色拆分共享实体 抽象类

- **targetIds**：`{"原实体":"k_1784295376153_uiovkk","本体实体":"k_1784295376153_uiovkk","Java实体":"k_1789371087163_g81kcs","本体挂载":"tree_class_programming_abstract_class","Java挂载":["tree_java_syntax_zh_1hqaeyr","tree_1784295376195_3l31hb","tree_1786343651438_q205rt"]}`
- **before**：`{"本体侧原ref":"(挂载点不存在)","Java侧原ref":"k_1784295376153_uiovkk","挂载数":1}`
- **after**：`{"本体侧":"k_1784295376153_uiovkk","Java侧":"k_1789371087163_g81kcs"}`
- **边影响**：本体侧新建 treebind 1 条（新挂载点） · Java 侧 3 条 treebind 同 id 改 target：treebind:tree_1784044457742_waame9:tree_java_syntax_zh_1hqaeyr (k_1784295376153_uiovkk→k_1789371087163_g81kcs)；treebind:tree_java_syntax_zh_scbpwz:tree_1784295376195_3l31hb (k_1784295376153_uiovkk→k_1789371087163_g81kcs)；treebind:tree_1784043760890_bptgal:tree_1786343651438_q205rt (k_1784295376153_uiovkk→k_1789371087163_g81kcs) · 新增 implements 1 条：impl:abstract_class:k_1789371087163_g81kcs
- **验收**：
  - 两个 treeId 不再共享 nodeRef（本体 k_1784295376153_uiovkk / Java k_1789371087163_g81kcs）
  - 正文全部留在语义判定为 ontology 的一侧（k_1784295376153_uiovkk），未复制
  - 新建 Java 具象实体 tabs 为空（待填 Java 专有正文）

### `C1-09/inner_class` · split-entity · 按语义角色拆分共享实体 内部类

- **targetIds**：`{"原实体":"k_1784044129424_ffqm4z","本体实体":"k_1789371087163_e9iafm","Java实体":"k_1784044129424_ffqm4z","本体挂载":"tree_class_programming_inner_class","Java挂载":["tree_1784044129452_61ft68","tree_1786353277269_msn0ma91g"]}`
- **before**：`{"本体侧原ref":"(挂载点不存在)","Java侧原ref":"k_1784044129424_ffqm4z","挂载数":2}`
- **after**：`{"本体侧":"k_1789371087163_e9iafm","Java侧":"k_1784044129424_ffqm4z"}`
- **边影响**：本体侧新建 treebind 1 条（新挂载点） · Java 侧 treebind 不变（原实体即具象） · 新增 implements 1 条：impl:inner_class:k_1784044129424_ffqm4z
- **验收**：
  - 两个 treeId 不再共享 nodeRef（本体 k_1789371087163_e9iafm / Java k_1784044129424_ffqm4z）
  - 正文全部留在语义判定为 reference 的一侧（k_1784044129424_ffqm4z），未复制
  - 新建本体实体 tabs 为空（待填通用定义）

### `C1-09/final_class` · split-entity · 按语义角色拆分共享实体 最终类

- **targetIds**：`{"原实体":"k_1784045589643_icc5oo","本体实体":"k_1789371436917_zo0k0j","Java实体":"k_1784045589643_icc5oo","本体挂载":"tree_class_programming_final_class","Java挂载":["tree_1784045589689_drgfh8"]}`
- **before**：`{"本体侧原ref":"k_1784045589643_icc5oo","Java侧原ref":"k_1784045589643_icc5oo","挂载数":1}`
- **after**：`{"本体侧":"k_1789371436917_zo0k0j","Java侧":"k_1784045589643_icc5oo"}`
- **边影响**：本体侧 1 条 treebind 同 id 改 target：treebind:tree_class_programming_classification:tree_class_programming_final_class (k_1784045589643_icc5oo→k_1789371436917_zo0k0j) · Java 侧 treebind 不变（原实体即具象） · 新增 implements 1 条：impl:final_class:k_1784045589643_icc5oo
- **验收**：
  - 两个 treeId 不再共享 nodeRef（本体 k_1789371436917_zo0k0j / Java k_1784045589643_icc5oo）
  - 正文全部留在语义判定为 reference 的一侧（k_1784045589643_icc5oo），未复制
  - 新建本体实体 tabs 为空（待填通用定义）

### `C1-09/anonymous_class` · split-entity · 按语义角色拆分共享实体 匿名类

- **targetIds**：`{"原实体":"k_1784044171635_8etz45","本体实体":"k_1784044171635_8etz45","Java实体":"k_1789371087163_g0db3p","本体挂载":"tree_class_programming_anonymous_class","Java挂载":["tree_1784044171666_9yd2is"]}`
- **before**：`{"本体侧原ref":"k_1784044171635_8etz45","Java侧原ref":"k_1784044171635_8etz45","挂载数":1}`
- **after**：`{"本体侧":"k_1784044171635_8etz45","Java侧":"k_1789371087163_g0db3p"}`
- **边影响**：本体侧 treebind 不变（挂载点在位、实体未变） · Java 侧 1 条 treebind 同 id 改 target：treebind:tree_1784044092244_76wkqz:tree_1784044171666_9yd2is (k_1784044171635_8etz45→k_1789371087163_g0db3p) · 新增 implements 1 条：impl:anonymous_class:k_1789371087163_g0db3p
- **验收**：
  - 两个 treeId 不再共享 nodeRef（本体 k_1784044171635_8etz45 / Java k_1789371087163_g0db3p）
  - 正文全部留在语义判定为 ontology 的一侧（k_1784044171635_8etz45），未复制
  - 新建 Java 具象实体 tabs 为空（待填 Java 专有正文）

### `C4-01` · move · 管理程序 → 虚拟机 > 虚拟化技术

- **targetIds**：`{"treeId":"final_atomic_hypervisor","ref":"atomic_hypervisor","新父":"tree_wiki_en_virtual_machine_s5"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 管理程序","旧父孩子数":6,"新父孩子数":2}`
- **after**：`{"path":"虚拟机 > 虚拟化技术 > 管理程序","旧父孩子数":5,"新父孩子数":3}`
- **边影响**：treebind：删 treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_hypervisor，建 treebind:tree_wiki_en_virtual_machine_s5:final_atomic_hypervisor（子节点 ref 未变）
- **验收**：
  - 后代 treeId 不变
  - 池节点 atomic_hypervisor 未删未退休
  - 语义边不受影响（ref 未变）

### `C4-02` · move · 模拟器 → 虚拟机 > 虚拟化技术

- **targetIds**：`{"treeId":"final_atomic_emulator","ref":"atomic_emulator","新父":"tree_wiki_en_virtual_machine_s5"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 程序分析 > 动态程序分析 > 分析（计算机编程） > 探查器类型中的数据粒度 > 模拟器","旧父孩子数":5,"新父孩子数":3}`
- **after**：`{"path":"虚拟机 > 虚拟化技术 > 模拟器","旧父孩子数":4,"新父孩子数":4}`
- **边影响**：treebind：删 treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_emulator，建 treebind:tree_wiki_en_virtual_machine_s5:final_atomic_emulator（子节点 ref 未变）
- **验收**：
  - 后代 treeId 不变
  - 池节点 atomic_emulator 未删未退休
  - 语义边不受影响（ref 未变）

### `C4-03` · create · 新建中间层 I/O 多路复用

- **targetIds**：`{"newTreeId":"tree_concept_io_multiplexing","newRef":"k_1789371087163_25m6ob","父":"theory_domain_operating_systems"}`
- **before**：`{"操作系统孩子数":32}`
- **after**：`{"操作系统孩子数":33}`
- **边影响**：新增 treebind treebind:theory_domain_operating_systems:tree_concept_io_multiplexing
- **验收**：
  - tree_concept_io_multiplexing 挂到 操作系统 下
  - 池节点 k_1789371087163_25m6ob tabs 为空 → 空 tabs 计数 +1

### `C4-06` · create · 新建中间层 系统调用与 I/O

- **targetIds**：`{"newTreeId":"tree_concept_syscall_io","newRef":"k_1789371087163_b7qj6l","父":"theory_domain_operating_systems"}`
- **before**：`{"操作系统孩子数":33}`
- **after**：`{"操作系统孩子数":34}`
- **边影响**：新增 treebind treebind:theory_domain_operating_systems:tree_concept_syscall_io
- **验收**：
  - tree_concept_syscall_io 挂到 操作系统 下
  - 池节点 k_1789371087163_b7qj6l tabs 为空 → 空 tabs 计数 +1

### `C4-04` · move · select → 操作系统 > I/O 多路复用

- **targetIds**：`{"treeId":"asplit_s1_asplit_select_io","ref":"asplit_select_io","新父":"tree_concept_io_multiplexing"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > select","旧父":"操作系统","旧父孩子数":34}`
- **after**：`{"path":"操作系统 > I/O 多路复用 > select","旧父孩子数":33,"新父孩子数":1}`
- **边影响**：treebind：删 treebind:theory_domain_operating_systems:asplit_s1_asplit_select_io，建 treebind:tree_concept_io_multiplexing:asplit_s1_asplit_select_io；语义边不动（ref 未变）
- **验收**：
  - asplit_s1_asplit_select_io 挂到 I/O 多路复用 下
  - 后代 treeId 不变
  - 池节点 asplit_select_io 未删未退休

### `C4-05` · move · epoll → 操作系统 > I/O 多路复用

- **targetIds**：`{"treeId":"asplit_s1_asplit_epoll","ref":"asplit_epoll","新父":"tree_concept_io_multiplexing"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > epoll","旧父":"操作系统","旧父孩子数":33}`
- **after**：`{"path":"操作系统 > I/O 多路复用 > epoll","旧父孩子数":32,"新父孩子数":2}`
- **边影响**：treebind：删 treebind:theory_domain_operating_systems:asplit_s1_asplit_epoll，建 treebind:tree_concept_io_multiplexing:asplit_s1_asplit_epoll；语义边不动（ref 未变）
- **验收**：
  - asplit_s1_asplit_epoll 挂到 I/O 多路复用 下
  - 后代 treeId 不变
  - 池节点 asplit_epoll 未删未退休

### `C4-07` · move · 零拷贝 → 操作系统 > 系统调用与 I/O

- **targetIds**：`{"treeId":"tree_io_zero_copy","ref":"k_io_zero_copy","新父":"tree_concept_syscall_io"}`
- **before**：`{"path":"知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 零拷贝","旧父":"操作系统","旧父孩子数":32}`
- **after**：`{"path":"操作系统 > 系统调用与 I/O > 零拷贝","旧父孩子数":31,"新父孩子数":1}`
- **边影响**：treebind：删 treebind:theory_domain_operating_systems:tree_io_zero_copy，建 treebind:tree_concept_syscall_io:tree_io_zero_copy；语义边不动（ref 未变）
- **验收**：
  - tree_io_zero_copy 挂到 系统调用与 I/O 下
  - 后代 treeId 不变
  - 池节点 k_io_zero_copy 未删未退休

## 7. journal（机器可读，供 audit）

```json
[
  {
    "opId": "C1-02",
    "kind": "rename",
    "treeId": "tree_class_programming_classification",
    "ref": "k_class_programming_classification"
  },
  {
    "opId": "C1-09:abstract_class",
    "kind": "split-by-semantic-role",
    "role": "ontology",
    "existingRef": "k_1784295376153_uiovkk",
    "ontologyRef": "k_1784295376153_uiovkk",
    "javaNewRef": "k_1789371087163_g81kcs",
    "ontologyNewRef": null
  },
  {
    "opId": "C1-09:inner_class",
    "kind": "split-by-semantic-role",
    "role": "reference",
    "existingRef": "k_1784044129424_ffqm4z",
    "ontologyRef": "k_1789371087163_e9iafm",
    "javaNewRef": null,
    "ontologyNewRef": "k_1789371087163_e9iafm"
  },
  {
    "opId": "C1-09:final_class",
    "kind": "split-by-semantic-role",
    "role": "reference",
    "existingRef": "k_1784045589643_icc5oo",
    "ontologyRef": "k_1789371436917_zo0k0j",
    "javaNewRef": null,
    "ontologyNewRef": "k_1789371436917_zo0k0j"
  },
  {
    "opId": "C1-09:anonymous_class",
    "kind": "split-by-semantic-role",
    "role": "ontology",
    "existingRef": "k_1784044171635_8etz45",
    "ontologyRef": "k_1784044171635_8etz45",
    "javaNewRef": "k_1789371087163_g0db3p",
    "ontologyNewRef": null
  },
  {
    "opId": "C4-01",
    "kind": "move",
    "treeId": "final_atomic_hypervisor",
    "from": "treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_hypervisor",
    "to": "treebind:tree_wiki_en_virtual_machine_s5:final_atomic_hypervisor"
  },
  {
    "opId": "C4-02",
    "kind": "move",
    "treeId": "final_atomic_emulator",
    "from": "treebind:tree_wiki_en_profiling_computer_programming_s8:final_atomic_emulator",
    "to": "treebind:tree_wiki_en_virtual_machine_s5:final_atomic_emulator"
  },
  {
    "opId": "C4-03",
    "kind": "create-layer",
    "treeId": "tree_concept_io_multiplexing",
    "ref": "k_1789371087163_25m6ob"
  },
  {
    "opId": "C4-06",
    "kind": "create-layer",
    "treeId": "tree_concept_syscall_io",
    "ref": "k_1789371087163_b7qj6l"
  },
  {
    "opId": "C4-04",
    "kind": "move",
    "treeId": "asplit_s1_asplit_select_io",
    "from": "treebind:theory_domain_operating_systems:asplit_s1_asplit_select_io",
    "to": "treebind:tree_concept_io_multiplexing:asplit_s1_asplit_select_io"
  },
  {
    "opId": "C4-05",
    "kind": "move",
    "treeId": "asplit_s1_asplit_epoll",
    "from": "treebind:theory_domain_operating_systems:asplit_s1_asplit_epoll",
    "to": "treebind:tree_concept_io_multiplexing:asplit_s1_asplit_epoll"
  },
  {
    "opId": "C4-07",
    "kind": "move",
    "treeId": "tree_io_zero_copy",
    "from": "treebind:theory_domain_operating_systems:tree_io_zero_copy",
    "to": "treebind:tree_concept_syscall_io:tree_io_zero_copy"
  }
]
```
