import fs from 'node:fs';
import path from 'node:path';
import { applyImportAtTreeNode } from '../import-wikipedia.mjs';
import { MEMBER_KIND, translateMemberDocumentation } from '../import-jdk-collections.mjs';
import {
  createJavaSourceEdges,
  createJavaSourceNodes,
  findJavaSourceTreeNode,
  JAVA_SOURCE_API_TAB_PREFIX,
  preserveOriginalJavaDocumentation,
  stableJavaSourceDigest,
  validateJavaSourceState,
} from './java-source-nodes.mjs';
import {
  MAX_JAVA_SOURCE_FILES,
  resolveJavaSourceLocation,
  runJavaSourceIntrospector,
} from './java-source-runtime.mjs';

const DATA_FILE = Object.freeze({
  Tree: 'tree-data.json',
  NodePool: 'node-pool.json',
  Edges: 'knowledge-edges.json',
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomically(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function untranslatedSummary(types) {
  return {
    documentedMembers: types.reduce(
      (count, type) => count + type.members.filter((member) => member.documentation).length,
      0,
    ),
    documentedTypes: types.filter((type) => type.documentation).length,
    translatedMembers: 0,
    translatedTypes: 0,
    reusedTranslations: 0,
  };
}

function memberCounts(types) {
  const importedConstructors = types.reduce(
    (count, type) => count + type.members.filter(
      (member) => member.kind === MEMBER_KIND.Constructor,
    ).length,
    0,
  );
  const importedMethods = types.reduce(
    (count, type) => count + type.members.filter(
      (member) => member.kind === MEMBER_KIND.Method,
    ).length,
    0,
  );
  return { importedConstructors, importedMethods };
}

export { resolveJavaSourceLocation, runJavaSourceIntrospector };

export async function importJavaSource(options) {
  if (!options.parentTreeNodeId) throw new Error('请选择要挂载的项目目录');
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const dataDir = path.join(projectRoot, 'data');
  const treePath = path.join(dataDir, DATA_FILE.Tree);
  const nodePoolPath = path.join(dataDir, DATA_FILE.NodePool);
  const edgesPath = path.join(dataDir, DATA_FILE.Edges);
  const treeData = readJson(treePath);
  const nodePool = readJson(nodePoolPath);
  let edges = readJson(edgesPath);
  const location = resolveJavaSourceLocation(options.source, options.javaHome);
  const introspection = runJavaSourceIntrospector({
    javaExecutable: location.javaExecutable,
    sourcePath: location.sourcePath,
    internalPrefix: location.internalPrefix,
    maxFiles: options.maxFiles ?? MAX_JAVA_SOURCE_FILES,
  });
  if (introspection.types.length === 0) {
    throw new Error('所选源码中没有可导入的 Java 类型声明');
  }

  const namespace = `java_${stableJavaSourceDigest(location.sourceKey)}`;
  if (options.translate === false) preserveOriginalJavaDocumentation(introspection.types);
  const translationSummary = options.translate === false
    ? untranslatedSummary(introspection.types)
    : await translateMemberDocumentation({
        types: introspection.types,
        nodePool,
        engine: options.translationEngine ?? 'google',
        concurrency: options.translationConcurrency ?? 6,
        memberIdNamespace: namespace,
        managedTabPrefixes: [JAVA_SOURCE_API_TAB_PREFIX],
        onProgress: options.onProgress,
      });

  const sourceHash = stableJavaSourceDigest(location.sourceKey);
  const rootTreeId = `tree_java_source_${sourceHash}`;
  const existingRootTreeNode = findJavaSourceTreeNode(treeData, rootTreeId);
  const imported = createJavaSourceNodes({
    types: introspection.types,
    sourceFiles: introspection.sourceFiles,
    location,
    nodePool,
    rootKnowledgeNodeId: existingRootTreeNode?.nodeRef,
  });
  const previousManagedIds = new Set(
    Object.keys(nodePool).filter((nodeId) => (
      nodeId === imported.sourceRootNodeId
      || nodeId.startsWith(`${imported.sourceRootNodeId}_s_`)
    )),
  );
  const desiredNodeIds = new Set(imported.nodes.map((node) => node.id));
  const removedNodeIds = new Set(
    [...previousManagedIds].filter((nodeId) => !desiredNodeIds.has(nodeId)),
  );

  applyImportAtTreeNode(
    nodePool,
    treeData,
    imported.nodes,
    options.parentTreeNodeId,
    imported.sourceRootNodeId,
    ['Java', '源码', imported.title],
  );
  for (const node of imported.nodes) {
    const stored = nodePool[node.id];
    if (node.relationIndex) stored.relationIndex = node.relationIndex;
    if (node.canonicalKey) stored.canonicalKey = node.canonicalKey;
    if (node.kind) stored.kind = node.kind;
    if (node.aliases) stored.aliases = node.aliases;
    if (node.provenance) stored.provenance = node.provenance;
  }

  const managedEdgePrefix = `java_source:${imported.sourceHash}:`;
  edges = edges.filter((edge) => (
    !String(edge.id ?? '').startsWith(managedEdgePrefix)
    && !removedNodeIds.has(edge.source)
    && !removedNodeIds.has(edge.target)
  ));
  const parentTreeNode = findJavaSourceTreeNode(treeData, options.parentTreeNodeId);
  edges.push(...createJavaSourceEdges({
    imported,
    types: introspection.types,
    parentTreeNode,
    existingEdges: edges,
  }));
  validateJavaSourceState(nodePool, edges, desiredNodeIds);

  if (!options.dryRun) {
    writeJsonAtomically(treePath, treeData);
    writeJsonAtomically(nodePoolPath, nodePool);
    writeJsonAtomically(edgesPath, edges);
  }

  const { importedConstructors, importedMethods } = memberCounts(introspection.types);
  return {
    ok: true,
    kind: 'java-source',
    title: imported.title,
    nodeId: imported.rootNodeId,
    treeNodeId: imported.rootTreeId,
    source: location.displayPath,
    runtimeVersion: introspection.runtimeVersion,
    sourceFiles: introspection.sourceFiles,
    importedPackages: new Set(introspection.types.map((type) => type.packageName)).size,
    importedTypes: introspection.types.length,
    importedConstructors,
    importedMethods,
    importedMembers: importedConstructors + importedMethods,
    documentedTypes: translationSummary.documentedTypes,
    documentedMembers: translationSummary.documentedMembers,
    translatedComments: (translationSummary.translatedTypes ?? 0)
      + translationSummary.translatedMembers,
    reusedTranslations: translationSummary.reusedTranslations,
    directTypeRelations: introspection.types.reduce(
      (count, type) => count + type.relations.length,
      0,
    ),
    dryRun: options.dryRun === true,
  };
}
