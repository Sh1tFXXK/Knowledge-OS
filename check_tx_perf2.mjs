import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const REFS = ['mysql_glossary_mini_transaction_ly3edv','mysql_glossary_innodb_autoinc_lock_mode_a8q16t','k_dict_pqd2sd20','mysql_glossary_innodb_lock_wait_timeout_1puppm','mysql_glossary_option_1sc73x'];
for (const ref of REFS) {
  const m = pool[ref]; if (!m) { console.log(ref, 'MISSING'); continue; }
  const tabs = (m.card && m.card.tabs) || [];
  const def = (tabs.find(t => t.id === 'def') || tabs[0] || {}).content || '(无)';
  console.log(`\n[${ref}] ${m.label}\n  dims=${JSON.stringify(m.dimensions||[])}\n  def: ${def.slice(0,320).replace(/\n/g,' ')}`);
}
// 检查是否已有相关 concept
console.log('\n=== 可能相关的已有 concept ===');
for (const id of Object.keys(pool)) {
  if (/concept_(auto_increment_lock|lock_wait|performance|observ|mini_transaction|option|configuration|config)/.test(id)) console.log('  ', id, pool[id].label);
}
