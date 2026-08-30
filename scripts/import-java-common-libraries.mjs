import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');

// 现有节点 ID（树中已挂载）
const NODES = {
  string: 'k_1785340521063_6f448a',
  stringBuilder: 'k_1785378444664_8sv2s4',
  stringBuffer: 'k_1785378490951_r5lay5',
  scanner: 'k_1785379879184_eaxpdi',
  files: 'k_1785378637961_iecl2a',
  enum: 'k_1782819920656_qzzmfs',
  javaLangString: 'k_java_syntax_java_lang_string_14pdgku',
  javaLangEnum: 'k_java_syntax_java_lang_enum_6ieryv',
};

const DIMENSIONS = ['java', 'java-syntax', 'jdk-api'];
const TAGS = ['java', 'jdk', '常用类库'];

// ========== 知识内容（无示例） ==========

const stringContent = {
  def: `Java 中最常用的类之一，用于表示字符串。字符串属于对象，Java 提供 String 类来创建和操作字符串。

String 类是不可变的（immutable），一旦创建 String 对象，其值就无法改变。如果需要对字符串做大量修改，应使用 StringBuilder 或 StringBuffer 类。

字符串创建方式：
- 直接赋值：字符串常量存储在公共池中，可复用
- new 关键字：在堆上创建新的字符串对象

String 类提供 11 种构造方法，支持不同参数初始化字符串。`,

  features: `核心特性：

1. 不可变性：String 对象创建后值不可修改，所有"修改"操作实际返回新字符串
2. 字符串常量池：直接赋值的字符串进入常量池，相同字面量复用同一对象
3. final 类：String 被声明为 final，不能被继承
4. 线程安全：由于不可变，多线程环境下天然线程安全
5. 哈希缓存：String 重写了 hashCode()，哈希值在首次计算后缓存

内存分布：
- 直接赋值的字符串在字符串常量池（方法区/元空间）
- new String() 创建的对象在堆内存
- 字符串变量（引用）在栈内存`,

  methods: `String 常用方法分类：

【字符与长度】
- int length()：返回字符串长度
- char charAt(int index)：返回指定索引处的字符
- char[] toCharArray()：转换为字符数组
- byte[] getBytes()：使用默认字符集编码为字节数组
- byte[] getBytes(String charsetName)：使用指定字符集编码

【比较】
- boolean equals(Object anObject)：比较字符串内容
- boolean equalsIgnoreCase(String anotherString)：忽略大小写比较
- int compareTo(String anotherString)：按字典顺序比较
- int compareToIgnoreCase(String str)：忽略大小写字典比较
- boolean contentEquals(StringBuffer sb)：与 StringBuffer 字符序列比较
- boolean regionMatches(...)：测试两个字符串区域是否相等

【查找】
- int indexOf(int ch / String str)：返回首次出现的索引
- int indexOf(int ch / String str, int fromIndex)：从指定索引开始查找
- int lastIndexOf(...)：返回最后一次出现的索引
- boolean contains(CharSequence chars)：判断是否包含指定字符序列
- boolean startsWith(String prefix)：测试是否以指定前缀开始
- boolean endsWith(String suffix)：测试是否以指定后缀结束

【截取与修改】
- String substring(int beginIndex[, int endIndex])：返回子字符串
- String concat(String str)：连接字符串
- String replace(char oldChar, char newChar)：替换所有指定字符
- String replaceAll(String regex, String replacement)：正则替换所有匹配
- String replaceFirst(String regex, String replacement)：替换第一个匹配
- String[] split(String regex[, int limit])：按正则拆分字符串
- String trim()：去除前导和尾部空白
- String toLowerCase() / toUpperCase()：大小写转换

【转换与格式化】
- static String valueOf(...)：基本类型转字符串
- static String copyValueOf(char[] data)：字符数组转字符串
- static String format(String format, Object... args)：创建格式化字符串
- String intern()：返回字符串的规范化表示形式
- boolean matches(String regex)：判断是否匹配正则表达式
- boolean isEmpty()：判断字符串是否为空`,
};

