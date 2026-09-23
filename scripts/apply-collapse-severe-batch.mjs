/**
 * apply-collapse-severe-batch.mjs — 塌行重症 5 卡批量精修（第 1 批）
 *
 * 依据 outputs/vault-collapse-scan 基线：塌行三信号 12 个分布于 11 卡，
 * 其中 6 卡（surge_bottleneck / skd×4 / ThreadLocal的使用）为假阳性
 * （label 后换行列表的合法排版 + title-prefix + dual-copy），渲染无损，并入第 2 批 dual-copy 处理。
 * 本批处理 5 张真重症：
 *
 *  A. k_1785224904396_r27gmm 作用域 —— mermaid 收尾栅栏与后续 4 段正文粘连（``` 定义一个 Bean…），
 *     代码块不闭合吞掉全文；粘连段=既有 4 个子 tab 内容（守恒可验）。root → 自含总述。
 *  B. k_1785415843679_72mpjo newFixedThreadPool —— 首段 OCR 散字（字间空格）+ 代码栅栏同行粘连；
 *     另含 3 处 OCR 错字（人任务→任务 / 池中国→池中 / 待着→带着），同属导入损伤，一并修复并逐条登记。
 *  C. k_vault_javajava_1xf3hv Java 网络编程（Socket）—— 6757 字塌行双份；干净 def tab 按 '## ' 切 6 节，
 *     两段单行 Java 代码重排为围栏代码块（逐 token 守恒），root → 自含总述。
 *  D. k_java_source_937c739517d0031f_s_package_c55daee2899f783b java.lang.reflect —— 首字符+反引号被吃
 *     （"ava.lang.reflect` 是…" → "`java.lang.reflect` 是…"），单点修复。
 *  E. k_wiki_en_monitor_synchronization_s12 阻塞条件变量 —— 机翻伪代码粗体边界胶着（**X****Y** 等 18 处），
 *     仅做渲染级解胶（并粗体/边界补空格），机翻语义（如 PC→「电脑」）不动，另案。
 *
 * 知识独立性口径：新撰写文本零跨节点指针（正则硬校验）。
 * 用法：node scripts/apply-collapse-severe-batch.mjs        # dry-run（默认）
 *       node scripts/apply-collapse-severe-batch.mjs --apply
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const APPLY = process.argv.includes('--apply')
const PTR_RE = /详见|见子节点|见「|参见|另见/

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}
const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }
const norm = (s) => (s ?? '').replace(/\s+/g, '')

console.log('══ 前置门 ══')
const pool = readJson('node-pool.json')
const poolKeys = Object.keys(pool).length
const cards = {}
for (const id of ['k_1785224904396_r27gmm', 'k_1785415843679_72mpjo', 'k_vault_javajava_1xf3hv', 'k_java_source_937c739517d0031f_s_package_c55daee2899f783b', 'k_wiki_en_monitor_synchronization_s12']) {
  cards[id] = pool[id]?.card
  ck(!!cards[id], `目标实体存在 ${id}`)
}
if (problems.length) { console.log(`\n⛔ 前置门中止`); process.exit(1) }

// ── A. 作用域 ──────────────────────────────────────────────
console.log('\n── A. 作用域（栅栏粘连 → 自含总述）──')
{
  const c = cards['k_1785224904396_r27gmm']
  const tabs = c.tabs ?? []
  const tab0 = tabs.find((t) => t.id === 'tab_1785224926740_rnnus4')
  ck(!!tab0, 'A: 主 tab（总述+图+mermaid）在位')
  ck(/^``` 定义一个 Bean 为/m.test(c.rootContent.split('```mermaid')[1] ?? ''), 'A: mermaid 收尾栅栏后正文粘连（病灶在位）')
  // 粘连 4 段 = 4 个子 tab（归一化逐字守恒）
  const pairs = [['tab_1785224926740_1pp2jh', '定义一个 Bean 为**多例**'], ['tab_1785224926740_ucbur1', '**request 作用域**'], ['tab_1785224926740_rwia4d', '**session 作用域**'], ['tab_1785224926740_etewsx', '**globalSession 作用域**']]
  for (const [tid, head] of pairs) {
    const t = tabs.find((x) => x.id === tid)
    ck(!!t && norm(c.rootContent).includes(norm(t.content)) && norm(t.content).startsWith(norm(head)), `A: 粘连段守恒于 ${tid}`)
  }
  const NEW_ROOT = '**Spring Bean 作用域**：在 Spring 配置中通过 **scope 属性**定义，可接受 **5 个内建值**——singleton（单例，默认，作用于 ApplicationContext 容器）、prototype（多例，每次 getBean 重新创建）、request / session / globalSession（Web 场景，作用于 WebApplicationContext）。'
  ck(!PTR_RE.test(NEW_ROOT), 'A: 新总述零指针')
  c.__new = { rootContent: NEW_ROOT } // tabs 不动
  console.log(`  摘要：root ${c.rootContent.length}→${NEW_ROOT.length} 字；tabs 7 个原样`)
}

// ── B. newFixedThreadPool ─────────────────────────────────
console.log('\n── B. newFixedThreadPool（OCR 散字 + 栅栏粘连 → 重排）──')
{
  const c = cards['k_1785415843679_72mpjo']
  ck((c.tabs ?? []).length === 0, 'B: 无 tab')
  ck(/F i x e d T h r e a d P o o l是 固 定 大 小/.test(c.rootContent), 'B: OCR 散字段落（病灶在位）')
  ck(c.rootContent.includes('```public static ExecutorService newFixedThreadPool(int nThreads) {'), 'B: 栅栏与代码同行（病灶在位）')
  const NEW_ROOT = [
    'FixedThreadPool 是固定大小的线程池，只有核心线程。每次提交一个任务就创建一个线程，直到线程达到线程池的最大大小。线程池的大小一旦达到最大值就会保持不变，如果某个线程因为执行异常而结束，那么线程池会补充一个新线程。FixedThreadPool 多数针对一些很稳定很固定的正规并发线程，多用于服务器。',
    '',
    '```java',
    'public static ExecutorService newFixedThreadPool(int nThreads) {',
    '    return new ThreadPoolExecutor(nThreads, nThreads, 0L, TimeUnit.MILLISECONDS,',
    '            new LinkedBlockingQueue<Runnable>());',
    '}',
    '```',
    '',
    '构建时，需要给 newFixedThreadPool 方法提供一个 nThreads 的属性，而这个属性其实就是当前线程池中线程的个数。当前线程池的本质其实就是使用 ThreadPoolExecutor。',
    '',
    '构建好当前线程池后，线程个数已经固定好  线程是懒加载，在构建之初，线程并没有构建出来，而是随着任务的提交才会将线程在线程池中构建出来。如果线程没构建，线程会带着任务执行被创建和执行。如果线程都已经构建好了，此时任务会被放到 LinkedBlockingQueue 无界队列中存放，等待线程从 LinkedBlockingQueue 中去 take 出任务，然后执行',
  ].join('\n')
  // 知识守恒（忽略空白）：新文本须含源文全部语句 token；OCR 错字 3 处为登记修复
  const src = norm(c.rootContent).replace(/```/g, '')
  const dst = norm(NEW_ROOT).replace(/```java|```/g, '')
  for (const fixed of [['人任务', '任务'], ['池中国', '池中'], ['待着', '带着']]) {
    ck(src.includes(fixed[0]) && !dst.includes(fixed[0]) && dst.includes(fixed[1]), `B: OCR 修复「${fixed[0]}→${fixed[1]}」已登记`)
  }
  const srcClean = src.replaceAll('人任务', '任务').replaceAll('池中国', '池中').replaceAll('待着', '带着')
  ck(srcClean === dst, 'B: 归一化后逐字守恒', `${srcClean.length} vs ${dst.length}`)
  ck(!PTR_RE.test(NEW_ROOT), 'B: 零指针')
  c.__new = { rootContent: NEW_ROOT }
  console.log(`  摘要：root ${c.rootContent.length}→${NEW_ROOT.length} 字`)
}

// ── D. java.lang.reflect ──────────────────────────────────
console.log('\n── D. java.lang.reflect（首字符+反引号被吃 → 单点修复）──')
{
  const c = cards['k_java_source_937c739517d0031f_s_package_c55daee2899f783b']
  const OLD = 'ava.lang.reflect` 是 Java 反射机制的核心包'
  ck(c.rootContent.startsWith(OLD), 'D: 残首前缀（病灶在位）', JSON.stringify(c.rootContent.slice(0, 30)))
  const NEW_ROOT = '`java.lang.reflect` 是 Java 反射机制的核心包' + c.rootContent.slice(OLD.length)
  ck(!PTR_RE.test(NEW_ROOT), 'D: 零指针')
  ck(NEW_ROOT.length - c.rootContent.length === 2, 'D: 仅增 2 字符（` + j）')
  c.__new = { rootContent: NEW_ROOT }
  console.log(`  摘要：root ${c.rootContent.length}→${NEW_ROOT.length} 字（仅首行）`)
}

// ── C. Java 网络编程（Socket）─────────────────────────────
console.log('\n── C. Java 网络编程（塌行双份 → 总述 + 6 tab，代码重排）──')
const CLIENT_JAVA = `// 文件名 GreetingClient.java
import java.net.*;
import java.io.*;

public class GreetingClient {
    public static void main(String[] args) {
        String serverName = args[0];
        int port = Integer.parseInt(args[1]);
        try {
            System.out.println("连接到主机：" + serverName + " ，端口号：" + port);
            Socket client = new Socket(serverName, port);
            System.out.println("远程主机地址：" + client.getRemoteSocketAddress());
            OutputStream outToServer = client.getOutputStream();
            DataOutputStream out = new DataOutputStream(outToServer);
            out.writeUTF("Hello from " + client.getLocalSocketAddress());
            InputStream inFromServer = client.getInputStream();
            DataInputStream in = new DataInputStream(inFromServer);
            System.out.println("服务器响应： " + in.readUTF());
            client.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}`
const SERVER_JAVA = `// 文件名 GreetingServer.java
import java.net.*;
import java.io.*;

public class GreetingServer extends Thread {
    private ServerSocket serverSocket;

    public GreetingServer(int port) throws IOException {
        serverSocket = new ServerSocket(port);
        serverSocket.setSoTimeout(10000);
    }

    public void run() {
        while (true) {
            try {
                System.out.println("等待远程连接，端口号为：" + serverSocket.getLocalPort() + "...");
                Socket server = serverSocket.accept();
                System.out.println("远程主机地址：" + server.getRemoteSocketAddress());
                DataInputStream in = new DataInputStream(server.getInputStream());
                System.out.println(in.readUTF());
                DataOutputStream out = new DataOutputStream(server.getOutputStream());
                out.writeUTF("谢谢连接我：" + server.getLocalSocketAddress() + "\\nGoodbye!");
                server.close();
            } catch (SocketTimeoutException s) {
                System.out.println("Socket timed out!");
                break;
            } catch (IOException e) {
                e.printStackTrace();
                break;
            }
        }
    }

    public static void main(String[] args) {
        int port = Integer.parseInt(args[0]);
        try {
            Thread t = new GreetingServer(port);
            t.run();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}`

{
  const c = cards['k_vault_javajava_1xf3hv']
  const def = c.tabs?.find((t) => t.id === 'def')
  ck(!!def, 'C: 干净 def tab 在位')
  ck(c.rootContent.startsWith('Java 网络编程（Socket） '), 'C: root 标签前缀+塌行（病灶在位）')
  ck(!c.rootContent.includes('\n\n'), 'C: root 无空行（塌行确认）')
  const src = def.content
  const parts = src.split(/(?=^## (?:Socket 编程|ServerSocket 类的方法|Socket 类的方法|InetAddress 类的方法|Socket 客户端实例|Socket 服务端实例)$)/m)
  ck(parts.length === 7, 'C: def 切出 7 段（总述 + 6 节）', String(parts.length))
  const intro = parts[0].replace(/\n*---\s*$/, '').trimEnd()
  ck(intro.includes('**TCP**') && intro.includes('**UDP**'), 'C: 总述段含 TCP/UDP')
  const secByName = (name) => { const p = parts.find((x) => x.startsWith(`## ${name}`)); ck(!!p, `C: 节「${name}」在位`); return p?.trimEnd() ?? '' }
  const secProg = secByName('Socket 编程')
  const secServer = secByName('ServerSocket 类的方法')
  const secMethods = secByName('Socket 类的方法')
  const secInet = secByName('InetAddress 类的方法')
  const secClient = secByName('Socket 客户端实例')
  const secServerDemo = secByName('Socket 服务端实例')
  // 单行 Java 代码（逐 token 守恒校验后替换为重排围栏块）
  const codeLineOf = (sec, file) => { const l = sec.split('\n').find((x) => x.startsWith(`// 文件名 ${file} import java.net.*;`)); ck(!!l, `C: ${file} 单行代码（病灶在位）`); return l ?? '' }
  const clLine = codeLineOf(secClient, 'GreetingClient.java')
  const svLine = codeLineOf(secServerDemo, 'GreetingServer.java')
  const toks = (s) => s.replace(/[\s;{}()]/g, '')
  ck(clLine.length > 0 && toks(clLine) === toks(CLIENT_JAVA), 'C: GreetingClient 重排逐 token 守恒')
  ck(svLine.length > 0 && toks(svLine) === toks(SERVER_JAVA), 'C: GreetingServer 重排逐 token 守恒')
  const clientHead = secClient.split(clLine)[0].replace('## Socket 客户端实例', '').replace('## GreetingClient.java 文件代码：', '').trim()
  const svParts = secServerDemo.split(svLine)
  const serverHead = svParts[0].replace('## Socket 服务端实例', '').replace('## GreetingServer.java 文件代码：', '').trim()
  const runTail = (svParts[1] ?? '').trim()
  ck(clientHead.startsWith('如下的 GreetingClient'), 'C: 客户端引语提取')
  ck(serverHead.startsWith('如下的GreetingServer'), 'C: 服务端引语提取')
  ck(runTail.startsWith('编译以上两个 java 文件代码'), 'C: 编译运行段提取')
  const demoTab = ['## 客户端实例（GreetingClient）', '', clientHead, '', '```java', CLIENT_JAVA, '```', '', '## 服务端实例（GreetingServer）', '', serverHead, '', '```java', SERVER_JAVA, '```', '', '## 编译与运行', '', runTail].join('\n')
  const NEW_TABS = [
    { id: 'intro', label: '概述', content: intro },
    { id: 'socket-prog', label: 'Socket 编程', content: secProg.replace(/^## Socket 编程\n+/, '') },
    { id: 'server-socket', label: 'ServerSocket 类', content: secServer.replace(/^## ServerSocket 类的方法\n+/, '') },
    { id: 'socket-methods', label: 'Socket 类方法', content: secMethods.replace(/^## Socket 类的方法\n+/, '') },
    { id: 'inet-address', label: 'InetAddress 类', content: secInet.replace(/^## InetAddress 类的方法\n+/, '') },
    { id: 'demo', label: '运行实例', content: demoTab },
  ]
  const NEW_ROOT = '**Java 网络编程**基于 java.net 包，提供 TCP（面向连接、可靠字节流）与 UDP（无连接数据报）两种协议支持。核心类：**ServerSocket**（服务端绑定端口监听、accept() 等待连接）、**Socket**（客户端按主机名+端口发起连接，双方经输入/输出流双向通信）、**InetAddress**（IP 地址解析）。'
  ck(!PTR_RE.test(NEW_ROOT) && NEW_TABS.every((t) => !PTR_RE.test(t.content)), 'C: 总述+tab 零指针')
  ck(NEW_TABS.every((t) => t.content.length > 50), 'C: 6 tab 非空')
  c.__new = { rootContent: NEW_ROOT, tabs: NEW_TABS }
  console.log(`  摘要：root ${c.rootContent.length}→${NEW_ROOT.length} 字；tabs def(1)→6；Java 代码 2 段重排`)
}

// ── E. 阻塞条件变量（机翻粗体胶着 → 渲染级解胶）────────────
console.log('\n── E. 阻塞条件变量（粗体胶着解胶，机翻语义不动）──')
{
  const c = cards['k_wiki_en_monitor_synchronization_s12']
  ck((c.tabs ?? []).length === 0, 'E: 无 tab')
  // [旧, 新, 预期次数]——仅并粗体/边界补空格；剥星后逐字守恒由后置总门校验
  const PAIRS = [
    ['**信号****并返回**：', '**信号并返回**：', 2],
    ['**前提条件****修改**监视器的状态', '**前提条件** **修改**监视器的状态', 2],
    ['**前提条件**电脑**和****修改**监视器的状态', '**前提条件** 电脑 **和** **修改**监视器的状态', 1],
    ['**后置条件**PC**和**', '**后置条件** PC **和**', 1],
    ['**前提条件**电脑**和**', '**前提条件** 电脑 **和**', 1],
    ['**信号****前提条件**（**不是**empty()**和**PC）**或**（empty()**和**）', '**信号** **前提条件**（**不是** empty() **和** PC）**或**（empty() **和**）', 1],
    ['**不变**0 <= 大小**和**大小 <= 容量', '**不变** 0 <= 大小 **和** 大小 <= 容量', 1],
    ['**私有***BlockingCondition* theStackIsNotEmpty /***关联于**0 < 大小**且**大小 <= 容量 */', '**私有** *BlockingCondition* theStackIsNotEmpty /* **关联于** 0 < 大小 **且** 大小 <= 容量 */', 1],
    ['**私有***BlockingCondition* theStackIsNotFull /***关联于**0 <= 大小**和**大小 < 容量 */', '**私有** *BlockingCondition* theStackIsNotFull /* **关联于** 0 <= 大小 **和** 大小 < 容量 */', 1],
    ['**如果**大小 = 容量**则****等待**theStackIsNotFull', '**如果** 大小 = 容量 **则** **等待** theStackIsNotFull', 1],
    ['**如果**大小= 0**则****等待**theStackIsNotEmpty', '**如果** 大小 = 0 **则** **等待** theStackIsNotEmpty', 1],
    ['**断言**0 <= 大小**和**大小 < 容量', '**断言** 0 <= 大小 **和** 大小 < 容量', 2],
    ['**断言**0 < 大小**和**大小 <= 容量', '**断言** 0 < 大小 **和** 大小 <= 容量', 2],
    ['**向StackIsNotEmpty发出信号**并返回**', '**向StackIsNotEmpty发出信号并返回**', 1],
    ['**发出信号**StackIsNotFull**并返回**A[size]', '**发出信号** StackIsNotFull **并返回** A[size]', 1],
  ]
  let next = c.rootContent
  for (const [o, n, cnt] of PAIRS) {
    const hit = next.split(o).length - 1
    ck(hit === cnt, `E: 「${o.slice(0, 22)}…」出现 ${cnt} 次`, String(hit))
    next = next.split(o).join(n)
  }
  const noStar = (s) => s.replace(/\*/g, '').replace(/\s+/g, '')
  ck(noStar(next) === noStar(c.rootContent), 'E: 剥星剥空白后逐字守恒')
  ck(!next.split('\n').some((l) => ((l.replaceAll('/**', '').match(/\*\*/g) || []).length % 2) === 1), 'E: 每行 ** 计数全偶（剔除 /** 注释符）')
  ck(!next.includes('****'), 'E: 无残留 **** 胶着')
  ck(!PTR_RE.test(next), 'E: 零指针')
  c.__new = { rootContent: next }
  console.log(`  摘要：root ${c.rootContent.length}→${next.length} 字；解胶 ${PAIRS.length} 类`)
}

