import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');

// 常用类库分组
const GROUP_TREE_ID = 'tree_java_common_libraries';
const GROUP_NODE_ID = 'k_java_common_libraries';

// 新节点
const NODE_ID = 'k_java_time_datetime';
const TREE_ID = 'tree_java_time_datetime';
const NODE_LABEL = 'Java 日期时间';
const TREE_NAME = '日期时间';

// ========== 知识内容 ==========

const overview = `Java 提供了多套日期时间 API，分为传统 API 和 Java 8 新 API 两大类。

| 类别 | 主要类 | 线程安全 | 可变性 | Java 版本 | 特点 |
|------|--------|----------|--------|-----------|------|
| 传统日期 | Date, Calendar, GregorianCalendar | 否 | 可变 | 1.0+ | 设计缺陷多，不推荐使用 |
| 新日期时间 | LocalDate, LocalTime, LocalDateTime, ZonedDateTime, ChronoUnit | 是 | 不可变 | 8+ | 设计良好，推荐使用 |
| 时间戳 | Instant | 是 | 不可变 | 8+ | 机器时间，精确到纳秒 |
| 格式化 | DateTimeFormatter | 是 | 不可变 | 8+ | 线程安全的格式化类 |

最佳实践：
1. 新项目优先使用 java.time 包（Java 8+）
2. 避免使用老旧的 Date 和 Calendar 类
3. 不需要时区用 LocalDate/LocalTime/LocalDateTime，需要时区用 ZonedDateTime
4. 格式化用 DateTimeFormatter 而非 SimpleDateFormat
5. JDBC 4.2+ 直接支持 java.time 类型，旧版本可转换为 java.sql.Date/Timestamp`;

const java8api = `Java 8 引入的 java.time 包提供了线程安全、不可变的日期时间 API。

【LocalDate（日期）】
- 表示不带时间的日期（年-月-日）
- now()：获取当前日期
- of(int year, Month month, int dayOfMonth)：创建特定日期
- plusDays/plusWeeks/plusMonths/plusYears：日期加法
- minusDays/minusMonths/minusYears：日期减法
- getYear()/getMonth()/getDayOfMonth()：获取分量
- isLeapYear()：判断是否闰年

【LocalTime（时间）】
- 表示不带日期的时间（时-分-秒）
- now()：获取当前时间
- of(int hour, int minute, int second)：创建特定时间
- getHour()/getMinute()/getSecond()：获取分量
- plusHours/plusMinutes/plusSeconds：时间加法

【LocalDateTime（日期时间）】
- 表示日期+时间，无时区信息
- now()：获取当前日期时间
- of(int year, int month, int dayOfMonth, int hour, int minute)：创建特定日期时间
- plusMonths/plusDays/plusHours：日期时间加减

【ZonedDateTime（带时区日期时间）】
- 表示带时区的日期时间
- now(ZoneId.of("Asia/Shanghai"))：获取指定时区当前时间
- withZoneSameInstant(ZoneId)：转换时区，保持瞬时点不变
- getZone()：获取时区

【Instant（时间戳）】
- 表示时间线上的瞬时点，机器时间
- now()：获取当前时间戳
- plusSeconds(long)：加秒数
- toEpochMilli()：获取毫秒时间戳（从1970-01-01T00:00:00Z起）

【ChronoUnit（时间单位）】
- 用于测量时间的标准单位，如 DAYS、MONTHS、YEARS、HOURS、MINUTES、SECONDS 等
- 可用于 between() 方法计算两个时间点之间的差值`;

const dateClass = `java.util.Date（传统日期类）

Date 类封装当前的日期和时间，是 Java 最早的日期类，设计存在缺陷，不推荐在新项目中使用。

【构造函数】
- Date()：使用当前日期和时间初始化对象
- Date(long millisec)：接收从 1970 年 1 月 1 日 00:00:00 GMT 起的毫秒数

【常用方法】
- boolean after(Date date)：调用对象在指定日期之后返回 true
- boolean before(Date date)：调用对象在指定日期之前返回 true
- Object clone()：返回此对象的副本
- int compareTo(Date date)：比较两个日期，相等返回0，之前返回负数，之后返回正数
- boolean equals(Object date)：两个日期相等返回 true
- long getTime()：返回自 1970 年 1 月 1 日以来的毫秒数
- void setTime(long time)：用毫秒数设置时间和日期
- String toString()：转换为字符串形式（dow mon dd hh:mm:ss zzz yyyy）

【注意】
- Date 类月份从 0 开始（0=1月，11=12月）
- Date 是可变类，非线程安全
- 大多数方法已废弃，推荐使用 java.time 包`;

