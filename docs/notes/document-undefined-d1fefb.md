---
title: "undefined"
source_file: "粘贴内容.txt"
source_type: "text"
source_sha256: "7f63d3334cacbd04c7912a3604d5c404763a4bf0d0da719242cf5df7fc9a15e0"
source_pages: null
ocr_provider: null
source_language: "zh"
translated_to: null
imported_at: "2026-08-13"
import_standard_version: 1
import_profile: "article"
structure_mode: "outline"
section_count: 2
node_count: 3
root_count: 1
relation_count: 0
question_count: 0
keywords:
  - "undefined"
  - "25 个保留字"
  - "2011 年对该语言及其 gc 实现与 C++（GCC）、Java 和 Scala 的对比评估由一位谷歌工程师发现："
categories:
  []
---

# undefined

## 摘要

历史编辑
Go 于2007年在 Google 设计，旨在提高在 多核、网络化 机器 和巨大的 代码库 中的 编程生产力。 设计者希望解决对Google中其他语言的批评，同时保留其有用特性：

静态类型 和 运行时 效率（如 C）
可读性 和 可用性（如 Python）
高性能网络和多处理
其设计者主要因为共同对C++的不喜欢而受到激励。

Go于2009年11月正式发布， 1.0版本于2012年3月发布。 Go在Google及许多其他组织和开源项目中广泛使用。

回顾过去，Go的作者认为Go之所以成功，归功于围绕该语言的整体工程工作，包括对该语言并发特性的运行时支持。

尽管大多数编程语言的设计集中于语法、语义或类型的创新，但 Go 专注于软件开发过程本身。... 该语言本身的主要不寻常属性——并发——解决了2010年代多核CPU普及带来的问题。但更重要的是早期的工作为软件开发领域的打包、依赖、构建、测试、部署以及其他日常任务奠定了基础，这些方面通常在语言设计中并不是最重要的。

品牌和样式编辑

Go 的吉祥物图画，一只卡通 gopher。
gopher 吉祥物于2009年首次推出，以配合该语言的 开源 发布。Renée French 为 Plan 9 设计的兔子吉祥物，将 gopher 从早期的 WFMU T恤设计中改编而来。 gopher 最初被命名为 Gordon,[a] 但自2010年以来一直没有名字。

2016年11月，字体设计师 Charles Bigelow 和 Kris Holmes 为 Go 项目发布了 Go 和 Go Mono 字体。Go 是一种人文无衬线字体，与 Lucida Grande相似，但与 Helvetica 和 Arial 几乎（但不是完全）兼容，Go Mono 是等宽字体。这两种字体遵循 WGL4 字符集，设计上清晰可读，具有较大的 x-height 和独特的 字形。Go 和 Go Mono 都遵循 DIN 1450 标准，具有斜划零、小写的 l 带尾巴，以及带衬线的大写 I。

2018年4月，品牌设计师 Adam Smith 对原始标志进行了重新设计。新的标志是一个现代化的、向右倾斜的 GO，带有尾流线条。gopher 吉祥物保持不变。

泛型编辑
初始版本的Go缺乏对通用编程的支持，受到相当大的批评。 设计者对通用编程表示开放，并指出内置函数实际上是类型通用的，但被视为特殊情况；Pike称这是一种弱点，可能会在某个时刻进行改变。 谷歌团队为一个带有泛型的实验性Go方言构建了至少一个编译器，但没有发布它。

在2018年8月，Go的主要贡献者发布了通用编程和错误处理的草案设计，并请求用户提交反馈。然而，错误处理提案最终被放弃。

在2020年6月，发布了一份新的草案设计文档，该文档将为Go添加声明通用函数和类型所需的语法。提供了一种代码翻译工具.mw-parser-output.monospaced{font-family:monospace,monospace}go2go，允许用户尝试新的语法，以及一个启用泛型的在线Go Playground版本。

在2022年3月15日，泛型终于在版本1.18中添加到Go中。

Versioning
Go 1 guarantees compatibility for the language specification and major parts of the standard library. All versions up through the current Go 1.26 release have maintained this promise.

Go uses a go1.[major].[patch] versioning format, such as go1.26.0 and each major Go release is supported until there are two newer major releases. Unlike most software, Go calls the second number in a version the major, i.e., in go1.26.0 the 26 is the major version. This is because Go plans to never reach 2.0, prioritizing backwards compatibility over potential breaking changes.

