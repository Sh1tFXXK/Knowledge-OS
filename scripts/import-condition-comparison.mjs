import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const NODE_POOL_PATH = path.join(ROOT, 'data', 'node-pool.json');
const BACKUP_PATH = `${NODE_POOL_PATH}.backup-${Date.now()}`;

const now = Date.now();
const rnd = () => Math.random().toString(36).slice(2, 8);
const genId = (prefix) => `${prefix}_${now}_${rnd()}`;

const targetNodeId = 'k_1786018757024_u757p8';

const tableId = genId('table');
const colA = genId('column');
const colB = genId('column');
const colC = genId('column');

const rows = [
  ['前置条件', '获取对象的锁', '调用 Lock.lock() 获取锁\n调用 Lock.newCondition() 获取 Condition 对象'],
  ['调用方式', '直接调用\n如：object.wait()', '直接调用\n如：condition.await()'],
  ['等待队列个数', '一个', '多个'],
  ['当前线程释放锁并进入等待状态', '支持', '支持'],
  ['当前线程释放锁并进入等待状态，在等待状态中不响应中断', '不支持', '支持'],
  ['当前线程释放锁并进入超时等待状态', '支持', '支持'],
  ['当前线程释放锁并进入等待状态到将来的某个时间', '不支持', '支持'],
  ['唤醒等待队列中的一个线程', '支持', '支持'],
  ['唤醒等待队列中的全部线程', '支持', '支持'],
];

async function main() {
  const raw = await readFile(NODE_POOL_PATH, 'utf8');
  await copyFile(NODE_POOL_PATH, BACKUP_PATH);
  const pool = JSON.parse(raw);

  const node = pool[targetNodeId];
  if (!node) {
    throw new Error(`Target node ${targetNodeId} not found`);
  }

  node.card.rootTable = {
    id: tableId,
    title: 'Object 的监视器方法与 Condition 接口的对比',
    columns: [
      { id: colA, label: '对比项' },
      { id: colB, label: 'Object Monitor Methods' },
      { id: colC, label: 'Condition' },
    ],
    rows: rows.map((cells) => ({
      id: genId('row'),
      cells: {
        [colA]: cells[0],
        [colB]: cells[1],
        [colC]: cells[2],
      },
    })),
  };

  // Optional: enrich rootContent with a brief summary of the table
  if (!node.card.rootContent.includes('下表')) {
    node.card.rootContent += '\n\n下表从调用条件、队列能力、等待模式、中断响应、超时支持、唤醒方式等维度对比了 Object 监视器方法与 Condition 接口的差异。';
  }

  const output = JSON.stringify(pool, null, 2);
  const tempPath = `${NODE_POOL_PATH}.tmp-${Date.now()}`;
  await writeFile(tempPath, output, 'utf8');
  await writeFile(NODE_POOL_PATH, output, 'utf8');

  console.log(`Updated ${targetNodeId} with table ${tableId}`);
  console.log(`Backup saved to ${BACKUP_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
