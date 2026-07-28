# Java性能

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Java_performance)  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

在[软件开发](https://en.wikipedia.org/wiki/software_development)中，编程语言[Java](https://en.wikipedia.org/wiki/Java_(programming_language))历来被认为比最快的[第三代](https://en.wikipedia.org/wiki/Third- Generation_programming_language)[类型化](https://en.wikipedia.org/wiki/Type_system)语言慢，例如[C](https://en.wikipedia.org/wiki/C_(programming_language)) 和 [C++](https://en.wikipedia.org/wiki/C%2B%2B)。与这些语言相反，Java 默认编译为 [Java 虚拟机](https://en.wikipedia.org/wiki/Java_Virtual_Machine) (JVM)，其操作与实际计算机硬件的操作不同。早期的 JVM 实现是[解释器](https://en.wikipedia.org/wiki/Interpreter_(computing))；他们逐一模拟虚拟操作，而不是将它们翻译成机器代码（https://en.wikipedia.org/wiki/machine_code）以直接硬件执行。

自 20 世纪 90 年代末以来，通过引入 [即时编译](https://en.wikipedia.org/wiki/just-in-time_compilation) (JIT)（1997 年 [Java 1.1](https://en.wikipedia.org/wiki/Java_version_history)）、添加支持更好代码分析的语言功能以及 JVM 中的优化（例如[HotSpot](https://en.wikipedia.org/wiki/HotSpot) 在 2000 年成为 [Sun](https://en.wikipedia.org/wiki/Sun_Microsystems) JVM 的默认值。复杂的[垃圾收集](https://en.wikipedia.org/wiki/garbage_collection_(computer_science))策略也是一个需要改进的领域。 Java 字节码的硬件执行，例如 ARM 的 [Jazelle](https://en.wikipedia.org/wiki/Jazelle) 提供的硬件执行，已被探索但尚未部署。

[Java字节码](https://en.wikipedia.org/wiki/Java_bytecode)编译的Java程序的[性能](https://en.wikipedia.org/wiki/Computer_performance)取决于主机[Java虚拟机](https://en.wikipedia.org/wiki/Java_virtual_machine) (JVM)如何最佳地管理其给定任务，以及JVM如何充分利用[计算机的功能]硬件](https://en.wikipedia.org/wiki/computer_hardware) 和[操作系统](https://en.wikipedia.org/wiki/operating_system) (OS) 这样做。因此，任何 Java [性能测试](https://en.wikipedia.org/wiki/Software_performance_testing) 或比较都必须始终报告所使用 JVM 的版本、供应商、操作系统和硬件架构。以类似的方式，等效的本机编译程序的性能将取决于其生成的机器代码的质量，因此测试或比较还必须报告所使用的编译器的名称、版本和供应商，以及其激活的[编译器优化](https://en.wikipedia.org/wiki/compiler_optimization)指令。

---

## 虚拟机优化方法

随着时间的推移，许多优化已经提高了 JVM 的性能。然而，尽管 Java 通常是第一个成功实现它们的[虚拟机](https://en.wikipedia.org/wiki/virtual_machine)，但它们也经常被用于其他类似的平台。

### 即时编译

延伸阅读：[即时编译](https://en.wikipedia.org/wiki/Just-in-time_compilation)
早期的 JVM 总是解释 [Java 字节码](https://en.wikipedia.org/wiki/Java_bytecode)。在普通应用程序中，与 C 相比，Java 的性能损失很大，达到 10 到 20 倍。为了解决这个问题，Java 1.1 中引入了即时 (JIT) 编译器。由于编译成本较高，Java 1.2 中引入了一个名为 [HotSpot](https://en.wikipedia.org/wiki/HotSpot) 的附加系统，并在 Java 1.3 中成为默认系统。使用此框架，[Java 虚拟机](https://en.wikipedia.org/wiki/Java_virtual_machine) 不断分析频繁或重复执行的“热点”的程序性能。然后针对这些进行优化，从而以最小的开销实现高性能执行，从而实现性能关键性较低的代码。
一些基准测试表明，通过这种方式速度可以提高 10 倍。然而，由于时间限制，编译器无法完全优化程序，因此生成的程序比本机代码替代方案慢。

### 自适应优化

延伸阅读：[自适应优化](https://en.wikipedia.org/wiki/Adaptive_optimization)
自适应优化是计算机科学中的一种方法，它根据当前的执行配置文件对程序的各个部分执行[动态重新编译](https://en.wikipedia.org/wiki/dynamic_recompilation)。通过简单的实现，自适应优化器可以简单地在即时编译和解释指令之间进行权衡。在另一个层面上，自适应优化可以利用本地数据条件来优化分支并使用内联扩展。

像[HotSpot](https://en.wikipedia.org/wiki/HotSpot)这样的[Java虚拟机](https://en.wikipedia.org/wiki/Java_virtual_machine)也可以[去优化](https://en.wikipedia.org/wiki/deoptimization)以前的JIT代码。这允许执行积极的（并且可能不安全的）优化，同时仍然能够稍后对代码进行去优化并回退到安全路径。

### 垃圾收集

延伸阅读：[垃圾收集（计算机科学）](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science))
1.0 和 1.1 [Java 虚拟机](https://en.wikipedia.org/wiki/Java_virtual_machine) (JVM) 使用了[标记-清除收集器](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Copying_vs._mark-and-sweep_vs._mark-and-don't-sweep)，这可能会将垃圾回收后的[堆](https://en.wikipedia.org/wiki/Dynamic_memory_allocation#Heap-based_memory_allocation)。
从 Java 1.2 开始，JVM 更改为分代收集器（https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC)），它具有更好的碎片整理行为。
现代 JVM 使用各种方法进一步提高了[垃圾收集](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science))性能。

### 其他优化方法

#### 压缩哎呀

压缩 Oop 允许 Java 5.0+ 使用 32 位引用寻址高达 32 GB 的堆。 Java 不支持访问单个字节，仅支持访问默认 8 字节对齐的对象。因此，堆引用的最低 3 位将始终为 0。通过将 32 位引用的分辨率降低到 8 字节块，可寻址空间可以增加到 32 GB。与使用 64 位引用相比，这显着减少了内存使用，因为 Java 比某些语言（如 C++）使用引用更多。 Java 8 支持更大的对齐方式，例如 16 字节对齐，以支持高达 64 GB 的 32 位引用。

#### 分割字节码验证

在执行[类](https://en.wikipedia.org/wiki/Class_(computer_science))之前，Sun JVM会验证其[Java字节码](https://en.wikipedia.org/wiki/Java_bytecode)（请参阅[字节码验证器](https://en.wikipedia.org/wiki/Java_virtual_machine#Bytecode_verifier)）。这种验证是惰性执行的：类的字节码仅在加载特定类并准备使用时加载和验证，而不是在程序开始时加载和验证。然而，由于 Java [类库](https://en.wikipedia.org/wiki/Java_Platform#Class_libraries) 也是常规 Java 类，因此在使用时也必须加载它们，这意味着 Java 程序的启动时间通常比 [C++](https://en.wikipedia.org/wiki/C%2B%2B) 程序的启动时间长。

名为“分割时间验证”的方法首次在 [Java 平台微型版](https://en.wikipedia.org/wiki/Java_Platform%2C_Micro_Edition) (J2ME) 中引入，自 [Java 版本 6](https://en.wikipedia.org/wiki/Java_version_history) 起在 JVM 中使用。它将 [Java 字节码](https://en.wikipedia.org/wiki/Java_bytecode) 的验证分为两个阶段：
- 设计时 – 将类从源代码编译为字节码时
- 运行时 – 加载类时。

实际上，该方法的工作原理是捕获 Java 编译器拥有的类流知识，并使用类流信息的概要来注释已编译的方法字节码。  这并不会使[运行时验证](https://en.wikipedia.org/wiki/runtime_verification)明显不那么复杂，但确实允许一些快捷方式。

#### 逃逸分析和锁粗化

延伸阅读：[锁（计算机科学）](https://en.wikipedia.org/wiki/Lock_(computer_science))
Java 能够在语言级别管理[多线程](https://en.wikipedia.org/wiki/Thread_(computer_science))。多线程允许程序同时执行多个进程，从而提高在具有多个处理器或内核的[计算机系统](https://en.wikipedia.org/wiki/computer_system)上运行的程序的性能。此外，即使在执行长时间运行的任务时，多线程应用程序也可以保持对输入的响应。

但是，使用多线程的程序需要额外注意线程之间共享的对象，当其中一个线程使用共享方法或块时，锁定对它们的访问。由于涉及底层[操作系统](https://en.wikipedia.org/wiki/operating_system)级操作的性质，锁定块或对象是一项耗时的操作（请参阅[并发控制](https://en.wikipedia.org/wiki/concurrency_control)和[锁定粒度](https://en.wikipedia.org/wiki/Lock_(computer_science)#Granularity)）。

由于 Java 库不知道哪些方法将被多个线程使用，因此标准库在多线程环境中需要时总是锁定 [blocks](https://en.wikipedia.org/wiki/block_(programming))。

在 Java 6 之前，虚拟机总是在程序要求时锁定对象并阻塞，即使不存在对象同时被两个不同线程修改的风险。例如，在本例中，本地 Vector 在每个 *add* 操作之前被锁定，以确保它不会被其他线程修改（Vector 是同步的），但因为它对于方法来说是严格本地的，所以这是不必要的：

公共字符串 getNames() {
     最终 Vector<String> v = new Vector<>();
     v.add("我");
     v.add("你");
     v.add(“她”);
     返回 v.toString();
}

从Java 6开始，代码块和对象仅在需要时才被锁定，因此在上述情况下，虚拟机根本不会锁定Vector对象。

从版本 6u23 开始，Java 包含了对转义分析的支持。

#### 寄存器分配改进

在 [Java 6](https://en.wikipedia.org/wiki/Java_version_history) 之前，[寄存器分配](https://en.wikipedia.org/wiki/Register_allocation) 在 *client* 虚拟机中非常原始（它们不跨 [blocks](https://en.wikipedia.org/wiki/Block_(programming))），这是 [CPU 中的一个问题] design](https://en.wikipedia.org/wiki/CPU_design)的可用[处理器寄存器](https://en.wikipedia.org/wiki/processor_register)较少，如[x86](https://en.wikipedia.org/wiki/x86)。如果没有更多寄存器可用于操作，编译器必须[从寄存器复制到内存](https://en.wikipedia.org/wiki/register_spilling)（或内存到寄存器），这需要时间（寄存器的访问速度要快得多）。然而，*server* 虚拟机使用了 [color-graph](https://en.wikipedia.org/wiki/Graph_coloring) 分配器，并且没有这个问题。

Sun 的 JDK 6 中引入了寄存器分配的优化；然后可以跨块使用相同的寄存器（如果适用），从而减少对内存的访问。据报道，这使得某些基准测试的性能提升了约 60%。

#### 班级数据共享

类数据共享（Sun 称为 CDS）是一种减少 Java 应用程序启动时间并减少内存占用的机制。安装 JRE 后，安装程序会从系统 JAR 文件（包含所有 Java 类库的 JAR 文件，称为 rt.jar）加载一组类到私有内部表示，并将该表示转储到称为“共享存档”的文件。在后续 JVM 调用期间，此共享存档会被内存映射，从而节省加载这些类的成本，并允许这些类的大部分 JVM 元数据在多个 JVM 进程之间共享。

对于小程序来说，启动时间的相应改善更为明显。

## 性能改进的历史

延伸阅读：[Java版本历史](https://en.wikipedia.org/wiki/Java_version_history)
除了此处列出的改进之外，Java 的每个版本还在 JVM 和 Java [应用程序编程接口](https://en.wikipedia.org/wiki/application_programming_interface) (API) 中引入了许多性能改进。

JDK 1.1.6：第一个[即时编译](https://en.wikipedia.org/wiki/just-in-time_compilation)（[Symantec](https://en.wikipedia.org/wiki/NortonLifeLock) 的 JIT 编译器）

J2SE 1.2：使用[分代收集器](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)#Generational_GC_(aka_Ephemeral_GC))。

J2SE 1.3：[HotSpot](https://en.wikipedia.org/wiki/HotSpot) 的[即时编译](https://en.wikipedia.org/wiki/#Just-in-time_compiling)。

J2SE 1.4：请参阅[此处](http://java.sun.com/j2se/1.4.2/performance.guide.html)，了解 Sun 对 1.3 和 1.4 版本之间性能改进的概述。

Java SE 5.0：[类数据共享](https://en.wikipedia.org/wiki/#Class_data_sharing)

Java SE 6：
- [分割字节码验证](https://en.wikipedia.org/wiki/#Split_bytecode_verification)
- [逃逸分析和锁粗化](https://en.wikipedia.org/wiki/#Escape_analysis_and_lock_coarsening)
- [寄存器分配改进](https://en.wikipedia.org/wiki/#Register_allocation_improvements)

其他改进：
- Java [OpenGL](https://en.wikipedia.org/wiki/OpenGL) [Java 2D](https://en.wikipedia.org/wiki/Java_2D) 管道速度改进
- Java 6 中的 Java 2D 性能也显着提高

另请参阅“Sun 关于 Java 5 和 Java 6 之间性能改进的概述”。

### Java SE 6 更新 10

- Java Quick Starter 通过在操作系统启动时在 [磁盘缓存](https://en.wikipedia.org/wiki/Page_cache) 上预加载部分 JRE 数据来减少应用程序启动时间。
- 现在，在未安装 JRE 时，首先下载执行从 Web 访问的应用程序所需的平台部分。完整的 JRE 为 12 MB，典型的 Swing 应用程序只需下载 4 MB 即可启动。然后在后台下载其余部分。
- 默认情况下广泛使用 [Direct3D](https://en.wikipedia.org/wiki/Direct3D) 提高了 [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) 上的图形性能，并在[图形处理单元](https://en.wikipedia.org/wiki/graphics_processing_unit) (GPU)上使用[着色器](https://en.wikipedia.org/wiki/shader)来加速复杂的[Java 2D](https://en.wikipedia.org/wiki/Java_2D) 操作。

### 爪哇7

Java 7 发布了多项性能改进：
未来的性能改进计划针对 Java 6 或 Java 7 的更新：
- 遵循目前在[达芬奇机](https://en.wikipedia.org/wiki/Da_Vinci_Machine)（多语言虚拟机）上完成的原型设计工作，为[动态编程语言](https://en.wikipedia.org/wiki/dynamic_programming_language)提供JVM支持，
- 通过管理[多核](https://en.wikipedia.org/wiki/multi-core)处理器上的[并行计算](https://en.wikipedia.org/wiki/parallel_computing)来增强现有的并发库，
- 允许 JVM 在同一个会话中通过称为分层编译的方法使用 *[客户端](https://en.wikipedia.org/wiki/HotSpot#Features)* 和 *服务器* [JIT 编译器](https://en.wikipedia.org/wiki/Just-in-time_compilation)：
- *客户端*将在启动时使用（因为它适合启动和小型应用程序），
  - *服务器*将用于应用程序的长期运行（因为它在这方面优于*客户端*编译器）。
- 将现有的并发低暂停垃圾收集器（也称为并发标记清除 (CMS) 收集器）替换为名为垃圾优先 (G1) 的新收集器，以确保随着时间的推移保持一致的暂停。

## 与其他语言的比较

客观地比较 Java 程序和用另一种语言（例如 [C++](https://en.wikipedia.org/wiki/C%2B%2B) 编写的等效程序的性能）需要一个仔细且深思熟虑构建的基准来比较完成相同任务的程序。 Java的字节码编译器的目标平台是Java平台，字节码由JVM解释或编译为机器代码。其他编译器几乎总是针对特定的硬件和软件平台，生成的机器代码在执行过程中几乎保持不变。这两种不同的方法产生了非常不同且难以比较的场景：静态编译与[动态编译](https://en.wikipedia.org/wiki/dynamic_compilation)和[重新编译](https://en.wikipedia.org/wiki/Dynamic_recompilation)、有关运行时环境的精确信息的可用性和其他。

Java 通常是在运行时由 Java [虚拟机](https://en.wikipedia.org/wiki/virtual_machine)[即时编译](https://en.wikipedia.org/wiki/Just-in-time_compilation)，但也可能是[提前编译](https://en.wikipedia.org/wiki/Ahead-of-time_compilation)，C++ 也是如此。当及时编译时，[计算机语言基准游戏](https://en.wikipedia.org/wiki/The_Computer_Language_Benchmarks_Game)的微基准表明其性能如下：
- 比编译语言慢，例如 [C](https://en.wikipedia.org/wiki/C_(programming_language)) 或 [C++](https://en.wikipedia.org/wiki/C%2B%2B)，
- 类似于其他即时编译语言，例如 [C#](https://en.wikipedia.org/wiki/C_Sharp_(programming_language))，
- 比没有有效的本机代码编译器的语言（[JIT](https://en.wikipedia.org/wiki/Just-in-time_compilation) 或 [AOT](https://en.wikipedia.org/wiki/Ahead-of-time_compilation)）快得多，例如 [Perl](https://en.wikipedia.org/wiki/Perl)， [Ruby](https://en.wikipedia.org/wiki/Ruby_(programming_language))、[PHP](https://en.wikipedia.org/wiki/PHP) 和 [Python](https://en.wikipedia.org/wiki/Python_(programming_language))。

### 程序速度

基准通常衡量小型数字密集型程序的性能。在一些罕见的现实程序中，Java 的性能优于 C。一个例子是 [Jake2](https://en.wikipedia.org/wiki/Jake2) 的基准测试（通过翻译原始 [GPL](https://en.wikipedia.org/wiki/GPL) C 代码，用 Java 编写的 [Quake II](https://en.wikipedia.org/wiki/Quake_II) 的克隆）。 Java 5.0 版本在某些硬件配置中比其 C 版本表现更好。虽然没有具体说明如何测量数据（例如，如果使用 1997 年编译的原始 Quake II 可执行文件，这可能被认为是不好的，因为当前的 C 编译器可能会为 Quake 实现更好的优化），但它指出相同的 Java 源代码如何仅通过更新 VM 即可获得巨大的速度提升，这是使用 100% 静态方法不可能实现的。

对于其他程序，C++ 对应程序可以而且通常比 Java 对应程序运行得快得多。 Google 在 2011 年进行的基准测试显示，C++ 和 Java 之间的差距为 10。另一个极端是，2012 年使用 3D 建模算法进行的学术基准测试显示，[Java 6](https://en.wikipedia.org/wiki/Java_6) JVM 比 Windows 下的 C++ 慢 1.09 到 1.91 倍。

在 Java 和类似语言中可行的某些优化在某些情况下在 C++ 中可能无法实现：
- C 风格的[指针](https://en.wikipedia.org/wiki/Pointer_(computer_programming)) 使用可能会阻碍支持指针的语言的优化，
- 例如，[转义分析](https://en.wikipedia.org/wiki/#Escape_analysis_and_lock_coarsening)方法的使用在[C++](https://en.wikipedia.org/wiki/C%2B%2B)中受到限制，因为C++编译器并不总是知道[对象](https://en.wikipedia.org/wiki/Object_(computer_science))是否会在给定的代码块中被修改，因为[指针](https://en.wikipedia.org/wiki/Pointer_(computer_programming)),
- 由于 C++ 的额外虚拟表查找，Java 可以比 C++ 访问派生虚拟方法更快地访问派生实例方法。然而，C++ 中的非虚拟方法不会遇到 v 表性能瓶颈，因此表现出与 Java 类似的性能。

JVM 还能够执行特定于处理器的优化或[内联扩展](https://en.wikipedia.org/wiki/inline_expansion)。而且，当涉及外部库函数时，对已编译或内联的代码进行去优化的能力有时允许其执行比静态类型语言执行的更积极的优化。

Java 和 C++ 之间的[微基准测试](https://en.wikipedia.org/wiki/Benchmark_(computing)) 的结果很大程度上取决于比较哪些操作。例如，与Java 5.0相比：
- 32 位和 64 位算术运算、[文件输入/输出](https://en.wikipedia.org/wiki/Input%2Foutput) 和[异常处理](https://en.wikipedia.org/wiki/exception_handling) 与同类 C++ 程序具有相似的性能
- [数组](https://en.wikipedia.org/wiki/Array_data_type) 上的操作在 C 中具有更好的性能。
- [三角函数](https://en.wikipedia.org/wiki/trigonometric_functions) 在 C 中的性能要好得多。

----
**注释**

### 多核性能

多核系统上Java应用程序的可伸缩性和性能受到对象分配率的限制。这种效应有时被称为“分配墙”。然而，在实践中，现代垃圾收集器算法使用多个核心来执行垃圾收集，这在一定程度上缓解了这个问题。据报道，一些垃圾收集器能够维持每秒超过 1 GB 的分配率，并且存在基于 Java 的系统，可以毫无问题地扩展到数百个 CPU 核心和数百 GB 的堆大小。

Java 中的自动内存管理允许有效地使用无锁和不可变的数据结构，如果没有某种垃圾收集，这些数据结构是极其困难或有时不可能实现的。 Java 在 java.util.concurrent 包的标准库中提供了许多此类高级结构，而许多历史上用于高性能系统的语言（如 C 或 C++）仍然缺乏它们。

### 启动时间

Java 启动时间通常比许多语言慢得多，包括 [C](https://en.wikipedia.org/wiki/C_(programming_language))、[C++](https://en.wikipedia.org/wiki/C%2B%2B)、[Perl](https://en.wikipedia.org/wiki/Perl) 或 [Python](https://en.wikipedia.org/wiki/Python_(programming_language))，因为许多类（以及第一个类）在使用之前必须加载[平台类库](https://en.wikipedia.org/wiki/Java_(software_platform)#Class_libraries))中的所有类。

与类似的流行运行时相比，对于在 Windows 计算机上运行的小程序，启动时间似乎与 [Mono](https://en.wikipedia.org/wiki/Mono_(software)) 相似，并且比 [.NET](https://en.wikipedia.org/wiki/.NET_Framework) 慢一点。

看起来大部分启动时间是由于输入输出 (IO) 绑定操作而不是 JVM 初始化或类加载（仅 *rt.jar* 类数据文件就有 40 MB，JVM 必须在这个大文件中查找大量数据）。一些测试表明，虽然新的[分割字节码验证](https://en.wikipedia.org/wiki/#Split_bytecode_verification)方法将类加载提高了大约40%，但它只实现了大约5%的启动
大型程序的改进。

尽管是一个很小的改进，但在执行简单操作然后退出的小程序中更明显，因为Java平台数据加载可以代表实际程序操作的负载的许多倍。

从 Java SE 6 Update 10 开始，Sun JRE 附带了一个 Quick Starter，它在操作系统启动时预加载类数据，以便从 [磁盘缓存](https://en.wikipedia.org/wiki/Page_cache) 而不是从磁盘获取数据。

[Excelsior JET](https://en.wikipedia.org/wiki/Excelsior_JET) 从另一方面解决问题。其启动优化器减少了应用程序启动时必须从磁盘读取的数据量，并使读取更加连续。

2004 年 11 月，[Nailgun](https://en.wikipedia.org/wiki/Nailgun_(software)) 被公开发布，这是一个“用于从命令行运行 Java 程序而不会产生 JVM 启动开销的客户端、协议和服务器”。首次引入[脚本](https://en.wikipedia.org/wiki/Script_(computing))选项，以使用 JVM 作为[守护进程](https://en.wikipedia.org/wiki/Daemon_(computing))，用于运行一个或多个 Java 应用程序，而无需 JVM 启动开销。 Nailgun 守护进程不安全：“所有程序都以与服务器相同的权限运行”。如果需要[多用户](https://en.wikipedia.org/wiki/multi-user)安全性，如果没有特殊的预防措施，Nailgun 是不合适的。每个应用程序 JVM 启动主导资源使用的脚本，请参阅一到两个 [数量级](https://en.wikipedia.org/wiki/order_of_magnitude) 运行时性能改进。

### 内存使用

Java 内存使用量比 C++ 内存使用量高得多，因为：
- Java 中每个对象有 8 个字节的开销，每个数组有 12 个字节的开销。如果对象的大小不是 8 字节的倍数，则会向上舍入为 8 的下一个倍数。这意味着持有一个字节字段的对象占用 16 字节，并且需要 4 字节引用。  C++ 还为每个类直接或间接声明虚拟函数的对象分配一个指针（通常为 4 或 8 个字节）。
- 缺乏地址运算使得创建内存高效的容器，例如紧密间隔的结构和[XOR链表](https://en.wikipedia.org/wiki/XOR_linked_list)，目前是不可能的([OpenJDK Valhalla项目](https://en.wikipedia.org/wiki/Project_Valhalla_(Java_language))旨在缓解这些问题，尽管它并不旨在引入指针运算；这不能在垃圾收集环境中完成。
- 与malloc和new相反，随着堆大小的增加，垃圾收集的平均性能开销逐渐接近于零（更准确地说，一个CPU周期）。
- [Java 类库](https://en.wikipedia.org/wiki/Java_Class_Library) 的部分内容必须在程序执行之前加载（至少是程序中使用的类）。这会导致小型应用程序产生大量内存开销。
- Java 二进制文件和本机重新编译通常都在内存中。
- 虚拟机使用大量内存。
- 在 Java 中，复合对象（使用 B 和 C 实例的 A 类）是使用对已分配的 B 和 C 实例的引用来创建的。在 C++ 中，当 B 和/或 C 的实例存在于 A 中时，可以避免这些类型引用的内存和性能成本。

在大多数情况下，由于 Java 虚拟机、类加载和自动内存调整大小的巨大开销，C++ 应用程序比同等的 Java 应用程序消耗更少的内存。对于内存是在语言和运行时环境之间进行选择的关键因素的程序，需要进行成本/收益分析。

### 三角函数

与C相比，三角函数的性能较差，因为Java对数学运算的结果有严格的规范，这可能与底层硬件实现不对应。在 [x87](https://en.wikipedia.org/wiki/x87) 浮点子集上，Java 自 1.4 起在软件中对 sin 和 cos 进行了参数减少，导致超出范围的值对性能造成很大影响。

### Java 本机接口

[Java Native Interface](https://en.wikipedia.org/wiki/Java_Native_Interface) 调用很高的开销，使得跨越 JVM 上运行的代码和本机代码之间的边界的成本很高。Bloch [Java Native Access](https://en.wikipedia.org/wiki/Java_Native_Access) (JNA) 提供 [Java](https://en.wikipedia.org/wiki/Java_(programming_language)) 程序轻松访问本机 [共享库](https://en.wikipedia.org/wiki/Shared_library)（Windows 上的[动态链接库](https://en.wikipedia.org/wiki/dynamic-link_library)（DLL））仅通过 Java 代码，没有 JNI 或本机代码。此功能与 Windows 的 Platform/Invoke 和 [Python](https://en.wikipedia.org/wiki/Python_(programming_language)) ctypes 相当。访问在运行时是动态的，无需生成代码。但它是有代价的，JNA通常比JNI慢。

### 用户界面

[Swing](https://en.wikipedia.org/wiki/Swing_(Java)) 被认为比本机[小部件工具包](https://en.wikipedia.org/wiki/widget_toolkit)慢，因为它将小部件的渲染委托给纯粹的[Java 2D](https://en.wikipedia.org/wiki/Java_2D)[API](https://en.wikipedia.org/wiki/API)。然而，比较 Swing 与 [Standard Widget Toolkit](https://en.wikipedia.org/wiki/Standard_Widget_Toolkit)（将渲染委托给操作系统的本机 GUI 库）的性能的基准测试没有显示出明显的赢家，并且结果在很大程度上取决于上下文和环境。此外，旨在取代 Swing 的较新的 [JavaFX](https://en.wikipedia.org/wiki/JavaFX) 框架解决了 Swing 的许多固有问题。

### 用于高性能计算

有些人认为，在计算密集型基准测试中，[高性能计算](https://en.wikipedia.org/wiki/high_performance_computing) (HPC) 的 Java 性能与 [Fortran](https://en.wikipedia.org/wiki/Fortran) 类似，但 JVM 在[网格计算](https://en.wikipedia.org/wiki/grid_computing)网络上执行密集通信时仍然存在可扩展性问题。

然而，用 Java 编写的高性能计算应用程序赢得了基准竞赛。 2008 年和 2009 年，基于 Apache [Hadoop](https://en.wikipedia.org/wiki/Hadoop)（一个用 Java 编写的开源高性能计算项目）的集群能够以最快的速度对 TB 和 PB 的整数进行排序。然而，竞争系统的硬件设置并不固定。

### 在编程竞赛中

Java 程序的启动速度比其他编译语言的程序要慢。因此，一些在线评委系统，特别是由中国大学主办的系统，对 Java 程序使用更长的时间限制，以公平对待使用 Java 的参赛者。

## 参见

- [通用语言运行时](https://en.wikipedia.org/wiki/Common_Language_Runtime)
- [性能分析](https://en.wikipedia.org/wiki/Profiling_(computer_programming))
- [Java 处理器](https://en.wikipedia.org/wiki/Java_processor)，本地运行 Java 字节码的嵌入式处理器（例如 [JStik](https://en.wikipedia.org/wiki/JStik)）
- [Java 和 C++ 的比较](https://en.wikipedia.org/wiki/Comparison_of_Java_and_C%2B%2B)
- [Java ConcurrentMap](https://en.wikipedia.org/wiki/Java_ConcurrentMap)

## 引文

## 参考

- 《Effective Java：编程语言指南》（Joshua Bloch，2018 年，Addison-Wesley）

## 外部链接

- [专门提供 Java 性能信息的网站](http://javaperformancetuning.com/)
- [调试Java性能问题](http://prefetch.net/presentations/DebuggingJavaPerformance.pdf)
- [Sun 的 Java 性能门户](http://java.sun.com/docs/performance/)
- [基于 SPb Oracle 分支工程师演示的思维导图（如大 PNG 图片）](https://github.com/raydac/Java-performance-mind-map)