设计编辑
2015年Rob Pike的讲座（Go语言的创始人之一）
"Go 的影响来源于 C（尤其是 Plan 9 方言[failed verification – see discussion]），但更强调简单性和安全性。它由以下内容组成："

一种采用在动态语言中更常见模式的语法和环境:
通过类型推断进行可选的简洁变量声明和初始化（x:= 0，而不是var x int = 0;或var x = 0;）
快速编译
远程包管理（go get）和在线包文档
针对特定问题的独特方法：
内置并发原语：轻量级进程（goroutines），通道和select语句
一个接口系统替代虚拟继承，并通过类型嵌入替代非虚拟继承
一个默认生成静态链接本地二进制文件的工具链，无需外部Go依赖
"希望将语言规范保持足够简单，以便程序员能够记住， 部分通过 省略在类似语言中常见的特性 来实现。

## 25 个保留字

语法编辑
Go 的语法在 C 的基础上进行了改动，旨在保持代码简洁易读。引入了一个组合声明/初始化运算符，允许程序员编写 i:= 3 或 s:= \"Hello, world!\"，而无需指定使用的变量类型。这与 C 的 int i = 3; 和 char *s = \"Hello, world!\"; 相对比（尽管自从 C23 以来，通过 auto 支持了类型推断，类似于 C++）。Go 还去掉了在 if 语句条件中使用括号的要求。

分号仍用于结束语句；[b] 但是在行末出现时是隐含的。[c]

方法可以返回多个值，返回一个 result, err 对是方法向调用者指示错误的常见方式。[d] Go 为通过名称初始化结构参数以及初始化 maps 和 slices 添加了文字语法。作为 C 的三语句 for 循环的替代方案，Go 的 range 表达式允许对数组、切片、字符串、映射和通道进行简洁的迭代。

关键字"编辑
"Go 包含以下 25 个关键词："

break
case
chan
const
continue
default
defer
else
fallthrough
for
func
go
goto
if
import
interface
map
package
range
return
select
struct
switch
type
var
Types
Go has a number of built-in types, including numeric ones (byte, int64, float32, etc.), Booleans, and byte strings (string). Strings are immutable; built-in operators and keywords (rather than functions) provide concatenation, comparison, and UTF-8 encoding/decoding. Record types can be defined with the struct keyword.

Go contains the following primitives:

bool
int8
uint8
int16
uint16
int32
uint32
int64
uint64
int
uint
uintptr
float32
float64
complex64
complex128
string
请注意，byte 是 uint8 的别名，而 rune 是 int32 的别名。

对于每种类型 T 和每个非负整数常量 n，存在一种被表示为 array type 的 [n]T；因此，不同长度的数组是不同类型的。 动态数组 作为“切片”可用，表示为 T，其中类型为 T（与其他语言如 C/C++ 和 Java 相比，数组被表示为 T）。这些数组有一个长度和一个 容量，用于指定何时需要分配新内存以扩展数组。多个切片可以共享其底层内存。

Pointers 对所有类型都是可用的，指向 T 类型的指针被表示为 *T（与 Rust 相似；与其他语言如 C/C++ 和 C# 相比，指针被表示为 T*）。取地址和间接引用使用 & 和 * 运算符，类似于 C，或者通过方法调用或属性访问语法隐式发生。 没有指针算术，[e]，除非通过标准库中的特殊 unsafe.Pointer 类型。

对于一对类型 K 和 V，类型 map[K]V 是将类型-K 键映射到类型-V 值的类型，可以被认为等同于其他语言中的 Map<K, V>。Go 编程语言规范没有对映射类型提供任何性能保证或实现要求，尽管通常它是作为一个 哈希表 实现的（等同于其他语言中的 HashMap<K, V>）。哈希表内置于语言中，具有特殊语法和内置函数。 chan T 是一个 通道，允许在 T 类型之间传递值，涉及 并发 Go 过程。

除了对接口的支持外，Go的类型系统是命名的：type关键字可以用来定义一个新的命名类型，它与其他具有相同布局的命名类型是不同的（在结构体的情况下，具有相同顺序的相同成员）。某些类型之间的转换（例如，各种整数类型之间）是预定义的，并且添加新类型可能会定义额外的转换，但命名类型之间的转换必须始终显式调用。例如，可以使用type关键字定义一个IPv4地址的类型，基于32位无符号整数，如下所示：

