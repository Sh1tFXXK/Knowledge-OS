import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');
// 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Framework > 模块 > 模型–视图–控制器框架
const MVC_TREE_ID = 'tree_1784461463664_gj6m4f';
const MVC_NODE_ID = 'k_1784461463543_at67h0';

const ROOT_NODE_ID = 'k_springmvc_nine_components';
const ROOT_TREE_ID = 'tree_springmvc_nine_components';
const TAGS = ['spring', 'springmvc', 'web'];

const components = [
  {
    id: 'k_springmvc_multipart_resolver',
    treeId: 'tree_springmvc_multipart_resolver',
    label: 'MultipartResolver 文件处理器',
    initMethod: 'initMultipartResolver(context)',
    description: '用于处理上传请求。',
  },
  {
    id: 'k_springmvc_locale_resolver',
    treeId: 'tree_springmvc_locale_resolver',
    label: 'LocaleResolver 当前环境处理器',
    initMethod: 'initLocaleResolver(context)',
    description:
      'SpringMVC 主要有两个地方用到了 Locale：\n\n一是 ViewResolver 视图解析的时候；\n\n二是用到国际化资源或者主题的时候。',
  },
  {
    id: 'k_springmvc_theme_resolver',
    treeId: 'tree_springmvc_theme_resolver',
    label: 'ThemeResolver 主题处理器',
    initMethod: 'initThemeResolver(context)',
    description: '用于解析主题。也就是解析样式、图片及它们所形成的显示效果的集合。',
  },
  {
    id: 'k_springmvc_handler_mapping',
    treeId: 'tree_springmvc_handler_mapping',
    label: 'HandlerMapping 处理器映射器',
    initMethod: 'initHandlerMappings(context)',
    description:
      '在 SpringMVC 中会有很多请求，每个请求都需要一个 Handler 处理。HandlerMapping 的作用便是找到请求相应的处理器 Handler 和 Interceptor。',
    core: true,
  },
  {
    id: 'k_springmvc_handler_adapter',
    treeId: 'tree_springmvc_handler_adapter',
    label: 'HandlerAdapter 处理器适配器',
    initMethod: 'initHandlerAdapters(context)',
    description:
      '从名字上看，它就是一个适配器。HandlerAdapter 要做的事情就是如何让固定的 Servlet 处理方法调用灵活的 Handler 来进行处理。',
    core: true,
  },
  {
    id: 'k_springmvc_handler_exception_resolver',
    treeId: 'tree_springmvc_handler_exception_resolver',
    label: 'HandlerExceptionResolver 异常处理器',
    initMethod: 'initHandlerExceptionResolvers(context)',
    description: '它的主要作用是处理其他组件产生的异常情况。',
  },
  {
    id: 'k_springmvc_request_to_view_name_translator',
    treeId: 'tree_springmvc_request_to_view_name_translator',
    label: 'RequestToViewNameTranslator 视图名称翻译器',
    initMethod: 'initRequestToViewNameTranslator(context)',
    description:
      '它的作用是从请求中获取 ViewName。有的 Handler 处理完后并没有设置 View 也没有设置 ViewName，这时就需要从 request 中获取，而 RequestToViewNameTranslator 就是为 request 提供获取 ViewName 的实现。',
  },
  {
    id: 'k_springmvc_view_resolvers',
    treeId: 'tree_springmvc_view_resolvers',
    label: 'ViewResolvers 页面渲染处理器',
    initMethod: 'initViewResolvers(context)',
    description:
      'ViewResolvers 的主要作用是将 String 类型的视图名和 Locale 解析为 View 类型的视图。',
    core: true,
  },
  {
    id: 'k_springmvc_flash_map_manager',
    treeId: 'tree_springmvc_flash_map_manager',
    label: 'FlashMapManager 参数传递管理器',
    initMethod: 'initFlashMapManager(context)',
    description:
      '在实际应用中，为了避免重复提交，我们可以在处理完 post 请求后重定向到另外一个 get 请求，这个 get 请求可以用来返回页面渲染需要的信息。FlashMap 就是用于这种请求重定向场景中的参数传递。',
  },
];

const flowEdges = [
  flow(
    'edge_springmvc_mapping_to_adapter',
    'k_springmvc_handler_mapping',
    'k_springmvc_handler_adapter',
    '找到 Handler 后交由 HandlerAdapter 调用',
  ),
  flow(
    'edge_springmvc_adapter_to_viewresolver',
    'k_springmvc_handler_adapter',
    'k_springmvc_view_resolvers',
    '返回 ModelAndView，视图名交给 ViewResolver 解析',
  ),
  dependency(
    'edge_springmvc_viewresolver_needs_locale',
    'k_springmvc_view_resolvers',
    'k_springmvc_locale_resolver',
    '视图解析时需要 Locale',
  ),
  dependency(
    'edge_springmvc_viewname_fallback',
    'k_springmvc_view_resolvers',
    'k_springmvc_request_to_view_name_translator',
    'Handler 未设置 ViewName 时从请求中获取',
  ),
];

