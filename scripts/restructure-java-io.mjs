import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');

// 常用类库分组
const GROUP_TREE_ID = 'tree_java_common_libraries';
const GROUP_NODE_ID = 'k_java_common_libraries';

// 父节点
const PARENT_NODE_ID = 'k_java_io_stream_file';
const PARENT_TREE_ID = 'tree_java_io_stream_file';

// 已有节点（用于关系）
const NIO_FILES_NODE = 'k_java_nio_file_files';
const STRING_NODE = 'k_java_lang_string';

// 子节点定义
const CHILD_NODES = [
  {
    id: 'k_java_io_byte_stream',
    treeId: 'tree_java_io_byte_stream',
    name: '字节流体系',
    label: '字节流（Byte Stream）',
    tags: ['java', 'jdk', 'java.io', 'IO', '字节流', 'InputStream', 'OutputStream'],
  },
  {
    id: 'k_java_io_char_stream',
    treeId: 'tree_java_io_char_stream',
    name: '字符流体系',
    label: '字符流（Character Stream）',
    tags: ['java', 'jdk', 'java.io', 'IO', '字符流', 'Reader', 'Writer'],
  },
  {
    id: 'k_java_io_file_class',
    treeId: 'tree_java_io_file_class',
    name: '文件操作类',
    label: '文件操作（File / RandomAccessFile）',
    tags: ['java', 'jdk', 'java.io', 'IO', 'File', '文件', '目录'],
  },
  {
    id: 'k_java_io_console',
    treeId: 'tree_java_io_console',
    name: '控制台IO',
    label: '控制台IO（System.in / System.out）',
    tags: ['java', 'jdk', 'java.io', 'IO', '控制台', 'System.in', 'System.out', 'BufferedReader', 'PrintStream'],
  },
];

// ========== 知识内容 ==========

const parentOverview = `Java 中的流（Stream）、文件（File）和 IO（输入输出）是处理数据读取和写入的基础设施，允许程序与外部数据（文件、网络、系统输入等）进行交互。

java.io 包是 Java 标准库中的核心包，提供系统输入和输出的类，包含数据流处理（字节流和字符流）、文件读写、序列化、数据格式化等工具。

一个流可以理解为一个数据的序列：
- 输入流：从一个源读取数据
- 输出流：向一个目标写数据

流的两大分类：
- 字节流：以 byte 为单位，处理二进制数据（文件、图像、视频等），基类 InputStream / OutputStream
- 字符流：以 char 为单位，处理文本数据，自动处理编码转换，基类 Reader / Writer

与 java.nio.file.Files（NIO）的关系：
- java.io 是传统 IO，基于流模型，面向字节/字符流
- java.nio.file.Files 是 NIO 工具类，基于 Path，提供静态方法操作文件
- 新项目推荐优先使用 NIO，但传统 IO 在简单场景和兼容旧代码时仍广泛使用`;

// ---- 字节流 ----
const byteStreamOverview = `字节流用于处理二进制数据，如文件、图像、视频等，以字节（byte）为单位进行读写。

【抽象基类】
- InputStream：所有字节输入流的超类，处理字节的输入操作
- OutputStream：所有字节输出流的超类，处理字节的输出操作

【具体实现类】
- 文件流：FileInputStream / FileOutputStream
- 缓冲流：BufferedInputStream / BufferedOutputStream
- 数组流：ByteArrayInputStream / ByteArrayOutputStream
- 数据流：DataInputStream / DataOutputStream（读写 Java 原生数据类型）
- 对象流：ObjectInputStream / ObjectOutputStream（对象序列化）
- 管道流：PipedInputStream / PipedOutputStream（线程间通信）
- 过滤流：FilterInputStream / FilterOutputStream（装饰器模式基类）
- 序列流：SequenceInputStream（将多个输入流串联）`;