type ipv4addr uint32
通过这个类型定义，ipv4addr(x)将uint32值x解释为一个IP地址。简单地将x赋值给类型为ipv4addr的变量会导致类型错误。

常量表达式可以是有类型的或“无类型”的；如果它们表示的值通过编译时检查，则在赋值给有类型的变量时会赋予一个类型。

Function types由func关键字指示；它们可以接受零个或多个参数，并返回零个或多个值，所有这些值都有类型。参数和返回值决定了函数类型；因此，func(string, int32) (int, error)是接受一个string和一个32位有符号整数，并返回一个有符号整数（默认宽度）和一个内置接口类型error的函数类型。

任何命名类型都有一个与之关联的方法集合。上面的IP地址示例可以通过一个方法扩展，以检查其值是否是已知标准：

// ZeroBroadcast reports whether addr is 255.255.255.255.
func (addr ipv4addr) ZeroBroadcast() bool {
return addr == 0xFFFFFFFF
}
由于名义类型，这个方法定义将一个方法添加到ipv4addr，但不在uint32上。虽然方法有特殊的定义和调用语法，但没有独特的方法类型。

接口系统编辑
Go提供了两种替代类继承的特性。

第一种是嵌入，可以看作是组合的一种自动化形式。

第二种是它的interfaces，提供了运行时多态性。: 266 接口是一类类型，并在Go的名义类型系统中提供了有限形式的结构类型。一个接口类型的对象也属于另一种类型，就像C++对象同时属于基类和派生类一样。Go接口的设计灵感来源于Smalltalk编程语言中的协议。 多个来源在描述Go接口时使用“鸭子类型”这个术语。 虽然“鸭子类型”这个术语并没有精确定义，因此并没有错，但通常意味着类型符合性不是静态检查的。因为Go接口的符合性是由Go编译器静态检查的（在执行类型断言时除外），Go的作者更喜欢使用“结构类型”这个术语。

接口类型的定义列出了所需方法的名称和类型。任何符合接口类型I的所有所需方法的类型T的对象，也都是类型I的对象。类型T的定义不需要（也不能）识别类型I。例如，如果形状、正方形和圆形被定义为

import "math"

type Shape interface {
Area() float64
}

// Note: no "implements" declaration
type Square struct {
side float64
}

func (sq Square) Area() float64 {
return sq.side * sq.side
}

// No "implements" declaration here either
type Circle struct {
radius float64
}

func (c Circle) Area() float64 {
return math.Pi * math.Pow(c.radius, 2)
}
"然后，方形和圆形隐式地都是形状，可以被赋值给形状类型的变量。：263–268 在正式语言中，Go的接口系统提供了结构型而不是名义型的类型。接口可以嵌入其他接口，从而创建一个组合接口，恰好由实现嵌入接口的类型以及新定义的接口添加的任何方法满足。：270

Go标准库使用接口在多个地方提供泛型性，包括基于读取器和写入器概念的输入/输出系统。：282–283

除了通过接口调用方法之外，Go还允许将接口值转换为其他类型并进行运行时类型检查。执行此操作的语言构造是类型断言，它检查单一潜在类型：

var shp Shape = Square{5}
square, ok:= shp.(Square) // Asserts Square type on shp, should work
if ok {
fmt.Printf("%#v\n", square)
} else {
fmt.Println("Can't print shape as Square")
}
和类型开关，它检查多个类型：

func (sq Square) Diagonal() float64 { return sq.side * math.Sqrt2 }
func (c Circle) Diameter() float64 { return 2 * c.radius }

func LongestContainedLine(shp Shape) float64 {
switch v:= shp.(type) {
case Square:
return v.Diagonal() // Or, with type assertion, shp.(Square).Diagonal()
case Circle:
return v.Diameter() // Or, with type assertion, shp.(Circle).Diameter()
default:
return 0 // In practice, this should be handled with errors
}
}
空接口 interface{}是一个重要的基本案例，因为它可以引用任何具体类型的项目。它类似于Java中的Object类，或C#，或void*在C中，或Any在C++和Rust中，并且任何类型都可以满足，包括像int这样的内置类型。：284 使用空接口的代码无法简单地调用被引用对象的方法（或内置运算符），但可以存储interface{}值，尝试通过类型断言或类型开关将其转换为更有用的类型，或者使用Go的反射包对其进行检查。 因为interface{}可以引用任何值，所以它是一种有限的方式来逃避静态类型的限制，像void*在C中，但附加了运行时类型检查。

