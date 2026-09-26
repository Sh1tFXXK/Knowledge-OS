import type { KnowledgeNode, Question, QuestionAnswerStep, ViewDimension, ViewSection } from '../types';
import { resolveSectionAtoms } from './projection';

function firstTabContent(node: KnowledgeNode): string {
  // `String(tab.content ?? '')` 而不是直接 `tab.content.trim()`：历史数据里存在缺 `content` 键的 tab，
  // 只要它排在第一个有正文的 tab 之前，`find` 就会对它求值并抛 TypeError。
  // 同一防御式写法已是仓库既有约定，见 indexGraphLayout.ts 的 definitionForKnowledge()。
  return String(node.card.tabs.find((tab) => String(tab.content ?? '').trim())?.content ?? '').trim();
}

function sectionTitle(section: ViewSection): string {
  return section.title?.trim() || section.layout;
}

export interface AnswerStepPlacement {
  node: KnowledgeNode;
  dimension: ViewDimension;
  section: ViewSection;
}

/**
 * 解析步骤的「结构定位」。
 *
 * 定位靠**稳定 ID**（ViewDimension.id / ViewSection.id），不靠数组下标，
 * 所以结构增删 section 不会让已有的答案步骤指到别处去。
 * 定位不成立（没写 / 维度或 section 已被删掉）时返回 null，
 * 调用方退化为"引用整个节点的第一个 tab 正文"，而不是报错或整步丢弃。
 */
export function resolveAnswerStepPlacement(
  step: QuestionAnswerStep,
  nodePool: Record<string, KnowledgeNode>,
): AnswerStepPlacement | null {
  const node = nodePool[step.nodeId];
  if (!node || !step.dimensionId || !step.sectionId) return null;

  const dimension = (node.viewDimensions ?? []).find((item) => item.id === step.dimensionId);
  const section = dimension?.sections.find((item) => item.id === step.sectionId);
  if (!dimension || !section) return null;

  return { node, dimension, section };
}

/** 步骤目标的可读标签：整节点 = `节点名`；带结构定位 = `节点名 › 维度名 › section 标题`。 */
export function formatAnswerStepTarget(
  step: QuestionAnswerStep,
  nodePool: Record<string, KnowledgeNode>,
): string {
  const node = nodePool[step.nodeId];
  if (!node) return step.nodeId;

  const placement = resolveAnswerStepPlacement(step, nodePool);
  if (!placement) return node.label;

  return `${node.label} › ${placement.dimension.name} › ${sectionTitle(placement.section)}`;
}

/** 步骤的稳定去重键：同一节点可以同时被"整节点"与"某个 section"各引用一次。 */
export function answerStepKey(step: QuestionAnswerStep): string {
  return `${step.nodeId}::${step.dimensionId ?? ''}::${step.sectionId ?? ''}`;
}

export function normalizeQuestionAnswerSteps(
  steps: QuestionAnswerStep[] | undefined,
  nodePool: Record<string, KnowledgeNode>,
): QuestionAnswerStep[] {
  if (!steps?.length) return [];

  return steps
    .map((step) => {
      const nodeId = step.nodeId.trim();
      const normalized: QuestionAnswerStep = { nodeId };

      // 结构定位按稳定 ID 校验：指向已不存在的维度/section 时，丢掉的是定位而不是整步
      const dimensionId = step.dimensionId?.trim();
      const sectionId = step.sectionId?.trim();
      if (dimensionId && sectionId
        && resolveAnswerStepPlacement({ nodeId, dimensionId, sectionId }, nodePool)) {
        normalized.dimensionId = dimensionId;
        normalized.sectionId = sectionId;
      }

      const note = step.note?.trim();
      if (note) normalized.note = note;
      return normalized;
    })
    .filter((step) => step.nodeId.length > 0 && Boolean(nodePool[step.nodeId]));
}

export function composeQuestionAnswerDraft(
  question: Question,
  nodePool: Record<string, KnowledgeNode>,
): string {
  const steps = normalizeQuestionAnswerSteps(question.answerSteps, nodePool);
  if (steps.length === 0) return '';

  const lines: string[] = [`问题：${question.text.trim()}`, ''];

  steps.forEach((step, index) => {
    const node = nodePool[step.nodeId];
    if (!node) return;

    const placement = resolveAnswerStepPlacement(step, nodePool);

    if (placement) {
      // 结构定位：答案直接从声明的结构里取这一 section 的成员，跟着结构走
      lines.push(`${index + 1}. ${node.label} › ${sectionTitle(placement.section)}`);
      for (const atom of resolveSectionAtoms(placement.section, nodePool)) {
        const atomNode = nodePool[atom.nodeId];
        if (!atomNode) continue;
        lines.push(`- ${atomNode.label}`);
        const content = firstTabContent(atomNode);
        if (content) lines.push(content);
      }
    } else {
      lines.push(`${index + 1}. ${node.label}`);
      const content = firstTabContent(node);
      if (content) lines.push(content);
    }

    if (step.note) lines.push(`备注：${step.note}`);

    if (index < steps.length - 1) lines.push('');
  });

  return lines.join('\n').trim();
}