function flow(id, source, target, label) {
  return { id, source, target, type: 'leads-to', label, relationKind: 'causality' };
}

function dependency(id, source, target, label) {
  return { id, source, target, type: 'depends-on', label, relationKind: 'dependency' };
}

const rootContent = `SpringMVC 是一种基于 Java 语言开发，实现了 Web MVC 设计模式、请求驱动类型的轻量级 Web 框架。它采用 MVC 架构模式的思想，通过把 Model、View、Controller 分离，将 Web 层进行职责解耦，从而把复杂的 Web 应用分成逻辑清晰的几个组件。DispatcherServlet 在初始化时依次初始化九大组件。

涉及请求处理响应的核心组件是：

1. HandlerMapping
2. HandlerAdapter
3. ViewResolver

整体执行流程：

1. HandlerMapping 找到 Handler 后交由 HandlerAdapter 调用
2. HandlerAdapter 会返回 ModelAndView
3. ModelAndView 根据用户传入参数得到 ViewResolvers
4. ViewResolvers 会将用户传入的参数封装为 View，交给引擎进行渲染

注意：大家最熟悉的两个类 ModelAndView 和 View 并不属于 Spring MVC 九大组件之列。`;

async function readJson(name) {
  return JSON.parse(await readFile(resolve(DATA_DIR, name), 'utf8'));
}

async function writeJsonAtomic(name, data) {
  const target = resolve(DATA_DIR, name);
  const temporary = `${target}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function upsertEdge(edges, edge) {
  const index = edges.findIndex((candidate) => candidate.id === edge.id);
  if (index >= 0) edges[index] = edge;
  else edges.push(edge);
}

function upsertTreeChild(parent, child) {
  parent.children ??= [];
  if (!parent.children.some((candidate) => candidate.nodeRef === child.nodeRef)) {
    parent.children.push(child);
  }
}

async function main() {
  const [nodePool, treeData, knowledgeEdges] = await Promise.all([
    readJson('node-pool.json'),
    readJson('tree-data.json'),
    readJson('knowledge-edges.json'),
  ]);

  const mvcTreeNode = findTreeNode(treeData, MVC_TREE_ID);
  if (!mvcTreeNode || !nodePool[MVC_NODE_ID]) {
    throw new Error('模型–视图–控制器框架 anchor was not found');
  }

  nodePool[ROOT_NODE_ID] = {
    ...nodePool[ROOT_NODE_ID],
    id: ROOT_NODE_ID,
    label: 'Spring MVC 九大组件',
    role: 'subsystem',
    tags: [...TAGS, 'Spring MVC 九大组件'],
    card: {
      nodeId: ROOT_NODE_ID,
      title: 'Spring MVC 九大组件',
      rootContent,
      tabs: [{ id: 'def', label: '定义', content: rootContent }],
    },
  };
  upsertTreeChild(mvcTreeNode, {
    id: ROOT_TREE_ID,
    name: 'Spring MVC 九大组件',
    count: 0,
    nodeRef: ROOT_NODE_ID,
  });
  upsertEdge(knowledgeEdges, {
    id: `treebind:${MVC_TREE_ID}:${ROOT_TREE_ID}`,
    source: MVC_NODE_ID,
    target: ROOT_NODE_ID,
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
  });

  const rootTreeNode = findTreeNode(treeData, ROOT_TREE_ID);
  for (const component of components) {
    const content = `对应的初始化方法是 \`${component.initMethod}\`。\n\n${component.description}`;
    nodePool[component.id] = {
      ...nodePool[component.id],
      id: component.id,
      label: component.label,
      role: 'plain',
      tags: [...TAGS, ...(component.core ? ['核心组件'] : []), component.label],
      card: {
        nodeId: component.id,
        title: component.label,
        tabs: [{ id: 'def', label: '定义', content }],
      },
    };
    upsertTreeChild(rootTreeNode, {
      id: component.treeId,
      name: component.label,
      count: 0,
      nodeRef: component.id,
    });
    upsertEdge(knowledgeEdges, {
      id: `treebind:${ROOT_TREE_ID}:${component.treeId}`,
      source: ROOT_NODE_ID,
      target: component.id,
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
    });
  }

  for (const edge of flowEdges) upsertEdge(knowledgeEdges, edge);

  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(
    `Upserted 1 root + ${components.length} Spring MVC component nodes and ${flowEdges.length} flow relations.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