interface{}类型可以用于建模Go中任何任意架构的结构化数据，例如JSON或YAML数据，通过将其表示为map[string]interface{}（字符串到空接口的映射）。这递归地以字典形式描述数据，字典中有字符串键和任何类型的值。

接口值是使用数据指针和指向运行时类型信息的第二个指针实现的。 像在Go中使用指针实现的其他类型一样，未初始化时接口值为nil。

使用参数化类型的泛型代码编辑
自1.18版本以来，Go支持使用参数化类型的泛型代码。

函数和类型现在具有泛型的能力，使用类型参数。这些类型参数在函数或类型名称后面的方括号内指定。 编译器通过用提供的类型参数替换类型参数（无论是用户显式提供的还是编译器进行类型推断）将泛型函数或类型转换为非泛型的。 此转换过程称为类型实例化。

接口现在可以使用|（并集）运算符定义一组类型（称为类型集合），以及一组方法。这些更改是为了支持泛型代码中的类型约束。对于泛型函数或类型，可以将约束视为类型参数的类型：元类型。这种新的~T语法将是~在Go中作为标记的第一次使用。~T表示所有基础类型为T的类型集合。

type Number interface {
~int | ~float64 | ~float32 | ~int32 | ~int64
}

func AddT Number T {
var sum T
for _, v:= range nums {
sum += v
}
return sum
}

func main() {
add:= Add[int] // Type instantiation
println(add(1, 2, 3, 4, 5)) // 15

res:= Add(1.1, 2.2, 3.3, 4.4, 5.5) // Type Inference
println(res) // +1.650000e+001
}
枚举类型编辑
本节摘自枚举类型§ Go。edit
Go 使用 iota 标识符来创建枚举常量。

type ByteSize int

const (
_ = iota // ignore first value by assigning to blank identifier; 0
KB ByteSize = 1 << (10 * iota) // 1 << (10 * 1) == 1 << 10 == 1024; in binary 10000000000
MB // 1 << (10 * 2) == 1048576; in binary 100000000000000000000
GB // 1 << (10 * 3) == 1073741824; in binary 1000000000000000000000000000000
)
包系统编辑
在Go的包系统中，每个包都有一个路径（例如，\"compress/bzip2\" 或 \"golang.org/x/net/html\"）和一个名字（例如，bzip2或 html）。默认情况下，其他包的定义必须始终以其他包的名字为前缀。然而，所用的名称可以与包名不同，如果导入为 _，则不需要包前缀。只有其他包中的大写名称是可访问的：io.Reader是公共的，但 bzip2.reader则不是。 go get 命令可以检索存储在远程仓库中的包，并且鼓励开发人员在与源仓库对应的基础路径内开发包（例如 example.com/user_name/package_name），以减少将来对标准库或其他外部库的新增引起名称冲突的可能性。

并发：goroutine 和通道编辑
DotGo 2015 - Matt Aimonetti - 在 Go 中应用并发
Go语言内置了设施以及库支持，用于编写并发程序。其运行时是异步的：执行网络读取等程序将会被挂起，直到数据可用于处理，从而允许程序的其他部分执行其他工作。这是内置于运行时的，不需要对程序代码做任何更改。Go运行时还会自动调度多个CPU间的并发操作（goroutines）；这可以为编写得当的程序实现并行性。

主要的并发构造是goroutine，一种绿色线程。: 280–281 使用go关键字前缀的函数调用将启动一个新的goroutine中的函数。语言规范并未规定goroutine应该如何实现，但当前的实现将Go进程的goroutine多路复用到较小的一组操作系统线程，这类似于在Erlang和Haskell的格拉斯哥Haskell编译器（GHC）运行时实现中的调度。: 10

虽然标准库中提供了大多数经典的并发控制结构（如互斥锁等）: 151–152，但惯用的并发程序更倾向于使用通道，用于在goroutine之间发送消息。 可选的缓冲区以FIFO顺序存储消息: 43，并允许发送的goroutine在消息被接收之前继续执行。: 233

通道是有类型的，因此类型为chan T的通道只能用于传输类型为T的消息；使用特殊语法对它们进行操作；<-ch是一个表达式，使正在执行的goroutine阻塞，直到通过通道ch传入一个值，而ch <- x则发送值x（可能会阻塞，直到另一个goroutine接收到该值）。内置的类似switch的select语句可以用于在多个通道上实现非阻塞通信；有关示例，请参见下文。Go有一个内存模型，描述了goroutine如何安全地使用通道或其他操作共享数据。

