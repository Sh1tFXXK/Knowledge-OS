// Obsidian Java 笔记库导入（2026-08-29）
// 源：C:\Users\Administrator\Documents\Obsidian Vault\编程语言\java（166 个 md）
// 原则（与 IO/NIO 整理一致）：
//   A. 通用原理 → 本体域：算法文件 → 计算理论/算法(算法分析/数据结构/算法设计)；分布式 → 系统组织/分布式系统
//   B. Java 特有逻辑 → java 现有主题：JVM → 执行系统/jvm；并发 → java并发编程；语言语法 → Java syntax；集合概念 → 集合框架
//   C. 类库/API 用法 → java/常用类库（Stream/网络编程/JDBC/JavaMail/常用类库整理/Character）
//   D. Java 生态框架 → java/框架和中间件 新主题（JavaWeb/Spring/Mybatis/Netty/Kafka/RabbitMQ/SpringCloud）
// 跳过纯导航/历史桩文件（java.md、java-syntax.md、NIO 系列 5 篇（内容已被系统 IO 与 NIO 主题覆盖且更详尽）、
//   系统原理.md、框架.md、多线程.md、JVM.md、分布式.md、分布式原理知识地图、Servlet.md）。
// 图片处理：全部 39 张图片已人工转写为「【图解：…】」文字块
//（scripts/import-obsidian-java-vault-transcriptions.jsonl），导入时替换原始引用。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

