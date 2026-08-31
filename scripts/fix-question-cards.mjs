// 问题卡修复（2026-08-31）
//  1) 23 道题挂在本体概念节点上，而这些节点已从树上摘除（事务/索引融合）：
//     浏览树时题目永不联动、问题卡「相关节点」没有导航落点。
//     按章节语境原则改挂到树上实际存在的承接节点：
//     concept_index   -> n_0xxb9cqy（MySQL 索引，卡内已含本体标签页）
//     concept_transaction -> n_ag24bbkc（MySQL 事务，卡内已含数据库事务全部标签页）
//  2) 清除答案代码示例中的 IDE 残留注释（TODO Auto-generated method stub）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-question-cards-${ts}`);
mkdirSync(backupDir, { recursive: true });
copyFileSync(join(DATA, 'questions.json'), join(backupDir, 'questions.json'));
console.log('backup ->', backupDir);

const qs = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));
const retarget = {
  concept_index: 'n_0xxb9cqy',
  concept_transaction: 'n_ag24bbkc',
};
let moved = 0;
for (const q of qs) {
  const to = retarget[q.relatedNodeId];
  if (to) { q.relatedNodeId = to; q.updatedAt = Date.now(); moved++; }
}
console.log('retargeted:', moved);

let cleaned = 0;
for (const q of qs) {
  if (q.answer && q.answer.includes('TODO Auto-generated method stub')) {
    q.answer = q.answer.split('\n').filter((l) => !l.includes('TODO Auto-generated method stub')).join('\n');
    cleaned++;
  }
  if (Array.isArray(q.answerSteps)) {
    for (const s of q.answerSteps) {
      if (s && s.includes('TODO Auto-generated method stub')) cleaned++;
    }
    q.answerSteps = q.answerSteps.map((s) => s ? s.split('\n').filter((l) => !l.includes('TODO Auto-generated method stub')).join('\n') : s);
  }
}
console.log('TODO artifacts removed from:', cleaned);

// 校验：树上无节点的挂载清零
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const mounted = new Set();
(function w(n) { if (n.nodeRef) mounted.add(n.nodeRef); for (const c of (n.children || [])) w(c); })(tree);
let unmountedTargets = 0;
for (const q of qs) if (q.relatedNodeId && !mounted.has(q.relatedNodeId)) unmountedTargets++;
console.log('挂到树上无节点的问题:', unmountedTargets);

const tmp = join(DATA, `questions.json.tmp-${process.pid}`);
writeFileSync(tmp, JSON.stringify(qs, null, 2), 'utf8');
renameSync(tmp, join(DATA, 'questions.json'));
console.log('fix-question-cards complete');
