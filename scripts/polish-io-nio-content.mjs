// IO/NIO 节点内容最后打磨（2026-08-28）
// 修复 fusion 拆分时遗留的三处瑕疵：
//   1) k_nio_file_channel 缺少开头介绍段（原节点被拆分时丢失），且代码里有 OCR 双反引号（``1024`` / ``true``）
//   2) k_reactor_overview 结尾悬空的「## Reactor模型」标题（后面没有正文）
//   3) k_proactor_mode 首标题残缺（"在Proactor中实现读："）
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `polish-io-nio-content-${ts}`);
mkdirSync(backupDir, { recursive: true });
copyFileSync(join(DATA, 'node-pool.json'), join(backupDir, 'node-pool.json'));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));

const replace = (id, from, to) => {
  const node = pool[id];
  if (!node) throw new Error(`missing node ${id}`);
  const tab = node.card.tabs[0];
  if (!String(tab.content).includes(from)) throw new Error(`pattern not found in ${id}: ${from.slice(0, 50)}`);
  tab.content = String(tab.content).replace(from, to);
  console.log('fixed', id);
};

// 1. FileChannel：补开头介绍 + 清理 OCR 双反引号
{
  const tab = pool['k_nio_file_channel'].card.tabs[0];
  if (!String(tab.content).startsWith('Java NIO 中的 FileChannel')) {
    tab.content = 'Java NIO 中的 FileChannel 是一个连接到文件的通道，可以通过文件通道读写文件。FileChannel 无法设置为非阻塞模式，它总是运行在阻塞模式下。\n\n' + tab.content;
    console.log('fixed k_nio_file_channel (intro)');
  }
  replace('k_nio_file_channel', 'channel.truncate(``1024`);', 'channel.truncate(1024);');
  replace('k_nio_file_channel', 'channel.force(``true``);', 'channel.force(true);');
}

// 2. Reactor 概述：悬空标题改为指向子节点的说明
replace(
  'k_reactor_overview',
  '## Reactor模型\n\n有关Reactor模型结构，可以参考Doug Lea在 Scalable IO in Java中的介绍。这里简单介绍一下Reactor模式的典型实现：',
  '【Reactor 的典型实现】\n有关 Reactor 模型结构，可以参考 Doug Lea 在《Scalable IO in Java》中的介绍。Reactor 模式的几种典型实现——单线程模型、多线程模型、主从多线程模型——分别在下方子节点中介绍。',
);

// 3. Proactor：残缺标题
replace('k_proactor_mode', '## 在Proactor中实现读：', '## 在 Proactor 中实现读的流程');

const tmp = join(DATA, 'node-pool.json.tmp-' + process.pid);
writeFileSync(tmp, JSON.stringify(pool, null, 2), 'utf8');
renameSync(tmp, join(DATA, 'node-pool.json'));
console.log('polish-io-nio-content complete');