const inputStreamMethods = `InputStream 常用方法：

- int read()：读取一个字节，返回 0~255 整数；流末尾返回 -1
- int read(byte[] b)：读取字节存入数组 b，返回实际读取字节数；末尾返回 -1
- int read(byte[] b, int off, int len)：读取最多 len 个字节，存入数组 b 的 off 偏移位置
- long skip(long n)：跳过并丢弃 n 个字节，返回实际跳过字节数
- int available()：返回可以读取的字节数（不阻塞）
- void close()：关闭输入流并释放相关资源
- void mark(int readlimit)：在当前位置设置标记，readlimit 为标记后可读取的字节上限
- void reset()：重新定位到上次标记位置；无标记或标记失效抛出 IOException
- boolean markSupported()：检查当前输入流是否支持 mark() 和 reset()`;

const outputStreamMethods = `OutputStream 常用方法：

- void write(int b)：将指定字节写入输出流，b 的低 8 位被写入
- void write(byte[] b)：将字节数组 b 中所有字节写入输出流
- void write(byte[] b, int off, int len)：将字节数组 b 中从 off 开始的 len 个字节写入
- void flush()：刷新输出流，强制写出所有缓冲数据
- void close()：关闭输出流并释放资源；关闭后不能再写入`;

const byteStreamClasses = `字节流具体实现类说明：

【文件流】
- FileInputStream：从文件中读取字节数据
- FileOutputStream：将字节数据写入文件；目标文件不存在时自动创建

【缓冲流】
- BufferedInputStream：为字节输入流提供缓冲功能，减少实际 IO 次数，提高读取效率
- BufferedOutputStream：为字节输出流提供缓冲功能，提高写入效率；需 flush() 或 close() 才真正写入

【数组流】
- ByteArrayInputStream：将内存中的字节数组作为输入源
- ByteArrayOutputStream：将数据写入到内存中的字节数组，可通过 toByteArray() 获取结果

【数据流】
- DataInputStream：允许从输入流中读取 Java 原生数据类型（int、float、boolean、long、double 等）
- DataOutputStream：允许向输出流中写入 Java 原生数据类型
- 通常配合使用，保证写入和读取的类型顺序一致

【对象流】
- ObjectOutputStream：将对象序列化并写入输出流；对象需实现 Serializable 接口
- ObjectInputStream：从输入流中读取序列化对象并反序列化
- transient 关键字修饰的字段不会被序列化

【管道流】
- PipedOutputStream：用于在管道中写入字节数据
- PipedInputStream：用于在管道中读取字节数据
- 通常配合使用，用于线程间通信；一个线程写入 PipedOutputStream，另一个线程从 PipedInputStream 读取

【过滤流】
- FilterInputStream / FilterOutputStream：字节流的包装类（装饰器模式基类），用于对其他流进行过滤或功能扩展
- BufferedInputStream、DataInputStream、ObjectInputStream 等都是其子类

【序列流】
- SequenceInputStream：将多个输入流串联为一个输入流，按顺序依次读取，读完一个自动切换到下一个`;

// ---- 字符流 ----
const charStreamOverview = `字符流用于处理文本数据，如读取和写入字符串或文本文件，以字符（char）为单位进行读写，自动处理字符编码转换。

【抽象基类】
- Reader：所有字符输入流的超类，处理字符的输入操作
- Writer：所有字符输出流的超类，处理字符的输出操作

【具体实现类】
- 文件流：FileReader / FileWriter
- 缓冲流：BufferedReader / BufferedWriter
- 数组流：CharArrayReader / CharArrayWriter
- 字符串流：StringReader / StringWriter
- 打印流：PrintWriter
- 管道流：PipedReader / PipedWriter
- 特殊流：LineNumberReader / PushbackReader

字节流 vs 字符流：
- 字节流处理二进制数据，以 byte 为单位，适合图像、视频、可执行文件等
- 字符流处理文本数据，以 char 为单位，自动处理编码转换，适合文本文件
- 字节流是字符流的基础，字符流内部使用字节流 + 编码转换（InputStreamReader / OutputStreamWriter 是桥接类）`;