通道的存在本身并不会使Go与演员模型风格的并发语言（如Erlang）区分开来，在这些语言中，消息是直接发送给演员（对应goroutines）。在演员模型中，通道本身就是演员，因此对通道的地址指向即是对一个演员的地址。通过在goroutines和通道之间保持一对一的对应关系，可以在Go中模拟演员风格，但该语言允许多个goroutines共享一个通道，或者单个goroutine在多个通道上发送和接收。: 147

通过这些工具，可以构建并发结构，例如 工作池、管道（比如说，一个文件在下载过程中被解压和解析）、具有超时的后台调用、“扇出”并行调用一组服务等等。 通道的用途也超出了通常的进程间通信的概念，比如作为一个线程安全的回收缓冲区列表， 实现 协程（这帮助激发了 goroutine 这个名称）， 和实现 迭代器。

Go 的与并发相关的结构约定（channels 和替代通道输入）源于 Tony Hoare 的 通信顺序过程模型。与之前的并发编程语言如 Occam 或 Limbo（Go 的共同设计者 Rob Pike 曾参与开发的语言）不同， Go 不提供任何内置的安全或可验证的并发概念。 虽然通信过程模型在 Go 中受到青睐，但这并不是唯一的模型：程序中的所有 goroutine 共享一个单一的地址空间。这意味着可变对象和指针可以在 goroutine 之间共享；见下文的 § 缺乏数据竞争安全。

并行编程的适用性编辑
尽管 Go 的并发特性并非主要针对 并行处理， 但它们可以用于编程 共享内存 多处理器 机器。对于这种方法的有效性已开展了各种研究。 其中一项研究比较了一位对该语言不熟悉的资深程序员所写程序的大小（以 代码行 计）和 Go 专家（来自谷歌开发团队）对这些程序的修改，同时对 Chapel、Cilk 和 Intel TBB 做了相同的研究。研究发现非专家倾向于编写每次递归都有一个 分治 算法的 go 语句，而专家则使用每个处理器核心一个 goroutine 编写分布-工作-同步程序。专家的程序通常更快，但也更长。

缺乏数据竞争安全性编辑
Go对并发的处理可以总结为“不要通过共享内存来通信；通过通信来共享内存”。 对于goroutine访问共享数据没有限制，这使得数据竞争成为可能。具体来说，除非程序通过通道或其他方式显式同步，否则一个goroutine的写入可能对另一个goroutine部分可见、完全可见或根本不可见，且通常对写入的顺序没有任何保证。 此外，Go的内部数据结构如接口值、切片头、哈希表和字符串头并不免受数据竞争的影响，因此在多线程程序中，如果修改这些类型的共享实例而没有同步，则可能违反类型和内存安全。 因此，安全的并发编程依赖于约定，而非语言支持；例如，Chisnall推荐一种叫做“别名 xor 可变”的惯用法，这意味着通过通道传递一个可变值（或指针）表示将该值的所有权转移给接收者。: 155 gc工具链有一个可选的数据竞争检测器，自1.1版本以来可以在运行时检查对共享内存的未同步访问， 此外，自gc运行时的1.6版本以来，还默认包含一个尽力而为的竞争检测器，用于访问map数据类型。

"二进制"编辑
gc 工具链中的链接器默认创建静态链接的二进制文件；因此所有 Go 二进制文件都包括 Go 运行时。

遗漏编辑
Go故意省略了其他语言中常见的某些特性，包括（实现）继承、断言、[f] 指针算术、[e] 隐式类型转换、未标记联合、[g]和标记联合。[h] 设计者仅添加了所有三方一致同意的功能。

在被省略的语言特性中，设计者明确反对断言和指针算术，同时捍卫省略类型继承的选择，认为这能提供一个更有用的语言，鼓励使用接口来实现动态调度[i]和组合来重用代码。组合和委托在很大程度上是通过结构嵌套自动化进行的；根据研究者Schmager 等人的说法，这一特性“有许多继承的缺点：它影响对象的公共接口，它不是细粒度的（即，对嵌入没有方法级别的控制），嵌入对象的方法无法隐藏，并且是静态的”，这使得“不明显”程序员是否会过度使用它，就像其他语言中的程序员被认为过度使用继承一样。

