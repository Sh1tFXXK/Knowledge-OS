// Java IO 与 NIO 知识最终整理（2026-08-28）
// 背景：系统里同时存在三套 IO 相关内容，互相混杂：
//   1) java / IO 与 NIO（jimi 导入的旧结构：1 个大杂烩节点 2.4 万字 + 18 张远程图片，另有空壳节点）
//   2) java / 常用类库 / IO流与文件（字节流/字符流/文件操作/控制台，内容已被新树覆盖）
//   3) java / 常用类库 / IO与NIO（fusion 导入的完整目录树，最全，但 18 张图片仍是远程 URL）
// 动作：
//   A. 18 张 MinerU OCR 图片全部人工转写成文字（【图解：…】文本块），替换远程图片链接，
//      并修复 OCR 断裂的代码片段；补全被截断的 SocketChannel / ServerSocketChannel 非阻塞内容
//   B. 删除旧「java / IO 与 NIO」子树（5 个节点）与「常用类库 / IO流与文件」子树（5 个节点），
//      IO/NIO 知识只保留「常用类库 / IO与NIO」一棵树，直接以目录树节点呈现（每节点一个 Tab，纯文字，无嵌套方框）
//   C. 清理对应 pool 条目、treebind 边，语义边改挂到新树根；questions 的 relatedNodeId 重映射到新节点
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `restructure-java-io-nio-final-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json']) {
  copyFileSync(join(DATA, f), join(backupDir, f));
}
console.log('backup ->', backupDir);

// ========== A. 图片转文字后的节点内容 ==========

// --- IO 模型分类：5 张 IO 模型时序图转文字 ---
const modelClassificationContent = `## IO 模型的分类

按照《UNIX 网络编程》的划分，I/O 模型可以分为五类：阻塞 I/O 模型、非阻塞 I/O 模型、I/O 复用模型、信号驱动式 I/O 模型和异步 I/O 模型；按照 POSIX 标准来划分则只分为两类：同步 I/O 和异步 I/O。

一个 I/O 操作其实分成两个步骤：发起 I/O 请求和实际的 I/O 操作。
- 同步与异步的区别在第二步（实际的 I/O 操作是否阻塞请求进程）：如果实际的 I/O 读写阻塞请求进程，就是同步 I/O——阻塞 I/O、非阻塞 I/O、I/O 复用、信号驱动 I/O 都属于同步 I/O；如果不阻塞，而是操作系统帮你做完 I/O 操作再将结果返回给你，就是异步 I/O。
- 阻塞与非阻塞的区别在第一步（发起 I/O 请求是否被阻塞）：如果阻塞直到完成，就是传统的阻塞 I/O；如果不阻塞，就是非阻塞 I/O。

【图解：阻塞 I/O 模型】
Linux 中默认所有 socket 都是 blocking。以读操作为例：
应用进程调用 recvfrom 发起系统调用 → 内核进入第一阶段「等待数据」，直到数据报准备好 → 内核复制数据报（第二阶段「将数据从内核复制到用户空间」）→ 复制完成后向应用进程返回成功指示 → 应用进程处理数据报。
整个「等待数据 + 数据拷贝」期间，进程一直阻塞在 recvfrom 调用上，直到它返回。

【图解：非阻塞 I/O 模型】
Linux 下可以通过设置 socket 使其变为 non-blocking。此时应用进程反复调用 recvfrom（轮询）：
recvfrom →（系统调用）→ 内核：无数据报准备好，立即返回 EWOULDBLOCK；如此反复多次 → 直到某次数据报准备好，内核复制数据报，复制完成后返回成功指示 → 应用进程处理数据报。
等待数据阶段进程不被挂起（但轮询会浪费 CPU）；数据从内核复制到用户空间这一步仍需等待。

【图解：I/O 复用模型】
进程不阻塞在真正的 I/O 系统调用上，而是阻塞在 select 或 poll 上：
应用进程调用 select（系统调用）并阻塞，等待可能多个套接字中的任何一个变为可读 → 内核从「无数据报准备好」到「数据报准备好」后，select 返回可读条件 → 应用进程再调用 recvfrom：内核复制数据报，复制完成后返回成功指示 → 处理数据报。
与阻塞 I/O 相比多了一次系统调用，但一次 select 可以同时等待多个描述符。

【图解：信号驱动式 I/O 模型】
用信号让内核在描述符就绪时发送 SIGIO 通知我们：
应用进程建立 SIGIO 的信号处理程序，通过 sigaction 系统调用安装后立即返回，进程继续执行、不被阻塞 → 数据报准备好后，内核向进程递交 SIGIO 信号 → 进程在信号处理程序中调用 recvfrom：内核复制数据报，复制完成后返回成功指示 → 处理数据报。
等待数据阶段进程不被阻塞；数据复制到进程缓冲区期间进程被阻塞。

【图解：异步 I/O 模型】
应用进程调用 aio_read 发起系统调用后立即返回，进程继续执行：
内核独自完成「等待数据」和「将数据从内核复制到用户空间」两个阶段 → 全部完成后，内核递交在 aio_read 中指定的信号通知应用进程 → 应用进程的信号处理程序直接处理数据报。
包括数据拷贝在内的整个 I/O 过程都不阻塞进程。前四种模型在「数据从内核复制到用户空间」这一步都会阻塞进程，属于同步 I/O；只有异步 I/O 做到全程不阻塞。

以上参考自：《UNIX 网络编程》。`;

// --- AIO：补入「AIO 的动机」段落，修复 OCR 细节 ---
const aioContent = `## AIO 的动机

阻塞模型需要在 I/O 操作开始时阻塞应用程序，这意味着不可能同时重叠进行处理和 I/O 操作；非阻塞模型允许处理和 I/O 操作重叠进行，但需要应用程序自己检查 I/O 操作的状态；异步 I/O 则允许处理和 I/O 操作重叠进行，并且包括 I/O 操作完成的通知。select 函数提供的功能（异步阻塞 I/O）与 AIO 类似，不过它是对通知事件进行阻塞，而不是对 I/O 调用进行阻塞。

## AIO