// ── 后置门 + 写入 ──────────────────────────────────────────
console.log('\n══ 后置门 ══')
for (const [id, c] of Object.entries(cards)) {
  if (!c.__new) { problems.push(`${id} 无变更方案`); continue }
  ck((c.__new.rootContent ?? '').length > 0, `${id}: 新 rootContent 非空`)
}
ck(Object.keys(pool).length === poolKeys, `node-pool 键数守恒（${poolKeys}）`)
if (problems.length) { console.log(`\n⛔ ${problems.length} 项未过门，未写入`); process.exit(1) }
for (const c of Object.values(cards)) {
  c.rootContent = c.__new.rootContent
  if (c.__new.tabs) c.tabs = c.__new.tabs
  delete c.__new
}
if (!APPLY) { console.log('\n(dry-run) 全部门通过，加 --apply 落盘'); process.exit(0) }
writeJsonAtomic('node-pool.json', pool)
const back = readJson('node-pool.json')
let rok = true
for (const [id, c] of Object.entries(cards)) {
  const b = back[id]?.card ?? {}
  const ok = b.rootContent === c.rootContent && JSON.stringify(b.tabs ?? []) === JSON.stringify(c.tabs ?? [])
  if (!ok) rok = false
  console.log((ok ? '  ✅ ' : '  ❌ ') + `回读逐字节一致 ${id}`)
}
console.log(rok && Object.keys(back).length === poolKeys ? '\n✅ 写入并回读校验通过' : '\n❌ 回读校验失败')
process.exit(rok ? 0 : 1)
