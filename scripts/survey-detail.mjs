// 细查：三个同名文件夹内容 + 重名/疑似同题实例
import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));
let db = null;
(function w(n) { if (n.nodeRef === 'n_u4va719e' && !db) db = n; for (const c of (n.children || [])) w(c); })(tree);

function findCh(name) { return (db.children || []).find(c => c.name === name); }
function showNode(id, max = 200) {
  const p = pool[id];
  if (!p) { console.log('   [' + id + '] 无池卡'); return; }
  const tabs = (p.card?.tabs || []).map(t => t.label + ':' + (t.content || '').length).join(',');
  console.log('   [' + id + '] ' + p.label + ' | role:' + (p.role || '?') + ' | status:' + (p.status || '-') + ' | ' + tabs);
  const def = (p.card?.tabs || []).find(t => t.id === 'def') || (p.card?.tabs || [])[0];
  if (def) console.log('      ', JSON.stringify((def.content || '').slice(0, max)));
}

// 文件夹内容
for (const chName of ['一、数据库系统', '九、日志系统', '十六、数据库安全']) {
  const ch = findCh(chName);
  const folderName = { '一、数据库系统': '数据库 / database', '九、日志系统': '日志', '十六、数据库安全': '数据库安全' }[chName];
  const folder = (ch.children || []).find(c => c.name === folderName);
  console.log('\n#### ' + chName + ' → ' + folderName + ' [' + (folder?.nodeRef || '-') + ']');
  (function d(n, depth) {
    const p = pool[n.nodeRef];
    console.log(' '.repeat(depth * 2) + n.name + ' [' + (n.nodeRef || '-') + ']' + (p ? ' role:' + (p.role || '?') : ''));
    for (const c of (n.children || [])) d(c, depth + 1);
  })(folder, 1);
  const p = pool[folder.nodeRef];
  const def = (p?.card?.tabs || []).find(t => t.id === 'def');
  console.log('   文件夹本体卡:', JSON.stringify((def?.content || '').slice(0, 260)));
}

// 重名/疑点实例
console.log('\n#### 疑点实例内容');
const checks = {
  '三、数据库结构': ['MySQL SDI', 'MySQL 序列化字典信息', 'MySQL 视图'],
  '四、数据约束与标识': ['MySQL 合成键', 'MySQL 代理键', 'MySQL 唯一键', 'MySQL 唯一约束', 'MySQL 外键', 'MySQL 外键约束', 'MySQL 主键索引'],
  '五、数据库操作': ['MySQL 动态语句', 'MySQL 动态 SQL'],
  '八、恢复系统': ['MySQL dirty  page', 'MySQL 脏页', 'MySQL 原始备份', 'MySQL 物理备份'],
  '十、存储系统': ['MySQL 变更缓冲区', 'MySQL 插入缓冲区', 'MySQL 插入缓冲'],
  '十七、数据库运维': ['MySQL 磁盘绑定', 'MySQL I/O 绑定', 'MySQL 计数器', 'MySQL 指标计数器'],
  '十八、数据库编程与接口': ['未分类', 'MySQL API', 'MySQL 应用程序编程接口（API）'],
};
for (const [chName, labels] of Object.entries(checks)) {
  const ch = findCh(chName);
  const flat = [];
  (function w(n) { flat.push(n); for (const c of (n.children || [])) w(c); })(ch);
  for (const label of labels) {
    const entry = flat.find(n => n.name === label);
    if (!entry) { console.log('  [' + chName + '] 未找到:', label); continue; }
    showNode(entry.nodeRef, 150);
  }
}
