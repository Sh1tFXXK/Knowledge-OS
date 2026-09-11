import type { Question } from '../types';

/** HTML5 拖拽协议：问题卡拖动时写入 dataTransfer 的自定义类型（值为问题 ID） */
export const QUESTION_DRAG_TYPE = 'application/x-knowledge-os-question-card';

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

/** 命中判定：drop 点是否落在左侧目录树的某个节点行上；命中则返回目录项 ID */
function findTreeNodeAtPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  const row = el?.closest('[data-tree-node-id]') as HTMLElement | null;
  return row?.dataset.treeNodeId ?? null;
}

/**
 * drop 兜底：问题卡落到非目录树区域时，若 drop 点实际压在目录树节点上（如滚动容器边缘），
 * 仍然完成移动。返回 true 表示该 drop 已被处理（调用方应阻止冒泡/默认行为）。
 */
export function handleQuestionDropOnTree(
  event: { clientX: number; clientY: number; dataTransfer: DataTransfer },
  moveQuestionToNode: (questionId: string, targetId: string) => string | null,
  addNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void,
): boolean {
  const questionId = event.dataTransfer.getData(QUESTION_DRAG_TYPE);
  if (!questionId) return false;

  const targetTreeNodeId = findTreeNodeAtPoint(event.clientX, event.clientY);
  if (!targetTreeNodeId) {
    addNotification('请拖到左侧目录树的某个节点上', 'warning');
    return true;
  }
  const targetLabel = moveQuestionToNode(questionId, targetTreeNodeId);
  addNotification(
    targetLabel
      ? `问题已移动到「${targetLabel}」`
      : '该目录没有关联知识点，无法移动问题',
    targetLabel ? 'success' : 'warning',
  );
  return true;
}
