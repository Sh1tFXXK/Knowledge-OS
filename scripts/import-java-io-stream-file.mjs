import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');

// 常用类库分组
const GROUP_TREE_ID = 'tree_java_common_libraries';
const GROUP_NODE_ID = 'k_java_common_libraries';

// 已有节点（用于建立关系）
const NIO_FILES_NODE = 'k_java_nio_file_files';
const STRING_NODE = 'k_java_lang_string';

// 新节点
const NODE_ID = 'k_java_io_stream_file';
const TREE_ID = 'tree_java_io_stream_file';
const NODE_LABEL = 'java.io 流与文件';
const TREE_NAME = 'IO流与文件';

// ========== 知识内容 ==========

const overview = `Java 中的流（Stream）、文件（File）和 IO（输入输出）是处理数据读取和写入的基础设施，允许程序与外部数据（文件、网络、系统输入等）进行交互。

java.io 包是 Java 标准库中的核心包，提供系统输入和输出的类，包含：
- 数据流处理（字节流和字符流）
- 文件读写
- 序列化
- 数据格式化

一个流可以理解为一个数据的序列：
- 输入流：从一个源读取数据
- 输出流：向一个目标写数据

流支持多种格式：基本类型、对象、本地化字符集等。

与 java.nio.file.Files（NIO）的关系：
- java.io 是传统 IO，基于流模型，面向字节/字符流
- java.nio.file.Files 是 NIO 工具类，基于 Path，提供静态方法操作文件
- 新项目推荐优先使用 NIO，但传统 IO 在简单场景和兼容旧代码时仍广泛使用`;

const consoleIO = `控制台输入输出：

【控制台输入】
Java 的控制台输入由 System.in 完成。为获得绑定到控制台的字符流，可将 System.in 包装在 BufferedReader 对象中：
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

读取方法：
- int read()：从输入流读取一个字符，作为整数值返回；流结束时返回 -1；抛出 IOException
- String readLine()：读取一行字符串；抛出 IOException

JDK 5 及以上版本也可使用 Scanner 类获取控制台输入。

【控制台输出】
控制台输出由 print() 和 println() 完成，这些方法由 PrintStream 类定义，System.out 是该类对象的引用。

- PrintStream 继承 OutputStream，实现了 write() 方法
- void write(int byteval)：将 byteval 的低八位字节写到流中
- write() 方法不常使用，print() 和 println() 更方便`;

const byteStream = `字节流（处理二进制数据）

字节流用于处理二进制数据，如文件、图像、视频等。以字节为单位进行读写。

【抽象基类】
- InputStream：所有字节输入流的超类，处理字节的输入操作
- OutputStream：所有字节输出流的超类，处理字节的输出操作

【文件流】
- FileInputStream：从文件中读取字节数据
- FileOutputStream：将字节数据写入文件

【缓冲流】
- BufferedInputStream：为字节输入流提供缓冲功能，提高读取效率
- BufferedOutputStream：为字节输出流提供缓冲功能，提高写入效率

【数组流】
- ByteArrayInputStream：将内存中的字节数组作为输入源
- ByteArrayOutputStream：将数据写入到内存中的字节数组

【数据流】
- DataInputStream：允许从输入流中读取 Java 原生数据类型（int、float、boolean 等）
- DataOutputStream：允许向输出流中写入 Java 原生数据类型

【对象流】
- ObjectInputStream：从输入流中读取序列化对象
- ObjectOutputStream：将对象序列化并写入输出流中

【管道流】
- PipedInputStream：用于在管道中读取字节数据，通常与 PipedOutputStream 配合使用
- PipedOutputStream：用于在管道中写入字节数据，通常与 PipedInputStream 配合使用

【过滤流】
- FilterInputStream：字节输入流的包装类，用于对其他输入流进行过滤处理
- FilterOutputStream：字节输出流的包装类，用于对其他输出流进行过滤处理

【序列流】
- SequenceInputStream：将多个输入流串联为一个输入流进行处理`;

