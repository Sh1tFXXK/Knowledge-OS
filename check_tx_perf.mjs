import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));
function walk(n, fn, parent, d = 0) { fn(n, parent, d); for (const c of (n.children || [])) walk(c, fn, n, d + 1); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }
const mysql = findNode('forest:view:mysql');

// 列出 事务 / 性能 / 并发 / 可观测 相关主题容器及其子树
const TOPICS = ['事务与并发控制','事务与锁','性能与可观测性','性能模式','事务','并发'];
console.log('=== MySQL 下 事务/性能 相关主题子树 ===');
for (const name of TOPICS) {
  // 找所有 name 匹配的节点
  walk(mysql, (n, p, d) => {
    if (n.name === name || (pool[n.nodeRef] && pool[n.nodeRef].label === name)) {
      console.log(`\n## [${name}] id=${n.id} nodeRef=${n.nodeRef || '-'} parent=${p?p.name:'?'}`);
      walk(n, (c, cp, cd) => { if (cd === 0) return; const m = pool[c.nodeRef]; console.log('   '.repeat(cd-1) + '- ' + (m ? m.label : c.name) + ' [' + (c.nodeRef||'-') + ']'); }, null, 0);
    }
  });
}

// 全树关键词扫（事务/性能/并发/可观测/锁等待/timeout/perf）
const KEY = ['事务','transaction','性能','performance','并发','concurr','可观测','observ','lock_wait','timeout','吞吐','throughput','瓶颈','bottleneck','工作负载','workload','调优','tuning','基准','benchmark'];
console.log('\n\n=== MySQL 树中 事务/性能 关键词命中 ===');
walk(mysql, (n, p, d) => {
  if (d === 0 || !n.nodeRef) return;
  const m = pool[n.nodeRef]; if (!m) return;
  const s = (m.label || '') + ' ' + (n.name || '');
  if (KEY.some(k => s.toLowerCase().includes(k.toLowerCase()))) {
    console.log(`  [d${d}] ${m.label} [${n.nodeRef}] parent=${p?p.name:'?'}`);
  }
});
