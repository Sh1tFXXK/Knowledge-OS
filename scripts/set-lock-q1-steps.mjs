#!/usr/bin/env node
/**
 * 给 q_lock_1（"MySQL 有哪些锁类型？"）写入带结构定位的 answerSteps，
 * 验证 demo_lock 的 1 维度 / 5 section 全部能被 answerSteps 消费。
 *
 * 这是 Item 3 的数据落地——结构按稳定 ID（ViewDimension.id / ViewSection.id）记，
 * 增删 section 不会让已有步骤指到别处去。composeQuestionAnswerDraft 会按结构
 * 取出该 section 成员原子生成答案。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetPath = path.join(root, 'data', 'questions.json');

const raw = fs.readFileSync(targetPath, 'utf8');
const list = JSON.parse(raw);
if (!Array.isArray(list)) throw new Error('questions.json 根不是数组');

const idx = list.findIndex((q) => q && q.id === 'q_lock_1');
if (idx < 0) throw new Error('questions.json 找不到 q_lock_1');

const answerSteps = [
  // 整节点 + 一个对照 section：丢掉定位时退化为整节点的第 1 个 tab 正文
  { nodeId: 'demo_lock' },
  // 按存储引擎
  { nodeId: 'demo_lock', dimensionId: 'lock_composition', sectionId: 'lock_engine_grid' },
  // 按操作类型
  { nodeId: 'demo_lock', dimensionId: 'lock_composition', sectionId: 'lock_type_grid' },
  // 按锁粒度
  { nodeId: 'demo_lock', dimensionId: 'lock_composition', sectionId: 'lock_grain_grid' },
  // 按锁策略
  { nodeId: 'demo_lock', dimensionId: 'lock_composition', sectionId: 'lock_strategy_grid' },
  // 锁粒度对比（matrix 视角）
  { nodeId: 'demo_lock', dimensionId: 'lock_composition', sectionId: 'lock_grain_matrix' },
];

const before = list[idx];
const after = {
  ...before,
  answerSteps,
  updatedAt: Date.now(),
};

list[idx] = after;

const tmp = targetPath + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n', 'utf8');
fs.renameSync(tmp, targetPath);

console.log(`q_lock_1 → answerSteps 已写入，共 ${answerSteps.length} 步`);
answerSteps.forEach((s, i) => {
  const loc = s.dimensionId ? ` › ${s.dimensionId} › ${s.sectionId}` : ' (整节点)';
  console.log(`  ${i + 1}. ${s.nodeId}${loc}`);
});