与 NIO 不同，当进行读写操作时，只须直接调用 API 的 read 或 write 方法即可。这两种方法均为异步的：对于读操作，当有流可读取时，操作系统会将可读的流传入 read 方法的缓冲区，并通知应用程序；对于写操作，当操作系统将 write 方法传递的流写入完毕时，操作系统主动通知应用程序。即 read/write 方法都是异步的，完成后会主动调用回调函数。

在 JDK 1.7 中，这部分内容被称作 NIO.2，主要在 java.nio.channels 包下增加了四个异步通道：

- AsynchronousSocketChannel
- AsynchronousServerSocketChannel
- AsynchronousFileChannel
- AsynchronousDatagramChannel

我们看一下 AsynchronousSocketChannel 中的几个方法：

\`\`\`java
public abstract class AsynchronousSocketChannel
    implements AsynchronousByteChannel, NetworkChannel
{
    public abstract Future<Integer> read(ByteBuffer dst);

    public abstract <A> void read(ByteBuffer[] dsts,
        int offset, int length, long timeout, TimeUnit unit,
        A attachment, CompletionHandler<Long, ? super A> handler);

    public abstract <A> void write(ByteBuffer src,
        long timeout, TimeUnit unit,
        A attachment, CompletionHandler<Integer, ? super A> handler);

    public final <A> void write(ByteBuffer src,
        A attachment, CompletionHandler<Integer, ? super A> handler)
    {
        write(src, 0L, TimeUnit.MILLISECONDS, attachment, handler);
    }

    public abstract Future<Integer> write(ByteBuffer src);

    public abstract <A> void write(ByteBuffer[] srcs,
        int offset, int length, long timeout, TimeUnit unit,
        A attachment, CompletionHandler<Long, ? super A> handler);
}
\`\`\`

其中的 read/write 方法，有的会返回一个 Future 对象，有的需要传入一个 CompletionHandler 对象——后者会在读取/写入执行完成后，直接回调该对象当中的方法。

对于 AsynchronousSocketChannel 而言，Windows 和 Linux 上的实现类是不一样的：
- Windows 上，AIO 的实现通过 IOCP 完成，实现类是 WindowsAsynchronousSocketChannelImpl，实现的接口是 Iocp.OverlappedChannel；
- Linux 上，实现类是 UnixAsynchronousSocketChannelImpl，实现的接口是 Port.PollableChannel。

AIO 是一种接口标准，各家操作系统可以实现也可以不实现。高并发场景下最好采用操作系统推荐的方式。Linux 上还没有真正实现网络方式的 AIO。`;

// --- BIO：编程模型图转文字，修复 OCR 代码 ---
const bioContent = `## 传统 BIO 模型

BIO 是同步阻塞式 IO。通常在 while 循环中，服务端调用 accept 方法等待接收客户端的连接请求，一旦接收到一个连接请求，就可以建立通信套接字，在这个通信套接字上进行读写操作；此时不能再接收其他客户端连接请求，只能等待当前连接的客户端操作执行完成。

如果 BIO 要能够同时处理多个客户端请求，就必须使用多线程：每次 accept 阻塞等待来自客户端的请求，一旦收到连接请求就建立通信套接字，同时开启一个新的线程来处理这个套接字的数据读写请求，然后立刻又继续 accept 等待其他客户端连接请求——即为每一个客户端连接请求都创建一个线程来单独处理。

【图解：传统 BIO 编程模型】
多个 Client 连接到 Server 中的 Acceptor；Acceptor 为每个客户端连接分配一个 Thread，每个线程内对该连接依次执行 read → decode → compute → encode → send 的完整处理链；这些工作线程由 ThreadPool（线程池）统一管理。

传统 BIO 方式下的编程模型代码大致如下：

\`\`\`java
public static void main(String[] args) throws IOException {
    ExecutorService executor = Executors.newFixedThreadPool(128);

    ServerSocket serverSocket = new ServerSocket();
    serverSocket.bind(new InetSocketAddress(1234));
    // 循环等待新连接
    while (true) {
        Socket socket = serverSocket.accept();
        // 为新的连接创建线程执行任务
        executor.submit(new ConnectionTask(socket));
    }
}

class ConnectionTask extends Thread {
    private Socket socket;

    public ConnectionTask(Socket socket) {
        this.socket = socket;
    }

    public void run() {
        while (true) {
            InputStream inputStream = null;
            OutputStream outputStream = null;
            try {
                inputStream = socket.getInputStream();
                // read from socket...
                inputStream.read();

                outputStream = socket.getOutputStream();
                // write to socket...
                outputStream.write();
            } catch (IOException e) {
                e.printStackTrace();
            } finally {
                // 关闭资源...
            }
        }
    }
}
\`\`\`

这里之所以使用多线程，是因为 socket.accept()、inputStream.read()、outputStream.write() 都是同步阻塞的：当一个连接在处理 I/O 的时候，系统是阻塞的，如果是单线程的话，阻塞期间不能接受任何请求。使用多线程，就可以让 CPU 去处理更多的事情。这其实也是所有使用多线程的本质：
- 利用多核；
- 当 I/O 阻塞系统但 CPU 空闲的时候，利用多线程使用 CPU 资源。

使用线程池能够让线程的创建和回收成本相对较低。在活动连接数不是特别高（小于单机 1000）的情况下，这种模型是比较不错的：可以让每一个连接专注于自己的 I/O，编程模型简单，也不用过多考虑系统的过载、限流等问题，线程池可以缓冲一些过多的连接或请求。

但这个模型最本质的问题在于严重依赖线程，而线程是很"贵"的资源，主要表现在：

1. 线程的创建和销毁成本很高。在 Linux 这样的操作系统中，线程本质上就是一个进程，创建和销毁都是重量级的系统函数；
2. 线程本身占用较大内存。像 Java 的线程栈一般至少分配 512K～1M 的空间，如果系统中的线程数过千，恐怕整个 JVM 的内存都会被吃掉一半；
3. 线程的切换成本很高。操作系统发生线程切换时需要保留线程上下文，然后执行系统调用。如果线程数过高，线程切换的时间甚至会大于线程执行的时间，往往表现为系统 load 偏高、CPU sy 使用率特别高（超过 20% 以上），系统几乎陷入不可用状态；
4. 容易造成锯齿状的系统负载。系统负载与活动线程数或 CPU 核心数相关，一旦线程数量高而外部网络环境不稳定，很容易造成大量请求的结果同时返回，激活大量阻塞线程，使系统负载压力过大。

所以，当面对十万甚至百万级连接的时候，传统的 BIO 模型是无能为力的。随着移动端应用的兴起和各种网络游戏的盛行，百万级长连接日趋普遍，此时必然需要一种更高效的 I/O 处理模型。`;

