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
