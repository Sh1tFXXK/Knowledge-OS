import fs from "node:fs";
import path from "node:path";

const SOURCE_PATH =
  "C:/Users/Administrator/Documents/Obsidian Vault/数据库/MySQL 词汇表.md";
const DICT_PATH = "E:/project/Knowledge-OS/概念字典.md";
const OUTPUT_PATH =
  "C:/Users/Administrator/Documents/Obsidian Vault/数据库/MySQL 词汇表-整理版.md";
const REPORT_PATH =
  "C:/Users/Administrator/Documents/Obsidian Vault/数据库/MySQL 词汇表-整理报告.md";
const OFFICIAL_GLOSSARY_URL =
  "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/glossary.html";

const SOURCE_TEXT = fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
const DICT_TEXT = fs.existsSync(DICT_PATH)
  ? fs.readFileSync(DICT_PATH, "utf8")
  : "";
const SOURCE_LINES = SOURCE_TEXT.split("\n");

const falseTitleLines = new Set([
  "连续锁模式",
  "在 REPEATABLE READ",
  "一个自动检测何时发生",
  "字典对象缓存将之前访问过的",
  "INFORMATION_SCHEMA 数据库还包含与 InnoDB 特定的表",
  "可能导致",
  "The following matrix summarizes rw-lock type compatibility.",
  "保存点有助于实现嵌套的",
  "许多内置数据库机制使用相反的",
  "允许一个",
  "如果被截断的表包含",
  "这是一个分布式",
  "由一组列（一个或多个）组成的",
  "在一个列或一组列上建立的索引具有",
  "与存储生成的",
  "MySQL 应用程序是使用以下之一编写的",
  "其他类型的统计信息可以通过",
  "乐观策略的对立面是",
  "对于适用于",
  "保存MySQL实例配置",
  "当具有该隔离级别的事务执行",
  "将更改从",
  "用于唯一标识 MySQL 实例中的",
  "一个或多个数据文件（ibdata",
  "在系统表空间中或在单独的",
  "每个 MySQL 表都与特定的",
  "系统表空间支持使用",
  "它包含在",
  "host 和",
  "某些可能通过强制事务等待其他事务完成而降低",
  "以确保在关闭期间所有相关更改都应用于",
  "tablespace和undo",
  "设计在可行的情况下使用",
  "mutexes和",
  "在 redo",
  "InnoDB 内部用于",
  "source和",
  "通常与一个",
  "流量的端口和另一个用于",
  "CREATE UNDO",
  "crash recovery 和管理",
  "clustered index并更新",
  "在不同的 isolation",
  "未能跟上重做日志生成时可能发生的数据丢失",
  "表空间和 一般",
  "涉及语句 FLUSH TABLES ... FOR",
  "TABLESPACE 和 ALTER TABLE ... IMPORT",
  "得使用依赖于",
]);

const localTitleToEnglish = new Map(
  Object.entries({
    "本地 C API": "native C API",
    自然键: "natural key",
    服务器: "server",
    服务器端准备语句: "server-side prepared statement",
    初创企业: "startup",
    语句拦截器: "statement interceptor",
    基于语句的复制: "statement-based replication",
    事务: "transaction",
    "事务 ID": "transaction ID",
    离页列: "off-page column",
    在线: "online",
    "在线 DDL": "online DDL",
    保存点: "savepoint",
    邻页: "neighbor page",
    会话临时表空间: "session temporary tablespace",
    共享锁: "shared lock",
    共享表空间: "shared tablespace",
    统计学: "statistics",
    词干提取: "stemming",
    停用词: "stopword",
    透明页面压缩: "transparent page compression",
    可移植表空间: "transportable tablespace",
    下键锁: "next-key lock",
    尖锐检查点: "sharp checkpoint",
    关闭: "shutdown",
    从属: "slave",
    存储引擎: "storage engine",
    存储生成列: "stored generated column",
    存储对象: "stored object",
    故障排除: "troubleshooting",
    非锁定读取: "non-locking read",
    慢查询日志: "slow query log",
    缓慢关机: "slow shutdown",
    快照: "snapshot",
    存储程序: "stored program",
    存储例程: "stored routine",
    严格模式: "strict mode",
    截断: "truncate",
    两阶段提交: "two-phase commit",
    撤销: "undo",
    不可重复读取: "non-repeatable read",
    乐观的: "optimistic",
    优化器: "optimizer",
    选项: "option",
    选项文件: "option file",
    溢出页: "overflow page",
    重做日志: "redo log",
    重做日志归档: "redo log archiving",
    冗余行格式: "redundant row format",
    参照完整性: "referential integrity",
    排序缓冲区: "sort buffer",
    源: "source",
    "空间 ID": "space ID",
    子列表: "sublist",
    极大记录: "supremum record",
    替代键: "surrogate key",
    合成密钥: "synthetic key",
    系统表空间: "system tablespace",
    桌子: "table",
  }),
);