// --- NIO 实现原理：模型图转文字，修复断裂代码 ---
const nioPrincipleContent = `## NIO 的实现原理

NIO 本身是基于事件驱动思想来完成的，主要想解决的是 BIO 的大并发问题。在使用同步 I/O 的网络应用中，如果要同时处理多个客户端请求，或客户端要同时和多个服务器通讯，就必须使用多线程，将每一个客户端请求分配给一个线程单独处理。但每创建一个线程，就要为它分配一定的内存空间（工作存储器），且操作系统对线程总数也有限制。客户端请求过多时，服务端可能不堪重负而拒绝请求，甚至瘫痪。

NIO 基于 Reactor：当 socket 有流可读或可写入时，操作系统会相应地通知应用程序进行处理，应用再将流读取到缓冲区或写入操作系统。

也就是说，不再是一个连接对应一个处理线程，而是有效的请求对应一个线程；连接没有数据时，没有工作线程来处理。

NIO 服务端代码（新建连接）：

\`\`\`java
// 获取一个 ServerSocket 通道
ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.configureBlocking(false);
serverChannel.socket().bind(new InetSocketAddress(port));
// 获取通道管理器（选择器）
selector = Selector.open();
// 将通道管理器与通道绑定，并为该通道注册 SelectionKey.OP_ACCEPT 事件
serverChannel.register(selector, SelectionKey.OP_ACCEPT);
\`\`\`

NIO 服务端代码（监听）：

\`\`\`java
while (true) {
    // 当有注册的事件到达时，方法返回，否则阻塞
    selector.select();
    for (SelectionKey key : selector.selectedKeys()) {
        if (key.isAcceptable()) {
            // 处理新接入的连接
            ServerSocketChannel server = (ServerSocketChannel) key.channel();
            SocketChannel channel = server.accept();
            channel.write(ByteBuffer.wrap(new String("send message to client").getBytes()));
            // 在与客户端连接成功后，为客户端通道注册 SelectionKey.OP_READ 事件
            channel.register(selector, SelectionKey.OP_READ);
        } else if (key.isReadable()) {
            // 有可读数据事件
            SocketChannel channel = (SocketChannel) key.channel();
            ByteBuffer buffer = ByteBuffer.allocate(10);
            int read = channel.read(buffer);
            byte[] data = buffer.array();
            String message = new String(data);
            System.out.println("receive message from client, size:" + buffer.position() + " msg: " + message);
        }
    }
}
\`\`\`

【图解：NIO 模型示例】
多个 Client 连接到 Server 中的 Acceptor；Acceptor 为每个连接创建一个 Channel；所有 Channel 都注册到同一个 Selector 上，由 Selector 统一监听各 Channel 的就绪事件；某个 Channel 就绪时，Selector 将事件交给 process 处理链（read → decode → compute → encode → send）。与 BIO 不同，一个 Selector 配合单线程即可管理多个连接。

NIO 模型的工作流程：
- Acceptor 注册 Selector，监听 accept 事件；
- 当客户端连接后，触发 accept 事件；
- 服务器构建对应的 Channel，并在其上注册 Selector，监听读写事件；
- 当发生读写事件后，进行相应的读写处理。`;

