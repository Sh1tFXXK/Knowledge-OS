# 链接器（计算）

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Linker_(computing))  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

被组装成一个新的库或可执行文件]]

**链接器**或**链接编辑器**是一个[计算机程序](https://en.wikipedia.org/wiki/computer_program)，它将中间[软件构建](https://en.wikipedia.org/wiki/software_build)文件（例如[对象](https://en.wikipedia.org/wiki/object_file)和[库](https://en.wikipedia.org/wiki/library_(computing))文件组合成一个单一的[可执行文件](https://en.wikipedia.org/wiki/executable) 文件，例如程序或库。链接器通常是工具链的一部分，其中包括生成链接器处理的中间文件的编译器和/或汇编器。链接器可以与其他工具链[工具](https://en.wikipedia.org/wiki/development_tool)集成，这样用户就不会直接与链接器交互。

将其[输出](https://en.wikipedia.org/wiki/Input%2Foutput)直接写入[内存](https://en.wikipedia.org/wiki/Computer_memory)的更简单版本称为*加载器*，尽管[加载](https://en.wikipedia.org/wiki/loader_(computing))通常被认为是一个单独的过程。

---

## 概述

计算机程序通常由几个部分或模块组成；这些部分/模块不需要包含在单个[目标文件](https://en.wikipedia.org/wiki/object_file)中，在这种情况下，使用[符号](https://en.wikipedia.org/wiki/symbol_(computing))作为其他模块的地址相互引用，这些模块在链接执行时被映射到内存地址。

虽然链接过程的目的是最终组合这些独立的部分，但有很多充分的理由在[源](https://en.wikipedia.org/wiki/Source_code)级别单独开发这些部分。其中原因包括在[整体](https://en.wikipedia.org/wiki/Monolithic_codebase)整体上组织几个较小的部分的容易性，以及更好地定义每个单独部分的目的和职责的能力，这对于管理[软件架构](https://en.wikipedia.org/wiki/software_architecture)的复杂性和提高长期可维护性至关重要。

通常，目标文件可以包含三种符号：

- 定义的“外部”符号，有时称为“公共”或“入口”符号，允许其他模块调用它，
- 未定义的“外部”符号，它们引用定义了这些符号的其他模块，以及
- 本地符号，在目标文件内部使用以方便[重定位](https://en.wikipedia.org/wiki/relocation_(computer_science))。

对于大多数编译器来说，每个目标文件都是编译一个输入源代码文件的结果。当程序包含多个目标文件时，链接器将这些文件组合成一个统一的可执行程序，并在运行过程中解析符号。

链接器可以从称为[库](https://en.wikipedia.org/wiki/library_(computing))或[运行时库](https://en.wikipedia.org/wiki/runtime_library)的集合中获取对象。大多数链接器不会在输出可执行文件中包含[静态库](https://en.wikipedia.org/wiki/static_library)中的所有目标文件；它们仅包括库中被其他对象文件或库直接或间接引用的那些对象文件。但对于[共享库](https://en.wikipedia.org/wiki/shared_libraries)，整个库必须在运行时加载，因为不知道在运行时将调用哪些函数或方法。因此，库链接可能是一个迭代过程，一些引用的模块需要链接附加模块，等等。库的存在有多种目的，并且通常默认链接一个或多个系统库。

链接器还负责在程序的[地址空间](https://en.wikipedia.org/wiki/address_space)中排列对象。这可能涉及将假定特定[基地址](https://en.wikipedia.org/wiki/base_address)的代码*重新定位到另一个基地址。由于编译器很少知道对象将驻留在哪里，因此它通常假设一个固定的基本位置（例如，[zero](https://en.wikipedia.org/wiki/zero_base)）。重新定位机器代码可能涉及重新定位绝对跳转、加载和存储。

当链接器的可执行输出最终加载到内存中（就在执行之前）时，可能需要另一次重定位传递。在提供虚拟内存的[硬件](https://en.wikipedia.org/wiki/computer_hardware)上通常会省略此过程：每个程序都放入自己的地址空间中，因此即使所有程序加载到相同的基地址，也不会发生冲突。如果可执行文件是[位置独立](https://en.wikipedia.org/wiki/position_independent)可执行文件，则也可以省略此过程。

此外，在某些操作系统中，同一个程序可以处理链接和加载程序的工作（[动态链接](https://en.wikipedia.org/wiki/dynamic_linking)）。

## 动态链接

参见：[动态链接器](https://en.wikipedia.org/wiki/Dynamic_linker)

许多[操作系统](https://en.wikipedia.org/wiki/operating_system)环境允许动态链接，将某些未定义符号的解析推迟到程序运行为止。这意味着可执行代码仍然包含未定义的符号，以及将为这些符号提供定义的对象或库的列表。加载程序也会加载这些对象/库，并执行最终链接。

这种方法有两个优点：

- 经常使用的库（例如标准系统库）只需存储在一个位置，而不是在每个可执行文件中重复，从而节省有限的[内存](https://en.wikipedia.org/wiki/computer_memory)和[磁盘](https://en.wikipedia.org/wiki/disk_storage)空间。
- 如果通过替换库来纠正库函数中的错误或改进[性能](https://en.wikipedia.org/wiki/Computer_performance)，则所有动态使用它的程序在重新启动后都将受益于更正。通过静态链接包含此函数的程序必须首先重新链接。

还有一些缺点：

- 在 [Windows](https://en.wikipedia.org/wiki/Windows) 平台上称为“[DLL hell](https://en.wikipedia.org/wiki/DLL_hell)”，如果新版本不正确[向后兼容](https://en.wikipedia.org/wiki/backward_known)，不兼容的更新库将破坏依赖于先前版本库的行为的可执行文件。
- 一个程序及其使用的库可能作为一个包进行认证（例如，关于正确性、文档要求或性能），但如果组件可以替换则不会（这也反对关键系统中的自动操作系统更新；在这两种情况下，操作系统和库构成*合格*环境的一部分）。
[包含](https://en.wikipedia.org/wiki/Containerization_(computing))或[虚拟](https://en.wikipedia.org/wiki/OS-level_virtualization)环境可能进一步允许[系统管理员](https://en.wikipedia.org/wiki/System_administrator)减轻或权衡这些单独的利弊。

## 静态链接

静态链接是链接器将程序中使用的所有库例程复制到可执行映像的结果。这可能比动态链接需要更多的磁盘空间和内存，但更便携，因为它不需要在其运行的系统上存在[库](https://en.wikipedia.org/wiki/dynamic-link_library)。静态链接还可以防止“DLL 地狱”，因为每个程序都包含其所需的库例程版本，不会与其他程序发生冲突。仅使用库中的几个例程的程序不需要安装整个库。

## 搬迁

由于编译器没有有关最终输出中对象布局的信息，因此它无法利用对另一个对象的地址提出要求的更短或更有效的指令。例如，跳转指令可以引用绝对地址或距当前位置的偏移量，并且根据到目标的距离，偏移量可以用不同的长度来表示。通过首先生成最保守的指令（通常是最大的相对或绝对变体，具体取决于平台）并添加*松弛提示*，可以在最终链接期间替换更短或更有效的指令。关于跳跃优化，这也称为“自动跳跃大小调整”。只有在所有输入对象都被读取并分配临时地址后才能执行此步骤；**链接器松弛**传递随后重新分配地址，这反过来可能允许发生更多潜在的松弛。一般来说，替换序列较短，这使得该过程始终能够收敛于给定固定对象顺序的最佳解决方案；如果情况并非如此，则放宽可能会发生冲突，并且链接器需要权衡任一选项的优点。

虽然指令松弛通常发生在链接时，但内部模块松弛已经可以作为[编译时](https://en.wikipedia.org/wiki/compile-time)优化过程的一部分发生。在某些情况下，松弛也可以在[加载时](https://en.wikipedia.org/wiki/load-time)发生，作为重定位过程的一部分或与[动态死代码消除](https://en.wikipedia.org/wiki/dynamic_dead-code_elimination)技术相结合。

## 联动编辑器

在 IBM [System/360](https://en.wikipedia.org/wiki/System%2F360) 中通过 [IBM Z](https://en.wikipedia.org/wiki/IBM_Z) [大型机](https://en.wikipedia.org/wiki/Mainframe_computer) 操作系统，例如 [OS/360 及其successors](https://en.wikipedia.org/wiki/OS%2F360_and_successors)，这种类型的程序被称为*链接编辑器*。顾名思义，链接*编辑器*具有允许添加、替换和/或删除各个程序部分的附加功能。诸如 OS/360 之类的操作系统具有可执行加载模块的格式，其中包含有关程序的组成部分的补充数据，以便可以替换单个程序部分，并更新程序的其他部分，以便链接编辑器可以纠正可重定位地址和其他引用，作为该过程的一部分。

这样做的优点之一是它允许维护程序而不必保留所有中间目标文件，或者不必重新编译未更改的程序部分。它还允许程序更新以小文件的形式分发（最初是[卡片组](https://en.wikipedia.org/wiki/card_deck_(computing))），仅包含要替换的对象模块。在此类系统中，目标代码采用 80 字节打孔卡图像的形式和格式，以便可以将更新引入使用该介质的系统中。在 OS/360 的更高版本和后续系统中，加载模块包含有关组件模块版本的附加数据，以创建可跟踪的更新记录。它还允许从已链接的加载模块中添加、更改或删除[overlay](https://en.wikipedia.org/wiki/overlay_(programming))结构。

术语“链接编辑器”不应被解释为暗示程序像文本编辑器一样以用户交互模式运行。它用于批处理模式执行，用户在按顺序组织的文件中提供编辑命令，例如[打孔卡](https://en.wikipedia.org/wiki/punched_card)、[DASD](https://en.wikipedia.org/wiki/direct-access_storage_device)或[磁带](https://en.wikipedia.org/wiki/magic_tape)。

*链接编辑*（[IBM]（https://en.wikipedia.org/wiki/IBM）命名法）或*合并*或*集合*（[ICL]（https://en.wikipedia.org/wiki/International_Computers_Limited）命名法）指的是*链接编辑器*或*合并器*将各个部分组合成可重定位二进制文件的行为，而在目标地址通常被视为一个单独的步骤。

## 链接器控制脚本

早期的链接器为用户提供了对生成的输出目标文件的排列非常有限的控制。随着目标系统变得更加复杂并具有不同的内存要求（例如在嵌入式系统中），有必要让用户控制生成具有特定要求（例如定义段的基地址）的输出目标文件。为此使用了链接器控制脚本。

## 值得注意的实施

### Unix 和类 Unix

在 Unix 和类 Unix 系统上，静态链接器通常通过命令 ld 调用，该命令是 *LoaDer* 或 *Link eDitor* 的缩写。术语“加载器”用于描述在链接过程中从其他程序加载外部符号的过程。 （该术语也已用于其他操作系统中。例如，在 [SINTRAN III](https://en.wikipedia.org/wiki/SINTRAN%26nbsp%3BIII) 中，链接（将目标文件组装到程序中）被称为*加载*，就像将可执行代码加载到文件中一样。）

### GNU

GNU ld 是 [GNU Binary Utilities](https://en.wikipedia.org/wiki/GNU_Binary_Utilities) (binutils) 的一部分，是 Unix 静态链接器的 [GNU 项目](https://en.wikipedia.org/wiki/GNU_Project) 版本。 *链接器脚本*可以传递给 GNU ld 以对链接过程进行细粒度控制。 binutils 中提供了两个版本的 ld：基于 [bfd](https://en.wikipedia.org/wiki/Binary_File_Descriptor_library) 的传统 GNU ld，以及名为 [gold](https://en.wikipedia.org/wiki/gold_(linker)) 的简化的仅 ELF 版本。

[LLVM](https://en.wikipedia.org/wiki/LLVM) 项目的链接器 *lld* 被设计为直接兼容，并且可以直接与 GNU 编译器一起使用。另一种直接替代品 Mold 是一种高度并行且速度更快的替代品，也受到 GNU 工具的支持。

## 参见

- [二进制文件描述符库](https://en.wikipedia.org/wiki/Binary_File_Descriptor_library) (libbfd)
- [构建（计算）](https://en.wikipedia.org/wiki/Build_(计算))
- [编译并运行系统](https://en.wikipedia.org/wiki/Compile_and_go_system)
- [DLL地狱](https://en.wikipedia.org/wiki/DLL_hell)
- [直接绑定](https://en.wikipedia.org/wiki/Direct_binding)
- [动态绑定](https://en.wikipedia.org/wiki/Dynamic_binding_(computing))
- [动态死代码消除](https://en.wikipedia.org/wiki/Dynamic_dead-code_elimination)
- [动态调度](https://en.wikipedia.org/wiki/Dynamic_dispatch)
- [动态库](https://en.wikipedia.org/wiki/Dynamic_library)
- [动态链接器](https://en.wikipedia.org/wiki/Dynamic_linker)
- [动态加载](https://en.wikipedia.org/wiki/Dynamic_loading)
- [动态链接库](https://en.wikipedia.org/wiki/Dynamic-link_library)
- [外部变量](https://en.wikipedia.org/wiki/External_variable)
- [图书馆](https://en.wikipedia.org/wiki/Library_(computing))
- [加载器](https://en.wikipedia.org/wiki/Loader_(computing))
- [名字装饰](https://en.wikipedia.org/wiki/Name_decoration)
- [预链接](https://en.wikipedia.org/wiki/Prelinking)（预绑定）
- [搬迁](https://en.wikipedia.org/wiki/Relocation_(computing))
- [智能链接](https://en.wikipedia.org/wiki/Smart_linking)
- [静态库](https://en.wikipedia.org/wiki/Static_library)
- [黄金（链接器）](https://en.wikipedia.org/wiki/Gold_(链接器))

## 参考

## 进一步阅读

- 机器独立链接器（1982 年 4 月，[John Wiley & Sons Ltd](https://en.wikipedia.org/wiki/John_Wiley_%26_Sons_Ltd)）
- 操作系统 360 - 链接编辑器 (E) - 程序逻辑手册 (1969-07-23, [International Business Machines Corporation](https://en.wikipedia.org/wiki/International_Business_Machines_Corporation))
- 汇编语言作为目标代码（1983 年 8 月，[John Wiley & Sons Ltd](https://en.wikipedia.org/wiki/John_Wiley_%26_Sons_Ltd)）
- 链接器和加载器（2000，[Morgan Kaufmann](https://en.wikipedia.org/wiki/Morgan_Kaufmann)）代码：<https://linker.iecc.com/code.html> 勘误表：<https://linker.iecc.com/>
- 链接器和加载器（1972 年 9 月，[ACM 计算调查](https://en.wikipedia.org/wiki/ACM_Computing_Surveys)）（19 页）
- 通过 Currying 重新定位机器指令（1996 年 5 月）

## 外部链接

[链接器](https://en.wikipedia.org/wiki/linker)
- [Ian Lance Taylor 的 *Linkers* 博客条目](https://www.google.com/search?q=site%3Awww.airs.com%2Fblog%2Farchives+%22linkers+part%22)
- [链接器和加载器](http://www.linuxjournal.com/article/6463)，Sandeep Grover 的一篇 [Linux Journal](https://en.wikipedia.org/wiki/Linux_Journal) 文章
- [另一个获取汇编语言开发免费工具完整集合的列表](https://web.archive.org/web/20060808184333/http://www.dpgraph.com/ assembly.html)
- [GNU 链接器手册](https://sourceware.org/binutils/docs/ld/index.html)
- [LLD - LLVM 链接器](https://lld.llvm.org/)
-