const VAULT = 'C:/Users/Administrator/Documents/Obsidian Vault/编程语言/java';
const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `import-obsidian-java-vault-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
// 改动前就缺失的边端点（MySQL 域历史遗留），完整性校验时豁免
const preexistingDangling = new Set();
for (const e of edges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexistingDangling.add(e[end]);

// 图片转写映射：key 是本地文件名或 web 图片 url basename
const transcriptions = new Map();
for (const line of readFileSync('scripts/import-obsidian-java-vault-transcriptions.jsonl', 'utf8').trim().split('\n')) {
  const obj = JSON.parse(line);
  transcriptions.set(obj.key, obj.text);
}

// ========== 内容清洗 ==========
function cleanContent(relFile, title) {
  let c = readFileSync(join(VAULT, relFile), 'utf8');
  // 去 H1（容错前导空行）
  c = c.replace(/^\s*# [^\n]*\n+/, '');
  // 图片替换：Obsidian 内嵌 ![[Pasted image xxx.png]] 与 web ![](url)
  c = c.replace(/!\[\[([^\]]+)\]\]/g, (m, name) => transcriptions.get(name.trim()) ?? '');
  c = c.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (m, url) => transcriptions.get(basename(url)) ?? '');
  // wikilink 转纯文本
  c = c.replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, target, label) => label || target.replace(/^.*\//, ''));
  // 去掉「## 返回」及之后的导航块
  const backIdx = c.search(/^## 返回\s*$/m);
  if (backIdx >= 0) c = c.slice(0, backIdx);
  // 删除残留的纯 wikilink 导航行（- [[xxx]] / 1. [[xxx]]）
  c = c.replace(/^\s*(?:[-*]|\d+\.)\s*\[\[[^\]]+\]\]\s*$/gm, '');
  // 收敛多余空行
  c = c.replace(/\n{3,}/g, '\n\n').trim();
  if (!c) throw new Error(`empty content after cleaning: ${relFile}`);
  if (/!\[\[|!\[\]\(/.test(c)) throw new Error(`unresolved image in ${relFile}`);
  return `\n${c}\n`;
}

// ========== ID 生成 ==========
const usedIds = new Set(Object.keys(pool));
function slugId(relFile) {
  const ascii = relFile.replace(/\.md$/, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  let h = 0;
  for (const ch of relFile) { h = (h * 31 + ch.codePointAt(0)) >>> 0; }
  const suffix = h.toString(36).slice(0, 6);
  const base = ('k_vault_' + (ascii.slice(-40) || 'x') + '_' + suffix).toLowerCase();
  let id = base;
  let n = 2;
  while (usedIds.has(id)) id = `${base}${n++}`;
  usedIds.add(id);
  return id;
}

// ========== 树工具 ==========
function findTreeByRef(node, ref) {
  if (node.nodeRef === ref) return node;
  for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; }
  return null;
}
function parentTree(ref) {
  const t = findTreeByRef(tree, ref);
  if (!t) throw new Error(`tree node with nodeRef ${ref} not found`);
  return t;
}
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// ========== 节点创建 ==========
const created = [];
function createNode({ file, parentRef, name, tags = [], dimensions = ['java'] }) {
  const title = (name ?? basename(file, '.md')).trim();
  const id = slugId(file);
  const content = cleanContent(file, title);
  pool[id] = {
    id,
    label: title,
    role: 'concept',
    dimensions: [...dimensions],
    tags: [...new Set([title, 'java', ...tags])],
    card: { nodeId: id, title, tabs: [{ id: 'def', label: '定义', content }] },
  };
  const pt = parentTree(parentRef);
  const treeNode = { id: 'tree_' + id.slice(2), name: title, count: 0, nodeRef: id, children: [] };
  pt.children ??= [];
  pt.children.push(treeNode);
  created.push({ id, title, file, parentId: pt.id, parentRef });
  return { id, treeNode };
}

function createGroup({ ref, id, treeId, name, cardFile, cardContent, parentRef, tags = [] }) {
  if (pool[ref]) throw new Error(`group already exists: ${ref}`);
  const content = cardFile ? cleanContent(cardFile, name) : cardContent;
  pool[ref] = {
    id: ref,
    label: name,
    role: 'group',
    dimensions: ['java'],
    tags: [...new Set([name, 'java', ...tags])],
    card: { nodeId: ref, title: name, tabs: [{ id: 'def', label: '定义', content }] },
  };
  const pt = parentTree(parentRef);
  pt.children ??= [];
  const g = { id: treeId, name, count: 0, nodeRef: ref, children: [] };
  pt.children.push(g);
  return g;
}
const into = (groupTreeNode) => ({
  parentRef: null,
  get children() { return groupTreeNode.children; },
});

// ========== 导入映射 ==========
// sid：按文件路径后缀取已创建节点 id（用于语义边 source）
const sid = (suffix) => {
  const hit = created.find((c) => c.file.endsWith(suffix));
  if (!hit) throw new Error(`created node not found for suffix: ${suffix}`);
  return hit.id;
};
// --- 1. 通用算法 → 计算理论/算法域 ---
const algAnalyze = 'k_acm2012_algorithms_algorithm_analysis';
const dataStruct = 'theory_domain_data_structures';
const algDesign = 'k_acm2012_algorithms_algorithm_design';
const algRoot = 'theory_domain_algorithms';
const algTags = ['算法', '数据结构与算法', '复杂度'];
createNode({ file: 'Java数据与算法/01-复杂度与算法分析.md', parentRef: algAnalyze, name: '复杂度与算法分析', tags: algTags });
for (const [file, name] of [
  ['Java数据与算法/02-线性结构.md', '线性结构'],
  ['Java数据与算法/03-哈希结构.md', '哈希结构'],
  ['Java数据与算法/04-树与堆.md', '树与堆'],
  ['Java数据与算法/05-图与搜索.md', '图与搜索'],
]) createNode({ file, parentRef: dataStruct, name, tags: algTags });
createNode({ file: 'Java数据与算法/07-算法思想.md', parentRef: algDesign, name: '算法思想', tags: algTags });
for (const [file, name] of [
  ['Java数据与算法/06-排序与查找.md', '排序与查找'],
  ['Java数据与算法/08-工程中的算法模型.md', '工程中的算法模型'],
]) createNode({ file, parentRef: algRoot, name, tags: algTags });

// --- 2. 通用分布式 → 系统组织/分布式系统 ---
const distRef = 'theory_domain_distributed_systems';
const distTags = ['分布式系统', '分布式'];
for (const [file, name] of [
  ['Java系统原理/分布式/00-分布式知识地图.md', '分布式知识地图'],
  ['Java系统原理/分布式/01-分布式系统模型.md', '分布式系统模型'],
  ['Java系统原理/分布式/02-分布式事务.md', '分布式事务'],
  ['Java系统原理/分布式/03-分布式锁.md', '分布式锁'],
  ['Java系统原理/分布式/04-一致性与CAP实践.md', '一致性与 CAP 实践'],
  ['Java系统原理/分布式原理/CAP原理和BASE理论.md', 'CAP原则与BASE理论'],
  ['Java系统原理/分布式/分布式任务调度.md', '分布式任务调度'],
]) createNode({ file, parentRef: distRef, name, tags: distTags, dimensions: ['distributed'] });

// --- 3. JVM → java/执行系统/jvm ---
const jvmRef = 'k_1782749694486_vyrfzy';
const jvmTags = ['JVM'];
for (const [file, name] of [
  ['Java系统原理/JVM/00-JVM知识地图.md', 'JVM 知识地图'],
  ['Java系统原理/JVM/01-JVM基础.md', 'JVM 基础'],
  ['Java系统原理/JVM/02-类加载机制.md', '类加载机制（学习笔记）'],
  ['Java系统原理/JVM/03-垃圾回收与收集器.md', '垃圾回收与收集器'],
  ['Java系统原理/JVM/04-JVM参数与调优.md', 'JVM 参数与调优（学习笔记）'],
  ['Java系统原理/JVM/05-JVM排障实战.md', 'JVM 排障实战'],
]) createNode({ file, parentRef: jvmRef, name, tags: jvmTags });

// --- 4. 并发 → java/java并发编程 ---
const concRef = 'k_1782846767165_l599je';
const concTags = ['并发', '多线程'];
for (const [file, name] of [
  ['Java系统原理/多线程/00-并发知识地图.md', '并发知识地图'],
  ['Java系统原理/多线程/01-线程基础与生命周期.md', '线程基础与生命周期'],
  ['Java系统原理/多线程/02-线程安全与锁.md', '线程安全与锁'],
  ['Java系统原理/多线程/03-volatile与ThreadLocal.md', 'volatile 与 ThreadLocal'],
  ['Java系统原理/多线程/04-AQS与JUC工具.md', 'AQS 与 JUC 工具'],
  ['Java系统原理/多线程/05-并发容器与调度.md', '并发容器与调度'],
  ['Java系统原理/多线程/线程池.md', '线程池详解'],
  ['java语法基础/Java 多线程编程.md', 'Java 多线程编程入门'],
  ['java语法基础/关键字/Synchronized.md', 'Synchronized 关键字'],
]) createNode({ file, parentRef: concRef, name, tags: concTags });

// --- 5. 语言语法 → java/Java syntax ---
const syntaxRef = 'k_1783867183071_xrnl1e';
const syntaxTags = ['Java语法'];
const classObjGroup = createGroup({
  ref: 'k_java_syntax_class_object', treeId: 'tree_java_syntax_class_object', name: '类与对象',
  cardContent: `面向对象的基本单元：类、对象、封装、继承、多态，以及 Java 语言层面的修饰符与泛型。