// --- 零拷贝：5 张图转文字 ---
const zeroCopyContent = `## Zero Copy

许多 web 应用都会向用户提供大量的静态内容，这意味着有很多数据从硬盘读出之后，会原封不动地通过 socket 传输给用户。

这种操作看起来可能不怎么消耗 CPU，但实际上它是低效的：
1. kernel 把数据从 disk 读出；
2. 将数据传输给 application；
3. application 再次把同样的内容传回给处于 kernel 级的 socket。

这种场景下，application 实际上只是作为一种低效的中间介质，用来把磁盘文件的数据传给 socket。数据每次传输都会经过 user 和 kernel 空间被 copy，这会消耗 CPU，并占用 RAM 的带宽。

## 传统的数据传输方式

从文件读取数据然后通过网络传输给其他程序，核心操作就是如下两个调用：

\`\`\`java
File.read(fileDesc, buf, len);
Socket.send(socket, buf, len);
\`\`\`

看上去只有两个简单的调用，但其内部过程要经历四次用户态和内核态的切换，以及四次数据复制操作。

【图解：传统方式的数据复制路径（共 4 次复制）】
以「用户态 Application context / 内核态 Kernel context」的分界为界：
磁盘 Disk →（1 DMA copy）→ 内核 Read buffer →（2 CPU copy）→ 用户 Application buffer →（3 CPU copy）→ 内核 Socket buffer →（4 DMA copy）→ 网卡 NIC buffer。
其中第 2、3 两次 CPU 复制完全由应用程序"中转"，纯属多余。

【图解：传统方式的用户态/内核态切换（共 4 次）】
时间线上 U = 用户态（User context），K = 内核态（Kernel context）：
Before read（用户态）→ 上下文切换 → Syscall read（内核态）→ 切回用户态 → Before send → 上下文切换 → Syscall write（内核态）→ 切回用户态 → Next cycle。
read() 和 send() 各引起两次用户态/内核态切换，合计 4 次。

步骤如下：
1. read() 的调用引起从用户态到内核态的切换，内部通过 sys_read()（或类似方法）发起对文件数据的读取。第一次复制通过 DMA（直接内存访问）将磁盘上的数据复制到内核空间的缓冲区中；
2. 数据从内核空间的缓冲区复制到用户空间的缓冲区后，read() 返回，内核态又切换回用户态，此时数据已复制到用户地址空间的缓存中；
3. socket 的 send() 调用又引起用户态到内核态的切换，第三次复制将数据从用户空间缓冲区复制到内核空间中与目标 socket 关联的缓冲区；
4. send() 系统调用返回，产生第四次用户态/内核态切换。随后 DMA 异步地将内核缓冲区中的数据传输到协议引擎发送到网络，完成第四次复制。

## Zero Copy 的数据传输方式

java.nio.channels.FileChannel 中定义了两个方法：transferTo() 和 transferFrom()。它们允许将一个通道直接连接到另一个通道，而不需要通过中间缓冲区传递数据。只有 FileChannel 类有这两个方法，因此 channel-to-channel 传输中必须有一方是 FileChannel。不能在 socket 通道之间直接传输数据，不过 socket 通道实现了 WritableByteChannel 和 ReadableByteChannel 接口，所以文件内容可以用 transferTo() 传输给 socket 通道，也可以用 transferFrom() 将数据从 socket 通道直接读入文件。

transferTo() 可以把字节直接从调用它的 channel 传输到另一个 WritableByteChannel，中间不经过应用程序：

\`\`\`java
public abstract long transferTo(long position, long count, WritableByteChannel target) throws IOException;
\`\`\`

【图解：transferTo() 的数据复制路径（3 次复制）】
transferTo() 调用直接进入内核完成传输：
磁盘 Disk →（1 DMA copy）→ 内核 Read buffer →（2 CPU copy）→ 内核 Socket buffer →（3 DMA copy）→ 网卡 NIC buffer。
数据不再经过用户空间（没有 Application buffer 这一站）。

【图解：transferTo() 的用户态/内核态切换（2 次）】
Before transferTo()（用户态）→ 上下文切换 → Syscall read and send（内核态，一次性完成读和发）→ 切回用户态 Next cycle。
用户态/内核态切换从 4 次减为 2 次，数据复制从 4 次减为 3 次（只有 1 次用到 CPU）。

使用 transferTo() 方式所经历的步骤：
1. transferTo 调用引起 DMA 将文件内容复制到读缓冲区（内核空间缓冲区），然后数据从这个缓冲区复制到另一个与 socket 输出相关的内核缓冲区；
2. 第三次复制由 DMA 把 socket 关联缓冲区中的数据复制到协议引擎，发送到网络。

这次改善把内核/用户态切换次数从 4 次减少到 2 次，数据复制次数从 4 次减少到 3 次（只有一次用到 CPU 资源），但还没达到零复制的目标。如果底层网络适配器支持收集（gather）操作，可以进一步减少内核对数据的复制次数。在内核 2.4 及以上的 Linux 系统上，socket 缓冲区描述符可用来满足这个需求：不仅减少了内核/用户态切换，还省去了那次需要 CPU 参与的复制。从用户角度看依旧调用 transferTo()，但本质发生了变化：
1. 调用 transferTo 后，数据被 DMA 从文件复制到内核的一个缓冲区中；
2. 数据不再被复制到 socket 关联的缓冲区，仅仅是将一个描述符（包含数据的位置和长度等信息）追加到 socket 关联的缓冲区中；DMA 直接把内核缓冲区中的数据传输给协议引擎，消除了仅剩的一次需要 CPU 周期的数据复制。

【图解：带 gather 的零拷贝（0 次 CPU 拷贝）】
磁盘 Disk →（1 DMA copy）→ 内核 Read buffer；内核只把一个 Descriptor（数据位置与长度的描述符）追加到 Socket buffer，数据本身不拷贝；随后由 DMA 直接把 Read buffer 中的数据传输到网卡 NIC buffer。全程只有 DMA 拷贝，没有任何 CPU 拷贝。`;

// --- Reactor 三节点：图转文字，修复 OCR 代码 ---
const reactorSingleContent = `## Reactor 单线程模型

这是最简单的单 Reactor 单线程模型。Reactor 线程负责多路分离套接字、accept 新连接，并分派请求到处理器链中。该模型适用于处理器链中业务处理组件能快速完成的场景。不过，这种单线程模型不能充分利用多核资源，所以实际使用的不多。

【图解：Reactor 单线程模型】
多个 Client 连接到 Server 的 Acceptor；Acceptor 建立的多个 Channel 全部注册到同一个 Reactor（一个线程上的 Selector）；Reactor 监听到事件后分发给对应的 Handler，每个 Handler 串行完成 read → decode → compute → encode → send。accept、IO 读写、业务处理全部在同一个线程中完成。

这个模型和 NIO 流程很类似，只是将消息相关处理独立到了 Handler 中。代码实现如下：

\`\`\`java
public class Reactor implements Runnable {

    final Selector selector;
    final ServerSocketChannel serverSocketChannel;

    public static void main(String[] args) throws IOException {
        new Thread(new Reactor(1234)).start();
    }

    public Reactor(int port) throws IOException {
        selector = Selector.open();
        serverSocketChannel = ServerSocketChannel.open();
        serverSocketChannel.socket().bind(new InetSocketAddress(port));
        serverSocketChannel.configureBlocking(false);
        SelectionKey key = serverSocketChannel.register(selector, SelectionKey.OP_ACCEPT);
        key.attach(new Acceptor());
    }

    @Override
    public void run() {
        while (!Thread.interrupted()) {
            try {
                selector.select();
                Set<SelectionKey> selectionKeys = selector.selectedKeys();
                for (SelectionKey selectionKey : selectionKeys) {
                    dispatch(selectionKey);
                }
                selectionKeys.clear();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private void dispatch(SelectionKey selectionKey) {
        Runnable run = (Runnable) selectionKey.attachment();
        if (run != null) {
            run.run();
        }
    }

    class Acceptor implements Runnable {
        @Override
        public void run() {
            try {
                SocketChannel channel = serverSocketChannel.accept();
                if (channel != null) {
                    new Handler(selector, channel);
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
\`\`\`

\`\`\`java
class Handler implements Runnable {

    private final static int DEFAULT_SIZE = 1024;

    private final SocketChannel socketChannel;
    private final SelectionKey selectionKey;

    private static final int READING = 0;
    private static final int SENDING = 1;

    private int state = READING;

    ByteBuffer inputBuffer = ByteBuffer.allocate(DEFAULT_SIZE);
    ByteBuffer outputBuffer = ByteBuffer.allocate(DEFAULT_SIZE);

    public Handler(Selector selector, SocketChannel channel) throws IOException {
        this.socketChannel = channel;
        socketChannel.configureBlocking(false);
        this.selectionKey = socketChannel.register(selector, 0);
        selectionKey.attach(this);
        selectionKey.interestOps(SelectionKey.OP_READ);
        selector.wakeup();
    }

    @Override
    public void run() {
        if (state == READING) {
            read();
        } else if (state == SENDING) {
            write();
        }
    }

    class Sender implements Runnable {
        @Override
        public void run() {
            try {
                socketChannel.write(outputBuffer);
            } catch (IOException e) {
                e.printStackTrace();
            }
            if (outIsComplete()) {
                selectionKey.cancel();
            }
        }
    }

    private void write() {
        try {
            socketChannel.write(outputBuffer);
        } catch (IOException e) {
            e.printStackTrace();
        }
        if (outIsComplete()) {
            selectionKey.cancel();
        }
    }

    private void read() {
        try {
            socketChannel.read(inputBuffer);
            if (inputIsComplete()) {
                process();
                System.out.println("接到来自客户端（" + socketChannel.socket().getInetAddress().getHostAddress() + ")的消息：" + new String(inputBuffer.array()));
                selectionKey.attach(new Sender());
                selectionKey.interestOps(SelectionKey.OP_WRITE);
                selectionKey.selector().wakeup();
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public boolean inputIsComplete() {
        return true;
    }

    public boolean outIsComplete() {
        return true;
    }

    public void process() {
        // do something...
    }
}
\`\`\`

虽然 NIO 一个线程就可以支持所有的 IO 处理，但瓶颈也是显而易见的：如果某个客户端多次进行请求，而 Handler 中的处理速度较慢，后续的客户端请求都会被积压，导致响应变慢。所以引入了 Reactor 多线程模型。`;

