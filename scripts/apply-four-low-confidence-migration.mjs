import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const apply=process.argv.includes('--apply');
const treePath=path.join(root,'data/tree-data.json');
const govPath=path.join(root,'data/knowledge-governance.json');
const poolPath=path.join(root,'data/node-pool.json');
const timestamp=new Date().toISOString();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n','utf8');
const tree=read(treePath), gov=read(govPath), pool=read(poolPath);
const migrations=[
 {nodeId:'n_s7t5dbya', parentTreeId:'tree_1782833214675_r6mivn', parentNodeId:'k_1782833214639_nueg1f', rationale:'正文主题是通用软件工程中的性能改进；MySQL 等具体领域仅作为导航投影。'},
 {nodeId:'k_auto_wziud0', parentTreeId:'governance:javascript:expressions', parentNodeId:'k_acm2012_software_notations_tools_programming_languages', rationale:'正文与标签指向 JavaScript 条件表达式中的嵌套三元写法，保留“不推荐”语义。'},
 {nodeId:'k_1782836111549_qetpvx', parentTreeId:'tree_1782834119007_8gxoi9', parentNodeId:'k_1782834118965_n5r1fr', rationale:'正文定义的是语言无关的面向对象“类”，规范归属放在面向对象，而非某个具体语言。'},
 {nodeId:'k_1782033245872_81floi', parentTreeId:'governance:canonical:k_1782032275682_61auc4', parentNodeId:'k_1782032275682_61auc4', rationale:'正文明确描述 SQL 解析、生成解析树和合法性检查，属于 MySQL Server 服务层。'}
];
const roots=Array.isArray(tree)?tree:[tree];
const find=(pred)=>{let found=null; const walk=n=>{if(found)return;if(pred(n))found=n;for(const c of n.children??[])walk(c)};for(const r of roots)walk(r);return found};
const removeByNodeRef=(n,nodeId,removed=[])=>{n.children=(n.children??[]).filter(c=>{if(c.nodeRef===nodeId){removed.push(c);return false}return true});for(const c of n.children)removeByNodeRef(c,nodeId,removed);return removed};
const getLabel=id=>pool[id]?.card?.title??pool[id]?.label??id;
const moved=[]; const skipped=[];
for(const m of migrations){
 const parent=find(n=>n.id===m.parentTreeId);
 if(!parent){skipped.push({nodeId:m.nodeId,reason:`parent-not-found:${m.parentTreeId}`});continue;}
 const label=getLabel(m.nodeId); const existing=find(n=>n.nodeRef===m.nodeId);
 const removed=[]; for(const r of roots)removeByNodeRef(r,m.nodeId,removed);
 const treeEntry={id:`governance:canonical:${m.nodeId}`,name:label,nodeRef:m.nodeId,count:0,children:[]};
 if(!parent.children)parent.children=[];
 if(!parent.children.some(c=>c.nodeRef===m.nodeId))parent.children.push(treeEntry);
 const placement={id:`placement:${m.nodeId}`,nodeId:m.nodeId,status:'accepted',contentStatus:'canonical',canonicalParentNodeId:m.parentNodeId,pathHint:[],confidence:'high',rule:'reviewed-explicit-mapping',rationale:m.rationale,canonicalTreeEntryId:treeEntry.id,acceptedAt:timestamp};
 const old=(gov.placements??[]).findIndex(x=>x.nodeId===m.nodeId); if(old>=0)gov.placements[old]=placement;else gov.placements.push(placement);
 moved.push({nodeId:m.nodeId,label,canonicalParentNodeId:m.parentNodeId,canonicalTreeEntryId:treeEntry.id,removedReviewEntries:removed.map(x=>x.id)});
}
gov.audit={...(gov.audit??{}),lowConfidenceMigration:{executedAt:timestamp,moved:moved.map(x=>x.nodeId),skipped,emptyParserRetained:'k_1782027196864_7mehjk'}};
if(apply){
 const backupDir=path.join(root,'output',`low-confidence-migration-${timestamp.replaceAll(':','').replaceAll('.','')}`);fs.mkdirSync(backupDir,{recursive:true});
 for(const p of [treePath,govPath])fs.copyFileSync(p,path.join(backupDir,path.basename(p)));
 write(treePath,Array.isArray(tree)?tree:roots[0]); write(govPath,gov);
}
console.log(JSON.stringify({mode:apply?'apply':'dry-run',moved,skipped,retainedEmptyParser:'k_1782027196864_7mehjk'},null,2));