const readerMethods = `Reader 常用方法：

- int read()：读取一个字符，返回字符的整数值；流末尾返回 -1
- int read(char[] cbuf)：读取字符存入字符数组 cbuf，返回实际读取字符数；末尾返回 -1
- int read(char[] cbuf, int off, int len)：读取最多 len 个字符，存入数组 cbuf 的 off 偏移位置
- long skip(long n)：跳过并丢弃 n 个字符，返回实际跳过字符数
- boolean ready()：判断此流是否已准备好被读取（不阻塞）
- void mark(int readAheadLimit)：在当前位置设置标记
- void reset()：重新定位到上次标记位置
- boolean markSupported()：检查是否支持 mark() 和 reset()
- void close()：关闭输入流并释放相关资源`;

const writerMethods = `Writer 常用方法：

- void write(int c)：将指定字符写入输出流
- void write(char[] cbuf)：将字符数组 cbuf 中所有字符写入输出流
- void write(char[] cbuf, int off, int len)：将字符数组 cbuf 中从 off 开始的 len 个字符写入
- void write(String str)：将字符串写入输出流
- void write(String str, int off, int len)：将字符串 str 中从 off 开始的 len 个字符写入
- Writer append(char c)：将指定字符追加到此 writer
- Writer append(CharSequence csq)：将指定字符序列追加到此 writer
- void flush()：刷新输出流，强制写出所有缓冲数据
- void close()：关闭输出流并释放资源；关闭前会自动 flush`;

const charStreamClasses = `字符流具体实现类说明：

【文件流】
- FileReader：从文件中读取字符数据，使用默认字符编码
- FileWriter：将字符数据写入文件，使用默认字符编码；目标文件不存在时自动创建
- 注意：FileReader/FileWriter 使用操作系统默认编码（Windows 通常 GBK），处理中文建议用 InputStreamReader/OutputStreamWriter 显式指定 UTF-8

【缓冲流】
- BufferedReader：为字符输入流提供缓冲功能，支持按行读取（readLine()），提高读取效率
- BufferedWriter：为字符输出流提供缓冲功能，支持按行写入（newLine()），提高写入效率

【数组流】
- CharArrayReader：将字符数组作为输入源
- CharArrayWriter：将数据写入到字符数组，可通过 toCharArray() 或 toString() 获取结果

【字符串流】
- StringReader：将字符串作为输入源
- StringWriter：将数据写入到字符串缓冲区，可通过 toString() 获取结果

【打印流】
- PrintWriter：便捷的字符输出流，支持自动刷新（autoFlush）和格式化输出（printf、format）
- 可包装 OutputStream 或 Writer，提供 print、println、printf 等方法

【管道流】
- PipedWriter：用于在管道中写入字符数据
- PipedReader：用于在管道中读取字符数据
- 通常配合使用，用于线程间字符流通信

【特殊字符流】
- LineNumberReader：带行号的缓冲字符输入流，继承 BufferedReader，可跟踪读取的行号（getLineNumber()）
- PushbackReader：允许在读取字符后将字符推回流中（unread()），以便再次读取，常用于解析器

【桥接流】
- InputStreamReader：字节流到字符流的桥接，可指定字符编码，将字节解码为字符
- OutputStreamWriter：字符流到字节流的桥接，可指定字符编码，将字符编码为字节
- 这两个类是字符流处理指定编码的关键`;

// ---- 文件操作类 ----
const fileClassOverview = `java.io 包中与文件和目录操作相关的辅助类。

【File 类】
- 用于表示文件或目录的路径信息
- 提供文件操作：创建、删除、重命名、判断是否存在、判断是文件还是目录等
- 注意：File 类只表示路径信息，不直接读写文件内容（读写需用 FileInputStream/FileReader 等）

【RandomAccessFile】
- 支持文件的随机访问，可以从文件的任意位置读写数据
- 同时实现了 DataInput 和 DataOutput 接口
- 可通过 seek() 方法定位文件指针位置
- 适合需要随机读写大文件的场景（如数据库文件、断点续传）

【Console】
- 提供对系统控制台的输入和输出支持
- 可用于读取密码等敏感信息（readPassword()，不回显）
- 如果 JVM 没有关联控制台（如后台运行、IDE 中运行），则 System.console() 返回 null`;