const canonicalZhByEnglish = new Map(
  Object.entries({
    "application programming interface (API)": "应用程序编程接口（API）",
    "auto-increment locking": "自增锁",
    autocommit: "自动提交",
    "base column": "基础列",
    bounce: "重启服务",
    "buffer pool": "缓冲池",
    "buffer pool instance": "缓冲池实例",
    "built-in": "内置",
    "business rules": "业务规则",
    cache: "缓存",
    cardinality: "基数",
    "change buffer": "变更缓冲区",
    "change buffering": "变更缓冲",
    "child table": "子表",
    "clean page": "干净页",
    "clean shutdown": "干净关闭",
    "client libraries": "客户端库",
    "client-side prepared statement": "客户端预处理语句",
    "clustered index": "聚簇索引",
    column: "列",
    "column prefix": "列前缀",
    concurrency: "并发",
    "consistent read": "一致性读取",
    constraint: "约束",
    counter: "计数器",
    cursor: "游标",
    "data definition language": "数据定义语言",
    "data dictionary": "数据字典",
    "data directory": "数据目录",
    "data files": "数据文件",
    "data manipulation language": "数据操纵语言",
    database: "数据库",
    deadlock: "死锁",
    delete: "删除",
    "delete buffering": "删除缓冲",
    "descending index": "降序索引",
    "dirty page": "脏页",
    "dirty read": "脏读",
    "doublewrite buffer": "双写缓冲区",
    "dynamic row format": "动态行格式",
    "fast index creation": "快速创建索引",
    "file-per-table": "每表一个文件",
    flushing: "刷新",
    "foreign key": "外键",
    "full backup": "完整备份",
    "full table scan": "全表扫描",
    "full-text search": "全文搜索",
    "FULLTEXT index": "全文索引",
    "gap lock": "间隙锁",
    "general query log": "通用查询日志",
    "general tablespace": "通用表空间",
    "generated column": "生成列",
    "hash index": "哈希索引",
    "history list": "历史列表",
    "hot backup": "热备份",
    "ibdata file": "ibdata 文件",
    "ib_logfile": "ib_logfile 文件",
    index: "索引",
    "index hint": "索引提示",
    "index prefix": "索引前缀",
    "insert buffer": "插入缓冲区",
    "insert buffering": "插入缓冲",
    "insert intention lock": "插入意向锁",
    instance: "实例",
    "intention lock": "意向锁",
    "isolation level": "隔离级别",
    join: "连接",
    latch: "闩锁",
    list: "列表",
    lock: "锁",
    "lock escalation": "锁升级",
    "lock mode": "锁模式",
    locking: "锁定",
    "locking read": "锁定读",
    "logical backup": "逻辑备份",
    "logical operator": "逻辑运算符",
    "low-water mark": "低水位线",
    "master thread": "主线程",
    "metadata lock": "元数据锁",
    "metrics counter": "指标计数器",
    "mixed-mode insert": "混合模式插入",
    "multi-core": "多核",
    "multiversion concurrency control": "多版本并发控制",
    mutex: "互斥量",
    "native C API": "本地 C API",
    "natural key": "自然键",
    "neighbor page": "邻页",
    "next-key lock": "临键锁",
    "non-locking read": "非锁定读",
    "non-repeatable read": "不可重复读",
    normalized: "规范化",
    "NOT NULL constraint": "NOT NULL 约束",
    "off-page column": "离页列",
    online: "在线",
    "online DDL": "在线 DDL",
    optimistic: "乐观",
    optimizer: "优化器",
    option: "选项",
    "option file": "选项文件",
    "overflow page": "溢出页",
    page: "页",
    "page cleaner": "页面清理器",
    "page size": "页大小",
    "partial backup": "部分备份",
    "partial index": "部分索引",
    "persistent statistics": "持久统计信息",
    pessimistic: "悲观",
    phantom: "幻读",
    physical: "物理",
    "physical backup": "物理备份",
    "plan stability": "计划稳定性",
    port: "端口",
    prefix: "前缀",
    "prepared backup": "准备好的备份",
    "prepared statement": "预处理语句",
    "primary key": "主键",
    principal: "主体",
    process: "进程",
    "pseudo-record": "伪记录",
    purge: "清理",
    "purge buffering": "清理缓冲",
    "purge lag": "清理延迟",
    "purge thread": "清理线程",
    query: "查询",
    "query execution plan": "查询执行计划",
    "query log": "查询日志",
    quiesce: "静默",
    "random dive": "随机探查",
    "raw backup": "原始备份",
    "READ COMMITTED": "读已提交",
    "READ UNCOMMITTED": "读未提交",
    "read phenomena": "读现象",
    "read view": "读视图",
    "read-ahead": "预读",
    "read-only transaction": "只读事务",
    "record lock": "记录锁",
    redo: "重做",
    "redo log": "重做日志",
    "redo log archiving": "重做日志归档",
    "redundant row format": "冗余行格式",
    "referential integrity": "参照完整性",
    relational: "关系型",
    relevance: "相关性",
    "REPEATABLE READ": "可重复读",
    repertoire: "字符集集合",
    replica: "副本",
    replication: "复制",
    restore: "恢复",
    rollback: "回滚",
    "rollback segment": "回滚段",
    row: "行",
    "row format": "行格式",
    "row lock": "行锁",
    "row-based replication": "基于行的复制",
    "row-level locking": "行级锁定",
    "rw-lock": "读写锁",
    savepoint: "保存点",
    scalability: "可伸缩性",
    "scale out": "向外扩展",
    "scale up": "向上扩展",
    schema: "模式",
    "search index": "搜索索引",
    "secondary index": "二级索引",
    segment: "段",
    selectivity: "选择性",
    "semi-consistent read": "半一致性读取",
    SERIALIZABLE: "可串行化",
    server: "服务器",
    "server-side prepared statement": "服务器端预处理语句",
    "service principal name": "服务主体名称",
    "service ticket": "服务票据",
    servlet: "Servlet",
    "session temporary tablespace": "会话临时表空间",
    "shared lock": "共享锁",
    "shared tablespace": "共享表空间",
    "sharp checkpoint": "尖锐检查点",
    shutdown: "关闭",
    slave: "从属服务器",
    "slow query log": "慢查询日志",
    "slow shutdown": "缓慢关闭",
    snapshot: "快照",
    "sort buffer": "排序缓冲区",
    source: "源",
    "space ID": "空间 ID",
    "sparse file": "稀疏文件",
    spin: "自旋",
    startup: "启动",
    "statement interceptor": "语句拦截器",
    "statement-based replication": "基于语句的复制",
    statistics: "统计信息",
    stemming: "词干提取",
    stopword: "停用词",
    "storage engine": "存储引擎",
    "stored generated column": "存储生成列",
    "stored object": "存储对象",
    "stored program": "存储程序",
    "stored routine": "存储例程",
    "strict mode": "严格模式",
    sublist: "子列表",
    "supremum record": "上确界记录",
    "surrogate key": "代理键",
    "synthetic key": "合成键",
    "system tablespace": "系统表空间",
    table: "表",
    "table lock": "表锁",
    "table scan": "表扫描",
    "table statistics": "表统计信息",
    "table type": "表类型",
    tablespace: "表空间",
    "temporary table": "临时表",
    "temporary tablespace": "临时表空间",
    "text collection": "文本集合",
    thread: "线程",
    "ticket-granting server": "票证授予服务器",
    "ticket-granting ticket": "票证授予票证",
    "torn page": "撕裂页",
    transaction: "事务",
    "transaction ID": "事务 ID",
    "transparent page compression": "透明页压缩",
    "transportable tablespace": "可传输表空间",
    troubleshooting: "故障排除",
    truncate: "截断",
    truststore: "信任库",
    tuple: "元组",
    "two-phase commit": "两阶段提交",
    undo: "撤销",
    "undo buffer": "撤销缓冲区",
    "undo log": "撤销日志",
    "undo log segment": "撤销日志段",
    "undo tablespace": "撤销表空间",
    "unique constraint": "唯一约束",
    "unique index": "唯一索引",
    "unique key": "唯一键",
    "user principal name": "用户主体名称",
    "variable-length type": "可变长度类型",
    victim: "受害者",
    view: "视图",
    "virtual column": "虚拟列",
    "virtual generated column": "虚拟生成列",
    "virtual index": "虚拟索引",
    wait: "等待",
    "warm backup": "温备份",
    "warm up": "预热",
    workload: "工作负载",
    "write combining": "写入合并",
    young: "年轻页",
  }),
);

