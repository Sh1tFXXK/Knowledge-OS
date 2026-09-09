import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

const tree = JSON.parse(fs.readFileSync(path.join(dataDir, 'tree-data.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(path.join(dataDir, 'node-pool.json'), 'utf8'));
const edgesJson = JSON.parse(fs.readFileSync(path.join(dataDir, 'knowledge-edges.json'), 'utf8'));
const edges = Array.isArray(edgesJson) ? edgesJson : (edgesJson.edges ?? Object.values(edgesJson));
const questions = JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8'));

// ============ 通用工具 ============
function findSubtree(node, targetId) {
  if (node.id === targetId) return node;
  for (const c of node.children || []) {
    const found = findSubtree(c, targetId);
    if (found) return found;
  }
  return null;
}
function detach(node, childId) {
  if (!node.children) return null;
  const i = node.children.findIndex((c) => c.id === childId);
  if (i === -1) return null;
  return node.children.splice(i, 1)[0];
}
function removeNodeAndEdges(treeNodeId, poolId) {
  // 从树上摘除
  const visit = (n) => {
    if (n.children) n.children = n.children.filter((c) => c.id !== treeNodeId);
    n.children?.forEach(visit);
  };
  visit(tree);
  delete pool[poolId];
  for (let i = edges.length - 1; i >= 0; i -= 1) {
    const e = edges[i];
    if (e.source === poolId || e.target === poolId) edges.splice(i, 1);
  }
}
function addConcept({ parentTreeId, parentPoolId, treeId, poolId, name, tags, content, rootContent, role = 'concept' }) {
  const parent = findSubtree(tree, parentTreeId);
  if (!parent) throw new Error(`parent tree ${parentTreeId} not found`);
  parent.children.push({ id: treeId, name, count: 0, nodeRef: poolId });
  pool[poolId] = {
    id: poolId, label: name, role, dimensions: ['java', 'Spring'], tags, parentId: parentPoolId,
    card: { nodeId: poolId, title: name, tabs: [{ id: 'def', label: '定义', content }], rootContent },
  };
  edges.push({
    id: `treebind:${parentTreeId}:${treeId}`,
    source: parentPoolId, target: poolId,
    type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'],
  });
}
function addQuestion({ id, text, kind, answer, relatedNodeId, difficulty = 'intermediate' }) {
  const existing = questions.find((q) => q.id === id || q.text === text);
  if (existing) {
    if (answer && (!existing.answer || existing.answer.length < answer.length)) existing.answer = answer;
    if (relatedNodeId) existing.relatedNodeId = relatedNodeId;
    return existing;
  }
  const now = Date.now();
  const q = { id, text, answered: true, relatedNodeId, createdAt: now, updatedAt: now, answer, kind, difficulty };
  questions.push(q);
  return q;
}

const MVC_TREE = 'tree_java_fw_spring_mvc';
const MVC_POOL = 'k_java_fw_spring_mvc';
const BOOT_TREE = 'tree_java_fw_spring_boot';
const BOOT_POOL = 'k_java_fw_spring_boot';

// ============ 1. Spring 如何保证并发 Controller 的安全 ============
// 该节点的知识已完整拆入 6 张问题卡（挂在 SpringMVC 节点）——直接删节点即可。
removeNodeAndEdges('tree_vault_javaspringspringmvcspringcontroller_1aryyx', 'k_vault_javaspringspringmvcspringcontroller_1aryyx');
// 主问题卡 answer 已 806 字（覆盖单例问题/三种方案/最佳实践），确认挂 SpringMVC
const qMain = questions.find((q) => q.id === 'q_1788755986932_4q2g8n');
if (qMain) qMain.relatedNodeId = MVC_POOL;

// ============ 2. SpringMVC 面试题 ============
// 内容是 7 个问答：核心组件→已有节点可挂、工作流程→已有原理节点、注解区别→问题卡、参数绑定→概念节点、RESTful→概念节点
removeNodeAndEdges('tree_vault_javaspringspringmvcmvc_1qc9ok', 'k_vault_javaspringspringmvcmvc_1qc9ok');

// 核心组件：拆成 5 个概念节点（SpringMVC 下）
const components = [
  ['tree_mvc_dispatcher', 'mvc_dispatcher', 'DispatcherServlet', '**DispatcherServlet**：前端控制器，Spring MVC 整个请求流程的中心——所有请求先到达它，再由它调度 HandlerMapping / HandlerAdapter / ViewResolver 完成处理。'],
  ['tree_mvc_handlermapping', 'mvc_handlermapping', 'HandlerMapping', '**HandlerMapping**：处理器映射器——根据请求 URL 找到对应的 Handler（Controller）。'],
  ['tree_mvc_handleradapter', 'mvc_handleradapter', 'HandlerAdapter', '**HandlerAdapter**：处理器适配器——适配不同处理器的执行方式，DispatcherServlet 通过它调用 Handler 执行业务逻辑，返回 ModelAndView。'],
  ['tree_mvc_viewresolver', 'mvc_viewresolver', 'ViewResolver', '**ViewResolver**：视图解析器——解析视图名称，定位具体 View 进行渲染。'],
  ['tree_mvc_view', 'mvc_view', 'View', '**View**：视图——根据 Model 数据渲染最终展示（JSP / Thymeleaf 等），将响应返回客户端。'],
];
for (const [treeId, poolId, name, content] of components) {
  addConcept({
    parentTreeId: MVC_TREE, parentPoolId: MVC_POOL, treeId, poolId, name,
    tags: [name, 'SpringMVC', 'java'], content, rootContent: content.replace(/\*\*/g, '').slice(0, 120),
  });
}

// 问答类 → 问题卡（挂 SpringMVC）
addQuestion({
  id: 'q_mvc_requestmapping_vs_getmapping', kind: 'comparison',
  text: '@RequestMapping 和 @GetMapping 有什么区别？',
  relatedNodeId: MVC_POOL,
  answer: '- **@GetMapping 是 @RequestMapping(method = RequestMethod.GET) 的特化**，只处理 GET 请求\n- **@RequestMapping 不指定 method 时可匹配所有 HTTP 方法**\n- 同族还有 @PostMapping / @PutMapping / @DeleteMapping / @PatchMapping\n\n建议：语义明确的场景优先用 @GetMapping 这类特化注解。',
});
addQuestion({
  id: 'q_mvc_param_binding', kind: 'application',
  text: 'Spring MVC 的参数绑定有哪些方式？',
  relatedNodeId: MVC_POOL,
  answer: '- **基本类型**：`@RequestParam`\n- **对象类型**：直接绑定（POJO 属性名与参数名对应）\n- **路径变量**：`@PathVariable`\n- **请求体**：`@RequestBody`（JSON 反序列化）',
});
addQuestion({
  id: 'q_mvc_restful_verbs', kind: 'recall',
  text: 'RESTful 风格中 HTTP 方法如何对应增删改查？',
  relatedNodeId: MVC_POOL,
  answer: '- **GET**：查询资源\n- **POST**：新增资源\n- **PUT**：更新资源\n- **DELETE**：删除资源\n\nRESTful 用 HTTP 方法表达操作语义，URL 只定位资源（名词），不再把动词写进 URL。',
});

// ============ 3. Spring Boot 面试题 ============
// 10 个问答：已有对应子节点/问题卡的全部转移，缺的建概念节点或问题卡
removeNodeAndEdges('tree_vault_javaspringspringboot_1cqrx6', 'k_vault_javaspringspringboot_1cqrx6');
// 注意：已有 q_1785042338801_rad1en「什么是spring boot？」(挂 k_java_fw_spring_boot)、q_1785057123754_jfhq3x「Spring boot有哪些优点？」
// JavaConfig 已有树节点 → 面试题内容并入其卡片
const javaConfig = pool['k_1785247674069_capddv'];
if (javaConfig && !JSON.stringify(javaConfig.card || {}).includes('面向对象的配置')) {
  javaConfig.card = javaConfig.card || { nodeId: 'k_1785247674069_capddv', title: 'JavaConﬁg', tabs: [] };
  javaConfig.card.tabs.push({
    id: 'def', label: '定义',
    content: '**JavaConfig**：Spring 提供的纯 Java 方法配置 IoC 容器的方式（Spring 社区产品）。\n\n优点：\n- 面向对象的配置\n- 减少或消除 XML 配置\n- 类型安全和重构友好',
  });
  javaConfig.card.rootContent = 'JavaConfig：纯 Java 方法配置 IoC 容器，面向对象、类型安全、消除 XML。';
}
// 热部署 → 已有节点 k_vault_javaspringspringboot_1rp75f；监视器 → 已有；安全性 → 已有 k_vault_javaspringspringboot_yjdx1u
// 缺的概念 → 问题卡（挂 Spring Boot）
addQuestion({
  id: 'q_boot_custom_port', kind: 'application',
  text: 'Spring Boot 如何在自定义端口上运行？',
  relatedNodeId: BOOT_POOL,
  answer: '在 application.properties 中指定端口：\n\n```properties\nserver.port=8090\n```\n\n或在 application.yml 中：\n\n```yaml\nserver:\n  port: 8090\n```',
});
addQuestion({
  id: 'q_boot_yaml', kind: 'definition',
  text: '什么是 YAML？Spring Boot 为什么常用它做配置？',
  relatedNodeId: BOOT_POOL,
  answer: '**YAML** 是一种人类可读的数据序列化语言，常用于配置文件。\n\nSpring Boot 中 application.yml 相比 application.properties 的优势：\n- 层级结构清晰（缩进表达嵌套）\n- 同名前缀不重复书写\n- 一个文件表达多 profile（`---` 分隔）',
});
addQuestion({
  id: 'q_boot_profiles', kind: 'definition',
  text: '什么是 Spring Profiles？',
  relatedNodeId: BOOT_POOL,
  answer: '**Spring Profiles** 允许根据配置文件（dev / test / prod 等）注册不同的 Bean——同一套代码在不同环境启用不同实现。\n\n用法：`@Profile("dev")` 标注 Bean 或配置类；`spring.profiles.active=dev` 激活环境。',
});
addQuestion({
  id: 'q_boot_swagger', kind: 'definition',
  text: 'Spring Boot 项目中 Swagger 是什么？怎么用？',
  relatedNodeId: BOOT_POOL,
  answer: '**Swagger** 广泛用于可视化 API——Swagger UI 为前端开发人员提供在线接口沙箱。\n\n前后端分离项目推荐使用 Swagger 维护接口文档（引入 springdoc-openapi 或 springfox 依赖），替代手写文档的同步负担。',
});
// 「如何重新加载更改」→ 热部署问题卡已存在 q_1785246364497_undaz5，补 answer
const qReload = questions.find((q) => q.id === 'q_1785246364497_undaz5');
if (qReload && !qReload.answer) {
  qReload.answer = '使用 **devtools** 实现热部署：引入 spring-boot-starter-devtools 依赖（optional=true），devtools 监视类路径资源，类文件变更即触发快速重启（Eclipse 保存即触发；IDEA 需 Build -> Make Project）。可通过 spring.devtools.restart.exclude 自定义排除路径、触发文件控制重启时机、spring.devtools.restart.enabled=false 禁用。';
}

// ============ 4. Spring Boot 其他大杂烩节点拆解 ============
// 4a. Spring Boot 与 Spring 对比 —— 名字就是对比问题
removeNodeAndEdges('tree_vault_javaspringspringbootspring_tdf3nn', 'k_vault_javaspringspringbootspring_tdf3nn');
const qVsSpring = questions.find((q) => q.id === 'q_1788844234363_c2i9a9');
if (qVsSpring) {
  qVsSpring.relatedNodeId = BOOT_POOL;
  if (!qVsSpring.answer.includes('| 特性 |')) {
    qVsSpring.answer += '\n\n### 改进点\n\n1. **独立应用**：可建立独立的 Spring 应用程序\n2. **内嵌容器**：内嵌 Tomcat / Jetty / Undertow，无需部署 WAR\n3. **简化配置**：无需繁琐 XML\n4. **自动配置**：XML 改 Java 配置、@Autowired 注解注入、多配置浓缩到 application.yml\n5. **便捷功能**：度量工具、表单校验、外部化配置\n6. **简化依赖**：starter POM 自动引入并管理依赖版本\n\n### 对比表\n\n| 特性 | Spring | Spring Boot |\n|-----|--------|-------------|\n| 配置方式 | XML配置为主 | Java配置 + 自动配置 |\n| 依赖管理 | 手动管理 | 自动版本管理 |\n| 服务器部署 | 需要WAR包 | 内嵌服务器 |\n| 启动方式 | 部署到容器 | 直接运行 |\n| 开发效率 | 配置繁琐 | 快速入门 |';
  }
}
// 4b. Spring Boot（维基）1656 字大杂烩 → 拆成特性概念节点；@SpringBootApplication 等已有自动配置/JavaConfig 承载，保留维基节点但精简为概览
const wiki = pool['k_java_fw_springboot_wiki_concept'];
wiki.card.tabs = [{
  id: 'def', label: '定义',
  content: '**Spring Boot**：Spring 的"约定优于配置"解决方案，用于创建独立的、生产级的、可直接运行的 Spring 应用程序——经 Spring 团队"意见化视图"预配置，最小化配置烦恼。\n\n核心特性：\n- 创建独立的 Spring 应用程序\n- 直接嵌入 Tomcat / Jetty / Undertow（无需部署 WAR）\n- 提供"入门" starter POM 简化 Maven/Gradle 配置\n- 尽可能自动配置 Spring 与第三方库\n- 生产就绪功能：度量、健康检查、外部化配置\n- 无需代码生成、无需 XML 配置\n- 可选支持 Kotlin 与 Groovy\n\n启动注解 **@SpringBootApplication** = @SpringBootConfiguration（@Configuration 特化）+ @EnableAutoConfiguration（开启自动配置）+ @ComponentScan（组件扫描）。配置属性写入 application.properties 或 application.yml（如 server.port、spring.application.name）。Spring Boot 自动配置 DispatcherServlet，无需手动配置。',
}];
wiki.card.rootContent = 'Spring Boot：约定优于配置的 Spring 快速开发方案，独立运行、内嵌服务器、自动配置、starter 依赖管理、生产就绪特性。';

// 4c. Spring Boot 原理 —— 保留（核心设计思想+自动配置原理，与自动配置节点分工明确），精简去链接尾巴
const principle = pool['k_vault_javaspringspringboot_lhipgq'];
for (const t of principle.card.tabs || []) {
  t.content = t.content.replace(/\n---\n\n## 相关链接[\s\S]*$/, '');
}

// 4d. Spring Boot 安全 —— 内容三块：安全实现（留）、Spring Security vs Shiro（对比→问题卡）、跨域/CSRF（概念节点）
const securityPool = 'k_vault_javaspringspringboot_yjdx1u';
const sec = pool[securityPool];
const secTreeId = 'tree_vault_javaspringspringboot_yjdx1u';
// 对比入问题卡
addQuestion({
  id: 'q_boot_security_vs_shiro', kind: 'comparison',
  text: 'Spring Security 和 Apache Shiro 有什么区别？怎么选？',
  relatedNodeId: securityPool,
  answer: '**Spring Security**：重量级安全管理框架——概念复杂、配置繁琐、功能强大（完整覆盖认证/授权/攻击防护，与 Spring 生态深度集成）。\n\n**Apache Shiro**：轻量级安全管理框架——概念简单、配置简单、功能相对简单。\n\n**建议**：Spring Boot 项目一般选 Spring Security。',
});
// 跨域、CSRF 拆成概念节点（挂 Spring Boot 安全）
sec.card.tabs = [{
  id: 'def', label: '定义',
  content: '**Spring Boot 安全**：引入 `spring-boot-starter-security` 依赖并添加安全配置即可启用。\n\n```java\n@Configuration\n@EnableWebSecurity\npublic class SecurityConfig extends WebSecurityConfigurerAdapter {\n    @Override\n    protected void configure(HttpSecurity http) throws Exception {\n        // 配置安全策略\n    }\n}\n```\n\n子节点：跨域（CORS）、CSRF 攻击；框架对比见问题卡「Spring Security 和 Apache Shiro 有什么区别」。',
}];
sec.card.rootContent = 'Spring Boot 安全：spring-boot-starter-security 依赖 + SecurityConfig 配置；涵盖跨域、CSRF 等主题。';
addConcept({
  parentTreeId: secTreeId, parentPoolId: securityPool,
  treeId: 'tree_boot_cors', poolId: 'boot_cors', name: '跨域（CORS）',
  tags: ['CORS', '跨域', 'Spring Boot', 'java'],
  content: '**跨域（CORS）**：浏览器同源策略限制下的资源访问机制。Spring Boot 中实现 `WebMvcConfigurer` 接口重写 `addCorsMappings` 解决：\n\n```java\n@Override\npublic void addCorsMappings(CorsRegistry registry) {\n    registry.addMapping("/**")\n            .allowedOrigins("*")\n            .allowedMethods("GET", "POST", "PUT", "DELETE");\n}\n```',
  rootContent: '跨域（CORS）：实现 WebMvcConfigurer.addCorsMappings 配置允许的源与方法。',
});
addConcept({
  parentTreeId: secTreeId, parentPoolId: securityPool,
  treeId: 'tree_boot_csrf', poolId: 'boot_csrf', name: 'CSRF 攻击',
  tags: ['CSRF', '安全', 'Spring Boot', 'java'],
  content: '**CSRF（Cross-Site Request Forgery，跨站请求伪造）**：一种攻击，迫使已通过身份验证的最终用户在当前 Web 应用上执行非本意的操作。\n\nSpring Security 默认开启 CSRF 防护（同步令牌模式）；REST API 场景（无状态、token 认证）常通过 `http.csrf().disable()` 关闭。',
  rootContent: 'CSRF 攻击：跨站请求伪造，迫使已认证用户执行非本意操作；Spring Security 默认开启令牌防护。',
});

// 4e. Spring Boot 整合第三方 —— 各整合项拆成子节点
const integTreeId = 'tree_vault_javaspringspringboot_g9wkoh';
const integPoolId = 'k_vault_javaspringspringboot_g9wkoh';
const integ = pool[integPoolId];
integ.card.tabs = [{
  id: 'def', label: '定义',
  content: '**Spring Boot 整合第三方**：通过 starter 快速集成各类技术栈——Spring Data（数据访问）、Spring Batch（批处理）、WebSockets（实时通信）、消息中间件（ActiveMQ / Kafka）、Swagger（接口文档）。',
}];
integ.card.rootContent = 'Spring Boot 整合第三方技术栈：Spring Data、Spring Batch、WebSockets、ActiveMQ/Kafka、Swagger。';
addConcept({
  parentTreeId: integTreeId, parentPoolId: integPoolId,
  treeId: 'tree_boot_spring_data', poolId: 'boot_spring_data', name: 'Spring Data',
  tags: ['Spring Data', '数据访问', 'Spring Boot', 'java'],
  content: '**Spring Data**：Spring 子项目，简化数据库访问，同时支持 NoSQL 与关系数据存储。\n\n**NoSQL**：MongoDB（文档）、Neo4j（图形）、Redis（键/值）、HBase（列族）。\n**关系型**：JDBC、JPA。',
  rootContent: 'Spring Data：简化数据库访问，支持 MongoDB/Neo4j/Redis/HBase 与 JDBC/JPA。',
});
addConcept({
  parentTreeId: integTreeId, parentPoolId: integPoolId,
  treeId: 'tree_boot_spring_batch', poolId: 'boot_spring_batch', name: 'Spring Batch',
  tags: ['Spring Batch', '批处理', 'Spring Boot', 'java'],
  content: '**Spring Batch**：处理大量记录的可重用函数库：日志/跟踪、事务管理、作业处理统计、作业重新启动、跳过和资源管理。',
  rootContent: 'Spring Batch：大批量记录处理框架，提供事务、重启、统计、跳过等企业级批处理能力。',
});
addConcept({
  parentTreeId: integTreeId, parentPoolId: integPoolId,
  treeId: 'tree_boot_websockets', poolId: 'boot_websockets', name: 'WebSockets',
  tags: ['WebSocket', '实时通信', 'Spring Boot', 'java'],
  content: '**WebSocket**：通过单个 TCP 连接提供全双工通信信道的计算机通信协议。\n\n特点：双向通信、全双工、单 TCP 连接、轻量级数据交换。',
  rootContent: 'WebSocket：单 TCP 连接上的全双工双向通信协议。',
});
addConcept({
  parentTreeId: integTreeId, parentPoolId: integPoolId,
  treeId: 'tree_boot_messaging', poolId: 'boot_messaging', name: '消息中间件（ActiveMQ / Kafka）',
  tags: ['ActiveMQ', 'Kafka', '消息队列', 'Spring Boot', 'java'],
  content: '**消息中间件整合**：\n\n- **ActiveMQ**：引入 spring-boot-starter-activemq 依赖即可集成\n- **Apache Kafka**：分布式发布-订阅消息系统——可扩展、容错、适合离线和在线消息消费',
  rootContent: 'Spring Boot 消息中间件：ActiveMQ（starter 集成）与 Kafka（分布式发布-订阅，可扩展、容错）。',
});

// 4f. Spring Boot 其他核心功能 —— 各功能入问题卡/概念节点
removeNodeAndEdges('tree_vault_javaspringspringboot_1tusfd', 'k_vault_javaspringspringboot_1tusfd');
// 已挂其上的 4 张问题卡转移
for (const q of questions) {
  if (['q_1785042566281_wc7kxu','q_1785246395052_lt6y61','q_1785246930859_kbddjz','q_1785247494348_ci5h4g','q_1785248218802_r14wgv'].includes(q.id)) {
    q.relatedNodeId = BOOT_POOL;
  }
}
// Starter 概念节点
addConcept({
  parentTreeId: BOOT_TREE, parentPoolId: BOOT_POOL,
  treeId: 'tree_boot_starter', poolId: 'boot_starter', name: 'Starter',
  tags: ['Starter', 'Spring Boot', 'java'],
  content: '**Starter**：Spring Boot 的依赖场景打包——一个 starter 提供一个自动化配置类（一般命名 XXXAutoConfiguration）及一系列默认配置，开发者只需引入依赖即可直接使用，无需关心版本组合（由 parent 统一管理）。\n\n常见：spring-boot-starter-web / data-jpa / security / test / actuator / devtools。',
  rootContent: 'Starter：Spring Boot 场景化依赖包，引入即用，自动配置 + 默认值。',
});
// 剩余小问答 → 问题卡
addQuestion({
  id: 'q_boot_parent_role', kind: 'recall',
  text: 'spring-boot-starter-parent 有什么作用？',
  relatedNodeId: BOOT_POOL,
  answer: '1. 定义 Java 编译版本（1.8）\n2. UTF-8 编码格式\n3. 继承 spring-boot-dependencies，统一管理依赖版本\n4. 执行打包操作的配置\n5. 自动化资源过滤（含 application.properties / application.yml 的资源过滤）',
});
addQuestion({
  id: 'q_boot_jar_vs_jar', kind: 'comparison',
  text: 'Spring Boot 打的 jar 和普通 jar 有什么区别？',
  relatedNodeId: BOOT_POOL,
  answer: '- **Spring Boot jar 是可执行 jar**：内嵌依赖与启动器，可通过 `java -jar` 直接运行\n- **不可以作为普通 jar 被其他项目依赖**（结构为 BOOT-INF/classes + BOOT-INF/lib，非标准布局）\n- 普通 jar 供他人依赖；需要被依赖时 Spring Boot 项目应打 classifier 或改打 WAR',
});
addQuestion({
  id: 'q_boot_exception_handling', kind: 'application',
  text: 'Spring Boot 如何做全局异常处理？',
  relatedNodeId: BOOT_POOL,
  answer: '使用 `@ControllerAdvice` + `@ExceptionHandler` 集中处理：\n\n```java\n@ControllerAdvice\npublic class GlobalExceptionHandler {\n    @ExceptionHandler(BusinessException.class)\n    public Result<Void> handle(BusinessException e) { /* 统一返回错误码 */ }\n}\n```\n\n避免每个 Controller 重复 try-catch。',
});
addQuestion({
  id: 'q_boot_pagination', kind: 'application',
  text: 'Spring Boot 如何实现分页和排序？',
  relatedNodeId: BOOT_POOL,
  answer: 'Spring Data-JPA 提供内置支持，方法参数传 Pageable 即可：\n\n```java\nPage<User> findAll(Pageable pageable);\n```\n\nPageable 含页码、页大小、Sort 排序条件；返回 Page 带总记录数与分页元信息。',
});
addQuestion({
  id: 'q_boot_scheduled', kind: 'application',
  text: 'Spring Boot 如何实现定时任务？',
  relatedNodeId: BOOT_POOL,
  answer: '两种方式：\n1. **@Scheduled 注解**（@EnableScheduling 开启）：适合简单场景\n   ```java\n   @Scheduled(cron = "0 0 2 * * ?")\n   public void backup() { ... }\n   ```\n2. **Quartz 框架**：适合需要持久化、misfire 策略、动态调度的复杂场景',
});
addQuestion({
  id: 'q_boot_session_share', kind: 'application',
  text: '微服务下 Spring Boot 如何实现 Session 共享？',
  relatedNodeId: BOOT_POOL,
  answer: '使用 **Spring Session + Redis**：\n\n- 引入 spring-session-data-redis\n- 配置 spring.session.store-type=redis\n- HttpSession 由 Spring Session 接管，实际存储在 Redis\n\n任一实例登录后，其他实例都能读到同一 Session，天然支持水平扩展。',
});

// ============ 保存 ============
fs.writeFileSync(path.join(dataDir, 'tree-data.json'), JSON.stringify(tree, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'node-pool.json'), JSON.stringify(pool, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'knowledge-edges.json'), JSON.stringify(edges, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'questions.json'), JSON.stringify(questions, null, 2) + '\n');

// ============ 验证 ============
const mvcAfter = findSubtree(tree, MVC_TREE);
const bootAfter = findSubtree(tree, BOOT_TREE);
console.log('✓ SpringMVC children:', mvcAfter.children.map((c) => c.name).join(', '));
console.log('✓ Spring Boot children:', bootAfter.children.map((c) => c.name).join(', '));
console.log('✓ 删除的节点确认:', ['k_vault_javaspringspringmvcspringcontroller_1aryyx','k_vault_javaspringspringmvcmvc_1qc9ok','k_vault_javaspringspringboot_1cqrx6','k_vault_javaspringspringbootspring_tdf3nn','k_vault_javaspringspringboot_1tusfd'].every((id) => !pool[id]));
const missing = [];
const walk = (n) => { if (n.nodeRef && !pool[n.nodeRef]) missing.push(n.nodeRef); (n.children || []).forEach(walk); };
walk(tree);
console.log('✓ 树引用悬空:', missing.length);
const danglingQ = questions.filter((q) => q.relatedNodeId && !pool[q.relatedNodeId]);
console.log('✓ 问题卡悬空:', danglingQ.length, danglingQ.slice(0, 3).map((q) => q.id + '->' + q.relatedNodeId));