由于缺乏“提供与复杂性成比例的价值”的设计，异常处理最初在Go中被省略。 提出了避免通常的try-catch控制结构的类似异常的panic/recover机制，并在2010年3月30日的快照中发布。 Go的作者建议将其用于不可恢复的错误，例如那些应该停止整个程序或服务器请求的错误，或者作为在包内向上传播错误的捷径。 跨包边界，Go包括一个规范的错误类型，使用该类型的多值返回是标准惯用法。

样式编辑
Go 作者在影响 Go 程序风格方面投入了大量精力：

代码的缩进、间距以及其他表面级别的细节由 gofmt 工具自动标准化。它使用制表符进行缩进，使用空格进行对齐。对齐假设编辑器使用的是等宽字体。 golint 也会自动进行额外的样式检查，但已被 Go 维护者弃用和归档。
与Go一起分发的工具和库建议对API文档（godoc）、测试（go test）、构建（go build）、包管理（go get）等事宜采取标准方法。
Go强制执行在其他语言中作为建议的规则，例如禁止循环依赖、未使用的变量或导入和隐式类型转换。
某些特性（例如，像map和Java风格的try/finally块这样的函数式编程快捷方式）的省略往往会鼓励一种特定的显式、具体和命令式的编程风格。
在第一天，Go 团队发布了一系列 Go 习语， 后来也收集了代码审查评论， 演讲， 和官方博客文章 以教授 Go 的风格和编码哲学。
工具编辑
主要的Go发行版包括用于构建、测试和分析代码的工具：

go build，该命令仅使用源文件本身的信息来构建Go二进制文件，而不需要单独的makefile。
go test，用于单元测试和微基准测试以及模糊测试
go fmt，用于格式化代码
使用 go install 来获取和安装远程包。"
go vet, 一种静态分析器，用于查找代码中的潜在错误
go run，用于构建和执行代码的快捷方式
go doc，用于显示文档
go generate，一种调用代码生成器的标准方式
go mod用于创建新模块、添加依赖、升级依赖等。
"go tool，用于调用开发者工具（在 Go 版本 1.24 中新增）
它还包含 分析 和 调试 支持，模糊测试 功能以检测错误，运行时 插桩（例如，用于跟踪 垃圾回收 暂停）和 数据竞争 检测器。"

Go 团队维护的另一个工具是 gopls，这是一个语言服务器，为 IDE 提供智能代码补全等功能，兼容 语言服务器协议 的编辑器。

一个第三方工具生态系统为标准分发提供了附加工具，例如 gocode，它使许多文本编辑器能够进行代码自动补全， goimports，它根据需要自动添加/移除包导入，以及 errcheck，它检测可能无意中忽略错误的代码。

示例编辑
你好，世界编辑
package main

import "fmt"

func main() {
fmt.Println("hello world")
}
其中“fmt”是用于formatted I/O的包，类似于C的<stdio.h>或C++的<print>。

并发编辑
以下简单程序展示了Go的并发特性，以实现异步程序。它启动了两个轻量级线程（“goroutine”）：一个等待用户输入一些文本，而另一个实现超时。select语句等待这两个goroutine中的任意一个向主例程发送消息，并对第一个到达的消息进行处理（示例改编自David Chisnall的书）。: 152

package main

import (
"fmt"
"time"
)

func readword(ch chan string) {
fmt.Println("Type a word, then hit Enter.")
var word string
fmt.Scanf("%s", &word)
ch <- word
}

func timeout(t chan bool) {
time.Sleep(5 * time.Second)
t <- false
}

func main() {
t:= make(chan bool)
go timeout(t)

ch:= make(chan string)
go readword(ch)

select {
case word:= <-ch:
fmt.Println("Received", word)
case <-t:
fmt.Println("Timeout.")
}
}
测试编辑
测试包提供对Go包的自动化测试支持。 目标函数示例：

func ExtractUsername(email string) string {
at:= strings.Index(email, "@")
return email[:at]
}
测试代码（注意 assert 关键字在 Go 中缺失；测试位于同一包的 _test.go 中）：

import (
"testing"
)

func TestExtractUsername(t *testing.T) {
t.Run("withoutDot", func(t *testing.T) {
username:= ExtractUsername("r@google.com")
if username!= "r" {
t.Fatalf("Got: %v\n", username)
}
})

t.Run("withDot", func(t *testing.T) {
username:= ExtractUsername("jonh.smith@example.com")
if username!= "jonh.smith" {
t.Fatalf("Got: %v\n", username)
}
})
}
可以并行运行测试。