const augmentDefinitions = new Map(
  Object.entries({
    MVCC: [
      "InnoDB 是一个多版本存储引擎。它保留已更改行的旧版本信息，用于支持事务并发、事务回滚和一致性读取。这些旧版本信息存储在 undo 表空间中的回滚段数据结构里。",
      "InnoDB 在每一行内部维护隐藏字段：`DB_TRX_ID` 记录最后插入或更新该行的事务标识符；`DB_ROLL_PTR` 是回滚指针，指向回滚段中的 undo 日志记录；`DB_ROW_ID` 是在需要由 InnoDB 自动生成聚簇索引时使用的单调递增行 ID。",
      "Undo 日志分为插入 undo 日志和更新 undo 日志。插入 undo 日志只在事务回滚时需要，事务提交后可以立即丢弃；更新 undo 日志既用于回滚，也用于一致性读取，因此只有在不再有事务快照需要它来构造旧版本行时才能清理。",
      "删除在 InnoDB 内部被视为一种更新：行会先被标记为已删除，等相关更新 undo 日志不再被一致性读取需要时，清理线程才会物理移除对应的行和索引记录。",
      "MVCC 对聚簇索引和二级索引的处理不同。聚簇索引记录原地更新，并通过隐藏系统列指向 undo 日志以重建旧版本；二级索引记录不包含这些隐藏系统列，也不是原地更新，二级索引列更新时会标记旧二级索引记录为删除并插入新记录。",
      "当二级索引记录被标记为删除，或二级索引页被比读取事务更新的事务修改时，InnoDB 需要回到聚簇索引检查 `DB_TRX_ID`，必要时通过 undo 日志取回该读取事务可见的正确版本。这种情况下通常不能直接使用覆盖索引返回值；如果启用 ICP，能够只用索引字段判断的 WHERE 条件仍可先在存储引擎层过滤。",
    ],
    ".MYD file": [
      "`.MYD` 文件是 MyISAM 存储引擎专用的数据文件，用于存放 MyISAM 表的数据。每一张 MyISAM 表通常对应一个 `.MYD` 文件。",
    ],
    ".MYI file": [
      "`.MYI` 文件是 MyISAM 存储引擎专用的索引文件，用于存放 MyISAM 表的索引相关信息。每一张 MyISAM 表通常对应一个 `.MYI` 文件。",
    ],
    ".ibd file": [
      "`.ibd` 文件用于 InnoDB 独享表空间，即 file-per-table 表空间。启用每表一个文件后，每张 InnoDB 表的数据和索引可以存放在各自对应的 `.ibd` 文件中。",
    ],
    "ibdata file": [
      "`ibdata` 文件用于 InnoDB 系统表空间或共享表空间，文件名通常为 `ibdata1`、`ibdata2` 等。共享表空间模式下，多张表可以共同使用一个或多个 `ibdata` 文件。",
    ],
    ib_logfile: [
      "`ib_logfile0`、`ib_logfile1` 等文件是 InnoDB redo log 日志文件，用于记录对 InnoDB 表数据的变更请求，并在崩溃恢复时重放未完成写入相关的重做信息。",
    ],
  }),
);

