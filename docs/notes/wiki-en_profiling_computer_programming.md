# 分析（计算机编程）

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Profiling_(computer_programming))  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

工具
在[软件工程](https://en.wikipedia.org/wiki/software_engineering)中，**分析**（**程序分析**、**软件分析**）是[动态程序分析](https://en.wikipedia.org/wiki/dynamic_program_analysis)的一种形式，用于测量例如空间（内存）或时间[复杂性]程序](https://en.wikipedia.org/wiki/Computational_complexity_theory)，[特定指令的使用](https://en.wikipedia.org/wiki/instruction_set_simulator)，或函数调用的频率和持续时间。  最常见的是，分析信息有助于[程序优化](https://en.wikipedia.org/wiki/program_optimization)，更具体地说，有助于[性能工程](https://en.wikipedia.org/wiki/performance_engineering)。

分析是通过使用名为 *profiler* （或 *code profiler*）的工具对程序 [源代码](https://en.wikipedia.org/wiki/source_code) 或其二进制可执行形式进行检测来实现的。分析器可以使用多种不同的技术，例如基于事件的、统计的、仪器化的和模拟的方法。

---

## 收集节目活动

分析器使用多种技术来收集数据，包括[硬件中断](https://en.wikipedia.org/wiki/hardware_interrupt)、[代码检测](https://en.wikipedia.org/wiki/Instrumentation_(computer_programming))、[指令集模拟](https://en.wikipedia.org/wiki/instruction_set_simulator)、操作系统[挂钩](https://en.wikipedia.org/wiki/hooking) 和[性能计数器](https://en.wikipedia.org/wiki/Hardware_performance_counter)。

## 分析器的使用

分析器]]
架构]]。软件编写者需要工具来分析他们的程序并识别代码的关键部分。 [编译器](https://en.wikipedia.org/wiki/Compiler) 作者经常使用此类工具来了解他们的[指令调度](https://en.wikipedia.org/wiki/instruction_scheduling) 或[分支预测](https://en.wikipedia.org/wiki/branch_prediction) 算法的执行情况...

分析器的输出可能是：

- 观察到的事件的统计*摘要*（**概况**）
：摘要配置文件信息通常根据事件发生的源代码语句进行注释，因此测量数据的大小与程序的代码大小成线性关系。

/* ------------ 源------------------------ 计数 */
 第0001章 0055
 第0002章 那就做吧
 第0003章 XCOUNT加1 0032
 第0004章
 第0005章 0055

- 记录的事件流（**痕迹**）
：对于顺序程序，摘要概要文件通常就足够了，但并行程序中的性能问题（等待消息或同步问题）通常取决于事件的时间关系，因此需要完整的跟踪才能了解正在发生的情况。
：（完整）跟踪的大小与程序的[指令路径长度](https://en.wikipedia.org/wiki/instruction_path_length)成线性关系，这使得它有些不切实际。因此，跟踪可以在程序中的一个点启动并在另一点终止以限制输出。
- 与[管理程序](https://en.wikipedia.org/wiki/hypervisor)的持续交互（例如通过屏幕显示进行连续或定期监控）
：除了查看有关（仍在执行的）程序的持续指标之外，这还提供了在执行期间的任何所需点打开或关闭跟踪的机会。它还提供了在关键点挂起异步进程的机会，以便更详细地检查与其他并行进程的交互。

探查器可以应用于单个方法或模块或程序的规模，通过使长时间运行的代码变得明显来识别性能瓶颈。探查器可用于从时序角度理解代码，目的是优化代码以处理各种运行时条件或各种负载。分析结果可以由提供[配置文件引导优化](https://en.wikipedia.org/wiki/profile-guided_optimization)的编译器获取。分析结果可用于指导单个算法的设计和优化； [Krauss 匹配通配符算法](https://en.wikipedia.org/wiki/Krauss_matching_wildcards_algorithm) 就是一个例子。分析器内置于一些[应用程序性能管理](https://en.wikipedia.org/wiki/application_performance_management)系统中，这些系统聚合分析数据以深入了解[分布式](https://en.wikipedia.org/wiki/distributed_computing)应用程序中的[事务](https://en.wikipedia.org/wiki/transaction_processing)工作负载。

## 历史

从 20 世纪 70 年代初起，性能分析工具就存在于 [IBM/360](https://en.wikipedia.org/wiki/IBM%2F360) 和 [IBM/370](https://en.wikipedia.org/wiki/IBM%2F370) 平台上，通常基于计时器中断，该计时器中断在设置时记录[程序状态字](https://en.wikipedia.org/wiki/program_status_word) (PSW)计时器间隔来检测执行代码中的“热点”。这是[采样](https://en.wikipedia.org/wiki/Sampling_(statistics)) 的早期示例（见下文）。 1974 年初，[指令集模拟器](https://en.wikipedia.org/wiki/Instruction_Set_Simulator) 允许完整跟踪和其他性能监控功能。

Unix 上的探查器驱动的程序分析可以追溯到 1973 年，当时 Unix 系统包含一个基本工具 prof，它列出了每个函数及其使用的程序执行时间。 1982 年，gprof 将这一概念扩展为完整的[调用图](https://en.wikipedia.org/wiki/call_graph)分析。

1994年，[Digital Equipment Corporation](https://en.wikipedia.org/wiki/Digital_Equipment_Corporation)的Amitabh Srivastava和[Alan Eustace](https://en.wikipedia.org/wiki/Alan_Eustace)发表了一篇描述ATOM（带有OM的分析工具）的论文。 ATOM 平台将程序转换为自己的分析器：在[编译时](https://en.wikipedia.org/wiki/compile_time)，它将代码插入到要分析的程序中。插入的代码输出分析数据。这种技术 - 修改程序来分析自身 - 被称为“[仪器](https://en.wikipedia.org/wiki/Instrumentation_(computer_programming))”。

2004 年，gprof 和 A​​TOM 论文都出现在截至 1999 年的 20 年期间 50 篇最有影响力的 [PLDI](https://en.wikipedia.org/wiki/Conference_on_Programming_Language_Design_and_Implementation) 论文列表中。

## 基于输出的探查器类型

### 平面轮廓仪

平面分析器根据调用计算平均调用时间，并且不会根据被调用者或上下文分解调用时间。

### 调用图分析器

[调用图](https://en.wikipedia.org/wiki/Call_graph)分析器显示函数的调用时间和频率，以及基于被调用者的调用链。在某些工具中，不会保留完整的上下文。

### 输入敏感的分析器

输入敏感分析器通过将性能度量与输入工作负载的特征（例如输入大小或输入值）相关联，为平面或调用图分析器添加了更多维度。他们生成图表来描述应用程序的性能如何随其输入而变化。

## 探查器类型中的数据粒度

探查器本身也是程序，通过收集有关目标程序执行的信息来分析目标程序。根据其数据粒度（取决于分析器收集信息的方式），它们被分类为“基于事件”或“统计”分析器。探查器中断程序执行以收集信息。  这些中断会限制时间测量分辨率，这意味着对计时结果应该持保留态度。 [基本块](https://en.wikipedia.org/wiki/Basic_block)分析器报告一些专门用于执行每行代码的机器[时钟周期](https://en.wikipedia.org/wiki/cycles_per_instruction)，或基于将这些代码加在一起的计时；每个基本块报告的时间可能无法反映[缓存](https://en.wikipedia.org/wiki/CPU_cache)命中和未命中之间的差异。

### 基于事件的分析器

基于事件的分析器可用于以下编程语言：
- [Java](https://en.wikipedia.org/wiki/Java_(programming_language))：[JVMTI](https://en.wikipedia.org/wiki/Java_Virtual_Machine_Tools_Interface)（JVM 工具接口）API，以前称为 JVMPI（JVM 分析接口），为分析器提供钩子，用于捕获调用、类加载、卸载、线程进入离开等事件。
- [.NET](https://en.wikipedia.org/wiki/.NET_Framework)：可以使用分析 *API* 将分析代理作为 *COM* 服务器附加到 *CLR*。与 Java 一样，运行时向代理提供各种回调，用于捕获方法 [JIT](https://en.wikipedia.org/wiki/Interpreter)/进入/离开、对象创建等事件。特别强大的是，分析代理可以以任意方式重写目标应用程序的字节码。
- [Python](https://en.wikipedia.org/wiki/Python_(programming_language))：Python 分析包括配置文件模块、hotshot（基于调用图），并使用“sys.setprofile”函数捕获 c_{call,return,exception}、python_{call,return,exception} 等事件。
- [Ruby](https://en.wikipedia.org/wiki/Ruby_(programming_language))：Ruby 还使用与 Python 类似的接口进行分析。 profile.rb 中的 Flat-profiler、模块和 ruby​​-prof 都存在 C 扩展。

### 统计分析器

这些分析器通过[采样](https://en.wikipedia.org/wiki/Sampling_(statistics)) 进行操作。采样分析器使用[操作系统](https://en.wikipedia.org/wiki/operating_system)[中断](https://en.wikipedia.org/wiki/interrupt)定期探测目标程序的[调用堆栈](https://en.wikipedia.org/wiki/call_stack)。采样配置文件通常在数值上不太准确和具体，仅提供统计近似值，但允许目标程序以接近全速运行。 “实际误差量通常大于一个采样周期。事实上，如果一个值是采样周期的 n 倍，那么它的预期误差就是 n 个采样周期的平方根。”

在实践中，采样分析器通常可以比其他方法提供更准确的目标程序执行情况，因为它们不会对目标程序造成干扰，因此不会产生太多副作用（例如对内存缓存或指令解码管道的副作用）。此外，由于它们不会产生太多开销，因此它们可以检测到本来会隐藏的问题。它们也相对不会过度评估小型的、通常称为例程或“紧”循环的成本。它们可以显示用户模式与可中断内核模式（例如[系统调用](https://en.wikipedia.org/wiki/system_call)处理）所花费的相对时间量。

不幸的是，运行内核代码来处理中断会导致目标程序稍微损失 CPU 周期、转移缓存使用，并且无法区分不可中断内核代码（微秒范围的活动）中发生的各种任务与用户代码。专用硬件可以做得更好：ARM Cortex-M3 和一些最新的 MIPS 处理器的 JTAG 接口有一个 PCSAMPLE 寄存器，它以真正不可检测的方式对[程序计数器](https://en.wikipedia.org/wiki/program_counter)进行采样，从而允许非侵入式收集平面配置文件。

Java/托管代码的一些常用统计分析器是 [SmartBear Software](https://en.wikipedia.org/wiki/SmartBear_Software) 的 [AQtime](https://en.wikipedia.org/wiki/AQtime) 和 [Microsoft](https://en.wikipedia.org/wiki/Microsoft) 的 [CLR Profiler](https://en.wikipedia.org/wiki/CLR_Profiler)。这些分析器还支持本机代码分析，以及 [Apple Inc.](https://en.wikipedia.org/wiki/Apple_Inc.) 的 [Shark](https://en.wikipedia.org/wiki/Apple_Developer_Tools#Shark) (OSX)、[OProfile](https://en.wikipedia.org/wiki/OProfile) (Linux)、[Intel](https://en.wikipedia.org/wiki/Intel) [VTune](https://en.wikipedia.org/wiki/VTune) 和并行放大器（[Intel Parallel Studio](https://en.wikipedia.org/wiki/Intel_Parallel_Studio) 的一部分）和 [Oracle](https://en.wikipedia.org/wiki/Oracle_Corporation) [性能分析器](https://en.wikipedia.org/wiki/Performance_Analyzer) 等。

### 仪器仪表

该技术有效地向目标程序添加指令以收集所需的信息。请注意，程序可能会导致性能变化，并且在某些情况下可能会导致结果不准确和/或 heisenbug。  效果将取决于正在收集的信息、报告的时序详细信息的级别以及基本块分析是否与检测结合使用。  例如，添加代码来计算每个过程/例程调用的效果可能比计算每个语句被遵守的次数要小。  一些计算机有特殊的硬件来收集信息；在这种情况下，对程序的影响很小。

仪器是确定分析器可用的控制级别和时间分辨率量的关键。
-**手动**：由程序员执行，例如通过添加指令来显式计算运行时间，只需计算事件或对测量 [API](https://en.wikipedia.org/wiki/API) 的调用，例如[应用程序响应测量](https://en.wikipedia.org/wiki/Application_Response_Measurement) 标准。
-**自动源级别**：自动工具根据检测策略将检测添加到源代码中。
-**中间语言**：添加到[汇编](https://en.wikipedia.org/wiki/Assembly_language)或反编译[字节码](https://en.wikipedia.org/wiki/bytecode)中的工具，提供对多种高级源语言的支持并避免（非符号）二进制偏移重写问题。
-**编译器辅助**
-**二进制翻译**：该工具将检测添加到已编译的[可执行文件](https://en.wikipedia.org/wiki/executable)。
-**运行时检测**：在执行之前直接对代码进行检测。程序的运行完全由该工具监督和控制。
-**运行时注入**：比运行时检测更轻量。代码在运行时被修改以跳转到辅助函数。

### 口译仪器

-**解释器调试**选项可以在解释器遇到每个目标语句时收集性能指标。 [字节码](https://en.wikipedia.org/wiki/bytecode)、[控制表](https://en.wikipedia.org/wiki/control_table)或[JIT](https://en.wikipedia.org/wiki/Just-in-time_compilation)解释器是三个示例，它们通常可以完全控制目标代码的执行，从而实现极其全面的数据收集机会。

### 管理程序/模拟器

-**虚拟机监控程序**：通过在[虚拟机监控程序](https://en.wikipedia.org/wiki/hypervisor)下运行（通常）未修改的程序来收集数据。示例：[SIMMON](https://en.wikipedia.org/wiki/SIMMON)
-**模拟器**和**管理程序**：通过在[指令集模拟器](https://en.wikipedia.org/wiki/instruction_set_simulator)下运行未修改的程序，以交互方式和选择性地收集数据。

## 参见

- 算法效率
- 基准（计算）
- Java性能
- 性能分析工具列表
- 性能应用程序编程接口
- 性能工程
- 性能预测
- 性能调整
- 运行时验证
- 配置文件引导优化
- 静态代码分析
- 软件考古学
- 最坏情况执行时间 (WCET)

## 参考

## 外部链接

- 关于使用 [IBM Rational Application Developer](https://en.wikipedia.org/wiki/IBM_Rational_Application_Developer) 对 Java 应用程序进行执行时间分析的文章“[速度需求 — 消除性能瓶颈](http://www.ibm.com/developerworks/rational/library/05/1004_gupta/)”。
- [使用 VTune 性能分析器分析运行时生成和解释的代码](http://software.intel.com/sites/products/documentation/hpc/vtune/windows/jit_profiling.pdf)