const fileMethods = `File 类常用方法：

【判断与查询】
- boolean exists()：判断文件或目录是否存在
- boolean isFile()：判断是否为文件（非目录）
- boolean isDirectory()：判断是否为目录
- boolean canRead()：判断是否可读
- boolean canWrite()：判断是否可写
- boolean canExecute()：判断是否可执行
- boolean isHidden()：判断是否为隐藏文件

【路径与名称】
- String getName()：返回文件或目录名称（不含路径）
- String getPath()：返回路径（构造时传入的路径）
- String getAbsolutePath()：返回绝对路径
- String getCanonicalPath()：返回规范路径（解析符号链接和相对路径）
- File getParentFile()：返回父目录的 File 对象
- long length()：返回文件长度（字节数），目录返回值未定义
- long lastModified()：返回最后修改时间（毫秒时间戳）

【创建与删除】
- boolean createNewFile()：创建新文件；文件已存在返回 false
- boolean mkdir()：创建单级目录；成功返回 true，父目录不存在则失败
- boolean mkdirs()：创建多级目录（包括所有不存在的父目录）
- boolean delete()：删除文件或目录；删除目录时目录必须为空
- void deleteOnExit()：JVM 退出时删除文件

【目录遍历】
- String[] list()：返回目录中所有文件和子目录的名称数组
- File[] listFiles()：返回目录中所有文件和子目录的 File 对象数组
- File[] listFiles(FilenameFilter filter)：按名称过滤器返回文件数组
- File[] listFiles(FileFilter filter)：按文件过滤器返回文件数组

【其他】
- boolean renameTo(File dest)：重命名文件或目录（也可用于移动文件）
- boolean setLastModified(long time)：设置最后修改时间
- boolean setReadOnly()：设置为只读
- static File[] listRoots()：列出可用的文件系统根目录（如 Windows 的盘符）`;

const randomAccessFile = `RandomAccessFile 类：

【特点】
- 支持文件的随机访问，可从文件任意位置读写
- 同时实现 DataInput 和 DataOutput 接口，支持读写基本数据类型
- 独立于 InputStream/OutputStream 体系
- 通过文件指针（file pointer）定位当前读写位置

【构造方法】
- RandomAccessFile(File file, String mode)：使用 File 对象和访问模式创建
- RandomAccessFile(String name, String mode)：使用文件路径和访问模式创建

访问模式：
- "r"：只读模式
- "rw"：读写模式
- "rws"：读写模式，每次写入都同步刷新到存储设备（内容和元数据）
- "rwd"：读写模式，每次写入都同步刷新到存储设备（仅内容）

【常用方法】
- void seek(long pos)：将文件指针定位到指定位置（从文件开头计算的字节偏移量）
- long getFilePointer()：返回当前文件指针位置
- long length()：返回文件长度
- void setLength(long newLength)：设置文件长度（可用于截断或扩展文件）
- int read()：读取一个字节
- int read(byte[] b)：读取字节数组
- void write(int b)：写入一个字节
- void write(byte[] b)：写入字节数组
- readInt()/readLong()/readDouble()/readUTF() 等：读取基本数据类型
- writeInt()/writeLong()/writeDouble()/writeUTF() 等：写入基本数据类型
- void close()：关闭文件并释放资源

【典型应用场景】
- 大文件的部分读写（无需加载整个文件到内存）
- 数据库文件管理
- 断点续传（记录已下载位置，seek 到该位置继续）
- 多线程分块写文件`;

const fileDirOps = `文件与目录操作要点：

【创建目录】
- mkdir()：创建单级目录，父目录必须存在，否则失败
- mkdirs()：创建多级目录，自动创建所有不存在的父目录
- 推荐使用 mkdirs()，更健壮

【读取目录】
- 一个目录就是一个 File 对象，包含其他文件和子目录
- list()：返回名称字符串数组
- listFiles()：返回 File 对象数组（更常用，可进一步操作）
- 可通过 FilenameFilter 或 FileFilter 过滤结果

【删除文件或目录】
- delete()：直接删除
- 删除文件：直接调用即可
- 删除目录：目录必须为空（不含任何文件和子目录），否则删除失败返回 false
- 删除非空目录：需递归删除——先递归删除目录内所有文件和子目录，最后删除目录本身

【路径分隔符】
- Java 在 UNIX 和 Windows 自动按约定分辨文件路径分隔符
- Windows 中使用正斜杠 / 也能正确解析
- 推荐使用 File.separator 获取系统相关的分隔符，保证跨平台兼容

【File 类的局限】
- 只表示路径，不直接读写内容
- 不支持符号链接操作
- 属性操作有限（如不支持文件权限的细粒度控制）
- 更强大的文件操作推荐使用 java.nio.file.Files 和 java.nio.file.Path（NIO.2）`;

