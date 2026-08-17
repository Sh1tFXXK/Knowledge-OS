import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
const tree=JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'),'utf8'));
const pool=JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'),'utf8'));
const find=(n,id)=>n.id===id?n:(n.children??[]).map(c=>find(c,id)).find(Boolean);
const architecture=find(tree,'mysql:theme:architecture');
const expected=[
 ['mysql:architecture:product-overview','mysqld 总体概述',[]],
 ['mysql:mysqld-layer:connection','第一层：连接与请求入口',['k_1782027165978_v8g3nl','k_1782027187728_t4ieqd']],
 ['mysql:mysqld-layer:parse','第二层：SQL 解析层',['k_1782033245872_81floi','k_1782027196864_7mehjk']],
 ['mysql:mysqld-layer:optimize','第三层：查询优化层',['k_1782033508063_xspnmd','k_dict_rs1y2xku','mysql_glossary_query_execution_plan_17fdf4']],
 ['mysql:mysqld-layer:execute','第四层：查询执行层',['mysql_sql_query_execution','k_1784456386575_b7hxoh']],
 ['mysql:mysqld-layer:storage','第五层：存储引擎与持久化层',['k_1782032090352_a1ehd0','n_97x8s5dv']],
];
test('MySQL 总览呈现 mysqld 五层内部处理链路',()=>{
 assert.equal(architecture.name,'mysqld 架构总览');
 assert.equal(architecture.children.length,6);
 for(const [id,name,refs] of expected){const g=architecture.children.find(x=>x.id===id);assert.ok(g,`missing ${id}`);assert.equal(g.name,name);const actual=(g.children??[]).map(x=>x.nodeRef);for(const ref of refs.filter((x,i,a)=>a.indexOf(x)===i)){assert.ok(actual.includes(ref),`${id} missing ${ref}`);assert.ok(pool[ref],`${ref} missing node`);}}
});
test('MySQL 架构总览和内部组件都有可显示定义',()=>{
 const archDef=pool['mysql:theme:architecture'].card.tabs.find(t=>t.id==='def')?.content??'';assert.match(archDef,/连接.*解析器.*优化器.*执行/);assert.match(archDef,/存储引擎/);
 for(const ref of ['k_1782027165978_v8g3nl','k_1782027187728_t4ieqd','k_1782033245872_81floi','k_1782033508063_xspnmd','mysql_sql_query_execution','k_1782032090352_a1ehd0','n_97x8s5dv']){const content=pool[ref]?.card?.tabs?.find(t=>t.id==='def')?.content??'';assert.ok(content.trim().length>20,`${ref} has no definition`);}
});