const reactorMultiContent = `## Reactor 多线程模型

相比单线程模型，该模型在处理器链部分采用了多线程（线程池）。

【图解：Reactor 多线程模型】
Acceptor → 多个 Channel → Reactor 仍然负责监听事件，并只完成 read / send 这两个 IO 操作；decode → compute → encode 等非 IO 的业务处理交给 WorkThreadPool（工作线程池）中的一组 Handler 完成。IO 线程与工作线程分离，客户端请求直接进入线程池，发送请求不会堵塞。

Reactor 多线程模型就是将 Handler 中的 IO 操作和非 IO 操作分开：操作 IO 的线程称为 IO 线程，非 IO 操作的线程称为工作线程。可以将 Handler 做如下修改：

\`\`\`java
class Handler implements Runnable {

    private final static int DEFAULT_SIZE = 1024;

    private final SocketChannel socketChannel;
    private final SelectionKey selectionKey;

    private static final int READING = 0;
    private static final int SENDING = 1;
    private static final int PROCESSING = 3;

    private int state = READING;

    ByteBuffer inputBuffer = ByteBuffer.allocate(DEFAULT_SIZE);
    ByteBuffer outputBuffer = ByteBuffer.allocate(DEFAULT_SIZE);

    private Selector selector;

    private static ExecutorService executorService =
        Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());

    public Handler(Selector selector, SocketChannel channel) throws IOException {
        this.selector = selector;
        this.socketChannel = channel;
        socketChannel.configureBlocking(false);
        this.selectionKey = socketChannel.register(selector, 0);
        selectionKey.attach(this);
        selectionKey.interestOps(SelectionKey.OP_READ);
        selector.wakeup();
    }

    @Override
    public void run() {
        if (state == READING) {
            read();
        } else if (state == SENDING) {
            write();
        }
    }

    class Sender implements Runnable {
        @Override
        public void run() {
            try {
                socketChannel.write(outputBuffer);
            } catch (IOException e) {
                e.printStackTrace();
            }
            if (outIsComplete()) {
                selectionKey.cancel();
            }
        }
    }

    private void write() {
        try {
            socketChannel.write(outputBuffer);
        } catch (IOException e) {
            e.printStackTrace();
        }
        if (outIsComplete()) {
            selectionKey.cancel();
        }
    }

    private void read() {
        try {
            socketChannel.read(inputBuffer);
            if (inputIsComplete()) {
                process();
                executorService.execute(new Processor());
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public boolean inputIsComplete() {
        return true;
    }

    public boolean outIsComplete() {
        return true;
    }

    public void process() {
        // do something...
    }

    synchronized void processAndHandOff() {
        process();
        state = SENDING; // or rebind attachment
        selectionKey.interestOps(SelectionKey.OP_WRITE);
        selector.wakeup();
    }

    class Processor implements Runnable {
        public void run() {
            processAndHandOff();
        }
    }
}
\`\`\`

但当用户进一步增加的时候，Reactor 会出现瓶颈，因为 Reactor 既要处理 IO 操作请求，又要响应连接请求。为了分担 Reactor 的负担，引入了主从 Reactor 模型。`;