const charStream = `字符流（处理文本数据）

字符流用于处理文本数据，如读取和写入字符串或文件。以字符为单位进行读写，自动处理字符编码。

【抽象基类】
- Reader：所有字符输入流的超类，处理字符的输入操作
- Writer：所有字符输出流的超类，处理字符的输出操作

【文件流】
- FileReader：从文件中读取字符数据
- FileWriter：将字符数据写入文件

【缓冲流】
- BufferedReader：为字符输入流提供缓冲功能，支持按行读取，提高读取效率
- BufferedWriter：为字符输出流提供缓冲功能，支持按行写入，提高写入效率

【数组流】
- CharArrayReader：将字符数组作为输入源
- CharArrayWriter：将数据写入到字符数组

【字符串流】
- StringReader：将字符串作为输入源
- StringWriter：将数据写入到字符串缓冲区

【打印流】
- PrintWriter：便捷的字符输出流，支持自动刷新和格式化输出

【管道流】
- PipedReader：用于在管道中读取字符数据，通常与 PipedWriter 配合使用
- PipedWriter：用于在管道中写入字符数据，通常与 PipedReader 配合使用

【特殊字符流】
- LineNumberReader：带行号的缓冲字符输入流，允许跟踪读取的行号
- PushbackReader：允许在读取字符后将字符推回流中，以便再次读取

字节流 vs 字符流：
- 字节流处理二进制数据，以 byte 为单位，适合图像、视频、可执行文件等
- 字符流处理文本数据，以 char 为单位，自动处理编码转换，适合文本文件
- 字节流是字符流的基础，字符流内部使用字节流 + 编码转换`;

const helperClasses = `辅助类：

【File】
- 用于表示文件或目录
- 提供文件操作：创建、删除、重命名、判断是否存在、判断是文件还是目录等
- 是传统 IO 中文件系统操作的核心类
- 注意：File 类只表示路径信息，不直接读写文件内容

【RandomAccessFile】
- 支持文件的随机访问，可以从文件的任意位置读写数据
- 同时实现了 DataInput 和 DataOutput 接口
- 可通过 seek() 方法定位文件指针位置
- 适合需要随机读写大文件的场景

【Console】
- 提供对系统控制台的输入和输出支持
- 可用于读取密码等敏感信息（不回显）
- 如果 JVM 没有关联控制台（如后台运行），则返回 null`;

const fileStream = `FileInputStream 与 FileOutputStream：

【FileInputStream】
用于从文件读取数据，对象可用关键字 new 创建。

构造方法：
- 使用字符串类型文件名创建：new FileInputStream("C:/java/hello")
- 使用 File 对象创建：new FileInputStream(file)

常用方法：
- int read()：读取一个字节，返回 0~255 整数；流末尾返回 -1
- int read(byte[] b)：读取字节存入数组 b，返回实际读取字节数；末尾返回 -1
- int read(byte[] b, int off, int len)：读取最多 len 个字节，存入数组 b 的 off 偏移位置
- long skip(long n)：跳过并丢弃 n 个字节，返回实际跳过字节数
- int available()：返回可以读取的字节数（不阻塞）
- void close()：关闭输入流并释放相关资源
- void mark(int readlimit)：在当前位置设置标记
- void reset()：重新定位到上次标记位置
- boolean markSupported()：检查是否支持 mark() 和 reset()

【FileOutputStream】
用于创建文件并向文件写数据。打开输出前目标文件不存在时，该流会自动创建文件。

构造方法：
- 使用字符串类型文件名创建：new FileOutputStream("C:/java/hello")
- 使用 File 对象创建：new FileOutputStream(file)

常用方法：
- void write(int b)：将指定字节写入输出流，b 的低 8 位被写入
- void write(byte[] b)：将字节数组 b 中所有字节写入输出流
- void write(byte[] b, int off, int len)：将字节数组 b 中从 off 开始的 len 个字节写入
- void flush()：刷新输出流，强制写出所有缓冲数据
- void close()：关闭输出流并释放资源；关闭后不能再写入

中文编码注意：
- FileWriter/FileReader 使用操作系统默认编码（Windows 上通常是 GBK）
- 处理中文时建议使用 InputStreamReader/OutputStreamWriter 显式指定 UTF-8 编码
- 如：new OutputStreamWriter(new FileOutputStream(file), "UTF-8")`;

