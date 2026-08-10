export const SEMANTIC_NODE_KIND = Object.freeze({
  Concept: 'concept',
  Entity: 'entity',
  State: 'state',
  Event: 'event',
  Rule: 'rule',
  Mechanism: 'mechanism',
  Evidence: 'evidence',
});

export const SEMANTIC_RELATION_KIND = Object.freeze({
  Structure: 'structure',
  Classification: 'classification',
  Dependency: 'dependency',
  Causality: 'causality',
  StateTransition: 'state-transition',
  Constraint: 'constraint',
  Evidence: 'evidence',
  Reference: 'reference',
});

export const SEMANTIC_DRAFT_LIMITS = Object.freeze({
  maxNodes: 240,
  maxRelations: 720,
  maxQuestions: 200,
  maxLabelCharacters: 160,
  maxSummaryCharacters: 4_000,
  maxDetailsCharacters: 20_000,
});

const NODE_KIND_VALUES = new Set(Object.values(SEMANTIC_NODE_KIND));
const RELATION_KIND_VALUES = new Set(Object.values(SEMANTIC_RELATION_KIND));
const STRUCTURAL_RELATION_KINDS = new Set([
  SEMANTIC_RELATION_KIND.Structure,
  SEMANTIC_RELATION_KIND.Classification,
]);

function normalizedText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function requiredText(value, label, maxCharacters) {
  const text = normalizedText(value);
  if (!text) throw new Error(`${label}不能为空`);
  if (text.length > maxCharacters) {
    throw new Error(`${label}超过 ${maxCharacters} 字符`);
  }
  return text;
}

function stringList(value, maxItems, maxCharacters) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(normalizedText)
    .filter((item) => item && item.length <= maxCharacters))]
    .slice(0, maxItems);
}

