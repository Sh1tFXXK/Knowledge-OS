import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=path.join(root,'data');
const treePath=path.join(d,'tree-data.json'); const poolPath=path.join(d,'node-pool.json'); const govPath=path.join(d,'knowledge-governance.json'); const timelinePath=path.join(d,'timeline.json');
const apply=process.argv.includes('--apply'); const dry=process.argv.includes('--dry-run'); if(!apply&&!dry) throw new Error('Use --dry-run or --apply');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')); const write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n','utf8');
const tree=read(treePath), pool=read(poolPath), gov=read(govPath), timeline=read(timelinePath);
const mapping={
 'n_6dgtsmpj':'tree_acm2012_algorithms','n_9hr0nvvv':'tree_acm2012_algorithms',
 'k_auto_va5371':'mysql_topic_indexes_access','k_auto_yb9yyu':'mysql_topic_indexes_access','k_auto_es1cgt':'mysql_topic_indexes_access',
 'k_auto_g7wfdd':'governance:javascript:module-export','k_auto_1gqanov':'governance:javascript:module-import','k_auto_figgbw':'governance:javascript:module-export','k_auto_bdlo12':'governance:javascript:module-export','k_auto_afmuju':'governance:javascript:module-import','k_auto_l6ipg1':'governance:javascript:module-import','k_auto_14sf5e5':'governance:javascript:module-export','k_auto_142cy8w':'governance:javascript:module-export','k_auto_1ayw78b':'governance:javascript:module-import',
 'k_auto_g1oyi4':'governance:javascript:control-flow','k_auto_140h0oi':'governance:javascript:control-flow','k_auto_n9n437':'react_tree_conditional','k_auto_1p7kxpz':'governance:javascript:expressions','k_auto_xbksij':'react_tree_conditional','k_auto_nm6bj0':'governance:javascript:expressions',
 'k_1782029470422_yfa3u9':'mysql_topic_architecture','k_1782032275682_61auc4':'mysql_topic_architecture','k_1782032572614_mi65fj':'mysql_topic_architecture','k_1782033172524_cjmm5c':'mysql_topic_sql_objects',
 'mysql_tx_lifecycle':'mysql_topic_transactions_locks','mysql_tx_read_phenomena':'mysql_topic_transactions_locks','mysql_tx_waits_deadlocks':'mysql_topic_transactions_locks',
 'k_1782835092322_77nqn7':'tree_acm2012_algorithms','k_1783875158265_4qvhak':'tree_1782746457614_osttpr','k_java_syntax_hello_world':'tree_1782746457614_osttpr'
};
mapping['k_1782928892375_1vgg04']='mysql_topic_transactions_locks';
const excluded=new Set(['n_s7t5dbya','k_auto_wziud0','k_1782033245872_81floi','k_1782836111549_qetpvx']);
function find(n,id){if(n.id===id)return n;for(const c of n.children??[]){const x=find(c,id);if(x)return x;}return null;}
function detach(n,id){const i=(n.children??[]).findIndex(c=>c.id===id);if(i>=0)return n.children.splice(i,1)[0];for(const c of n.children??[]){const x=detach(c,id);if(x)return x;}return null;}
const rootReact=find(tree,'react_root');
const virtual=[['governance:javascript:module-import','模块系统 / Import'],['governance:javascript:module-export','模块系统 / Export'],['governance:javascript:control-flow','控制流与函数设计'],['governance:javascript:expressions','表达式与类型转换']];
for(const [id,name] of virtual){if(!find(tree,id)){if(!rootReact)throw new Error('Missing react_root');rootReact.children??=[];rootReact.children.push({id,name,count:0,children:[]});}}
const moved=[]; const skipped=[];
for(const [nodeId,parentId] of Object.entries(mapping)){
 if(excluded.has(nodeId)) {skipped.push({nodeId,reason:'manual-review'});continue;}
 const node=pool[nodeId]; const parent=find(tree,parentId); if(!node||!parent){skipped.push({nodeId,reason:!node?'missing-node':'missing-parent',parentId});continue;}
 const oldId=`governance:review:${nodeId}`; let entry=detach(tree,oldId); if(!entry){entry=find(tree,`governance:canonical:${nodeId}`);}
 if(!entry) entry={id:`governance:canonical:${nodeId}`,name:node.label,count:0,children:[]};
 entry.id=`governance:canonical:${nodeId}`; entry.name=node.label; entry.nodeRef=nodeId; entry.count=entry.count??0; entry.children=entry.children??[]; parent.children??=[];
 if(!parent.children.some(c=>c.id===entry.id)) parent.children.push(entry);
 const cand=(gov.placements??[]).find(x=>x.nodeId===nodeId); if(cand){cand.status='accepted';cand.canonicalParentNodeId=parentId;cand.canonicalTreeEntryId=entry.id;cand.legacyTreeEntryIds=[oldId];cand.acceptedAt=new Date().toISOString();cand.rationale=`按 35 节点分类审阅报告迁移至 ${parentId}；正文、节点 ID 和来源保持不变。`;}
 moved.push({nodeId,label:node.label,parentId,treeEntryId:entry.id});
}
gov.audit={...gov.audit,reviewReportMigration:{executedAt:new Date().toISOString(),accepted:moved.length,manualReview:skipped.length,manualReviewNodeIds:skipped.map(x=>x.nodeId),contentSource:'nodePool.card/timeline.card'} };
if(apply){write(treePath,tree);write(govPath,gov);}
console.log(JSON.stringify({mode:apply?'apply':'dry-run',moved,skipped},null,2));
