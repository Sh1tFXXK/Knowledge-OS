import type { KnowledgeNode, Question, QuestionAnswerStep } from '../types';

function firstTabContent(node: KnowledgeNode): string {
  return node.card.tabs.find((tab) => tab.content.trim())?.content.trim() ?? '';
}

export function normalizeQuestionAnswerSteps(
  steps: QuestionAnswerStep[] | undefined,
  nodePool: Record<string, KnowledgeNode>,
): QuestionAnswerStep[] {
  if (!steps?.length) return [];

  return steps
    .map((step) => {
      const normalized: QuestionAnswerStep = { nodeId: step.nodeId.trim() };
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

    lines.push(`${index + 1}. ${node.label}`);

    const content = firstTabContent(node);
    if (content) lines.push(content);
    if (step.note) lines.push(`备注：${step.note}`);

    if (index < steps.length - 1) lines.push('');
  });

  return lines.join('\n').trim();
}