function sourceLineCount(markdown) {
  return Math.max(1, String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n').length);
}

function normalizeSourceSpans(value, lineCount, ownerLabel) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${ownerLabel}必须保留至少一个原文行号范围`);
  }
  const seen = new Set();
  const spans = [];
  for (const raw of value) {
    const startLine = Number(raw?.startLine);
    const endLine = Number(raw?.endLine);
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
      throw new Error(`${ownerLabel}的原文行号必须是整数`);
    }
    if (startLine < 1 || endLine < startLine || endLine > lineCount) {
      throw new Error(`${ownerLabel}的原文行号超出 1-${lineCount} 范围`);
    }
    const key = `${startLine}:${endLine}`;
    if (seen.has(key)) continue;
    seen.add(key);
    spans.push({ startLine, endLine });
  }
  return spans;
}

function normalizeNode(value, lineCount) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('语义节点必须是对象');
  }
  const key = requiredText(value.key, '语义节点 key', 160);
  const label = requiredText(
    value.label,
    `语义节点“${key}”的名称`,
    SEMANTIC_DRAFT_LIMITS.maxLabelCharacters,
  );
  if (!NODE_KIND_VALUES.has(value.kind)) {
    throw new Error(`语义节点“${label}”的类型无效：${value.kind}`);
  }
  const summary = requiredText(
    value.summary,
    `语义节点“${label}”的摘要`,
    SEMANTIC_DRAFT_LIMITS.maxSummaryCharacters,
  );
  const details = normalizedText(value.details);
  if (details.length > SEMANTIC_DRAFT_LIMITS.maxDetailsCharacters) {
    throw new Error(
      `语义节点“${label}”的详细内容超过 ${SEMANTIC_DRAFT_LIMITS.maxDetailsCharacters} 字符`,
    );
  }
  return {
    key,
    label,
    kind: value.kind,
    summary,
    ...(details && details !== summary ? { details } : {}),
    aliases: stringList(value.aliases, 20, 160),
    tags: stringList(value.tags, 40, 80),
    sourceSpans: normalizeSourceSpans(value.sourceSpans, lineCount, `语义节点“${label}”`),
    ...(value.kind === SEMANTIC_NODE_KIND.Mechanism ? {
      mechanism: {
        triggerKeys: stringList(value.mechanism?.triggerKeys, 40, 160),
        participantKeys: stringList(value.mechanism?.participantKeys, 80, 160),
        stateKeys: stringList(value.mechanism?.stateKeys, 80, 160),
        outcomeKeys: stringList(value.mechanism?.outcomeKeys, 40, 160),
        failureKeys: stringList(value.mechanism?.failureKeys, 40, 160),
      },
    } : {}),
  };
}

function normalizeRelation(value, lineCount, nodeKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('语义关系必须是对象');
  }
  const sourceKey = requiredText(value.sourceKey, '语义关系 sourceKey', 160);
  const targetKey = requiredText(value.targetKey, '语义关系 targetKey', 160);
  if (sourceKey === targetKey) throw new Error(`语义关系不能自指：${sourceKey}`);
  if (!nodeKeys.has(sourceKey)) throw new Error(`语义关系引用了不存在的源节点：${sourceKey}`);
  if (!nodeKeys.has(targetKey)) throw new Error(`语义关系引用了不存在的目标节点：${targetKey}`);
  if (!RELATION_KIND_VALUES.has(value.kind)) {
    throw new Error(`语义关系“${sourceKey} → ${targetKey}”的类型无效：${value.kind}`);
  }
  const label = requiredText(value.label, `语义关系“${sourceKey} → ${targetKey}”的名称`, 80);
  return {
    sourceKey,
    targetKey,
    kind: value.kind,
    label,
    sourceSpans: normalizeSourceSpans(value.sourceSpans, lineCount, `语义关系“${label}”`),
  };
}

function assertMechanismSpecs(nodes, relations, nodeKeys) {
  const nodesByKey = new Map(nodes.map((node) => [node.key, node]));
  for (const node of nodes) {
    if (node.kind !== SEMANTIC_NODE_KIND.Mechanism) continue;
    const groups = [
      ['triggerKeys', node.mechanism.triggerKeys, 1],
      ['participantKeys', node.mechanism.participantKeys, 1],
      ['stateKeys', node.mechanism.stateKeys, 2],
      ['outcomeKeys', node.mechanism.outcomeKeys, 1],
    ];
    for (const [name, keys, minimum] of groups) {
      if (keys.length < minimum) {
        throw new Error(`机制“${node.label}”的 ${name} 至少需要 ${minimum} 个节点`);
      }
    }
    const declaredKeys = new Set([
      node.key,
      ...node.mechanism.triggerKeys,
      ...node.mechanism.participantKeys,
      ...node.mechanism.stateKeys,
      ...node.mechanism.outcomeKeys,
      ...node.mechanism.failureKeys,
    ]);
    for (const key of declaredKeys) {
      if (!nodeKeys.has(key)) throw new Error(`机制“${node.label}”引用了不存在的节点：${key}`);
    }
    for (const key of node.mechanism.stateKeys) {
      if (nodesByKey.get(key)?.kind !== SEMANTIC_NODE_KIND.State) {
        throw new Error(`机制“${node.label}”的状态节点必须使用 state 类型：${key}`);
      }
    }
    const transitionCount = relations.filter((relation) => (
      declaredKeys.has(relation.sourceKey)
      && declaredKeys.has(relation.targetKey)
      && [SEMANTIC_RELATION_KIND.Causality, SEMANTIC_RELATION_KIND.StateTransition].includes(relation.kind)
    )).length;
    if (transitionCount === 0) throw new Error(`机制“${node.label}”缺少因果或状态转换关系`);
  }
}

function normalizeQuestion(value, nodeKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const text = normalizedText(value.text);
  if (!text || text.length > 160) return null;
  const relatedNodeKey = normalizedText(value.relatedNodeKey);
  if (relatedNodeKey && !nodeKeys.has(relatedNodeKey)) {
    throw new Error(`问题“${text}”引用了不存在的节点：${relatedNodeKey}`);
  }
  return {
    text,
    ...(relatedNodeKey ? { relatedNodeKey } : {}),
    ...(normalizedText(value.kind) ? { kind: normalizedText(value.kind) } : {}),
    ...(normalizedText(value.difficulty) ? { difficulty: normalizedText(value.difficulty) } : {}),
  };
}

function assertNoStructuralCycles(nodes, relations) {
  const children = new Map(nodes.map((node) => [node.key, []]));
  for (const relation of relations) {
    if (!STRUCTURAL_RELATION_KINDS.has(relation.kind)) continue;
    children.get(relation.sourceKey).push(relation.targetKey);
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (key) => {
    if (visiting.has(key)) throw new Error(`结构或分类关系存在循环：${key}`);
    if (visited.has(key)) return;
    visiting.add(key);
    for (const child of children.get(key) ?? []) visit(child);
    visiting.delete(key);
    visited.add(key);
  };
  for (const node of nodes) visit(node.key);
}

export function normalizeSemanticDraft(value, { fallbackTitle, markdown }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('语义编译结果必须是对象');
  }
  const title = requiredText(
    normalizedText(value.title) || fallbackTitle,
    '语义编译标题',
    SEMANTIC_DRAFT_LIMITS.maxLabelCharacters,
  );
  if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
    throw new Error('语义编译没有产生可独立寻址的知识节点');
  }
  if (value.nodes.length > SEMANTIC_DRAFT_LIMITS.maxNodes) {
    throw new Error(`语义节点超过 ${SEMANTIC_DRAFT_LIMITS.maxNodes} 个，请缩小输入范围`);
  }

  const lineCount = sourceLineCount(markdown);
  const nodes = value.nodes.map((node) => normalizeNode(node, lineCount));
  const nodeKeys = new Set();
  for (const node of nodes) {
    if (nodeKeys.has(node.key)) throw new Error(`语义节点 key 重复：${node.key}`);
    nodeKeys.add(node.key);
  }

  const relationValues = Array.isArray(value.relations) ? value.relations : [];
  if (relationValues.length > SEMANTIC_DRAFT_LIMITS.maxRelations) {
    throw new Error(`语义关系超过 ${SEMANTIC_DRAFT_LIMITS.maxRelations} 条，请缩小输入范围`);
  }
  const relations = relationValues.map((relation) => normalizeRelation(relation, lineCount, nodeKeys));
  const relationKeys = new Set();
  for (const relation of relations) {
    const key = `${relation.sourceKey}\u0000${relation.targetKey}\u0000${relation.kind}`;
    if (relationKeys.has(key)) throw new Error(`语义关系重复：${relation.label}`);
    relationKeys.add(key);
  }
  assertNoStructuralCycles(nodes, relations);
  assertMechanismSpecs(nodes, relations, nodeKeys);

  const questions = (Array.isArray(value.questions) ? value.questions : [])
    .map((question) => normalizeQuestion(question, nodeKeys))
    .filter(Boolean)
    .slice(0, SEMANTIC_DRAFT_LIMITS.maxQuestions);

  return {
    title,
    categories: stringList(value.categories, 8, 80),
    nodes,
    relations,
    questions,
    sourceLineCount: lineCount,
  };
}

export function semanticDraftStats(draft) {
  const childKeys = new Set(draft.relations
    .filter((relation) => STRUCTURAL_RELATION_KINDS.has(relation.kind))
    .map((relation) => relation.targetKey));
  return {
    nodeCount: draft.nodes.length,
    relationCount: draft.relations.length,
    rootCount: draft.nodes.filter((node) => !childKeys.has(node.key)).length,
    questionCount: draft.questions.length,
  };
}
