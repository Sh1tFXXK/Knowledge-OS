# 数据库

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Database)  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

关于：[计算概念](https://en.wikipedia.org/wiki/the_computing_concept)

select 语句及其结果|upright=1.35]]

在[计算](https://en.wikipedia.org/wiki/computing)中，**数据库**是基于使用**数据库管理系统**(**DBMS**)的[数据](https://en.wikipedia.org/wiki/Data_(computing))或一种[数据存储](https://en.wikipedia.org/wiki/data_store)的有组织的集合， [软件](https://en.wikipedia.org/wiki/software)，与[最终用户](https://en.wikipedia.org/wiki/end_user)、[应用程序](https://en.wikipedia.org/wiki/Application_software)和数据库本身交互以捕获和分析数据。 DBMS 另外还包含用于管理数据库的核心设施。数据库、DBMS 和相关应用程序的总和可以称为**数据库系统**。通常，术语“数据库”也被宽松地用来指任何 DBMS、数据库系统或与数据库关联的应用程序。

小型数据库可以存储在[文件系统](https://en.wikipedia.org/wiki/file_system)上，而大型数据库则托管在[计算机集群](https://en.wikipedia.org/wiki/computer_clusters)或[云存储](https://en.wikipedia.org/wiki/cloud_storage)上。 [数据库设计](https://en.wikipedia.org/wiki/Database_design)跨越形式技术和实际考虑，包括[数据建模](https://en.wikipedia.org/wiki/data_modeling)、高效数据表示和存储、[查询语言](https://en.wikipedia.org/wiki/query_language)、[安全](https://en.wikipedia.org/wiki/Database_security)和敏感数据的[隐私](https://en.wikipedia.org/wiki/Information_privacy)和[分布式计算](https://en.wikipedia.org/wiki/distributed_computing)问题，包括支持[并发](https://en.wikipedia.org/wiki/concurrent_computing)访问和[容错](https://en.wikipedia.org/wiki/fault_tolerance)。

[计算机科学家](https://en.wikipedia.org/wiki/Computer_scientists)可以根据他们支持的[数据库模型](https://en.wikipedia.org/wiki/database_model)对数据库管理系统进行分类。 [关系数据库](https://en.wikipedia.org/wiki/Relational_database) 在 20 世纪 80 年代占据主导地位。这些模型数据作为一系列[表](https://en.wikipedia.org/wiki/Table_(database))中的[行](https://en.wikipedia.org/wiki/Row_(database))和[列](https://en.wikipedia.org/wiki/Column_(database))，并且绝大多数使用[SQL](https://en.wikipedia.org/wiki/SQL)来写入和查询数据。 2000年代，非关系型数据库开始流行，统称为NoSQL，因为它们使用不同的查询语言。

---

## 术语

从形式上来说，**数据库**是指通过使用**数据库管理系统**（DBMS）访问的一组相关数据，它是一套集成的[计算机软件](https://en.wikipedia.org/wiki/computer_software)，允许[用户](https://en.wikipedia.org/wiki/user_(computing))与一个或多个数据库交互，并提供对数据库中包含的所有数据的访问（尽管可能存在限制对特定访问的限制）数据）。 DBMS 提供了允许输入、存储和检索大量信息的各种功能，并提供了管理信息组织方式的方法。

由于它们之间的密切关系，术语“数据库”经常被随意使用来指代数据库和用于操作数据库的 DBMS。

在专业[信息技术](https://en.wikipedia.org/wiki/information_technology)领域之外，术语**数据库**通常用于指代任何相关数据的集合（例如[电子表格](https://en.wikipedia.org/wiki/spreadsheet)或卡片索引），因为大小和使用要求通常需要使用数据库管理系统。Ullman

现有的 DBMS 提供了允许管理数据库及其数据的各种功能。 *数据定义*需要创建、修改和删除数据库中指定数据组织的结构。 *更新*包括数据本身的插入、修改和删除。 *检索*是根据指定标准选择数据。数据库*管理*涉及注册用户、强制数据安全、监控性能、维护数据完整性、处理并发控制以及恢复损坏的信息。

数据库及其 DBMS 都符合特定的[数据库模型](https://en.wikipedia.org/wiki/database_model) 的原理。Tsitchizris**数据库系统**统指数据库模型、数据库管理系统和数据库。Beynon-Davies

从物理上讲，数据库[服务器](https://en.wikipedia.org/wiki/Server_(computing))是保存实际数据库并仅运行DBMS和相关软件的专用计算机。

数据库和 DBMS 可以根据它们支持的数据库模型（例如[关系](https://en.wikipedia.org/wiki/Relational_database)或[XML](https://en.wikipedia.org/wiki/XML)）、它们运行的计算机类型（从[服务器集群](https://en.wikipedia.org/wiki/server_cluster)到[移动设备]进行分类。电话](https://en.wikipedia.org/wiki/mobile_phone))、用于访问数据库的[查询语言](https://en.wikipedia.org/wiki/query_language)（例如 SQL 或 [XQuery](https://en.wikipedia.org/wiki/XQuery)）及其内部工程，这会影响性能、[可扩展性](https://en.wikipedia.org/wiki/scalability)、弹性和安全性。

## 历史

数据库及其各自的 DBMS 的大小、功能和性能已呈数量级增长。这些性能的提升得益于[处理器](https://en.wikipedia.org/wiki/Central_processing_unit)、[计算机内存](https://en.wikipedia.org/wiki/computer_memory)、[计算机存储](https://en.wikipedia.org/wiki/computer_storage)和[计算机网络](https://en.wikipedia.org/wiki/computer_network)领域的技术进步。数据库的概念因直接访问[存储介质](https://en.wikipedia.org/wiki/storage_media)的出现而成为可能，例如[磁盘](https://en.wikipedia.org/wiki/Hard_disk_drive)，这种介质在20世纪60年代中期广泛使用；早期的系统依赖于[磁带](https://en.wikipedia.org/wiki/tropical_tape)上的数据顺序存储。随后的数据库技术发展根据数据模型或结构可以分为三个时代：[导航](https://en.wikipedia.org/wiki/navigational_database)、Bachman SQL/[关系](https://en.wikipedia.org/wiki/relational_database)和后关系型。

两个主要的早期导航[数据模型](https://en.wikipedia.org/wiki/data_model)是[层次模型](https://en.wikipedia.org/wiki/hierarchical_model)和[CODASYL](https://en.wikipedia.org/wiki/CODASYL)模型([网络模型](https://en.wikipedia.org/wiki/network_model))。这些的特点是使用[指针](https://en.wikipedia.org/wiki/Pointer_(computer_programming))（通常是物理磁盘地址）来跟踪从一个记录到另一个记录的关系。

[关系模型](https://en.wikipedia.org/wiki/relational_model)由[Edgar F. Codd](https://en.wikipedia.org/wiki/Edgar_F._Codd)于1970年首次提出，它坚持[应用程序](https://en.wikipedia.org/wiki/Application_software)应该按内容搜索数据，而不是通过链接搜索数据，从而背离了这一传统。关系模型采用一组分类帐样式的表，每个表用于不同类型的[实体](https://en.wikipedia.org/wiki/entity)。直到 20 世纪 80 年代中期，计算硬件才变得强大到足以允许关系系统（DBMS 加上应用程序）的广泛部署。然而，到了 20 世纪 90 年代初，关系系统在所有大规模[数据处理](https://en.wikipedia.org/wiki/data_processing)应用程序中占据主导地位，并且仍然占据主导地位：[IBM Db2](https://en.wikipedia.org/wiki/IBM_Db2)、[Oracle](https://en.wikipedia.org/wiki/Oracle_database)、[MySQL](https://en.wikipedia.org/wiki/MySQL)和[Microsoft SQL Server](https://en.wikipedia.org/wiki/Microsoft_SQL_Server) 是搜索次数最多的 [DBMS](https://en.wikipedia.org/wiki/DBMS)。占主导地位的数据库语言（用于关系模型的标准化 SQL）已经影响了其他数据模型的数据库语言。

[对象数据库](https://en.wikipedia.org/wiki/Object_database)于20世纪80年代开发，旨在克服[对象关系阻抗不匹配](https://en.wikipedia.org/wiki/object%E2%80%93relational_impedance_mismatch)的不便，这导致了“后关系”一词的创造，也导致了混合[对象关系数据库]的发展数据库](https://en.wikipedia.org/wiki/object%E2%80%93relational_database)。

2000 年代末的下一代后关系数据库被称为 [NoSQL](https://en.wikipedia.org/wiki/NoSQL) 数据库，引入了快速[键值存储](https://en.wikipedia.org/wiki/key%E2%80%93value_store) 和[面向文档的数据库](https://en.wikipedia.org/wiki/document-oriented_database)。一种名为 [NewSQL](https://en.wikipedia.org/wiki/NewSQL) 的竞争性“下一代”数据库尝试了保留关系/SQL 模型的新实现，同时旨在与商用关系 DBMS 相比，实现 NoSQL 的高性能。

### 20 世纪 60 年代，导航 DBMS

延伸阅读：[导航数据库](https://en.wikipedia.org/wiki/Navigational_database)
 数据库模型]]

“数据库”一词的引入与 20 世纪 60 年代中期以来直接访问存储（磁盘和鼓）的出现同时发生。该术语与过去基于磁带的系统形成鲜明对比，允许共享交互使用而不是日常[批处理](https://en.wikipedia.org/wiki/batch_processing)。 [牛津英语词典](https://en.wikipedia.org/wiki/Oxford_English_Dictionary) 引用了加利福尼亚州[系统开发公司](https://en.wikipedia.org/wiki/System_Development_Corporation) 1962 年的一份报告，作为第一个在特定技术意义上使用“数据库”一词的报告。

随着计算机速度和性能的提高，出现了许多通用数据库系统。到 20 世纪 60 年代中期，许多此类系统已投入商业使用。人们对标准的兴趣开始增长，[集成数据存储](https://en.wikipedia.org/wiki/Integrated_Data_Store) (IDS) 的作者查尔斯·巴赫曼 (Charles Bachman)(https://en.wikipedia.org/wiki/Charles_Bachman) 在内部创建了[数据库任务组](https://en.wikipedia.org/wiki/Data_Base_Task_Group) [CODASYL](https://en.wikipedia.org/wiki/CODASYL)，负责 [COBOL](https://en.wikipedia.org/wiki/COBOL) 的创建和标准化的小组。 1971 年，数据库任务组发布了他们的标准，该标准通常被称为“CODASYL 方法”，很快，许多基于此方法的商业产品进入了市场。

CODASYL 方法为应用程序提供了导航形成大型网络的链接数据集的能力。应用程序可以通过以下三种方法之一查找记录：
1. 使用主键（称为 CALC 键，通常通过[散列](https://en.wikipedia.org/wiki/Hash_function) 实现）
2. 将关系（称为*集*）从一条记录导航到另一条记录
3. 按顺序扫描所有记录

后来的系统添加了 [B-tree](https://en.wikipedia.org/wiki/B-tree) 以提供备用访问路径。许多 CODASYL 数据库还为最终用户添加了声明性查询语言（与导航 [API](https://en.wikipedia.org/wiki/API) 不同）。然而，CODASYL 数据库非常复杂，需要大量培训和努力才能生成有用的应用程序。

[IBM](https://en.wikipedia.org/wiki/IBM) 也在 1966 年拥有了自己的 DBMS，称为[信息管理系统](https://en.wikipedia.org/wiki/Information_Management_System) (IMS)。 IMS 是为 [System/360](https://en.wikipedia.org/wiki/System%2F360) 上的 [Apollo 计划](https://en.wikipedia.org/wiki/Apollo_program) 编写的软件开发。 IMS 在概念上与 CODASYL 大致相似，但其数据导航模型使用严格的层次结构，而不是 CODASYL 的网络模型。由于数据访问方式，这两个概念后来都被称为导航数据库：该术语因巴赫曼 1973 年的[图灵奖](https://en.wikipedia.org/wiki/Turing_Award) 演讲“程序员作为导航员”而流行起来。 IMS 被 IBM 归类为[分层数据库](https://en.wikipedia.org/wiki/hierarchical_database)。 IDMS 和 [Cincom Systems](https://en.wikipedia.org/wiki/Cincom_Systems) 数据库被归类为网络数据库。 IMS 仍在使用中。

### 20 世纪 70 年代，关系型 DBMS

[Edgar F. Codd](https://en.wikipedia.org/wiki/Edgar_F._Codd) 在位于[加利福尼亚州圣何塞](https://en.wikipedia.org/wiki/San_Jose%2C_California) 的 IBM 工作，办公室主要参与[硬盘](https://en.wikipedia.org/wiki/hard_disk) 的开发Systems.rdbmsearlyyearsoh20070612 他对 CODASYL 方法的导航模型不满意，特别是缺乏“搜索”设施。 1970 年，他撰写了多篇论文，概述了一种新的数据库构建方法，最终形成了突破性的*大型共享数据库的数据关系模型*。Codd

该论文描述了一种用于存储和使用大型数据库的新系统。 Codd 的想法不是像 CODASYL 那样将记录存储在某种自由格式记录的[链接列表](https://en.wikipedia.org/wiki/linked_list)中，而是将数据组织为许多“[表](https://en.wikipedia.org/wiki/Table_(database))”，每个表用于不同类型的实体。每个表将包含固定数量的列，其中包含实体的属性。每个表的一列或多列被指定为[主键](https://en.wikipedia.org/wiki/primary_key)，通过主键可以唯一标识表的行；表之间的交叉引用始终使用这些主键，而不是磁盘地址，查询将基于这些键关系连接表，使用一组基于关系演算数学系统的操作（该模型由此得名）。将数据拆分为一组规范化表（或*关系*）旨在确保每个“事实”仅存储一次，从而简化更新操作。称为“视图”的虚拟表可以为不同的用户以不同的方式呈现数据，但视图不能直接更新。

Codd 使用数学术语来定义模型：关系、元组和域，而不是表、行和列。现在熟悉的术语来自早期的实现。科德后来批评实际实现偏离模型所依据的数学基础的趋势。

，记录使用未存储在数据库中但根据需要在记录中包含的数据之间定义的虚拟键进行“链接”。]]

使用主键（面向用户的标识符）来表示跨表关系而不是磁盘地址有两个主要动机。从工程角度来看，它使表能够重新定位和调整大小，而无需昂贵的数据库重组。但 Codd 对语义上的差异更感兴趣：显式标识符的使用使得使用干净的数学定义来定义更新操作变得更加容易，并且还使得查询操作能够根据[一阶谓词演算](https://en.wikipedia.org/wiki/first-order_predicate_calculus)的既定规则来定义；因为这些操作具有清晰的数学属性，所以可以以可证明正确的方式重写查询，这是查询优化的基础。与层次结构或网络模型相比，虽然表之间的连接不再那么明确，但表达能力没有损失。

在层次结构和网络模型中，记录被允许具有复杂的内部结构。例如，员工的工资历史记录可能表示为员工记录中的“重复组”。在关系模型中，规范化过程导致这种内部结构被多个表中保存的数据所取代，这些表仅通过逻辑键连接。

例如，数据库系统的常见用途是跟踪有关用户的信息、用户姓名、登录信息、各种地址和电话号码。在导航方法中，所有这些数据都将放置在单个可变长度记录中。在关系方法中，数据将被“规范化”为用户表、地址表和电话号码表（例如）。仅当实际提供了地址或电话号码时，才会在这些可选表中创建记录。

除了使用逻辑标识符而不是磁盘地址来标识行/记录之外，Codd 还改变了应用程序从多个记录中组装数据的方式。他们不会要求应用程序通过导航链接一次收集一条记录的数据，而是使用一种声明性查询语言来表达所需的数据，而不是找到数据的访问路径。寻找有效的数据访问路径成为数据库管理系统的责任，而不是应用程序程序员的责任。这个过程称为查询优化，取决于查询是用数学逻辑表达的。

Codd 的论文激励了多所大学的团队研究这一主题，其中包括由 [Eugene Wong](https://en.wikipedia.org/wiki/Eugene_Wong) 和 [Michael] 领导的[加州大学伯克利分校](https://en.wikipedia.org/wiki/University_of_California%2C_Berkeley)rdbmsearlyyearsoh20070612 的团队。 Stonebraker](https://en.wikipedia.org/wiki/Michael_Stonebraker)，他使用已分配给地理数据库项目和学生程序员的资金启动了 [INGRES](https://en.wikipedia.org/wiki/INGRES) 来生成代码。从 1973 年开始，INGRES 交付了第一批测试产品，并于 1979 年广泛使用。INGRES 在许多方面与 [System R](https://en.wikipedia.org/wiki/IBM_System_R) 类似，包括使用“语言”进行[数据访问](https://en.wikipedia.org/wiki/data_access)，称为[QUEL](https://en.wikipedia.org/wiki/QUEL_query_languages)。随着时间的推移，INGRES 转向了新兴的 SQL 标准。

IBM 本身对关系模型进行了一种测试实现，[PRTV](https://en.wikipedia.org/wiki/PRTV)，以及一种生产模型，[Business System 12](https://en.wikipedia.org/wiki/Business_System_12)，两者现已停产。 [Honeywell](https://en.wikipedia.org/wiki/Honeywell)为[Multics](https://en.wikipedia.org/wiki/Multics)编写了[MRDS](https://en.wikipedia.org/wiki/Multics_Relational_Data_Store)，现在有两个新的实现：[Alphora Dataphor](https://en.wikipedia.org/wiki/Dataphor)和Rel。大多数通常称为“关系型”的其他 DBMS 实现实际上是 SQL DBMS。

1970年，密歇根大学在[D.L. Childs](https://en.wikipedia.org/wiki/David_L._Childs)' 集合理论数据模型。NorthChildsChilds 该大学于 1974 年举办了 Codd 和 Bachman 之间的一场辩论，IBM 的 Bruce Lindsay 后来将其描述为“向对方投掷闪电！”。 [美国劳工部](https://en.wikipedia.org/wiki/US_Department_of_Labor)、[美国劳工部] 使用 MICRO 来管理非常大的数据集。环境保护局](https://en.wikipedia.org/wiki/U.S._Environmental_Protection_Agency)，以及来自[阿尔伯塔大学](https://en.wikipedia.org/wiki/University_of_Alberta)、[密歇根大学](https://en.wikipedia.org/wiki/University_of_Michigan)和[韦恩州立大学]的研究人员大学](https://en.wikipedia.org/wiki/Wayne_State_University)。它使用 [密歇根终端系统](https://en.wikipedia.org/wiki/Michigan_Terminal_System) 在 IBM 大型机上运行。该系统一直生产到 1998 年。

### 综合方法

主入口：[数据库机](https://en.wikipedia.org/wiki/Database_machine)

20世纪70年代和80年代，人们尝试构建硬件和软件集成的数据库系统。基本理念是这种集成将以更低的成本提供更高的性能。例如 [IBM System/38](https://en.wikipedia.org/wiki/IBM_System%2F38)、早期产品 [Teradata](https://en.wikipedia.org/wiki/Teradata) 和 [Britton Lee, Inc.](https://en.wikipedia.org/wiki/Britton_Lee%2C_Inc.) 数据库计算机。

另一种为数据库管理提供硬件支持的方法是 [ICL](https://en.wikipedia.org/wiki/International_Computers_Limited) 的 [CAFS](https://en.wikipedia.org/wiki/Content_Addressable_File_Store) 加速器，这是一种具有可编程搜索功能的硬件磁盘控制器。从长远来看，这些努力普遍不成功，因为专用数据库机无法跟上通用计算机的快速发展和进步。因此，当今大多数数据库系统都是在通用硬件上运行的软件系统，使用通用计算机数据存储。然而，一些公司（例如 [Netezza](https://en.wikipedia.org/wiki/Netezza) 和 Oracle ([Exadata](https://en.wikipedia.org/wiki/Exadata)））仍在某些应用程序中追求这种想法。

### 20 世纪 70 年代末，SQL DBMS

IBM 组建了一个由 Codd 领导的团队，尽管受到公司其他人的反对，但开始开发原型系统 *[System R](https://en.wikipedia.org/wiki/IBM_System_R)*。rdbmsearlyyearsoh20070612 第一个版本于 1974/5 准备就绪，然后开始开发多表系统，其中数据可以拆分，以便不必存储记录的所有数据（其中一些是可选的）在一个大“块”中。随后的多用户版本在 1978 年和 1979 年由客户进行了测试，当时添加了标准化的[查询语言](https://en.wikipedia.org/wiki/query_language) – SQL –。 Codd 的想法是让自己既可行又优于 CODASYL，推动 IBM 开发 System R 的真正生产版本，称为 *SQL/DS*，以及后来的 *Database 2* ([IBM Db2](https://en.wikipedia.org/wiki/IBM_Db2))。

[Larry Ellison](https://en.wikipedia.org/wiki/Larry_Ellison) 的 Oracle 数据库（或更简单地说，[Oracle](https://en.wikipedia.org/wiki/Oracle_Database)）从不同的链条开始，基于 IBM 关于 System R 的论文。尽管 Oracle V1 实现于 1978 年完成，但直到 Ellison 在 1979 年击败 IBM 推出 Oracle 版本 2 后才进入市场。

Stonebraker 继续应用 INGRES 的经验教训来开发新的数据库 Postgres，现在称为 [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL)。 PostgreSQL 通常用于全球关键任务应用程序（.org 和 .info 域名注册机构将其用作主要[数据存储](https://en.wikipedia.org/wiki/data_store)，许多大公司和金融机构也是如此）。

在瑞典，Codd 的论文也被阅读，并且 [Mimer SQL](https://en.wikipedia.org/wiki/Mimer_SQL) 于 20 世纪 70 年代中期在 [Uppsala University](https://en.wikipedia.org/wiki/Uppsala_University) 开发。 1984年，该项目被合并为独立企业。

另一种数据模型，[实体关系模型](https://en.wikipedia.org/wiki/entity%E2%80%93relationship_model)，出现于 1976 年，并因[数据库设计](https://en.wikipedia.org/wiki/database_design) 而受到欢迎，因为它强调比早期关系模型更熟悉的描述。后来，实体关系构造被改进为关系模型的数据建模构造，两者之间的差异变得无关紧要。

### 20 世纪 80 年代，在桌面上

除了 IBM 和各种软件公司如 [Sybase](https://en.wikipedia.org/wiki/Sybase) 和 [Informix Corporation](https://en.wikipedia.org/wiki/Informix_Corporation) 之外，20 世纪 80 年代大多数大型计算机硬件供应商都拥有自己的数据库系统，例如 [DEC](https://en.wikipedia.org/wiki/DEC_(company)) 的 [VAX] Rdb/VMS](https://en.wikipedia.org/wiki/VAX_Rdb%2FVMS)。这十年迎来了[桌面计算](https://en.wikipedia.org/wiki/desktop_computing)时代。新计算机为用户提供了 [Lotus 1-2-3](https://en.wikipedia.org/wiki/Lotus_1-2-3) 等电子表格和 [dBASE](https://en.wikipedia.org/wiki/dBASE) 等数据库软件。 dBASE 产品重量轻，任何计算机用户都可以轻松理解。 [C. dBASE 的创建者 Wayne Ratliff](https://en.wikipedia.org/wiki/C._Wayne_Ratliff) 表示：“dBASE 与 BASIC、C、FORTRAN 和 COBOL 等程序不同，因为许多肮脏的工作已经完成。数据操作是由 dBASE 而不是由用户完成的，因此用户可以专注于他正在做的事情，而不必纠结于打开、读取和关闭的肮脏细节。文件和管理空间分配。” dBASE 是 20 世纪 80 年代和 90 年代初最畅销的软件之一。

### 20世纪90年代，面向对象

到本世纪初，数据库在大约十年内已成为价值数十亿美元的产业。rdbmslateryears20070612 20 世纪 90 年代，随着[面向对象编程](https://en.wikipedia.org/wiki/object-oriented_programming) 的兴起，各种数据库中的数据处理方式也随之增长。程序员和设计师开始将数据库中的数据视为[对象](https://en.wikipedia.org/wiki/object_(computer_science))。也就是说，如果一个人的数据存在于数据库中，那么该人的属性（例如地址、电话号码和年龄）现在被认为属于该人，而不是无关的数据。这允许数据之间的关系与对象及其[属性](https://en.wikipedia.org/wiki/property_(programming))相关，而不是与各个字段相关。术语“[对象关系阻抗不匹配](https://en.wikipedia.org/wiki/object%E2%80%93relational_impedance_mismatch)”描述了编程对象和数据库表之间转换的不便。 [对象数据库](https://en.wikipedia.org/wiki/Object_database)和[对象关系数据库](https://en.wikipedia.org/wiki/object%E2%80%93relational_database)试图通过提供一种面向对象的语言（有时作为 SQL 的扩展）来解决这个问题，程序员可以将其用作纯关系 SQL 的替代方案。在编程方面，称为[对象关系映射](https://en.wikipedia.org/wiki/object%E2%80%93relational_mapping)s (ORM) 的库试图解决同样的问题。

### 2000 年代，NoSQL 和 NewSQL

主要条目：[NoSQL](https://en.wikipedia.org/wiki/NoSQL)

在[互联网泡沫](https://en.wikipedia.org/wiki/dotcom_bubble)期间，数据库销售额快速增长，泡沫结束后，[电子商务](https://en.wikipedia.org/wiki/ecommerce)兴起。自 2000 年以来，[开源](https://en.wikipedia.org/wiki/open_source) 数据库（例如 [MySQL](https://en.wikipedia.org/wiki/MySQL)）越来越受欢迎，以至于 Oracle 的 Ken Jacobs 在 2005 年表示，也许“这些家伙正在对我们做我们对 IBM 所做的事情”。rdbmslateryears20070612

[XML 数据库](https://en.wikipedia.org/wiki/XML_database) 是一种面向结构化文档的数据库，允许基于 [XML](https://en.wikipedia.org/wiki/XML) 文档属性进行查询。 XML 数据库主要用于将数据方便地视为文档集合的应用程序，其结构可以从非常灵活到高度严格：示例包括科学文章、专利、税务申报和人事记录。

[NoSQL](https://en.wikipedia.org/wiki/NoSQL)数据库通常非常快，不需要固定表模式，通过存储[非规范化](https://en.wikipedia.org/wiki/denormalization)数据来避免连接操作，并且被设计为[水平扩展](https://en.wikipedia.org/wiki/horizo​​ntal_scaling)。一些 NoSQL 数据库，包括图形数据库，例如 [Neo4j](https://en.wikipedia.org/wiki/Neo4j)，将数据表示为节点和边来建模实体之间的关系。

近年来，人们对高分区容错性的海量分布式数据库有强烈的需求，但根据CAP定理，分布式系统不可能同时提供一致性、可用性和分区容错性保证。分布式系统可以同时满足这些保证中的任何两个，但不能同时满足全部三个。因此，许多 NoSQL 数据库正在使用所谓的“最终一致性”(https://en.wikipedia.org/wiki/eventual_consistency) 来提供可用性和分区容错性保证，同时降低数据一致性级别。

[NewSQL](https://en.wikipedia.org/wiki/NewSQL) 是一类现代关系数据库，旨在为在线事务处理（读写）工作负载提供与 NoSQL 系统相同的可扩展性能，同时仍然使用 SQL 并保持传统数据库系统的 [ACID](https://en.wikipedia.org/wiki/ACID) 保证。

## 使用案例

数据库用于支持组织的内部运营并支持与客户和供应商的在线交互（请参阅[企业软件](https://en.wikipedia.org/wiki/Enterprise_software)）。

数据库用于保存管理信息和更专业的数据，例如工程数据或经济模型。示例包括计算机化[图书馆](https://en.wikipedia.org/wiki/library)系统、[航班预订系统](https://en.wikipedia.org/wiki/flight_reservation_system)、计算机化[零件库存系统](https://en.wikipedia.org/wiki/parts_inventory_system)以及许多[内容管理系统](https://en.wikipedia.org/wiki/content_management_system)将[网站](https://en.wikipedia.org/wiki/website)存储为数据库中的网页集合。

## 分类术语

对数据库进行分类的一种方法涉及其内容的类型，例如：[书目](https://en.wikipedia.org/wiki/bibliography_database)、文档文本、统计或多媒体对象。另一种方式是按应用领域划分，例如：会计、音乐创作、电影、银行、制造或保险。第三种方法是通过某些技术方面，例如数据库结构或接口类型。本节列出了一些用于描述不同类型数据库的形容词。

- [内存数据库](https://en.wikipedia.org/wiki/in-memory_database) 是主要驻留在[主内存](https://en.wikipedia.org/wiki/main_memory) 中的数据库，但通常由非易失性计算机数据存储进行备份。主内存数据库比磁盘数据库更快，因此通常在响应时间至关重要的地方使用，例如电信网络设备。
- [活动数据库](https://en.wikipedia.org/wiki/active_database) 包括一个事件驱动的架构，可以响应数据库内部和外部的条件。可能的用途包括安全监控、警报、统计数据收集和授权。许多数据库以[数据库触发器](https://en.wikipedia.org/wiki/database_trigger)的形式提供主动数据库功能。
- [云数据库](https://en.wikipedia.org/wiki/cloud_database)依赖于[云技术](https://en.wikipedia.org/wiki/cloud_technology)。数据库及其大部分 DBMS 都远程驻留在“云端”，而其应用程序均由程序员开发，随后由最终用户通过 [Web 浏览器](https://en.wikipedia.org/wiki/web_browser) 和 [Open API](https://en.wikipedia.org/wiki/Open_API) 进行维护和使用。
- [数据仓库](https://en.wikipedia.org/wiki/Data_warehouse)从操作数据库以及通常来自市场研究公司等外部来源的存档数据。仓库成为管理人员和其他可能无法访问运营数据的最终用户使用的中心数据源。例如，销售数据可能会汇总为每周总计，并从内部产品代码转换为使用 [UPC](https://en.wikipedia.org/wiki/Universal_Product_Code)，以便可以将它们与 [ACNielsen](https://en.wikipedia.org/wiki/ACNielsen) 数据进行比较。数据仓库的一些基本和重要组成部分包括提取、分析和[挖掘](https://en.wikipedia.org/wiki/Data_mining)数据、转换、加载和管理数据，以便使它们可供进一步使用。
- [演绎数据库](https://en.wikipedia.org/wiki/deduction_database) 将[逻辑编程](https://en.wikipedia.org/wiki/logic_programming) 与关系数据库相结合。
- [分布式数据库](https://en.wikipedia.org/wiki/distributed_database) 是一种数据和 DBMS 都跨越多台计算机的数据库。
- [面向文档的数据库](https://en.wikipedia.org/wiki/document-oriented_database) 旨在存储、检索和管理面向文档或半结构化的信息。面向文档的数据库是NoSQL数据库的主要类别之一。
- [嵌入式数据库](https://en.wikipedia.org/wiki/embedded_database)系统是与应用程序软件紧密集成的DBMS，需要以这样的方式访问存储的数据：DBMS对应用程序的最终用户隐藏，并且需要很少或不需要持续维护。
- 最终用户数据库由各个最终用户开发的数据组成。例如，文档、电子表格、演示文稿、多媒体和其他文件的集合。存在多种支持此类数据库的产品。
- [联合数据库系统](https://en.wikipedia.org/wiki/federated_database_system) 由几个不同的数据库组成，每个数据库都有自己的 DBMS。它由联合数据库管理系统 (FDBMS) 作为单个数据库进行处理，该系统透明地集成了多个可能不同类型的自治 DBMS（在这种情况下，它也将是一个[异构数据库系统](https://en.wikipedia.org/wiki/heterogeneous_database_system)），并为它们提供集成的概念视图。
- 有时，术语“多数据库”被用作联合数据库的同义词，尽管它可能指的是在单个应用程序中协作的集成度较低（例如，没有 FDBMS 和托管集成模式）的数据库组。在这种情况下，通常使用[中间件](https://en.wikipedia.org/wiki/Middleware_(distributed_applications))进行分发，其中通常包括原子提交协议(ACP)，例如[两阶段提交协议](https://en.wikipedia.org/wiki/two-phase_commit_protocol)，以允许[分布式(全局)]跨参与数据库的交易](https://en.wikipedia.org/wiki/Distributed_transaction)。
- [图数据库](https://en.wikipedia.org/wiki/graph_database)是一种NoSQL数据库，它使用[图结构](https://en.wikipedia.org/wiki/Graph_(data_struct))以及节点、边和属性来表示和存储信息。可以存储任何图形的通用图形数据库不同于专门的图形数据库，例如 Triplestore 和网络数据库。
- [数组 DBMS](https://en.wikipedia.org/wiki/array_DBMS) 是一种 NoSQL DBMS，允许建模、存储和检索（通常很大）多维[数组](https://en.wikipedia.org/wiki/Array_data_struct)，例如卫星图像和气候模拟输出。
- 在[超文本](https://en.wikipedia.org/wiki/hypertext)或[超媒体](https://en.wikipedia.org/wiki/hypermedia)数据库中，表示对象的任何单词或一段文本，例如另一段文本、一篇文章、一张图片或一部电影，都可以[超级链接](https://en.wikipedia.org/wiki/hyperlink)到该对象。超文本数据库对于组织大量不同的信息特别有用。例如，它们对于组织在线百科全书非常有用，用户可以在其中方便地跳转文本。因此，[万维网](https://en.wikipedia.org/wiki/World_Wide_Web)是一个大型分布式超文本数据库。
- [知识库](https://en.wikipedia.org/wiki/knowledge_base)（缩写为**KB**、**kb**或Δ）是一种特殊的[知识管理](https://en.wikipedia.org/wiki/knowledge_management)数据库，提供计算机化收集、组织和[检索](https://en.wikipedia.org/wiki/Information_retrieval)的手段[知识](https://en.wikipedia.org/wiki/knowledge)。还有代表问题及其解决方案和相关经验的数据集合。

- [移动数据库](https://en.wikipedia.org/wiki/mobile_database)可以在移动计算设备上运行或同步。
- [运营数据库](https://en.wikipedia.org/wiki/Operational_database) 存储有关组织运营的详细数据。他们通常使用[交易](https://en.wikipedia.org/wiki/transaction_(database)) 处理相对大量的更新。例如，记录有关企业客户的联系人、信用和人口统计信息的[客户数据库](https://en.wikipedia.org/wiki/Customer_relationship_management)，保存有关员工的工资、福利、技能数据等信息的人事数据库，记录有关产品组件、零件库存的详细信息的[企业资源规划](https://en.wikipedia.org/wiki/enterprise_resource_planning)系统，以及跟踪组织的资金、会计和财务数据库。金融交易。
- [并行数据库](https://en.wikipedia.org/wiki/parallel_database)旨在通过[并行化](https://en.wikipedia.org/wiki/parallelization)来提高加载数据、构建索引和评估查询等任务的性能。

::由底层[硬件](https://en.wikipedia.org/wiki/Computer_hardware)架构引发的主要并行DBMS架构是：
    -**[共享内存架构](https://en.wikipedia.org/wiki/Shared_memory_architecture)**，其中多个处理器共享主内存空间以及其他数据存储。
-**共享磁盘架构**，其中每个处理单元（通常由多个处理器组成）都有自己的主内存，但所有单元共享其他存储。
    -**[无共享架构](https://en.wikipedia.org/wiki/Shared-nothing_architecture)**，其中每个处理单元都有自己的主内存和其他存储。

- [概率数据库](https://en.wikipedia.org/wiki/Probabilistic_database)采用[模糊逻辑](https://en.wikipedia.org/wiki/fuzzy_logic)从不精确的数据中得出推论。
- [实时数据库](https://en.wikipedia.org/wiki/Real-time_database) 处理事务的速度足够快，以便结果返回并立即采取行动。
- [空间数据库](https://en.wikipedia.org/wiki/spatial_database)可以存储具有多维特征的数据。对此类数据的查询包括基于位置的查询，例如“我所在地区最近的酒店在哪里？”。
- [时态数据库](https://en.wikipedia.org/wiki/temporal_database)具有内置的时间方面，例如时态数据模型和[SQL](https://en.wikipedia.org/wiki/SQL)的时态版本。更具体地说，时间方面通常包括有效时间和交易时间。
- [面向术语的数据库](https://en.wikipedia.org/wiki/terminology-oriented_database) 建立在[面向对象的数据库](https://en.wikipedia.org/wiki/object-oriented_database) 之上，通常针对特定领域进行定制。
- [非结构化数据](https://en.wikipedia.org/wiki/unstructed_data)数据库旨在以可管理和受保护的方式存储不自然且方便地适合常见数据库的各种对象。它可能包括电子邮件、文档、期刊、多媒体对象等。该名称可能会产生误导，因为某些对象可能是高度结构化的。然而，整个可能的对象集合并不适合预定义的结构化框架。大多数成熟的 DBMS 现在都以各种方式支持非结构化数据，并且新的专用 DBMS 正在出现。

## 数据库管理系统

Connolly 和 Begg 将数据库管理系统 (DBMS) 定义为“使用户能够定义、创建、维护和控制对数据库的访问的软件系统。”Connolly DBMS 的示例包括 [MySQL](https://en.wikipedia.org/wiki/MySQL)、[MariaDB](https://en.wikipedia.org/wiki/MariaDB)、[PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL)、[Microsoft SQL]服务器](https://en.wikipedia.org/wiki/Microsoft_SQL_Server)、[Oracle 数据库](https://en.wikipedia.org/wiki/Oracle_Database) 和 [Microsoft Access](https://en.wikipedia.org/wiki/Microsoft_Access)。

DBMS 缩写有时会扩展以指示底层的[数据库模型](https://en.wikipedia.org/wiki/database_model)，RDBMS 表示[关系](https://en.wikipedia.org/wiki/Relational_model)，OODBMS 表示[面向对象](https://en.wikipedia.org/wiki/Object_model)，ORDBMS 表示[对象-关系]模型](https://en.wikipedia.org/wiki/object%E2%80%93relational_model)。其他扩展可以指示一些其他特性，例如分布式数据库管理系统的 DDBMS。

DBMS 提供的功能差异很大。核心功能是数据的存储、检索和更新。 [Codd](https://en.wikipedia.org/wiki/Edgar_F._Codd) 提出了成熟的通用 DBMS 应提供以下功能和服务：Connolly

- 数据存储、检索和更新
- 用户可访问的目录或描述元数据的[数据字典](https://en.wikipedia.org/wiki/data_dictionary)
- 支持事务和并发
- 数据库损坏后恢复的工具
- 支持数据访问授权和更新
- 从远程位置获取支持
- 强制约束以确保数据库中的数据遵守某些规则

通常还期望 DBMS 会提供一组实用程序，用于有效管理数据库所需的目的，包括导入、导出、监视、碎片整理和分析实用程序。Connolly DBMS 的核心部分，在数据库和应用程序接口之间交互，有时称为[数据库引擎](https://en.wikipedia.org/wiki/database_engine)。

DBMS 通常具有可以静态和动态调整的配置参数，例如数据库可以使用的服务器上的最大主内存量。趋势是最大限度地减少手动配置量，对于诸如嵌入式数据库之类的情况，以零管理为目标的需求至关重要。

大型企业 DBMS 的规模和功能趋于增加，并且在其整个生命周期中涉及长达数千年的开发工作。本文引用了仅 DB2 版本 9 就涉及 750 人的五年开发时间。Chong

早期的多用户 DBMS 通常只允许应用程序驻留在同一台计算机上，并通过[终端](https://en.wikipedia.org/wiki/Computer_terminal) 或终端仿真软件进行访问。 [客户端-服务器架构](https://en.wikipedia.org/wiki/client%E2%80%93server_architecture) 是一种开发，其中应用程序驻留在客户端桌面上，数据库驻留在服务器上，从而允许分布式处理。这演变成一种[多层架构](https://en.wikipedia.org/wiki/multitier_architecture)，将[应用程序服务器](https://en.wikipedia.org/wiki/application_server)和[Web服务器](https://en.wikipedia.org/wiki/web_server)与最终用户界面通过[Web浏览器](https://en.wikipedia.org/wiki/web_browser)合并，数据库仅直接连接到相邻的服务器蒂尔·康诺利

通用 DBMS 将提供公共[应用程序编程接口](https://en.wikipedia.org/wiki/application_programming_interface) (API) 和可选的[数据库语言](https://en.wikipedia.org/wiki/database_language) 处理器，例如 [SQL](https://en.wikipedia.org/wiki/SQL)，以允许编写应用程序来与数据库交互和操作数据库。专用 DBMS 可以使用私有 API 并进行专门定制并链接到单个应用程序。例如，[电子邮件](https://en.wikipedia.org/wiki/email)系统执行通用 DBMS 的许多功能，例如消息插入、消息删除、附件处理、阻止列表查找、将消息与电子邮件地址关联等，但是这些功能仅限于处理电子邮件所需的功能。

## 应用

主要入口：[数据库应用](https://en.wikipedia.org/wiki/Database_application)
与数据库的外部交互将通过与 DBMS 接口的应用程序进行。Connolly 的范围包括从允许用户以文本或图形方式执行 SQL 查询的数据库工具，到恰好使用数据库来存储和搜索信息的网站。

### 应用程序接口

[程序员](https://en.wikipedia.org/wiki/programmer)将通过[应用程序接口](https://en.wikipedia.org/wiki/application_program_interface) (API)或通过[数据库][编码](https://en.wikipedia.org/wiki/Computer_programming)与数据库(有时称为[数据源](https://en.wikipedia.org/wiki/datasource))交互语言](https://en.wikipedia.org/wiki/#database_language)。所选的特定 API 或语言需要得到 DBMS 的支持，可能是通过预处理器（https://en.wikipedia.org/wiki/preprocessor）或桥接 API 间接支持。一些 API 的目标是独立于数据库，[ODBC](https://en.wikipedia.org/wiki/ODBC) 是一个众所周知的示例。其他常见的 API 包括 [JDBC](https://en.wikipedia.org/wiki/JDBC) 和 [ADO.NET](https://en.wikipedia.org/wiki/ADO.NET)。

## 数据库语言

数据库语言是特殊用途的语言，它允许执行以下一项或多项任务，有时区分为[子语言](https://en.wikipedia.org/wiki/sublanguage)：

- [数据控制语言](https://en.wikipedia.org/wiki/Data_control_language) (DCL) – 控制对数据的访问；
- [数据定义语言](https://en.wikipedia.org/wiki/Data_definition_language) (DDL) – 定义数据类型，例如创建、更改或删除表以及它们之间的关系；
- [数据操作语言](https://en.wikipedia.org/wiki/Data_manipulation_language) (DML) – 执行插入、更新或删除数据出现等任务；
- [数据查询语言](https://en.wikipedia.org/wiki/Data_query_language) (DQL) – 允许搜索信息和计算派生信息。

数据库语言特定于特定的数据模型。值得注意的例子包括：

- SQL 将数据定义、数据操作和查询的角色结合在单一语言中。它是关系模型的最早的商业语言之一，尽管它在某些方面与 [Codd 描述的关系模型](https://en.wikipedia.org/wiki/Codd's_12_rules) 有所不同（例如，表的行和列可以排序）。 SQL 于 1986 年成为[美国国家标准协会](https://en.wikipedia.org/wiki/American_National_Standards_Institute) (ANSI) 的标准，并于 1987 年成为[国际标准化组织](https://en.wikipedia.org/wiki/International_Organization_for_Standardization) (ISO) 的标准。此后这些标准定期得到增强，并受到所有主流商业组织的支持（具有不同程度的一致性）关系型DBMS
- [OQL](https://en.wikipedia.org/wiki/OQL) 是一种对象模型语言标准（来自[对象数据管理组](https://en.wikipedia.org/wiki/Object_Data_Management_Group)）。它影响了一些较新的查询语言的设计，例如 [JDOQL](https://en.wikipedia.org/wiki/JDOQL) 和 [EJB QL](https://en.wikipedia.org/wiki/EJB_QL)。
- [XQuery](https://en.wikipedia.org/wiki/XQuery) 是一种标准 XML 查询语言，由 XML 数据库系统（例如 [MarkLogic](https://en.wikipedia.org/wiki/MarkLogic) 和 [eXist](https://en.wikipedia.org/wiki/eXist)）、具有 XML 功能的关系数据库（例如 Oracle 和 Db2）以及内存中 XML 处理器（例如[撒克逊](https://en.wikipedia.org/wiki/Saxon_XSLT)。
- [SQL/XML](https://en.wikipedia.org/wiki/SQL%2FXML) 将 [XQuery](https://en.wikipedia.org/wiki/XQuery) 与 SQL.Wagner 结合起来

数据库语言还可以包含以下功能：

- DBMS特定的配置和存储引擎管理
- 修改查询结果的计算，例如计数、求和、平均、排序、分组和交叉引用
- 约束执行（例如，在汽车数据库中，每辆车只允许一种发动机类型）
- 应用程序编程接口版本的查询语言，为程序员提供方便

## 贮存

主条目：[计算机数据存储](https://en.wikipedia.org/wiki/Computer_data_storage)

数据库存储是数据库物理实现的容器。它包含数据库架构中的*内部*（物理）*级别*。它还包含在需要时从内部级别重建*概念级别*和*外部级别*所需的所有信息（例如，[元数据](https://en.wikipedia.org/wiki/metadata)、“有关数据的数据”和内部[数据结构](https://en.wikipedia.org/wiki/data_struct))。数据库作为数字对象包含必须存储的三层信息：数据、结构和语义。为了未来的[保存](https://en.wikipedia.org/wiki/Database_preservation)和数据库的长寿，需要正确存储所有三层。将数据放入永久存储通常是[数据库引擎](https://en.wikipedia.org/wiki/database_engine)又名“存储引擎”的责任。虽然 DBMS 通常通过底层操作系统进行访问（并且经常使用操作系统的[文件系统](https://en.wikipedia.org/wiki/file_system)作为存储布局的中间体），但存储属性和配置设置对于 DBMS 的高效操作极其重要，因此由数据库管理员密切维护。 DBMS 在运行时始终将其数据库驻留在多种类型的存储中（例如内存和外部存储）。数据库数据和可能数量很大的附加所需信息被编码成位。数据通常以与数据在概念和外部级别上的方式看起来完全不同的结构驻留在存储中，但是以在用户和程序需要时尝试优化（尽可能最好的）这些级别的重建的方式，以及从数据中计算其他类型的所需信息（例如，在查询数据库时）。

一些 DBMS 支持指定使用哪种字符编码来存储数据，因此可以在同一个数据库中使用多种编码。

存储引擎使用各种低级数据库存储结构来序列化数据模型，以便将其写入所选的介质。诸如索引之类的技术可用于提高性能。常规存储是面向行的，但也有[面向列](https://en.wikipedia.org/wiki/column-oriented_DBMS)和[相关数据库](https://en.wikipedia.org/wiki/correlation_database)。

### 物化视图

主条目：[Materialized view](https://en.wikipedia.org/wiki/Materialized_view)

通常采用存储冗余来提高性能。一个常见的例子是存储*物化视图*，它由经常需要的*外部视图*或查询结果组成。存储此类视图可以节省每次需要时进行昂贵的计算。物化视图的缺点是更新它们以使其与原始更新的数据库数据保持同步时产生的开销，以及存储冗余的成本。

### 复制

参见：[复制（计算）#数据库复制](https://en.wikipedia.org/wiki/Replication_(computing)#Database_replication)

有时，数据库通过[数据库对象](https://en.wikipedia.org/wiki/database_object)复制（具有一个或多个副本）来采用存储冗余来提高数据可用性（既可以提高多个最终用户同时访问同一数据库对象的性能，又可以在分布式数据库部分故障的情况下提供弹性）。复制对象的更新需要在对象副本之间同步。在许多情况下，整个数据库都会被复制。

### 虚拟化

通过[数据虚拟化](https://en.wikipedia.org/wiki/data_virtualization)，所使用的数据保留在其原始位置，并建立实时访问以允许跨多个来源进行分析。这可以帮助解决一些技术难题，例如组合不同平台数据时的兼容性问题，降低因错误数据而导致错误的风险，并保证使用最新的数据。此外，避免创建包含个人信息的新数据库可以更容易遵守隐私法规。然而，对于数据虚拟化，与所有必要数据源的连接必须可操作，因为没有数据的本地副本，这是该方法的主要缺点之一。

## 安全

主要入口：[数据库安全](https://en.wikipedia.org/wiki/Database_security)

[数据库安全](https://en.wikipedia.org/wiki/Database_security) 涉及保护数据库内容、其所有者和用户的各个方面。它的范围从防止有意的未经授权的数据库使用到未经授权的实体（例如个人或计算机程序）无意的数据库访问。

数据库访问控制涉及控制谁（一个人或某个计算机程序）可以访问数据库中的哪些信息。该信息可以包括特定的数据库对象（例如，记录类型、特定记录、数据结构）、对某些对象的某些计算（例如，查询类型或特定查询），或者使用前者的特定访问路径（例如，使用特定索引或其他数据结构来访问信息）。数据库访问控制由使用专用受保护安全 DBMS 接口的特殊授权人员（由数据库所有者）设置。

这可以直接在个人基础上进行管理，或者通过将个人和[特权](https://en.wikipedia.org/wiki/Privilege_(Computing))分配给组，或者（在最复杂的模型中）通过将个人和组分配给角色然后授予权利。数据安全可防止未经授权的用户查看或更新数据库。使用密码，用户可以访问整个数据库或称为“子模式”的子集。例如，员工数据库可以包含有关单个员工的所有数据，但一组用户可能被授权仅查看工资数据，而其他用户只能访问工作历史和医疗数据。如果 DBMS 提供了一种交互式输入和更新数据库以及查询数据库的方法，则此功能允许管理个人数据库。

[数据安全](https://en.wikipedia.org/wiki/Data_security)一般涉及保护特定的数据块，无论是物理上的(即，防止损坏、破坏或删除；例如，参见[物理安全](https://en.wikipedia.org/wiki/physical_security))，还是将它们或其中的部分解释为有意义的信息(例如，通过查看它们包含的位串，得出特定的有效信用卡号;例如，请参阅[数据加密](https://en.wikipedia.org/wiki/data_encryption))。

更改和访问日志记录谁访问了哪些属性、更改了什么以及何时更改。日志服务允许稍后通过保留访问发生和更改的记录来进行取证[数据库审计](https://en.wikipedia.org/wiki/database_audit)。有时，应用程序级代码用于记录更改，而不是将其保留在数据库中。可以设置监控来尝试检测安全漏洞。因此，组织必须认真对待数据库安全，因为它提供了许多好处。将保护组织免受安全漏洞和黑客活动（例如防火墙入侵、病毒传播和勒索软件）的影响。这有助于保护公司的重要信息，这些信息不能以任何理由与外部人员共享。

## 事务和并发

延伸阅读：[并发控制](https://en.wikipedia.org/wiki/Concurrency_control)

[数据库事务](https://en.wikipedia.org/wiki/Database_transactions)可用于在从[崩溃](https://en.wikipedia.org/wiki/Crash_(computing))恢复后引入一定程度的[容错](https://en.wikipedia.org/wiki/fault_tolerance)和[数据完整性](https://en.wikipedia.org/wiki/data_integrity)。数据库事务是一个工作单元，通常封装对数据库的许多操作（例如，读取数据库对象、写入、获取或释放锁等），这是数据库和其他系统中支持的抽象。每个事务都具有明确定义的边界，即该事务中包含哪些程序/代码执行（由事务程序员通过特殊事务命令确定）。

首字母缩略词 [ACID](https://en.wikipedia.org/wiki/ACID) 描述了数据库事务的一些理想属性：[原子性](https://en.wikipedia.org/wiki/Atomicity_(database_systems))、[一致性](https://en.wikipedia.org/wiki/Consistency_(database_systems))、 [隔离](https://en.wikipedia.org/wiki/Isolation_(database_systems))和[耐久性](https://en.wikipedia.org/wiki/Durability_(database_systems))。

## 迁移

参见：[数据迁移#数据库迁移](https://en.wikipedia.org/wiki/Data_migration#Database_migration)

使用一个 DBMS 构建的数据库不能移植到另一个 DBMS（即其他 DBMS 无法运行它）。然而，在某些情况下，需要将数据库从一个 DBMS 迁移到另一个 DBMS。原因主要是经济上的（不同的 DBMS 可能有不同的[总拥有成本](https://en.wikipedia.org/wiki/Total_cost_of_ownership) 或 TCO）、功能和操作（不同的 DBMS 可能有不同的功能）。迁移涉及数据库从一种 DBMS 类型转换为另一种 DBMS 类型。转换应保持（如果可能）数据库相关应用程序（即所有相关应用程序）完好无损。因此，数据库的概念和外部架构级别应该在转换中保持不变。可能还需要维护架构内部级别的某些方面。复杂或大型数据库迁移本身可能是一个复杂且成本高昂的（一次性）项目，应在迁移决策中考虑这一因素。尽管事实上可能存在帮助特定 DBMS 之间迁移的工具。通常，DBMS 供应商提供工具来帮助从其他流行的 DBMS 导入数据库。

## 构建、维护和调整

主要入口：[数据库调优](https://en.wikipedia.org/wiki/Database_tuning)

为应用程序设计数据库后，下一阶段是构建数据库。通常，可以选择适当的通用 DBMS 来用于此目的。 DBMS 提供所需的[用户界面](https://en.wikipedia.org/wiki/user_interface)，供数据库管理员用来在 DBMS 各自的数据模型中定义所需应用程序的数据结构。其他用户界面用于选择所需的 DBMS 参数（如安全相关、存储分配参数等）。

当数据库准备就绪（定义了其所有数据结构和其他所需组件）时，通常会在其运行之前填充初始应用程序的数据（数据库初始化，这通常是一个不同的项目；在许多情况下使用支持批量插入的专用 DBMS 接口）。在某些情况下，数据库在没有应用程序数据的情况下开始运行，并且在运行期间积累数据。

数据库创建、初始化和填充后需要对其进行维护。各种数据库参数可能需要更改，并且数据库可能需要调整（[tuning](https://en.wikipedia.org/wiki/Database_tuning)）以获得更好的性能；应用程序的数据结构可能会被更改或添加，新的相关应用程序可能会被编写以添加到应用程序的功能等。

## 备份和恢复

主条目：[备份](https://en.wikipedia.org/wiki/Backup)
有时需要将数据库恢复到以前的状态（出于多种原因，例如，发现数据库由于软件错误而损坏，或者使用错误的数据更新了数据库）。为了实现这一点，偶尔或连续地执行备份操作，其中每个所需的数据库状态（即，其数据的值及其在数据库数据结构中的嵌入）都保存在专用备份文件中（存在许多技术可以有效地做到这一点）。当数据库管理员决定将数据库恢复到该状态时（例如，通过数据库处于该状态时的所需时间点指定该状态），这些文件用于恢复该状态。

## 静态分析

用于软件验证的静态分析技术也可以应用在查询语言的场景中。特别是，*[抽象解释](https://en.wikipedia.org/wiki/Abstract_interpretation)框架已经扩展到关系数据库的查询语言领域，作为支持声音近似技术的一种方式。Halder可以根据具体数据域的适当抽象来调整查询语言的语义。关系数据库系统的抽象有许多有趣的应用，特别是出于安全目的，例如细粒度访问控制、水印等。

## 其他功能

其他 DBMS 功能可能包括：

- [数据库日志](https://en.wikipedia.org/wiki/Database_log) – 这有助于保存执行函数的历史记录。
- 用于生成图形和图表的图形组件，尤其是在数据仓库系统中。
- [查询优化器](https://en.wikipedia.org/wiki/Query_optimizer) – 对每个查询执行查询优化，以选择要执行的高效*[查询计划](https://en.wikipedia.org/wiki/query_plan)*（操作的偏序（树））来计算查询结果。可能特定于特定的存储引擎。
- 用于数据库设计、应用程序编程、应用程序维护、数据库性能分析和监控、数据库配置监控、DBMS硬件配置（DBMS和相关数据库可能跨越计算机、网络和存储单元）和相关数据库映射（特别是分布式DBMS）、存储分配和数据库布局监控、存储迁移等的工具或挂钩。

人们越来越需要一个单一系统，将所有这些核心功能合并到同一个构建、测试和部署框架中，以进行数据库管理和源代码控制。借鉴软件行业的其他发展，一些市场推出了“数据库的[DevOps](https://en.wikipedia.org/wiki/DevOps)”等产品。

## 设计与建模

主要入口：[数据库设计](https://en.wikipedia.org/wiki/Database_design)

数据库设计者的第一个任务是生成一个反映数据库中要保存的信息结构的[概念数据模型](https://en.wikipedia.org/wiki/conceptual_data_model)。一种常见的方法是开发一个[实体关系模型](https://en.wikipedia.org/wiki/entity%E2%80%93relationship_model)，通常借助绘图工具。另一种流行的方法是[统一建模语言](https://en.wikipedia.org/wiki/Unified_Modeling_Language)。一个成功的数据模型将准确地反映正在建模的外部世界的可能状态：例如，如果人们可以拥有多个电话号码，它将允许捕获这一信息。设计一个好的概念数据模型需要对应用领域有很好的理解；它通常涉及对组织感兴趣的事物提出深入的问题，例如“客户也可以是供应商吗？”，或者“如果产品以两种不同形式的包装出售，那么它们是相同的产品还是不同的产品？”或者“如果一架飞机从纽约经法兰克福飞往迪拜，这是一次还是两次（甚至可能是三次）飞行？”。这些问题的答案建立了用于实体（客户、产品、航班、航段）的术语及其关系和属性的定义。

生成概念数据模型有时涉及来自[业务流程](https://en.wikipedia.org/wiki/Business_process_modeling)的输入，或对组织中的[工作流程](https://en.wikipedia.org/wiki/workflow)的分析。这可以帮助确定数据库中需要哪些信息以及可以省略哪些信息。例如，它可以帮助确定数据库是否需要保存历史数据以及当前数据。

生成用户满意的概念数据模型后，下一阶段是将其转换为在数据库中实现相关数据结构的模式。这个过程通常称为逻辑数据库设计，输出是以模式形式表达的逻辑数据模型。虽然概念数据模型（至少在理论上）独立于数据库技术的选择，但逻辑数据模型将用所选 DBMS 支持的特定数据库模型来表示。 （术语“数据模型”和“数据库模型”通常可以互换使用，但在本文中，我们使用“数据模型”来设计特定数据库，使用“数据库模型”来表示用于表达该设计的建模符号）。

通用数据库最流行的数据库模型是关系模型，或者更准确地说，是以SQL语言为代表的关系模型。使用此模型创建逻辑数据库设计的过程使用一种称为[规范化](https://en.wikipedia.org/wiki/Database_normalization)的系统方法。规范化的目标是确保每个基本“事实”仅记录在一个地方，以便插入、更新和删除自动保持一致性。

数据库设计的最后阶段是做出影响性能、可伸缩性、恢复、安全性等的决策，这取决于特定的 DBMS。这通常称为“物理数据库设计”，输出是[物理数据模型](https://en.wikipedia.org/wiki/physical_data_model)。此阶段的一个关键目标是[数据独立](https://en.wikipedia.org/wiki/data_independence)，这意味着出于性能优化目的而做出的决策应该对最终用户和应用程序不可见。数据独立性有两种类型：物理数据独立性和逻辑数据独立性。物理设计主要由性能要求驱动，需要充分了解预期的工作负载和访问模式，并深入了解所选 DBMS 提供的功能。

物理数据库设计的另一个方面是安全性。它涉及定义数据库对象的访问控制以及定义数据本身的安全级别和方法。

### 型号

主要入口：[数据库模型](https://en.wikipedia.org/wiki/Database_model)

数据库模型是一种数据模型，它决定数据库的逻辑结构，并从根本上决定数据的存储、组织和操作方式。数据库模型最流行的示例是关系模型（或关系模型的 SQL 近似），它使用基于表的格式。

数据库常见的逻辑数据模型包括：
- [导航数据库](https://en.wikipedia.org/wiki/Navigational_database)
  
- [分层数据库模型](https://en.wikipedia.org/wiki/Hierarchical_database_model)
  
- [网络模型](https://en.wikipedia.org/wiki/Network_model)
  
- [图数据库](https://en.wikipedia.org/wiki/Graph_database)
- [关系模型](https://en.wikipedia.org/wiki/Relational_model)
- [实体-关系模型](https://en.wikipedia.org/wiki/Entity%E2%80%93relationship_model)
  
- [增强型实体关系模型](https://en.wikipedia.org/wiki/Enhanced_entity%E2%80%93relationship_model)
- [对象模型](https://en.wikipedia.org/wiki/Object_database)
- [文档模型](https://en.wikipedia.org/wiki/Document-oriented_database)
- [实体-属性-值模型](https://en.wikipedia.org/wiki/Entity%E2%80%93attribute%E2%80%93value_model)
- [星型架构](https://en.wikipedia.org/wiki/Star_schema)

对象关系数据库结合了这两种相关的结构。

[物理数据模型](https://en.wikipedia.org/wiki/Physical_data_model)包括：
- [倒排索引](https://en.wikipedia.org/wiki/Inverted_index)
- [平面文件](https://en.wikipedia.org/wiki/Flat_file)

其他型号包括：
- [多维模型](https://en.wikipedia.org/wiki/MultiDimension_database)
- [数组模型](https://en.wikipedia.org/wiki/Array_DBMS)
- [多值模型](https://en.wikipedia.org/wiki/Multivalue_model)

专门的模型针对特定类型的数据进行了优化：
- [XML 数据库](https://en.wikipedia.org/wiki/XML_database)
- [语义模型](https://en.wikipedia.org/wiki/Semantic_data_model)
- [内容商店](https://en.wikipedia.org/wiki/Content_store)
- [活动商店](https://en.wikipedia.org/wiki/Event_store)
- [时间序列模型](https://en.wikipedia.org/wiki/Time_series_database)

### 外部、概念和内部视图

数据库管理系统提供数据库数据的三个视图：

-**外部级别**定义每组最终用户如何查看数据库中的数据组织。单个数据库可以在外部级别拥有任意数量的视图。
-**概念层面**（或*逻辑层面*）将各种外部视图统一为兼容的全局视图。日期它提供了所有外部视图的综合。它超出了各种数据库最终用户的范围，并且是数据库应用程序开发人员和数据库管理员相当感兴趣的。
-**内部级别**（或*物理级别*）是 DBMS 内数据的内部组织。它涉及成本、性能、可扩展性和其他运营问题。它处理数据的存储布局，使用索引等存储结构来提高性能。有时，它会存储根据通用数据计算得出的各个视图（[物化视图](https://en.wikipedia.org/wiki/materialized_view)s）的数据（如果存在这种冗余的性能合理性）。它平衡所有外部视图的性能要求（可能是冲突的），以尝试优化所有活动的整体性能。

虽然通常只有一种数据的概念和内部视图，但可以有任意数量的不同外部视图。这允许用户以更与业务相关的方式而不是从技术、处理的角度查看数据库信息。例如，公司的财务部门需要所有员工的付款详细信息作为公司费用的一部分，但不需要符合[人力资源](https://en.wikipedia.org/wiki/ human_resources)部门利益的员工详细信息。因此，不同的部门需要公司数据库的不同“视图”。

三级数据库体系结构涉及“数据独立性”的概念，这是关系模型的主要初始驱动力之一。Date 的想法是，在某个级别进行的更改不会影响更高级别的视图。例如，内部级别的更改不会影响使用概念级别接口编写的应用程序，这减少了为提高性能而进行物理更改的影响。

概念视图提供了内部和外部之间的间接级别。一方面，它提供了数据库的通用视图，独立于不同的外部视图结构，另一方面，它抽象了如何存储或管理数据的细节（内部级别）。原则上，每个级别，甚至每个外部视图，都可以通过不同的数据模型来呈现。在实践中，给定的 DBMS 通常对外部层和概念层使用相同的数据模型（例如关系模型）。内部级别隐藏在 DBMS 内部并取决于其实现，需要不同的详细级别并使用其自己的数据结构类型。

## 研究

自 20 世纪 60 年代以来，数据库技术一直是学术界和公司研发团队（例如 [IBM Research](https://en.wikipedia.org/wiki/IBM_Research)）中的一个活跃研究主题。研究活动包括[理论](https://en.wikipedia.org/wiki/Database_theory)和[原型](https://en.wikipedia.org/wiki/prototype)的开发。值得注意的研究主题包括模型、原子事务概念、相关并发控制技术、查询语言和查询优化方法、RAID 等等。

数据库研究领域有几个专门的[学术期刊](https://en.wikipedia.org/wiki/academic_journal)（例如，*[ACM Transactions on Database Systems](https://en.wikipedia.org/wiki/ACM_Transactions_on_Database_Systems)*-TODS、*[Data and Knowledge工程](https://en.wikipedia.org/wiki/Data_and_Knowledge_Engineering)*-DKE) 和年度[会议](https://en.wikipedia.org/wiki/Academic_conference)（例如，[ACM](https://en.wikipedia.org/wiki/Association_for_Computing_Machinery) [SIGMOD](https://en.wikipedia.org/wiki/SIGMOD)、ACM [PODS](https://en.wikipedia.org/wiki/Symposium_on_Principles_of_Database_Systems)、VLDB、[IEEE](https://en.wikipedia.org/wiki/IEEE) ICDE)。

由于 DBMS 构成了一个重要的[市场](https://en.wikipedia.org/wiki/Market_(economics))，计算机和存储供应商通常会在自己的开发计划中考虑 DBMS 的要求。Nelson

## 参见

数据库概要

- [数据库工具比较](https://en.wikipedia.org/wiki/Comparison_of_database_tools)
- [对象数据库管理系统的比较](https://en.wikipedia.org/wiki/Comparison_of_object_database_management_systems)
- [对象关系数据库管理系统的比较](https://en.wikipedia.org/wiki/Comparison_of_object%E2%80%93relational_database_management_systems)
- [关系型数据库管理系统比较](https://en.wikipedia.org/wiki/Comparison_of_relational_database_management_systems)
- [数据库](https://en.wikipedia.org/wiki/Data_bank)
- [数据层次结构](https://en.wikipedia.org/wiki/Data_hierarchy)
- [数据存储](https://en.wikipedia.org/wiki/Data_store)
- [数据库测试](https://en.wikipedia.org/wiki/Database_testing)
- [数据库理论](https://en.wikipedia.org/wiki/Database_theory)
- [数据库作为 IPC](https://en.wikipedia.org/wiki/Database-as-IPC)
- [以数据库为中心的架构](https://en.wikipedia.org/wiki/Database-centric_architecture)
- [数据日志](https://en.wikipedia.org/wiki/Datalog)
- [DBOS](https://en.wikipedia.org/wiki/DBOS)
- [平面文件数据库](https://en.wikipedia.org/wiki/Flat-file_database)
- [INP（数据库）]（https://en.wikipedia.org/wiki/INP_（数据库））
- [数据库管理杂志](https://en.wikipedia.org/wiki/Journal_of_Database_Management)
- [卡西欧数据库](https://en.wikipedia.org/wiki/Casio_Databank)
- [构象动力学数据库](https://en.wikipedia.org/wiki/Conformational_dynamics_data_bank)
- [数据存储库](https://en.wikipedia.org/wiki/Data_repository)
- [数据库系统](https://en.wikipedia.org/wiki/Databank_Systems)
- [多特蒙德数据库](https://en.wikipedia.org/wiki/Dortmund_Data_Bank)
- [电子显微镜数据库](https://en.wikipedia.org/wiki/Electron_Microscopy_Data_Bank)
- [有害物质数据库](https://en.wikipedia.org/wiki/Hazardous_Substances_Data_Bank)
- [数据库列表](https://en.wikipedia.org/wiki/List_of_databases)
- [内存库](https://en.wikipedia.org/wiki/Memory_bank)
- [国家创伤数据库](https://en.wikipedia.org/wiki/National_Trauma_Data_Bank)
- [蛋白质数据库](https://en.wikipedia.org/wiki/Protein_Data_Bank)
- [星球大战数据库](https://en.wikipedia.org/wiki/Star_Wars_Databank)

## 笔记

## 参考

## 来源

- 程序员作为导航员（Charles W. Bachman，1973 年，ACM 通讯）
- 数据库系统（Paul Beynon-Davies，2003，Palgrave Macmillan）
- SQL 基础知识（Mike Chapple，2005，About.com）
- 集合论数据结构的描述
- 集合论数据结构的可行性：基于重构定义的通用结构
- 了解 DB2：通过示例直观地学习（Raul F. Chong，2007 年，IBM Press Pearson plc）
- 大型共享数据库的数据关系模型（Edgar F. Codd，1970 年，ACM 通讯）
- 数据库系统 – 设计实施和管理的实用方法（Thomas M. Connolly，2014 年，Pearson）
- 数据库系统简介（C. J. Date，2003 年，Pearson）
- 数据库查询语言的抽象解释（Raju Halder，2011，计算机语言、系统和结构）
- 集合论数据结构和检索语言（William Hershey，1972，ACM SIGIR 论坛）
- 构建电子商务：通过网络数据库构建（Anne Fulcher Nelson，2001 年，Prentice Hall）
- 集合、数据模型和数据独立性（Ken North，2010 年 3 月 10 日，Dr. Dobb's）
- 数据模型（Dionysios C. Tsitchizris，1982，Prentice–Hall）
- 数据库系统第一门课程（Jeffrey Ullman，1997，Prentice–Hall）
- SQL/XML:2006 – 数据银行系统标准一致性评估

## 进一步阅读

- [Ling Liu](https://en.wikipedia.org/wiki/Ling_Liu_(computer_scientist)) 和 Tamer M. Özsu (Eds.) (2009)。  “[数据库系统百科全书](https://www.springer.com/computer/database+management+&+information+retrieval/book/978-0-387-49616-0)，4100 页 60 插图。ISBN：978-0-387-49616-0。
- Gray, J. 和 Reuter, A. *交易处理：概念和技术*，第 1 版，Morgan Kaufmann 出版社，1992 年。
- 大卫·M·克伦克和大卫·J·奥尔。 *数据库概念。*第三版。纽约：普伦蒂斯，2007 年。
- [Raghu Ramakrishnan](https://en.wikipedia.org/wiki/Raghu_Ramakrishnan) 和 [Johannes Gehrke](https://en.wikipedia.org/wiki/Johannes_Gehrke)，*[数据库管理系统](http://pages.cs.wisc.edu/~dbbook/)*。
- [Abraham Silberschatz](https://en.wikipedia.org/wiki/Abraham_Silberschatz)、[Henry F. Korth](https://en.wikipedia.org/wiki/Henry_F._Korth)、S. Sudarshan、*[数据库系统概念](http://www.db-book.com/)*。
- 物理数据库设计：数据库专业人员利用索引、视图、存储等的指南（S. Lightstone，2007 年，Morgan Kaufmann Press）
- 特奥雷，T.； Lightstone, S. 和 Nadeau, T. *数据库建模与设计：逻辑设计*，第 4 版，摩根考夫曼出版社，2005 年。ISBN：0-12-685352-5。
- *[CMU 数据库课程播放列表](https://www.youtube.com/@CMUDatabaseGroup/playlists)*
- *[麻省理工学院 OCW 6.830 | 2010 年秋季 |数据库系统](https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/)*
- *[伯克利 CS W186](https://cs186berkeley.net)*

## 外部链接

- [DB 文件扩展名](http://www.fileextension.org/DB) – 有关带有 DB 扩展名的文件的信息