const reactorMasterSlaveContent = `## 主从 Reactor 多线程模型

主从 Reactor 多线程模型是将 Reactor 分成两部分：mainReactor 负责监听 server socket、accept 新连接，并将建立的 socket 分派给 subReactor；subReactor 负责多路分离已连接的 socket、读写网络数据，业务处理扔给 worker 线程池完成。通常 subReactor 的个数可与 CPU 个数等同。

【图解：主从 Reactor 多线程模型】
多个 Client 连接到 Acceptor → Acceptor 交给 MainReactor（主 Reactor，只负责 accept 新连接）→ 新连接被注册为多个 Channel 并分派给 SubReactor（从 Reactor，负责已连接 Channel 的读写事件）→ SubReactor 完成 read / send，decode → compute → encode 业务处理交给 WorkThreadPool。主 Reactor 响应连接请求，从 Reactor 处理 IO 操作请求。

这时可以把 Reactor 做如下修改：

\`\`\`java
public class Reactor {

    final ServerSocketChannel serverSocketChannel;

    Selector[] selectors; // also create threads
    AtomicInteger next = new AtomicInteger(0);
    ExecutorService subReactors =
        Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors());

    public static void main(String[] args) throws IOException {
        new Reactor(1234);
    }

    public Reactor(int port) throws IOException {
        serverSocketChannel = ServerSocketChannel.open();
        serverSocketChannel.socket().bind(new InetSocketAddress(port));
        serverSocketChannel.configureBlocking(false);
        selectors = new Selector[4];
        for (int i = 0; i < 4; i++) {
            Selector selector = Selector.open();
            selectors[i] = selector;
            SelectionKey key = serverSocketChannel.register(selector, SelectionKey.OP_ACCEPT);
            key.attach(new Acceptor());
            new Thread(() -> {
                while (!Thread.interrupted()) {
                    try {
                        selector.select();
                        Set<SelectionKey> selectionKeys = selector.selectedKeys();
                        for (SelectionKey selectionKey : selectionKeys) {
                            dispatch(selectionKey);
                        }
                        selectionKeys.clear();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }).start();
        }
    }

    private void dispatch(SelectionKey selectionKey) {
        Runnable run = (Runnable) selectionKey.attachment();
        if (run != null) {
            run.run();
        }
    }

    class Acceptor implements Runnable {
        @Override
        public void run() {
            try {
                SocketChannel connection = serverSocketChannel.accept();
                if (connection != null)
                    subReactors.execute(new Handler(selectors[next.getAndIncrement() % selectors.length], connection));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
\`\`\`

可见，主 Reactor 用于响应连接请求，从 Reactor 用于处理 IO 操作请求。`;

// --- NIO 三大组件概览：3 张图转文字，重写收尾 ---
const nioOverviewContent = `NIO 主要有三大核心部分：Channel（通道）、Buffer（缓冲区）、Selector（选择器）。传统 IO 基于字节流和字符流进行操作，而 NIO 基于 Channel 和 Buffer 进行操作，数据总是从通道读取到缓冲区中，或者从缓冲区写入到通道中。Selector 用于监听多个通道的事件（比如：连接打开、数据到达），因此单个线程可以监听多个数据通道。

【图解：java.nio 包结构】
- channels 包：Channels、DatagramChannel、FileChannel、FileLock、Pipe、SelectionKey、Selector、ServerSocketChannel、SocketChannel
- charset 包：Charset、CharsetDecoder、CharsetEncoder、CoderResult、CodingErrorAction
- Buffer 体系：ByteBuffer、CharBuffer、DoubleBuffer、FloatBuffer、IntBuffer、LongBuffer、ShortBuffer
- 其他顶层类型：ByteOrder、MappedByteBuffer

NIO 和传统 IO 之间第一个最大的区别是：IO 是面向流的，NIO 是面向缓冲区的。

## NIO 的缓冲区

Java IO 面向流，意味着每次从流中读一个或多个字节，直至读取所有字节，它们没有被缓存在任何地方，此外不能前后移动流中的数据；如果需要前后移动从流中读取的数据，需要先将它缓存到一个缓冲区。NIO 的缓冲导向方法不同：数据被读取到一个稍后处理的缓冲区，需要时可在缓冲区中前后移动，这增加了处理过程的灵活性。但是，还需要检查该缓冲区中是否包含所有需要处理的数据，并确保当更多数据读入缓冲区时，不要覆盖缓冲区里尚未处理的数据。

## NIO 的非阻塞

IO 的各种流是阻塞的：当一个线程调用 read() 或 write() 时，该线程被阻塞，直到有数据被读取或数据完全写入，期间不能再做任何事情。NIO 的非阻塞模式使一个线程从某通道发送请求读取数据，但它只能得到目前可用的数据——如果目前没有数据可用，就什么都不会获取，线程并不会保持阻塞，可以继续做其他事情。非阻塞写也是如此：一个线程请求写入一些数据到某通道，但不需要等待它完全写入，这个线程同时可以去做别的事情。线程通常将非阻塞 IO 的空闲时间用于在其它通道上执行 IO 操作，所以一个单独的线程现在可以管理多个输入和输出通道（channel）。

## Channel

Channel 国内大多翻译成"通道"。Channel 和 IO 中的 Stream（流）差不多是一个等级的，只不过 Stream 是单向的（譬如 InputStream、OutputStream），而 Channel 是双向的，既可以用来进行读操作，又可以用来进行写操作。

NIO 中的 Channel 的主要实现有：
1. FileChannel —— 对应文件 IO；
2. DatagramChannel —— 对应 UDP；
3. SocketChannel —— 对应 TCP 客户端；
4. ServerSocketChannel —— 对应 TCP 服务端。

## Buffer

Buffer，顾名思义，缓冲区，实际上是一个容器，是一个连续数组。Channel 提供从文件、网络读取数据的渠道，但读取或写入的数据都必须经由 Buffer。

【图解：NIO 数据传输路径】
客户端发送数据：数据先写入客户端侧 Buffer → Buffer 的内容写入 Channel → 经网络到达服务端 Channel → 服务端 Channel 将数据读入服务端侧 Buffer → 服务端从 Buffer 中取出数据来处理。数据总是经由 Buffer 在 Channel 之间传输。

在 NIO 中，Buffer 是一个顶层父类（抽象类），常用的 Buffer 子类有：ByteBuffer、IntBuffer、CharBuffer、LongBuffer、DoubleBuffer、FloatBuffer、ShortBuffer。

## Selector

Selector 类是 NIO 的核心类。Selector 能够检测多个注册的通道上是否有事件发生，如果有事件发生，便获取事件然后针对每个事件进行相应的响应处理。这样一来，只用一个单线程就可以管理多个通道，也就是管理多个连接。只有在连接真正有读写事件发生时才会调用函数来进行读写，大大减少了系统开销，并且不必为每个连接都创建一个线程、维护多个线程，避免了多线程之间上下文切换的开销。

【图解：Java NIO 网络模型】
多个 Client Socket 分别对应一个 SocketChannel；每个 SocketChannel 都"注册"到同一个 Selector 上；Selector 统一监听所有通道的事件，事件发生后交给 Handle Process Thread 处理。`;