const scannerContent = {
  def: `java.util.Scanner 是 Java 5 引入的新特性，用于获取用户的输入。它可以解析基本类型和字符串，使用分隔符模式将输入分解为标记。

Scanner 可从多种源创建：
- InputStream（如 System.in 标准输入）
- File（文件）
- String（字符串）

默认以空白作为分隔符，可通过 useDelimiter() 自定义分隔符模式。`,

  input: `next() 与 nextLine() 的区别：

next()：
- 必须读取到有效字符后才能结束输入
- 有效字符之前的空白会自动去除
- 输入有效字符后，其后的空白作为分隔符或结束符
- 不能得到带有空格的字符串

nextLine()：
- 以 Enter 为结束符，返回输入回车之前的所有字符
- 可以获得包含空白的字符串

读取基本类型数据时，建议先用 hasNextXxx() 验证输入类型，再用 nextXxx() 读取。`,

  methods: `Scanner 常用方法分类：

【构造方法】
- Scanner(File source)：从文件创建
- Scanner(InputStream source)：从输入流创建
- Scanner(String source)：从字符串创建

【基本输入】
- boolean hasNext()：检查是否有下一个标记
- String next()：读取下一个标记（字符串）
- boolean hasNextLine()：检查是否有下一行
- String nextLine()：读取下一行内容

【类型检查】
- boolean hasNextInt()：检查下一个标记是否为整数
- boolean hasNextDouble()：检查是否为双精度浮点数
- boolean hasNextBoolean()：检查是否为布尔值

【类型读取】
- int nextInt()：读取整数
- double nextDouble()：读取双精度浮点数
- boolean nextBoolean()：读取布尔值
- long nextLong()：读取长整数
- float nextFloat()：读取单精度浮点数
- short nextShort()：读取短整数
- byte nextByte()：读取字节

【分隔符控制】
- Scanner useDelimiter(String pattern)：设置分隔符模式
- Scanner useDelimiter(Pattern pattern)：使用正则设置分隔符
- String delimiter()：返回当前使用的分隔符模式

【其他】
- void close()：关闭扫描器
- Scanner skip(Pattern / String pattern)：跳过匹配指定模式的输入
- String findInLine(Pattern / String pattern)：在当前行中查找指定模式
- Scanner reset()：重置扫描器
- Locale locale()：返回当前区域设置
- Scanner useLocale(Locale locale)：设置区域设置`,
};

