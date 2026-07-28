# 程序分析

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Program_analysis)  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

在[计算机科学](https://en.wikipedia.org/wiki/computer_science)中，**程序分析**是分析计算机程序关于正确性、鲁棒性、安全性和活跃性等属性的行为的过程。
程序分析主要关注两个领域：[程序优化](https://en.wikipedia.org/wiki/program_optimization)和[程序正确性](https://en.wikipedia.org/wiki/program_ Correctness)。第一个重点是提高程序的性能，同时减少资源使用，而后者则重点是确保程序执行其应该执行的操作。

程序分析可以在不执行程序的情况下进行（[静态程序分析](https://en.wikipedia.org/wiki/static_program_analysis)）、在运行时（[动态程序分析](https://en.wikipedia.org/wiki/dynamic_program_analysis)）或两者结合进行。

---

## 静态程序分析

主条目：[静态程序分析](https://en.wikipedia.org/wiki/Static_program_analysis)
在程序正确性的背景下，静态分析可以在程序的开发阶段发现漏洞。这些漏洞比测试阶段发现的漏洞更容易纠正，因为静态分析可以找到漏洞的根源。

由于许多形式的静态分析在计算上是不可判定的（https://en.wikipedia.org/wiki/Undecidable_problem），执行它的机制可能并不总是以正确的答案终止。这可能会导致[误报](https://en.wikipedia.org/wiki/False_positives_and_false_negatives)（当代码实际上有问题时“未发现问题”）或[误报](https://en.wikipedia.org/wiki/False_positives_and_false_negatives)，或者因为它们可能永远不会返回错误的答案，但也可能永远不会终止。尽管有这些限制，静态分析仍然很有价值：第一种机制可能会减少漏洞的数量，而第二种机制有时可以强有力地保证不存在某些类别的漏洞。

不正确的优化是非常不可取的。因此，在程序优化的背景下，有两种主要策略来处理计算上不可判定的分析：

1. 预计在相对较短的时间内完成的优化器，例如优化编译器中的优化器，可以使用保证在有限时间内完成的分析的截断版本，并保证只找到正确的优化。
2. 第三方优化工具的实现方式可能永远不会产生错误的优化，而且在某些情况下，它可以无限期地继续运行，直到找到优化工具（这可能永远不会发生）。在这种情况下，使用该工具的开发人员必须停止该工具并避免再次在该代码段上运行该工具（或者可能修改代码以避免工具出错）。

然而，还有第三种策略有时适用于未完全指定的语言，例如 [C](https://en.wikipedia.org/wiki/C_(programming_language))。优化编译器可以自由地生成在运行时执行任何操作的代码，如果遇到其语义未由所使用的语言标准指定的源代码，甚至会崩溃。

### 控制流

主要入口：[控制流分析](https://en.wikipedia.org/wiki/Control-flow_analysis)
控制流分析的目的是获取有关在程序执行期间的各个点可以调用哪些函数的信息。收集到的信息由控制流图（CFG）表示，其中节点是程序的指令，边代表控制流。通过识别代码块和循环，CFG 成为编译器优化的起点。

### 数据流分析

主要入口：[数据流分析](https://en.wikipedia.org/wiki/Data-flow_analysis)
数据流分析是一种旨在收集有关程序每个点的值以及它们如何随时间变化的信息的技术。编译器经常使用这种技术来优化代码。
数据流分析最著名的例子之一是[污染检查](https://en.wikipedia.org/wiki/taint_checking)，它包括考虑包含用户提供的数据的所有变量，这些数据被认为是“污染的”，即不安全，并阻止这些变量在被清理之前被使用。此技术通常用于防止 [SQL 注入](https://en.wikipedia.org/wiki/SQL_injection) 攻击。污点检查可以静态或动态进行。

### 抽象解读

主条目：[摘要解读](https://en.wikipedia.org/wiki/Abstract_interpretation)
抽象解释允许提取有关程序可能执行的信息，而无需实际执行程序。
编译器可以使用此信息来寻找可能的优化或针对某些类别的错误来验证程序。

### 类型系统

主要条目：[类型系统](https://en.wikipedia.org/wiki/Type_system)
类型系统将类型与满足某些要求的程序关联起来。它们的目的是选择根据属性被认为正确的语言程序子集。

- [类型检查](https://en.wikipedia.org/wiki/Type_system#Type_checking) – 验证程序是否被类型系统接受。

类型检查在编程中用于限制编程对象的使用方式以及它们可以做什么。这是由编译器或[解释器](https://en.wikipedia.org/wiki/interpreter_(computing))完成的。类型检查还可以通过确保有符号值不会归因于无符号变量来帮助防止漏洞。
类型检查可以静态（在编译时）、动态（在运行时）或两者的组合进行。

静态类型信息（[推断](https://en.wikipedia.org/wiki/type_inference)，或由源代码中的类型注释显式提供）也可用于进行优化，例如用未装箱数组替换[装箱数组](https://en.wikipedia.org/wiki/boxed_type)。

### 效果系统

主要入口：[效果系统](https://en.wikipedia.org/wiki/Effect_system)
效果系统是旨在表示执行功能或方法可能产生的效果的正式系统。效果将正在执行的操作和正在执行的操作进行编码，通常分别称为“效果类型”和“效果区域”。

### 模型检验

主要入口：[模型检查](https://en.wikipedia.org/wiki/Model_checking)
模型检查是指严格、正式和自动化的方法来检查“模型”（在本上下文中指的是一段代码的正式模型，尽管在其他上下文中它可以是一段硬件的模型）是否符合给定的规范。由于代码固有的有限状态性质，并且规范和代码都可以转换为逻辑公式（https://en.wikipedia.org/wiki/ological_formula），因此可以使用有效的算法方法检查系统是否违反规范。

## 动态程序分析

主条目：[动态程序分析](https://en.wikipedia.org/wiki/Dynamic_program_analysis)
动态分析可以利用程序的运行时知识来提高分析的精度，同时还提供运行时保护，但它只能分析问题的单次执行，并且可能会因运行时检查而降低程序的性能。

### 测试

主要入口：[软件测试](https://en.wikipedia.org/wiki/Software_testing)
应对软件进行测试，以确保其质量，并以可靠的方式按预期运行，并且不会与可能与其一起运行的其他软件产生冲突。通过使用输入执行程序并评估其行为和产生的输出来执行测试。
即使没有指定安全要求，也应该执行额外的安全测试，以确保攻击者无法篡改软件并窃取信息、破坏软件的正常运行或将其用作攻击用户的枢纽。

### 监控

程序监控记录并记录有关程序的不同类型的信息，例如资源使用情况、事件和交互，以便可以对其进行审查以查找或查明异常行为的原因。此外，它还可用于执行安全审计。程序的自动监控有时被称为[运行时验证](https://en.wikipedia.org/wiki/runtime_verification)。

### 程序切片

主条目：[程序切片](https://en.wikipedia.org/wiki/Program_slicing)
对于程序行为的给定子集，程序切片包括将程序减少到仍产生所选行为的最小形式。简化后的程序称为“切片”，是指定行为子集域内原始程序的忠实表示。
通常，找到切片是一个无法解决的问题，但是通过一组变量的值指定目标行为子集，可以使用数据流算法获得近似切片。开发人员在调试过程中通常使用这些切片来定位错误源。

## 参见

- [自动代码审查](https://en.wikipedia.org/wiki/Automated_code_review)
- [基于语言的安全性](https://en.wikipedia.org/wiki/Language-based_security)
- [多方差](https://en.wikipedia.org/wiki/Polyvariance)
- [分析（计算机编程）](https://en.wikipedia.org/wiki/Profiling_(computer_programming))
- [程序验证](https://en.wikipedia.org/wiki/Program_verification)
- [终止分析](https://en.wikipedia.org/wiki/Termination_analysis)

## 参考

## 进一步阅读

- 动态程序切片
- 2009年第二届IEEE计算机科学与信息技术国际会议（2009）
- 程序分析原理（2005，[Springer Science+Business Media](https://en.wikipedia.org/wiki/Springer_Science%2BBusiness_Media)）

## 外部链接

-