// --- SocketChannel / ServerSocketChannel：补全被截断的非阻塞内容 ---
const socketChannelAppendix = `

## 非阻塞模式

可以设置 SocketChannel 为非阻塞模式（non-blocking mode）。设置之后，就可以在异步模式下调用 connect()、read() 和 write() 了。

【connect()】
如果 SocketChannel 在非阻塞模式下调用 connect()，该方法可能在连接建立之前就返回了。为了确定连接是否建立，可以调用 finishConnect() 方法：

\`\`\`java
socketChannel.configureBlocking(false);
socketChannel.connect(new InetSocketAddress("jenkov.com", 80));
while (!socketChannel.finishConnect()) {
    // wait, or do something else...
}
\`\`\`

【write()】
非阻塞模式下，write() 方法在尚未写出任何内容时可能就返回了，所以需要在循环中调用 write()。

【read()】
非阻塞模式下，read() 方法在尚未读取到任何数据时可能就返回了，所以需要关注它的 int 返回值，它会告诉你读取了多少字节。

【非阻塞模式与选择器】
非阻塞模式与选择器搭配会工作得更好：将一或多个 SocketChannel 注册到 Selector，就可以询问选择器哪个通道已经准备好了读取、写入等。
`;

const serverSocketChannelAppendix = `

## 监听新进来的连接

通过 ServerSocketChannel.accept() 方法监听新进来的连接。当 accept() 方法返回时，它返回一个包含新进来的连接的 SocketChannel，因此 accept() 会一直阻塞到有新连接到达。通常不会仅仅只监听一个连接，而是在 while 循环中调用 accept()：

\`\`\`java
while (true) {
    SocketChannel socketChannel = serverSocketChannel.accept();
    // do something with socketChannel...
}
\`\`\`

当然，也可以在 while 循环中使用 true 以外的其它退出准则。

## 非阻塞模式

ServerSocketChannel 可以设置成非阻塞模式。在非阻塞模式下，accept() 方法会立刻返回：如果还没有新进来的连接，返回的将是 null，因此需要检查返回的 SocketChannel 是否是 null：

\`\`\`java
ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();
serverSocketChannel.socket().bind(new InetSocketAddress(9999));
serverSocketChannel.configureBlocking(false);
while (true) {
    SocketChannel socketChannel = serverSocketChannel.accept();
    if (socketChannel != null) {
        // do something with socketChannel...
    }
}
\`\`\`
`;

// ========== 工具函数 ==========

function readJson(name) { return JSON.parse(readFileSync(join(DATA, name), 'utf8')); }
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function setTabs(pool, nodeId, content, tabLabel) {
  const node = pool[nodeId];
  if (!node) throw new Error(`node not found: ${nodeId}`);
  node.card = { ...(node.card ?? {}), nodeId, title: node.card?.title ?? node.label, tabs: [{ id: 'main', label: tabLabel ?? node.card?.tabs?.[0]?.label ?? '说明', content }] };
}

// ========== 主流程 ==========

const pool = readJson('node-pool.json');
const tree = readJson('tree-data.json');
let edges = readJson('knowledge-edges.json');
const questions = readJson('questions.json');
const edgeList = Array.isArray(edges) ? edges : edges.edges;

// --- A1. 图片转文字 + 内容修复 ---
setTabs(pool, 'k_io_model_classification', modelClassificationContent, 'IO模型分类');
setTabs(pool, 'k_io_aio_model', aioContent, 'AIO（异步IO）模型');
setTabs(pool, 'k_io_bio_model', bioContent, 'BIO（阻塞IO）模型');
setTabs(pool, 'k_io_nio_principle', nioPrincipleContent, 'NIO实现原理');
setTabs(pool, 'k_io_zero_copy', zeroCopyContent, '零拷贝（Zero Copy）');
setTabs(pool, 'k_reactor_single_thread', reactorSingleContent, 'Reactor单线程模型');
setTabs(pool, 'k_reactor_multi_thread', reactorMultiContent, 'Reactor多线程模型');
setTabs(pool, 'k_reactor_master_slave', reactorMasterSlaveContent, '主从Reactor多线程模型');
setTabs(pool, 'k_nio_overview', nioOverviewContent, 'NIO三大组件概览');

// SocketChannel / ServerSocketChannel：保留原有教程正文，补全被截断的章节
const socketChannelNode = pool['k_nio_socket_channel'];
const brokenConnect = 'socketChannel.connect(`new InetSocketAddress(``http://jenkov.com``, `80`));';
const socketContent = socketChannelNode.card.tabs[0].content;
if (!socketContent.includes(brokenConnect)) throw new Error('SocketChannel OCR connect 语句未找到，请检查内容');
socketChannelNode.card.tabs[0].content = socketContent.replace(brokenConnect, 'socketChannel.connect(new InetSocketAddress("jenkov.com", 80));') + socketChannelAppendix;
const serverSocketChannelNode = pool['k_nio_server_socket_channel'];
serverSocketChannelNode.card.tabs[0].content += serverSocketChannelAppendix;

// select与epoll：修复 OCR 笔误
const selectEpoll = pool['k_io_select_epoll'];
selectEpoll.card.tabs[0].content = selectEpoll.card.tabs[0].content.replace('在selec中采用轮询处理', '在 select 中采用轮询处理');

// --- A2. 校验：IO/NIO 节点中不允许再残留远程图片链接 ---
const fusionRoot = findTreeNode(tree, 'tree_java_io_nio');
const fusionRefs = [];
walk(fusionRoot, (n) => { if (n.nodeRef) fusionRefs.push(n.nodeRef); });
let leftoverImages = 0;
for (const ref of fusionRefs) {
  for (const tab of pool[ref].card?.tabs ?? []) {
    const m = String(tab.content ?? '').match(/!\[[^\]]*\]\(([^)]+)\)/g) ?? [];
    if (m.length) { leftoverImages += m.length; console.warn('WARN image left in', ref, tab.id); }
  }
}
if (leftoverImages > 0) throw new Error(`still ${leftoverImages} image(s) left in fusion nodes`);