const filesContent = {
  def: `java.nio.file.Files 是 Java NIO（New I/O）包中的实用工具类，位于 java.nio.file 包中。

Files 类提供一系列静态方法来操作文件系统中的文件和目录，大大简化了文件 I/O 操作。

主要特点：
- 所有方法都是静态的，无需创建实例
- 功能丰富：文件读写、属性操作、目录遍历等
- 统一使用 IOException 处理文件操作异常
- 主要与 java.nio.file.Path 接口配合使用
- 原生支持符号链接处理

推荐在新项目中使用 Files 类替代传统的 java.io.File 类。`,

  comparison: `Files 类（NIO）与传统 I/O（java.io）对比：

| 特性 | Files 类（NIO） | 传统 I/O（java.io） |
|------|------------------|----------------------|
| 方法类型 | 静态方法 | 实例方法 |
| 路径表示 | 使用 Path 接口 | 使用 File 类 |
| 异常处理 | 统一使用 IOException | 多种异常类型 |
| 功能丰富度 | 更丰富 | 基础功能 |
| 符号链接处理 | 原生支持 | 有限支持 |
| 文件属性操作 | 更全面 | 有限 |`,

  methods: `Files 常用方法分类：

【文件操作】
- static Path copy(Path source, Path target, CopyOption... options)：复制文件
- static Path move(Path source, Path target, CopyOption... options)：移动或重命名文件
- static void delete(Path path)：删除文件
- static boolean deleteIfExists(Path path)：如果文件存在则删除

【文件属性】
- static boolean exists(Path path, LinkOption... options)：检查文件是否存在
- static boolean isDirectory(Path path, LinkOption... options)：检查是否为目录
- static boolean isRegularFile(Path path, LinkOption... options)：检查是否为常规文件
- static boolean isReadable(Path path)：检查文件是否可读
- static boolean isWritable(Path path)：检查文件是否可写
- static boolean isExecutable(Path path)：检查文件是否可执行
- static long size(Path path)：返回文件大小（字节）
- static FileTime getLastModifiedTime(Path path, LinkOption... options)：获取最后修改时间

【文件内容操作】
- static byte[] readAllBytes(Path path)：读取文件所有字节
- static List<String> readAllLines(Path path[, Charset cs])：读取文件所有行
- static Stream<String> lines(Path path[, Charset cs])：返回文件中行的流
- static Path write(Path path, byte[] bytes, OpenOption... options)：将字节写入文件
- static Path write(Path path, Iterable<? extends CharSequence> lines, OpenOption... options)：将文本行写入文件

【目录操作】
- static Stream<Path> list(Path dir)：列出目录中的条目
- static DirectoryStream<Path> newDirectoryStream(Path dir)：打开目录流
- static Path createDirectory(Path dir, FileAttribute<?>... attrs)：创建单级目录
- static Path createDirectories(Path dir, FileAttribute<?>... attrs)：创建多级目录（含父目录）

【临时文件与目录】
- static Path createTempFile(Path dir, String prefix, String suffix, FileAttribute<?>... attrs)：创建临时文件
- static Path createTempDirectory(Path dir, String prefix, FileAttribute<?>... attrs)：创建临时目录

【流与通道】
- static SeekableByteChannel newByteChannel(Path path, OpenOption... options)：打开可查找的字节通道
- static InputStream newInputStream(Path path, OpenOption... options)：打开文件输入流
- static OutputStream newOutputStream(Path path, OpenOption... options)：打开文件输出流
- static BufferedReader newBufferedReader(Path path)：打开缓冲读取器
- static BufferedWriter newBufferedWriter(Path path, OpenOption... options)：打开缓冲写入器

【其他】
- static Path createFile(Path path, FileAttribute<?>... attrs)：创建新文件
- static String probeContentType(Path path)：探测文件内容类型`,

  bestPractices: `最佳实践：

1. 异常处理：许多方法会抛出 IOException，使用时必须进行异常处理
2. 资源清理：流操作使用 try-with-resources 自动关闭资源
3. 大文件处理：使用缓冲流（newBufferedReader / newBufferedWriter）
4. 批量目录遍历：优先使用 Files.walk 而非递归调用
5. 性能优化：频繁访问的文件属性可缓存
6. 复制选项：使用 StandardCopyOption.REPLACE_EXISTING 覆盖已存在文件
7. 写入选项：使用 StandardOpenOption.APPEND 追加写入`,
};

const enumContent = {
  def: `Java 枚举（enum）是一个特殊的类，一般表示一组固定常量，例如一年的 4 个季节、12 个月份、一周的 7 天、方向的东南西北等。

枚举类使用 enum 关键字定义，各个常量使用逗号分隔。

每个枚举在内部通过 Class 实现，所有枚举值都是 public static final 的。枚举类默认继承 java.lang.Enum，并实现 java.lang.Serializable 和 java.lang.Comparable 两个接口。

枚举类可以声明在顶层，也可以声明在内部类中。`,

  features: `核心特性：

1. 常量集合：枚举表示一组预定义的固定常量
2. 类型安全：枚举是类型安全的，编译器可检查类型
3. 不可变：枚举常量是 public static final 的，不可修改
4. 单例特性：每个枚举常量在 JVM 中只有一个实例
5. 可遍历：可以使用 values() 方法遍历所有枚举常量
6. 可用于 switch：枚举常量常应用于 switch 语句
7. 可拥有成员：枚举可以定义自己的变量、方法和构造函数
8. 构造函数私有：枚举构造函数只能使用 private 访问修饰符
9. 可包含抽象方法：若包含抽象方法，每个枚举常量必须实现
10. 线程安全：枚举天然线程安全，可用于实现单例模式`,

  methods: `枚举常用方法（继承自 java.lang.Enum）：

- static T[] values()：返回枚举类中所有常量的数组，可用于迭代枚举元素
- int ordinal()：返回枚举常量的索引位置（从 0 开始，按声明顺序）
- static T valueOf(String name)：返回指定字符串名称对应的枚举常量；不存在时抛出 IllegalArgumentException
- String name()：返回枚举常量的名称（与声明时的名称一致）
- int compareTo(E o)：比较枚举常量的定义顺序
- Class<E> getDeclaringClass()：返回枚举常量所属的枚举类 Class 对象
- boolean equals(Object other)：比较两个枚举常量是否相同
- int hashCode()：返回枚举常量的哈希码
- String toString()：返回枚举常量的名称（可重写）

枚举类成员：
- 可以定义成员变量（实例字段）
- 可以定义构造函数（必须 private）
- 可以定义具体方法和抽象方法
- 可以实现接口`,
};

