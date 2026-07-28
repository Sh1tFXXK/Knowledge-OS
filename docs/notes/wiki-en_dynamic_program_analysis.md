# 动态程序分析

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Dynamic_program_analysis)  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

**动态程序分析**是[分析软件](https://en.wikipedia.org/wiki/Program_analysis_(computer_science))的行为，涉及执行[程序](https://en.wikipedia.org/wiki/computer_program)，而不是[静态程序分析](https://en.wikipedia.org/wiki/static_program_analysis)，后者不执行它。

分析可以侧重于软件的不同方面，包括但不限于：[行为](https://en.wikipedia.org/wiki/behavior)、[测试覆盖率](https://en.wikipedia.org/wiki/test_coverage)、[性能](https://en.wikipedia.org/wiki/software_performance)和[安全](https://en.wikipedia.org/wiki/security)。

为了有效，目标程序必须使用足够的测试输入来执行，以解决可能的输入和输出的范围。 [软件测试](https://en.wikipedia.org/wiki/Software_testing)措施，例如[代码覆盖率](https://en.wikipedia.org/wiki/code_coverage)，以及[突变测试](https://en.wikipedia.org/wiki/mutation_testing)等工具，用于确定测试不足的地方。

---

## 类型

### 功能测试

主要入口：[软件测试](https://en.wikipedia.org/wiki/Software_testing)

功能测试包括相对常见的[编程](https://en.wikipedia.org/wiki/computer_programming)技术，例如[单元测试](https://en.wikipedia.org/wiki/unit_testing)、[集成测试](https://en.wikipedia.org/wiki/integration_testing)和[系统测试](https://en.wikipedia.org/wiki/system_testing)。

### 代码覆盖率

计算测试[代码覆盖率](https://en.wikipedia.org/wiki/code_coverage) 可识别未经测试的代码。

尽管此分析识别出未经测试的代码，但它无法确定已测试的代码是否经过“充分”测试。即使测试实际上没有验证正确的行为，代码也可以执行。

- [Gcov](https://en.wikipedia.org/wiki/Gcov) 是 [GNU](https://en.wikipedia.org/wiki/GNU) 源代码覆盖计划。
- [VB Watch](https://en.wikipedia.org/wiki/VB_Watch) 将动态分析代码注入 Visual Basic 程序以监视[代码覆盖率](https://en.wikipedia.org/wiki/code_coverage)、调用堆栈、执行跟踪、实例化对象和变量。

### 动态测试

主要入口：[动态测试](https://en.wikipedia.org/wiki/Dynamic_testing)

动态测试涉及在一组测试用例上执行程序。

### 内存错误检测

- [AddressSanitizer](https://en.wikipedia.org/wiki/AddressSanitizer)：Linux、[macOS](https://en.wikipedia.org/wiki/macOS)、Windows 等的内存错误检测。 [LLVM](https://en.wikipedia.org/wiki/LLVM) 的一部分。
- [BoundsChecker](https://en.wikipedia.org/wiki/BoundsChecker)：基于 Windows 的应用程序的内存错误检测。  [Micro Focus](https://en.wikipedia.org/wiki/Micro_Focus) [DevPartner](https://en.wikipedia.org/wiki/DevPartner) 的一部分。
- [Dmalloc](https://en.wikipedia.org/wiki/Dmalloc)：用于检查内存分配和泄漏的库。软件必须重新编译，所有文件必须包含特殊的C头文件dmalloc.h。
- [Intel Inspector](https://en.wikipedia.org/wiki/Intel_Inspector)：适用于在 [Windows](https://en.wikipedia.org/wiki/Windows) 和 [Linux](https://en.wikipedia.org/wiki/Linux) 上运行的 C、C++ 和 Fortran 应用程序的动态内存错误调试器。
- [Purify](https://en.wikipedia.org/wiki/IBM_Rational_Purify)：主要是[内存损坏](https://en.wikipedia.org/wiki/storage_violation)检测和内存泄漏检测。
- [Valgrind](https://en.wikipedia.org/wiki/Valgrind)：在虚拟处理器上运行程序，并可以检测内存错误（例如，误用[malloc](https://en.wikipedia.org/wiki/malloc)和[free](https://en.wikipedia.org/wiki/Free_(programming)))和[竞争条件](https://en.wikipedia.org/wiki/race_conditions) [多线程](https://en.wikipedia.org/wiki/Multithreading_(software))程序。

### 模糊测试

主要入境：[Fuzzing](https://en.wikipedia.org/wiki/Fuzzing)
模糊测试是一种测试技术，涉及在各种输入上执行程序；通常，这些输入是随机生成的（至少部分是随机生成的）。 [灰盒模糊器](https://en.wikipedia.org/wiki/Fuzzing#Types) 使用代码覆盖率来指导输入生成。

### 动态符号执行

主要入境：[Concolic 测试](https://en.wikipedia.org/wiki/Concolic_testing)

动态符号执行（也称为 *DSE* 或 concolic 执行）涉及在具体输入上执行测试程序，收集与执行相关的路径约束，并使用约束求解器（https://en.wikipedia.org/wiki/constraint_solver）（通常是 [SMT 求解器](https://en.wikipedia.org/wiki/SMT_solver)）生成新的输入，这将导致程序采用不同的控制流路径，从而增加测试套件的代码覆盖率。 DSE 可以被认为是一种[模糊测试](https://en.wikipedia.org/wiki/#Fuzzing)（“白盒”模糊测试）。

### 动态数据流分析

动态数据流分析跟踪从“源”到“汇”的信息流。动态数据流分析的形式包括动态污点分析，甚至是[动态符号执行](https://en.wikipedia.org/wiki/#Dynamic_symbolic_execution)。

### 不变推理

[Daikon](https://en.wikipedia.org/wiki/Daikon_(system)) 是动态不变检测的实现。 Daikon 运行程序，观察值
程序进行计算，然后报告在观察到的执行期间为 true 的属性，因此在所有执行中都可能为 true。

### 安全分析

动态分析可用于检测安全问题。
- [IBM Rational AppScan](https://en.wikipedia.org/wiki/IBM_Rational_AppScan) 是一套针对开发生命周期不同阶段的应用程序安全解决方案。该套件包括两个主要的动态分析产品：IBM Rational AppScan Standard Edition 和 IBM Rational AppScan Enterprise Edition。此外，该套件还包括 IBM Rational AppScan Source Edition——一个静态分析工具。

### 并发错误

- [Parasoft](https://en.wikipedia.org/wiki/Parasoft) [Jtest](https://en.wikipedia.org/wiki/Jtest) 使用运行时错误检测来暴露缺陷，例如[竞争条件](https://en.wikipedia.org/wiki/race_conditions)、异常、资源和内存泄漏以及安全攻击漏洞。
- [Intel Inspector](https://en.wikipedia.org/wiki/Intel_Inspector) 在 Windows 中执行运行时线程和内存错误分析。
- [Parasoft](https://en.wikipedia.org/wiki/Parasoft) [Insure++](https://en.wikipedia.org/wiki/Insure%2B%2B) 是一个运行时内存分析和错误检测工具。它的 Inuse 组件提供了随时间变化的内存分配的图形视图，具有总体堆使用情况、块分配、可能的未解决泄漏等的具体可见性。
- [Google](https://en.wikipedia.org/wiki/Google) 的 Thread Sanitizer 是一种数据竞争检测工具。它使用 [LLVM](https://en.wikipedia.org/wiki/LLVM) IR 来捕获活跃的内存访问。

### 程序切片

主条目：[程序切片](https://en.wikipedia.org/wiki/Program_slicing)
对于程序行为的给定子集，程序切片包括将程序减少到仍产生所选行为的最小形式。简化后的程序称为“切片”，是指定行为子集域内原始程序的忠实表示。
一般来说，寻找切片是一个无解的问题，但是通过根据一组变量的值指定目标行为子集，可以使用数据流算法获得近似切片。开发人员在调试过程中通常使用这些切片来定位错误源。

### 性能分析

大多数[性能分析工具](https://en.wikipedia.org/wiki/list_of_performance_analysis_tools)使用动态程序分析技术。

## 技巧

大多数动态分析涉及[仪器](https://en.wikipedia.org/wiki/Instrumentation_(computer_programming))或转换。

由于检测会影响运行时性能，因此测试结果的解释必须考虑到这一点，以避免错误识别性能问题。

### 示例

DynInst 是一个运行时代码修补库，可用于开发动态程序分析探针并将其应用于已编译的可执行文件。 Dyninst 一般不需要[源代码](https://en.wikipedia.org/wiki/source_code) 或重新编译；但是，未剥离的可执行文件和带有调试符号的可执行文件更容易检测。

[Iroh.js](https://maierfelix.github.io/Iroh/) 是 [JavaScript](https://en.wikipedia.org/wiki/JavaScript) 的运行时代码分析库。它跟踪代码执行路径，提供运行时侦听器来检测特定的执行代码模式，并允许拦截和操纵程序的执行行为。

## 参见

- [摘要解释](https://en.wikipedia.org/wiki/Abstract_interpretation)
- [Daikon](https://en.wikipedia.org/wiki/Daikon_(system))
- [动态负载测试](https://en.wikipedia.org/wiki/Dynamic_load_testing)
- [分析（计算机编程）](https://en.wikipedia.org/wiki/Profiling_(computer_programming))
- [运行时验证](https://en.wikipedia.org/wiki/Runtime_verification)
- [程序分析（计算机科学）](https://en.wikipedia.org/wiki/Program_analysis_(computer_science))
- [静态代码分析](https://en.wikipedia.org/wiki/Static_code_analysis)
- [时间分区测试](https://en.wikipedia.org/wiki/Time_Partition_Testing)

## 参考