const fileDirOp = `文件与目录操作（java.io.File）：

【创建目录】
- boolean mkdir()：创建一个文件夹；成功返回 true，失败返回 false（路径已存在或父路径不存在）
- boolean mkdirs()：创建文件夹及其所有不存在的父文件夹

Java 在 UNIX 和 Windows 自动按约定分辨文件路径分隔符，Windows 中使用 / 也能正确解析。

【读取目录】
一个目录就是一个 File 对象，包含其他文件和文件夹。

- boolean isDirectory()：判断 File 对象是否为目录
- String[] list()：返回目录中包含的文件和文件夹名称列表
- File[] listFiles()：返回目录中包含的文件和文件夹的 File 对象数组

【删除目录或文件】
- boolean delete()：删除文件或目录
- 删除目录时必须保证目录下没有其他文件，否则删除失败
- 删除非空目录需递归删除：先递归删除目录内所有文件和子目录，再删除目录本身

【其他常用 File 方法】
- boolean exists()：判断文件或目录是否存在
- boolean isFile()：判断是否为文件（非目录）
- boolean canRead()：判断是否可读
- boolean canWrite()：判断是否可写
- long length()：返回文件长度（字节数）
- String getName()：返回文件或目录名称
- String getPath()：返回路径
- String getAbsolutePath()：返回绝对路径
- long lastModified()：返回最后修改时间
- boolean renameTo(File dest)：重命名文件或目录`;

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

  // 1. 创建节点
  const existing = nodePool[NODE_ID];
  nodePool[NODE_ID] = {
    ...existing,
    id: NODE_ID,
    label: NODE_LABEL,
    role: 'concept',
    dimensions: ['java', 'jdk-api'],
    tags: ['java', 'jdk', '常用类库', 'java.io', 'IO', '流', '文件', 'InputStream', 'OutputStream', 'Reader', 'Writer'],
    card: {
      ...(existing?.card ?? {}),
      nodeId: NODE_ID,
      title: NODE_LABEL,
      tabs: [
        { id: 'overview', label: '概述', content: overview },
        { id: 'consoleIO', label: '控制台IO', content: consoleIO },
        { id: 'byteStream', label: '字节流体系', content: byteStream },
        { id: 'charStream', label: '字符流体系', content: charStream },
        { id: 'helper', label: '辅助类', content: helperClasses },
        { id: 'fileStream', label: '文件字节流', content: fileStream },
        { id: 'fileDirOp', label: '文件目录操作', content: fileDirOp },
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

  // 4. 语义关系边
  upsertEdge(knowledgeEdges, {
    id: 'edge_java_io_vs_nio_files',
    source: NODE_ID,
    target: NIO_FILES_NODE,
    type: 'contrasts-with',
    label: '传统IO vs NIO',
    dimensions: ['java'],
    relationKind: 'comparison',
  });

  upsertEdge(knowledgeEdges, {
    id: 'edge_java_io_reads_string',
    source: NODE_ID,
    target: STRING_NODE,
    type: 'produces',
    label: '读取产生字符串',
    dimensions: ['java'],
    relationKind: 'dependency',
  });

  // 5. 更新分组 count
  groupTree.count = (groupTree.children ?? []).length;

  // 6. 写入
  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Created node ${NODE_ID} with 7 tabs, mounted under 常用类库.`);
  console.log(`Added 2 semantic edges: vs NIO Files, reads String.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