const stringBuilderContent = {
  def: `java.lang.StringBuilder 是可变的字符序列，用于高效地构建和修改字符串。

与 String 不同，StringBuilder 的内容可以修改，所有修改操作都在原对象上进行，不创建新对象，因此在大量字符串拼接场景下性能远优于 String。

StringBuilder 是非线程安全的，不保证同步，在单线程环境下使用性能最高。`,

  features: `核心特性：
1. 可变性：字符序列内容可修改
2. 高性能：修改操作不创建新对象，避免频繁内存分配
3. 非线程安全：方法不加同步锁，多线程环境下需外部同步
4. 动态扩容：内部使用字符数组，容量不足时自动扩容
5. 继承 AbstractStringBuilder：与 StringBuffer 共享父类实现`,

  methods: `常用方法：
- StringBuilder append(...)：追加各种类型数据到末尾
- StringBuilder insert(int offset, ...)：在指定位置插入数据
- StringBuilder delete(int start, int end)：删除指定区间字符
- StringBuilder deleteCharAt(int index)：删除指定位置字符
- StringBuilder replace(int start, int end, String str)：替换指定区间内容
- StringBuilder reverse()：反转字符序列
- char charAt(int index)：返回指定位置字符
- void setCharAt(int index, char ch)：设置指定位置字符
- int length()：返回当前字符数
- int capacity()：返回当前容量
- void ensureCapacity(int minimumCapacity)：确保容量至少为指定值
- void trimToSize()：将容量调整为实际长度
- String substring(int start[, int end])：返回子字符串
- String toString()：转换为 String 对象`,
};

const stringBufferContent = {
  def: `java.lang.StringBuffer 是可变的字符序列，与 StringBuilder 功能类似，但线程安全。

StringBuffer 的所有公开方法都使用 synchronized 关键字加锁，保证多线程环境下的线程安全，但因此性能低于 StringBuilder。

在不需要线程安全的场景下，推荐使用 StringBuilder。`,

  features: `核心特性：
1. 可变性：字符序列内容可修改
2. 线程安全：所有公开方法使用 synchronized 同步
3. 性能略低：同步锁带来额外开销，单线程下不如 StringBuilder
4. 动态扩容：内部使用字符数组，容量不足时自动扩容
5. 继承 AbstractStringBuilder：与 StringBuilder 共享父类实现`,

  methods: `常用方法（与 StringBuilder 基本一致，均为 synchronized）：
- StringBuffer append(...)：追加各种类型数据到末尾
- StringBuffer insert(int offset, ...)：在指定位置插入数据
- StringBuffer delete(int start, int end)：删除指定区间字符
- StringBuffer deleteCharAt(int index)：删除指定位置字符
- StringBuffer replace(int start, int end, String str)：替换指定区间内容
- StringBuffer reverse()：反转字符序列
- char charAt(int index)：返回指定位置字符
- void setCharAt(int index, char ch)：设置指定位置字符
- int length()：返回当前字符数
- int capacity()：返回当前容量
- String substring(int start[, int end])：返回子字符串
- String toString()：转换为 String 对象`,
};

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

function makeTabs(contents) {
  return Object.entries(contents).map(([id, content]) => ({
    id,
    label: tabLabel(id),
    content,
  }));
}

function tabLabel(id) {
  const map = {
    def: '定义',
    features: '核心特性',
    methods: '常用方法',
    input: '输入方式',
    comparison: '与传统IO对比',
    bestPractices: '最佳实践',
  };
  return map[id] ?? id;
}

