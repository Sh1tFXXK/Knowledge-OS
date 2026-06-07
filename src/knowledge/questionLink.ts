import type { Question } from '../types';

/** 某知识点关联的全部问题 */
export function questionsForNode(questions: Question[], nodeId: string): Question[] {
  return questions.filter((q) => q.relatedNodeId === nodeId);
}

/** 目录切换焦点时：取该节点第一题 */
export function pickQuestionForFocus(
  questions: Question[],
  focusNodeId: string | null,
): string | null {
  if (!focusNodeId) return null;
  return questionsForNode(questions, focusNodeId)[0]?.id ?? null;
}

/**
 * 打开解释卡时：若当前题仍属于该节点则保留，否则切到该节点第一题
 */
export function resolveQuestionForNode(
  questions: Question[],
  nodeId: string | null,
  currentId: string | null,
): string | null {
  if (!nodeId) return currentId;
  const related = questionsForNode(questions, nodeId);
  if (related.length === 0) return currentId;
  if (currentId && related.some((q) => q.id === currentId)) return currentId;
  return related[0].id;
}
