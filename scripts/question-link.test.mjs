import assert from 'node:assert/strict';
import { questionsForNode, resolveQuestionForNode } from '../src/knowledge/questionLink.ts';

// Mock questions
const mockQuestions = [
  { id: 'q1', text: 'What is A?', relatedNodeId: 'node-A', answered: false },
  { id: 'q2', text: 'How to use A?', relatedNodeId: 'node-A', answered: true },
  { id: 'q3', text: 'What is B?', relatedNodeId: 'node-B', answered: false },
];

// Test questionsForNode
const nodeAQuestions = questionsForNode(mockQuestions, 'node-A');
assert.strictEqual(nodeAQuestions.length, 2);
assert.strictEqual(nodeAQuestions[0].id, 'q1');
assert.strictEqual(nodeAQuestions[1].id, 'q2');

const nodeBQuestions = questionsForNode(mockQuestions, 'node-B');
assert.strictEqual(nodeBQuestions.length, 1);
assert.strictEqual(nodeBQuestions[0].id, 'q3');

const nodeCQuestions = questionsForNode(mockQuestions, 'node-C');
assert.strictEqual(nodeCQuestions.length, 0);

// Test resolveQuestionForNode
// 1. Current question belongs to node -> keep it
assert.strictEqual(resolveQuestionForNode(mockQuestions, 'node-A', 'q2'), 'q2');

// 2. Current question doesn't belong to node -> switch to first
assert.strictEqual(resolveQuestionForNode(mockQuestions, 'node-A', 'q3'), 'q1');

// 3. No current question -> switch to first
assert.strictEqual(resolveQuestionForNode(mockQuestions, 'node-A', null), 'q1');

// 4. Node has no questions -> keep current
assert.strictEqual(resolveQuestionForNode(mockQuestions, 'node-C', 'q1'), 'q1');

// 5. No node -> keep current
assert.strictEqual(resolveQuestionForNode(mockQuestions, null, 'q3'), 'q3');

console.log('✅ questionLink tests passed!');