const supplementalEntries = [
  {
    section: "Supplement",
    english: "InnoDB Multi-Versioning",
    chinese: "InnoDB 多版本控制",
    definition: [
      "InnoDB 多版本控制是 InnoDB MVCC 的具体实现：通过行隐藏字段、undo 日志、回滚段和一致性读取机制，让事务能够看到符合自身隔离级别的历史版本，同时支持并发访问和事务回滚。",
    ],
  },
  {
    section: "Supplement",
    english: "DB_TRX_ID",
    chinese: "DB_TRX_ID",
    definition: [
      "`DB_TRX_ID` 是 InnoDB 为每行维护的 6 字节隐藏字段，表示最后插入或更新该行的事务标识符。删除在内部也被视为更新，会设置特殊标记表示该行已被删除。",
    ],
  },
  {
    section: "Supplement",
    english: "DB_ROLL_PTR",
    chinese: "DB_ROLL_PTR",
    definition: [
      "`DB_ROLL_PTR` 是 InnoDB 为每行维护的 7 字节隐藏字段，也称回滚指针。它指向写入回滚段的 undo 日志记录；如果行被更新，该 undo 记录包含重建更新前行内容所需的信息。",
    ],
  },
  {
    section: "Supplement",
    english: "DB_ROW_ID",
    chinese: "DB_ROW_ID",
    definition: [
      "`DB_ROW_ID` 是 InnoDB 为行维护的 6 字节隐藏字段，值随新行插入单调递增。当 InnoDB 需要自动生成聚簇索引时，聚簇索引包含该行 ID 值；否则该隐藏列不会出现在任何索引中。",
    ],
  },
  {
    section: "Supplement",
    english: "Rollback Pointer",
    chinese: "回滚指针",
    definition: [
      "回滚指针是行记录中指向 undo 日志记录的内部指针。在 InnoDB 中它由 `DB_ROLL_PTR` 表示，用于在回滚或一致性读取时定位可重建旧版本行的数据。",
    ],
  },
  {
    section: "Supplement",
    english: "Insert Undo Log",
    chinese: "插入 Undo 日志",
    definition: [
      "插入 undo 日志记录事务插入新行所需的回滚信息。它只在事务回滚时需要，因此事务提交后可以立即丢弃。",
    ],
  },
  {
    section: "Supplement",
    english: "Update Undo Log",
    chinese: "更新 Undo 日志",
    definition: [
      "更新 undo 日志记录更新或删除前的行版本信息，既用于事务回滚，也用于一致性读取。只有当不存在可能需要该历史版本的事务快照时，更新 undo 日志才可以被清理。",
    ],
  },
  {
    section: "Supplement",
    english: "Purge Operation",
    chinese: "清理操作",
    definition: [
      "清理操作是 InnoDB 物理移除已删除行及其索引记录、释放不再需要的 undo 日志页面的后台过程。若长事务长期持有旧快照，清理可能滞后，导致回滚段和表中死记录增长。",
    ],
  },
  {
    section: "Supplement",
    english: "ibdata1 file",
    chinese: "ibdata1 文件",
    definition: [
      "`ibdata1` 是常见的 InnoDB 系统表空间数据文件名，可存储表空间元数据、变更缓冲、双写缓冲，以及在部分配置下的 undo 日志等系统级 InnoDB 数据。",
    ],
  },
  {
    section: "Supplement",
    english: "PID file",
    chinese: "PID 文件",
    definition: [
      "PID 文件是 `mysqld` 在 Unix/Linux 环境下使用的进程文件，用于保存 MySQL 服务器进程的进程 ID，便于服务管理脚本识别和控制运行中的进程。",
    ],
  },
  {
    section: "Supplement",
    english: "Socket file",
    chinese: "Socket 文件",
    definition: [
      "Socket 文件是 Unix/Linux 环境下用于本地进程间通信的 Unix Socket 文件。MySQL 客户端在本机连接 MySQL 服务器时，可以不经过 TCP/IP 网络，而通过该 socket 文件连接。",
    ],
  },
  {
    section: "Supplement",
    english: "Materialized View",
    chinese: "物化视图",
    definition: [
      "物化视图是把查询结果物理保存下来的视图形态，读取时访问已保存的结果数据，而不是每次都重新执行完整查询。它通常需要刷新机制来保持结果与源表一致。MySQL 没有与某些数据库完全等价的原生物化视图对象，常通过普通表、事件、触发器或调度任务模拟。",
    ],
  },
];