function updateNode(nodePool, id, label, contents, extraTags = []) {
  const existing = nodePool[id];
  if (!existing) {
    console.warn(`Node ${id} not found, skipping`);
    return false;
  }
  nodePool[id] = {
    ...existing,
    id,
    label: existing.label || label,
    role: existing.role || 'concept',
    dimensions: [...new Set([...(existing.dimensions ?? []), ...DIMENSIONS])],
    tags: [...new Set([...(existing.tags ?? []), ...TAGS, ...extraTags])],
    card: {
      ...(existing.card ?? {}),
      nodeId: id,
      title: existing.label || label,
      tabs: makeTabs(contents),
    },
  };
  return true;
}

// ========== 主流程 ==========

async function main() {
  const [nodePool, treeData, knowledgeEdges] = await Promise.all([
    readJson('node-pool.json'),
    readJson('tree-data.json'),
    readJson('knowledge-edges.json'),
  ]);

  let updated = 0;

  // 更新各节点内容
  if (updateNode(nodePool, NODES.string, 'String', stringContent, ['string', 'java.lang'])) updated++;
  if (updateNode(nodePool, NODES.stringBuilder, 'StringBuilder', stringBuilderContent, ['string', 'java.lang'])) updated++;
  if (updateNode(nodePool, NODES.stringBuffer, 'StringBuffer', stringBufferContent, ['string', 'java.lang'])) updated++;
  if (updateNode(nodePool, NODES.scanner, 'Scanner', scannerContent, ['scanner', 'java.util'])) updated++;
  if (updateNode(nodePool, NODES.files, 'Files', filesContent, ['files', 'java.nio.file', 'nio'])) updated++;
  if (updateNode(nodePool, NODES.enum, 'enum', enumContent, ['enum', '枚举', 'java.lang'])) updated++;

  // 全限定名节点也补充简要内容（指向主要节点）
  if (nodePool[NODES.javaLangString]) {
    nodePool[NODES.javaLangString].card = {
      ...(nodePool[NODES.javaLangString].card ?? {}),
      nodeId: NODES.javaLangString,
      title: 'java.lang.String',
      tabs: [{ id: 'def', label: '定义', content: stringContent.def }],
    };
    updated++;
  }
  if (nodePool[NODES.javaLangEnum]) {
    nodePool[NODES.javaLangEnum].card = {
      ...(nodePool[NODES.javaLangEnum].card ?? {}),
      nodeId: NODES.javaLangEnum,
      title: 'java.lang.Enum<E>',
      tabs: [{ id: 'def', label: '定义', content: enumContent.def }],
    };
    updated++;
  }

  // 添加关系边
  const edges = [
    // String 相关
    {
      id: 'edge_java_string_vs_stringbuilder',
      source: NODES.string,
      target: NODES.stringBuilder,
      type: 'contrasts-with',
      label: '不可变 vs 可变',
      dimensions: ['java'],
      relationKind: 'comparison',
    },
    {
      id: 'edge_java_string_vs_stringbuffer',
      source: NODES.string,
      target: NODES.stringBuffer,
      type: 'contrasts-with',
      label: '不可变 vs 可变',
      dimensions: ['java'],
      relationKind: 'comparison',
    },
    {
      id: 'edge_java_stringbuilder_vs_stringbuffer',
      source: NODES.stringBuilder,
      target: NODES.stringBuffer,
      type: 'contrasts-with',
      label: '非线程安全 vs 线程安全',
      dimensions: ['java'],
      relationKind: 'comparison',
    },
    // Scanner 相关
    {
      id: 'edge_java_scanner_input',
      source: NODES.scanner,
      target: NODES.string,
      type: 'produces',
      label: '读取输入为字符串',
      dimensions: ['java'],
      relationKind: 'dependency',
    },
    // Files 相关
    {
      id: 'edge_java_files_nio',
      source: NODES.files,
      target: NODES.enum,
      type: 'related-to',
      label: '同属 JDK API',
      dimensions: ['java'],
      relationKind: 'association',
    },
  ];

  for (const edge of edges) {
    upsertEdge(knowledgeEdges, edge);
  }

  // 写入文件
  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Updated ${updated} nodes and ${edges.length} edges.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
