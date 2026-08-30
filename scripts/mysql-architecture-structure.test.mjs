import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));

function rootsOf(value) {
  return Array.isArray(value) ? value : [value];
}

function find(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = find(child, id);
    if (hit) return hit;
  }
  return null;
}

function findAny(id) {
  for (const root of rootsOf(tree)) {
    const hit = find(root, id);
    if (hit) return hit;
  }
  return null;
}

const serverStructure = findAny('mysql:concept:server:structure');
const processingChain = findAny('tree_1786950659484_8iawe7');
const expected = [
  ['mysql:mysqld-layer:connection', '连接与请求入口', ['k_1782027187728_t4ieqd']],
  ['mysql:mysqld-layer:parse', 'SQL 解析层', ['k_1782033245872_81floi', 'k_1782027196864_7mehjk']],
  ['mysql:mysqld-layer:optimize', '查询优化层', ['k_1782033508063_xspnmd', 'k_dict_rs1y2xku', 'mysql_glossary_query_execution_plan_17fdf4']],
  ['mysql:mysqld-layer:execute', '查询执行层', ['mysql_sql_query_execution', 'k_1784456386575_b7hxoh']],
  ['mysql:mysqld-layer:storage', '存储引擎与持久化层', ['k_1782032090352_a1ehd0', 'n_97x8s5dv']],
];

test('MySQL Server 的结构层呈现 mysqld 内部处理链路', () => {
  assert.ok(serverStructure, 'MySQL Server 必须有结构层');
  assert.ok(processingChain, 'mysqld 处理链路必须存在');
  assert.equal(
    (serverStructure.children ?? []).some((child) => child.id === processingChain.id),
    true,
    'mysqld 处理链路必须挂在 MySQL Server 的结构层',
  );
  for (const [id, name, refs] of expected) {
    const group = (processingChain.children ?? []).find((child) => child.id === id);
    assert.ok(group, `missing ${id}`);
    assert.equal(group.name, name);
    const actual = (group.children ?? []).map((child) => child.nodeRef);
    for (const ref of refs) {
      assert.ok(actual.includes(ref), `${id} missing ${ref}`);
      assert.ok(pool[ref], `${ref} missing node`);
    }
  }
});

test('MySQL Server 结构层不使用总览容器命名', () => {
  const names = [
    serverStructure?.name,
    processingChain?.name,
    ...(processingChain?.children ?? []).map((child) => child.name),
  ].filter(Boolean);
  assert.equal(names.some((name) => /总览|概述/.test(name)), false);
  const chainContent = pool[processingChain.nodeRef]?.card?.rootContent
    ?? pool[processingChain.nodeRef]?.card?.tabs?.[0]?.content
    ?? '';
  assert.match(chainContent, /连接.*解析器.*优化器.*执行/);
  assert.match(chainContent, /存储引擎/);
});
