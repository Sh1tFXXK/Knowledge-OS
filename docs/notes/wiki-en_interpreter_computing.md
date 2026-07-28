# 口译员（计算）

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Interpreter_(computing))  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

]]

在[计算](https://en.wikipedia.org/wiki/computing)中，**解释器**是[软件](https://en.wikipedia.org/wiki/software)，它[执行](https://en.wikipedia.org/wiki/execution_(computers))[源代码](https://en.wikipedia.org/wiki/source_code)，无需首先[编译](https://en.wikipedia.org/wiki/compiling) 将其转换为[机器代码](https://en.wikipedia.org/wiki/machine_code)。解释的[运行时环境](https://en.wikipedia.org/wiki/runtime_environment)与处理[CPU](https://en.wikipedia.org/wiki/CPU)本机[可执行代码](https://en.wikipedia.org/wiki/executable_code)的环境不同，后者需要在执行之前翻译源代码。解释器可以将源代码翻译为中间格式，例如[字节码](https://en.wikipedia.org/wiki/bytecode)。混合环境可以通过[即时编译](https://en.wikipedia.org/wiki/just-in-time_compilation)将字节码转换为机器代码，如[.NET](https://en.wikipedia.org/wiki/.NET)和[Java](https://en.wikipedia.org/wiki/Java_(programming_language))，而不是直接解释字节码。

在解释器广泛采用之前，[计算机程序](https://en.wikipedia.org/wiki/computer_programs)的执行通常依赖于[编译器](https://en.wikipedia.org/wiki/compilers)，它将源代码翻译并编译为机器代码。 [Lisp](https://en.wikipedia.org/wiki/Lisp_programming_language)和[BASIC](https://en.wikipedia.org/wiki/BASIC_interpreter)的早期运行环境可以直接解析源代码。此后，开发了针对语言的运行时环境（例如 [Perl](https://en.wikipedia.org/wiki/Perl)、[Raku](https://en.wikipedia.org/wiki/Raku_(programming_language))、[Python](https://en.wikipedia.org/wiki/Python_(programming_language))、[MATLAB](https://en.wikipedia.org/wiki/MATLAB) 和[Ruby](https://en.wikipedia.org/wiki/Ruby_(programming_language)))，在执行之前将源代码转换为中间格式，以增强[运行时性能](https://en.wikipedia.org/wiki/runtime_performance)。

在解释器中运行的代码可以在任何具有[兼容](https://en.wikipedia.org/wiki/software_compatibility)解释器的平台上运行。相同的代码可以分发到任何此类平台，而不是必须为每个平台构建[可执行文件](https://en.wikipedia.org/wiki/executable)。尽管每种编程语言通常与特定的运行时环境相关联，但一种语言可以在不同的环境中使用。解释器是为传统上与[编译](https://en.wikipedia.org/wiki/Compiler)相关的语言构建的，例如[ALGOL](https://en.wikipedia.org/wiki/ALGOL)、[Fortran](https://en.wikipedia.org/wiki/Fortran)、[COBOL](https://en.wikipedia.org/wiki/COBOL)、 [C](https://en.wikipedia.org/wiki/C_(programming_language)) 和 [C++](https://en.wikipedia.org/wiki/C%2B%2B)。

---

## 历史

在计算的早期，编译器比解释器更常见和使用，因为当时的硬件无法同时支持解释器和解释代码，并且当时典型的批处理环境限制了解释的优势。

解释器早在 1952 年就被用来在当时计算机的限制下简化编程（例如，程序存储空间短缺，或者没有对浮点数的本机支持）。解释器还用于在低级机器语言之间进行翻译，允许为仍在建设中的机器编写代码并在已经存在的计算机上进行测试。第一种解释型高级语言是 [Lisp](https://en.wikipedia.org/wiki/Lisp_(programming_language))。 Lisp 最初由 [Steve Russell](https://en.wikipedia.org/wiki/Steve_Russell_(computer_scientist)) 在 [IBM 704](https://en.wikipedia.org/wiki/IBM_704) 计算机上实现。 Russell 读过 [John McCarthy](https://en.wikipedia.org/wiki/John_McCarthy_(computer_scientist)) 的论文“符号表达式的递归函数及其机器计算，第一部分”，并意识到（令麦卡锡惊讶的是）Lisp *eval* 函数可以用机器代码实现。结果是一个可以运行的 Lisp 解释器，可以用来运行 Lisp 程序，或者更准确地说，“评估 Lisp 表达式”。

编辑解释器的发展受到交互式计算需求的影响。 20 世纪 60 年代，分时系统的引入允许多个用户同时访问一台计算机，编辑解释器对于实时管理和修改代码变得至关重要。第一个编辑解释器可能是为大型计算机开发的，用于动态创建和修改程序。编辑解释器最早的例子之一是 EDT（TECO 编辑器和调试器）系统，该系统是在 20 世纪 60 年代末为 PDP-1 计算机开发的。 EDT 允许用户使用命令和宏的组合来编辑和调试程序，为现代文本编辑器和交互式开发环境铺平了道路。

## 使用

口译员的显着用途包括：

**命令和脚本：解释器经常用于执行[命令](https://en.wikipedia.org/wiki/command-line_interface)和[脚本](https://en.wikipedia.org/wiki/script_language)**

**[虚拟化](https://en.wikipedia.org/wiki/Virtualization)：解释器充当[虚拟机](https://en.wikipedia.org/wiki/virtual_machine)，为不同于运行解释器的硬件架构执行机器代码。**

**模拟：解释器（虚拟机）可以[模拟](https://en.wikipedia.org/wiki/emulator)另一个计算机系统，以便运行为该系统编写的代码。**

**[沙盒](https://en.wikipedia.org/wiki/Sandbox_(computer_security))：虽然某些类型的沙箱依赖于操作系统保护，但解释器（虚拟机）可以提供额外的控制，例如阻止违反[安全](https://en.wikipedia.org/wiki/computer_security)规则的代码。**

**自修改代码：[自修改代码](https://en.wikipedia.org/wiki/Self-modifying_code)可以用解释型语言实现。这与 Lisp 解释的起源和[人工智能](https://en.wikipedia.org/wiki/artificial_intelligence)研究有关。**

## 效率

解释开销是通过解释器而不是本机（编译）代码执行代码的运行时成本。解释速度较慢，因为解释器为本机代码中的等效功能执行多个机器代码指令。特别是，在解释器中访问变量的速度较慢，因为标识符到存储位置的映射必须在运行时而不是在[编译时](https://en.wikipedia.org/wiki/compile_time)重复完成。但更快的开发（由于编辑-构建-运行周期较短等因素）可能会超过更快执行速度的价值，尤其是在编辑-构建-运行周期频繁的原型设计和测试时。

解释器可以从源代码生成程序的[中间表示](https://en.wikipedia.org/wiki/intermediate_representation) (IR)，以实现快速运行时性能等目标。编译器也可以生成 IR，但编译器生成机器代码供以后执行，而解释器则准备执行程序。这些不同的目标导致了不同的 IR 设计。许多[BASIC](https://en.wikipedia.org/wiki/BASIC)解释器将[关键字](https://en.wikipedia.org/wiki/keyword_(computer_programming))替换为单个[字节](https://en.wikipedia.org/wiki/byte)[令牌](https://en.wikipedia.org/wiki/Token_threading)，可用于在[跳转中查找指令]表](https://en.wikipedia.org/wiki/jump_table)。一些解释器，例如 [PBASIC](https://en.wikipedia.org/wiki/PBASIC) 解释器，通过使用面向位而不是面向字节的程序内存结构来实现更高级别的程序压缩，其中命令令牌可能占用 5 位，名义上“16 位”常量存储在需要 3、6、10 的[可变长度代码](https://en.wikipedia.org/wiki/variable-length_code)中，或 18 位，地址操作数包括“位偏移量”。许多 BASIC 解释器可以存储和读回它们自己的标记化内部表示。

使用解释器时的开发速度和使用编译器时的执行速度之间存在各种折衷。某些系统（例如某些 Lisps）允许解释和编译的代码相互调用并共享变量。这意味着，一旦例程在解释器下经过测试和调试，就可以对其进行编译，从而在开发其他例程时受益于更快的执行。

## 执行

由于解释和编译的早期阶段相似，解释器可能会使用相同的[词法分析器](https://en.wikipedia.org/wiki/lexical_analysis)和[解析器](https://en.wikipedia.org/wiki/parser)作为编译器，然后解释生成的[抽象语法树](https://en.wikipedia.org/wiki/abstract_syntax_tree)。

## 例子

用 [C++](https://en.wikipedia.org/wiki/C%2B%2B) 编写的表达式解释器。

导入标准；

使用 std::runtime_error ；
使用 std::unique_ptr；
使用 std::variant；

// 抽象语法树的数据类型
枚举类种类：char {
    VAR，
    常量，
    总和，
    差异，
    多,
    DIV,
    另外，
    减号，
    不
};

// 前向声明
类节点；

类变量{
公众：
    int* 内存；
};

类常量{
公众：
    整数值；
};

类一元操作{
公众：
    unique_ptr<Node> 对；
};

二进制操作类 {
公众：
    unique_ptr<Node> 左；
    unique_ptr<Node> 对；
};

使用表达式=变体<变量，常量，BinaryOperation，UnaryOperation>;

类节点{
公众：
    善良善良；
    表达式 e;
};

// 解释程序
[nodiscard](https://en.wikipedia.org/wiki/nodiscard)
intexecuteIntExpression(const Node& n) {
    int 左值；
    int 右值；
    开关（n->种类）{
        案例种类::VAR:
            返回 std::get<Variable>(n.e).内存；
        案例种类::常量:
            返回 std::get<Constant>(n.e).value;
        案例种类::总和:
        案例种类::差异:
        案例种类::MULT:
        案例种类::DIV:
const BinaryOperation& bin = std::get<BinaryOperation>(n.e);
            leftValue =executeIntExpression(bin.left.get());
            rightValue =executeIntExpression(bin.right.get());
            开关（n.kind）{
                案例种类::总和:
                    返回左值+右值；
                案例种类::差异:
                    返回左值 - 右值；
                案例种类::MULT:
                    返回左值*右值；
案例种类::DIV:
                    if (右值 == 0) {
                        抛出runtime_error（“除以零”）；
                    }
                    返回左值/右值；
            }
        案例种类::加号:
        案例种类::减号:
        案例种类::不是:
            const UnaryOperation& un = std::get<UnaryOperation>(n.e);
            rightValue =executeIntExpression(un.right.get());
            开关（n.kind）{
案例种类::加号:
                    返回+右值；
                案例种类::减号:
                    返回-rightValue；
                案例种类::不是:
                    返回！rightValue；
            }
        默认：
            std::unreachable();
    }
}

## 即时编译

[即时 (JIT) 编译](https://en.wikipedia.org/wiki/Just-in-time_compilation) 是在运行时将中间格式（即字节码）转换为本机代码的过程。由于这会导致本机代码执行，因此它是一种避免使用解释器的运行时成本，同时保留导致解释器开发的一些好处的方法。

## 变化

**[控制表](https://en.wikipedia.org/wiki/Control_table)解释器：逻辑被指定为格式化为表的数据。**

**CompreterBytecode 解释器：一些解释器处理[字节码](https://en.wikipedia.org/wiki/bytecode)，这是从高级语言编译的中间逻辑格式。例如，[Emacs Lisp](https://en.wikipedia.org/wiki/Emacs_Lisp) 被编译为由解释器解释的字节码。有人可能会说，这个编译后的代码是解释器实现的虚拟机的机器代码。这样的解释器有时被称为*解释器*。**

**线程代码解释器：[线程代码](https://en.wikipedia.org/wiki/threaded_code)解释器与字节码解释器类似，但使用指针而不是字节。每条指令都是一个指向函数或指令序列的字，后面可能跟着一个参数。线程代码解释器要么循环获取指令并调用它们指向的函数，要么获取第一条指令并跳转到它，每个指令序列以获取并跳转到下一条指令结束。线程代码的一个示例是 [开放固件](https://en.wikipedia.org/wiki/Open_Firmware) 系统中使用的 [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language)) 代码。源语言被编译成“F代码”（字节码），然后由[虚拟机]（https://en.wikipedia.org/wiki/virtual_machine）解释。**

**抽象语法树解释器：抽象语法树解释器将源代码转换为抽象语法树（https://en.wikipedia.org/wiki/abstract_syntax_tree）（AST），然后直接解释它，或者通过JIT编译使用它生成本机代码。在这种方法中，每个句子只需解析一次。与字节码相比，AST 具有优势，它保留了全局程序结构和语句之间的关系（在字节码表示中丢失），并且在压缩时提供更紧凑的表示。因此，使用 AST 被认为是比字节码更好的中间格式。然而，对于解释器来说，AST 会比字节码解释器产生更多的开销，因为与语法相关的节点不执行有用的工作、顺序表示较少（需要遍历更多指针）以及访问树的开销。**

**模板解释器：在软件堆栈或树遍历上操作时，模板解释器不是通过包含每个可能的字节码的大型 switch 语句来实现代码的执行，而是维护直接映射到相应本机机器指令的大量字节码（或任何有效的中间表示），这些指令可以作为键值对（或者在更有效的设计中，直接地址到本机指令）在主机硬件上执行，称为“模板”。当执行特定的代码段时，解释器只需加载或跳转到模板中的操作码映射并直接在硬件上运行它。由于其设计，模板解释器非常类似于 JIT 编译器，而不是传统的解释器，但从技术上讲，它不是 JIT，因为它只是一次将一个操作码从语言转换为本地调用，而不是从整个代码段创建优化的 CPU 可执行指令序列。由于解释器的设计简单，只是将调用直接传递到硬件而不是直接实现它们，因此它比所有其他类型（甚至字节码解释器）要快得多，并且在一定程度上不易出现错误，但由于解释器必须支持翻译到多个不同的体系结构而不是独立于平台的虚拟机/堆栈，所以权衡更难以维护。迄今为止，唯一存在的广为人知的语言的模板解释器实现是 Java 官方参考实现中的解释器、Sun HotSpot Java 虚拟机和 Google [V8](https://en.wikipedia.org/wiki/V8_(JavaScript_engine)) JavaScript 执行引擎中的 Ignition 解释器。**

**微码：[微码](https://en.wikipedia.org/wiki/Microcode)提供了一个抽象层作为硬件解释器，以较低级别的机器代码实现机器代码。它将高级机器指令与底层电子学分开，以便可以更自由地设计和更改高级指令。它还有助于提供复杂的多步指令，同时降低计算机电路的复杂性。**

## 参见

- 动态编译
- 同像性
- 元循环评估器
- 部分评价
- 读取-评估-打印循环

## 参考

## 来源

- 准时化简史（J. Aycock，2003 年 6 月，ACM 计算调查）

## 外部链接

- 哥伦比亚大学的 [IBM Card Interpreters](http://www.columbia.edu/acis/history/interpreter.html) 页面
- [实用“全函数式编程”的理论基础](https://archive.org/download/TheoreticalFoundationsForPracticaltotallyFunctionalProgramming/33429551_PHD_totalthesis.pdf)（特别是第 7 章）解决解释器形式化问题的博士论文
