import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  buildApiTab,
  documentationMarker,
  javadocTextToMarkdown,
  MEMBER_KIND,
  renderDocumentationSection,
} from './lib/import-jdk-collections.mjs';
import { javaTypeKnowledgeNodeId } from './lib/knowledge-identity.mjs';

export const JAVA_SOURCE_API_TAB_PREFIX = 'java_source_api_';

export function stableJavaSourceDigest(value, length = 16) {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

function typeKindLabel(kind) {
  switch (kind) {
    case 'interface': return '接口';
    case 'abstract_class': return '抽象类';
    case 'class': return '类';
    case 'enum': return '枚举';
    case 'record': return '记录类';
    case 'annotation': return '注解类型';
    default: throw new Error(`不支持的 Java 类型：${kind}`);
  }
}

function sourceBaseName(location) {
  if (location.internalPrefix) {
    return path.posix.basename(location.internalPrefix) || 'Java 源码';
  }
  const extension = path.extname(location.sourcePath);
  return path.basename(location.sourcePath, extension) || 'Java 源码';
}

function importTitle(types, sourceFiles, location) {
  const topLevelTypes = types.filter((type) => (
    !types.some((candidate) => candidate.className !== type.className
      && type.className.startsWith(`${candidate.className}.`))
  ));
  if (sourceFiles === 1 && topLevelTypes.length === 1) return topLevelTypes[0].simpleName;
  const packages = [...new Set(types.map((type) => type.packageName).filter(Boolean))];
  if (packages.length === 1) return packages[0];
  return sourceBaseName(location);
}

function rootContent(title, sourceFiles, types, location) {
  const packages = new Set(types.map((type) => type.packageName));
  return [
    `\`${title}\` 的 Java 源码索引。`,
    '',
    `共解析 ${sourceFiles} 个源码文件、${types.length} 个类型和 ${packages.size} 个包。`,
    '',
    `来源：\`${location.displayPath}\``,
  ].join('\n');
}

function typeRootContent(type) {
  const marker = type.documentationHash ? documentationMarker(type.documentationHash) : '';
  const documentation = renderDocumentationSection(type.translatedDocumentation);
  const details = [
    '### 类型信息',
    '',
    `- 完整名称：\`${type.className}\``,
    `- 类型：${typeKindLabel(type.kind)}`,
    `- 包：\`${type.packageName || '(default package)'}\``,
    `- 源文件：\`${type.sourceFile}\``,
    `- final：${type.finalType ? '是' : '否'}`,
  ].join('\n');
  return [marker, documentation, details].filter(Boolean).join('\n\n');
}

function originalDocumentation(documentation) {
  return {
    description: javadocTextToMarkdown(documentation.description),
    tags: documentation.tags.map((tag) => ({
      ...tag,
      text: javadocTextToMarkdown(tag.text),
    })),
  };
}

export function preserveOriginalJavaDocumentation(types) {
  for (const type of types) {
    if (type.documentation) {
      type.translatedDocumentation = originalDocumentation(type.documentation);
    }
    for (const member of type.members) {
      if (member.documentation) {
        member.translatedDocumentation = originalDocumentation(member.documentation);
      }
    }
  }
}

function existingPreservedTabs(nodePool, nodeId) {
  return (nodePool[nodeId]?.card?.tabs ?? []).filter(
    (tab) => !String(tab.id ?? '').startsWith(JAVA_SOURCE_API_TAB_PREFIX),
  );
}

export function createJavaSourceNodes({
  types,
  sourceFiles,
  location,
  nodePool,
  rootKnowledgeNodeId,
}) {
  const sourceHash = stableJavaSourceDigest(location.sourceKey);
  const sourceRootNodeId = `k_java_source_${sourceHash}`;
  const rootNodeId = rootKnowledgeNodeId ?? sourceRootNodeId;
  const rootTreeId = `tree_java_source_${sourceHash}`;
  const namespace = `java_${sourceHash}`;
  const title = importTitle(types, sourceFiles, location);
  const nodes = [{
    id: rootNodeId,
    label: title,
    parentId: null,
    treeId: rootTreeId,
    treeName: title,
    card: {
      nodeId: rootNodeId,
      title,
      rootContent: rootContent(title, sourceFiles, types, location),
      tabs: existingPreservedTabs(nodePool, rootNodeId),
    },
    tags: ['Java', '源码', title],
  }];

  const typeNodeIds = new Map();
  for (const type of types) {
    typeNodeIds.set(type.className, javaTypeKnowledgeNodeId(nodePool, type.className));
  }

  const packageNodeIds = new Map();
  for (const packageName of [...new Set(types.map((type) => type.packageName))].sort()) {
    const packageKey = packageName || '(default package)';
    const nodeId = `${rootNodeId}_s_package_${stableJavaSourceDigest(packageKey)}`;
    packageNodeIds.set(packageName, nodeId);
    nodes.push({
      id: nodeId,
      label: packageKey,
      parentId: rootNodeId,
      treeId: `${rootTreeId}_s_package_${stableJavaSourceDigest(packageKey)}`,
      treeName: packageKey,
      card: {
        nodeId,
        title: packageKey,
        rootContent: `Java 包 \`${packageKey}\`，包含本次导入范围内直接声明的类型。`,
        tabs: existingPreservedTabs(nodePool, nodeId),
      },
      tags: ['Java', '包', packageKey],
    });
  }

  const typeByClassName = new Map(types.map((type) => [type.className, type]));
  for (const type of types) {
    const nodeId = typeNodeIds.get(type.className);
    const existing = nodePool[nodeId];
    const outerClassName = type.className.slice(0, type.className.lastIndexOf('.'));
    const outerType = typeByClassName.get(outerClassName);
    const parentId = outerType
      ? typeNodeIds.get(outerType.className)
      : packageNodeIds.get(type.packageName);
    const constructors = type.members.filter(
      (member) => member.kind === MEMBER_KIND.Constructor,
    ).length;
    const methods = type.members.filter((member) => member.kind === MEMBER_KIND.Method).length;
    const apiSource = {
      displayPath: location.displayPath,
      memberIdNamespace: namespace,
      memberTag: 'Java 源码',
      managedTabPrefix: JAVA_SOURCE_API_TAB_PREFIX,
      apiLabel: '源码 API',
      apiDescription: [
        `\`${type.className}\` 是${typeKindLabel(type.kind)}。`,
        '',
        `本页列出源码中直接声明的 ${constructors} 个构造器和 ${methods} 个方法。`,
        '',
        `源文件：\`${type.sourceFile}\``,
      ].join('\n'),
      apiTags: ['Java', '源码 API', type.packageName || '(default package)'],
    };
    nodes.push({
      id: nodeId,
      label: type.simpleName,
      parentId,
      treeId: `${rootTreeId}_s_type_${stableJavaSourceDigest(type.className)}`,
      treeName: type.simpleName,
      card: {
        nodeId,
        title: existing?.card?.title ?? type.simpleName,
        rootContent: typeRootContent(type),
        tabs: [
          ...existingPreservedTabs(nodePool, nodeId),
          buildApiTab(type, apiSource),
        ],
      },
      canonicalKey: `java:type:${type.className}`,
      kind: existing?.kind ?? 'entity',
      aliases: existing?.aliases,
      provenance: existing?.provenance,
      tags: [...new Set([
        ...(existing?.tags ?? []),
        'Java',
        '源码类型',
        typeKindLabel(type.kind),
        type.packageName || '(default package)',
        type.className,
      ])],
      relationIndex: { rootNodeId: nodeId },
    });
  }

  const externalClassNames = [...new Set(types.flatMap((type) => (
    type.relations
      .map((relation) => relation.targetClassName)
      .filter((className) => !typeNodeIds.has(className))
  )))].sort();
  const externalNodeIds = new Map();
  if (externalClassNames.length > 0) {
    const groupNodeId = `${rootNodeId}_s_external_types`;
    nodes.push({
      id: groupNodeId,
      label: '外部引用类型',
      parentId: rootNodeId,
      treeId: `${rootTreeId}_s_external_types`,
      treeName: '外部引用类型',
      card: {
        nodeId: groupNodeId,
        title: '外部引用类型',
        rootContent: '继承或实现关系中出现、但未包含在本次源码范围内的类型。',
        tabs: existingPreservedTabs(nodePool, groupNodeId),
      },
      tags: ['Java', '引用类型'],
    });
    for (const className of externalClassNames) {
      const nodeId = javaTypeKnowledgeNodeId(nodePool, className);
      const label = className.split('.').at(-1) || className;
      const existing = nodePool[nodeId];
      externalNodeIds.set(className, nodeId);
      if (existing) {
        nodes.push({
          id: nodeId,
          label: existing.label ?? label,
          parentId: groupNodeId,
          treeId: `${rootTreeId}_s_external_${stableJavaSourceDigest(className)}`,
          treeName: label,
          card: existing.card,
          canonicalKey: `java:type:${className}`,
          kind: existing.kind ?? 'entity',
          aliases: existing.aliases,
          provenance: existing.provenance,
          tags: [...new Set([...(existing.tags ?? []), 'Java', className])],
          relationIndex: { rootNodeId: nodeId },
        });
        continue;
      }
      nodes.push({
        id: nodeId,
        label,
        parentId: groupNodeId,
        treeId: `${rootTreeId}_s_external_${stableJavaSourceDigest(className)}`,
        treeName: label,
        card: {
          nodeId,
          title: label,
          rootContent: `\`${className}\` 被当前源码中的类型直接引用，但其声明不在本次导入范围内。`,
          tabs: existingPreservedTabs(nodePool, nodeId),
        },
        tags: ['Java', '外部引用类型', className],
        relationIndex: { rootNodeId: nodeId },
      });
      const created = nodes.at(-1);
      created.canonicalKey = `java:type:${className}`;
      created.kind = 'entity';
    }
  }

  return {
    namespace,
    sourceHash,
    title,
    rootNodeId,
    sourceRootNodeId,
    rootTreeId,
    nodes,
    typeNodeIds,
    externalNodeIds,
  };
}

export function findJavaSourceTreeNode(root, treeNodeId) {
  if (root.id === treeNodeId) return root;
  for (const child of root.children ?? []) {
    const found = findJavaSourceTreeNode(child, treeNodeId);
    if (found) return found;
  }
  return null;
}

export function createJavaSourceEdges({ imported, types, parentTreeNode, existingEdges = [] }) {
  const prefix = `java_source:${imported.sourceHash}:`;
  const edges = [];
  const rootBindingExists = parentTreeNode?.nodeRef && existingEdges.some((edge) => (
    edge.source === parentTreeNode.nodeRef
    && edge.target === imported.rootNodeId
    && edge.type === 'belongs-to'
  ));
  if (parentTreeNode?.nodeRef && !rootBindingExists) {
    edges.push({
      id: `${prefix}tree:root`,
      source: parentTreeNode.nodeRef,
      target: imported.rootNodeId,
      type: 'belongs-to',
      label: 'contains',
    });
  }
  for (const node of imported.nodes) {
    if (!node.parentId) continue;
    edges.push({
      id: `${prefix}tree:${stableJavaSourceDigest(`${node.parentId}:${node.id}`)}`,
      source: node.parentId,
      target: node.id,
      type: 'belongs-to',
      label: 'contains',
    });
  }
  for (const type of types) {
    const source = imported.typeNodeIds.get(type.className);
    for (const relation of type.relations) {
      const target = imported.typeNodeIds.get(relation.targetClassName)
        ?? imported.externalNodeIds.get(relation.targetClassName);
      if (!source || !target) continue;
      edges.push({
        id: `${prefix}relation:${stableJavaSourceDigest(`${type.className}:${relation.kind}:${relation.targetClassName}`)}`,
        source,
        target,
        type: relation.kind,
        label: relation.kind,
      });
    }
  }
  return edges;
}

export function validateJavaSourceState(nodePool, edges, importedNodeIds) {
  for (const nodeId of importedNodeIds) {
    if (!nodePool[nodeId]) throw new Error(`Java 源码节点未写入：${nodeId}`);
  }
  for (const edge of edges) {
    if (!nodePool[edge.source] || !nodePool[edge.target]) {
      throw new Error(`关系 ${edge.id} 引用了不存在的知识节点`);
    }
  }
}
