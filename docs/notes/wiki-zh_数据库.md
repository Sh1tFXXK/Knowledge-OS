# 数据库

> 来源：[维基百科 zh 条目](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%BA%93)  
> 整理日期：2026-07-22  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，内容保留原文语言。

---

**資料庫**（database），簡而言之可視為[数字化](https://zh.wikipedia.org/wiki/%E6%95%B0%E5%AD%97%E5%8C%96)的[檔案櫃](https://zh.wikipedia.org/wiki/%E6%AA%94%E6%A1%88%E6%AB%83)——儲存电子[檔案](https://zh.wikipedia.org/wiki/%E6%AA%94%E6%A1%88)的處所，使用者可以對[檔案](https://zh.wikipedia.org/wiki/%E6%AA%94%E6%A1%88)中的資料執行新增、擷取、更新、刪除等操作。

所謂「資料庫」是以**一定方式**储存在一起、能予多个用户[共享](https://zh.wikipedia.org/wiki/%E5%85%B1%E4%BA%AB)、具有尽可能小的[冗余度](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%86%97%E4%BD%99)、与应用程序彼此独立的数据[集合](https://zh.wikipedia.org/wiki/%E9%9B%86%E5%90%88_(%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%A7%91%E5%AD%A6))。一个数据库由多个表空间（[Tablespace](https://zh.wikipedia.org/wiki/Tablespace)）构成。

---

## 技术初衷

在[操作系统](https://zh.wikipedia.org/wiki/%E6%93%8D%E4%BD%9C%E7%B3%BB%E7%BB%9F)出现之后，随着[计算机](https://zh.wikipedia.org/wiki/%E7%94%B5%E5%AD%90%E8%AE%A1%E7%AE%97%E6%9C%BA)应用范围的扩大、需要处理的[数据](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE)迅速膨胀。最初，数据与[程序](https://zh.wikipedia.org/wiki/%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%A8%8B%E5%BA%8F)一样，以简单的文件作为主要存储形式。以这种方式组织的数据在逻辑上更简单，但[可扩展性](https://zh.wikipedia.org/wiki/%E5%8F%AF%E6%89%A9%E5%B1%95%E6%80%A7)差，访问这种数据的程序需要了解数据的具体组织格式。当系统数据量大或者用户访问量大时，应用程序还需要解决数据的完整性、一致性以及安全性等一系列的问题。因此，必须开发出一种[系统软件](https://zh.wikipedia.org/wiki/%E7%B3%BB%E7%BB%9F%E8%BD%AF%E4%BB%B6)，它应该能够像操作系统屏蔽了硬件访问复杂性那样，屏蔽数据访问的复杂性。由此产生了数据管理系统，即数据库。

## 数据库管理系统

主条目：[数据库管理系统](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%BA%93%E7%AE%A1%E7%90%86%E7%B3%BB%E7%BB%9F)

[資料庫管理系统](https://zh.wikipedia.org/wiki/%E8%B3%87%E6%96%99%E5%BA%AB%E7%AE%A1%E7%90%86%E7%B3%BB%E7%BB%9F)（Database Management System，簡稱[DBMS](https://zh.wikipedia.org/wiki/DBMS)）是为管理[資料庫](https://zh.wikipedia.org/wiki/%E8%B3%87%E6%96%99%E5%BA%AB)而設計的电腦[軟體](https://zh.wikipedia.org/wiki/%E8%BB%9F%E9%AB%94)系統，一般具有儲存、擷取、安全保障、備份等基礎功能。資料庫管理系統可以依據它所支援的來作分類，例如[關聯式](https://zh.wikipedia.org/wiki/%E9%97%9C%E8%81%AF%E6%A8%A1%E5%9E%8B)、[XML](https://zh.wikipedia.org/wiki/XML)；或依據所支援的電腦類型來作分類，例如伺服器群集、行動電話；或依據所用查詢語言來作分類，例如[SQL](https://zh.wikipedia.org/wiki/SQL)、；或依據性能衝量重點來作分類，例如最大規模、最高執行速度；亦或其他的分類方式。不論使用哪種分類方式，一些DBMS能够跨類別，例如，同時支援多種查詢語言。

## 数据库的分类

随着数据库技术与其他分支学科技术的结合，出现了多种新型数据库，例如：与分布处理技术结合产生的[分布式数据库](https://zh.wikipedia.org/wiki/%E5%88%86%E5%B8%83%E5%BC%8F%E6%95%B0%E6%8D%AE%E5%BA%93)、与并行处理技术结合产生的[并行数据库](https://zh.wikipedia.org/wiki/%E5%B9%B6%E8%A1%8C%E6%95%B0%E6%8D%AE%E5%BA%93)、与人工智能结合产生的[演绎数据库](https://zh.wikipedia.org/wiki/%E6%BC%94%E7%BB%8E%E6%95%B0%E6%8D%AE%E5%BA%93)、与多媒体技术结合产生的[多媒体数据库](https://zh.wikipedia.org/wiki/%E5%A4%9A%E5%AA%92%E4%BD%93%E6%95%B0%E6%8D%AE%E5%BA%93)。另外，数据库技术应用于特定的领域，出现了[工程数据库](https://zh.wikipedia.org/wiki/%E5%B7%A5%E7%A8%8B%E6%95%B0%E6%8D%AE%E5%BA%93)、 [地理数据库](https://zh.wikipedia.org/wiki/%E5%9C%B0%E7%90%86%E6%95%B0%E6%8D%AE%E5%BA%93)、[统计数据库](https://zh.wikipedia.org/wiki/%E7%BB%9F%E8%AE%A1%E6%95%B0%E6%8D%AE%E5%BA%93)、[空间数据库](https://zh.wikipedia.org/wiki/%E7%A9%BA%E9%97%B4%E6%95%B0%E6%8D%AE%E5%BA%93)等特定领域数据库。

### 关系数据库

- [MySQL](https://zh.wikipedia.org/wiki/MySQL)
  - [MariaDB](https://zh.wikipedia.org/wiki/MariaDB)（MySQL的代替品，维基媒体基金会项目已从MySQL转向MariaDB）
  - [Percona Server](https://zh.wikipedia.org/wiki/Percona_Server)（MySQL的代替品）
- [PostgreSQL](https://zh.wikipedia.org/wiki/PostgreSQL)
- [Microsoft Access](https://zh.wikipedia.org/wiki/Microsoft_Access)
- [Microsoft SQL Server](https://zh.wikipedia.org/wiki/Microsoft_SQL_Server)
-
- [FileMaker](https://zh.wikipedia.org/wiki/FileMaker)
- [Oracle資料庫](https://zh.wikipedia.org/wiki/Oracle%E8%B3%87%E6%96%99%E5%BA%AB)
- [Sybase](https://zh.wikipedia.org/wiki/Sybase)
- [dBASE](https://zh.wikipedia.org/wiki/dBASE)
- [Clipper](https://zh.wikipedia.org/wiki/Clipper)
- [FoxPro](https://zh.wikipedia.org/wiki/FoxPro)
- [foshub](https://zh.wikipedia.org/wiki/foshub)

幾乎所有的資料庫管理系統都配備了一個[開放式資料庫連接](https://zh.wikipedia.org/wiki/%E9%96%8B%E6%94%BE%E5%BC%8F%E8%B3%87%E6%96%99%E5%BA%AB%E9%80%A3%E6%8E%A5)（ODBC）驅動程式，令各個資料庫之間得以互相整合。

### 非关系型数据库（NoSQL）

主条目：[NoSQL](https://zh.wikipedia.org/wiki/NoSQL)

- [BigTable](https://zh.wikipedia.org/wiki/BigTable)（Google）
- [Cassandra](https://zh.wikipedia.org/wiki/Cassandra)
- [MongoDB](https://zh.wikipedia.org/wiki/MongoDB)
- [CouchDB](https://zh.wikipedia.org/wiki/CouchDB)
- [Redis](https://zh.wikipedia.org/wiki/Redis)

#### 键值数据库

- [Apache Cassandra](https://zh.wikipedia.org/wiki/Apache_Cassandra)（为Facebook所使用）：高度可扩展
- [Amazon DynamoDB](https://zh.wikipedia.org/wiki/Amazon_DynamoDB)
- [LevelDB](https://zh.wikipedia.org/wiki/LevelDB)（Google）

## 数据库技术的发展

随着[互联网](https://zh.wikipedia.org/wiki/%E4%BA%92%E8%81%94%E7%BD%91)的普及，数据库使用环境也随之发生变化，这种变化主要体现为[XML](https://zh.wikipedia.org/wiki/XML)和[Java](https://zh.wikipedia.org/wiki/Java)技术的大量使用、要求支持各种互联网环境下的[应用服务器](https://zh.wikipedia.org/wiki/%E5%BA%94%E7%94%A8%E6%9C%8D%E5%8A%A1%E5%99%A8)、极容易出现大量用户同时访问数据库、要求支持7x24小时不间断运行和高安全性等。

为解决由于这些变化所带来的新问题，数据库管理系统也逐渐产生变化，包括：
1. **网络化的大型通用数据库管理系统的出现**

由于[網路應用程式](https://zh.wikipedia.org/wiki/%E7%B6%B2%E8%B7%AF%E6%87%89%E7%94%A8%E7%A8%8B%E5%BC%8F)的用户数量无法预测，这就要求数据库相比以前拥有能处理更大量的数据以及为更多的用户提供服务的能力，即更好的可伸缩性及高可用性，因此，能够支持Internet的数据库应用已经成为数据库系统的重要方面，学术界及各主流[数据库公司](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%BA%93%E5%85%AC%E5%8F%B8)都将大型通用数据管理系统作为主要发展方向。例如[Oracle公司](https://zh.wikipedia.org/wiki/Oracle)从 8 版起全面支持互联网应用，微软公司更是将 SQL Server 作为 其整个 .NET计划中的一个重要的成分。

1. **数据库安全系统及技术的提升**

由于数据库系统在现代计算机系统中的地位越来越趋于核心的地位，数据库系统的安全问题自然受到越来越多的关注。在目前各国所引用或制定的 一系列[安全标准](https://zh.wikipedia.org/wiki/%E5%AE%89%E5%85%A8%E6%A0%87%E5%87%86)中，最重要的两个是由美国国防部制定的《[可信计算机系统的评估标准](https://zh.wikipedia.org/wiki/%E5%8F%AF%E4%BF%A1%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E7%9A%84%E8%AF%84%E4%BC%B0%E6%A0%87%E5%87%86)》(简称[TCSEC](https://zh.wikipedia.org/wiki/TCSEC))和《[可信计算机系统的评估标准关于可信数据库系统的解释](https://zh.wikipedia.org/wiki/%E5%8F%AF%E4%BF%A1%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E7%9A%84%E8%AF%84%E4%BC%B0%E6%A0%87%E5%87%86%E5%85%B3%E4%BA%8E%E5%8F%AF%E4%BF%A1%E6%95%B0%E6%8D%AE%E5%BA%93%E7%B3%BB%E7%BB%9F%E7%9A%84%E8%A7%A3%E9%87%8A)》(简称 [TDI](https://zh.wikipedia.org/wiki/TDI))。目前，所有数据库的开发必须遵从相应的安全标准。

1. **XML及Web数据管理技术的普及**

随着越来越多的[Web应用](https://zh.wikipedia.org/wiki/Web%E5%BA%94%E7%94%A8)，如[电子商务](https://zh.wikipedia.org/wiki/%E7%94%B5%E5%AD%90%E5%95%86%E5%8A%A1)、[数字图书馆](https://zh.wikipedia.org/wiki/%E6%95%B0%E5%AD%97%E5%9B%BE%E4%B9%A6%E9%A6%86)、[信息服务](https://zh.wikipedia.org/wiki/%E4%BF%A1%E6%81%AF%E6%9C%8D%E5%8A%A1)等采用XML作为数据表现形式、越来越多网站采用XML作为信息发布的语言，以XML格式数据为主的[半结构化数据](https://zh.wikipedia.org/wiki/%E5%8D%8A%E7%BB%93%E6%9E%84%E5%8C%96%E6%95%B0%E6%8D%AE)逐步成为网上[数据交换](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E4%BA%A4%E6%8D%A2)和[数据表示](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E8%A1%A8%E7%A4%BA)的标准。而XML具有如下的一些特征：面向显示、半结构化和无结构、不同形式的数据源，动态变化以及数据海量等。因此，支持这种结构松散、形式多样、动态变化的海量数据的存储、共享、管理、检索，成了数据库技术的大势所趋。

[Web数据管理](https://zh.wikipedia.org/wiki/Web%E6%95%B0%E6%8D%AE%E7%AE%A1%E7%90%86)是一个很松散的概念，大体上它是指在Web环境下对各种复杂信息的有效组织与[集成](https://zh.wikipedia.org/wiki/%E9%9B%86%E6%88%90)，进行方便而准确的信息查询和发布。当前Web数据管理的研究开发方向主要包括：[半结构化数据管理](https://zh.wikipedia.org/wiki/%E5%8D%8A%E7%BB%93%E6%9E%84%E5%8C%96%E6%95%B0%E6%8D%AE%E7%AE%A1%E7%90%86)、[Web数据查询](https://zh.wikipedia.org/wiki/Web%E6%95%B0%E6%8D%AE%E6%9F%A5%E8%AF%A2)、[Web信息集成](https://zh.wikipedia.org/wiki/Web%E4%BF%A1%E6%81%AF%E9%9B%86%E6%88%90)、[XML数据管理](https://zh.wikipedia.org/wiki/XML%E6%95%B0%E6%8D%AE%E7%AE%A1%E7%90%86)等。到目前为止，XML 与 Web 数据管理的研究工作中主要集中在如下的一些方面。

  - 半结构化数据
  - Web数据查询
  - XML相关标准
  - XML数据管理
1. **嵌入式移动数据库技术**

随着[移动通信技术](https://zh.wikipedia.org/wiki/%E7%A7%BB%E5%8A%A8%E9%80%9A%E4%BF%A1%E6%8A%80%E6%9C%AF)的迅速发展和投入使用，加上移动智能电话、移动计算机的大量普及，国内外许多研究机构都展开了对的研究，并取得了许多有价值的成果。移动数据库技术涉及数据库技术、分布式计算技术以及移动通信技术等多个学科领域，具有较高的学术起点。

## 数据库模型

- [物件模型](https://zh.wikipedia.org/wiki/%E7%89%A9%E4%BB%B6%E6%A8%A1%E5%9E%8B)
- 层次模型（轻量级数据访问协议）
- 网状模型（大型数据储存）
- 关系模型
- 面向对象模型
- 半结构化模型
- （表格模型，一般在形式上是一个二维[陣列](https://zh.wikipedia.org/wiki/%E6%95%B0%E7%BB%84)。如表格模型数据[Excel](https://zh.wikipedia.org/wiki/Excel))

### 架構 (Schema)

主条目：[綱要_(資料庫)](https://zh.wikipedia.org/wiki/%E7%B6%B1%E8%A6%81_(%E8%B3%87%E6%96%99%E5%BA%AB))
資料庫的架構可以大致區分為三個概括層次：內層、概念層和外層。
- 內層：最接近實際儲存體，亦即有關資料的實際儲存方式。
- 外層：最接近使用者，即有關個別使用者觀看資料的方式。
- 概念層：介於兩者之間的間接層。

### 数据库索引

主条目：[数据库索引](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%BA%93%E7%B4%A2%E5%BC%95)

資料索引的觀念由來已久，像是一本書前面幾頁都有目錄，目錄也算是索引的一種，只是它的分類較廣，例如車牌、身份証字號、條碼等，都是一個索引的號碼，當我們看到號碼時，可以從號碼中看出其中的端倪，若是要找的人、車或物品，也只要提供相關的號碼，即可迅速查到正確的人事物。

另外，索引跟欄位有著相應的關係，索引即是由欄位而來，其中欄位有所謂的關鍵欄位（Key Field），該欄位具有唯一性，即其值不可重複，且不可為"[空值](https://zh.wikipedia.org/wiki/%E7%A9%BA%E5%80%BC_(SQL))（null）"。例如：在合併資料時，索引便是扮演欲附加欄位資料之指向性用途的角色。故此索引為不可重複性且不可為空。

### 数据库事务

主条目：[数据库事务](https://zh.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%BA%93%E4%BA%8B%E5%8A%A1)

事务（transaction）包含一组数据库操作的逻辑工作单元，在事务中包含的数据库操作是不可分割的整体，这些操作要么一起做，要么一起回滚（Roll Back）到执行前的状态。
事务的[ACID](https://zh.wikipedia.org/wiki/ACID)特性：
- 原子性（atomicity）
- 一致性（consistency）
- 隔离性（isolation）
- 持续性（durability）

事务的并发性是指多个事务的并行操作轮流交叉运行，事务的并发可能会存取和存储不正确的数据，破坏交易的隔离性和数据库的一致性。

### 网状数据模型的数据结构

#### 网状模型

满足下面两个条件的基本层次联系的集合为网状模型。
1. 允许一个以上的结点无双亲；
2. 一个结点可以有多于一个的双亲。

## 參考文獻

## 参见

- [資料庫理論](https://zh.wikipedia.org/wiki/%E8%B3%87%E6%96%99%E5%BA%AB%E7%90%86%E8%AB%96)
- [資訊科技稽核](https://zh.wikipedia.org/wiki/%E8%B3%87%E8%A8%8A%E7%A7%91%E6%8A%80%E7%A8%BD%E6%A0%B8)
- [LDAP](https://zh.wikipedia.org/wiki/LDAP)（轻量级数据访问协议）
- [SQL](https://zh.wikipedia.org/wiki/SQL)（结构化查询语言）
- [資料庫管理系統](https://zh.wikipedia.org/wiki/%E8%B3%87%E6%96%99%E5%BA%AB%E7%AE%A1%E7%90%86%E7%B3%BB%E7%B5%B1)