// ---- 控制台IO ----
const consoleOverview = `Java 控制台输入输出通过 System 类的静态成员实现：

- System.in：InputStream 类型，标准输入流，默认关联键盘
- System.out：PrintStream 类型，标准输出流，默认关联控制台
- System.err：PrintStream 类型，标准错误流，默认关联控制台，用于输出错误信息

【控制台输入方式】
1. BufferedReader + InputStreamReader（传统方式，功能强大）
2. Scanner（JDK 5+，更便捷，支持类型解析）
3. Console.readPassword()（读取密码，不回显）

【控制台输出方式】
1. System.out.print() / println() / printf()（最常用）
2. System.out.write()（低层字节写入，不常用）`;

const consoleInput = `控制台输入：

【方式一：BufferedReader（传统方式）】
将 System.in 包装在 BufferedReader 对象中创建字符流：
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

读取方法：
- int read()：从输入流读取一个字符，作为整数值返回；流结束时返回 -1；抛出 IOException
- String readLine()：读取一行字符串，以换行符为结束标志；抛出 IOException

特点：
- 功能强大，支持逐字符或逐行读取
- 需处理 IOException（受检异常）
- 读取基本类型需手动转换（如 Integer.parseInt(br.readLine())）

【方式二：Scanner（JDK 5+，推荐）】
Scanner scanner = new Scanner(System.in);

读取方法：
- String next()：读取下一个标记（以空白分隔）
- String nextLine()：读取一整行
- int nextInt()：读取整数
- double nextDouble()：读取双精度浮点数
- boolean nextBoolean()：读取布尔值
- 对应的 hasNextXxx() 方法用于验证输入类型

特点：
- 便捷，支持直接解析基本类型
- 不需要处理 IOException
- 性能略低于 BufferedReader（大量输入时）

【方式三：Console 读取密码】
Console console = System.console();
if (console != null) {
    char[] password = console.readPassword("请输入密码：");
}

特点：
- 输入密码时不回显（安全）
- 只能在真正的控制台中使用，IDE 中运行通常返回 null
- 返回 char[] 而非 String，使用后可清空数组以减少内存中密码的暴露时间`;

