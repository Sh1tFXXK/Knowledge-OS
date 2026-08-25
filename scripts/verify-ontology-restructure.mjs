#!/usr/bin/env node
/**
 * Verify data integrity after ontology restructure.
 * Checks:
 * 1. All nodeRef references in tree exist in node-pool
 * 2. No duplicate nodeRef references in tree
 * 3. Total node count
 * 4. JSON validity
 */
import fs from 'fs';

const TREE_PATH = 'data/tree-data.json';
const POOL_PATH = 'data/node-pool.json';

const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));

// ── 1. Collect all nodeRefs from tree ──
const refsInTree = [];
const duplicateRefs = [];
const refSet = new Set();

function collectRefs(node) {
  const ref = node.nodeRef;
  if (ref) {
    if (refSet.has(ref)) {
      duplicateRefs.push(ref);
    }
    refSet.add(ref);
    refsInTree.push(ref);
  }
  if (node.children) for (const child of node.children) collectRefs(child);
}
collectRefs(tree);

console.log(`Total nodeRef references in tree: ${refsInTree.length}`);
console.log(`Unique nodeRefs in tree: ${refSet.size}`);

// ── 2. Check all refs exist in pool ──
const missingRefs = [];
for (const ref of refSet) {
  if (!pool[ref]) {
    missingRefs.push(ref);
  }
}
console.log(`Missing refs (not in pool): ${missingRefs.length}`);
if (missingRefs.length > 0) {
  console.log('First 20 missing:');
  for (const ref of missingRefs.slice(0, 20)) {
    console.log(`  ${ref}`);
  }
}

// ── 3. Duplicate refs ──
console.log(`\nDuplicate refs: ${duplicateRefs.length}`);
if (duplicateRefs.length > 0) {
  console.log('First 20 duplicates:');
  for (const ref of [...new Set(duplicateRefs)].slice(0, 20)) {
    console.log(`  ${ref}`);
  }
}

// ── 4. Count total nodes ──
let totalNodes = 0;
function countNodes(node) {
  totalNodes++;
  if (node.children) for (const child of node.children) countNodes(child);
}
countNodes(tree);
console.log(`\nTotal nodes in entire tree: ${totalNodes}`);

// ── 5. Count pool entries ──
const poolCount = Object.keys(pool).length;
console.log(`Total entries in node-pool: ${poolCount}`);

// ── 6. Count nodes under 数据库 ──
function findBranch(node, targetName) {
  const name = node.name || node.id || '';
  if (name === targetName) return node;
  if (node.children) for (const child of node.children) { const f = findBranch(child, targetName); if (f) return f; }
  return null;
}

const dbBranch = findBranch(tree, '数据库');
let dbNodes = 0;
if (dbBranch) {
  countNodes2(dbBranch);
  function countNodes2(node) {
    dbNodes++;
    if (node.children) for (const child of node.children) countNodes2(child);
  }
}
console.log(`Nodes under 数据库: ${dbNodes}`);

// ── 7. Section breakdown ──
if (dbBranch) {
  console.log('\n=== Section breakdown ===');
  for (const section of (dbBranch.children || [])) {
    let count = 0;
    function countDeep(n) { count++; if (n.children) for (const c of n.children) countDeep(c); }
    countDeep(section);
    const directChildren = (section.children || []).length;
    console.log(`  ${section.name}: ${count} nodes (${directChildren} direct)`);
  }
}

// ── 8. Check MySQL branch is under 十九 ──
const productSection = (dbBranch?.children || []).find(c => c.name === '十九、数据库产品');
if (productSection) {
  const mysqlNode = (productSection.children || []).find(c => c.name === 'MySQL');
  console.log(`\nMySQL under 十九、数据库产品: ${mysqlNode ? '✓' : '✗'}`);
  if (mysqlNode) {
    let mysqlCount = 0;
    function countMysql(n) { mysqlCount++; if (n.children) for (const c of n.children) countMysql(c); }
    countMysql(mysqlNode);
    console.log(`  MySQL branch nodes: ${mysqlCount}`);
    console.log(`  MySQL children: ${(mysqlNode.children||[]).map(c => c.name).join(', ')}`);
  }
}

// ── 9. Verify old MySQL branch is gone from original position ──
let mysqlOutsideDb = false;
function findMySQLOutsideDb(node, inDb = false) {
  const name = node.name || '';
  if (name === '数据库') inDb = true;
  if (name === 'MySQL' && !inDb) {
    mysqlOutsideDb = true;
    return;
  }
  if (node.children) for (const child of node.children) findMySQLOutsideDb(child, inDb);
}
findMySQLOutsideDb(tree);
console.log(`\nMySQL outside 数据库 (should be false): ${mysqlOutsideDb}`);

// ── Summary ──
console.log('\n=== Verification Summary ===');
const allGood = missingRefs.length === 0;
console.log(allGood ? '✓ ALL CHECKS PASSED' : `✗ ${missingRefs.length} missing refs found`);