子主题：
- 类基础：Java 对象和类、封装、成员内部类、静态内部类
- 继承与多态：继承、多态、抽象类、接口
- 修饰符与泛型：访问修饰符、泛型`,
  parentRef: syntaxRef,
});
for (const [file, name] of [
  ['java语法基础/类与对象/类基础/Java对象和类.md', 'Java 对象和类'],
  ['java语法基础/类与对象/类基础/Java封装.md', 'Java 封装'],
  ['java语法基础/类与对象/类基础/成员内部类.md', '成员内部类'],
  ['java语法基础/类与对象/类基础/静态内部类.md', '静态内部类'],
  ['java语法基础/类与对象/继承与多态/Java继承.md', 'Java 继承'],
  ['java语法基础/类与对象/继承与多态/Java多态.md', 'Java 多态'],
  ['java语法基础/类与对象/继承与多态/Java抽象类.md', 'Java 抽象类'],
  ['java语法基础/类与对象/继承与多态/Java接口.md', 'Java 接口'],
  ['java语法基础/类与对象/修饰符与泛型/Java修饰符.md', 'Java 修饰符'],
  ['java语法基础/类与对象/修饰符与泛型/Java泛型.md', 'Java 泛型'],
]) createNode({ file, parentRef: 'k_java_syntax_class_object', name, tags: syntaxTags });
for (const [file, name] of [
  ['java语法基础/Java 重写(Override)与重载(Overload).md', '重写（Override）与重载（Overload）'],
  ['java语法基础/关键字/关键字.md', '常用关键字速记（static/final）'],
]) createNode({ file, parentRef: syntaxRef, name, tags: syntaxTags });
createNode({ file: 'java语法基础/Java 异常处理.md', parentRef: 'k_1786353277269_msn0ma92h', name: 'Java 异常处理（教程）', tags: ['Java语法', '异常'] });

// --- 6. 集合 → java/集合框架 ---
const collRef = 'k_1785664228019_k7eq57';
const collTags = ['集合框架', 'java.util'];
for (const [file, name] of [
  ['java语法基础/数据结构/Java 集合框架.md', 'Java 集合框架总览'],
  ['java语法基础/数据结构/Java 数据结构.md', 'Java 数据结构基础'],
  ['java语法基础/数据结构/Java ArrayList.md', 'ArrayList 详解'],
  ['java语法基础/数据结构/Java LinkedList.md', 'LinkedList 详解'],
  ['java语法基础/数据结构/Java HashMap.md', 'HashMap 详解'],
  ['java语法基础/数据结构/Java HashSet.md', 'HashSet 详解'],
]) createNode({ file, parentRef: collRef, name, tags: collTags });

// --- 7. 类库用法 → java/常用类库 ---
const libRef = 'k_java_common_libraries';
const libTags = ['常用类库', 'JDK API'];
for (const [file, name, tags] of [
  ['java语法基础/Java 8 Stream.md', 'Java 8 Stream', ['Stream', 'java.util.stream']],
  ['java语法基础/Java 常用类库整理.md', '常用类库整理', []],
  ['java语法基础/Java 网络编程.md', 'Java 网络编程（Socket）', ['java.net', '网络编程']],
  ['java语法基础/Java MySQL 连接.md', 'JDBC 连接 MySQL', ['JDBC', 'java.sql', 'MySQL']],
  ['java语法基础/Java 发送邮件.md', 'Java 发送邮件（JavaMail）', ['JavaMail', '第三方类库']],
  ['java语法基础/数据结构/Java Character 类.md', 'Character 类', ['java.lang']],
]) createNode({ file, parentRef: libRef, name, tags: [...libTags, ...tags] });

// --- 8. 框架和中间件 → java/框架和中间件 新主题 ---
const fwGroup = createGroup({
  ref: 'k_java_frameworks', treeId: 'tree_java_frameworks', name: '框架和中间件',
  cardFile: 'Java框架和中间件/Java框架和中间件.md',
  parentRef: 'k_1782746457581_30q8ao',
  tags: ['框架', '中间件', 'Spring', 'Netty', 'Kafka'],
});
const fwTag = ['框架', '中间件'];

const sub = (ref, treeId, name, cardFile, cardText) => createGroup({
  ref, treeId, name,
  cardFile: cardFile ?? undefined,
  cardContent: cardText,
  parentRef: 'k_java_frameworks',
  tags: fwTag,
});

// JavaWeb
sub('k_java_fw_javaweb', 'tree_java_fw_javaweb', 'JavaWeb', 'Java框架和中间件/JavaWeb/00-JavaWeb知识地图.md');
for (const [file, name] of [
  ['Java框架和中间件/JavaWeb/01-HTTP请求与Servlet模型.md', 'HTTP 请求与 Servlet 模型'],
  ['Java框架和中间件/JavaWeb/02-Servlet生命周期与容器协作.md', 'Servlet 生命周期与容器协作'],
  ['Java框架和中间件/JavaWeb/03-RequestResponse与作用域.md', 'Request/Response 与作用域'],
  ['Java框架和中间件/JavaWeb/04-SessionCookie与状态管理.md', 'Session/Cookie 与状态管理'],
  ['Java框架和中间件/JavaWeb/05-JSP与视图渲染.md', 'JSP 与视图渲染'],
  ['Java框架和中间件/JavaWeb/JSP.md', 'JSP'],
]) createNode({ file, parentRef: 'k_java_fw_javaweb', name, tags: fwTag });

// Spring
sub('k_java_fw_spring', 'tree_java_fw_spring', 'Spring', 'Java框架和中间件/Spring/00-Spring知识地图.md');
for (const [file, name] of [
  ['Java框架和中间件/Spring/01-IoC与容器模型.md', 'IoC 与容器模型'],
  ['Java框架和中间件/Spring/02-依赖注入与Bean生命周期.md', '依赖注入与 Bean 生命周期'],
  ['Java框架和中间件/Spring/03-AOP与代理机制.md', 'AOP 与代理机制'],
  ['Java框架和中间件/Spring/04-SpringMVC请求链路.md', 'SpringMVC 请求链路'],
  ['Java框架和中间件/Spring/05-事务与传播机制.md', '事务与传播机制'],
  ['Java框架和中间件/Spring/06-配置驱动与注解编程.md', '配置驱动与注解编程'],
  ['Java框架和中间件/Spring/spring.md', 'Spring 知识主线'],
]) createNode({ file, parentRef: 'k_java_fw_spring', name, tags: ['Spring'] });
sub('k_java_fw_spring_aop', 'tree_java_fw_spring_aop', 'AOP', 'Java框架和中间件/Spring/AOP/面向切面编程.md', undefined);
for (const [file, name] of [
  ['Java框架和中间件/Spring/AOP/aop的原理.md', 'AOP 原理'],
  ['Java框架和中间件/Spring/AOP/Spring aop 的两种代理方式.md', 'Spring AOP 的两种代理方式'],
]) createNode({ file, parentRef: 'k_java_fw_spring_aop', name, tags: ['Spring', 'AOP'] });
sub('k_java_fw_spring_ioc', 'tree_java_fw_spring_ioc', 'IoC容器', 'Java框架和中间件/Spring/IoC容器/控制反转.md', undefined);
for (const [file, name] of [
  ['Java框架和中间件/Spring/IoC容器/ioc原理.md', 'IoC 原理'],
  ['Java框架和中间件/Spring/IoC容器/ioc理解，初始化.md', 'IoC 理解与初始化'],
  ['Java框架和中间件/Spring/IoC容器/spring beanfactory和applicationcontext的区别.md', 'BeanFactory 与 ApplicationContext 的区别'],
]) createNode({ file, parentRef: 'k_java_fw_spring_ioc', name, tags: ['Spring', 'IoC'] });
sub('k_java_fw_spring_mvc', 'tree_java_fw_spring_mvc', 'SpringMVC', 'Java框架和中间件/Spring/SpringMVC/spring mvc 概述.md', undefined);
for (const [file, name] of [
  ['Java框架和中间件/Spring/SpringMVC/spring mvc 的原理.md', 'Spring MVC 原理'],
  ['Java框架和中间件/Spring/SpringMVC/mvc 面试题.md', 'SpringMVC 面试题'],
  ['Java框架和中间件/Spring/SpringMVC/spring如何保证并发controller的安全.md', 'Spring 如何保证并发 Controller 的安全'],
]) createNode({ file, parentRef: 'k_java_fw_spring_mvc', name, tags: ['Spring', 'SpringMVC'] });
sub('k_java_fw_spring_boot', 'tree_java_fw_spring_boot', 'Spring Boot', 'Java框架和中间件/Spring/Spring boot/基础入门/概述.md', undefined);
for (const [file, name] of [
  ['Java框架和中间件/Spring/Spring boot/基础入门/原理.md', 'Spring Boot 原理'],
  ['Java框架和中间件/Spring/Spring boot/基础入门/与Spring对比.md', 'Spring Boot 与 Spring 对比'],
  ['Java框架和中间件/Spring/Spring boot/核心功能/安全.md', 'Spring Boot 安全'],
  ['Java框架和中间件/Spring/Spring boot/核心功能/缓存.md', 'Spring Boot 缓存'],
  ['Java框架和中间件/Spring/Spring boot/核心功能/热加载.md', 'Spring Boot 热加载'],
  ['Java框架和中间件/Spring/Spring boot/核心功能/监视器.md', 'Spring Boot 监视器'],
  ['Java框架和中间件/Spring/Spring boot/核心功能/整合第三方.md', 'Spring Boot 整合第三方'],
  ['Java框架和中间件/Spring/Spring boot/核心功能/其他.md', 'Spring Boot 其他核心功能'],
  ['Java框架和中间件/Spring/Spring boot/核心功能/面试题.md', 'Spring Boot 面试题'],
]) createNode({ file, parentRef: 'k_java_fw_spring_boot', name, tags: ['Spring', 'Spring Boot'] });
for (const [file, name] of [
  ['Java框架和中间件/Spring/事务管理/spring 的事务管理.md', 'Spring 事务管理'],
  ['Java框架和中间件/Spring/新特性/Spring4新特性.md', 'Spring 4 新特性'],
  ['Java框架和中间件/Spring/新特性/Spring5新特性.md', 'Spring 5 新特性'],
  ['Java框架和中间件/Spring/新特性/JSR310日期API支持.md', 'JSR310 日期 API 支持'],
  ['Java框架和中间件/Spring/新特性/Web开发增强.md', 'Spring 新特性之 Web 开发增强'],
  ['Java框架和中间件/Spring/配置与注解/配置.md', 'Spring 配置'],
  ['Java框架和中间件/Spring/配置与注解/spring注解.md', 'Spring 注解'],
  ['Java框架和中间件/Spring/配置与注解/spring注入的几种方式.md', 'Spring 注入的几种方式'],
  ['Java框架和中间件/Spring/配置与注解/spring数据访问.md', 'Spring 数据访问'],
]) createNode({ file, parentRef: 'k_java_fw_spring', name, tags: ['Spring'] });
sub('k_java_fw_spring_valid', 'tree_java_fw_spring_valid', '验证', 'Java框架和中间件/Spring/验证/分组验证与级联验证.md', undefined);
for (const [file, name] of [
  ['Java框架和中间件/Spring/验证/消息中使用EL表达式.md', '验证消息中使用 EL 表达式'],
  ['Java框架和中间件/Spring/验证/类级别验证器.md', '类级别验证器'],
  ['Java框架和中间件/Spring/验证/自定义验证规则.md', '自定义验证规则'],
  ['Java框架和中间件/Spring/验证/返回值验证.md', '返回值验证'],
  ['Java框架和中间件/Spring/验证/集成Bean Validation 1.1到SpringMVC.md', '集成 Bean Validation 1.1 到 SpringMVC'],
]) createNode({ file, parentRef: 'k_java_fw_spring_valid', name, tags: ['Spring', '验证'] });

// Mybatis
sub('k_java_fw_mybatis', 'tree_java_fw_mybatis', 'Mybatis', 'Java框架和中间件/Mybatis/00-MyBatis知识地图.md');
for (const [file, name] of [
  ['Java框架和中间件/Mybatis/Mybatis.md', 'MyBatis 定位总览'],
  ['Java框架和中间件/Mybatis/01-MyBatis核心定位与组成.md', 'MyBatis 核心定位与组成'],
  ['Java框架和中间件/Mybatis/02-SqlSession与生命周期.md', 'SqlSession 与生命周期'],
  ['Java框架和中间件/Mybatis/03-MyBatis配置体系.md', 'MyBatis 配置体系'],
  ['Java框架和中间件/Mybatis/04-Mapper与动态SQL.md', 'Mapper 与动态 SQL'],
  ['Java框架和中间件/Mybatis/05-执行机制与插件.md', 'MyBatis 执行机制与插件'],
  ['Java框架和中间件/Mybatis/06-MyBatis-Spring整合.md', 'MyBatis-Spring 整合'],
  ['Java框架和中间件/Mybatis/07-MyBatis工程实践.md', 'MyBatis 工程实践'],
  ['Java框架和中间件/Mybatis/Plus.md', 'MyBatis-Plus'],
  ['Java框架和中间件/Mybatis/Plus/MybatisPlus常用的对象.md', 'MyBatis-Plus 常用对象'],
  ['Java框架和中间件/Mybatis/hibernate和ibatis的区别.md', 'Hibernate 和 iBatis 的区别'],
  ['Java框架和中间件/Mybatis/讲讲mybatis的连接池.md', 'MyBatis 的连接池'],
  ['Java框架和中间件/Mybatis/条件构造器.md', 'MyBatis-Plus 条件构造器'],
]) createNode({ file, parentRef: 'k_java_fw_mybatis', name, tags: ['Mybatis'] });

// Netty / Kafka / rabbitMQ / springcloud
sub('k_java_fw_netty', 'tree_java_fw_netty', 'Netty', 'Java框架和中间件/Netty/00-Netty知识地图.md');
for (const [file, name] of [
  ['Java框架和中间件/Netty/01-Netty定位与通信抽象.md', 'Netty 定位与通信抽象'],
  ['Java框架和中间件/Netty/02-Reactor与线程模型.md', 'Netty 的 Reactor 与线程模型'],
  ['Java框架和中间件/Netty/03-Channel与Pipeline.md', 'Netty 的 Channel 与 Pipeline'],
  ['Java框架和中间件/Netty/04-异步能力与高性能设计.md', 'Netty 异步能力与高性能设计'],
  ['Java框架和中间件/Netty/05-Netty与RPC实践.md', 'Netty 与 RPC 实践'],
  ['Java框架和中间件/Netty/基础概念.md', 'Netty 基础概念'],
]) createNode({ file, parentRef: 'k_java_fw_netty', name, tags: ['Netty'] });
sub('k_java_fw_kafka', 'tree_java_fw_kafka', 'Kafka', 'Java框架和中间件/Kafka/00-Kafka知识地图.md');
for (const [file, name] of [
  ['Java框架和中间件/Kafka/Kafka.md', 'Kafka 定位总览'],
  ['Java框架和中间件/Kafka/01-Kafka定位与消息模型.md', 'Kafka 定位与消息模型'],
  ['Java框架和中间件/Kafka/02-TopicPartition与Broker.md', 'Topic/Partition 与 Broker'],
  ['Java框架和中间件/Kafka/03-ProducerConsumer与消费组.md', 'Producer/Consumer 与消费组'],
  ['Java框架和中间件/Kafka/04-顺序吞吐与适用场景.md', 'Kafka 顺序、吞吐与适用场景'],
]) createNode({ file, parentRef: 'k_java_fw_kafka', name, tags: ['Kafka', '消息队列'] });
sub('k_java_fw_rabbitmq', 'tree_java_fw_rabbitmq', 'RabbitMQ', 'Java框架和中间件/rabbitMQ/00-RabbitMQ知识地图.md');
for (const [file, name] of [
  ['Java框架和中间件/rabbitMQ/01-MQ为什么存在.md', 'MQ 为什么存在'],
  ['Java框架和中间件/rabbitMQ/02-RabbitMQ核心模型.md', 'RabbitMQ 核心模型'],
  ['Java框架和中间件/rabbitMQ/03-交换机路由与工作模式.md', '交换机路由与工作模式'],
  ['Java框架和中间件/rabbitMQ/04-可靠性顺序与幂等.md', 'RabbitMQ 可靠性、顺序与幂等'],
  ['Java框架和中间件/rabbitMQ/05-RabbitMQ与Kafka选型.md', 'RabbitMQ 与 Kafka 选型'],
  ['Java框架和中间件/rabbitMQ/基础概念.md', 'RabbitMQ 基础概念'],
]) createNode({ file, parentRef: 'k_java_fw_rabbitmq', name, tags: ['RabbitMQ', '消息队列'] });
sub('k_java_fw_springcloud', 'tree_java_fw_springcloud', 'Spring Cloud', 'Java框架和中间件/springcloud/00-SpringCloud知识地图.md');
for (const [file, name] of [
  ['Java框架和中间件/springcloud/springcloud.md', 'Spring Cloud 定位总览'],
  ['Java框架和中间件/springcloud/01-SpringCloud定位与系统问题.md', 'Spring Cloud 定位与系统问题'],
  ['Java框架和中间件/springcloud/02-注册发现与负载均衡.md', '注册发现与负载均衡'],
  ['Java框架和中间件/springcloud/03-服务调用与容错.md', '服务调用与容错'],
  ['Java框架和中间件/springcloud/04-配置中心与消息总线.md', '配置中心与消息总线'],
  ['Java框架和中间件/springcloud/05-网关与治理组件.md', '网关与治理组件'],
  ['Java框架和中间件/springcloud/06-SpringCloud生态与技术选型.md', 'Spring Cloud 生态与技术选型'],
]) createNode({ file, parentRef: 'k_java_fw_springcloud', name, tags: ['Spring Cloud', '微服务'] });

// ========== 组计数 ==========
for (const g of [fwGroup, classObjGroup]) g.count = (g.children ?? []).length;
for (const [ref, treeId] of [
  ['k_java_fw_javaweb', 'tree_java_fw_javaweb'], ['k_java_fw_spring', 'tree_java_fw_spring'],
  ['k_java_fw_mybatis', 'tree_java_fw_mybatis'], ['k_java_fw_netty', 'tree_java_fw_netty'],
  ['k_java_fw_kafka', 'tree_java_fw_kafka'], ['k_java_fw_rabbitmq', 'tree_java_fw_rabbitmq'],
  ['k_java_fw_springcloud', 'tree_java_fw_springcloud'],
]) {
  const t = findTreeByRef(tree, ref);
  t.count = (t.children ?? []).length;
}

// ========== 知识边：新子树的 treebind + 跨域语义边 ==========
const newRefs = new Set(created.map((c) => c.id));
const newGroups = new Set(['k_java_frameworks', 'k_java_fw_javaweb', 'k_java_fw_spring', 'k_java_fw_spring_aop', 'k_java_fw_spring_ioc', 'k_java_fw_spring_mvc', 'k_java_fw_spring_boot', 'k_java_fw_spring_valid', 'k_java_fw_mybatis', 'k_java_fw_netty', 'k_java_fw_kafka', 'k_java_fw_rabbitmq', 'k_java_fw_springcloud', 'k_java_syntax_class_object']);
function regenerateBinds(parent) {
  for (const child of parent.children ?? []) {
    if (child.nodeRef && (newRefs.has(child.nodeRef) || newGroups.has(child.nodeRef))) {
      upsertEdge({ id: `treebind:${parent.id}:${child.id}`, source: parent.nodeRef, target: child.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
    }
    regenerateBinds(child);
  }
}
regenerateBinds(tree);

const semanticEdges = [
  { id: 'edge_netty_implements_reactor', source: sid('Netty/02-Reactor与线程模型.md'), target: 'k_reactor_overview', type: 'implements', label: 'Netty 是主从 Reactor 模型的工程化实现', relationKind: 'dependency', dimensions: ['java', 'network'] },
  { id: 'edge_netty_builds_on_nio', source: sid('Netty/01-Netty定位与通信抽象.md'), target: 'k_java_io_nio', type: 'related-to', label: 'Netty 基于 Java NIO 封装', relationKind: 'dependency', dimensions: ['java'] },
  { id: 'edge_vault_cap_relates_cap', source: sid('CAP原理和BASE理论.md'), target: 'k_1784728125540_wmcdvv', type: 'related-to', label: 'CAP 原则与 BASE 理论是 CAP 定理的展开', relationKind: 'reference', dimensions: ['distributed'] },
  { id: 'edge_vault_classloading_relates', source: sid('JVM/02-类加载机制.md'), target: 'k_1782820185793_jpet7h', type: 'related-to', label: '类加载机制学习笔记对应类加载机制主题', relationKind: 'reference', dimensions: ['java'] },
  { id: 'edge_vault_threadpool_relates_executor', source: sid('多线程/线程池.md'), target: 'k_1785898835766_erx4pw', type: 'related-to', label: '线程池详解对应 Executor 框架', relationKind: 'reference', dimensions: ['java'] },
  { id: 'edge_vault_synchronized_relates_locks', source: sid('关键字/Synchronized.md'), target: 'k_1785840586940_eqi4sb', type: 'related-to', label: 'Synchronized 关联锁升级', relationKind: 'reference', dimensions: ['java'] },
  { id: 'edge_vault_collections_implements_ds', source: sid('Java 集合框架.md'), target: dataStruct, type: 'implements', label: 'Java 集合框架是数据结构的标准库实现', relationKind: 'dependency', dimensions: ['java'] },
  { id: 'edge_vault_socket_bio', source: sid('Java 网络编程.md'), target: 'k_io_bio_model', type: 'related-to', label: 'Java Socket 网络编程即 BIO 编程方式', relationKind: 'reference', dimensions: ['java'] },
];
for (const e of semanticEdges) upsertEdge(e);

// ========== 完整性校验 ==========
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(`tree ${n.id} refs missing ${n.nodeRef}`); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) {
  if (!pool[e.source] && !preexistingDangling.has(e.source)) problems.push(`edge ${e.id} source missing: ${e.source}`);
  if (!pool[e.target] && !preexistingDangling.has(e.target)) problems.push(`edge ${e.id} target missing: ${e.target}`);
}
// 每个新节点必须挂树
for (const c of created) {
  if (!findTreeByRef(tree, c.id)) problems.push(`created node not in tree: ${c.id} (${c.title})`);
}
if (problems.length) {
  problems.slice(0, 30).forEach((p) => console.error('PROBLEM:', p));
  throw new Error(`integrity check failed: ${problems.length}`);
}

// ========== 写回 ==========
const atomicWrite = (file, obj) => {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
};
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);

console.log(`import-obsidian-java-vault complete:
  - created nodes: ${created.length} (+ ${newGroups.size - 1} groups)
  - 通用算法 → 计算理论/算法域: 8
  - 分布式 → 系统组织/分布式系统: 7
  - JVM → 执行系统/jvm: 6 | 并发 → java并发编程: 9
  - 语法 → Java syntax: 13 (含类与对象组10) | 集合 → 集合框架: 6 | 类库 → 常用类库: 6
  - 框架和中间件 新主题: ${created.filter((c) => c.file.startsWith('Java框架和中间件')).length} 节点
  - 跳过导航/历史桩与已覆盖的 NIO 系列: 14 文件
  - 图片: 39 张已全部转写为文字`);
