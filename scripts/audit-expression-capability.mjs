#!/usr/bin/env node
/**
 * audit-expression-capability.mjs
 *
 * 只读盘点：系统「已有的表达能力」在数据里被真正用了多少。
 * 不做任何写入（除输出报告文件），不改 data/*.json。
 *
 * 输出：outputs/capability-audit/expression-audit.json
 *
 * 用法：node scripts/audit-expression-capability.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const OUT_DIR = join(ROOT, 'outputs', 'capability-audit');

const readJson = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));

const pool = readJson('node-pool.json');            // 扁平 map: id -> node
const edges = readJson('knowledge-edges.json');     // 数组
const questions = readJson('questions.json');       // 数组
const tree = readJson('tree-data.json');
const evolution = readJson('evolution-events.json');

const report = {};

// ── 1. viewDimensions 表达面 ───────────────────────────────────────────
{
  const layoutCount = {};
  const layoutSamples = {};
  const scopeTarget = {};
  const atomRefs = new Set();
  let nodesWithDims = 0, dims = 0, sections = 0, atomBindings = 0, groups = 0;
  let tagQuerySections = 0, spanSections = 0, btreeSections = 0, matrixSections = 0;
  const groupNodes = [];
  const stackLikeSamples = [];

  for (const [id, node] of Object.entries(pool)) {
    const vd = node.viewDimensions;
    if (!Array.isArray(vd) || vd.length === 0) continue;
    nodesWithDims += 1;
    for (const dim of vd) {
      dims += 1;
      scopeTarget[dim.scope?.target ?? '(未声明 scope)'] =
        (scopeTarget[dim.scope?.target ?? '(未声明 scope)'] ?? 0) + 1;
      if (dim.groups?.length) {
        groups += dim.groups.length;
        groupNodes.push({
          nodeId: id,
          dimension: dim.name,
          groupCount: dim.groups.length,
          groupsWithLogicNode: dim.groups.filter((g) => g.nodeId).length,
          nestingCandidates: dim.groups
            .filter((g) => g.members.length > 0)
            .map((g) => ({ label: g.label, members: g.members.length })),
        });
      }
      for (const section of dim.sections) {
        sections += 1;
        atomBindings += (section.atoms ?? []).length;
        layoutCount[section.layout] = (layoutCount[section.layout] ?? 0) + 1;
        (layoutSamples[section.layout] ??= []).push({
          owner: id,
          sectionId: section.id,
          title: section.title ?? null,
        });
        for (const atom of section.atoms ?? []) atomRefs.add(atom.nodeId);
        if (section.config?.tagQuery?.length) tagQuerySections += 1;
        if (
          section.config?.positionAttr ||
          section.config?.extentAttr ||
          section.config?.total != null
        ) {
          spanSections += 1;
          if (stackLikeSamples.length < 10) {
            stackLikeSamples.push({
              owner: id,
              sectionId: section.id,
              positionAttr: section.config?.positionAttr ?? '(默认 offset)',
              extentAttr: section.config?.extentAttr ?? '(默认 size)',
              total: section.config?.total ?? null,
              unit: section.config?.unit ?? null,
            });
          }
        }
        if (section.config?.btree) btreeSections += 1;
        if (section.layout === 'matrix') matrixSections += 1;
      }
    }
  }

  report.viewDimensions = {
    totalNodes: Object.keys(pool).length,
    nodesWithViewDimensions: nodesWithDims,
    dimensions: dims,
    sections,
    atomBindings,
    distinctAtomsReferenced: atomRefs.size,
    layoutCount,
    layoutSamples,
    scopeTargetCount: scopeTarget,
    groupCount: groups,
    groupNodes,
    tagQuerySections,
    spanConfiguredSections: spanSections,
    spanSamples: stackLikeSamples,
    btreeSections,
    matrixSections,
  };
}

// ── 2. 边：自动结构 vs 手工语义 ───────────────────────────────────────
{
  const byType = {};
  const byRelationKind = {};
  const belongsTo = { auto: 0, manual: 0, manualLabels: {} };
  let withDimensions = 0, withoutDimensions = 0;
  const typeRelation = { extends: 0, implements: 0, 'instance-of': 0 };

  for (const edge of edges) {
    byType[edge.type] = (byType[edge.type] ?? 0) + 1;
    if (edge.relationKind) byRelationKind[edge.relationKind] = (byRelationKind[edge.relationKind] ?? 0) + 1;
    if (edge.dimensions?.length) withDimensions += 1; else withoutDimensions += 1;
    if (edge.type in typeRelation) typeRelation[edge.type] += 1;
    if (edge.type === 'belongs-to') {
      const isAuto = /^(treebind|treeprojection):/.test(edge.id);
      if (isAuto) belongsTo.auto += 1;
      else {
        belongsTo.manual += 1;
        const label = edge.label ?? '(空)';
        belongsTo.manualLabels[label] = (belongsTo.manualLabels[label] ?? 0) + 1;
      }
    }
  }

  report.edges = {
    total: edges.length,
    byType,
    byRelationKind,
    belongsTo,
    typeRelation,
    withDimensions,
    withoutDimensions,
  };
}

// ── 3. 问题卡：引用了什么 ─────────────────────────────────────────────
{
  let withAnswerSteps = 0, multiStep = 0, maxSteps = 0;
  let refToKnowledgeNode = 0, refToTreeNode = 0, noRef = 0;
  let withAnswerText = 0, answered = 0;
  const sourceKind = {};

  for (const q of questions) {
    const steps = q.answerSteps ?? [];
    if (steps.length) {
      withAnswerSteps += 1;
      if (steps.length > 1) multiStep += 1;
      maxSteps = Math.max(maxSteps, steps.length);
    }
    if (q.answer?.trim()) withAnswerText += 1;
    if (q.answered) answered += 1;
    if (q.source?.kind) sourceKind[q.source.kind] = (sourceKind[q.source.kind] ?? 0) + 1;
    const ref = q.relatedNodeId;
    if (!ref) noRef += 1;
    else if (String(ref).startsWith('tree_') || !pool[ref]) refToTreeNode += 1;
    else refToKnowledgeNode += 1;
  }

  report.questions = {
    total: questions.length,
    answered,
    withAnswerText,
    withAnswerSteps,
    multiStep,
    maxSteps,
    relatedToKnowledgeNode: refToKnowledgeNode,
    relatedToNonNodeOrTree: refToTreeNode,
    noRelatedNodeId: noRef,
    sourceKind,
  };
}

// ── 4. 结构与身份字段的落盘情况 ───────────────────────────────────────
{
  const treeStats = { nodes: 0, withNodeRef: 0, withSupplement: 0, supplementSamples: [] };
  const walk = (n) => {
    treeStats.nodes += 1;
    if (n.nodeRef) treeStats.withNodeRef += 1;
    if (n.supplement) {
      treeStats.withSupplement += 1;
      if (treeStats.supplementSamples.length < 20) {
        treeStats.supplementSamples.push({
          name: n.name,
          nodeRef: n.nodeRef,
          keys: Object.keys(n.supplement),
          tabs: (n.supplement.tabs ?? []).map((t) => ({
            id: t.id,
            label: t.label,
            contentLength: String(t.content ?? '').length,
          })),
        });
      }
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  treeStats.duplicateNodeRefs = (() => {
    const seen = new Map();
    const places = new Map();
    const walk2 = (n, path) => {
      if (n.nodeRef) {
        seen.set(n.nodeRef, (seen.get(n.nodeRef) ?? 0) + 1);
        const list = places.get(n.nodeRef) ?? [];
        list.push(path.join(' > '));
        places.set(n.nodeRef, list);
      }
      for (const c of n.children ?? []) walk2(c, [...path, n.name]);
    };
    walk2(tree, []);
    const dups = [...seen.entries()].filter(([, c]) => c > 1);
    const across = dups.filter(([ref]) => {
      const paths = places.get(ref) ?? [];
      return new Set(paths.map((p) => p.split(' > ').slice(0, 2).join(' > '))).size > 1;
    });
    treeStats.duplicateTreeNodes = dups.reduce((a, [, c]) => a + c, 0);
    treeStats.duplicateAcrossTopBranch = across.length;
    treeStats.duplicateSamples = dups.slice(0, 8).map(([ref]) => ({
      nodeRef: ref,
      label: pool[ref]?.label ?? '(池中不存在)',
      places: places.get(ref),
    }));
    return dups.length;
  })();
  report.tree = treeStats;

  const identity = {
    canonicalKey: 0, aliases: 0, shared: 0, locked: 0, mechanismSpec: 0,
    relationIndex: 0, withCard: 0, withTabs: 0, withDims: 0,
  };
  const roleCount = {};
  for (const node of Object.values(pool)) {
    if (node.canonicalKey) identity.canonicalKey += 1;
    if (node.aliases?.length) identity.aliases += 1;
    if (node.shared) identity.shared += 1;
    if (node.locked) identity.locked += 1;
    if (node.mechanismSpec) identity.mechanismSpec += 1;
    if (node.relationIndex?.rootNodeId) identity.relationIndex += 1;
    if (node.card) identity.withCard += 1;
    if (node.card?.tabs?.length) identity.withTabs += 1;
    if (node.dimensions?.length) identity.withDims += 1;
    roleCount[node.role ?? '(未声明)'] = (roleCount[node.role ?? '(未声明)'] ?? 0) + 1;
  }
  report.identityFields = identity;
  report.roleCount = roleCount;

  const evs = Array.isArray(evolution) ? evolution : (evolution.events ?? []);
  const list = Array.isArray(evs) ? evs : [];
  const excluded = new Set(list.flatMap((e) => e.sourceOnlyNodeIds ?? []));
  const allIntroduced = list.flatMap((e) => e.introducedNodes ?? []);
  const introducedIds = new Set(allIntroduced.map((i) => i.nodeId));
  const facetCount = {};
  for (const e of list) {
    for (const c of e.changes ?? []) {
      facetCount[c.facet] = (facetCount[c.facet] ?? 0) + 1;
    }
  }
  // introduced 节点的父是否在池中 / 是否真的在树里
  const treeRefs = new Set();
  {
    const walk = (n) => {
      if (n.nodeRef) treeRefs.add(n.nodeRef);
      for (const c of n.children ?? []) walk(c);
    };
    walk(tree);
  }
  const slices = list.map((event, index) => {
    const visible = list.slice(0, index + 1).flatMap((e) => e.introducedNodes ?? []);
    return {
      eventId: event.id,
      title: event.title,
      visibleIntroduced: visible.length,
      hiddenIntroduced: allIntroduced.length - visible.length,
      introducedThisEvent: (event.introducedNodes ?? []).length,
      changedThisEvent: (event.changes ?? []).length,
      facets: (event.changes ?? []).map((c) => c.facet),
    };
  });
  report.evolution = {
    total: list.length,
    scopeRootIds: [...new Set(list.map((e) => e.scopeRootId))],
    excludedNodeIds: excluded.size,
    excludedLabels: [...excluded].map((id) => pool[id]?.label ?? id),
    introducedTotal: allIntroduced.length,
    introducedInTree: allIntroduced.filter((i) => treeRefs.has(i.nodeId)).length,
    introducedParentsInPool: allIntroduced.filter((i) => !!pool[i.parentNodeId]).length,
    introducedParentsInTree: allIntroduced.filter((i) => treeRefs.has(i.parentNodeId)).length,
    changesByFacet: facetCount,
    baselineSlice: { visibleIntroduced: 0, hiddenIntroduced: allIntroduced.length },
    slices,
    // 结构覆盖：树包含边里有多少 target 属于"曾被事件引入"的节点
    treeContainmentEdgesOverriddenByEvents: edges.filter(
      (e) =>
        e.type === 'belongs-to'
        && /^(treebind|treeprojection):/.test(e.id)
        && introducedIds.has(e.target)
        && !excluded.has(e.source)
        && !excluded.has(e.target),
    ).length,
  };
}

// ── 5. 机制视图：入口、声明完整度、可达词汇 ───────────────────────────
{
  const hosts = [];
  const kindCount = {};
  for (const node of Object.values(pool)) {
    kindCount[node.kind ?? '(未声明)'] = (kindCount[node.kind ?? '(未声明)'] ?? 0) + 1;
  }

  // 机制节点在树里的子树（复刻 collectMechanismCandidateNodeIds 的树部分）
  const treeNodesByRef = new Map();
  {
    const walk = (n) => {
      if (n.nodeRef) {
        const list = treeNodesByRef.get(n.nodeRef) ?? [];
        list.push(n);
        treeNodesByRef.set(n.nodeRef, list);
      }
      for (const c of n.children ?? []) walk(c);
    };
    walk(tree);
  }
  const descendantNodeIds = (rootNodeId) => {
    const ordered = [];
    const seen = new Set([rootNodeId]);
    ordered.push(rootNodeId);
    for (const ref of treeNodesByRef.get(rootNodeId) ?? []) {
      const walk = (t) => {
        if (t.nodeRef && pool[t.nodeRef] && !seen.has(t.nodeRef)) {
          seen.add(t.nodeRef);
          ordered.push(t.nodeRef);
        }
        for (const c of t.children ?? []) walk(c);
      };
      walk(ref);
    }
    return ordered;
  };

  const MECHANISM_KINDS = new Set(['structure', 'causality', 'state-transition', 'constraint']);
  const PROCESS_KINDS = new Set(['causality', 'state-transition']);

  for (const [id, node] of Object.entries(pool)) {
    if (!node.mechanismSpec) continue;
    const spec = node.mechanismSpec;
    const declared = new Set([
      id,
      spec.phenomenonNodeId,
      ...(spec.triggerNodeIds ?? []),
      ...(spec.participantNodeIds ?? []),
      ...(spec.stateNodeIds ?? []),
      ...(spec.outcomeNodeIds ?? []),
      ...(spec.failureNodeIds ?? []),
    ]);
    const descSet = new Set(descendantNodeIds(id));
    const specEdges = [
      ...(spec.transitionEdgeIds ?? []),
      ...(spec.constraintEdgeIds ?? []),
    ].map((eid) => edges.find((e) => e.id === eid)).filter(Boolean);
    const spEdgeKinds = {};
    for (const e of specEdges) spEdgeKinds[e.relationKind ?? '(未声明)'] = (spEdgeKinds[e.relationKind ?? '(未声明)'] ?? 0) + 1;

    // 边一跳把子树外节点拉进来的实测（代码里存在但可能从未生效）
    const pulledIn = new Set();
    for (const e of edges) {
      if (!MECHANISM_KINDS.has(e.relationKind)) continue;
      if (e.relationKind === 'structure') continue;
      if (!descSet.has(e.source) && !descSet.has(e.target)) continue;
      for (const nid of [e.source, e.target]) {
        if (pool[nid] && !descSet.has(nid)) pulledIn.add(nid);
      }
    }

    hosts.push({
      nodeId: id,
      label: node.label,
      kind: node.kind ?? null,
      role: node.role ?? null,
      phenomenonIsSelf: spec.phenomenonNodeId === id,
      triggers: (spec.triggerNodeIds ?? []).length,
      triggerKinds: (spec.triggerNodeIds ?? []).map((tid) => pool[tid]?.kind ?? '(缺失)'),
      participants: (spec.participantNodeIds ?? []).length,
      states: (spec.stateNodeIds ?? []).length,
      transitionEdges: (spec.transitionEdgeIds ?? []).length,
      constraintEdges: (spec.constraintEdgeIds ?? []).length,
      outcomes: (spec.outcomeNodeIds ?? []).length,
      failures: (spec.failureNodeIds ?? []).length,
      treeSubtreeNodes: descSet.size,
      pulledInFromOutsideSubtree: [...pulledIn].map((nid) => pool[nid]?.label ?? nid),
      declaredEdgeKinds: spEdgeKinds,
      declaredEdgesMissing: [...(spec.transitionEdgeIds ?? []), ...(spec.constraintEdgeIds ?? [])]
        .filter((eid) => !edges.some((e) => e.id === eid)).length,
      declaredEdgesWithEndpointOutside: specEdges.filter(
        (e) => !declared.has(e.source) || !declared.has(e.target),
      ).length,
      hasViewDimensions: Array.isArray(node.viewDimensions) && node.viewDimensions.length > 0,
      processEdgeCount: specEdges.filter((e) => PROCESS_KINDS.has(e.relationKind)).length,
    });
  }

  // 可达词汇：数据里存在的 relationKind → 机制 RelationKind 的映射是 4→3
  // structure→contains, causality→routesTo, state-transition→routesTo, constraint→locks
  // caches / writesTo / flushesTo 无任何来源 → 声明了但数据不可达
  const specFieldFill = {
    phenomenonNodeId: hosts.filter((h) => h.phenomenonIsSelf).length,
    triggerNodeIds: hosts.filter((h) => h.triggers > 0).length,
    participantNodeIds: hosts.filter((h) => h.participants > 0).length,
    stateNodeIds: hosts.filter((h) => h.states > 0).length,
    transitionEdgeIds: hosts.filter((h) => h.transitionEdges > 0).length,
    constraintEdgeIds: hosts.filter((h) => h.constraintEdges > 0).length,
    outcomeNodeIds: hosts.filter((h) => h.outcomes > 0).length,
    failureNodeIds: hosts.filter((h) => h.failures > 0).length,
  };

  const mechanismKindNodes = Object.entries(pool).filter(([, n]) => n.kind === 'mechanism');
  report.mechanism = {
    totalWithSpec: hosts.length,
    kindMechanismNodes: mechanismKindNodes.length,
    kindMechanismWithoutSpec: mechanismKindNodes.length - hosts.length,
    emptyMechanismNodes: mechanismKindNodes
      .filter(([, n]) => !n.mechanismSpec)
      .map(([id, n]) => ({ nodeId: id, label: n.label })),
    specFieldFill,
    hostsWithViewDimensions: hosts.filter((h) => h.hasViewDimensions).length,
    triggerNodeCountDistribution: hosts.reduce((a, h) => {
      a[h.triggers] = (a[h.triggers] ?? 0) + 1;
      return a;
    }, {}),
    triggerKindDistribution: hosts.flatMap((h) => h.triggerKinds).reduce((a, k) => {
      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {}),
    hostsPullingInOutsideSubtree: hosts.filter((h) => h.pulledInFromOutsideSubtree.length > 0).length,
    reachableRelationKinds: {
      reachable: ['contains (structure)', 'routesTo (causality | state-transition)', 'locks (constraint)'],
      unreachable: ['caches', 'writesTo', 'flushesTo'],
    },
    reachableVisualTones: {
      produced: ['active (target 有出边)', 'traversed (每步 source)', 'persisted (终点 target)'],
      neverProduced: ['mutated', 'guarded', 'released'],
    },
    diagramTypes: {
      declared: ['structure', 'flow', 'logic', 'sequence'],
      selectable: ['logic', 'flow', 'sequence'],
      unreachable: ['structure'],
    },
    hosts,
  };
  report.kindCount = kindCount;
}

// ── 6. 词汇表闭合性（枚举值 vs 数据取值）─────────────────────────────
{
  const KNOWLEDGE_RELATION_KINDS = new Set([
    'structure', 'classification', 'dependency', 'causality',
    'state-transition', 'constraint', 'evidence', 'reference',
  ]);
  const KNOWLEDGE_NODE_KINDS = new Set([
    'concept', 'entity', 'state', 'event', 'rule', 'mechanism', 'evidence',
  ]);

  const edgeKindCount = {};
  for (const e of edges) {
    edgeKindCount[e.relationKind ?? '(未声明)'] = (edgeKindCount[e.relationKind ?? '(未声明)'] ?? 0) + 1;
  }
  const nodeKindCount = {};
  for (const n of Object.values(pool)) {
    nodeKindCount[n.kind ?? '(未声明)'] = (nodeKindCount[n.kind ?? '(未声明)'] ?? 0) + 1;
  }

  report.vocabularyClosure = {
    relationKind: {
      declared: [...KNOWLEDGE_RELATION_KINDS],
      used: edgeKindCount,
      outOfEnum: Object.entries(edgeKindCount)
        .filter(([k]) => k !== '(未声明)' && !KNOWLEDGE_RELATION_KINDS.has(k))
        .map(([k, count]) => ({ value: k, count })),
      declaredButUnused: [...KNOWLEDGE_RELATION_KINDS].filter((k) => !edgeKindCount[k]),
    },
    nodeKind: {
      declared: [...KNOWLEDGE_NODE_KINDS],
      used: nodeKindCount,
      outOfEnum: Object.entries(nodeKindCount)
        .filter(([k]) => k !== '(未声明)' && !KNOWLEDGE_NODE_KINDS.has(k))
        .map(([k, count]) => ({ value: k, count })),
      declaredButUnused: [...KNOWLEDGE_NODE_KINDS].filter((k) => !nodeKindCount[k]),
    },
  };
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'expression-audit.json'), JSON.stringify(report, null, 2), 'utf8');

const pct = (a, b) => (b === 0 ? '0%' : `${((a / b) * 100).toFixed(1)}%`);
const v = report.viewDimensions;
console.log('== viewDimensions ==');
console.log(`节点 ${v.nodesWithViewDimensions}/${v.totalNodes} (${pct(v.nodesWithViewDimensions, v.totalNodes)})`);
console.log(`维度 ${v.dimensions} · section ${v.sections} · 原子绑定 ${v.atomBindings} · 去重原子 ${v.distinctAtomsReferenced}`);
console.log('layout 分布:', JSON.stringify(v.layoutCount));
console.log('scope.target:', JSON.stringify(v.scopeTargetCount));
console.log(`semantic group ${v.groupCount} · tagQuery section ${v.tagQuerySections} · span 配置 section ${v.spanConfiguredSections} · btree section ${v.btreeSections}`);
console.log('== 边 ==');
console.log(`共 ${report.edges.total} · belongs-to ${report.edges.belongsTo.auto + report.edges.belongsTo.manual} (自动 ${report.edges.belongsTo.auto} / 手工 ${report.edges.belongsTo.manual})`);
console.log('类型:', JSON.stringify(report.edges.byType));
console.log(`带 dimensions 的边 ${report.edges.withDimensions} / 无 ${report.edges.withoutDimensions}`);
console.log('== 问题 ==');
console.log(JSON.stringify(report.questions));
console.log('== 树 / 身份 ==');
console.log(JSON.stringify(report.tree.nodes) + ' 树节点, supplement ' + report.tree.withSupplement + ', 重复 nodeRef ' + report.tree.duplicateNodeRefs);
console.log(JSON.stringify(report.identityFields));
console.log('== 机制视图 ==');
const m = report.mechanism;
console.log(`有 mechanismSpec: ${m.totalWithSpec} · kind=mechanism 总数: ${m.kindMechanismNodes} · 空机制节点: ${m.kindMechanismWithoutSpec}`);
console.log('spec 字段非空:', JSON.stringify(m.specFieldFill));
console.log('触发节点数分布:', JSON.stringify(m.triggerNodeCountDistribution), '· trigger kind:', JSON.stringify(m.triggerKindDistribution));
console.log(`机制节点带 viewDimensions 的: ${m.hostsWithViewDimensions} / ${m.totalWithSpec}`);
console.log(`"边一跳"拉入子树外节点的机制数: ${m.hostsPullingInOutsideSubtree} / ${m.totalWithSpec}`);
console.log('可达 RelationKind:', JSON.stringify(m.reachableRelationKinds));
console.log('图型:', JSON.stringify(m.diagramTypes));
for (const h of m.hosts) {
  console.log(`  ${h.nodeId} ${h.label} | 树子树 ${h.treeSubtreeNodes} | 边一跳拉入 ${h.pulledInFromOutsideSubtree.length} | 声明边 kind ${JSON.stringify(h.declaredEdgeKinds)} | 缺失边 ${h.declaredEdgesMissing}`);
}
console.log('== 词汇表闭合性 ==');
const vc = report.vocabularyClosure;
console.log('relationKind 越界:', JSON.stringify(vc.relationKind.outOfEnum), '· 声明未用:', JSON.stringify(vc.relationKind.declaredButUnused));
console.log('nodeKind 越界:', JSON.stringify(vc.nodeKind.outOfEnum), '· 声明未用:', JSON.stringify(vc.nodeKind.declaredButUnused));
console.log('nodeKind 分布:', JSON.stringify(vc.nodeKind.used));
console.log('== 时态事件 ==');
const ev = report.evolution;
console.log(`事件 ${ev.total} · 作用域 ${JSON.stringify(ev.scopeRootIds)} · 来源证据 ${ev.excludedNodeIds} · 引入节点 ${ev.introducedTotal}（在树里 ${ev.introducedInTree}）`);
console.log('facet:', JSON.stringify(ev.changesByFacet));
console.log('切片:', JSON.stringify(ev.slices));
console.log('被事件声明覆盖的树包含边:', ev.treeContainmentEdgesOverriddenByEvents);
console.log('\n写出', join(OUT_DIR, 'expression-audit.json'));
