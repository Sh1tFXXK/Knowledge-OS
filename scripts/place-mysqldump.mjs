import fs from 'fs';

const ROOT = 'E:/project/Knowledge-OS/data';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BAKDIR = `${ROOT}/backups/place-mysqldump-${STAMP}`;
fs.mkdirSync(BAKDIR, { recursive: true });

function load(f) { return JSON.parse(fs.readFileSync(`${ROOT}/${f}`, 'utf8')); }
function backup(f) { fs.copyFileSync(`${ROOT}/${f}`, `${BAKDIR}/${f}`); }
function atomicWrite(f, obj) {
  const tmp = `${ROOT}/${f}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, `${ROOT}/${f}`);
}
function find(n, id) {
  if (n.id === id) return n;
  for (const c of (n.children || [])) { const r = find(c, id); if (r) return r; }
  return null;
}

// ---- 1. tree-data.json: 在「备份与恢复」簇下加 mysqldump 投影（发现层） ----
const treeFile = 'tree-data.json';
backup(treeFile);
const tree = load(treeFile);
const cluster = find(tree, 'mysql:theme:backup-recovery');
if (!cluster) { console.error('ERROR: 备份与恢复 cluster not found'); process.exit(1); }
const projId = 'projection:mysql-term:mysql_glossary_mysqldump_1p1msf';
if (cluster.children.some(c => c.id === projId)) {
  console.log('[tree] projection already exists, skip');
} else {
  cluster.children.push({
    id: projId,
    name: 'mysqldump',
    count: 0,
    nodeRef: 'mysql_glossary_mysqldump_1p1msf',
    projection: true,
    view: 'mysql-architecture',
    projectionKind: 'canonical-topic',
    sourceNodeId: 'mysql_glossary_mysqldump_1p1msf',
    children: []
  });
  console.log('[tree] added mysqldump projection under 备份与恢复 (next to mysqlbackup 命令)');
}
atomicWrite(treeFile, tree);

// ---- 2. knowledge-edges.json: mysqldump --implements--> 逻辑备份 ----
const edgeFile = 'knowledge-edges.json';
backup(edgeFile);
const edges = load(edgeFile);
const edgeId = 'edge_mysqldump_logical_backup';
if (edges.some(e => e.id === edgeId)) {
  console.log('[edges] edge already exists, skip');
} else {
  edges.push({
    id: edgeId,
    source: 'mysql_glossary_mysqldump_1p1msf',
    target: 'k_dict_wv1o918s',
    type: 'implements',
    label: 'implements'
  });
  console.log('[edges] added implements edge -> 逻辑备份 (k_dict_wv1o918s)');
}
atomicWrite(edgeFile, edges);

// ---- 3. node-pool.json: 补 dimensions 便于备份切面命中 ----
const poolFile = 'node-pool.json';
backup(poolFile);
const pool = load(poolFile);
const node = pool['mysql_glossary_mysqldump_1p1msf'];
if (node) {
  node.dimensions = Array.from(new Set([...(node.dimensions || []), '备份', '逻辑备份', 'mysql']));
  console.log('[pool] updated dimensions:', JSON.stringify(node.dimensions));
} else {
  console.log('[pool] WARN: node not found');
}
atomicWrite(poolFile, pool);

console.log('BACKUP_DIR=' + BAKDIR);
console.log('DONE');
