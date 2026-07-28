# 编译器

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Compiler)  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

关于：[翻译计算机语言的软件](https://en.wikipedia.org/wiki/software_to_translate_computer_languages)
编译

工具

在[计算](https://en.wikipedia.org/wiki/computing)中，**编译器**是[软件](https://en.wikipedia.org/wiki/software)，它将用一种[编程语言](https://en.wikipedia.org/wiki/programming_language)（*源*语言）编写的计算机代码[翻译](https://en.wikipedia.org/wiki/Translator_(computing))为另一种语言（*目标*语言）。 “编译器”这个名称主要用于将[源代码](https://en.wikipedia.org/wiki/source_code)从[高级编程语言](https://en.wikipedia.org/wiki/high-level_programming_language)翻译为[低级编程语言](https://en.wikipedia.org/wiki/low-level_programming_language)的程序(例如，[汇编语言]语言](https://en.wikipedia.org/wiki/assemble_language)、[目标代码](https://en.wikipedia.org/wiki/object_code)或[机器代码](https://en.wikipedia.org/wiki/machine_code))来创建[可执行文件](https://en.wikipedia.org/wiki/executable)程序。

有许多不同类型的编译器，它们以不同的有用形式生成输出。 *[交叉编译器](https://en.wikipedia.org/wiki/cross-compiler)*为与交叉编译器本身运行的不同的[中央处理单元](https://en.wikipedia.org/wiki/central_processing_unit) (CPU)或[操作系统](https://en.wikipedia.org/wiki/operating_system)生成代码。 *[引导编译器](https://en.wikipedia.org/wiki/bootstrap_compiler)*通常是一个临时编译器，用于为某种语言编译更永久或更好优化的编译器。

相关软件包括*[decompiler](https://en.wikipedia.org/wiki/decompiler)s*，从低级语言翻译为高级语言的程序；在高级语言之间进行翻译的程序，通常称为*[源到源编译器](https://en.wikipedia.org/wiki/source-to-source_compiler)s*或*transpilers*；语言*[重写器](https://en.wikipedia.org/wiki/Rewriting)s*，通常是在不改变语言的情况下翻译[表达式](https://en.wikipedia.org/wiki/Expression_(computer_science))形式的程序；和 *[compiler-compiler](https://en.wikipedia.org/wiki/compiler-compiler)s*，生成编译器（或其一部分）的编译器，通常以通用且可重用的方式生成许多不同的编译器。

编译器可能会执行以下部分或全部操作，通常称为阶段：[预处理](https://en.wikipedia.org/wiki/Preprocessor)、[词法分析](https://en.wikipedia.org/wiki/lexical_analysis)、[解析](https://en.wikipedia.org/wiki/parser)、[语义]分析](https://en.wikipedia.org/wiki/Semantic_analysis_(compilers)) ([语法定向翻译](https://en.wikipedia.org/wiki/syntax-directed_translation))，将[输入](https://en.wikipedia.org/wiki/Input%2Foutput)程序转换为[中间表示](https://en.wikipedia.org/wiki/intermediate_representation)， [代码优化](https://en.wikipedia.org/wiki/code_optimization)和[机器特定代码生成](https://en.wikipedia.org/wiki/Code_ Generation_(compiler))。编译器通常将这些阶段实现为模块化组件，从而促进源输入到目标输出的高效设计和正确性。由不正确的编译器行为引起的程序错误可能很难追踪和解决；因此，编译器实现者投入大量精力来确保[编译器的正确性](https://en.wikipedia.org/wiki/compiler_ Correctness)。

---

## 与口译员的比较

关于使源代码可运行，解释器提供了与编译器类似的功能，但通过不同的机制。解释器执行代码而不将其转换为机器代码。因此，一些解释器执行源代码，而另一些解释器则执行中间形式，例如[字节码](https://en.wikipedia.org/wiki/bytecode)。

编译为本机代码的程序往往比解释时运行得更快，而具有字节码中间形式的环境则倾向于中等速度。或者，[即时编译](https://en.wikipedia.org/wiki/just-in-time_compilation) 允许以一次性启动处理时间成本实现本机执行速度。

[低级编程语言](https://en.wikipedia.org/wiki/Low-level_programming_language)，例如[汇编](https://en.wikipedia.org/wiki/assemble_language)和[C](https://en.wikipedia.org/wiki/C_(programming_language))，通常是编译的，特别是当速度是一个重要问题时，而不是[跨平台](https://en.wikipedia.org/wiki/cross-platform) 支持。对于此类语言，源代码和生成的[机器代码](https://en.wikipedia.org/wiki/machine_code)之间存在更多的一一对应关系，使程序员更容易控制硬件的使用。

理论上，任何编程语言都可以通过编译器或解释器来使用，但实际上，语言往往只与其中一种一起使用。尽管如此，为通用解释语言编写编译器是可能的。例如，[Common Lisp](https://en.wikipedia.org/wiki/Common_Lisp)可以编译为Java字节码（然后由[Java虚拟机](https://en.wikipedia.org/wiki/Java_virtual_machine)解释）、C代码（然后可以再次编译为本机机器代码），或直接编译为本机代码。

## 历史

主要入口：[编译器构造的历史](https://en.wikipedia.org/wiki/History_of_compiler_construction)

科学家、数学家和工程师提出的理论计算概念构成了二战期间数字现代计算发展的基础。原始二进制语言的发展是因为数字设备只能理解 1 和 0 以及底层机器架构中的电路模式。 20 世纪 40 年代末，汇编语言的诞生是为了提供更可行的计算机体系结构抽象。早期计算机有限的[内存](https://en.wikipedia.org/wiki/main_memory)容量在设计第一个编译器时导致了巨大的技术挑战。因此，需要将编译过程分成几个小程序。前端程序产生后端程序用来生成目标代码的分析产品。随着计算机技术提供更多资源，编译器设计可以更好地与编译过程保持一致。

对于程序员来说，使用高级语言通常会更有效率，因此高级语言的发展自然地遵循了数字计算机提供的能力。高级语言是由构成高级语言架构的[语法](https://en.wikipedia.org/wiki/Syntax_(programming_languages))和[语义](https://en.wikipedia.org/wiki/Semantics_(programming_languages))严格定义的[形式语言](https://en.wikipedia.org/wiki/formal_language)。这些正式语言的元素包括：
- *字母表*，任何有限的符号集
- *String*，符号的有限序列
- *语言*，字母表上的任何字符串集

语言中的句子可以由一组称为语法的规则来定义。

[巴科斯-诺尔形式](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form) (BNF) 描述了语言“句子”的语法。它由 [John Backus](https://en.wikipedia.org/wiki/John_Backus) 开发，用于 [Algol 60](https://en.wikipedia.org/wiki/Algol_60) 的语法。这些想法源自语言学家 [Noam Chomsky](https://en.wikipedia.org/wiki/Noam_Chomsky) 的[上下文无关语法](https://en.wikipedia.org/wiki/context-free_grammar) 概念。 “BNF 及其[扩展](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_form) 已成为描述编程符号语法的标准工具。在许多情况下，部分编译器是根据 BNF 描述自动生成的。”

1942 年至 1945 年间，[Konrad Zuse](https://en.wikipedia.org/wiki/Konrad_Zuse) 为计算机设计了第一个（[算法](https://en.wikipedia.org/wiki/algorithm)ic）编程语言，名为 [Plankalkül](https://en.wikipedia.org/wiki/Plankalk%C3%BCl)（“计划微积分”）。 Zuse 还设想了一个 Planfertigungsgerät（“计划组装设备”），可以自动将程序的数学公式转换为机器可读的[打孔胶片](https://en.wikipedia.org/wiki/punched_film_stock)。虽然直到 20 世纪 70 年代才实现，但它提出了后来在 Ken Iverson 在 1950 年代末设计的 [APL](https://en.wikipedia.org/wiki/APL_(programming_language)) 中看到的概念。 APL 是一种数学计算语言。

1949年至1951年间，[Heinz Rutishauser](https://en.wikipedia.org/wiki/Heinz_Rutishauser)提出了[Superplan](https://en.wikipedia.org/wiki/Superplan)，一种高级语言和自动翻译器。他的想法后来被 [Friedrich L. Bauer](https://en.wikipedia.org/wiki/Friedrich_L._Bauer) 和 [Klaus Samelson](https://en.wikipedia.org/wiki/Klaus_Samelson) 完善。

数字计算形成时期的高级语言设计为各种应用提供了有用的编程工具：
- 用于工程和科学应用的 [FORTRAN](https://en.wikipedia.org/wiki/Fortran)（公式翻译）被认为是最早实现的高级语言和第一个优化编译器之一。
- [COBOL](https://en.wikipedia.org/wiki/COBOL)（通用面向业务的语言）从 [A-0](https://en.wikipedia.org/wiki/A-0_System) 和 [FLOW-MATIC](https://en.wikipedia.org/wiki/FLOW-MATIC) 演变而来，成为业务应用程序的主导高级语言。
- [LISP](https://en.wikipedia.org/wiki/Lisp_(programming_language))（列表处理器）用于符号计算。

编译器技术的发展源于数字计算机将高级源程序严格定义为低级目标程序的转换的需要。编译器可以被视为处理源代码分析的前端和将分析综合到目标代码中的后端。前端和后端之间的优化可以产生更高效的目标代码。

编译器技术发展的一些早期里程碑：
- *1952 年 5 月*：[Remington Rand](https://en.wikipedia.org/wiki/Remington_Rand) 的 [Grace Hopper](https://en.wikipedia.org/wiki/Grace_Hopper) 团队为 [A-0](https://en.wikipedia.org/wiki/A-0_System) 编程语言编写了编译器（并创造了术语“编译器”来描述它），尽管A-0 编译器的功能更像是加载器或链接器（https://en.wikipedia.org/wiki/Linker_(computing)），而不是完整编译器的现代概念。
- *1952 年，9 月之前*：由 [Alick Glennie](https://en.wikipedia.org/wiki/Alick_Glennie) 为曼彻斯特大学的 [Manchester Mark I](https://en.wikipedia.org/wiki/Manchester_Mark_I) 计算机开发的 [Autocode](https://en.wikipedia.org/wiki/Autocode) 编译器被一些人认为是第一个编译型编程语言。
- *1954–1957*：[IBM](https://en.wikipedia.org/wiki/IBM) 的 [John Backus](https://en.wikipedia.org/wiki/John_Backus) 领导的团队开发了 [FORTRAN](https://en.wikipedia.org/wiki/Fortran)，通常被认为是第一种高级语言。 1957 年，他们完成了 FORTRAN 编译器，该编译器通常被认为是引入了第一个明确完整的编译器。
- *1959*：数据系统语言会议 (CODASYL) 发起了 [COBOL](https://en.wikipedia.org/wiki/COBOL) 的开发。 COBOL 设计借鉴了 A-0 和 FLOW-MATIC。到 20 世纪 60 年代初，COBOL 已在多种架构上编译。
- *1958–1960*：[ALGOL 58](https://en.wikipedia.org/wiki/ALGOL_58) 是 [ALGOL 60](https://en.wikipedia.org/wiki/ALGOL_60) 的前身。它引入了[代码块](https://en.wikipedia.org/wiki/Block_(programming))，这是[结构化编程](https://en.wikipedia.org/wiki/structed_programming)兴起的一个关键进步。 ALGOL 60 是第一种使用[词法范围](https://en.wikipedia.org/wiki/lexical_scope)实现[嵌套函数](https://en.wikipedia.org/wiki/nested_function)定义的语言。它包括[递归](https://en.wikipedia.org/wiki/recursion)。它的语法是使用 [BNF](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form) 定义的。 ALGOL 60 启发了许多随后的语言。 [托尼·霍尔](https://en.wikipedia.org/wiki/Tony_Hoare) 评论道：“……这不仅是对其前辈的改进，也是对几乎所有后继者的改进。”
- *1958–1962*：[John McCarthy](https://en.wikipedia.org/wiki/John_McCarthy_(computer_scientist)) 在 [MIT](https://en.wikipedia.org/wiki/MIT) 设计了 ​​[LISP](https://en.wikipedia.org/wiki/Lisp_(programming_language))。符号处理能力为人工智能研究提供了有用的功能。 1962 年，LISP 1.5 版本引入了一些工具：由 Stephen Russell 和 Daniel J. Edwards 编写的解释器，由 Tim Hart 和 Mike Levin 编写的编译器和汇编器。

早期的操作系统和软件是用汇编语言编写的。在 20 世纪 60 年代和 70 年代初期，由于资源限制，使用高级语言进行系统编程仍然存在争议。然而，一些研究和行业努力开始转向高级系统编程语言，例如 [BCPL](https://en.wikipedia.org/wiki/BCPL)、[BLISS](https://en.wikipedia.org/wiki/BLISS)、[B](https://en.wikipedia.org/wiki/B_(programming_language)) 和 [C](https://en.wikipedia.org/wiki/C_(programming_language))。

[BCPL](https://en.wikipedia.org/wiki/BCPL)（基本组合编程语言）由[Martin Richards](https://en.wikipedia.org/wiki/Martin_Richards_(computer_scientist))于1966年在[剑桥大学](https://en.wikipedia.org/wiki/University_of_Cambridge)设计，最初是作为编译器编写工具开发的。已经实现了几种编译器，理查兹的书提供了对该语言及其编译器的见解。 BCPL不仅是一种有影响力的系统编程语言，至今仍在研究中使用，而且为B和C语言的设计提供了基础。

[BLISS](https://en.wikipedia.org/wiki/BLISS)（系统软件实现的基本语言）是由 W. A. Wulf 的卡内基梅隆大学 (CMU) 研究团队为 Digital Equipment Corporation (DEC) PDP-10 计算机开发的。一年后的 1970 年，CMU 团队继续开发 BLISS-11 编译器。

[Multics](https://en.wikipedia.org/wiki/Multics)（多路信息和计算服务），一个分时操作系统项目，涉及[MIT](https://en.wikipedia.org/wiki/MIT)、[贝尔实验室](https://en.wikipedia.org/wiki/Bell_Labs)、[通用电气](https://en.wikipedia.org/wiki/General_Electric)（稍后[Honeywell](https://en.wikipedia.org/wiki/Honeywell))，由麻省理工学院的 [Fernando Corbató](https://en.wikipedia.org/wiki/Fernando_J._Corbat%C3%B3) 领导。 Multics 是用 IBM 和 IBM 用户组开发的 [PL/I](https://en.wikipedia.org/wiki/PL%2FI) 语言编写的。 IBM 的目标是满足商业、科学和系统编程需求。还可以考虑其他语言，但 PL/I 提供了最完整的解决方案，尽管它尚未实现。在 Multics 项目的最初几年，贝尔实验室的 Doug McIlory 和 Bob Morris 可以使用 Early PL/I (EPL) 编译器将该语言的一个子集编译为汇编语言。 EPL 支持该项目，直至开发出完整 PL/I 的引导编译器。

贝尔实验室于 1969 年退出 Multics 项目，并基于 BCPL 概念开发了一种系统编程语言 [B](https://en.wikipedia.org/wiki/B_(programming_language))，由 [Dennis Ritchie](https://en.wikipedia.org/wiki/Dennis_Ritchie) 和 [Ken Thompson](https://en.wikipedia.org/wiki/Ken_Thompson) 编写。 Ritchie 为 B 创建了一个引导编译器，并为 B 中的 PDP-7 编写了 [Unics](https://en.wikipedia.org/wiki/Unix)（统一信息和计算服务）操作系统。Unics 最终拼写为 Unix。

贝尔实验室基于B和BCPL开始了[C](https://en.wikipedia.org/wiki/C_(programming_language))的开发和扩展。 BCPL 编译器已由贝尔实验室转移到 Multics，并且 BCPL 是贝尔实验室的首选语言。最初，在开发 C 编译器的同时，使用了贝尔实验室 B 编译器的前端程序。 1971 年，新的 PDP-11 提供了定义 B 扩展并重写编译器的资源。到 1973 年，C 语言的设计基本完成，PDP-11 的 Unix 内核也用 C 重写。Steve Johnson 开始开发可移植 C 编译器 (PCC)，以支持 C 编译器重新定位到新机器。

[面向对象编程](https://en.wikipedia.org/wiki/Object-oriented_programming) (OOP) 为应用程序开发和维护提供了一些有趣的可能性。 OOP 概念可以追溯到更早的时候，但它们是 [LISP](https://en.wikipedia.org/wiki/Lisp_(programming_language)) 和 [Simula](https://en.wikipedia.org/wiki/Simula) 语言科学的一部分。随着 [C++](https://en.wikipedia.org/wiki/C%2B%2B) 的开发，贝尔实验室对 OOP 产生了兴趣。 C++ 于 1980 年首次用于系统编程。最初的设计利用了 C 语言系统编程能力和 Simula 概念。 1983 年添加了面向对象的设施。Cfront 程序为 C84 语言编译器实现了 C++ 前端。在随后的几年中，随着 C++ 的流行，一些 C++ 编译器被开发出来。

在许多应用领域，使用高级语言的想法很快就流行起来。由于更新的编程语言支持的扩展功能以及计算机体系结构日益复杂，编译器变得更加复杂。

[DARPA](https://en.wikipedia.org/wiki/DARPA)（国防高级研究计划局）于 1970 年与 Wulf 的 CMU 研究团队赞助了一个编译器项目。生产质量编译器-编译器 [PQCC](https://en.wikipedia.org/wiki/PQCC) 设计将根据源语言和目标的正式定义生成生产质量编译器 (PQC)。 PQCC 试图将编译器-编译器这一术语扩展到解析器生成器的传统含义之外（例如，[Yacc](https://en.wikipedia.org/wiki/Yacc)），但没有取得太大成功。 PQCC 可能更准确地称为编译器生成器。

PQCC 对代码生成过程的研究旨在构建一个真正的自动编译器编写系统。这项工作发现并设计了 PQC 的相结构。 BLISS-11 编译器提供了初始结构。这些阶段包括分析（前端）、到虚拟机的中间转换（中端）以及到目标的转换（后端）。 TCOL 是为 PQCC 研究而开发的，用于处理中间表示中的语言特定结构。 TCOL 的变体支持多种语言。 PQCC 项目研究了自动编译器构建技术。事实证明，这些设计概念对于优化编译器和（自 1995 年以来，面向对象的）编程语言 [Ada](https://en.wikipedia.org/wiki/Ada_(programming_language)) 的编译器非常有用。

Ada *STONEMAN* 文档Stoneman 形式化了程序支持环境 (APSE) 以及内核 (KAPSE) 和最小化 (MAPSE)。 NYU/ED 的 Ada 翻译支持美国国家标准协会 (ANSI) 和国际标准组织 (ISO) 的开发和标准化工作。美国军方最初开发的 Ada 编译器包括按照 *STONEMAN* 文档的方式将编译器置于完整的集成设计环境中。陆军和海军致力于针对 DEC/VAX 架构的 Ada 语言系统 (ALS) 项目，而空军则开始针对 IBM 370 系列的 Ada 集成环境 (AIE) 项目。虽然这些项目没有提供预期的结果，但它们确实为 Ada 开发的整体努力做出了贡献。

英国的[约克大学](https://en.wikipedia.org/wiki/University_of_York) 和德国的[卡尔斯鲁厄大学](https://en.wikipedia.org/wiki/Karlsruhe_Institute_of_Technology) 也在开展其他 Ada 编译器工作。在美国，Verdix（后来被 Rational 收购）向陆军提供了 Verdix Ada 开发系统 (VADS)。 VADS提供了一套开发工具，包括编译器。 Unix/VADS 可以托管在各种 Unix 平台上，例如 DEC Ultrix 和 Sun 3/60 [Solaris](https://en.wikipedia.org/wiki/Oracle_Solaris)，目标是陆军 CECOM 评估中的 [Motorola 68020](https://en.wikipedia.org/wiki/Motorola_68020)。很快就有许多通过 Ada 验证测试的 Ada 编译器可用。自由软件基金会 GNU 项目开发了 [GNU 编译器集合](https://en.wikipedia.org/wiki/GNU_Compiler_Collection) (GCC)，它提供了支持多种语言和目标的核心功能。 Ada 版本 [GNAT](https://en.wikipedia.org/wiki/GNAT) 是最广泛使用的 Ada 编译器之一。 GNAT是免费的，但也有商业支持，例如AdaCore，成立于1994年，为Ada提供商业软件解决方案。 GNAT Pro 包括基于 GNU GCC 的 GNAT 和工具套件，可提供[集成开发环境](https://en.wikipedia.org/wiki/integrated_development_environment)。

高级语言继续推动编译器的研究和开发。重点领域包括优化和自动代码生成。编程语言和开发环境的趋势影响了编译器技术。更多的编译器被包含在语言发行版（PERL、Java Development Kit）中并作为 IDE（VADS、Eclipse、Ada Pro）的组件。技术之间的相互关系和相互依赖性不断增强。 Web 服务的出现促进了 Web 语言和脚本语言的发展。脚本可以追溯到命令行界面 (CLI) 的早期，用户可以在其中输入要由系统执行的命令。用户 Shell 概念是用编写 shell 程序的语言开发的。早期的 Windows 设计提供了简单的批处理编程功能。这些语言的传统转换使用了解释器。虽然没有广泛使用，但 Bash 和 Batch 编译器已经被编写出来。最近，复杂的解释语言成为开发人员工具包的一部分。现代脚本语言包括 PHP、Python、Ruby 和 Lua。 （Lua 广泛应用于游戏开发中。）所有这些都有解释器和编译器支持。

“当编译领域在 50 年代末开始出现时，其重点仅限于将高级语言程序翻译为机器代码......编译器领域越来越多地与其他学科交织在一起，包括计算机体系结构、编程语言、形式方法、软件工程和计算机安全。” 《编译器研究：未来 50 年》一文指出了面向对象语言和 Java 的重要性。安全和[并行计算](https://en.wikipedia.org/wiki/parallel_computing)被列为未来的研究目标。

## 编译器构建

主要入口：[编程语言设计与实现](https://en.wikipedia.org/wiki/Programming_language_design_and_implementation)
部分
编译器实现从高级源程序到低级目标程序的形式转换。编译器设计可以定义端到端解决方案或处理与其他编译工具（例如预处理器、汇编器、链接器）接口的已定义子集。设计要求包括编译器组件之间的内部接口和支持工具集之间的外部接口的严格定义。

早期，编译器设计所采用的方法直接受到要处理的计算机语言的复杂性、设计人员的经验以及可用资源的影响。资源限制导致需要多次遍历源代码。

由一个人编写的相对简单语言的编译器可能是一个单一的、整体的软件。然而，随着源语言复杂性的增加，设计可能会分为许多相互依赖的阶段。单独的阶段提供了设计改进，将开发重点放在编译过程中的功能上。

### 单遍编译器与多遍编译器

按传递次数对编译器进行分类的背景是计算机的硬件资源限制。编译涉及执行大量工作，而早期的计算机没有足够的内存来容纳完成所有这些工作的程序。结果，编译器被分成更小的程序，每个程序都会遍历源代码（或其某种表示形式），执行一些所需的分析和翻译。

单遍编译的能力通常被视为一种好处，因为它简化了编写编译器的工作，而且单遍编译器通常比多遍编译器更快地编译源代码。因此，部分由于早期系统的资源限制，许多早期语言经过专门设计，以便可以一次性编译（例如，[Pascal](https://en.wikipedia.org/wiki/Pascal_(programming_language))）。

在某些情况下，语言功能的设计可能需要编译器对源代码执行多次传递。例如，考虑出现在源文件第 20 行的声明，它影响出现在第 10 行的语句的翻译。在这种情况下，第一遍需要收集有关在它们影响的语句之后出现的声明的信息，然后在后续遍中执行翻译。

单次编译的缺点是无法执行生成高质量代码所需的许多复杂的优化。准确计算优化编译器进行了多少遍可能很困难。例如，优化的不同阶段可能会多次分析一个表达式，但仅分析另一个表达式一次。

将编译器拆分成小程序是对生成可证明正确的编译器感兴趣的研究人员使用的一种技术。证明一组小程序的正确性通常比证明一个更大的、单一的、等效程序的正确性需要更少的工作。

### 三阶段编译器结构

无论编译器设计中的阶段的确切数量如何，这些阶段都可以分配给三个阶段之一。这些阶段包括前端、中端和后端。
- *前端*扫描输入并根据特定源语言验证语法和语义。对于[静态类型语言](https://en.wikipedia.org/wiki/Type_system)，它通过收集类型信息来执行[类型检查](https://en.wikipedia.org/wiki/type_checking)。如果输入程序在语法上不正确或存在类型错误，它会生成错误和/或警告消息，通常会标识源代码中检测到问题的位置；在某些情况下，错误可能出现在程序中（远远）较早的地方。前端方面包括词法分析、语法分析、语义分析。前端将输入程序转换为中间表示（IR），以供中端进一步处理。该 IR 通常是程序相对于源代码的较低级别表示。
- *中间端* 对 IR 执行优化，独立于目标 CPU 架构。这种源代码/机器代码独立性旨在使通用优化能够在支持不同语言和目标处理器的编译器版本之间共享。中端优化的示例包括删除无用的（[死代码消除](https://en.wikipedia.org/wiki/dead-code_elimination)）或无法访问的代码（[可达性分析](https://en.wikipedia.org/wiki/reachability_analysis)）、发现和传播常量值（[常量传播](https://en.wikipedia.org/wiki/constant_propagation)）、将计算重新定位到执行频率较低的位置（例如，跳出循环），或基于上下文的专门化计算，最终生成后端使用的“优化”IR。
- *后端*从中间端获取优化的IR。它可以执行更多针对目标 CPU 架构的分析、转换和优化。后端生成与目标相关的汇编代码，并在此过程中执行寄存器分配。后端执行指令调度，它通过填充延迟槽来重新排序指令以保持并行执行单元繁忙。尽管大多数优化问题都是[NP-hard](https://en.wikipedia.org/wiki/NP-hardness)，但解决这些问题的[启发式](https://en.wikipedia.org/wiki/Heuristic_(computer_science))技术已经在生产质量编译器中得到了很好的开发和实现。通常，后端的输出是专门用于特定处理器和操作系统的机器代码。

这种前/中/后端方法使得可以将不同语言的前端与不同[CPU](https://en.wikipedia.org/wiki/Central_processing_unit)的后端结合起来，同时共享中端的优化。这种方法的实际示例是 [GNU Compiler Collection](https://en.wikipedia.org/wiki/GNU_Compiler_Collection)、[Clang](https://en.wikipedia.org/wiki/Clang)（[LLVM](https://en.wikipedia.org/wiki/LLVM)-基于 C/C++ 编译器）和 [Amsterdam Compiler] Kit](https://en.wikipedia.org/wiki/Amsterdam_Compiler_Kit)，它具有多个前端、共享优化和多个后端。

#### 前端

以及 [C](https://en.wikipedia.org/wiki/C_(programming_language)) 的 [解析器](https://en.wikipedia.org/wiki/Parsing) 示例。从字符序列“if(net>0.0)total+=net*(1.0+tax/100.0);”开始，扫描器组成一系列[标记](https://en.wikipedia.org/wiki/Lexical_analysis#token)，并对每个标记进行分类，例如#600000、#606000、#006000或#000060。后一个序列由解析器转换为语法树（https://en.wikipedia.org/wiki/abstract_syntax_tree），然后由剩余的编译器阶段处理。扫描器和解析器分别处理[C语法](https://en.wikipedia.org/wiki/C_syntax)的[常规](https://en.wikipedia.org/wiki/regular_grammar)和正确的[上下文无关](https://en.wikipedia.org/wiki/context-free_grammar)部分。]]

前端分析源代码以构建程序的内部表示，称为[中间表示](https://en.wikipedia.org/wiki/intermediate_representation) (IR)。它还管理[符号表](https://en.wikipedia.org/wiki/symbol_table)，这是一种将源代码中的每个符号映射到相关信息（例如位置、类型和范围）的数据结构。

虽然前端可以是单个整体函数或程序，如在无扫描器解析器中，但传统上它是作为多个阶段来实现和分析的，这些阶段可以顺序或同时执行。这种方法因其模块化和[关注点分离](https://en.wikipedia.org/wiki/separation_of_concerns)而受到青睐。最常见的是，前端分为三个阶段：[词法分析](https://en.wikipedia.org/wiki/lexical_analysis)（也称为词法分析或扫描）、[语法分析](https://en.wikipedia.org/wiki/syntax_analysis)（也称为扫描或解析）和[语义分析](https://en.wikipedia.org/wiki/Semantic_analysis_(compilers))。词法分析和解析包括句法分析（分别是单词语法和短语语法），在简单的情况下，这些模块（词法分析器和解析器）可以从语言的语法自动生成，但在更复杂的情况下，这些模块需要手动修改。词汇语法和短语语法通常是上下文无关语法，这大大简化了分析，并且在语义分析阶段处理了上下文敏感性。语义分析阶段通常更复杂并且是手工编写的，但可以使用[属性语法](https://en.wikipedia.org/wiki/attribute_grammar)部分或完全自动化。这些阶段本身可以进一步细分：词法分析为扫描和评估，解析为构建[具体语法树](https://en.wikipedia.org/wiki/Parse_tree)（CST，解析树），然后将其转换为[抽象语法树](https://en.wikipedia.org/wiki/abstract_syntax_tree)（AST，语法树）。在某些情况下，会使用额外的阶段，特别是“线重建”和“预处理”，但这种情况很少见。

前端的主要阶段包括以下几个阶段：
- *行重建* 将输入字符序列转换为可供解析器使用的规范形式。 [strop](https://en.wikipedia.org/wiki/stropping_(syntax)) 其关键字或允许标识符中存在任意空格的语言需要此阶段。 20 世纪 60 年代使用的[自上而下](https://en.wikipedia.org/wiki/top-down_parsing)、[递归下降](https://en.wikipedia.org/wiki/recursive_descent_parser)、表驱动解析器通常一次读取一个字符，不需要单独的标记化阶段。 [Atlas Autocode](https://en.wikipedia.org/wiki/Atlas_Autocode) 和 [Imp](https://en.wikipedia.org/wiki/Edinburgh_IMP)（以及 [ALGOL](https://en.wikipedia.org/wiki/ALGOL) 和 [Coral 66](https://en.wikipedia.org/wiki/Coral_66) 的一些实现）是 stropped 语言的示例，其编译器将有一个“行重建”阶段。
- *[预处理](https://en.wikipedia.org/wiki/Preprocessor)*支持[宏](https://en.wikipedia.org/wiki/Macro_(computer_science))替换和[条件编译](https://en.wikipedia.org/wiki/conditional_compilation)。通常，预处理阶段发生在句法或语义分析之前；例如，在 C 的情况下，预处理器操作词汇标记而不是句法形式。但是，某些语言（例如 [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language))）支持基于语法形式的宏替换。
- *[词法分析](https://en.wikipedia.org/wiki/Lexical_analysis)*（也称为*词法分析*或*标记化*）将源代码文本分解为一系列称为*词法标记*的小片段。这个阶段可以分为两个阶段：*扫描*，将输入文本分割成称为*词位*的句法单元，并为它们分配一个类别；和*评估*，它将词素转换为处理后的值。令牌是由*令牌名称*和可选的*令牌值*组成的对。常见的标记类别可能包括标识符、关键字、分隔符、运算符、文字和注释，尽管标记类别集在不同的[编程语言](https://en.wikipedia.org/wiki/programming_language)中有所不同。词位语法通常是[正则语言](https://en.wikipedia.org/wiki/regular_language)，因此可以使用从[正则表达式](https://en.wikipedia.org/wiki/regular_expression)构造的[有限状态自动机](https://en.wikipedia.org/wiki/finite-state_automaton)来识别它。进行词法分析的软件称为[词法分析器](https://en.wikipedia.org/wiki/lexical_analyzer)。这可能不是一个单独的步骤 - 它可以与无扫描解析中的解析步骤结合起来，在这种情况下，解析是在字符级别而不是令牌级别完成的。
- *[语法分析](https://en.wikipedia.org/wiki/Syntax_analysis)*（也称为*解析*）涉及[解析](https://en.wikipedia.org/wiki/parsing)标记序列以识别程序的语法结构。此阶段通常构建一个[解析树](https://en.wikipedia.org/wiki/parse_tree)，它将标记的线性序列替换为根据[正式语法](https://en.wikipedia.org/wiki/formal_grammar)定义语言语法的规则构建的树结构。解析树通常由编译器的后续阶段进行分析、扩充和转换。
- *[语义分析](https://en.wikipedia.org/wiki/Semantic_analysis_(compilers))*将语义信息添加到[解析树](https://en.wikipedia.org/wiki/parse_tree)并构建[符号表](https://en.wikipedia.org/wiki/symbol_table)。此阶段执行语义检查，例如[类型检查](https://en.wikipedia.org/wiki/type_checking)（检查类型错误）或[对象绑定](https://en.wikipedia.org/wiki/object_binding)（将变量和函数引用与其定义相关联）或[明确赋值](https://en.wikipedia.org/wiki/definite_assignment_analysis)（要求所有局部变量在使用前初始化），拒绝不正确的程序或发出警告。语义分析通常需要一个完整的解析树，这意味着该阶段逻辑上位于[解析](https://en.wikipedia.org/wiki/parsing)阶段之后，并且逻辑上位于[代码生成](https://en.wikipedia.org/wiki/code_ Generation_(compiler))阶段之前，尽管通常可以将多个阶段折叠为编译器实现中代码的一次传递。

#### 中端

中间端也称为*优化器*，对中间表示执行优化，以提高生成的机器代码的性能和质量。中端包含那些独立于目标 CPU 架构的优化。

中端的主要阶段包括以下几个阶段：
- [分析](https://en.wikipedia.org/wiki/Compiler_analysis)：这是从输入的中间表示中收集程序信息； [数据流分析](https://en.wikipedia.org/wiki/data-flow_analysis)用于构建[use-define链](https://en.wikipedia.org/wiki/use-define_chain)，以及[依赖分析](https://en.wikipedia.org/wiki/dependence_analysis)、[别名分析](https://en.wikipedia.org/wiki/alias_analysis)、[指针准确的分析是任何编译器优化的基础。每个编译函数的控制流图和程序的调用图通常也在分析阶段构建。
- [优化](https://en.wikipedia.org/wiki/Compiler_optimization)：中间语言表示被转换为功能等效但更快（或更小）的形式。流行的优化有[内联扩展](https://en.wikipedia.org/wiki/inline_expansion)、[死代码消除](https://en.wikipedia.org/wiki/dead-code_elimination)、[常量传播](https://en.wikipedia.org/wiki/constant_propagation)、[循环转换](https://en.wikipedia.org/wiki/loop_transformation)甚至[自动并行化](https://en.wikipedia.org/wiki/automatic_parallelization)。
编译器分析是任何编译器优化的先决条件，并且它们紧密地协同工作。例如，[依赖分析](https://en.wikipedia.org/wiki/dependence_analysis)对于[循环转换](https://en.wikipedia.org/wiki/loop_transformation)至关重要。

编译器分析和优化的范围差异很大；它们的范围可能从在一个[基本块](https://en.wikipedia.org/wiki/basic_block)内运行，到整个过程，甚至整个程序。优化的粒度和编译成本之间需要权衡。例如，[窥孔优化](https://en.wikipedia.org/wiki/peephole_optimization)在编译期间执行速度很快，但只影响代码的一小部分本地片段，并且可以独立于代码片段出现的上下文来执行。相比之下，[过程间优化](https://en.wikipedia.org/wiki/interprocedural_optimization)需要更多的编译时间和内存空间，但只有同时考虑多个函数的行为才能实现优化。

过程间分析和优化在 [HP](https://en.wikipedia.org/wiki/Hewlett-Packard)、[IBM](https://en.wikipedia.org/wiki/IBM)、[SGI](https://en.wikipedia.org/wiki/Silicon_Graphics)、[Intel](https://en.wikipedia.org/wiki/Intel)、 [Microsoft](https://en.wikipedia.org/wiki/Microsoft) 和 [Sun Microsystems](https://en.wikipedia.org/wiki/Sun_Microsystems)。 [自由软件](https://en.wikipedia.org/wiki/free_software)[GCC](https://en.wikipedia.org/wiki/GNU_Compiler_Collection)长期以来因缺乏强大的过程间优化而受到批评，但它在这方面正在发生变化。另一个具有完整分析和优化基础设施的开源编译器是[Open64](https://en.wikipedia.org/wiki/Open64)，许多组织将其用于研究和商业目的。

由于编译器分析和优化需要额外的时间和空间，一些编译器默认会跳过它们。用户必须使用编译选项来明确告诉编译器应该启用哪些优化。

#### 后端

后端负责 CPU 架构特定的优化和[代码生成](https://en.wikipedia.org/wiki/code_ Generation_(compiler))。

后端的主要阶段包括以下几个阶段：
- *机器相关优化*：取决于编译器所针对的 CPU 架构细节的优化。一个突出的例子是窥孔优化，它将短的汇编指令序列重写为更高效的指令。
- *[代码生成](https://en.wikipedia.org/wiki/Code_ Generation_(compiler))*：转换后的中间语言被翻译成输出语言，通常是系统的本机[机器语言](https://en.wikipedia.org/wiki/machine_language)。这涉及资源和存储决策，例如决定哪些变量适合寄存器和内存，以及适当机器指令的选择和调度以及相关的寻址模式](https://en.wikipedia.org/wiki/addressing_mode)（另请参阅[Sethi–Ullman 算法](https://en.wikipedia.org/wiki/Sethi%E2%80%93Ullman_algorithm)）。可能还需要生成调试数据以促进[调试](https://en.wikipedia.org/wiki/debugging)。

### 编译器正确性

主条目：[编译器正确性](https://en.wikipedia.org/wiki/Compiler_ Correctness)
[编译器正确性](https://en.wikipedia.org/wiki/Compiler_ Correctness) 是软件工程的一个分支，致力于证明编译器的行为符合其[语言规范](https://en.wikipedia.org/wiki/programming_language)。技术包括使用[正式方法](https://en.wikipedia.org/wiki/formal_methods)开发编译器以及对现有编译器进行严格测试（通常称为编译器验证）。

## 相对于解释语言的编译

高级编程语言通常会考虑到一种[翻译](https://en.wikipedia.org/wiki/Translator_(computing))类型：设计为[编译语言](https://en.wikipedia.org/wiki/compiled_language)或[解释语言](https://en.wikipedia.org/wiki/interpreted_language)。然而，在实践中，尽管可以设计依赖于运行时重新解释的语言，但很少有语言“要求”它被专门编译或专门解释。分类通常反映一种语言最流行或最广泛的实现。例如，[BASIC](https://en.wikipedia.org/wiki/BASIC)有时被称为解释语言，而 C 被称为编译语言，尽管存在 BASIC 编译器和 C 解释器。

解释并不能完全取代编译。它只是向用户隐藏它并使其渐进。尽管解释器本身可以被解释，但执行堆栈底部的某个位置需要一组直接执行的机器指令（请参阅[机器语言](https://en.wikipedia.org/wiki/machine_language)）。

此外，为了优化，编译器可以包含解释器功能，并且解释器可以包括提前编译技术。例如，如果可以在编译期间执行表达式并将结果插入到输出程序中，则可以避免每次程序运行时都必须重新计算，这可以大大加快最终程序的速度。 [即时编译](https://en.wikipedia.org/wiki/just-in-time_compilation)和[字节码解释](https://en.wikipedia.org/wiki/bytecode)的现代趋势有时会进一步模糊编译器和解释器的传统分类。 [Meta-tracing](https://en.wikipedia.org/wiki/Meta-tracing) 是一种自动编译器合成方法，它更进一步，可用于从语言解释器合成编译器。

一些语言规范阐明实现*必须*包括编译工具；例如，[Common Lisp](https://en.wikipedia.org/wiki/Common_Lisp)。然而，Common Lisp 的定义中并没有任何固有的东西可以阻止它被解释。其他语言的功能很容易在解释器中实现，但使编写编译器变得更加困难；例如，[APL](https://en.wikipedia.org/wiki/APL_(programming_language))、[SNOBOL4](https://en.wikipedia.org/wiki/SNOBOL4)和许多脚本语言允许程序在运行时使用常规字符串操作构造任意源代码，然后通过将其传递给特殊的[评估函数](https://en.wikipedia.org/wiki/eval)来执行该代码。要以编译语言实现这些功能，程序通常必须附带一个包含编译器本身版本的[运行时库](https://en.wikipedia.org/wiki/runtime_library)。

## 类型

编译器的一种分类是根据其生成的代码执行的平台来分类的。这称为*目标平台。*

“本机”或“托管”编译器是一种其输出旨在直接在编译器本身运行的相同类型的计算机和操作系统上运行的编译器。 [交叉编译器](https://en.wikipedia.org/wiki/cross_compiler)的输出被设计为在不同的平台上运行。在为不支持软件开发环境的嵌入式系统（https://en.wikipedia.org/wiki/embedded_system）开发软件时，通常会使用交叉编译器。

为虚拟机（VM）生成代码的编译器的输出可能会也可能不会在与生成它的编译器相同的平台上执行。因此，此类编译器通常不被归类为本机编译器或交叉编译器。

作为编译器目标的较低级语言本身可能是[高级编程语言](https://en.wikipedia.org/wiki/high-level_programming_language)。 C 被一些人视为一种可移植的汇编语言，通常是此类编译器的目标语言。例如，[Cfront](https://en.wikipedia.org/wiki/Cfront)，[C++](https://en.wikipedia.org/wiki/C%2B%2B)的原始编译器，使用C作为其目标语言。这种编译器生成的 C 代码通常不适合人类阅读和维护，因此[缩进样式](https://en.wikipedia.org/wiki/indent_style) 和创建漂亮的 C 中间代码被忽略。 C 使其成为良好目标语言的一些功能包括 [#line](https://en.wikipedia.org/wiki/C_preprocessor#Special_macros_and_directives) 指令，该指令可由编译器生成以支持原始源代码的[调试](https://en.wikipedia.org/wiki/debugging)，以及 C 编译器提供的广泛平台支持。

虽然常见的编译器类型输出机器代码，但还有许多其他类型：
- [源到源编译器](https://en.wikipedia.org/wiki/Source-to-source_compiler)是一种以高级语言作为输入并输出高级语言的编译器。例如，[自动并行化](https://en.wikipedia.org/wiki/Automatic_parallelization)编译器经常将高级语言程序作为输入，然后转换代码并使用并行代码注释（例如，[OpenMP](https://en.wikipedia.org/wiki/OpenMP)）或语言结构（例如，Fortran 的 DOALL 语句）对其进行注释。源到源编译器的其他术语是转编译器或转译器。
- [Bytecode](https://en.wikipedia.org/wiki/Bytecode)编译器编译为理论机器的汇编语言，就像一些[Prolog](https://en.wikipedia.org/wiki/Prolog)实现
  - 此 Prolog 机器也称为 [Warren Abstract Machine](https://en.wikipedia.org/wiki/Warren_Abstract_Machine)（或 WAM）。
- [Java](https://en.wikipedia.org/wiki/Java_(programming_language))、[Python](https://en.wikipedia.org/wiki/Python_(programming_language)) 的字节码编译器也是此类别的示例。
- [即时编译器](https://en.wikipedia.org/wiki/Just-in-time_compilation)（JIT 编译器）将编译推迟到运行时。许多现代语言都存在 JIT 编译器，包括 [Python](https://en.wikipedia.org/wiki/Python_(programming_language))、[JavaScript](https://en.wikipedia.org/wiki/JavaScript)、[Smalltalk](https://en.wikipedia.org/wiki/Smalltalk)、[Java](https://en.wikipedia.org/wiki/Java_(programming_language))、 [.NET](https://en.wikipedia.org/wiki/.NET) 的[通用中间语言](https://en.wikipedia.org/wiki/Common_Intermediate_Language) (CIL)，最初在 Microsoft [.NET Framework](https://en.wikipedia.org/wiki/.NET_Framework) 等中。 JIT 编译器通常在解释器内运行。当解释器检测到代码路径“热”（意味着它被频繁执行）时，将调用 JIT 编译器并编译“热”代码以提高性能。
- 对于某些语言（例如 Java），应用程序首先使用字节码编译器进行编译，并以独立于机器的[中间表示](https://en.wikipedia.org/wiki/intermediate_representation) 的形式交付。字节码解释器执行字节码，但当需要提高性能时，JIT 编译器会将字节码转换为机器代码。
- [硬件编译器](https://en.wikipedia.org/wiki/silicon_compiler)（也称为综合工具）是一种编译器，其输入是[硬件描述语言](https://en.wikipedia.org/wiki/hardware_description_language)，输出是[网表](https://en.wikipedia.org/wiki/netlist)或其他硬件配置形式的描述。
- 这些编译器的输出以非常低的级别为目标[计算机硬件](https://en.wikipedia.org/wiki/computer_hardware)，例如[现场可编程门阵列](https://en.wikipedia.org/wiki/field-programmable_gate_array) (FPGA)或结构化[特定应用集成电路](https://en.wikipedia.org/wiki/application-specific_integrated_ Circuit) (ASIC)。此类编译器被称为硬件编译器，因为它们编译的源代码有效地控制了硬件的最终配置及其运行方式。编译的输出只是[晶体管](https://en.wikipedia.org/wiki/transistor)或[查找表](https://en.wikipedia.org/wiki/lookup_table)的互连。
- 硬件编译器的一个示例是 XST，即用于配置 FPGA 的 Xilinx 综合工具。 Altera、Synplicity、Synopsys 和其他硬件供应商也提供类似的工具。
  - 研究系统将高级串行语言（例如 Python 或 C++）的子集直接编译为并行数字逻辑。对于函数式语言或多范式语言的函数子集来说，这通常更容易做到。
- 从低级语言翻译为高级语言的程序是[反编译器](https://en.wikipedia.org/wiki/decompiler)。
- 转换为编译机不支持的目标代码格式的程序称为[交叉编译器](https://en.wikipedia.org/wiki/cross_compiler)，通常用于准备在嵌入式软件应用程序上执行的代码。
- 在应用优化和转换的同时将目标代码重写回相同类型的目标代码的程序是[二进制重新编译器](https://en.wikipedia.org/wiki/binary_recompiler)。

*汇编器*将人类可读的[汇编语言](https://en.wikipedia.org/wiki/assemble_language)翻译为由硬件执行的[机器代码](https://en.wikipedia.org/wiki/machine_code)指令，不被视为编译器。“上一节中描述的许多源语言功能导致编译器和汇编器之间存在许多显着差异。在任何一项上，区别可能都不是明确的。此外，可能很难区分一个简单的编译器来自一个强大的宏汇编器，然而，差异通常足够大，以至于汇编器和编译器之间仍然存在质的区别。” （将机器代码翻译为汇编语言的逆向程序称为[反汇编器](https://en.wikipedia.org/wiki/disassembler)。）

## 参见

- [摘要解释](https://en.wikipedia.org/wiki/Abstract_interpretation)
- [汇编器](https://en.wikipedia.org/wiki/Assembly_language#Assembler)
- [自下而上解析](https://en.wikipedia.org/wiki/Bottom-up_parsing)
- [编译并运行系统](https://en.wikipedia.org/wiki/Compile_and_go_system)
- [编译农场](https://en.wikipedia.org/wiki/Compile_farm)
- [编译器书籍列表](https://en.wikipedia.org/wiki/List_of_computer_books#Compilers)
- [编译器列表](https://en.wikipedia.org/wiki/List_of_compilers)
- [元编译](https://en.wikipedia.org/wiki/Metacompilation)
- [程序转换](https://en.wikipedia.org/wiki/Program_transformation)
- [软件构建](https://en.wikipedia.org/wiki/Software_build)

## 注释和参考文献

## 进一步阅读

- 编译器：原理、技术和工具（Alfred V. Aho，1986，[Addison-Wesley](https://en.wikipedia.org/wiki/Addison-Wesley)）
- IBM 语言处理器技术的历史（Frances E. Allen，1981 年 9 月，[IBM](https://en.wikipedia.org/wiki/IBM)）
- 优化现代架构的编译器（Randy Allen，2001，[Morgan Kaufmann Publishers](https://en.wikipedia.org/wiki/Morgan_Kaufmann_Publishers)）
- Java 中的现代编译器实现（Andrew Wilson Appel，2002 年，[剑桥大学出版社](https://en.wikipedia.org/wiki/Cambridge_University_Press)）
- ML 中的现代编译器实现（Andrew Wilson Appel，1998，[剑桥大学出版社](https://en.wikipedia.org/wiki/Cambridge_University_Press)）
- 理解和编写编译器：自己动手指南（Richard Bornat，1979，[Macmillan Publishing](https://en.wikipedia.org/wiki/Macmillan_Publishing)）
- 汇编器、编译器和程序翻译（Peter Calingaert，1979 年，[Computer Science Press, Inc.](https://en.wikipedia.org/wiki/Computer_Science_Press%2C_Inc.)）（2+xiv+270+6 页）
- 设计编译器（Keith Daniel Cooper，2012，Elsevier/Morgan Kaufmann）
- 数字计算机的编译器构建（David Gries，1971，[Wiley（出版商））
- 编译器生成器（William Marshall McKeeman，1970，[[Prentice-Hall](https://en.wikipedia.org/wiki/Wiley_(publisher))%0A*_A_Compiler_Generator_(William_Marshall_McKeeman%2C_1970%2C_%5B%5BPrentice-Hall))
- 高级编译器设计和实现（Steven Muchnick，1997，[Morgan Kaufmann Publishers](https://en.wikipedia.org/wiki/Morgan_Kaufmann_Publishers)）
- 编程语言语用学（Michael Lee Scott，2005，[Morgan Kaufmann](https://en.wikipedia.org/wiki/Morgan_Kaufmann)）
- 编译器设计手册：优化和机器代码生成（Y. N. Srikant，2003 年，[CRC Press](https://en.wikipedia.org/wiki/CRC_Press)）
- 编译器和编译器生成器：C++ 简介（Patrick D. Terry，1997 年，国际汤姆森计算机出版社）
- 编译器构造（Niklaus Wirth，1996，[Addison-Wesley](https://en.wikipedia.org/wiki/Addison-Wesley)）
- LLVM 目标无关代码生成器（LLVM 社区、LLVM 文档）
- [编译器教材参考](https://web.archive.org/web/20150103161301/http://www.informatik.uni-trier.de/~ley/db/books/compiler/index.html)主流编译器构建教材参考资料合集

## 外部链接

[编译器](https://en.wikipedia.org/wiki/compiler)
[编译器构建](https://en.wikipedia.org/wiki/Compiler_Construction)
编译器
- [增量编译器构建方法](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf)PDF 教程
-
- _C5AHaS1mOA 解释编译器和解释器之间的关键概念差异
- 语法分析和 LL1 解析
- [让我们构建一个编译器](http://compilers.iecc.com/crenshaw/)，作者：Jack Crenshaw
-
