import fs from 'node:fs'
const T = JSON.parse(fs.readFileSync('data/tree-data.json', 'utf8'))
const P = JSON.parse(fs.readFileSync('data/node-pool.json', 'utf8'))
const byId = P instanceof Map ? P : new Map(Object.entries(P))
function walk(list, parent = null, out = []) {
  for (const e of list) { out.push({ e, parent }); if (e.children) walk(e.children, e, out) }
  return out
}
const flat = walk(T.children ?? [])
const find = (id) => flat.find((x) => x.e.id === id)
const kids = (id) => { const h = find(id); return h ? (h.e.children ?? []).map((c) => c.name) : null }
console.log('== 提级验证 ==')
for (const [host, label] of [['tree_1783171786694_r8028l', '对象回收宿主'], ['tree_1786175188148_3flq6j', 'MySQL 索引'], ['chapter_db_01', '一、数据库系统']]) {
  console.log(` ${label}(${host}) → ${JSON.stringify(kids(host))}`)
}
console.log('\n== E 壳卸树验证（应全部"已卸"）==')
for (const id of ['tree_1785923886640_ydkgnc', 'tree_vault_javarabbitmq01mq_j62j4c', 'tree_sharding_when', 'tree_idxf_overview', 'tree_1783264901125_rlyl58', 'tree_wiki_en_outline_of_databases_s1']) {
  console.log(` ${id} → ${find(id) ? '仍存在!!' : '已卸'}`)
}
console.log('\n== D1 机制状态卸树（应为"已卸"）==')
for (const id of ['tree_aop_state_proxy_created', 'tree_aop_state_intercepted', 'tree_aop_state_chain_running', 'tree_aop_state_advice_done', 'tree_aop_state_target_invoked', 'tree_tio_state_read_syscall', 'tree_tio_state_disk_to_kernel', 'tree_tio_state_kernel_to_user', 'tree_tio_state_write_syscall', 'tree_tio_state_user_to_socket', 'tree_tio_state_socket_to_nic']) {
  console.log(` ${id} → ${find(id) ? '仍存在!!' : '已卸'}`)
}
console.log('\n== 改名 / supplement 面验证 ==')
for (const id of ['tree_aop_flow', 'tree_tio_flow', 'tree_bcs_caller', 'tree_sk_perf_bottleneck', 'tree_1784045501055_mkyads', 'tree_java_fw_rabbitmq', 'tree_sharding_overview']) {
  const h = find(id)
  if (!h) { console.log(` ${id} → 不存在!!`); continue }
  const tabs = (h.e.supplement?.tabs ?? []).map((t) => t.label)
  console.log(` ${id} 「${h.e.name}」 tabs=${tabs.length} ${JSON.stringify(tabs)}`)
}
console.log('\n== 退休壳状态 ==')
for (const ref of ['k_1785923886439_k5so6c', 'k_vault_javarabbitmq01mq_j62j4c', 'sharding_when', 'idxf_overview', 'k_1783264901088_1s02ir', 'k_wiki_en_outline_of_databases_s1']) {
  const n = byId.get(ref)
  console.log(` ${ref} → ${n ? `status=${n.status ?? '(none)'} redirectTo=${n.redirectTo ?? '-'}` : '不在池!!'}`)
}
console.log('\n== 机制状态节点仍在池 ==')
for (const ref of ['aop_state_proxy_created', 'tio_state_socket_to_nic']) {
  console.log(` ${ref} → ${byId.has(ref) ? '在池' : '不在池!!'}`)
}
