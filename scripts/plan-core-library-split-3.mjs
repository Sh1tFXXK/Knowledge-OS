/**
 * 只读预检 · 第三轮：tab 命名惯例 + 目标节点 tab 明细
 */
import { loadAll } from './shell-fusion/lib.mjs'

const { pool } = loadAll()
const entries = Object.entries(pool)

console.log('=== A. 全库 tab.id 形态分布（top 40，按出现次数）===')
const idCount = new Map()
for (const [, v] of entries) {
  for (const t of v.card?.tabs ?? []) {
    const k = String(t.id ?? '(none)')
    idCount.set(k, (idCount.get(k) ?? 0) + 1)
  }
}
const sorted = [...idCount.entries()].sort((a, b) => b[1] - a[1])
console.log('唯一 tab.id 数', sorted.length)
for (const [k, n] of sorted.slice(0, 40)) console.log(`   ${String(n).padStart(5)}  ${k}`)

console.log('\n=== B. 疑似「按方法名建 tab」的先例（id 含括号 或 形如 java 方法名）===')
const methodish = sorted.filter(([k]) => /[()]/.test(k) || /^[a-z][a-zA-Z0-9]*$/.test(k))
const shapeGroups = new Map()
for (const [k, n] of methodish) {
  const shape = /[()]/.test(k) ? 'HAS_PAREN' : 'bare-lowerCamel'
  if (!shapeGroups.has(shape)) shapeGroups.set(shape, [])
  shapeGroups.get(shape).push([k, n])
}
for (const [shape, arr] of shapeGroups) {
  console.log(`\n-- ${shape}  ${arr.length} 种`)
  for (const [k, n] of arr.sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`   ${String(n).padStart(5)}  ${k}`)
}

console.log('\n=== C. 目标节点 tab 明细（id / label / content 前 60 字）===')
for (const ref of ['k_java_lang_string', 'k_java_lang_stringbuilder', 'k_java_util_scanner', 'k_java_nio_file_files', 'k_java_lang_enum', 'k_nio_files_util', 'k_vault_javajava_1b1w4s']) {
  const ent = pool[ref]
  if (!ent) { console.log(`\n## ${ref} ⚠️ 不存在`); continue }
  console.log(`\n## ${ref}  label=${ent.label}  root=${(ent.card?.rootContent ?? '').length}字  子tab=${(ent.card?.tabs ?? []).length}`)
  for (const t of ent.card?.tabs ?? []) {
    console.log(`   [${t.id}] ${t.label}  ${(t.content ?? '').length}字  tags=${JSON.stringify(t.tags ?? [])}  keys=${JSON.stringify(Object.keys(t))}`)
  }
}

console.log('\n=== D. 池节点 card 完整字段形状（样本 k_java_lang_string）===')
const s = pool['k_java_lang_string']
console.log('节点顶级键:', JSON.stringify(Object.keys(s)))
console.log('card 键:', JSON.stringify(Object.keys(s.card)))
console.log('第一个 tab 键序:', JSON.stringify(Object.keys(s.card.tabs[0])))
console.log('\n完整节点 JSON（截断到 1200 字）:')
console.log(JSON.stringify(s, null, 2).slice(0, 1200))

console.log('\n=== E. 全库有多少节点是「每个方法一个 tab」形态（tabs>=8 且 tab.id 长度<24）===')
let cnt = 0
const samples = []
for (const [k, v] of entries) {
  const tabs = v.card?.tabs ?? []
  if (tabs.length >= 8 && tabs.every((t) => String(t.id ?? '').length < 24)) {
    cnt++
    if (samples.length < 8) samples.push(`${k} (${v.label}) tabs=${tabs.length}: ${tabs.slice(0, 6).map((t) => t.label).join(' | ')}`)
  }
}
console.log('命中', cnt)
for (const s2 of samples) console.log('   ' + s2)
