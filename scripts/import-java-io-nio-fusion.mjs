import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');

// 常用类库分组（挂载点）
const GROUP_TREE_ID = 'tree_java_common_libraries';
const GROUP_NODE_ID = 'k_java_common_libraries';

// 根节点
const ROOT_NODE_ID = 'k_java_io_nio';
const ROOT_TREE_ID = 'tree_java_io_nio';

// 已有节点引用
const NIO_FILES_NODE = 'k_java_nio_file_files';
const STRING_NODE = 'k_java_lang_string';

// ========== 从已有NIO节点提取内容 ==========

function extractNioContent(nodePool) {
  const principle = nodePool['k_1786353277269_msn0ma8q5'];
  const channel = nodePool['k_1786353277269_msn0ma8s7'];
  const overview = nodePool['k_1786353277269_msn0ma8q5'];

  const principleContent = principle.card.tabs[0].content;
  const overviewContent = overview.card.tabs[1].content; // JAVA NIO 概览
  const channelContent = channel.card.tabs[0].content; // FileChannel/SocketChannel/ServerSocketChannel

  // 按二级标题拆分原理内容
  const sections = {};
  const parts = principleContent.split(/\n(?=## )/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^## (.+)/);
    if (m) sections[m[1]] = trimmed;
  }

  // 拆分Channel内容
  const channelSections = {};
  const cParts = channelContent.split(/\n(?=## )/);
  for (const part of cParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^## (.+)/);
    if (m) channelSections[m[1]] = trimmed;
  }

  return { sections, overviewContent, channelSections };
}

// ========== 节点定义 ==========
// 每个节点: { id, treeId, name, label, parentTreeId, content, tags }

function buildNodes(nio) {
  const { sections, overviewContent, channelSections } = nio;

  // 合并相关章节
  const ioModelClassification = sections['IO模型的分类'] || '';
  const bioModel = sections['传统BIO模型'] || '';
  const nioPrinciple = sections['NIO的实现原理'] || '';
  const aio = sections['AIO'] || '';
  const selectEpoll = (sections['select和epoll的区别'] || '') + '\n\n' + (sections['它们的区别主要有三点：'] || '') + '\n\n' + (sections['NIO与epoll'] || '');
  const zeroCopy = (sections['Zero Copy'] || '') + '\n\n' + (sections['传统的数据传输方式'] || '') + '\n\n' + (sections['步骤如下：'] || '') + '\n\n' + (sections['Zero Copy的数据传输方式'] || '');
  const reactorOverview = (sections['两种IO多路复用方案：Reactor和Proactor'] || '') + '\n\n' + (sections['Reactor模型'] || '');
  const reactorSingle = sections['Reactor单线程模型'] || '';
  const reactorMulti = sections['Reactor多线程模型'] || '';
  const reactorMasterSlave = sections['主从Reactor多线程模型'] || '';
  const proactor = sections['在Proactor中实现读：'] || '';
  const nioProblems = sections['NIO存在的问题'] || '';
  const nioSummary = sections['总结'] || '';

  // Channel内容合并
  const fileChannelContent = Object.entries(channelSections)
    .filter(([k]) => k.includes('FileChannel'))
    .map(([, v]) => v)
    .join('\n\n');
  const socketChannelContent = Object.entries(channelSections)
    .filter(([k]) => k.includes('SocketChannel') && !k.includes('Server'))
    .map(([, v]) => v)
    .join('\n\n');
  const serverSocketChannelContent = Object.entries(channelSections)
    .filter(([k]) => k.includes('ServerSocketChannel'))
    .map(([, v]) => v)
    .join('\n\n');

  const nodes = [
    // ===== 根节点 =====
    {
      id: ROOT_NODE_ID,
      treeId: ROOT_TREE_ID,
      name: 'IO与NIO',
      label: 'Java IO与NIO',
      parentTreeId: GROUP_TREE_ID,
      tags: ['java', 'jdk', 'IO', 'NIO', 'java.io', 'java.nio', '输入输出', '流'],
      content: `Java IO（Input/Output）是程序与外部数据交互的基础设施，涵盖传统 IO（java.io）和 NIO（java.nio）两大体系。

【传统 IO（java.io）】
- 基于流模型（Stream），面向字节流和字符流
- 阻塞式 IO（BIO），调用 read()/write() 时线程阻塞
- 单向流：InputStream 只读，OutputStream 只写
- 主要类：InputStream/OutputStream（字节流）、Reader/Writer（字符流）、File、RandomAccessFile

【NIO（New IO / Non-blocking IO）】
- 基于通道（Channel）和缓冲区（Buffer），面向块
- 非阻塞式 IO，单线程可管理多个通道
- 双向通道：Channel 既可读又可写
- 三大核心：Channel、Buffer、Selector
- 主要包：java.nio.channels、java.nio、java.nio.file

【IO 模型演进】
BIO（阻塞IO）→ NIO（非阻塞IO/IO多路复用）→ AIO（异步IO）

本知识体系涵盖：IO 原理与模型、Reactor/Proactor 模式、传统 IO 实现、NIO 核心与实现、NIO 文件操作、IO vs NIO 对比。`,
    },

    // ===== 第一组：IO原理 =====
    {
      id: 'k_io_principle_group',
      treeId: 'tree_io_principle_group',
      name: 'IO原理',
      label: 'IO原理与模型',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'IO', 'NIO', 'IO模型', '原理'],
      content: `IO 原理是理解 Java IO/NIO 的基础，涵盖 IO 模型分类、阻塞与非阻塞、同步与异步、BIO/NIO/AIO 三种模型、select/epoll 底层机制、零拷贝技术等。

子主题：
- IO 模型分类：5 种 IO 模型及 POSIX 同步/异步划分
- 阻塞非阻塞与同步异步：两组概念的区别与联系
- BIO 模型：传统阻塞 IO 的工作方式与局限
- NIO 实现原理：非阻塞 IO 与 IO 多路复用的底层机制
- AIO：异步 IO 模型
- select 与 epoll：IO 多路复用的两种系统调用及区别
- 零拷贝：Zero Copy 技术原理与应用`,
    },
    {
      id: 'k_io_model_classification',
      treeId: 'tree_io_model_classification',
      name: 'IO模型分类',
      label: 'IO模型分类',
      parentTreeId: 'tree_io_principle_group',
      tags: ['java', 'IO', 'IO模型', 'BIO', 'NIO', 'AIO', 'IO多路复用'],
      content: ioModelClassification,
    },
    {
      id: 'k_io_blocking_concepts',
      treeId: 'tree_io_blocking_concepts',
      name: '阻塞非阻塞与同步异步',
      label: '阻塞/非阻塞与同步/异步',
      parentTreeId: 'tree_io_principle_group',
      tags: ['java', 'IO', '阻塞', '非阻塞', '同步', '异步', '概念'],
      content: `阻塞与非阻塞、同步与异步是理解 IO 模型的两组核心概念，它们关注的维度不同。

【同步与异步】
关注消息通信机制（synchronous/asynchronous communication）。
- 同步：发出一个调用时，在没有得到结果之前，该调用就不返回；一旦调用返回，就得到返回值。由调用者主动等待调用结果。
- 异步：调用发出后，这个调用就直接返回了，没有返回结果；被调用者完成后通过状态、通知或回调函数来处理。

【阻塞与非阻塞】
关注程序在等待调用结果时的状态。
- 阻塞：调用结果返回之前，当前线程会被挂起，只有得到结果之后才返回。
- 非阻塞：不能立刻得到结果之前，该调用不会阻塞当前线程。

【组合关系】
- 同步阻塞（BIO）：调用阻塞等待，结果由调用者主动获取
- 同步非阻塞（NIO）：调用不阻塞，需轮询检查结果是否就绪
- 异步阻塞（IO多路复用 select）：阻塞在事件通知上，而非 IO 调用上
- 异步非阻塞（AIO）：调用不阻塞，结果通过回调通知

【POSIX 定义】
一个 IO 操作分两步：发起 IO 请求 + 实际 IO 操作。
- 同步 IO：实际 IO 操作阻塞请求进程（阻塞IO、非阻塞IO、IO复用、信号驱动IO 都属于同步IO）
- 异步 IO：操作系统帮你完成 IO 操作再返回结果，不阻塞进程`,
    },
    {
      id: 'k_io_bio_model',
      treeId: 'tree_io_bio_model',
      name: 'BIO模型',
      label: 'BIO（阻塞IO）模型',
      parentTreeId: 'tree_io_principle_group',
      tags: ['java', 'IO', 'BIO', '阻塞IO', '模型'],
      content: bioModel,
    },
    {
      id: 'k_io_nio_principle',
      treeId: 'tree_io_nio_principle',
      name: 'NIO实现原理',
      label: 'NIO实现原理',
      parentTreeId: 'tree_io_principle_group',
      tags: ['java', 'NIO', '非阻塞IO', 'IO多路复用', '原理'],
      content: nioPrinciple,
    },
    {
      id: 'k_io_aio_model',
      treeId: 'tree_io_aio_model',
      name: 'AIO模型',
      label: 'AIO（异步IO）模型',
      parentTreeId: 'tree_io_principle_group',
      tags: ['java', 'AIO', '异步IO', '模型'],
      content: aio,
    },
    {
      id: 'k_io_select_epoll',
      treeId: 'tree_io_select_epoll',
      name: 'select与epoll',
      label: 'select与epoll',
      parentTreeId: 'tree_io_principle_group',
      tags: ['java', 'NIO', 'select', 'epoll', 'IO多路复用', 'Linux'],
      content: selectEpoll,
    },
    {
      id: 'k_io_zero_copy',
      treeId: 'tree_io_zero_copy',
      name: '零拷贝',
      label: '零拷贝（Zero Copy）',
      parentTreeId: 'tree_io_principle_group',
      tags: ['java', 'NIO', '零拷贝', 'ZeroCopy', '性能优化'],
      content: zeroCopy,
    },

    // ===== 第二组：Reactor模式 =====
    {
      id: 'k_reactor_group',
      treeId: 'tree_reactor_group',
      name: 'Reactor模式',
      label: 'Reactor与Proactor模式',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'NIO', 'Reactor', 'Proactor', '设计模式', 'IO多路复用'],
      content: `Reactor 和 Proactor 是两种 IO 多路复用事件处理模式，是高性能网络服务器的核心架构模式。

【Reactor 模式】
采用同步 IO，事件分离器等待文件描述符就绪，将就绪事件分发给对应处理器，由处理器完成实际读写。
- 单线程模型：所有操作在一个线程中完成
- 多线程模型：引入线程池处理业务逻辑
- 主从多线程模型：主 Reactor 负责接受连接，从 Reactor 负责读写

【Proactor 模式】
采用异步 IO，处理器发起异步读写操作，IO 操作由操作系统完成，事件分离器捕获 IO 完成事件并通知处理器。

子主题：
- Reactor 概述：模式原理与角色
- 单线程模型：结构、流程、优缺点
- 多线程模型：结构、流程、优缺点
- 主从多线程模型：结构、流程、优缺点
- Proactor 模式：异步 IO 事件处理`,
    },
    {
      id: 'k_reactor_overview',
      treeId: 'tree_reactor_overview',
      name: 'Reactor概述',
      label: 'Reactor模式概述',
      parentTreeId: 'tree_reactor_group',
      tags: ['java', 'NIO', 'Reactor', '模式', '概述'],
      content: reactorOverview,
    },
    {
      id: 'k_reactor_single_thread',
      treeId: 'tree_reactor_single_thread',
      name: '单线程模型',
      label: 'Reactor单线程模型',
      parentTreeId: 'tree_reactor_group',
      tags: ['java', 'NIO', 'Reactor', '单线程'],
      content: reactorSingle,
    },
    {
      id: 'k_reactor_multi_thread',
      treeId: 'tree_reactor_multi_thread',
      name: '多线程模型',
      label: 'Reactor多线程模型',
      parentTreeId: 'tree_reactor_group',
      tags: ['java', 'NIO', 'Reactor', '多线程', '线程池'],
      content: reactorMulti,
    },
    {
      id: 'k_reactor_master_slave',
      treeId: 'tree_reactor_master_slave',
      name: '主从多线程模型',
      label: '主从Reactor多线程模型',
      parentTreeId: 'tree_reactor_group',
      tags: ['java', 'NIO', 'Reactor', '主从', '多线程'],
      content: reactorMasterSlave,
    },
    {
      id: 'k_proactor_mode',
      treeId: 'tree_proactor_mode',
      name: 'Proactor模式',
      label: 'Proactor模式',
      parentTreeId: 'tree_reactor_group',
      tags: ['java', 'NIO', 'Proactor', '异步IO', '模式'],
      content: proactor,
    },

    // ===== 第三组：传统IO-字节流 =====
    {
      id: 'k_byte_stream_group',
      treeId: 'tree_byte_stream_group',
      name: '传统IO-字节流',
      label: '传统IO字节流（java.io）',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'jdk', 'java.io', 'IO', '字节流', 'InputStream', 'OutputStream'],
      content: `字节流以字节（byte）为单位处理数据，适合二进制数据（文件、图像、视频、可执行文件等）。

【抽象基类】
- InputStream：所有字节输入流的超类
- OutputStream：所有字节输出流的超类

【具体实现类】
- 文件流：FileInputStream / FileOutputStream
- 缓冲流：BufferedInputStream / BufferedOutputStream
- 数据流：DataInputStream / DataOutputStream（读写基本类型）
- 对象流：ObjectInputStream / ObjectOutputStream（序列化）
- 数组流：ByteArrayInputStream / ByteArrayOutputStream
- 管道流：PipedInputStream / PipedOutputStream
- 过滤流：FilterInputStream / FilterOutputStream
- 序列流：SequenceInputStream

子主题：
- InputStream：基类与常用方法
- OutputStream：基类与常用方法
- 文件流与缓冲流：FileInputStream/FileOutputStream + Buffered
- 数据流与对象流：Data* + Object*
- 其他字节流：数组/管道/过滤/序列`,
    },
    {
      id: 'k_input_stream',
      treeId: 'tree_input_stream',
      name: 'InputStream',
      label: 'InputStream（字节输入流基类）',
      parentTreeId: 'tree_byte_stream_group',
      tags: ['java', 'jdk', 'java.io', 'InputStream', '字节流', '抽象类'],
      content: `InputStream 是所有字节输入流的抽象基类，定义了字节输入的基本操作。

【类定义】
java.io.InputStream，实现 Closeable 接口。

【核心方法】
- int read()：读取一个字节，返回 0~255 整数；流末尾返回 -1
- int read(byte[] b)：读取字节存入数组 b，返回实际读取字节数；末尾返回 -1
- int read(byte[] b, int off, int len)：读取最多 len 个字节，存入数组 b 的 off 偏移位置
- long skip(long n)：跳过并丢弃 n 个字节，返回实际跳过字节数
- int available()：返回可以读取的字节数（不阻塞）
- void close()：关闭输入流并释放相关资源
- void mark(int readlimit)：在当前位置设置标记，readlimit 为标记后可读取的字节上限
- void reset()：重新定位到上次标记位置；无标记或标记失效抛出 IOException
- boolean markSupported()：检查当前输入流是否支持 mark() 和 reset()

【设计特点】
- 抽象类，不能直接实例化
- read() 方法是阻塞的，直到有数据可读或流结束
- 子类需实现 read() 方法，其他方法有默认实现
- 实现了 Closeable，可使用 try-with-resources 自动关闭`,
    },
    {
      id: 'k_output_stream',
      treeId: 'tree_output_stream',
      name: 'OutputStream',
      label: 'OutputStream（字节输出流基类）',
      parentTreeId: 'tree_byte_stream_group',
      tags: ['java', 'jdk', 'java.io', 'OutputStream', '字节流', '抽象类'],
      content: `OutputStream 是所有字节输出流的抽象基类，定义了字节输出的基本操作。

【类定义】
java.io.OutputStream，实现 Closeable 和 Flushable 接口。

【核心方法】
- void write(int b)：将指定字节写入输出流，b 的低 8 位被写入
- void write(byte[] b)：将字节数组 b 中所有字节写入输出流
- void write(byte[] b, int off, int len)：将字节数组 b 中从 off 开始的 len 个字节写入
- void flush()：刷新输出流，强制写出所有缓冲数据
- void close()：关闭输出流并释放资源；关闭前会自动 flush；关闭后不能再写入

【设计特点】
- 抽象类，不能直接实例化
- write() 方法是阻塞的，直到数据写入完成
- 子类需实现 write(int b) 方法，其他方法有默认实现
- 实现了 Flushable，缓冲流需要 flush() 才真正写入目标
- 实现了 Closeable，可使用 try-with-resources 自动关闭`,
    },
    {
      id: 'k_file_buffered_stream',
      treeId: 'tree_file_buffered_stream',
      name: '文件流与缓冲流',
      label: '文件流与缓冲流',
      parentTreeId: 'tree_byte_stream_group',
      tags: ['java', 'jdk', 'java.io', 'FileInputStream', 'FileOutputStream', 'BufferedInputStream', 'BufferedOutputStream'],
      content: `【文件流】

FileInputStream：从文件中读取字节数据。
- 构造方法：new FileInputStream(String path) / new FileInputStream(File file)
- 用于读取二进制文件（图像、视频、可执行文件等）
- 读取文本文件时需注意编码问题

FileOutputStream：将字节数据写入文件。
- 构造方法：new FileOutputStream(String path) / new FileOutputStream(File file)
- 目标文件不存在时自动创建
- 可指定追加模式：new FileOutputStream(path, true)
- 默认覆盖模式会清空原文件内容

【缓冲流】

BufferedInputStream：为字节输入流提供缓冲功能。
- 内部维护一个字节数组缓冲区（默认 8192 字节）
- 减少实际 IO 次数，提高读取效率
- 构造方法：new BufferedInputStream(InputStream in) / new BufferedInputStream(InputStream in, int size)
- 支持 mark()/reset() 操作

BufferedOutputStream：为字节输出流提供缓冲功能。
- 内部维护一个字节数组缓冲区
- 数据先写入缓冲区，缓冲区满或 flush()/close() 时才真正写入
- 构造方法：new BufferedOutputStream(OutputStream out) / new BufferedOutputStream(OutputStream out, int size)
- 必须 flush() 或 close() 才能确保数据写入文件

【典型用法】
new BufferedInputStream(new FileInputStream("file.dat"))
new BufferedOutputStream(new FileOutputStream("file.dat"))`,
    },
    {
      id: 'k_data_object_stream',
      treeId: 'tree_data_object_stream',
      name: '数据流与对象流',
      label: '数据流与对象流',
      parentTreeId: 'tree_byte_stream_group',
      tags: ['java', 'jdk', 'java.io', 'DataInputStream', 'DataOutputStream', 'ObjectInputStream', 'ObjectOutputStream', '序列化'],
      content: `【数据流】

DataInputStream：允许从输入流中读取 Java 原生数据类型。
- 实现 DataInput 接口
- 方法：readInt()、readLong()、readFloat()、readDouble()、readBoolean()、readChar()、readUTF() 等
- 与 DataOutputStream 配合使用，保证写入和读取的类型顺序一致

DataOutputStream：允许向输出流中写入 Java 原生数据类型。
- 实现 DataOutput 接口
- 方法：writeInt(int)、writeLong(long)、writeFloat(float)、writeDouble(double)、writeBoolean(boolean)、writeChar(char)、writeUTF(String) 等
- 基本类型以二进制形式写入，非文本形式

【对象流】

ObjectOutputStream：将对象序列化并写入输出流。
- 对象需实现 java.io.Serializable 接口
- 方法：writeObject(Object obj)
- transient 关键字修饰的字段不会被序列化
- static 字段不属于对象状态，不参与序列化
- 序列化版本号 serialVersionUID 用于版本兼容

ObjectInputStream：从输入流中读取序列化对象并反序列化。
- 方法：readObject() 返回 Object，需强制类型转换
- 反序列化时不调用构造方法
- 需保证类路径中存在对应类，且 serialVersionUID 匹配

【注意事项】
- 数据流和对象流都是装饰器模式，需包装在其他字节流上使用
- 序列化的对象图中所有引用的对象都必须可序列化
- 反序列化存在安全风险，不应反序列化不可信数据`,
    },
    {
      id: 'k_other_byte_stream',
      treeId: 'tree_other_byte_stream',
      name: '其他字节流',
      label: '其他字节流',
      parentTreeId: 'tree_byte_stream_group',
      tags: ['java', 'jdk', 'java.io', 'ByteArrayInputStream', 'PipedInputStream', 'FilterInputStream', 'SequenceInputStream'],
      content: `【数组流】

ByteArrayInputStream：将内存中的字节数组作为输入源。
- 构造方法：new ByteArrayInputStream(byte[] buf) / new ByteArrayInputStream(byte[] buf, int offset, int length)
- 数据来自内存数组，不涉及实际 IO
- close() 方法无效，流可在关闭后继续使用

ByteArrayOutputStream：将数据写入到内存中的字节数组。
- 内部缓冲区自动增长
- 方法：toByteArray() 获取字节数组、toString() 获取字符串、writeTo(OutputStream) 写入其他流
- 常用于数据暂存、格式转换

【管道流】

PipedOutputStream / PipedInputStream：用于线程间字节流通信。
- PipedOutputStream 写入，PipedInputStream 读取
- 需通过 connect() 方法或构造方法连接配对
- 一个线程写入，另一个线程读取，内部有缓冲区
- 不要在同一线程中同时使用配对的管道流（会死锁）

【过滤流】

FilterInputStream / FilterOutputStream：字节流的装饰器模式基类。
- 包装另一个输入/输出流，提供额外功能
- 本身只是委托调用，子类扩展功能
- 子类：BufferedInputStream、DataInputStream、ObjectInputStream、PushbackInputStream 等

【序列流】

SequenceInputStream：将多个输入流串联为一个输入流。
- 按顺序依次读取，读完一个流自动切换到下一个
- 构造方法：new SequenceInputStream(Enumeration<? extends InputStream> e) / new SequenceInputStream(InputStream s1, InputStream s2)
- 常用于合并多个文件或流`,
    },

    // ===== 第四组：传统IO-字符流 =====
    {
      id: 'k_char_stream_group',
      treeId: 'tree_char_stream_group',
      name: '传统IO-字符流',
      label: '传统IO字符流（java.io）',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'jdk', 'java.io', 'IO', '字符流', 'Reader', 'Writer'],
      content: `字符流以字符（char）为单位处理文本数据，自动处理字符编码转换，适合文本文件、字符串等。

【抽象基类】
- Reader：所有字符输入流的超类
- Writer：所有字符输出流的超类

【具体实现类】
- 文件流：FileReader / FileWriter
- 缓冲流：BufferedReader / BufferedWriter
- 桥接流：InputStreamReader / OutputStreamWriter（字节流↔字符流）
- 数组流：CharArrayReader / CharArrayWriter
- 字符串流：StringReader / StringWriter
- 打印流：PrintWriter
- 管道流：PipedReader / PipedWriter
- 特殊流：LineNumberReader / PushbackReader

【字节流 vs 字符流】
- 字节流处理二进制数据，以 byte 为单位
- 字符流处理文本数据，以 char 为单位，自动编码转换
- 字符流内部基于字节流 + 编码转换（桥接流）

子主题：
- Reader：基类与常用方法
- Writer：基类与常用方法
- 文件流与缓冲流：FileReader/FileWriter + BufferedReader/BufferedWriter
- 桥接流：InputStreamReader/OutputStreamWriter（指定编码）
- 其他字符流：数组/字符串/打印/管道/特殊`,
    },
    {
      id: 'k_reader',
      treeId: 'tree_reader',
      name: 'Reader',
      label: 'Reader（字符输入流基类）',
      parentTreeId: 'tree_char_stream_group',
      tags: ['java', 'jdk', 'java.io', 'Reader', '字符流', '抽象类'],
      content: `Reader 是所有字符输入流的抽象基类，定义了字符输入的基本操作。

【类定义】
java.io.Reader，实现 Readable 和 Closeable 接口。

【核心方法】
- int read()：读取一个字符，返回字符的整数值（0~65535）；流末尾返回 -1
- int read(char[] cbuf)：读取字符存入字符数组 cbuf，返回实际读取字符数；末尾返回 -1
- int read(char[] cbuf, int off, int len)：读取最多 len 个字符，存入数组 cbuf 的 off 偏移位置
- int read(CharBuffer target)：将字符读入指定字符缓冲区
- long skip(long n)：跳过并丢弃 n 个字符，返回实际跳过字符数
- boolean ready()：判断此流是否已准备好被读取（不阻塞）
- void mark(int readAheadLimit)：在当前位置设置标记
- void reset()：重新定位到上次标记位置
- boolean markSupported()：检查是否支持 mark() 和 reset()
- void close()：关闭输入流并释放相关资源

【设计特点】
- 抽象类，不能直接实例化
- 内部处理字符编码，将字节解码为 char
- 子类需实现 read(char[], int, int) 和 close() 方法
- 实现了 Readable，可配合 Scanner 使用`,
    },
    {
      id: 'k_writer',
      treeId: 'tree_writer',
      name: 'Writer',
      label: 'Writer（字符输出流基类）',
      parentTreeId: 'tree_char_stream_group',
      tags: ['java', 'jdk', 'java.io', 'Writer', '字符流', '抽象类'],
      content: `Writer 是所有字符输出流的抽象基类，定义了字符输出的基本操作。

【类定义】
java.io.Writer，实现 Appendable、Closeable 和 Flushable 接口。

【核心方法】
- void write(int c)：将指定字符写入输出流
- void write(char[] cbuf)：将字符数组 cbuf 中所有字符写入输出流
- void write(char[] cbuf, int off, int len)：将字符数组 cbuf 中从 off 开始的 len 个字符写入
- void write(String str)：将字符串写入输出流
- void write(String str, int off, int len)：将字符串 str 中从 off 开始的 len 个字符写入
- Writer append(char c)：将指定字符追加到此 writer
- Writer append(CharSequence csq)：将指定字符序列追加到此 writer
- Writer append(CharSequence csq, int start, int end)：追加字符序列的子序列
- void flush()：刷新输出流，强制写出所有缓冲数据
- void close()：关闭输出流并释放资源；关闭前会自动 flush

【设计特点】
- 抽象类，不能直接实例化
- 内部处理字符编码，将 char 编码为字节
- 子类需实现 write(char[], int, int)、flush() 和 close() 方法
- 实现了 Appendable，可配合格式化输出使用`,
    },
    {
      id: 'k_file_buffered_char',
      treeId: 'tree_file_buffered_char',
      name: '文件流与缓冲流',
      label: '文件字符流与缓冲流',
      parentTreeId: 'tree_char_stream_group',
      tags: ['java', 'jdk', 'java.io', 'FileReader', 'FileWriter', 'BufferedReader', 'BufferedWriter'],
      content: `【文件字符流】

FileReader：从文件中读取字符数据。
- 继承 InputStreamReader，使用操作系统默认字符编码（Windows 通常 GBK）
- 构造方法：new FileReader(String path) / new FileReader(File file)
- 注意：无法指定编码，处理中文建议用 InputStreamReader + FileInputStream 显式指定 UTF-8

FileWriter：将字符数据写入文件。
- 继承 OutputStreamWriter，使用操作系统默认字符编码
- 构造方法：new FileWriter(String path) / new FileWriter(File file) / new FileWriter(path, true)（追加模式）
- 目标文件不存在时自动创建
- 同样无法指定编码

【缓冲字符流】

BufferedReader：为字符输入流提供缓冲功能，支持按行读取。
- 内部维护字符缓冲区（默认 8192 字符）
- 特有方法：String readLine() — 读取一行文本，以换行符为结束标志，返回不含行终止符的字符串；流末尾返回 null
- 构造方法：new BufferedReader(Reader in) / new BufferedReader(Reader in, int sz)
- 支持 mark()/reset() 操作
- 典型用法：new BufferedReader(new FileReader("file.txt"))

BufferedWriter：为字符输出流提供缓冲功能，支持按行写入。
- 内部维护字符缓冲区
- 特有方法：void newLine() — 写入行分隔符（根据系统属性 line.separator）
- 构造方法：new BufferedWriter(Writer out) / new BufferedWriter(Writer out, int sz)
- 必须 flush() 或 close() 才能确保数据写入文件

【编码注意】
FileReader/FileWriter 使用系统默认编码，跨平台可能乱码。
推荐使用桥接流显式指定编码：
new BufferedReader(new InputStreamReader(new FileInputStream("file.txt"), "UTF-8"))
new BufferedWriter(new OutputStreamWriter(new FileOutputStream("file.txt"), "UTF-8"))`,
    },
    {
      id: 'k_bridge_stream',
      treeId: 'tree_bridge_stream',
      name: '桥接流',
      label: '桥接流（InputStreamReader/OutputStreamWriter）',
      parentTreeId: 'tree_char_stream_group',
      tags: ['java', 'jdk', 'java.io', 'InputStreamReader', 'OutputStreamWriter', '桥接流', '编码'],
      content: `桥接流是字节流与字符流之间的桥梁，负责字节与字符之间的编码转换，是 Java IO 中处理指定编码的关键类。

【InputStreamReader】
字节流 → 字符流的桥接，将字节解码为字符。
- 继承 Reader
- 构造方法：
  - new InputStreamReader(InputStream in)：使用默认字符集
  - new InputStreamReader(InputStream in, String charsetName)：使用指定字符集
  - new InputStreamReader(InputStream in, Charset cs)：使用指定 Charset 对象
- 从底层字节流读取字节，按指定编码解码为 char
- getEncoding()：返回此流使用的字符编码名称

【OutputStreamWriter】
字符流 → 字节流的桥接，将字符编码为字节。
- 继承 Writer
- 构造方法：
  - new OutputStreamWriter(OutputStream out)：使用默认字符集
  - new OutputStreamWriter(OutputStream out, String charsetName)：使用指定字符集
  - new OutputStreamWriter(OutputStream out, Charset cs)：使用指定 Charset 对象
- 将字符按指定编码编码为字节，写入底层字节流
- getEncoding()：返回此流使用的字符编码名称

【为什么需要桥接流】
- FileReader/FileWriter 只能使用系统默认编码，无法指定
- 桥接流可以显式指定 UTF-8、GBK、ISO-8859-1 等编码
- 是处理中文、跨平台文件的推荐方式

【典型用法】
// 读取 UTF-8 编码的文本文件
BufferedReader reader = new BufferedReader(
    new InputStreamReader(new FileInputStream("file.txt"), "UTF-8"));

// 写入 UTF-8 编码的文本文件
BufferedWriter writer = new BufferedWriter(
    new OutputStreamWriter(new FileOutputStream("file.txt"), "UTF-8"));

// 读取网络流（字节流）并按指定编码解析
BufferedReader reader = new BufferedReader(
    new InputStreamReader(socket.getInputStream(), "UTF-8"));`,
    },
    {
      id: 'k_other_char_stream',
      treeId: 'tree_other_char_stream',
      name: '其他字符流',
      label: '其他字符流',
      parentTreeId: 'tree_char_stream_group',
      tags: ['java', 'jdk', 'java.io', 'CharArrayReader', 'StringReader', 'PrintWriter', 'PipedReader', 'LineNumberReader', 'PushbackReader'],
      content: `【数组流】

CharArrayReader：将字符数组作为输入源。
- 构造方法：new CharArrayReader(char[] buf) / new CharArrayReader(char[] buf, int offset, int length)
- 数据来自内存数组，close() 无效

CharArrayWriter：将数据写入到字符数组。
- 内部缓冲区自动增长
- 方法：toCharArray() 获取字符数组、toString() 获取字符串、writeTo(Writer) 写入其他流

【字符串流】

StringReader：将字符串作为输入源。
- 构造方法：new StringReader(String s)
- 数据来自字符串，close() 无效

StringWriter：将数据写入到字符串缓冲区。
- 内部维护 StringBuffer
- 方法：toString() 获取字符串、getBuffer() 获取 StringBuffer
- 常用于格式化输出、字符串拼接

【打印流】

PrintWriter：便捷的字符输出流，支持自动刷新和格式化输出。
- 构造方法可包装 OutputStream、Writer、文件路径
- 方法：print()、println()、printf()、format()
- 可设置 autoFlush：println()、printf()、format() 时自动刷新
- 不会抛出 IOException，通过 checkError() 检查错误

【管道流】

PipedReader / PipedWriter：用于线程间字符流通信。
- PipedWriter 写入，PipedReader 读取
- 需配对连接，不要在同一线程中同时使用

【特殊字符流】

LineNumberReader：带行号的缓冲字符输入流。
- 继承 BufferedReader
- 方法：getLineNumber() 获取当前行号、setLineNumber(int) 设置行号
- 常用于日志分析、代码解析

PushbackReader：允许读取字符后将字符推回流中。
- 方法：unread(int c)、unread(char[] cbuf)、unread(char[] cbuf, int off, int len)
- 常用于解析器（需要预读字符再推回）`,
    },

    // ===== 第五组：传统IO-文件与控制台 =====
    {
      id: 'k_file_console_group',
      treeId: 'tree_file_console_group',
      name: '传统IO-文件与控制台',
      label: '文件操作与控制台IO',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'jdk', 'java.io', 'File', 'RandomAccessFile', '控制台', 'System.in', 'System.out'],
      content: `传统 IO 中的文件操作类和控制台输入输出。

【文件操作类】
- File：表示文件或目录路径，提供创建、删除、重命名、查询等操作
- RandomAccessFile：支持文件随机访问，可从任意位置读写
- 目录操作：创建、遍历、删除目录

【控制台IO】
- System.in：标准输入流（InputStream），默认关联键盘
- System.out：标准输出流（PrintStream），默认关联控制台
- System.err：标准错误流（PrintStream）
- BufferedReader：包装 System.in 实现字符输入
- Scanner：便捷的控制台输入工具

子主题：
- File类：路径表示与文件操作方法
- RandomAccessFile：随机文件访问
- 目录操作：创建、遍历、删除
- 控制台IO：System.in/out/err 与输入输出方式`,
    },
    {
      id: 'k_file_class',
      treeId: 'tree_file_class',
      name: 'File类',
      label: 'File类',
      parentTreeId: 'tree_file_console_group',
      tags: ['java', 'jdk', 'java.io', 'File', '文件', '目录'],
      content: `java.io.File 类用于表示文件或目录的路径信息，提供文件系统操作。

【特点】
- 只表示路径信息，不直接读写文件内容
- 文件和目录都用 File 对象表示
- 跨平台：自动处理不同操作系统的路径分隔符

【判断与查询方法】
- boolean exists()：文件或目录是否存在
- boolean isFile()：是否为文件（非目录）
- boolean isDirectory()：是否为目录
- boolean canRead()：是否可读
- boolean canWrite()：是否可写
- boolean canExecute()：是否可执行
- boolean isHidden()：是否为隐藏文件

【路径与名称方法】
- String getName()：返回文件或目录名称（不含路径）
- String getPath()：返回构造时传入的路径
- String getAbsolutePath()：返回绝对路径
- String getCanonicalPath()：返回规范路径（解析符号链接和相对路径）
- File getParentFile()：返回父目录的 File 对象
- long length()：返回文件长度（字节数）
- long lastModified()：返回最后修改时间（毫秒时间戳）

【创建与删除方法】
- boolean createNewFile()：创建新文件；已存在返回 false
- boolean mkdir()：创建单级目录；父目录不存在则失败
- boolean mkdirs()：创建多级目录（含所有父目录）
- boolean delete()：删除文件或空目录
- void deleteOnExit()：JVM 退出时删除

【目录遍历方法】
- String[] list()：返回目录中所有条目名称数组
- File[] listFiles()：返回目录中所有条目的 File 对象数组
- File[] listFiles(FilenameFilter filter)：按名称过滤
- File[] listFiles(FileFilter filter)：按文件过滤
- static File[] listRoots()：列出文件系统根目录（Windows 盘符）

【其他方法】
- boolean renameTo(File dest)：重命名或移动文件
- boolean setLastModified(long time)：设置最后修改时间
- boolean setReadOnly()：设置为只读

【路径分隔符】
- File.separator：系统相关的默认名称分隔符（Windows 为 "\\"，Linux 为 "/"）
- File.pathSeparator：路径分隔符（Windows 为 ";"，Linux 为 ":"）
- Java 中使用正斜杠 "/" 在 Windows 也能正确解析`,
    },
    {
      id: 'k_random_access_file',
      treeId: 'tree_random_access_file',
      name: 'RandomAccessFile',
      label: 'RandomAccessFile',
      parentTreeId: 'tree_file_console_group',
      tags: ['java', 'jdk', 'java.io', 'RandomAccessFile', '随机访问', '文件'],
      content: `java.io.RandomAccessFile 支持文件的随机访问，可从文件任意位置读写数据。

【特点】
- 独立于 InputStream/OutputStream 体系
- 同时实现 DataInput 和 DataOutput 接口
- 通过文件指针（file pointer）定位当前读写位置
- 既可读又可写（取决于访问模式）

【构造方法】
- RandomAccessFile(File file, String mode)
- RandomAccessFile(String name, String mode)

访问模式 mode：
- "r"：只读模式
- "rw"：读写模式
- "rws"：读写模式，每次写入同步刷新到存储设备（内容和元数据）
- "rwd"：读写模式，每次写入同步刷新到存储设备（仅内容）

【文件指针方法】
- void seek(long pos)：将文件指针定位到指定位置（从文件开头的字节偏移量）
- long getFilePointer()：返回当前文件指针位置
- long length()：返回文件长度
- void setLength(long newLength)：设置文件长度（可截断或扩展）

【读写方法】
- 字节读写：int read()、void write(int b)、int read(byte[] b)、void write(byte[] b)
- 基本类型读写：readInt()、readLong()、readDouble()、readUTF()、writeInt()、writeLong()、writeDouble()、writeUTF() 等
- void close()：关闭文件并释放资源

【典型应用场景】
- 大文件的部分读写（无需加载整个文件到内存）
- 数据库文件管理
- 断点续传（记录已下载位置，seek 到该位置继续）
- 多线程分块写文件
- 配置文件的定点修改`,
    },
    {
      id: 'k_dir_operation',
      treeId: 'tree_dir_operation',
      name: '目录操作',
      label: '目录操作',
      parentTreeId: 'tree_file_console_group',
      tags: ['java', 'jdk', 'java.io', 'File', '目录', 'mkdir', 'listFiles', 'delete'],
      content: `使用 java.io.File 进行目录的创建、遍历和删除操作。

【创建目录】
- boolean mkdir()：创建单级目录
  - 成功返回 true，失败返回 false
  - 失败原因：路径已存在，或父目录不存在
  - 要求父目录必须存在

- boolean mkdirs()：创建多级目录
  - 创建此抽象路径名指定的目录，包括所有不存在的父目录
  - 推荐使用，更健壮
  - 注意：如果部分父目录已存在，也能成功创建剩余部分

【遍历目录】
- String[] list()：返回目录中所有文件和子目录的名称数组
  - 如果 File 对象不是目录，返回 null
  - 只返回名称，不含路径

- File[] listFiles()：返回目录中所有文件和子目录的 File 对象数组
  - 更常用，可进一步操作每个条目
  - 如果不是目录，返回 null

- 带过滤器的遍历：
  - File[] listFiles(FilenameFilter filter)：按名称过滤
  - File[] listFiles(FileFilter filter)：按文件属性过滤
  - FilenameFilter 接口：boolean accept(File dir, String name)
  - FileFilter 接口：boolean accept(File pathname)

【删除目录】
- boolean delete()：删除文件或目录
  - 删除文件：直接调用即可
  - 删除目录：目录必须为空（不含任何文件和子目录），否则失败返回 false

- 删除非空目录：需递归删除
  1. 调用 listFiles() 获取目录内所有条目
  2. 对每个条目：如果是子目录，递归删除；如果是文件，直接 delete()
  3. 所有条目删除后，最后删除目录本身
  4. 注意处理 listFiles() 返回 null 的情况（权限不足等）

【路径分隔符与跨平台】
- Java 在 UNIX 和 Windows 自动按约定分辨文件路径分隔符
- Windows 中使用正斜杠 "/" 也能正确解析
- 推荐使用 File.separator 获取系统相关分隔符
- 推荐使用 File 对象而非字符串拼接路径

【File 类的局限】
- 不支持符号链接操作
- 属性操作有限（不支持文件权限的细粒度控制）
- 更强大的文件操作推荐使用 java.nio.file.Files 和 java.nio.file.Path（NIO.2）`,
    },
    {
      id: 'k_console_io',
      treeId: 'tree_console_io',
      name: '控制台IO',
      label: '控制台IO',
      parentTreeId: 'tree_file_console_group',
      tags: ['java', 'jdk', 'java.io', 'System.in', 'System.out', 'System.err', 'BufferedReader', 'PrintStream', 'Scanner'],
      content: `Java 控制台输入输出通过 java.lang.System 类的静态成员实现。

【标准流】
- System.in：InputStream 类型，标准输入流，默认关联键盘
- System.out：PrintStream 类型，标准输出流，默认关联控制台
- System.err：PrintStream 类型，标准错误流，默认关联控制台，用于错误信息

【控制台输入方式】

方式一：BufferedReader + InputStreamReader（传统方式）
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
- int read()：读取一个字符，返回整数值；流结束返回 -1；抛出 IOException
- String readLine()：读取一行字符串；抛出 IOException
- 功能强大，支持逐字符或逐行读取
- 需处理受检异常 IOException
- 读取基本类型需手动转换（Integer.parseInt 等）

方式二：Scanner（JDK 5+，推荐日常使用）
Scanner scanner = new Scanner(System.in);
- String next()：读取下一个标记（空白分隔）
- String nextLine()：读取一整行
- int nextInt()：读取整数
- double nextDouble()：读取双精度浮点数
- boolean nextBoolean()：读取布尔值
- 对应的 hasNextXxx() 验证输入类型
- 便捷，支持直接解析基本类型，不需处理 IOException
- 大量输入时性能略低于 BufferedReader

方式三：Console.readPassword()（读取密码）
Console console = System.console();
if (console != null) { char[] password = console.readPassword("请输入密码："); }
- 输入密码时不回显（安全）
- 只能在真正的控制台中使用，IDE 中通常返回 null
- 返回 char[] 而非 String，使用后可清空数组

【控制台输出方式】

PrintStream 常用方法（System.out）：
- void print(String s) / print(int i) 等：输出，不换行
- void println(String x) / println()：输出后换行
- void printf(String format, Object... args)：格式化输出
- void format(String format, Object... args)：同 printf
- void write(int byteval)：低层字节写入（不常用）

System.err：
- 标准错误输出流，也是 PrintStream
- 用于输出错误信息，某些系统显示为红色
- System.out 和 System.err 是独立流，输出顺序可能交错

【输出重定向】
- System.setOut(PrintStream out)：重定向标准输出
- System.setErr(PrintStream err)：重定向标准错误
- System.setIn(InputStream in)：重定向标准输入
- 可将输出重定向到文件，实现日志记录`,
    },

    // ===== 第六组：NIO核心 =====
    {
      id: 'k_nio_core_group',
      treeId: 'tree_nio_core_group',
      name: 'NIO核心',
      label: 'NIO核心组件',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'jdk', 'java.nio', 'NIO', 'Channel', 'Buffer', 'Selector'],
      content: `NIO（New IO / Non-blocking IO）的三大核心组件：Channel（通道）、Buffer（缓冲区）、Selector（选择器）。

【与传统 IO 的区别】
- 传统 IO 面向流（Stream），NIO 面向缓冲区（Buffer）
- 传统 IO 是阻塞的，NIO 是非阻塞的
- 传统 IO 的 Stream 是单向的，NIO 的 Channel 是双向的
- NIO 可通过 Selector 用单线程管理多个 Channel

【三大核心】
- Channel：通道，数据的来源和目标，双向读写
- Buffer：缓冲区，数据经由 Buffer 在 Channel 间传输
- Selector：选择器，监听多个 Channel 的事件，实现单线程多通道管理

子主题：
- 三大组件概览：整体架构与工作流程
- Channel 原理：通道的概念、特点、主要实现
- Buffer 原理：缓冲区的结构、属性、操作模式
- Selector 原理：选择器的概念、事件监听、工作流程`,
    },
    {
      id: 'k_nio_overview',
      treeId: 'tree_nio_overview',
      name: '三大组件概览',
      label: 'NIO三大组件概览',
      parentTreeId: 'tree_nio_core_group',
      tags: ['java', 'NIO', 'Channel', 'Buffer', 'Selector', '概览'],
      content: overviewContent,
    },
    {
      id: 'k_nio_channel_principle',
      treeId: 'tree_nio_channel_principle',
      name: 'Channel原理',
      label: 'Channel（通道）原理',
      parentTreeId: 'tree_nio_core_group',
      tags: ['java', 'NIO', 'Channel', '通道', '原理'],
      content: `Channel（通道）是 NIO 的核心组件之一，是数据的来源和目标，类似于传统 IO 中的 Stream，但有本质区别。

【Channel vs Stream】
- Stream 是单向的（InputStream 只读，OutputStream 只写）
- Channel 是双向的，既可读又可写
- Stream 是阻塞的，Channel 可设置为非阻塞模式
- Channel 的数据必须经由 Buffer 传输

【Channel 的特点】
- 实现了 java.nio.channels.Channel 接口
- 实现了 Closeable，可使用 try-with-resources
- 可通过 isOpen() 检查是否打开
- 支持阻塞和非阻塞两种模式（通过 configureBlocking(false) 设置非阻塞）

【主要 Channel 实现】
- FileChannel：文件 IO，从文件读取数据或写入数据（阻塞模式，不支持非阻塞）
- SocketChannel：TCP 客户端，通过 TCP 读写网络数据
- ServerSocketChannel：TCP 服务端，监听新进来的 TCP 连接
- DatagramChannel：UDP，通过 UDP 读写网络数据

【数据流向】
数据总是从 Channel 读取到 Buffer 中，或从 Buffer 写入到 Channel 中：
- 读：channel.read(buffer) — 从通道读取数据填入缓冲区
- 写：channel.write(buffer) — 将缓冲区数据写入通道

【Channel 与 Selector】
- 非阻塞模式的 Channel 可注册到 Selector 上
- 注册时指定感兴趣的事件（OP_READ、OP_WRITE、OP_CONNECT、OP_ACCEPT）
- Selector 监听多个 Channel 的事件，实现单线程管理多个连接`,
    },
    {
      id: 'k_nio_buffer_principle',
      treeId: 'tree_nio_buffer_principle',
      name: 'Buffer原理',
      label: 'Buffer（缓冲区）原理',
      parentTreeId: 'tree_nio_core_group',
      tags: ['java', 'NIO', 'Buffer', '缓冲区', '原理', 'ByteBuffer'],
      content: `Buffer（缓冲区）是 NIO 的核心组件之一，是一个容器，本质是一个连续数组。Channel 提供从文件、网络读取数据的渠道，但读写的数据都必须经由 Buffer。

【Buffer 的本质】
- 顶层抽象类 java.nio.Buffer
- 具体子类：ByteBuffer、CharBuffer、IntBuffer、LongBuffer、FloatBuffer、DoubleBuffer、ShortBuffer
- 最常用的是 ByteBuffer

【Buffer 的四个核心属性】
- capacity（容量）：缓冲区可容纳的最大元素数，创建时指定，不可改变
- position（位置）：下一个要读/写的元素索引，从 0 开始，最大为 capacity-1
- limit（上限）：第一个不可读/写的元素索引，position 不能超过 limit
- mark（标记）：可选的标记位置，通过 mark() 设置，reset() 回到该位置

属性关系：0 <= mark <= position <= limit <= capacity

【Buffer 的操作模式】
- 写模式（写入数据到 Buffer）：
  - 初始：position=0, limit=capacity
  - 每写入一个元素，position++
  - 最多写入 limit 个元素

- 读模式（从 Buffer 读取数据）：
  - 调用 flip() 切换：limit=position, position=0
  - 每读取一个元素，position++
  - 最多读取 limit 个元素

【Buffer 的核心方法】
- allocate(int capacity)：分配指定容量的缓冲区
- put()：写入数据到缓冲区（多种重载）
- get()：从缓冲区读取数据（多种重载）
- flip()：翻转缓冲区，从写模式切换到读模式（limit=position, position=0）
- rewind()：倒回，position=0，limit 不变（可重新读取）
- clear()：清空缓冲区，position=0, limit=capacity（可重新写入；数据未真正清除）
- compact()：压缩缓冲区，将未读数据移到开头，position 设为未读数据长度
- mark()：设置标记
- reset()：回到标记位置
- remaining()：返回剩余元素数（limit - position）
- hasRemaining()：是否还有剩余元素

【直接缓冲区 vs 非直接缓冲区】
- 非直接缓冲区（allocate）：在 JVM 堆中分配，数据需从内核空间拷贝到用户空间
- 直接缓冲区（allocateDirect）：在操作系统本地内存中分配，避免数据拷贝，性能更好
- 直接缓冲区分配和回收成本较高，适合长期存在、大容量的缓冲区
- FileChannel 支持内存映射文件（map()），性能更高

【数据流向】
客户端发送数据：数据存入 Buffer → Buffer 内容写入 Channel
服务端接收数据：Channel 将数据读入 Buffer → 从 Buffer 取出数据处理`,
    },
    {
      id: 'k_nio_selector_principle',
      treeId: 'tree_nio_selector_principle',
      name: 'Selector原理',
      label: 'Selector（选择器）原理',
      parentTreeId: 'tree_nio_core_group',
      tags: ['java', 'NIO', 'Selector', '选择器', '原理', 'IO多路复用'],
      content: `Selector（选择器）是 NIO 的核心类，能够检测多个注册的通道上是否有事件发生，实现单线程管理多个通道（连接）。

【为什么需要 Selector】
- 传统 BIO：每个连接一个线程，连接数多时线程开销大，上下文切换频繁
- NIO + Selector：单线程可管理成千上万个连接，只有在连接真正有读写事件时才处理
- 大大减少系统开销，避免多线程上下文切换

【Selector 的工作原理】
- Selector 是 IO 多路复用的 Java 实现
- 底层基于操作系统的 select/poll/epoll（Linux）或 kqueue（macOS）
- 多个 Channel 注册到同一个 Selector 上
- 调用 select() 方法阻塞等待事件
- 有事件发生时，select() 返回就绪的 Channel 数量
- 通过 selectedKeys() 获取就绪的 SelectionKey 集合，逐个处理

【Channel 注册到 Selector】
- Channel 必须处于非阻塞模式（configureBlocking(false)）
- 调用 channel.register(selector, interestOps, attachment) 注册
- interestOps（感兴趣的事件）：
  - SelectionKey.OP_READ：读就绪（1）
  - SelectionKey.OP_WRITE：写就绪（4）
  - SelectionKey.OP_CONNECT：连接就绪（8）
  - SelectionKey.OP_ACCEPT：接受连接就绪（16）
- 可通过位或组合多个事件：OP_READ | OP_WRITE
- attachment：可选的附加对象，可在处理事件时获取

【SelectionKey】
- 每次注册返回一个 SelectionKey 对象，表示 Channel 与 Selector 的注册关系
- 包含：Channel、Selector、interestOps、readyOps、attachment
- 方法：
  - channel()：获取关联的 Channel
  - selector()：获取关联的 Selector
  - interestOps()：获取感兴趣的事件集合
  - readyOps()：获取已就绪的事件集合
  - isReadable()、isWritable()、isConnectable()、isAcceptable()：判断具体事件
  - attachment()：获取附加对象
  - cancel()：取消注册

【Selector 的核心方法】
- open()：打开一个 Selector
- select()：阻塞等待，直到至少有一个通道就绪
- select(long timeout)：阻塞等待，最多 timeout 毫秒
- selectNow()：非阻塞，立即返回就绪数量（可能为 0）
- selectedKeys()：返回已就绪的 SelectionKey 集合
- keys()：返回所有注册的 SelectionKey 集合
- wakeup()：唤醒阻塞在 select() 上的线程
- close()：关闭 Selector，所有关联的 SelectionKey 失效

【处理流程】
1. 创建 Selector：Selector.open()
2. 将 Channel 设置为非阻塞并注册到 Selector
3. 循环调用 selector.select() 等待事件
4. 获取 selectedKeys 迭代器
5. 逐个处理就绪事件（根据 isReadable/isWritable 等判断）
6. 处理完后从 selectedKeys 中移除（必须手动移除，否则下次还会被选中）
7. 回到步骤 3

【注意事项】
- selectedKeys 集合需要手动移除已处理的 key，Selector 不会自动移除
- select() 方法可能被 wakeup() 唤醒，也可能因超时返回
- FileChannel 不支持非阻塞模式，不能注册到 Selector
- Selector 不是线程安全的，keys 和 selectedKeys 的迭代器是 fail-fast 的`,
    },

    // ===== 第七组：NIO实现 =====
    {
      id: 'k_nio_impl_group',
      treeId: 'tree_nio_impl_group',
      name: 'NIO实现',
      label: 'NIO Channel与Buffer实现',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'jdk', 'java.nio', 'NIO', 'FileChannel', 'SocketChannel', 'ServerSocketChannel', 'ByteBuffer'],
      content: `NIO 各组件的具体实现类与使用方法。

【Channel 实现】
- FileChannel：文件通道，用于文件的读写、操作（阻塞模式）
- SocketChannel：TCP 客户端通道，支持非阻塞
- ServerSocketChannel：TCP 服务端通道，支持非阻塞
- DatagramChannel：UDP 通道

【Buffer 实现】
- ByteBuffer：字节缓冲区，最常用，支持直接/非直接缓冲区
- 其他：CharBuffer、IntBuffer、LongBuffer、FloatBuffer、DoubleBuffer、ShortBuffer

【Selector 使用】
- Selector 的创建、注册、事件循环处理

子主题：
- FileChannel：文件通道的打开、读写、位置、截断、强制刷新
- SocketChannel：TCP 客户端通道的连接、读写、非阻塞模式
- ServerSocketChannel：TCP 服务端通道的监听、接受连接、非阻塞模式
- ByteBuffer：字节缓冲区的分配、读写、直接缓冲区
- Selector使用：完整的 Selector 事件处理流程`,
    },
    {
      id: 'k_nio_file_channel',
      treeId: 'tree_nio_file_channel',
      name: 'FileChannel',
      label: 'FileChannel（文件通道）',
      parentTreeId: 'tree_nio_impl_group',
      tags: ['java', 'NIO', 'FileChannel', '文件', '通道'],
      content: fileChannelContent,
    },
    {
      id: 'k_nio_socket_channel',
      treeId: 'tree_nio_socket_channel',
      name: 'SocketChannel',
      label: 'SocketChannel（TCP客户端通道）',
      parentTreeId: 'tree_nio_impl_group',
      tags: ['java', 'NIO', 'SocketChannel', 'TCP', '客户端', '非阻塞'],
      content: socketChannelContent,
    },
    {
      id: 'k_nio_server_socket_channel',
      treeId: 'tree_nio_server_socket_channel',
      name: 'ServerSocketChannel',
      label: 'ServerSocketChannel（TCP服务端通道）',
      parentTreeId: 'tree_nio_impl_group',
      tags: ['java', 'NIO', 'ServerSocketChannel', 'TCP', '服务端', '非阻塞'],
      content: serverSocketChannelContent,
    },
    {
      id: 'k_nio_byte_buffer',
      treeId: 'tree_nio_byte_buffer',
      name: 'ByteBuffer',
      label: 'ByteBuffer（字节缓冲区）',
      parentTreeId: 'tree_nio_impl_group',
      tags: ['java', 'NIO', 'ByteBuffer', '缓冲区', '直接缓冲区'],
      content: `ByteBuffer 是 NIO 中最常用的缓冲区，用于在 Channel 读写时承载字节数据。

【创建方式】
- ByteBuffer allocate(int capacity)：分配非直接缓冲区（JVM 堆内存）
- ByteBuffer allocateDirect(int capacity)：分配直接缓冲区（操作系统本地内存）
- ByteBuffer wrap(byte[] array)：将现有字节数组包装为缓冲区
- ByteBuffer wrap(byte[] array, int offset, int length)：包装数组的指定区间

【直接缓冲区 vs 非直接缓冲区】
- 非直接缓冲区（allocate）：
  - 分配在 JVM 堆中，受 GC 管理
  - 数据需从内核空间拷贝到用户空间（JVM 堆）
  - 分配和回收快，适合小数据量、短期使用

- 直接缓冲区（allocateDirect）：
  - 分配在操作系统本地内存（堆外内存），不受 GC 直接管理
  - 避免数据在用户空间和内核空间之间的拷贝（零拷贝的一种）
  - IO 操作性能更好，适合大数据量、长期使用
  - 分配和回收成本较高，内存管理需注意（可用 Cleaner 或 System.gc() 触发回收）

【读写方法】
- 字节读写：
  - byte get()：读取当前 position 的字节，position++
  - byte get(int index)：读取指定索引的字节（不改变 position）
  - ByteBuffer get(byte[] dst)：读取字节到数组
  - ByteBuffer put(byte b)：写入字节，position++
  - ByteBuffer put(int index, byte b)：写入字节到指定索引
  - ByteBuffer put(byte[] src)：写入字节数组

- 基本类型读写（大端字节序，可通过 order() 改变）：
  - getChar()/putChar(char)
  - getShort()/putShort(short)
  - getInt()/putInt(int)
  - getLong()/putLong(long)
  - getFloat()/putFloat(float)
  - getDouble()/putDouble(double)

【核心操作方法】
- flip()：翻转，limit=position, position=0（写→读）
- rewind()：倒回，position=0（重新读取）
- clear()：清空，position=0, limit=capacity（重新写入；数据未真正清除）
- compact()：压缩，将 position~limit 之间的未读数据移到缓冲区开头，position=剩余长度
- slice()：创建共享原缓冲区部分内容的新缓冲区
- duplicate()：创建共享原缓冲区全部内容的新缓冲区
- asReadOnlyBuffer()：创建只读视图

【属性查询】
- capacity()：返回容量
- position()：返回当前位置
- position(int newPosition)：设置位置
- limit()：返回上限
- limit(int newLimit)：设置上限
- remaining()：返回剩余元素数（limit - position）
- hasRemaining()：是否还有剩余
- isDirect()：是否为直接缓冲区
- isReadOnly()：是否为只读
- hasArray()：是否有可访问的底层数组
- array()：返回底层数组
- order()：返回字节序（ByteOrder.BIG_ENDIAN / LITTLE_ENDIAN）

【与 Channel 配合使用】
- 读：int bytesRead = channel.read(buffer) — 从通道读取数据填入 buffer
- 写：int bytesWritten = channel.write(buffer) — 将 buffer 数据写入通道
- 注意：read/write 不一定填满/清空缓冲区，需循环处理

【典型使用模式】
1. 分配缓冲区：ByteBuffer buf = ByteBuffer.allocate(1024);
2. 从通道读取：channel.read(buf);
3. 翻转准备读取：buf.flip();
4. 处理数据：while(buf.hasRemaining()) { byte b = buf.get(); }
5. 清空准备下次写入：buf.clear(); // 或 buf.compact() 保留未读数据`,
    },
    {
      id: 'k_nio_selector_usage',
      treeId: 'tree_nio_selector_usage',
      name: 'Selector使用',
      label: 'Selector使用流程',
      parentTreeId: 'tree_nio_impl_group',
      tags: ['java', 'NIO', 'Selector', '使用', '事件循环', 'IO多路复用'],
      content: `Selector 的完整使用流程与典型代码模式。

【使用步骤】

1. 创建 Selector
Selector selector = Selector.open();

2. 将 Channel 设置为非阻塞并注册
ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.configureBlocking(false); // 必须非阻塞
serverChannel.socket().bind(new InetSocketAddress(8080));
// 注册到 Selector，关注 ACCEPT 事件
serverChannel.register(selector, SelectionKey.OP_ACCEPT);

3. 事件循环
while (true) {
    // 阻塞等待就绪事件
    int readyCount = selector.select();
    if (readyCount == 0) continue;

    // 获取就绪的 SelectionKey 集合
    Set<SelectionKey> selectedKeys = selector.selectedKeys();
    Iterator<SelectionKey> iterator = selectedKeys.iterator();

    while (iterator.hasNext()) {
        SelectionKey key = iterator.next();

        if (key.isAcceptable()) {
            // 处理新连接
            ServerSocketChannel server = (ServerSocketChannel) key.channel();
            SocketChannel client = server.accept();
            client.configureBlocking(false);
            client.register(selector, SelectionKey.OP_READ);
        } else if (key.isReadable()) {
            // 处理读事件
            SocketChannel client = (SocketChannel) key.channel();
            ByteBuffer buffer = ByteBuffer.allocate(1024);
            int bytesRead = client.read(buffer);
            if (bytesRead == -1) {
                client.close();
            } else {
                buffer.flip();
                // 处理数据...
                // 如需写回，注册 OP_WRITE 或直接写
            }
        } else if (key.isWritable()) {
            // 处理写事件
            SocketChannel client = (SocketChannel) key.channel();
            ByteBuffer buffer = (ByteBuffer) key.attachment();
            client.write(buffer);
            if (!buffer.hasRemaining()) {
                key.interestOps(SelectionKey.OP_READ); // 写完后取消写关注
            }
        }

        // 必须手动移除已处理的 key
        iterator.remove();
    }
}

【关键注意事项】

1. selectedKeys 必须手动移除
- Selector 不会自动移除已处理的 key
- 不移除会导致下次 select() 时该 key 仍在集合中，重复处理
- 使用 iterator.remove() 移除

2. Channel 必须非阻塞
- 注册到 Selector 的 Channel 必须调用 configureBlocking(false)
- FileChannel 不支持非阻塞，不能注册到 Selector

3. 写事件的处理
- 一般不需要持续关注 OP_WRITE（通道几乎总是可写）
- 只有当有数据要写但写不完时才注册 OP_WRITE
- 写完后应取消 OP_WRITE 关注，改回 OP_READ

4. 断开连接的处理
- read() 返回 -1 表示对端关闭连接
- 应关闭 Channel 并取消注册（key.cancel() 或 channel.close()）

5. 附件（attachment）的使用
- 注册时可传入附件：channel.register(selector, ops, attachment)
- 附件可用于存储会话状态、缓冲区等
- 通过 key.attachment() 获取

6. select() 的唤醒
- select() 阻塞时可通过其他线程调用 selector.wakeup() 唤醒
- wakeup() 后下一次 select() 会立即返回
- close() 也会唤醒阻塞的 select()

7. 多线程安全
- Selector 本身不是线程安全的
- select() 阻塞时，其他线程修改 interestOps 可能导致问题
- 建议在 select() 返回后统一处理

【Selector 的选择方法】
- select()：无限阻塞，直到有通道就绪
- select(long timeout)：阻塞最多 timeout 毫秒
- selectNow()：非阻塞，立即返回（可能为 0）
- wakeup()：唤醒阻塞的 select()

【与 Reactor 模式的关系】
- Selector 是 Reactor 模式的核心组件
- 单 Reactor 单线程：一个 Selector + 一个线程处理所有事件
- 单 Reactor 多线程：一个 Selector + 业务线程池
- 主从 Reactor：主 Selector 处理 ACCEPT，从 Selector 处理 READ/WRITE`,
    },

    // ===== 第八组：NIO文件 =====
    {
      id: 'k_nio_file_group',
      treeId: 'tree_nio_file_group',
      name: 'NIO文件操作',
      label: 'NIO文件操作（java.nio.file）',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'jdk', 'java.nio.file', 'NIO', 'Path', 'Files', 'FileSystem'],
      content: `NIO.2（Java 7 引入）提供了更强大的文件系统 API，位于 java.nio.file 包。

【核心类】
- Path：文件系统路径的抽象，替代 java.io.File
- Files：文件操作工具类，提供大量静态方法
- FileSystem：文件系统的抽象，可获取路径、文件存储等信息
- FileSystems：文件系统工厂类
- Paths：路径工具类（Java 11+ 推荐用 Path.of()）

【与 java.io.File 的对比】
- Path 是接口，更灵活，支持不同文件系统实现
- Files 提供更丰富的操作：复制、移动、删除、属性读写、符号链接、目录流等
- 支持文件权限、文件属性（POSIX、DOS、ACL 等）
- 支持 WatchService（文件变更监听）
- 性能更好，异常更详细

子主题：
- Path与FileSystem：路径表示与文件系统抽象
- Files工具类：文件创建、复制、移动、删除、读写、属性等操作`,
    },
    {
      id: 'k_nio_path_filesystem',
      treeId: 'tree_nio_path_filesystem',
      name: 'Path与FileSystem',
      label: 'Path与FileSystem',
      parentTreeId: 'tree_nio_file_group',
      tags: ['java', 'NIO', 'Path', 'FileSystem', '路径', '文件系统'],
      content: `【Path 接口】

java.nio.file.Path 是文件系统路径的抽象，替代 java.io.File，是 NIO.2 的核心入口。

【创建 Path】
- Java 11+：Path.of(String first, String... more) — 推荐
- Java 7+：Paths.get(String first, String... more)
- 通过 FileSystem：fileSystem.getPath(String first, String... more)
- 从 File 转换：file.toPath()
- 从 URI 转换：Paths.get(uri)

示例：
Path path = Path.of("C:/Users/doc/file.txt");
Path path = Path.of("/home/user/doc", "file.txt"); // 自动拼接

【Path 的核心方法】
- 路径信息：
  - getFileName()：返回文件名（Path）
  - getParent()：返回父路径（Path）
  - getRoot()：返回根路径（Path，如 "/" 或 "C:\\"）
  - getNameCount()：返回路径中的名称元素数
  - getName(int index)：返回指定索引的名称元素
  - subpath(int beginIndex, int endIndex)：返回子路径

- 路径操作：
  - resolve(Path other)：解析路径（拼接）
  - resolveSibling(Path other)：解析兄弟路径
  - relativize(Path other)：计算相对路径
  - normalize()：规范化路径（去除 "." 和 ".."）
  - toAbsolutePath()：返回绝对路径
  - toRealPath(LinkOption... options)：返回真实路径（解析符号链接）

- 转换：
  - toFile()：转换为 java.io.File
  - toUri()：转换为 URI
  - toString()：返回路径字符串

- 判断：
  - startsWith(Path other)：是否以指定路径开头
  - endsWith(Path other)：是否以指定路径结尾
  - isAbsolute()：是否为绝对路径

【FileSystem 类】

java.nio.file.FileSystem 是文件系统的抽象，提供对文件系统的访问。

【获取 FileSystem】
- FileSystems.getDefault()：获取默认文件系统
- FileSystems.getFileSystem(URI uri)：获取指定 URI 的文件系统
- FileSystems.newFileSystem(...)：创建新文件系统（如 ZIP 文件系统）

【FileSystem 的核心方法】
- getPath(String first, String... more)：创建 Path
- getSeparator()：返回名称分隔符（如 "/" 或 "\\"）
- getRootDirectories()：返回根目录迭代器
- getFileStores()：返回文件存储迭代器（磁盘分区）
- isOpen()：文件系统是否打开
- isReadOnly()：是否只读
- supportedFileAttributeViews()：支持的文件属性视图
- getFileAttributeView(...)：获取文件属性视图
- newWatchService()：创建 WatchService（文件变更监听）
- close()：关闭文件系统

【FileSystems 工具类】
- getDefault()：获取默认文件系统
- getFileSystem(URI uri)：获取已有文件系统
- newFileSystem(Path path, ClassLoader loader)：为文件创建新文件系统（如 ZIP）
- newFileSystem(URI uri, Map<String,?> env)：为 URI 创建新文件系统

【Path vs File】
- Path 是接口，File 是类
- Path 支持符号链接、文件属性、权限等高级操作
- Path 配合 Files 工具类使用，功能更强大
- File 可通过 toPath() 转换为 Path，Path 可通过 toFile() 转换为 File
- 新项目推荐使用 Path + Files`,
    },
    {
      id: 'k_nio_files_util',
      treeId: 'tree_nio_files_util',
      name: 'Files工具类',
      label: 'Files工具类',
      parentTreeId: 'tree_nio_file_group',
      tags: ['java', 'NIO', 'Files', '工具类', '文件操作', 'java.nio.file'],
      content: `java.nio.file.Files 是 NIO.2 提供的文件操作工具类，包含大量静态方法，是 java.io.File 的增强替代。

【文件存在与类型判断】
- boolean exists(Path path, LinkOption... options)：文件是否存在
- boolean notExists(Path path, LinkOption... options)：文件是否不存在
- boolean isDirectory(Path path, LinkOption... options)：是否为目录
- boolean isRegularFile(Path path, LinkOption... options)：是否为普通文件
- boolean isSymbolicLink(Path path)：是否为符号链接
- boolean isHidden(Path path)：是否为隐藏文件

【创建与删除】
- createFile(Path path, FileAttribute<?>... attrs)：创建文件
- createDirectory(Path dir, FileAttribute<?>... attrs)：创建单级目录
- createDirectories(Path dir, FileAttribute<?>... attrs)：创建多级目录（含父目录）
- createTempFile(String prefix, String suffix, FileAttribute<?>... attrs)：创建临时文件
- createTempDirectory(String prefix, FileAttribute<?>... attrs)：创建临时目录
- createSymbolicLink(Path link, Path target, FileAttribute<?>... attrs)：创建符号链接
- createLink(Path link, Path existing)：创建硬链接
- delete(Path path)：删除文件或空目录（不存在抛异常）
- deleteIfExists(Path path)：删除（不存在返回 false，不抛异常）

【复制与移动】
- copy(Path source, Path target, CopyOption... options)：复制文件
- copy(InputStream in, Path target, CopyOption... options)：从输入流复制到文件
- copy(Path source, OutputStream out)：从文件复制到输出流
- move(Path source, Path target, CopyOption... options)：移动/重命名文件

CopyOption：
- StandardCopyOption.REPLACE_EXISTING：覆盖已存在的目标
- StandardCopyOption.COPY_ATTRIBUTES：复制文件属性
- StandardCopyOption.ATOMIC_MOVE：原子移动（move 专用）
- LinkOption.NOFOLLOW_LINKS：不跟随符号链接

【文件读写】
- readAllBytes(Path path)：读取文件全部字节（byte[]）
- readAllLines(Path path)：读取文件所有行（List<String>），默认 UTF-8
- readAllLines(Path path, Charset cs)：指定编码读取所有行
- readString(Path path)：读取文件为字符串（Java 11+）
- readString(Path path, Charset cs)：指定编码读取字符串
- write(Path path, byte[] bytes, OpenOption... options)：写入字节数组
- write(Path path, Iterable<? extends CharSequence> lines, OpenOption... options)：写入行集合
- writeString(Path path, CharSequence csq, OpenOption... options)：写入字符串（Java 11+）
- newInputStream(Path path, OpenOption... options)：打开输入流
- newOutputStream(Path path, OpenOption... options)：打开输出流
- newBufferedReader(Path path)：打开 BufferedReader（默认 UTF-8）
- newBufferedReader(Path path, Charset cs)：指定编码打开 BufferedReader
- newBufferedWriter(Path path, OpenOption... options)：打开 BufferedWriter
- newBufferedWriter(Path path, Charset cs, OpenOption... options)：指定编码打开 BufferedWriter

OpenOption：
- StandardOpenOption.READ：读模式
- StandardOpenOption.WRITE：写模式
- StandardOpenOption.APPEND：追加模式
- StandardOpenOption.TRUNCATE_EXISTING：截断已有文件
- StandardOpenOption.CREATE：不存在则创建
- StandardOpenOption.CREATE_NEW：不存在则创建，已存在抛异常
- StandardOpenOption.DELETE_ON_CLOSE：关闭时删除

【目录遍历】
- list(Path dir)：返回目录下直接条目的 Stream<Path>（不递归）
- walk(Path start, FileVisitOption... options)：递归遍历目录树（Stream<Path>）
- walk(Path start, int maxDepth, FileVisitOption... options)：指定深度递归遍历
- walkFileTree(Path start, FileVisitor<? super Path> visitor)：使用访问者模式遍历
- walkFileTree(Path start, Set<FileVisitOption> options, int maxDepth, FileVisitor visitor)
- newDirectoryStream(Path dir)：打开目录流（DirectoryStream<Path>）
- newDirectoryStream(Path dir, String glob)：按 glob 模式过滤
- newDirectoryStream(Path dir, DirectoryStream.Filter<? super Path> filter)：自定义过滤

【文件属性】
- size(Path path)：返回文件大小（字节）
- getLastModifiedTime(Path path, LinkOption... options)：获取最后修改时间
- setLastModifiedTime(Path path, FileTime time)：设置最后修改时间
- getOwner(Path path, LinkOption... options)：获取文件所有者
- setOwner(Path path, UserPrincipal owner)：设置文件所有者
- isExecutable(Path path)：是否可执行
- isReadable(Path path)：是否可读
- isWritable(Path path)：是否可写
- getAttribute(Path path, String attribute, LinkOption... options)：获取指定属性
- setAttribute(Path path, String attribute, Object value, LinkOption... options)：设置属性
- readAttributes(Path path, Class<A> type, LinkOption... options)：读取属性视图
- readAttributes(Path path, String attributes, LinkOption... options)：读取多个属性

属性视图：
- BasicFileAttributeView：基本属性（所有平台）
- DosFileAttributeView：DOS 属性（Windows）
- PosixFileAttributeView：POSIX 属性（Unix/Linux，含权限）
- AclFileAttributeView：ACL 权限
- FileOwnerAttributeView：所有者

【其他实用方法】
- probeContentType(Path path)：探测文件 MIME 类型
- isSameFile(Path path, Path path2)：判断两个路径是否指向同一文件
- getFileStore(Path path)：获取文件所在的 FileStore（磁盘分区）
- getPosixFilePermissions(Path path, LinkOption... options)：获取 POSIX 权限（Unix）
- setPosixFilePermissions(Path path, Set<PosixFilePermission> perms)：设置 POSIX 权限

【WatchService（文件变更监听）】
- FileSystem.newWatchService()：创建监听服务
- Path.register(WatchService watcher, WatchEvent.Kind<?>... events)：注册监听
- 监听事件：ENTRY_CREATE、ENTRY_DELETE、ENTRY_MODIFY、OVERFLOW
- 通过 watchService.take()/poll() 获取变更事件
- 可用于热部署、文件同步、配置变更监听等场景`,
    },

    // ===== 第九组：IO vs NIO对比 =====
    {
      id: 'k_io_nio_comparison',
      treeId: 'tree_io_nio_comparison',
      name: 'IO vs NIO对比',
      label: 'IO vs NIO对比与总结',
      parentTreeId: ROOT_TREE_ID,
      tags: ['java', 'IO', 'NIO', '对比', '总结', 'BIO', 'AIO'],
      content: `传统 IO（java.io）与 NIO（java.nio）的全面对比，以及 NIO 存在的问题和适用场景。

${nioProblems}

${nioSummary}

【核心区别对比】

| 维度 | 传统 IO（java.io） | NIO（java.nio） |
|------|-------------------|-----------------|
| 面向 | 面向流（Stream） | 面向缓冲区（Buffer） |
| 通道 | 单向（InputStream/OutputStream 分开） | 双向（Channel 既可读又可写） |
| 阻塞 | 阻塞式（read/write 阻塞线程） | 非阻塞式（可设置非阻塞模式） |
| 多连接 | 每连接一线程（BIO） | 单线程管理多连接（Selector 多路复用） |
| 数据处理 | 逐字节/逐字符读取，不可前后移动 | 数据读入 Buffer，可在缓冲区前后移动 |
| 核心类 | InputStream/OutputStream/Reader/Writer | Channel/Buffer/Selector |
| 文件操作 | File 类（功能有限） | Path + Files 工具类（功能强大） |
| 适用场景 | 简单文件读写、低并发 | 高并发网络服务、大文件操作 |

【面向流 vs 面向缓冲区】
- 传统 IO 面向流：每次从流中读一个或多个字节，直至读取所有字节，没有被缓存在任何地方，不能前后移动流中的数据
- NIO 面向缓冲区：数据读取到缓冲区，需要时可在缓冲区前后移动，增加了处理灵活性；但需检查缓冲区是否包含所有需要的数据，且避免覆盖未处理数据

【阻塞 vs 非阻塞】
- 传统 IO 的流是阻塞的：线程调用 read()/write() 时被阻塞，直到有数据读取或数据完全写入，期间不能做其他事情
- NIO 的非阻塞模式：线程从通道请求读取数据，仅能得到目前可用的数据；如果没有数据可用，什么都不获取，线程可继续做其他事情；非阻塞写同理
- 线程通常将非阻塞 IO 的空闲时间用于在其他通道上执行 IO 操作，所以单个线程可管理多个输入输出通道

【适用场景选择】
- 使用传统 IO：
  - 简单的文件读写操作
  - 低并发的网络服务
  - 代码简单性优先于性能
  - 处理文本文件（字符流方便）

- 使用 NIO：
  - 高并发网络服务器（如聊天服务器、游戏服务器）
  - 需要管理大量连接的场景
  - 大文件的高效处理（FileChannel + 内存映射）
  - 需要非阻塞 IO 的场景
  - 需要文件变更监听（WatchService）

- 使用 NIO.2 文件 API（Path + Files）：
  - 新项目的文件操作推荐
  - 需要符号链接、文件权限、属性操作
  - 需要目录递归遍历、文件复制移动
  - 需要文件变更监听

【NIO 存在的问题】
- NIO 的非阻塞模式编程复杂度高，需要处理半包、粘包、事件循环等
- Selector 的 select() 在某些平台可能存在空轮询（epoll bug），导致 CPU 100%
- FileChannel 不支持非阻塞模式
- 直接缓冲区的内存管理需要注意（堆外内存不受 GC 直接管理）
- NIO 的 API 相对底层，实际开发中常使用 Netty、Mina 等框架封装

【IO 模型演进总结】
- BIO（Blocking IO）：阻塞式，每连接一线程，简单但并发能力有限
- NIO（Non-blocking IO / New IO）：非阻塞 + IO 多路复用，单线程管理多连接，高并发能力强
- AIO（Asynchronous IO）：异步非阻塞，操作系统完成 IO 后通知，理论上性能最好但实际应用较少（Linux 上 AIO 支持不完善）
- 实际高性能网络服务大多基于 NIO + Reactor 模式实现（如 Netty）`,
    },
  ];

  return nodes;
}

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

  const nio = extractNioContent(nodePool);
  const nodes = buildNodes(nio);

  // 1. 创建/更新所有节点（每个节点只有一个Tab，无子方框）
  for (const node of nodes) {
    const existing = nodePool[node.id];
    nodePool[node.id] = {
      ...existing,
      id: node.id,
      label: node.label,
      role: node.id === ROOT_NODE_ID || node.id.endsWith('_group') ? 'group' : 'concept',
      dimensions: ['java', 'jdk-api'],
      tags: [...new Set([...(existing?.tags ?? []), ...node.tags])],
      card: {
        ...(existing?.card ?? {}),
        nodeId: node.id,
        title: node.label,
        // 只有一个Tab，没有子方框
        tabs: [{ id: 'main', label: node.label, content: node.content }],
      },
    };
  }

  // 2. 构建树结构
  const groupTree = findTreeNode(treeData, GROUP_TREE_ID);
  if (!groupTree) throw new Error('常用类库 group not found');
  groupTree.children ??= [];

  // 确保根节点在常用类库下
  let rootTree = findTreeNode(treeData, ROOT_TREE_ID);
  if (!rootTree) {
    rootTree = { id: ROOT_TREE_ID, name: 'IO与NIO', count: 0, nodeRef: ROOT_NODE_ID, children: [] };
    groupTree.children.push(rootTree);
  }
  rootTree.nodeRef = ROOT_NODE_ID;
  rootTree.name = 'IO与NIO';
  rootTree.children ??= [];

  // 为每个节点创建树节点并挂到父节点下
  for (const node of nodes) {
    if (node.id === ROOT_NODE_ID) continue; // 根节点已处理
    let treeNode = findTreeNode(treeData, node.treeId);
    if (!treeNode) {
      treeNode = { id: node.treeId, name: node.name, count: 0, nodeRef: node.id, children: [] };
      const parent = findTreeNode(treeData, node.parentTreeId);
      if (!parent) throw new Error(`Parent tree node not found: ${node.parentTreeId} for ${node.id}`);
      parent.children ??= [];
      parent.children.push(treeNode);
    }
    treeNode.nodeRef = node.id;
    treeNode.name = node.name;
  }

  // 更新所有分组节点的 count
  function updateCount(node) {
    if (node.children && node.children.length > 0) {
      node.count = node.children.length;
      for (const child of node.children) updateCount(child);
    }
  }
  updateCount(rootTree);
  groupTree.count = groupTree.children.length;

  // 3. 结构关系边（父包含子）
  for (const node of nodes) {
    if (node.id === ROOT_NODE_ID) {
      // 根节点属于常用类库分组
      upsertEdge(knowledgeEdges, {
        id: `treebind:${GROUP_TREE_ID}:${ROOT_TREE_ID}`,
        source: GROUP_NODE_ID,
        target: ROOT_NODE_ID,
        type: 'belongs-to',
        label: 'contains',
        relationKind: 'structure',
        dimensions: ['java'],
      });
    } else {
      // 找到父节点的 nodeRef
      const parentTree = findTreeNode(treeData, node.parentTreeId);
      const parentNodeId = parentTree?.nodeRef;
      if (parentNodeId) {
        upsertEdge(knowledgeEdges, {
          id: `treebind:${node.parentTreeId}:${node.treeId}`,
          source: parentNodeId,
          target: node.id,
          type: 'belongs-to',
          label: 'contains',
          relationKind: 'structure',
          dimensions: ['java'],
        });
      }
    }
  }

  // 4. 语义关系边
  upsertEdge(knowledgeEdges, {
    id: 'edge_io_nio_vs_files',
    source: ROOT_NODE_ID,
    target: NIO_FILES_NODE,
    type: 'related-to',
    label: 'NIO文件操作',
    dimensions: ['java'],
    relationKind: 'dependency',
  });
  upsertEdge(knowledgeEdges, {
    id: 'edge_io_nio_reads_string',
    source: ROOT_NODE_ID,
    target: STRING_NODE,
    type: 'produces',
    label: '读取产生字符串',
    dimensions: ['java'],
    relationKind: 'dependency',
  });

  // 5. 写入
  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Created/updated ${nodes.length} nodes in IO与NIO tree.`);
  console.log('Tree structure:');
  function printTree(node, indent = 0) {
    const n = nodePool[node.nodeRef];
    const label = n?.label || node.name;
    console.log('  '.repeat(indent) + '- ' + node.name + ' (' + label + ')');
    for (const child of node.children ?? []) printTree(child, indent + 1);
  }
  printTree(rootTree);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