const comparison = `日期比较的三种方式：

1. getTime() 比较
   - 通过 getTime() 获取两个日期自 1970 年 1 月 1 日（Unix 纪元）以来的毫秒数，然后比较这两个数值

2. before() / after() / equals() 方法
   - before(Date)：调用对象是否在指定日期之前
   - after(Date)：调用对象是否在指定日期之后
   - equals(Object)：两个日期是否相等
   - 语义更清晰，是 Date 类自带的比较方法

3. compareTo() 方法
   - Date 类实现了 Comparable 接口
   - 相等返回 0，调用对象在之前返回负数，在之后返回正数

Java 8 新 API 的比较：
- LocalDate/LocalDateTime 等提供 isBefore()、isAfter()、isEqual() 方法
- 也实现了 Comparable 接口，可使用 compareTo()
- 使用 ChronoUnit.between() 计算两个时间点之间的差值`;

const formatting = `日期时间格式化：

【SimpleDateFormat（传统，非线程安全）】
- 以语言环境敏感的方式格式化和解析日期
- 允许选择任何用户自定义日期时间格式
- 非线程安全，多线程环境下需注意
- 常用格式：yyyy-MM-dd HH:mm:ss

格式字母说明：
- yyyy：四位年份
- MM：月份（大写）
- dd：日期
- HH：24 小时制（大写）
- hh：12 小时制（小写）
- mm：分钟（小写）
- ss：秒
- SSS：毫秒

注意：MM 是月份，mm 是分钟；HH 是 24 小时制，hh 是 12 小时制。

【DateTimeFormatter（Java 8+，线程安全）】
- 线程安全的日期时间格式化与解析类
- 用于 LocalDate/LocalDateTime/ZonedDateTime 等新 API 的格式化
- 推荐使用，替代 SimpleDateFormat

【printf 格式化日期】
- 使用 %t 开头的格式符格式化日期
- 常用格式符：
  - %tY：四位年份
  - %tm：两位月份
  - %td：两位日期
  - %tH：24 小时制小时
  - %tM：分钟
  - %tS：秒
  - %tZ：时区
  - %tc：全部日期和时间信息
  - %tF：年-月-日格式
  - %tD：月/日/年格式
  - %tT：HH:MM:SS 格式（24时制）
  - %tr：HH:MM:SS PM 格式（12时制）
  - %tR：HH:MM 格式（24时制）

【解析字符串为时间】
- SimpleDateFormat 的 parse() 方法可按照给定格式解析字符串为 Date 对象
- 解析失败抛出 ParseException`;

const formatCodes = `日期时间格式化编码表（SimpleDateFormat / printf 通用）：

| 字母 | 描述 | 示例 |
|------|------|------|
| G | 纪元标记 | AD |
| y | 四位年份 | 2001 |
| M | 月份 | July or 07 |
| d | 一个月的日期 | 10 |
| h | A.M./P.M. (1~12) 格式小时 | 12 |
| H | 一天中的小时 (0~23) | 22 |
| m | 分钟数 | 30 |
| s | 秒数 | 55 |
| S | 毫秒数 | 234 |
| E | 星期几 | Tuesday |
| D | 一年中的日子 | 360 |
| F | 一个月中第几周的周几 | 2 (second Wed. in July) |
| w | 一年中第几周 | 40 |
| W | 一个月中第几周 | 1 |
| a | A.M./P.M. 标记 | PM |
| k | 一天中的小时 (1~24) | 24 |
| K | A.M./P.M. (0~11) 格式小时 | 10 |
| z | 时区 | Eastern Standard Time |
| ' | 文字定界符 | Delimiter |
| " | 单引号 | \` |`;

const calendar = `Calendar 类（传统日历）

Calendar 类是一个抽象类，功能比 Date 类强大，实现方式也更复杂。用于设置和获取日期数据的特定部分（年、月、日、时、分、秒等）。

【创建方式】
- Calendar.getInstance()：使用默认时区和语言环境创建 Calendar 对象（实际返回 GregorianCalendar）
- 创建对象的过程对程序员透明，只需使用 getInstance 方法

【字段常量】
- Calendar.YEAR：年份
- Calendar.MONTH：月份（从0开始，0=1月）
- Calendar.DATE / Calendar.DAY_OF_MONTH：日期
- Calendar.HOUR：12 小时制的小时
- Calendar.HOUR_OF_DAY：24 小时制的小时
- Calendar.MINUTE：分钟
- Calendar.SECOND：秒
- Calendar.DAY_OF_WEEK：星期几（1=星期日，2=星期一，以此类推）

【设置方法】
- set(int year, int month, int date)：设置年、月、日
- set(int field, int value)：设置指定字段的值，其他数值会重新计算
- add(int field, int amount)：根据日历规则，将指定时间量添加到给定字段（正数加，负数减）

【获取方法】
- get(int field)：获取指定字段的时间值
- 注意：月份需 +1，DAY_OF_WEEK 中 1 代表星期日

GregorianCalendar 类：
- Calendar 的具体实现，实现了公历日历
- Calendar.getInstance() 默认返回 GregorianCalendar 对象
- 定义了 AD（公元）和 BC（公元前）两个时代字段
- 提供多个构造函数，支持不同参数组合（年月日、时分秒、时区、语言环境等）
- isLeapYear(int year)：确定给定年份是否为闰年
- roll(int field, boolean up)：在给定字段上添加或减去单个时间单元，不更改更大的字段`;

