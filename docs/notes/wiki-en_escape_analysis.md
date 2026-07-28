# 逃逸分析

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Escape_analysis)  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

在编译器优化中，逃逸分析是一种确定程序中可以访问指针的动态范围的方法。它与[指针分析](https://en.wikipedia.org/wiki/pointer_analysis)和[形状分析](https://en.wikipedia.org/wiki/Shape_analysis_(program_analysis))有关。

当在[子例程](https://en.wikipedia.org/wiki/subroutine)中分配变量（或对象）时，指向该变量的[指针](https://en.wikipedia.org/wiki/pointer_(computer_programming))可以*转义*到其他执行的[线程](https://en.wikipedia.org/wiki/Thread_(computer_science))，或调用子例程。如果实现使用[尾部调用](https://en.wikipedia.org/wiki/tail_call)优化（[函数式语言](https://en.wikipedia.org/wiki/Functional_programming)通常需要），则对象也可能被视为转义到*调用的*子例程。如果一种语言支持一流的[延续](https://en.wikipedia.org/wiki/continuation)（[方案](https://en.wikipedia.org/wiki/Scheme_(programming_language))和[新泽西州标准ML](https://en.wikipedia.org/wiki/Standard_ML_of_New_Jersey))，则[调用的部分stack](https://en.wikipedia.org/wiki/call_stack) 也可能会逃脱。

如果子例程分配一个对象并返回指向它的指针，则可以从程序中指针已“逃逸”的未确定位置访问该对象。  如果指针存储在全局变量或其他数据结构中，从而转义当前过程，则指针也可以转义。

逃逸分析确定可以存储指针的所有位置以及是否可以证明指针的生命周期仅限于当前过程和/或线程。

---

## 优化

编译器可以使用逃逸分析的结果作为优化的基础：

- *将[堆分配](https://en.wikipedia.org/wiki/dynamic_memory_allocation)转换为[堆栈分配](https://en.wikipedia.org/wiki/Stack-based_memory_allocation)*。如果在子例程中分配一个对象，并且指向该对象的指针永远不会逃逸，则该对象可能是堆栈分配而不是堆分配的候选对象。在垃圾收集语言中，这可以减少收集器需要运行的频率。
- *同步省略*。如果发现某个对象只能从一个线程访问，则可以在不同步的情况下执行对该对象的操作。
- *分解对象*或*标量替换*。可以发现以不需要对象作为顺序存储器结构存在的方式来访问对象。这可能允许对象的部分（或全部）存储在 CPU 寄存器中而不是内存中。

## 实际考虑

在面向对象的编程语言中，动态编译器是执行转义分析的特别好的候选者。  在传统的[静态编译](https://en.wikipedia.org/wiki/static_compilation)中，[方法覆盖](https://en.wikipedia.org/wiki/method_overriding)可能使转义分析变得不可能，因为任何调用的方法都可能被允许指针转义的版本覆盖。动态编译器可以利用可用的重载信息进行逃逸分析，并在相关方法被动态代码加载覆盖时重新进行分析。

[Java 编程语言](https://en.wikipedia.org/wiki/Java_(programming_language)) 的流行使得逃逸分析成为人们感兴趣的目标。 Java 结合了堆对象分配、内置线程、Sun [HotSpot](https://en.wikipedia.org/wiki/HotSpot) 动态编译器和 [OpenJ9](https://en.wikipedia.org/wiki/OpenJ9) 的 [即时编译器](https://en.wikipedia.org/wiki/just-in-time_compiler) (JIT)，为逃逸分析相关优化创建了一个候选平台（请参阅[Java 中的转义分析](https://en.wikipedia.org/wiki/Java_performance#Escape_analysis_and_lock_coarsening)）。  逃逸分析在 Java 标准版 6 中实现。一些 JVM 支持逃逸分析的更强变体，称为“部分逃逸分析”，即使对象在函数的某些路径中逃逸，也可以对分配的对象进行标量替换。

## 示例（Java）

类主要{
    公共静态无效主（字符串[] args）{
        示例（）；
    }
    公共静态无效示例（）{
        Foo foo = new Foo(); //分配
        酒吧酒吧=新酒吧（）； //分配
        bar.setFoo(foo);
    }
}

类 Foo {}

类酒吧{
    私人 Foo foo;
    公共无效setFoo（Foo foo）{
        this.foo = foo;
    }
}

在此示例中，创建了两个对象（用 alloc 注释），其中一个对象作为另一个对象的方法的参数。 setFoo() 方法存储对接收到的 Foo 对象的引用。如果 Bar 对象位于堆上，那么对 Foo 的引用将会逃逸。但在这种情况下，编译器可以通过转义分析确定 Bar 对象本身不会转义 example() 的调用。因此，对 Foo 的引用也无法转义，并且编译器可以安全地在堆栈上分配这两个对象。

## 示例（方案）

在下面的示例中，向量 *p* 不会逃逸到 *g*，因此可以在堆栈上分配它，然后在调用 *g* 之前将其从堆栈中删除。

（定义 (f x)
   (让 ((p (make-向量 10000)))
      （用好东西填充向量 p）
      (g (向量参考 p 7023))))

然而，如果我们有

（定义 (f x)
   (让 ((p (make-向量 10000)))
      （用好东西填充向量 p）
      (gp)))

那么要么 *p* 需要在堆上分配，要么（如果 *f* 编译时编译器知道 *g* 并且表现良好）在堆栈上分配，以便在调用 *g* 时它可以保留在适当的位置。

如果使用延续来实现类似异常的控制结构，则转义分析通常可以检测到这一点，以避免必须实际分配延续并将调用堆栈复制到其中。例如，在

**读取用户输入的方案对象。如果它们都是数字，****返回一个列表，其中按顺序包含所有这些内容。如果用户输入****不是数字，立即返回#f。**
（定义（获取数字列表）
  (call/cc(lambda(继续)
    （定义（获取数字）
       （让（（下一个对象（读取）））
          （条件
             ((eof-对象？下一个对象) '())
             ((数字？下一个对象) (cons 下一个对象 (获取数字)))
（否则（继续#f）））））
    （获取数字））））

逃逸分析将确定 *call/cc* 捕获的延续没有逃逸，因此不需要分配延续结构，并且可以通过展开堆栈来实现通过调用 *Contination* 来调用延续。

## 参见

- [别名分析](https://en.wikipedia.org/wiki/Alias_analysis)
- [指针分析](https://en.wikipedia.org/wiki/Pointer_analysis)
- [形状分析](https://en.wikipedia.org/wiki/Shape_analysis_(program_analysis))

## 参考

<参考文献/>