function stripHtmlTags(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8212;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value) {
  return value
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/^["“”]+|["“”]+$/g, "")
    .trim();
}

function normalizeComparable(value) {
  return value.toLowerCase().replace(/["']/g, "").replace(/\s+/g, " ").trim();
}

function hasHan(value) {
  return /\p{Script=Han}/u.test(value);
}

function mostlyAscii(value) {
  return !hasHan(value) && /[A-Za-z0-9]/.test(value);
}

function acronym(value) {
  const match = value.match(/\(([A-Z0-9]{2,})\)/);
  return match?.[1]?.toLowerCase();
}

function isLetterSection(line) {
  return /^###\s+"?[#A-Z]"?\s*$/.test(line.trim());
}

function titleLike(rawValue) {
  const value = normalizeTitle(rawValue);
  if (falseTitleLines.has(value)) return false;
  if (!value || value.startsWith("- ") || value.startsWith(">")) return false;
  if (value.length > 90) return false;
  if (/[，。；：:！？!?；`*\[\]]/.test(value)) return false;
  return /^[\p{Script=Han}A-Za-z0-9_.+/#\-（）() ]+$/u.test(value);
}

function previousNonEmptyLine(index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const text = SOURCE_LINES[i].trim();
    if (text) return { line: i + 1, text };
  }
  return { line: 0, text: "" };
}

function nextNonEmptyLine(index) {
  for (let i = index + 1; i < SOURCE_LINES.length; i += 1) {
    const text = SOURCE_LINES[i].trim();
    if (text) return { line: i + 1, text };
  }
  return { line: 0, text: "" };
}

function isBareCandidate(index, lastTitleLine) {
  const raw = SOURCE_LINES[index].trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("- ") || raw.startsWith(">")) {
    return false;
  }
  if (!titleLike(raw)) return false;

  const previous = previousNonEmptyLine(index);
  if (previous.line === lastTitleLine) return false;

  const next = nextNonEmptyLine(index);
  if (!next.text || next.text.startsWith("###") || next.text.startsWith("##")) {
    return false;
  }

  return true;
}

function parseOfficialGlossary(html) {
  const entries = [];
  let section = "";

  for (const match of html.matchAll(
    /<h3 class="title">([\s\S]*?)<\/h3>|<dt><a id="([^"]+)"><\/a><span class="glossterm">([\s\S]*?)<\/span><\/dt>/g,
  )) {
    if (match[1]) {
      section = stripHtmlTags(match[1]);
      continue;
    }
    entries.push({
      section,
      id: match[2],
      english: stripHtmlTags(match[3]),
    });
  }

  return entries;
}

function parseConceptDictionary(text) {
  const englishToChinese = new Map();

  for (const line of text.split(/\r?\n/)) {
    const item = line.trim().match(/^-\s+(.+)$/);
    if (!item) continue;

    const value = item[1].trim();
    const pair = value.match(/^(.+?)（(.+?)）$/);
    if (!pair) continue;

    const outside = pair[1].trim();
    const inside = pair[2].trim();

    if (mostlyAscii(outside) && hasHan(inside)) {
      englishToChinese.set(normalizeComparable(outside), inside);
    } else if (hasHan(outside) && mostlyAscii(inside)) {
      englishToChinese.set(normalizeComparable(inside), outside);
    }
  }

  return englishToChinese;
}

function parseLocalCandidates() {
  const candidates = [];
  let lastTitleLine = 0;

  for (let i = 0; i < SOURCE_LINES.length; i += 1) {
    const trimmed = SOURCE_LINES[i].trim();
    if (isLetterSection(trimmed)) continue;

    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      candidates.push({
        title: normalizeTitle(h2[1]),
        line: i + 1,
        explicit: true,
      });
      lastTitleLine = i + 1;
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3 && titleLike(h3[1])) {
      candidates.push({
        title: normalizeTitle(h3[1]),
        line: i + 1,
        explicit: false,
      });
      lastTitleLine = i + 1;
      continue;
    }

    if (isBareCandidate(i, lastTitleLine)) {
      candidates.push({
        title: normalizeTitle(trimmed),
        line: i + 1,
        explicit: false,
      });
      lastTitleLine = i + 1;
    }
  }

  return candidates;
}

function pairCost(local, official) {
  const localComparable = normalizeComparable(local.title);
  const officialComparable = normalizeComparable(official.english);
  const knownEnglish = localTitleToEnglish.get(local.title);

  if (knownEnglish?.toLowerCase() === officialComparable) return -8;
  if (localComparable === officialComparable) return -8;

  const localAcronym = acronym(local.title);
  if (
    localAcronym &&
    (localAcronym === officialComparable ||
      officialComparable.endsWith(`(${localAcronym})`))
  ) {
    return -5;
  }

  return mostlyAscii(local.title) ? 8 : 0.6;
}

function alignEntries(localCandidates, officialEntries) {
  const localCount = localCandidates.length;
  const officialCount = officialEntries.length;
  const dp = Array.from({ length: localCount + 1 }, () =>
    Array(officialCount + 1).fill(Infinity),
  );
  const backtrack = Array.from({ length: localCount + 1 }, () =>
    Array(officialCount + 1).fill(null),
  );

  dp[0][0] = 0;
  for (let i = 0; i <= localCount; i += 1) {
    for (let j = 0; j <= officialCount; j += 1) {
      const current = dp[i][j];
      if (!Number.isFinite(current)) continue;

      if (i < localCount && j < officialCount) {
        const cost = current + pairCost(localCandidates[i], officialEntries[j]);
        if (cost < dp[i + 1][j + 1]) {
          dp[i + 1][j + 1] = cost;
          backtrack[i + 1][j + 1] = "match";
        }
      }

      if (i < localCount) {
        const cost = current + (localCandidates[i].explicit ? 20 : 0.8);
        if (cost < dp[i + 1][j]) {
          dp[i + 1][j] = cost;
          backtrack[i + 1][j] = "skipLocal";
        }
      }

      if (j < officialCount) {
        const cost = current + 1.8;
        if (cost < dp[i][j + 1]) {
          dp[i][j + 1] = cost;
          backtrack[i][j + 1] = "insertOfficial";
        }
      }
    }
  }

  const steps = [];
  let i = localCount;
  let j = officialCount;
  while (i > 0 || j > 0) {
    const step = backtrack[i][j];
    if (step === "match") {
      steps.push({
        type: "match",
        local: localCandidates[i - 1],
        official: officialEntries[j - 1],
      });
      i -= 1;
      j -= 1;
    } else if (step === "skipLocal") {
      steps.push({ type: "skipLocal", local: localCandidates[i - 1] });
      i -= 1;
    } else if (step === "insertOfficial") {
      steps.push({ type: "insertOfficial", official: officialEntries[j - 1] });
      j -= 1;
    } else {
      throw new Error(`Unable to backtrack alignment at local=${i}, official=${j}`);
    }
  }

  return steps.reverse();
}

function cleanDefinition(lines) {
  return lines
    .filter((line) => !/^###\s+"?[#A-Z]"?\s*$/.test(line.trim()))
    .filter((line) => line.trim() !== "undefined")
    .join("\n")
    .replace(/\*\*\s+([^*]+?)\s+\*\*/g, "**$1**")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function definitionFor(local, nextLocal) {
  if (!local) return "定义待补充。";

  const start = local.line;
  const end = nextLocal ? nextLocal.line - 2 : SOURCE_LINES.length - 1;
  return cleanDefinition(SOURCE_LINES.slice(start, end + 1));
}

function zhFor(officialEnglish, localTitle, dictionary) {
  const comparable = normalizeComparable(officialEnglish);
  const override = canonicalZhByEnglish.get(officialEnglish);
  if (override) return override;

  const dictionaryMatch = dictionary.get(comparable);
  if (dictionaryMatch) return dictionaryMatch;

  if (localTitle && hasHan(localTitle)) return localTitle;
  return officialEnglish;
}

function sourceUrl(entry) {
  return `${OFFICIAL_GLOSSARY_URL}#${entry.id}`;
}

function renderDefinition(definition, augment) {
  const blocks = [];
  if (definition) blocks.push(definition.trim());
  if (augment?.length) blocks.push(augment.join("\n\n"));
  return blocks.join("\n\n").trim() || "定义待补充。";
}

function renderEntry(entry) {
  const title =
    entry.english === entry.chinese
      ? `### ${entry.english}`
      : `### ${entry.english} / ${entry.chinese}`;
  const sourceLines = [];
  if (entry.sourceLine) sourceLines.push(`- 原始行: ${entry.sourceLine}`);
  if (entry.sourceUrl) sourceLines.push(`- 官方锚点: ${entry.sourceUrl}`);
  if (entry.originalTitle && entry.originalTitle !== entry.chinese) {
    sourceLines.push(`- 原始标题: ${entry.originalTitle}`);
  }

  return [
    title,
    "",
    `- English: ${entry.english}`,
    `- 中文: ${entry.chinese}`,
    ...sourceLines,
    "",
    "#### 定义",
    "",
    entry.definition,
    "",
  ].join("\n");
}

async function main() {
  const officialHtml = await fetch(OFFICIAL_GLOSSARY_URL, {
    headers: { "user-agent": "Mozilla/5.0" },
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch official glossary: ${response.status}`);
    }
    return response.text();
  });

  const officialEntries = parseOfficialGlossary(officialHtml);
  const dictionary = parseConceptDictionary(DICT_TEXT);
  const localCandidates = parseLocalCandidates();
  const alignment = alignEntries(localCandidates, officialEntries);
  const skippedCandidates = alignment.filter((step) => step.type === "skipLocal");
  const insertedOfficial = alignment.filter(
    (step) => step.type === "insertOfficial",
  );

  const matchedSteps = alignment.filter((step) => step.type === "match");
  const matchedLocalLines = matchedSteps.map((step) => step.local);
  const localLineToNext = new Map();
  for (let i = 0; i < matchedLocalLines.length; i += 1) {
    localLineToNext.set(matchedLocalLines[i].line, matchedLocalLines[i + 1]);
  }

  const entries = matchedSteps.map((step) => {
    const official = step.official;
    const local = step.local;
    const chinese = zhFor(official.english, local.title, dictionary);
    const baseDefinition = definitionFor(local, localLineToNext.get(local.line));
    return {
      section: official.section,
      english: official.english,
      chinese,
      originalTitle: local.title,
      sourceLine: local.line,
      sourceUrl: sourceUrl(official),
      definition: renderDefinition(
        baseDefinition,
        augmentDefinitions.get(official.english),
      ),
    };
  });

  for (const step of insertedOfficial) {
    entries.push({
      section: step.official.section,
      english: step.official.english,
      chinese: zhFor(step.official.english, "", dictionary),
      sourceUrl: sourceUrl(step.official),
      definition: renderDefinition(
        "定义待补充。",
        augmentDefinitions.get(step.official.english),
      ),
    });
  }

  for (const supplemental of supplementalEntries) {
    entries.push({
      section: supplemental.section,
      english: supplemental.english,
      chinese: supplemental.chinese,
      definition: supplemental.definition.join("\n\n"),
    });
  }

  const generatedAt = new Date().toISOString();
  const grouped = new Map();
  for (const entry of entries) {
    if (!grouped.has(entry.section)) grouped.set(entry.section, []);
    grouped.get(entry.section).push(entry);
  }

  const sectionOrder = [
    "#",
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    "Supplement",
  ];

  const output = [
    "# MySQL 词汇表（中英双语整理版）",
    "",
    `> 生成时间：${generatedAt}`,
    `> 原始文档：${SOURCE_PATH}`,
    `> 英文词条对齐来源：${OFFICIAL_GLOSSARY_URL}`,
    "> 说明：原始文档未被覆盖；解释内容统一放入每个词条的“定义”小节。",
    "",
  ];

  for (const section of sectionOrder) {
    const sectionEntries = grouped.get(section);
    if (!sectionEntries?.length) continue;
    output.push(`## ${section === "Supplement" ? "补充词条" : section}`, "");
    for (const entry of sectionEntries) {
      output.push(renderEntry(entry));
    }
  }

  const ambiguousChinese = entries
    .filter(
      (entry) =>
        entry.english === entry.chinese &&
        /[a-z]/.test(entry.english) &&
        !/^(mysql|innodb|myisam|ndb|jdbc|odbc|api|sql|ssl|json|tcl|ruby|python|perl|php|java|tomcat|spring|mono|memcached|acid|mvcc|xa|tgs|tgt|upn|sdi|ssd|st|c#|c\+\+)$/i.test(
          entry.english,
        ),
    )
    .map((entry) => entry.english);

  const report = [
    "# MySQL 词汇表整理报告",
    "",
    `- 生成时间：${generatedAt}`,
    `- 原始文档：${SOURCE_PATH}`,
    `- 整理版：${OUTPUT_PATH}`,
    `- 官方英文词条数：${officialEntries.length}`,
    `- 本地候选标题数：${localCandidates.length}`,
    `- 成功对齐词条数：${matchedSteps.length}`,
    `- 仅官方占位词条数：${insertedOfficial.length}`,
    `- 已跳过疑似正文标题数：${skippedCandidates.length}`,
    `- 补充词条数：${supplementalEntries.length}`,
    `- 中文名仍等同英文、建议人工复核数：${ambiguousChinese.length}`,
    "",
    "## 已跳过疑似正文标题",
    "",
    ...skippedCandidates.map((step) => `- ${step.local.line}: ${step.local.title}`),
    "",
    "## 仅官方占位词条",
    "",
    ...(insertedOfficial.length
      ? insertedOfficial.map((step) => `- ${step.official.english}`)
      : ["- 无"]),
    "",
    "## 中文名建议复核",
    "",
    ...(ambiguousChinese.length ? ambiguousChinese.map((term) => `- ${term}`) : ["- 无"]),
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output.join("\n"), "utf8");
  fs.writeFileSync(REPORT_PATH, report, "utf8");

  console.log(
    JSON.stringify(
      {
        output: OUTPUT_PATH,
        report: REPORT_PATH,
        officialEntries: officialEntries.length,
        localCandidates: localCandidates.length,
        matchedEntries: matchedSteps.length,
        insertedOfficial: insertedOfficial.length,
        skippedCandidates: skippedCandidates.length,
        supplementalEntries: supplementalEntries.length,
        ambiguousChinese: ambiguousChinese.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