const sleepAndMeasure = `线程休眠与时间测量：

【Thread.sleep() 休眠】
- sleep() 使当前线程进入停滞状态（阻塞当前线程），让出 CPU 的使用
- 目的是不让当前线程独自霸占该进程所获的 CPU 资源，留一定时间给其他线程执行
- 可以休眠任意毫秒数
- 调用需处理 InterruptedException

【测量时间间隔】
- 使用 System.currentTimeMillis() 获取当前时间的毫秒数（从1970-01-01 00:00:00 GMT起）
- 在操作前后分别获取时间戳，差值即为时间间隔（毫秒）
- Java 8+ 可使用 Instant.now() 配合 Duration.between() 更精确地测量时间间隔
- System.nanoTime() 可获取纳秒级精度，用于精确测量代码执行时间`;

// ========== 工具函数 ==========

async function readJson(name) {
  return JSON.parse(await readFile(resolve(DATA_DIR, name), 'utf8'));
}

async function writeJsonAtomic(name, data) {
  const target = resolve(DATA_DIR, name);
  const temporary = `${target}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

function upsertEdge(edges, edge) {
  const index = edges.findIndex((candidate) => candidate.id === edge.id);
  if (index >= 0) edges[index] = edge;
  else edges.push(edge);
}

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

// ========== 主流程 ==========

async function main() {
  const [nodePool, treeData, knowledgeEdges] = await Promise.all([
    readJson('node-pool.json'),
    readJson('tree-data.json'),
    readJson('knowledge-edges.json'),
  ]);

  const groupTree = findTreeNode(treeData, GROUP_TREE_ID);
  if (!groupTree) throw new Error('常用类库 group tree not found');

  // 1. 创建日期时间节点
  const existing = nodePool[NODE_ID];
  nodePool[NODE_ID] = {
    ...existing,
    id: NODE_ID,
    label: NODE_LABEL,
    role: 'concept',
    dimensions: ['java', 'jdk-api'],
    tags: ['java', 'jdk', '常用类库', '日期时间', 'Date', 'Calendar', 'java.time'],
    card: {
      ...(existing?.card ?? {}),
      nodeId: NODE_ID,
      title: NODE_LABEL,
      tabs: [
        { id: 'overview', label: 'API概览', content: overview },
        { id: 'java8api', label: 'Java 8 新API', content: java8api },
        { id: 'date', label: 'Date类', content: dateClass },
        { id: 'comparison', label: '日期比较', content: comparison },
        { id: 'formatting', label: '格式化', content: formatting },
        { id: 'formatCodes', label: '格式化编码表', content: formatCodes },
        { id: 'calendar', label: 'Calendar', content: calendar },
        { id: 'sleep', label: '休眠与测量', content: sleepAndMeasure },
      ],
    },
  };

  // 2. 挂载到常用类库树下
  let childTree = findTreeNode(treeData, TREE_ID);
  if (!childTree) {
    childTree = {
      id: TREE_ID,
      name: TREE_NAME,
      count: 0,
      nodeRef: NODE_ID,
      children: [],
    };
    groupTree.children ??= [];
    groupTree.children.push(childTree);
  }
  childTree.nodeRef = NODE_ID;
  childTree.name = TREE_NAME;

  // 3. 结构包含边
  upsertEdge(knowledgeEdges, {
    id: `treebind:${GROUP_TREE_ID}:${TREE_ID}`,
    source: GROUP_NODE_ID,
    target: NODE_ID,
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
    dimensions: ['java'],
  });

  // 4. 更新分组 count
  groupTree.count = (groupTree.children ?? []).length;

  // 5. 写入
  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Created node ${NODE_ID} with 8 tabs, mounted under 常用类库.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
