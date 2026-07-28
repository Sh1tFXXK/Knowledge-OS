# 虚拟机

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Virtual_machine)  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

* 在窗口中运行 [Haiku](https://en.wikipedia.org/wiki/Haiku_(operating_system)) 操作系统]]

在[计算](https://en.wikipedia.org/wiki/computing)中，**虚拟机**(**VM**)是[计算机系统](https://en.wikipedia.org/wiki/computer_system)的[虚拟化](https://en.wikipedia.org/wiki/virtualization)或[仿真](https://en.wikipedia.org/wiki/emulator)。  虚拟机基于[计算机体系结构](https://en.wikipedia.org/wiki/computer_architecture)，并提供物理计算机的功能。它们的实现可能涉及专用硬件、软件或两者的组合。
虚拟机各不相同，并按其功能进行组织，如下所示：

- *[系统虚拟机](https://en.wikipedia.org/wiki/System_virtual_machine)*（也称为[完全虚拟化](https://en.wikipedia.org/wiki/full_virtualization) VM，或 SysVM）提供真实机器的替代品。它们提供执行整个[操作系统](https://en.wikipedia.org/wiki/operating_system)所需的功能。 [虚拟机管理程序](https://en.wikipedia.org/wiki/hypervisor) 使用[本机执行](https://en.wikipedia.org/wiki/native_code) 来共享和管理硬件，允许多个环境彼此隔离但存在于同一台物理计算机上。现代虚拟机管理程序使用硬件辅助虚拟化，主机 [CPU](https://en.wikipedia.org/wiki/CPU) 上的虚拟化特定硬件功能为虚拟机管理程序提供帮助。
- *[进程虚拟机](https://en.wikipedia.org/wiki/Process_virtual_machine)* 旨在在独立于平台的环境中执行计算机程序。

一些虚拟机模拟器，例如 [QEMU](https://en.wikipedia.org/wiki/QEMU) 和 [视频游戏控制台模拟器](https://en.wikipedia.org/wiki/video_game_console_emulator)，也被设计为模拟（或“虚拟模仿”）不同的系统架构，从而允许执行为其他 CPU 或架构编写的软件应用程序和操作系统。 [操作系统级虚拟化](https://en.wikipedia.org/wiki/OS-level_virtualization)允许通过[内核](https://en.wikipedia.org/wiki/Kernel_(operating_system))对计算机的资源进行分区。这些术语不能普遍互换。

---

## 定义

### 系统虚拟机

主入口：[系统虚拟机](https://en.wikipedia.org/wiki/System_virtual_machine)
参见：[硬件虚拟化](https://en.wikipedia.org/wiki/Hardware_virtualization)

“虚拟机”最初由 Popek 和 Goldberg 定义为“真实计算机的高效、独立的复制品”。当前使用的虚拟机与任何真实硬件没有直接对应关系。运行虚拟机的物理“现实世界”硬件通常称为“主机”，而在该计算机上模拟的虚拟机通常称为“来宾”。主机可以模拟多个来宾，每个来宾可以模拟不同的[操作系统](https://en.wikipedia.org/wiki/Operating_system)和硬件平台。

运行多个操作系统的愿望是虚拟机的最初动机，以便允许多个单任务操作系统之间的分时。在某些方面，系统虚拟机可以被认为是历史上之前的虚拟内存概念的概括。 IBM 的 [CP/CMS](https://en.wikipedia.org/wiki/CP%2FCMS) 是第一个允许[完全虚拟化](https://en.wikipedia.org/wiki/full_virtualization)的系统，通过为每个用户提供一个单用户操作系统（[Conversational Monitor]）来实现[时间共享](https://en.wikipedia.org/wiki/time_sharing)系统](https://en.wikipedia.org/wiki/Conversational_Monitor_System) (CMS)。与虚拟内存不同，系统虚拟机授权用户在其代码中写入特权指令。这种方法具有一定的优点，例如添加标准系统不允许的输入/输出设备。

随着虚拟内存技术的发展以达到虚拟化的目的，新的内存过量分配系统可用于管理一个计算机操作系统上多个虚拟机之间的内存共享。可以在同一台物理机上运行的多个虚拟机之间共享具有相同内容的“内存页”，这可能会导致通过称为“内核相同页合并”(https://en.wikipedia.org/wiki/kernel_same-page_merging) (KSM) 的技术将它们映射到同一物理页。这对于只读页面尤其有用，例如那些保存代码段的页面，这是运行相同或相似软件、软件库、Web 服务器、[中间件](https://en.wikipedia.org/wiki/middleware)组件等的多个虚拟机的情况。来宾操作系统不需要与主机硬件兼容，因此可以在同一台计算机上运行不同的操作系统（例如， [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows)、[Linux](https://en.wikipedia.org/wiki/Linux) 或操作系统的早期版本）以支持未来的软件。

使用虚拟机来支持单独的客户操作系统在[嵌入式系统](https://en.wikipedia.org/wiki/embedded_system)方面很流行。典型的用途是与首选的复杂操作系统（例如 Linux 或 Windows）同时运行[实时操作系统](https://en.wikipedia.org/wiki/real-time_operating_system)。另一种用途是用于仍处于开发阶段的新颖且未经验证的软件，因此它在[沙箱](https://en.wikipedia.org/wiki/Sandbox_(software_development))内运行。虚拟机对于操作系统开发还有其他优势，可能包括改进的调试访问和更快的重新启动。

运行自己的来宾操作系统的多个虚拟机经常用于服务器整合。

### 处理虚拟机

应用虚拟机
参见：[应用虚拟化软件比较](https://en.wikipedia.org/wiki/Comparison_of_application_virtualization_software)
主要入口：[P-code machine](https://en.wikipedia.org/wiki/P-code_machine)

**进程虚拟机**，有时称为“应用程序虚拟机”或“托管运行时环境”(MRE)，在主机操作系统内作为普通应用程序运行并支持单个进程。它在该进程启动时创建，并在该进程关闭时删除。其目的是提供一个独立于平台的编程环境，抽象出底层硬件或操作系统的细节，并允许程序在任何平台上以相同的方式执行。

进程VM提供了[高级编程语言](https://en.wikipedia.org/wiki/high-level_programming_language)的高级抽象（与系统VM的低级ISA抽象相比）。进程虚拟机是使用[解释器](https://en.wikipedia.org/wiki/Interpreter_(computing))实现的；通过使用[即时编译](https://en.wikipedia.org/wiki/just-in-time_compilation)可以实现与编译型编程语言相当的性能。

这种类型的VM随着[Java编程语言](https://en.wikipedia.org/wiki/Java_(programming_language))而变得流行，它是使用[Java虚拟机](https://en.wikipedia.org/wiki/Java_virtual_machine)实现的。其他示例包括 [Parrot 虚拟机](https://en.wikipedia.org/wiki/Parrot_virtual_machine) 和 [.NET Framework](https://en.wikipedia.org/wiki/.NET_Framework)，它在名为 [公共语言运行时](https://en.wikipedia.org/wiki/Common_Language_Runtime) 的 VM 上运行。它们都可以充当任何计算机语言的[抽象层](https://en.wikipedia.org/wiki/abstraction_layer)。

进程虚拟机的一个特例是对（可能异构的）[计算机集群](https://en.wikipedia.org/wiki/computer_cluster)的通信机制进行抽象的系统。这样的VM并不由单个进程组成，而是由集群中的每台物理机一个进程组成。它们旨在通过让程序员专注于算法而不是互连和操作系统提供的通信机制来简化并发应用程序的编程任务。它们不会隐藏发生通信的事实，因此不会尝试将集群呈现为一台机器。

与其他进程虚拟机不同，这些系统不提供特定的编程语言，而是嵌入现有的语言中；通常，这样的系统提供多种语言的绑定（例如，[C](https://en.wikipedia.org/wiki/C_(programming_language)) 和 [Fortran](https://en.wikipedia.org/wiki/Fortran)）。例如[并行虚拟机](https://en.wikipedia.org/wiki/Parallel_Virtual_Machine) (PVM) 和[消息传递接口](https://en.wikipedia.org/wiki/Message_Passing_Interface) (MPI)。

## 历史

请参阅：[CP/CMS 的历史](https://en.wikipedia.org/wiki/History_of_CP%2FCMS)

系统虚拟机和进程虚拟机都可以追溯到 20 世纪 60 年代，并且仍然是积极开发的领域。

*系统虚拟机*源自[分时](https://en.wikipedia.org/wiki/time-sharing)，特别是在[兼容分时系统](https://en.wikipedia.org/wiki/Compatible_Time-Sharing_System) (CTSS) 中实现。分时允许多个用户同时使用一台计算机（https://en.wikipedia.org/wiki/Concurrent_computing）：每个程序似乎都可以完全访问机器，但同时只执行一个程序，系统以时间片在程序之间切换，每次保存和恢复状态。这演变成虚拟机，特别是通过 IBM 的研究系统：[M44/44X](https://en.wikipedia.org/wiki/IBM_M44%2F44X)，它使用[部分虚拟化](https://en.wikipedia.org/wiki/partial_virtualization)，以及 [CP-40](https://en.wikipedia.org/wiki/IBM_CP-40) 和[SIMMON](https://en.wikipedia.org/wiki/SIMMON)，它使用[完全虚拟化](https://en.wikipedia.org/wiki/full_virtualization)，并且是[管理程序](https://en.wikipedia.org/wiki/hypervisor)的早期示例。第一个广泛使用的虚拟机架构是 [CP-67](https://en.wikipedia.org/wiki/CP-67)/CMS（有关详细信息，请参阅[CP/CMS 的历史](https://en.wikipedia.org/wiki/History_of_CP%2FCMS)）。一个重要的区别是在一个主机系统上使用多个虚拟机进行分时（如 M44/44X 和 CP-40），以及在主机系统上使用一个虚拟机进行原型设计（如 SIMMON）。 [模拟器](https://en.wikipedia.org/wiki/Emulator) 对早期系统进行硬件模拟以实现兼容性，其历史可以追溯到 1963 年的 [IBM System/360](https://en.wikipedia.org/wiki/IBM_System%2F360)，而软件模拟（当时称为“模拟”）则早于它。

*进程虚拟机*最初是作为[中间语言](https://en.wikipedia.org/wiki/intermediate_language)的抽象平台而出现的，用作[编译器](https://en.wikipedia.org/wiki/compiler)程序的[中间表示](https://en.wikipedia.org/wiki/intermediate_representation)；早期的例子可以追溯到 1964 年左右，[META II](https://en.wikipedia.org/wiki/META_II) 编译器编写系统使用它来进行语法描述和目标代码生成。 1966 年一个著名的例子是 [O-code machine](https://en.wikipedia.org/wiki/O-code_machine)，这是一个执行由 [前端](https://en.wikipedia.org/wiki/Compiler#Front_end) 发出的 [O-code](https://en.wikipedia.org/wiki/O-code)（目标代码）的虚拟机。 [BCPL](https://en.wikipedia.org/wiki/BCPL) 编译器。这种抽象允许编译器通过实现新的后端（https://en.wikipedia.org/wiki/Compiler#Back_end）轻松移植到新的架构，该后端采用现有的 O 代码并将其编译为底层物理机的机器代码。 [Euler](https://en.wikipedia.org/wiki/Euler_(programming_language)) 语言使用了类似的设计，中间语言名为 *P*（可移植）。这在 1970 年左右由 [Pascal](https://en.wikipedia.org/wiki/Pascal_(programming_language)) 普及，特别是在 [Pascal-P](https://en.wikipedia.org/wiki/Pascal-P) 系统 (1973) 和 [Pascal-S](https://en.wikipedia.org/wiki/Pascal-S) 编译器 (1975) 中，其中它是称为 [p-code](https://en.wikipedia.org/wiki/p-code_machine)，生成的机器称为 [p-code machine](https://en.wikipedia.org/wiki/p-code_machine)。这具有影响力，并且这种意义上的虚拟机通常被称为 p 代码机。除了作为中间语言之外，Pascal p 代码还可以由实现虚拟机的解释器直接执行，特别是在 [UCSD Pascal](https://en.wikipedia.org/wiki/UCSD_Pascal) (1978) 中；这影响了后来的解释器，特别是 [Java 虚拟机](https://en.wikipedia.org/wiki/Java_virtual_machine) (JVM)。另一个早期的例子是 [SNOBOL4](https://en.wikipedia.org/wiki/SNOBOL4) (1967)，它是用 SNOBOL 实现语言 (SIL) 编写的，这是一种虚拟机的汇编语言，然后通过[宏汇编器](https://en.wikipedia.org/wiki/macro_assembler) 转译到其本机汇编器，将其定位到物理机。然而，此后宏已经失宠，因此这种方法的影响力较小。进程虚拟机是实现早期微型计算机软件的一种流行方法，包括 [Tiny BASIC](https://en.wikipedia.org/wiki/Tiny_BASIC#Implementation_in_a_virtual_machine) 和冒险游戏，从一次性实现如 [Pyramid 2000](https://en.wikipedia.org/wiki/Pyramid_2000) 到通用引擎如[Infocom](https://en.wikipedia.org/wiki/Infocom) 的 [z-machine](https://en.wikipedia.org/wiki/z-machine)，[Graham Nelson](https://en.wikipedia.org/wiki/Graham_Nelson) 认为“可能是有史以来最便携的虚拟机”。

[Smalltalk](https://en.wikipedia.org/wiki/Smalltalk)-80 的实施取得了重大进展，
特别是 Deutsch/Schiffmann 实现
这推动了[即时（JIT）编译](https://en.wikipedia.org/wiki/just-in-time_compilation)作为一种使用进程虚拟机的实现方法。
后来著名的 Smalltalk VM 是 [VisualWorks](https://en.wikipedia.org/wiki/VisualWorks)、[Squeak 虚拟机](https://en.wikipedia.org/wiki/Squeak_Virtual_Machine)、
和 [Strongtalk](https://en.wikipedia.org/wiki/Strongtalk)。
产生大量虚拟机创新的相关语言是[Self](https://en.wikipedia.org/wiki/Self_(programming_language))编程语言，它开创了[自适应优化](https://en.wikipedia.org/wiki/adaptive_optimization)和[世代垃圾]集合](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC))。 1999 年，这些技术在 [HotSpot](https://en.wikipedia.org/wiki/HotSpot) Java 虚拟机中获得了商业上的成功。其他创新包括基于寄存器的虚拟机，以更好地匹配底层硬件，而不是基于堆栈的虚拟机，后者更接近编程语言； 1995 年，这是由 [Limbo](https://en.wikipedia.org/wiki/Limbo_(programming_language)) 语言的 [Dis 虚拟机](https://en.wikipedia.org/wiki/Dis_virtual_machine) 首创。

## 虚拟化技术

主要入口：[全虚拟化](https://en.wikipedia.org/wiki/Full_virtualization)

### 全虚拟化

在完全虚拟化中，虚拟机模拟足够的硬件，以允许未修改的“来宾”操作系统（为相同的[指令集](https://en.wikipedia.org/wiki/instruction_set)设计的操作系统）独立运行。此方法于 1966 年由 IBM [CP-40](https://en.wikipedia.org/wiki/CP-40) 和 [CP-67](https://en.wikipedia.org/wiki/CP-67) 首创，它们是 [VM](https://en.wikipedia.org/wiki/VM_(operating_system)) 系列的前身。

大型机领域之外的示例包括 [Parallels Workstation](https://en.wikipedia.org/wiki/Parallels_Workstation)、[Parallels Desktop for Mac](https://en.wikipedia.org/wiki/Parallels_Desktop_for_Mac)、[VirtualBox](https://en.wikipedia.org/wiki/VirtualBox)、[Virtual Iron](https://en.wikipedia.org/wiki/Virtual_Iron)、[Oracle VM](https://en.wikipedia.org/wiki/Oracle_VM)、[虚拟 PC](https://en.wikipedia.org/wiki/Microsoft_Virtual_PC)、[虚拟服务器](https://en.wikipedia.org/wiki/Microsoft_Virtual_Server)、 [Hyper-V](https://en.wikipedia.org/wiki/Hyper-V)、[VMware Fusion](https://en.wikipedia.org/wiki/VMware_Fusion)、[VMware Workstation](https://en.wikipedia.org/wiki/VMware_Workstation)、[VMware Server](https://en.wikipedia.org/wiki/VMware_Server)（已停产，以前称为 GSX Server）、[VMware ESXi](https://en.wikipedia.org/wiki/VMware_ESXi)、[QEMU](https://en.wikipedia.org/wiki/QEMU)、Adeos、Mac-on-Linux、Win4BSD、[Win4Lin Pro](https://en.wikipedia.org/wiki/Win4Lin) 和 Egenera vBlade 技术。

#### 硬件辅助虚拟化

主要入口：[硬件辅助虚拟化](https://en.wikipedia.org/wiki/Hardware-auxiliary_virtualization)

在硬件辅助虚拟化中，硬件提供架构支持，有助于构建虚拟机监视器并允许来宾操作系统独立运行。
硬件辅助虚拟化于 1972 年首次在 IBM System/370 上引入，与 [VM/370](https://en.wikipedia.org/wiki/VM_(operating_system)) 一起使用，这是 IBM 作为官方产品提供的第一个虚拟机操作系统。

2005 年和 2006 年，[Intel](https://en.wikipedia.org/wiki/Intel) 和 [AMD](https://en.wikipedia.org/wiki/Advanced_Micro_Devices) 提供了额外的硬件来支持虚拟化。 Sun Microsystems（被 [Oracle Corporation](https://en.wikipedia.org/wiki/Oracle_Corporation) 收购）于 2005 年在其 [UltraSPARC T 系列](https://en.wikipedia.org/wiki/SPARC_T3) 处理器中添加了类似的功能。适应此类硬件的虚拟化平台示例包括 [KVM](https://en.wikipedia.org/wiki/Kernel-based_Virtual_Machine)、 [VMware Workstation](https://en.wikipedia.org/wiki/VMware_Workstation)、[VMware Fusion](https://en.wikipedia.org/wiki/VMware_Fusion)、[Hyper-V](https://en.wikipedia.org/wiki/Hyper-V)、[Windows 虚拟 PC](https://en.wikipedia.org/wiki/Windows_Virtual_PC)、 [Xen](https://en.wikipedia.org/wiki/Xen)、[Parallels Desktop for Mac](https://en.wikipedia.org/wiki/Parallels_Desktop_for_Mac)、[Oracle VM Server for SPARC](https://en.wikipedia.org/wiki/Oracle_VM_Server_for_SPARC)、[VirtualBox](https://en.wikipedia.org/wiki/VirtualBox) 和 [Parallels工作站](https://en.wikipedia.org/wiki/Parallels_Workstation)。

2006 年，人们发现第一代 32 位和 64 位 x86 硬件支持很少能提供优于软件虚拟化的性能优势。

### 操作系统级虚拟化

主要入口：[操作系统级虚拟化](https://en.wikipedia.org/wiki/OS-level_virtualization)

在操作系统级虚拟化中，物理服务器在操作系统级别进行虚拟化，使得多个隔离且安全的虚拟化服务器可以在单个物理服务器上运行。  “来宾”操作系统环境与主机系统共享相同的操作系统运行实例。  因此，相同的[操作系统内核](https://en.wikipedia.org/wiki/operating_system_kernel)也用于实现“来宾”环境，并且在给定“来宾”环境中运行的应用程序将其视为独立系统。先驱的实现是[FreeBSD监狱](https://en.wikipedia.org/wiki/FreeBSD_jail)；其他示例包括 [Docker](https://en.wikipedia.org/wiki/Docker_(software))、[Solaris Containers](https://en.wikipedia.org/wiki/Solaris_Containers)、[OpenVZ](https://en.wikipedia.org/wiki/OpenVZ)、[Linux-VServer](https://en.wikipedia.org/wiki/Linux-VServer)、 [LXC](https://en.wikipedia.org/wiki/LXC)、AIX [工作负载分区](https://en.wikipedia.org/wiki/Workload_Partitions)、Parallels Virtuozzo Containers 和 iCore 虚拟帐户。

## 快照

主条目：[快照（计算机存储）](https://en.wikipedia.org/wiki/Snapshot_(computer_storage))
*快照*是虚拟机及其存储设备在某个确切时间点的状态。快照使虚拟机在快照时的状态能够在以后恢复，从而有效地撤消之后发生的任何更改。此功能可用作备份技术，例如在执行有风险的操作之前。

虚拟机经常使用[虚拟磁盘](https://en.wikipedia.org/wiki/Disk_image#Virtualization)进行存储；在一个非常简单的示例中，用 10 GB [平面文件](https://en.wikipedia.org/wiki/flat_file) 模拟 10 GB [硬盘驱动器](https://en.wikipedia.org/wiki/hard_disk_drive)。 VM对其物理磁盘上的某个位置的任何请求都会透明地转换为对相应文件的操作。然而，一旦存在这样的转换层，就可以拦截操作并将它们发送到不同的文件，具体取决于各种标准。每次拍摄快照时，都会创建一个新文件，并用作其前身的覆盖。新数据写入最顶层的覆盖层；然而，读取现有数据需要扫描覆盖层次结构，从而访问最新版本。因此，整个快照堆栈实际上是一个一致的磁盘；从这个意义上说，创建快照的工作原理与[增量备份](https://en.wikipedia.org/wiki/incremental_backup)技术类似。

虚拟机的其他组件也可以包含在快照中，例如其随机存取内存 (RAM)、BIOS 设置或其配置设置的内容。  [视频游戏控制台模拟器](https://en.wikipedia.org/wiki/Video_game_console_emulator)中的“[保存状态](https://en.wikipedia.org/wiki/Save_state)”功能就是此类快照的一个示例。

恢复快照包括丢弃或忽略在该快照之后添加的所有覆盖层，并将所有新更改定向到新覆盖层。

## 迁移

主条目：[迁移（虚拟化）](https://en.wikipedia.org/wiki/Migration_(virtualization))
上述快照可以移动到另一台拥有自己的虚拟机管理程序的主机上；当虚拟机暂时停止、拍摄快照、移动然后在新主机上恢复时，这称为迁移。  如果较旧的快照定期保持同步，则此操作可能会非常快，并且允许虚拟机在其先前的物理主机（例如，因物理维护而停机）时提供不间断的服务。

## 故障转移

主条目：[Failover](https://en.wikipedia.org/wiki/Failover)
与上述迁移机制类似，故障转移允许虚拟机在主机出现故障时继续运行。通常，如果迁移停止工作，就会发生这种情况。然而，在这种情况下，虚拟机根据备份服务器上次提供的任何材料，从“最后已知”一致状态而不是“当前”状态继续操作。

## 嵌套虚拟化

嵌套虚拟化是指在另一个虚拟机中运行虚拟机的能力，这一一般概念可扩展到任意深度。  换句话说，嵌套虚拟化是指在另一个虚拟机管理程序中运行一个或多个虚拟机管理程序。嵌套客户虚拟机的性质不需要与其主机虚拟机相同；例如，[应用程序虚拟化](https://en.wikipedia.org/wiki/application_virtualization)可以部署在使用[硬件虚拟化](https://en.wikipedia.org/wiki/hardware_virtualization)创建的虚拟机中。

随着广泛的操作系统获得内置虚拟机管理程序功能，嵌套虚拟化变得更加必要，在虚拟化环境中，只有周围的虚拟机管理程序支持嵌套虚拟化，才能使用该功能；例如，[Windows 7](https://en.wikipedia.org/wiki/Windows_7)能够在内置虚拟机中运行[Windows XP](https://en.wikipedia.org/wiki/Windows_XP)应用程序。  此外，如果目标 IaaS 平台不支持嵌套虚拟化，则按照基础设施即服务 (IaaS) 方法将现有的虚拟化环境迁移到云中会变得更加复杂。

在特定的[计算机体系结构](https://en.wikipedia.org/wiki/computer_architecture)上实现嵌套虚拟化的方式取决于支持的[硬件辅助虚拟化](https://en.wikipedia.org/wiki/hardware-assistance_virtualization)功能。  如果特定的体系结构不提供嵌套虚拟化所需的硬件支持，则可以采用各种软件技术来实现它。  随着时间的推移，更多的架构获得了所需的硬件支持；例如，自 [Haswell](https://en.wikipedia.org/wiki/Haswell_(microarchitecture)) 微架构（2013 年发布）以来，英特尔开始将 [VMCS 阴影](https://en.wikipedia.org/wiki/VMCS_shadowing) 作为加速嵌套虚拟化的技术。

## 安全

主条目：[Compartmentalization（信息安全）#Security Architecture](https://en.wikipedia.org/wiki/Compartmentalization_(information_security)#Security_Architecture)

架构设计图显示了 Firefox 或 Thunderbird（在 AppVM 1 中）的泄露如何不会导致用户的 KeePass [密码管理器](https://en.wikipedia.org/wiki/Password_manager)（在 AppVM 2 中）受到泄露，因为设计使用不同的 VM 来获得分区架构。]]

为了安全起见，虚拟机经常用于将应用程序彼此隔离。

这种架构设计（由 [Qubes OS](https://en.wikipedia.org/wiki/Qubes_OS)、[Whonix](https://en.wikipedia.org/wiki/Whonix)、[KickSecure](https://en.wikipedia.org/wiki/KickSecure) 和 Dangerzone 使用）可以防止恶意软件从一个受感染的系统（例如 [电子邮件] 传播）客户端](https://en.wikipedia.org/wiki/email_client) 将[受感染的文档](https://en.wikipedia.org/wiki/Microsoft_Word#Macros))打开到另一个系统（例如[密码管理器](https://en.wikipedia.org/wiki/password_manager)）。

## 参见

- [亚马逊机器映像](https://en.wikipedia.org/wiki/Amazon_Machine_Image)
- [桌面虚拟化](https://en.wikipedia.org/wiki/Desktop_virtualization)
- [Linux 容器](https://en.wikipedia.org/wiki/Linux_containers)
- [本机开发套件](https://en.wikipedia.org/wiki/Native_development_kit)
- [半虚拟化](https://en.wikipedia.org/wiki/Paravirtualization)
- [存储管理程序](https://en.wikipedia.org/wiki/Storage_hypervisor)
- [通用图灵机](https://en.wikipedia.org/wiki/Universal_Turing_machine)
- [虚拟设备](https://en.wikipedia.org/wiki/Virtual_appliance)
- [虚拟备份设备](https://en.wikipedia.org/wiki/Virtual_backup_appliance)
- [虚拟磁盘映像](https://en.wikipedia.org/wiki/Virtual_disk_image)
- [虚拟 DOS 机](https://en.wikipedia.org/wiki/Virtual_DOS_machine) (VDM)
- [虚拟机逃逸](https://en.wikipedia.org/wiki/Virtual_machine_escape)
- [虚拟专用服务器](https://en.wikipedia.org/wiki/Virtual_private_server)

## 参考

## 进一步阅读

- James E. Smith、Ravi Nair，*虚拟机：系统和流程的多功能平台*，Morgan Kaufmann，2005 年 5 月，ISBN：1-55860-910-5，656 页（涵盖流程和系统虚拟机）
- Craig, Iain D. *虚拟机*。 [Springer](https://en.wikipedia.org/wiki/Springer_Science%2BBusiness_Media), 2006, ISBN: 1-85233-969-1, 269 页（仅涵盖进程虚拟机）

## 外部链接

- 虚拟机的转世（Mendel Rosenblum，2004 年 8 月 31 日）
- [桑迪亚国家实验室运行 100 万个 Linux 内核作为虚拟机](http://www.net-security.org/secworld.php?id=7837)
- [Phil Winterbottom 和 Rob Pike 设计的 Inferno 虚拟机](http://doc.cat-v.org/inferno/4th_edition/dis_VM_design)
