import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const apply=process.argv.includes('--apply');
const treePath=path.join(root,'data/tree-data.json'); const govPath=path.join(root,'data/knowledge-governance.json');
const tree=JSON.parse(fs.readFileSync(treePath,'utf8')); const gov=JSON.parse(fs.readFileSync(govPath,'utf8')); const timestamp=new Date().toISOString();
const roots=Array.isArray(tree)?tree:[tree]; const findById=id=>{let r=null;const walk=n=>{if(r)return;if(n.id===id||n.nodeRef===id)r=n;for(const c of n.children??[])walk(c)};for(const x of roots)walk(x);return r};
const universe=findById('universe'); const cs=findById('demo_cs'); if(!universe||!cs)throw new Error('forest anchors not found');
const ensureChildren=n=>{n.children=n.children??[];return n.children};
const ensureChild=(parent,id,name,nodeRef=null,extra={})=>{const children=ensureChildren(parent);let n=children.find(x=>x.id===id);if(!n){n={id,name,count:0,children:[],...(nodeRef?{nodeRef}:{}),...extra};children.push(n);}return n};
const forest=ensureChild(universe,'governance:knowledge-forest','知识森林（维度视图）',null,{viewKind:'forest-root',children:[]});
const views=[
 {id:'forest:view:domain',name:'领域树（学科视图）',view:'domain'},
 {id:'forest:view:software',name:'软件开发与工程树（实践视图）',view:'software-development'},
 {id:'forest:view:language',name:'编程语言树（语言视图）',view:'programming-language'},
 {id:'forest:view:os',name:'操作系统树（系统视图）',view:'operating-system'},
 {id:'forest:view:architecture',name:'软件架构树（模式视图）',view:'software-architecture'},
 {id:'forest:view:mysql',name:'MySQL 技术系统树（产品视图）',view:'mysql-architecture'}
];
for(const v of views)ensureChild(forest,v.id,v.name,null,{viewKind:'dimension-view',view:v.view});
const addProjection=(viewId,id,name,nodeRef,rationale,canonicalTreeEntryId=null)=>{const v=findById(viewId);if(!v)throw new Error(`view missing ${viewId}`);const entry=ensureChild(v,`projection:${viewId}:${id}`,name,nodeRef,{projection:true,view:views.find(x=>x.id===viewId)?.view,rationale});return {id:entry.id,nodeId:nodeRef,view:views.find(x=>x.id===viewId)?.view,kind:'topic-view',status:'accepted',canonicalTreeEntryId,isCanonicalAnchor:false,rationale,acceptedAt:timestamp};};
const projections=[];
projections.push(addProjection('forest:view:software','software-development','软件开发（实践总览）','k_1783873300296_o38v1d','现有软件开发总览入口的森林视图投影。','tree_1783873300414_0y8oon'));
projections.push(addProjection('forest:view:software','software-engineering','软件工程（学科与方法）','k_1782833214639_nueg1f','软件工程作为软件开发的工程化方法视图。','tree_1782833214675_r6mivn'));
projections.push(addProjection('forest:view:software','software-development-process','软件开发过程（生命周期）','k_1784224555283_zb08id','将原软件工程下的同名“软件开发”明确显示为软件开发过程，避免同名递归。','tree_1784224555355_v23wul'));
projections.push(addProjection('forest:view:language','programming-language','编程语言（规范入口）','k_acm2012_software_notations_tools_programming_languages','同一编程语言实体的规范入口，原位于软件符号与工具。','tree_acm2012_software_notations_tools_programming_languages'));
projections.push(addProjection('forest:view:language','programming-language-development-view','编程语言（软件开发视图）','k_acm2012_software_notations_tools_programming_languages','同一 nodeRef 在软件开发/计算机编程路径中的投影，不创建第二份正文。','tree_1783235593713_9a5j44'));
projections.push(addProjection('forest:view:os','process','进程 / process','k_dict_plyim9pi','MySQL 体系结构中的词汇入口投影到操作系统进程规范视图。','mysql_functional_ref_k_dict_plyim9pi'));
projections.push(addProjection('forest:view:os','thread','线程 / thread','k_dict_n7rueozw','MySQL 体系结构中的词汇入口投影到操作系统线程规范视图。','mysql_functional_ref_k_dict_n7rueozw'));
projections.push(addProjection('forest:view:architecture','connection-pool','连接池 / connection pool','k_dict_h20fqa9t','MySQL 连接管理中的连接池投影到软件架构资源管理视图。','mysql_functional_ref_k_dict_h20fqa9t'));
projections.push(addProjection('forest:view:mysql','mysql-parser','解析器（Parser）','k_1782033245872_81floi','MySQL 专属 SQL 解析器，规范内容保留在 MySQL Server 服务层。','governance:canonical:k_1782033245872_81floi'));
projections.push(addProjection('forest:view:mysql','mysql-process','服务进程 / mysqld','k_dict_plyim9pi','MySQL 技术上下文中的进程入口，正文复用操作系统进程实体。','mysql_functional_ref_k_dict_plyim9pi'));
projections.push(addProjection('forest:view:mysql','mysql-thread','客户端连接线程','k_dict_n7rueozw','MySQL 技术上下文中的线程入口，正文复用操作系统线程实体。','mysql_functional_ref_k_dict_n7rueozw'));
const softwareProcess=findById('tree_1784224555355_v23wul'); if(softwareProcess&&softwareProcess.name==='软件开发')softwareProcess.name='软件开发过程';
gov.forest={schemaVersion:1,updatedAt:timestamp,principles:['one-canonical-parent','multiple-dimension-projections','typed-relation-graph','preserve-content-and-provenance'],views:views.map(v=>({id:v.id,view:v.view,name:v.name})),canonicalAnchors:{programmingLanguage:'k_acm2012_software_notations_tools_programming_languages',softwareDevelopment:'k_1783873300296_o38v1d',softwareEngineering:'k_1782833214639_nueg1f',operatingSystemProcess:'k_dict_plyim9pi',operatingSystemThread:'k_dict_n7rueozw',softwareArchitectureConnectionPool:'k_dict_h20fqa9t',mysqlParser:'k_1782033245872_81floi'},migrationNotes:['同一 nodeRef 的编程语言双入口明确为规范入口与投影','软件工程下的同名软件开发显示为软件开发过程','MySQL 进程、线程和连接池保留产品入口并增加跨维度投影']};
gov.projections=gov.projections??[];for(const p of projections){const i=gov.projections.findIndex(x=>x.id===p.id);if(i>=0)gov.projections[i]=p;else gov.projections.push(p);}gov.audit={...(gov.audit??{}),knowledgeForestMigration:{executedAt:timestamp,views:views.length,projections:projections.length,contentPreserved:true,treeRename:'软件开发 -> 软件开发过程（仅导航显示名称）'}};
if(apply){const backup=path.join(root,'output',`knowledge-forest-migration-${timestamp.replaceAll(':','').replaceAll('.','')}`);fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(treePath,path.join(backup,'tree-data.json'));fs.copyFileSync(govPath,path.join(backup,'knowledge-governance.json'));fs.writeFileSync(treePath,JSON.stringify(Array.isArray(tree)?tree:roots[0],null,2)+'\n','utf8');fs.writeFileSync(govPath,JSON.stringify(gov,null,2)+'\n','utf8');}
console.log(JSON.stringify({mode:apply?'apply':'dry-run',forestRoot:forest.id,views:views.map(v=>v.name),projectionCount:projections.length,renamed:'tree_1784224555355_v23wul',backupCreated:apply},null,2));

