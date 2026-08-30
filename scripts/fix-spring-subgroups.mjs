// 修正：Spring 的子组（AOP/IoC容器/SpringMVC/Spring Boot/验证）应挂在 Spring 组下，
// 而不是框架和中间件根下（2026-08-29，修正 import-obsidian-java-vault 的挂载层级）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-spring-subgroups-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const findTreeByRef = (node, ref) => { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; };
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

const fwRoot = findTreeByRef(tree, 'k_java_frameworks');
const spring = findTreeByRef(tree, 'k_java_fw_spring');
if (!fwRoot || !spring) throw new Error('framework/spring tree nodes not found');

const SUBGROUP_REFS = ['k_java_fw_spring_aop', 'k_java_fw_spring_ioc', 'k_java_fw_spring_mvc', 'k_java_fw_spring_boot', 'k_java_fw_spring_valid'];
for (const ref of SUBGROUP_REFS) {
  const idx = fwRoot.children.findIndex((c) => c.nodeRef === ref);
  if (idx < 0) throw new Error(`subgroup not under framework root: ${ref}`);
  const [node] = fwRoot.children.splice(idx, 1);
  spring.children.push(node);
  // 修正 treebind：父从框架根改为 Spring 组
  edges = edges.filter((e) => !(e.id === `treebind:${fwRoot.id}:${node.id}`));
  upsertEdge({ id: `treebind:${spring.id}:${node.id}`, source: spring.nodeRef, target: node.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
  console.log('re-parented:', node.name, '-> Spring');
}
fwRoot.count = fwRoot.children.length;
spring.count = spring.children.length;

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log(`fix complete: 框架和中间件 children=${fwRoot.count}, Spring children=${spring.count}`);
