/**
 * 从概念字典中提取术语，与已有节点池对比去重，生成新节点。
 * 
 * 用法: node scripts/merge-concept-dict.mjs
 * 输出: 打印新增节点数量，自动写回 node-pool.json（需确认）
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, '..', 'data');
const CONCEPT_FILE = resolve(__dirname, '..', '概念字典.md');

// ── 1. 解析概念字典 ──
const md = readFileSync(CONCEPT_FILE, 'utf8');
const lines = md.split('\n');

// 提取所有列表项（- xxx）
const rawTerms = [];
for (const line of lines) {
  const m = line.match(/^- (.+)/);
  if (m) rawTerms.push(m[1].trim());
}

console.log(`从概念字典中提取到 ${rawTerms.length} 个术语`);

// ── 2. 标准化术语 ──
// 去除括号注释，保留核心名称
// 比如 "ACID" -> "ACID"
// "10046 事件（SQL Trace）" -> "10046 事件"
// "Adaptive Hash Index（自适应哈希索引）" -> "Adaptive Hash Index"
// "安全连接（SSL/TLS）" -> "安全连接"
// 对中文术语：保留中文主体
function normalizeTerm(raw) {
  // 去除括号注释，但保留一些特殊类型
  let t = raw;
  // 移除末尾括号注释（中文括号或英文括号）
  // 比如 "10046 事件（SQL Trace）" -> "10046 事件"
  // "Adaptive Hash Index（自适应哈希索引）" -> "Adaptive Hash Index"
  t = t.replace(/[（(].+?[）)]$/, '').trim();
  // 如果去掉括号后为空或太短，保留原样
  if (!t || t.length < 2) t = raw;
  return t;
}

// 有些术语有多层括号，或斜杠分隔
function normalizeForCompare(label) {
  return label
    .toLowerCase()
    .replace(/[\s\-_/]/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .trim();
}

// ── 3. 读取已有节点池 ──
const poolPath = resolve(DATA, 'node-pool.json');
const pool = JSON.parse(readFileSync(poolPath, 'utf8'));

const existingLabels = new Set();
const existingNorm = new Map(); // normalized -> original label
for (const node of Object.values(pool)) {
  const label = node.label;
  existingLabels.add(label);
  const norm = normalizeForCompare(label);
  existingNorm.set(norm, label);
  
  // 也存节点 id
  if (!existingNorm.has(label.toLowerCase())) {
    existingNorm.set(label.toLowerCase(), label);
  }
}

console.log(`节点池中现有 ${Object.keys(pool).length} 个节点`);

// ── 4. 对比去重 ──
// 对于每个字典术语，检查是否已经存在于节点池
const newTerms = [];
const dupTerms = [];
const fuzzyDupTerms = [];

for (const raw of rawTerms) {
  const primary = normalizeTerm(raw);
  
  // 精确匹配 label
  if (existingLabels.has(primary)) {
    dupTerms.push({ raw, primary, match: primary });
    continue;
  }
  
  // 标准化匹配
  const norm = normalizeForCompare(primary);
  if (existingNorm.has(norm)) {
    const matched = existingNorm.get(norm);
    fuzzyDupTerms.push({ raw, primary, match: matched, norm });
    continue;
  }
  
  // 检查是否已存在类似术语（主、英文部分分别检查）
  // 比如 "Table" 和 "表" 可能是同一个概念
  // 但这里不做复杂语义匹配，只做标识符级别
  
  newTerms.push({ raw, primary });
}

console.log(`\n=== 去重结果 ===`);
console.log(`精确匹配（重复）: ${dupTerms.length} 个`);
console.log(`模糊匹配（重复）: ${fuzzyDupTerms.length} 个`);
console.log(`新增术语: ${newTerms.length} 个`);

if (fuzzyDupTerms.length > 0) {
  console.log(`\n模糊匹配详情:`);
  for (const t of fuzzyDupTerms.slice(0, 20)) {
    console.log(`  "${t.raw}" ≈ "${t.match}"`);
  }
  if (fuzzyDupTerms.length > 20) console.log(`  ... 还有 ${fuzzyDupTerms.length - 20} 个`);
}

// ── 5. 生成新节点 ──
// ID 生成: k_dict_xxx
function genId() {
  return 'k_dict_' + Math.random().toString(36).slice(2, 10);
}

const newNodes = {};
for (const term of newTerms) {
  const id = genId();
  const label = term.primary;
  newNodes[id] = {
    id,
    label,
    card: {
      nodeId: id,
      title: label,
      tabs: [
        { id: 'def', label: '定义', content: `"${label}" 待补充内容。` },
        { id: 'mech', label: '机制', content: '' },
        { id: 'bound', label: '边界', content: '' },
        { id: 'source', label: '来源', content: '概念字典' },
      ],
    },
  };
}

console.log(`\n生成了 ${Object.keys(newNodes).length} 个新节点`);

// ── 6. 可选：写入文件 ──
// 打印前 20 个新节点
console.log(`\n前 20 个新节点:`);
let count = 0;
for (const [id, node] of Object.entries(newNodes)) {
  if (count++ >= 20) break;
  console.log(`  ${id}: ${node.label}`);
}

// 写入
const mergedPool = { ...pool, ...newNodes };
writeFileSync(poolPath, JSON.stringify(mergedPool, null, 2), 'utf8');
console.log(`\n已写回 node-pool.json，总计 ${Object.keys(mergedPool).length} 个节点`);

// 输出统计
console.log(`\n=== 统计 ===`);
console.log(`原节点数: ${Object.keys(pool).length}`);
console.log(`新增节点数: ${Object.keys(newNodes).length}`);
console.log(`现节点数: ${Object.keys(mergedPool).length}`);