// --- B1. 删除旧「java / IO 与 NIO」子树 ---
const OLD_IO_ROOT_REF = 'k_1786353277269_msn0ma8m1';
const OLD_IO_TREE_IDS = new Set([
  'tree_1786353277269_msn0ma8n2', 'tree_1786353277269_msn0ma8p4',
  'tree_1786353277269_msn0ma8r6', 'tree_1786353277269_msn0ma8t8',
  'tree_1786348437523_e9neyj',
]);
const OLD_IO_NODE_IDS = ['k_1786353277269_msn0ma8m1', 'k_1786353277269_msn0ma8o3', 'k_1786353277269_msn0ma8q5', 'k_1786353277269_msn0ma8s7', 'k_1786348437198_hkf3yz'];

// --- B2. 删除「常用类库 / IO流与文件」子树（内容已被新树覆盖） ---
const STREAM_FILE_TREE_IDS = new Set([
  'tree_java_io_stream_file', 'tree_java_io_byte_stream', 'tree_java_io_char_stream',
  'tree_java_io_file_class', 'tree_java_io_console',
]);
const STREAM_FILE_NODE_IDS = ['k_java_io_stream_file', 'k_java_io_byte_stream', 'k_java_io_char_stream', 'k_java_io_file_class', 'k_java_io_console'];

const removedTreeIds = new Set([...OLD_IO_TREE_IDS, ...STREAM_FILE_TREE_IDS]);
const removedNodeIds = new Set([...OLD_IO_NODE_IDS, ...STREAM_FILE_NODE_IDS]);

let removedTreeEntries = 0;
function pruneTree(node) {
  if (!node.children) return;
  const before = node.children.length;
  node.children = node.children.filter((c) => !removedTreeIds.has(c.id));
  removedTreeEntries += before - node.children.length;
  for (const c of node.children) pruneTree(c);
}
pruneTree(tree);

// --- B3. 删除 pool 条目 ---
let removedPool = 0;
for (const id of removedNodeIds) {
  if (pool[id]) { delete pool[id]; removedPool++; }
}

// --- B4. 清理/改挂知识边 ---
const removedNodeIdSet = removedNodeIds;
edges = edgeList.filter((e) => {
  if (removedTreeIds.has(e.source) || removedTreeIds.has(e.target)) return false;
  // treebind 边以 treeId 书写在 id 中，可能 source/target 是 nodeRef，两个条件都要查
  const bindIds = String(e.id ?? '').split(':');
  if (bindIds.some((p) => removedTreeIds.has(p))) return false;
  if (removedNodeIdSet.has(e.source) || removedNodeIdSet.has(e.target)) return false;
  return true;
});
// 语义边重新挂到新树根 k_java_io_nio（保持「传统IO vs NIO.Files」「IO读取产生字符串」两条关系）
if (!edges.some((e) => e.id === 'edge_java_io_vs_nio_files')) {
  edges.push({ id: 'edge_java_io_vs_nio_files', source: 'k_java_io_nio', target: 'k_java_nio_file_files', type: 'contrasts-with', label: '传统IO vs NIO', dimensions: ['java'], relationKind: 'comparison' });
}
if (!edges.some((e) => e.id === 'edge_java_io_reads_string')) {
  edges.push({ id: 'edge_java_io_reads_string', source: 'k_java_io_nio', target: 'k_java_lang_string', type: 'produces', label: '读取产生字符串', dimensions: ['java'], relationKind: 'dependency' });
}

// --- C. questions 重映射到新树节点 ---
const questionRemap = {
  q_1786348739840_5ha5b2: 'k_io_model_classification', // BIO,NIO,AIO 有什么区别?
  q_1786353277269_msn0ma9x1c: 'k_byte_stream_group',   // java 中 IO 流分为几种?
  q_1786353277269_msn0mabj2y: 'k_nio_overview',        // 讲讲NIO
  q_1786353277269_msn0mabk2z: 'k_io_select_epoll',     // select和epoll的区别
  q_1786353277269_msn0mabn32: 'k_char_stream_group',   // 什么时候使用字节流、什么时候使用字符流
  q_1786353277269_msn0mabo33: 'k_char_stream_group',   // 字节流和字符流的主要区别
  q_1786353277269_msn0mag37i: 'k_nio_overview',        // NIO是什么？
};
let remappedQuestions = 0;
for (const q of questions) {
  if (questionRemap[q.id]) { q.relatedNodeId = questionRemap[q.id]; remappedQuestions++; }
}

// --- 收尾：维护受影响父节点的 count ---
const libTree = findTreeNode(tree, 'tree_java_common_libraries');
if (libTree) libTree.count = (libTree.children ?? []).length;

// --- 完整性校验（只针对本次改动的 IO/NIO 范围；全库存在少量历史遗留悬挂边，不做全局校验） ---
const problems = [];
walk(tree, (n) => {
  if (n.nodeRef && !pool[n.nodeRef]) problems.push(`tree node ${n.id} refs missing pool node ${n.nodeRef}`);
});
const removedAll = new Set([...removedNodeIds, ...removedTreeIds]);
for (const e of edges) {
  const sig = JSON.stringify([e.id, e.source, e.target]);
  for (const id of removedAll) {
    if (sig.includes(id)) problems.push(`edge ${e.id} still references removed ${id}`);
  }
}
if (!pool['k_java_io_nio'] || !pool['k_java_nio_file_files'] || !pool['k_java_lang_string']) problems.push('re-added edge endpoint missing in pool');
for (const q of questions) {
  if (q.relatedNodeId && !pool[q.relatedNodeId]) problems.push(`question ${q.id} refs missing node ${q.relatedNodeId}`);
}
if (problems.length) {
  problems.slice(0, 30).forEach((p) => console.error('PROBLEM:', p));
  throw new Error(`integrity check failed with ${problems.length} problem(s)`);
}

// --- 写回 ---
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('questions.json', questions);

console.log(`restructure-java-io-nio-final complete:
  - image->text: 18 images transcribed across 9 nodes (+2 channel nodes completed)
  - removed tree entries: ${removedTreeEntries} (old IO 与 NIO x5, IO流与文件 x5)
  - removed pool nodes: ${removedPool}
  - edges: ${edgeList.length} -> ${edges.length}
  - questions remapped: ${remappedQuestions}
  - 常用类库 children: ${libTree.children.length}`);