Web 应用程序编辑
net/http 包提供了创建 Web 应用程序的支持。

"当访问 localhost:8080 时，这个示例将显示 \"Hello world!\"。

package main

import (
"fmt"
"log"
"net/http"
)

func helloFunc(w http.ResponseWriter, r *http.Request) {
fmt.Fprintf(w, "Hello world!")
}

func main() {
http.HandleFunc("/", helloFunc)
log.Fatal(http.ListenAndServe(":8080", nil))
}
应用程序编辑
Go 在各个领域得到了广泛应用，得益于其强大的标准库和易用性。

热门应用包括：

Caddy — 一个自动设置 HTTPS 的 Web 服务器
Docker — 一个用于容器化的平台，旨在简化软件开发和部署的复杂性
Kubernetes — 自动化容器化应用程序的部署、扩展和管理
CockroachDB —— 一款为可扩展性和强一致性而设计的分布式 SQL 数据库
Hugo — 一个优先考虑速度和灵活性的静态网站生成器，使开发者能够高效创建网站
TypeScript 7 是用 Go 编写的。
接受度编辑
接口系统，以及故意省略继承的设计，受到 Michele Simionato 的赞扬，他将这些特性与 Standard ML 进行了比较，并称“没有流行语言遵循[这个]特定的路线实在是一个遗憾”。

David Astels 在 Engine Yard 2009 年写道：

Go 非常容易上手。语言的基本概念数量很少，语法简洁，旨在清晰且不模棱两可。

Go 仍然 是实验性的，仍然有一些粗糙之处。

Go在其第一年2009年被评选为年度编程语言，这是通过较其他语言在流行度上的更大12个月增长（在其11月推出后仅2个月内）而获得的，并在2010年1月达到了第13位，超越了像Pascal这样的成熟语言。到2015年6月，其在指数中的排名已降至50名以下，低于COBOL和Fortran。 但截至2017年1月，其排名跃升至第13位，表明其流行度和采用率有了显著增长。Go在2016年再次被授予TIOBE年度编程语言奖。

Bruce Eckel 曾表示：

C++ 的复杂性（在新的 C++ 中增加了更多复杂性）及其对生产力的影响已不再合理。C++ 程序员在使用 C 兼容语言时所需经历的种种繁琐过程已毫无意义——这只是浪费时间和精力。Go 对于 C++ 原本旨在解决的问题类别而言更为合适。

## 2011 年对该语言及其 gc 实现与 C++（GCC）、Java 和 Scala 的对比评估由一位谷歌工程师发现：

Go提供了有趣的语言特性，也允许简洁和标准化的表示法。该语言的编译器仍然不够成熟，这在性能和二进制大小上都有所体现。

—R. Hundt
这一评估遭到了 Go 开发团队的反驳。Ian Lance Taylor 改善了 Hundt 论文的 Go 代码，他并不知道要发布他的代码，并表示他的版本“从未旨在成为典范或高效 Go 的例子”；随后，Russ Cox 优化了 Go 代码以及 C++ 代码，使 Go 代码的运行速度几乎与 C++ 版本一样快，而且比论文中的代码快多个数量级。

Go 的 nil 加上缺乏 代数类型，导致处理失败和 基本情况 变得困难。
Go 因专注于实现的简洁性而非正确性和灵活性而受到批评；例如，该语言在所有平台上使用 POSIX 文件语义，因此在不遵循上述标准的平台（如 Windows）上提供了不正确的信息。
A study showed that it is as easy to make concurrency bugs with message passing as with shared memory, sometimes even more.
Naming dispute
On November 10, 2009, the day of the general release of the language, Francis McCabe, developer of the Go! programming language (note the exclamation point), requested a name change of Google's language to prevent confusion with his language, which he had spent 10 years developing. McCabe raised concerns that "the 'big guy' will end up steam-rollering over" him, and this concern resonated with the more than 120 developers who commented on Google's official issues thread saying they should change the name, with some even saying the issue contradicts Google's motto of: Don't be evil.

On October 12, 2010, the filed public issue ticket was closed by Google developer Russ Cox (@rsc) with the custom label "Unfortunate" accompanied by the following comment:

"There are many computing products and services named Go. In the 11 months since our release, there has been minimal confusion of the two languages.