const consoleOutput = `控制台输出：

【PrintStream 常用方法】
System.out 是 PrintStream 类的对象引用，PrintStream 继承 OutputStream。

- void print(String s)：输出字符串，不换行
- void print(int i) / print(double d) / print(boolean b) 等：输出基本类型，不换行
- void println(String x)：输出字符串后换行
- void println()：仅输出一个换行符
- void printf(String format, Object... args)：格式化输出（同 String.format）
- void format(String format, Object... args)：格式化输出（同 printf）

【write() 方法（低层）】
- void write(int byteval)：将 byteval 的低八位字节写到流中
- 不常用，因为 print() 和 println() 更方便
- write() 输出的是字节值，不是字符的数字表示

【System.err】
- 标准错误输出流，类型也是 PrintStream
- 默认关联控制台，用于输出错误信息
- 在某些系统中，System.err 输出可能显示为红色
- System.out 和 System.err 是两个独立的流，输出顺序可能交错（因为缓冲不同）

【输出重定向】
- System.setOut(PrintStream out)：重定向标准输出
- System.setErr(PrintStream err)：重定向标准错误
- System.setIn(InputStream in)：重定向标准输入
- 可将输出重定向到文件，实现日志记录`;

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

  // 1. 修改父节点：只保留概述
  const parent = nodePool[PARENT_NODE_ID];
  if (!parent) throw new Error('Parent IO node not found');
  nodePool[PARENT_NODE_ID] = {
    ...parent,
    id: PARENT_NODE_ID,
    label: 'java.io 流与文件',
    role: 'group',
    dimensions: ['java', 'jdk-api'],
    tags: ['java', 'jdk', '常用类库', 'java.io', 'IO', '流', '文件'],
    card: {
      ...(parent.card ?? {}),
      nodeId: PARENT_NODE_ID,
      title: 'java.io 流与文件',
      tabs: [{ id: 'overview', label: '概述', content: parentOverview }],
    },
  };

  // 2. 创建子节点
  const childContents = {
    k_java_io_byte_stream: [
      { id: 'overview', label: '概述', content: byteStreamOverview },
      { id: 'inputStream', label: 'InputStream方法', content: inputStreamMethods },
      { id: 'outputStream', label: 'OutputStream方法', content: outputStreamMethods },
      { id: 'classes', label: '实现类说明', content: byteStreamClasses },
    ],
    k_java_io_char_stream: [
      { id: 'overview', label: '概述', content: charStreamOverview },
      { id: 'reader', label: 'Reader方法', content: readerMethods },
      { id: 'writer', label: 'Writer方法', content: writerMethods },
      { id: 'classes', label: '实现类说明', content: charStreamClasses },
    ],
    k_java_io_file_class: [
      { id: 'overview', label: '概述', content: fileClassOverview },
      { id: 'fileMethods', label: 'File类方法', content: fileMethods },
      { id: 'randomAccess', label: 'RandomAccessFile', content: randomAccessFile },
      { id: 'dirOps', label: '文件目录操作', content: fileDirOps },
    ],
    k_java_io_console: [
      { id: 'overview', label: '概述', content: consoleOverview },
      { id: 'input', label: '控制台输入', content: consoleInput },
      { id: 'output', label: '控制台输出', content: consoleOutput },
    ],
  };

  for (const child of CHILD_NODES) {
    const existing = nodePool[child.id];
    nodePool[child.id] = {
      ...existing,
      id: child.id,
      label: child.label,
      role: 'concept',
      dimensions: ['java', 'jdk-api'],
      tags: [...new Set([...(existing?.tags ?? []), ...child.tags])],
      card: {
        ...(existing?.card ?? {}),
        nodeId: child.id,
        title: child.label,
        tabs: childContents[child.id],
      },
    };
  }

  // 3. 修改树结构：父节点有 children
  const parentTree = findTreeNode(treeData, PARENT_TREE_ID);
  if (!parentTree) throw new Error('Parent IO tree node not found');
  parentTree.children ??= [];

  for (const child of CHILD_NODES) {
    let childTree = findTreeNode(treeData, child.treeId);
    if (!childTree) {
      childTree = {
        id: child.treeId,
        name: child.name,
        count: 0,
        nodeRef: child.id,
        children: [],
      };
      parentTree.children.push(childTree);
    }
    childTree.nodeRef = child.id;
    childTree.name = child.name;
  }
  parentTree.count = parentTree.children.length;

  // 4. 结构关系边：父包含子
  for (const child of CHILD_NODES) {
    upsertEdge(knowledgeEdges, {
      id: `treebind:${PARENT_TREE_ID}:${child.treeId}`,
      source: PARENT_NODE_ID,
      target: child.id,
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
      dimensions: ['java'],
    });
  }

  // 5. 语义关系边（保留原有）
  upsertEdge(knowledgeEdges, {
    id: 'edge_java_io_vs_nio_files',
    source: PARENT_NODE_ID,
    target: NIO_FILES_NODE,
    type: 'contrasts-with',
    label: '传统IO vs NIO',
    dimensions: ['java'],
    relationKind: 'comparison',
  });
  upsertEdge(knowledgeEdges, {
    id: 'edge_java_io_reads_string',
    source: PARENT_NODE_ID,
    target: STRING_NODE,
    type: 'produces',
    label: '读取产生字符串',
    dimensions: ['java'],
    relationKind: 'dependency',
  });

  // 6. 写入
  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Restructured IO node: parent now has ${CHILD_NODES.length} child nodes.`);
  for (const child of CHILD_NODES) {
    const tabs = childContents[child.id].length;
    console.log(`  - ${child.name}: ${tabs} tabs`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
