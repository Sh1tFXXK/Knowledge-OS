#!/usr/bin/env node
/**
 * Fix issues from the initial restructure:
 * 1. Move concept_stored_object to 三、数据库结构
 * 2. Move the "其他功能 > 日志" subtree to 九、日志系统
 * 3. Move MySQL file/config nodes to 二十、数据库文件与实现
 */
import fs from 'fs';

const TREE_PATH = 'data/tree-data.json';
const TMP_PATH = 'data/tree-data.tmp.json';

const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));

function findBranch(node, targetName) {
  const name = node.name || node.id || '';
  if (name === targetName) return node;
  if (node.children) for (const child of node.children) { const f = findBranch(child, targetName); if (f) return f; }
  return null;
}

function findBranchByRef(node, targetRef) {
  if (node.nodeRef === targetRef) return node;
  if (node.children) for (const child of node.children) { const f = findBranchByRef(child, targetRef); if (f) return f; }
  return null;
}

function findParent(node, targetName, parent = null) {
  const name = node.name || node.id || '';
  if (name === targetName) return parent;
  if (node.children) {
    for (const child of node.children) {
      const found = findParent(child, targetName, node);
      if (found) return found;
    }
  }
  return null;
}

function removeChild(node, targetName) {
  if (!node.children) return false;
  const idx = node.children.findIndex(c => (c.name || c.id) === targetName);
  if (idx >= 0) {
    node.children.splice(idx, 1);
    return true;
  }
  for (const child of node.children) {
    if (removeChild(child, targetName)) return true;
  }
  return false;
}

// ── Fix 1: Move concept_stored_object from 十七 to 三 ──
const opsSection = findBranch(tree, '十七、数据库运维');
const structSection = findBranch(tree, '三、数据库结构');

if (opsSection && structSection) {
  const idx = (opsSection.children || []).findIndex(c => c.nodeRef === 'concept_stored_object');
  if (idx >= 0) {
    const node = opsSection.children.splice(idx, 1)[0];
    structSection.children.push(node);
    console.log('✓ Moved concept_stored_object to 三、数据库结构');
  } else {
    console.log('concept_stored_object not found in 十七');
  }
}

// ── Fix 2: Move "其他功能" subtree (specifically the 日志 part) to 九、日志系统 ──
const dbBranch = findBranch(tree, '数据库');
const logSection = findBranch(tree, '九、日志系统');

if (dbBranch && logSection) {
  // Find "其他功能" directly under 数据库
  const otherFuncIdx = (dbBranch.children || []).findIndex(c => c.name === '其他功能');
  if (otherFuncIdx >= 0) {
    const otherFunc = dbBranch.children[otherFuncIdx];
    // Move the entire 其他功能 subtree to 九、日志系统
    // (it contains 日志 > 日志类型 > 事务日志 > 重做日志/撤销日志 etc.)
    dbBranch.children.splice(otherFuncIdx, 1);
    // Its children should go to 九、日志系统
    for (const child of (otherFunc.children || [])) {
      logSection.children.push(child);
    }
    console.log(`✓ Moved 其他功能 subtree (${otherFunc.children?.length || 0} children) to 九、日志系统`);
  } else {
    console.log('其他功能 not found under 数据库');
  }
}

// ── Fix 3: Move MySQL file/config nodes from MySQL product branch to 二十、数据库文件与实现 ──
const fileSection = findBranch(tree, '二十、数据库文件与实现');
const mysqlProduct = findBranch(tree, '十九、数据库产品');

if (fileSection && mysqlProduct) {
  // Find MySQL > MySQL Server > 结构 > 系统文件层
  const mysqlNode = mysqlProduct.children.find(c => c.name === 'MySQL');
  if (mysqlNode) {
    const mysqlServer = mysqlNode.children.find(c => c.name === 'MySQL Server');
    if (mysqlServer) {
      const structure = mysqlServer.children.find(c => c.name === '结构');
      if (structure) {
        const fileLayerIdx = (structure.children || []).findIndex(c => c.name === '系统文件层');
        if (fileLayerIdx >= 0) {
          const fileLayer = structure.children.splice(fileLayerIdx, 1)[0];
          // Move file layer's children to 二十、数据库文件与实现
          for (const child of (fileLayer.children || [])) {
            fileSection.children.push(child);
          }
          console.log(`✓ Moved 系统文件层 (${fileLayer.children?.length || 0} children) to 二十、数据库文件与实现`);

          // Also move 客户端库 from the old structure if it exists
          const clientLibIdx = (structure.children || []).findIndex(c => c.name === '客户端库' || (c.nodeRef || '').includes('client_libraries'));
          if (clientLibIdx >= 0) {
            const clientLib = structure.children.splice(clientLibIdx, 1)[0];
            fileSection.children.push(clientLib);
            console.log('✓ Moved 客户端库 to 二十、数据库文件与实现');
          }

          // Move 文件格式
          const fileFormatIdx = (structure.children || []).findIndex(c => c.name === '文件格式' || (c.nodeRef || '').includes('file_format'));
          if (fileFormatIdx >= 0) {
            const fileFormat = structure.children.splice(fileFormatIdx, 1)[0];
            fileSection.children.push(fileFormat);
            console.log('✓ Moved 文件格式 to 二十、数据库文件与实现');
          }
        }
      }
    }
  }
}

// ── Also check: are there any other direct children of 数据库 that weren't processed? ──
if (dbBranch) {
  const sectionNames = new Set([
    '一、数据库系统', '二、数据模型', '三、数据库结构', '四、数据约束与标识',
    '五、数据库操作', '六、查询系统', '七、事务系统', '八、恢复系统',
    '九、日志系统', '十、存储系统', '十一、索引结构', '十二、数据表示',
    '十三、数据库设计', '十四、数据库分布与复制', '十五、备份与恢复',
    '十六、数据库安全', '十七、数据库运维', '十八、数据库编程与接口',
    '十九、数据库产品', '二十、数据库文件与实现', '二十一、数据库知识元数据'
  ]);
  const orphans = dbBranch.children.filter(c => !sectionNames.has(c.name));
  if (orphans.length > 0) {
    console.log(`\n⚠️ ${orphans.length} orphan nodes still directly under 数据库:`);
    for (const o of orphans) {
      console.log(`  ${o.name} | ref: ${o.nodeRef || 'none'} | children: ${(o.children||[]).length}`);
    }
    // Move orphans to 二十一、数据库知识元数据
    const metaSection = findBranch(tree, '二十一、数据库知识元数据');
    if (metaSection) {
      for (const orphan of orphans) {
        const idx = dbBranch.children.indexOf(orphan);
        dbBranch.children.splice(idx, 1);
        metaSection.children.push(orphan);
      }
      console.log(`→ Moved ${orphans.length} orphans to 二十一、数据库知识元数据`);
    }
  }
}

// ── Remove empty sections ──
if (dbBranch) {
  const before = dbBranch.children.length;
  dbBranch.children = dbBranch.children.filter(s => (s.children || []).length > 0);
  const removed = before - dbBranch.children.length;
  if (removed > 0) console.log(`✓ Removed ${removed} empty sections`);
}

// ── Write ──
fs.writeFileSync(TMP_PATH, JSON.stringify(tree, null, 2), 'utf8');
fs.renameSync(TMP_PATH, TREE_PATH);
console.log('\n✓ tree-data.json updated');
