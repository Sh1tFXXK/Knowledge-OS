import { TimelineFacet, type TimelineAnnotation } from './timelineEvolution.ts';

const SPRING = {
  ioc: 'k_vault_javaspring01ioc_1haton',
  mvc: 'k_vault_javaspring04springmvc_133lis',
  configuration: 'k_vault_javaspring06_1868fr',
  spring4: 'k_vault_javaspringspring4_bn9s51',
  spring5: 'k_vault_javaspringspring5_qbo2d2',
  web: 'k_vault_javaspringweb_dxr6ot',
  jsr310: 'k_vault_javaspringjsr310api_17qbfx',
  validation: 'k_vault_javaspringbeanvalidation11springmvc_1b3bqh',
  webflux: 'k_1784462055382_w4thg2',
} as const;

/**
 * Curated cross-node annotations are data, not a Spring-specific renderer.
 * The same annotation shape can describe improvements in any knowledge domain.
 */
export const BUILT_IN_TIMELINE_ANNOTATIONS: TimelineAnnotation[] = [
  {
    id: 'annotation:spring:4',
    title: 'Spring 4',
    capturedAt: Date.UTC(2013, 11, 12),
    scopeNodeId: 'k_java_fw_spring',
    sourceOnlyNodeIds: [SPRING.spring4, SPRING.web],
    introducedNodes: [
      { nodeId: SPRING.jsr310, parentNodeId: SPRING.mvc },
      { nodeId: SPRING.validation, parentNodeId: SPRING.mvc },
    ],
    summary: 'Spring 4 保留原有容器和 MVC 职责，同时扩展类型安全、Web 表达、验证与日期处理。',
    changes: [
      {
        targetNodeId: SPRING.ioc,
        sourceNodeIds: [SPRING.spring4],
        facet: TimelineFacet.Content,
        label: 'IoC 容器能力',
        before: '容器负责创建、装配和管理对象。',
        after: '泛型限定式注入、@Nullable 和函数式 ApplicationContext 让同一职责更易表达。',
      },
      {
        targetNodeId: SPRING.mvc,
        sourceNodeIds: [SPRING.spring4, SPRING.web],
        facet: TimelineFacet.Content,
        label: 'Spring MVC Web 层',
        before: 'DispatcherServlet 组织路由、参数绑定和响应处理。',
        after: '@RestController、Servlet 3.1、异步 REST 和不可变对象绑定扩展了同一条请求链路。',
      },
      {
        targetNodeId: SPRING.mvc,
        sourceNodeIds: [SPRING.validation],
        facet: TimelineFacet.Content,
        label: 'MVC 参数校验',
        before: '参数校验容易散落在控制器业务代码中。',
        after: 'Bean Validation 1.1 接入 MVC，校验边界可以统一放在参数绑定之后。',
      },
      {
        targetNodeId: SPRING.configuration,
        sourceNodeIds: [SPRING.spring4],
        facet: TimelineFacet.Structure,
        label: '配置入口',
        before: 'XML、注解和 Java Config 表达 BeanDefinition。',
        after: '继续保留声明式配置，同时增加 Groovy Bean DSL、脚本和更灵活的注册入口。',
      },
      {
        targetNodeId: SPRING.mvc,
        sourceNodeIds: [SPRING.jsr310],
        facet: TimelineFacet.Content,
        label: '日期时间类型',
        before: 'Web 参数主要围绕旧 Date 类型处理。',
        after: 'LocalDateTime 等 JSR-310 类型可以进入参数绑定和格式化链路。',
      },
    ],
  },
  {
    id: 'annotation:spring:5',
    title: 'Spring 5',
    capturedAt: Date.UTC(2017, 8, 28),
    scopeNodeId: 'k_java_fw_spring',
    sourceOnlyNodeIds: [SPRING.spring5],
    introducedNodes: [
      { nodeId: SPRING.webflux, parentNodeId: SPRING.mvc },
    ],
    summary: 'Spring 5 没有推翻原知识骨架，而是把运行基线升级到 Java 8，并为 Web 增加响应式路径。',
    changes: [
      {
        targetNodeId: SPRING.ioc,
        sourceNodeIds: [SPRING.spring5],
        facet: TimelineFacet.Metadata,
        label: '运行基线',
        before: '容器在旧 Java 平台上提供通用对象管理。',
        after: '框架以 Java 8 为基线，并支持候选组件索引来减少运行时扫描。',
      },
      {
        targetNodeId: SPRING.mvc,
        sourceNodeIds: [SPRING.spring5],
        facet: TimelineFacet.Content,
        label: 'Web 执行路径',
        before: 'Spring Web 主要沿用阻塞式 MVC 请求模型。',
        after: '新增 WebFlux，在同一 Spring Web 领域提供 reactive、异步非阻塞和 event-loop 路径。',
      },
      {
        targetNodeId: SPRING.configuration,
        sourceNodeIds: [SPRING.spring5],
        facet: TimelineFacet.Metadata,
        label: '基础设施适配',
        before: '配置驱动模型与具体日志实现耦合较多。',
        after: 'spring-jcl 等基础设施提供更统一的日志抽象，应用模型保持不变。',
      },
    ],
  },
];
