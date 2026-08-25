import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyImportAtTreeNode } from './import-wikipedia.mjs';
import {
  cleanKeyword,
  slugify,
  sourceHash,
  writeFileAtomically,
} from './import/web-link-importer.mjs';
import { DOCUMENT_PROFILE, validateDocumentDraft } from './import/import-standard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PDF_FILE = 'D:/BaiduNetdiskDownload/Redis设计与实现.pdf';
const PARENT_TREE_NODE_ID = 'demo_tree_redis';

const toc = {
  title: 'Redis设计与实现',
  author: '黄健宏',
  fileName: 'Redis设计与实现.pdf',
  summary:
    '本书全面而完整地讲解了 Redis 的内部机制与实现方式，对 Redis 的大多数单机功能以及所有多机功能的实现原理进行了介绍，展示了这些功能的核心数据结构以及关键的算法思想，图示丰富、描述清晰，并给出大量参考信息。通过阅读本书，读者可以快速、有效地了解 Redis 的内部构造以及运作机制，更好、更高效地使用 Redis。\n\n'
    + '本书主要分为四大部分。第一部分“数据结构与对象”介绍了 Redis 中的各种对象及其数据结构，并说明这些数据结构如何影响对象的功能和性能。第二部分“单机数据库的实现”对 Redis 实现单机数据库的方法进行了介绍，包括数据库、RDB 持久化、AOF 持久化、事件等。第三部分“多机数据库的实现”对 Redis 的 Sentinel、复制、集群三个多机功能进行了介绍。第四部分“独立功能的实现”对 Redis 中各个相对独立的功能模块进行了介绍，涉及发布与订阅、事务、Lua 脚本、排序、二进制位数组、慢查询日志、监视器等。',
  intro: {
    number: 1,
    title: '引言',
    sections: [
      'Redis版本说明',
      '章节编排',
      '推荐的阅读方法',
      '行文规则',
      '配套网站',
    ],
  },
  parts: [
    {
      title: '数据结构与对象',
      chapters: [
        {
          number: 2,
          title: '简单动态字符串',
          sections: ['SDS的定义', 'SDS与C字符串的区别', 'SDS API', '重点回顾', '参考资料'],
        },
        {
          number: 3,
          title: '链表',
          sections: ['链表和链表节点的实现', '链表和链表节点的API', '重点回顾'],
        },
        {
          number: 4,
          title: '字典',
          sections: ['字典的实现', '哈希算法', '解决键冲突', 'rehash', '渐进式rehash', '字典API', '重点回顾'],
        },
        {
          number: 5,
          title: '跳跃表',
          sections: ['跳跃表的实现', '跳跃表API', '重点回顾'],
        },
        {
          number: 6,
          title: '整数集合',
          sections: ['整数集合的实现', '升级', '升级的好处', '降级', '整数集合API', '重点回顾'],
        },
        {
          number: 7,
          title: '压缩列表',
          sections: ['压缩列表的构成', '压缩列表节点的构成', '连锁更新', '压缩列表API', '重点回顾'],
        },
        {
          number: 8,
          title: '对象',
          sections: [
            '对象的类型与编码',
            '字符串对象',
            '列表对象',
            '哈希对象',
            '集合对象',
            '有序集合对象',
            '类型检查与命令多态',
            '内存回收',
            '对象共享',
            '对象的空转时长',
            '重点回顾',
          ],
        },
      ],
    },
    {
      title: '单机数据库的实现',
      chapters: [
        {
          number: 9,
          title: '数据库',
          sections: [
            '服务器中的数据库',
            '切换数据库',
            '数据库键空间',
            '设置键的生存时间或过期时间',
            '过期键删除策略',
            'Redis的过期键删除策略',
            'AOF、RDB和复制功能对过期键的处理',
            '数据库通知',
            '重点回顾',
          ],
        },
        {
          number: 10,
          title: 'RDB持久化',
          sections: ['RDB文件的创建与载入', '自动间隔性保存', 'RDB文件结构', '分析RDB文件', '重点回顾', '参考资料'],
        },
        {
          number: 11,
          title: 'AOF持久化',
          sections: ['AOF持久化的实现', 'AOF文件的载入与数据还原', 'AOF重写', '重点回顾'],
        },
        {
          number: 12,
          title: '事件',
          sections: ['文件事件', '时间事件', '事件的调度与执行', '重点回顾', '参考资料'],
        },
        {
          number: 13,
          title: '客户端',
          sections: ['客户端属性', '客户端的创建与关闭', '重点回顾'],
        },
        {
          number: 14,
          title: '服务器',
          sections: ['命令请求的执行过程', 'serverCron函数', '初始化服务器', '重点回顾'],
        },
      ],
    },
    {
      title: '多机数据库的实现',
      chapters: [
        {
          number: 15,
          title: '复制',
          sections: [
            '旧版复制功能的实现',
            '旧版复制功能的缺陷',
            '新版复制功能的实现',
            '部分重同步的实现',
            'PSYNC命令的实现',
            '复制的实现',
            '心跳检测',
            '重点回顾',
          ],
        },
        {
          number: 16,
          title: 'Sentinel',
          sections: [
            '启动并初始化Sentinel',
            '获取主服务器信息',
            '获取从服务器信息',
            '向主服务器和从服务器发送信息',
            '接收来自主服务器和从服务器的频道信息',
            '检测主观下线状态',
            '检查客观下线状态',
            '选举领头Sentinel',
            '故障转移',
            '重点回顾',
            '参考资料',
          ],
        },
        {
          number: 17,
          title: '集群',
          sections: [
            '节点',
            '槽指派',
            '在集群中执行命令',
            '重新分片',
            'ASK错误',
            '复制与故障转移',
            '消息',
            '重点回顾',
          ],
        },
      ],
    },
    {
      title: '独立功能的实现',
      chapters: [
        {
          number: 18,
          title: '发布与订阅',
          sections: ['频道的订阅与退订', '模式的订阅与退订', '发送消息', '查看订阅信息', '重点回顾', '参考资料'],
        },
        {
          number: 19,
          title: '事务',
          sections: ['事务的实现', 'WATCH命令的实现', '事务的ACID性质', '重点回顾', '参考资料'],
        },
        {
          number: 20,
          title: 'Lua脚本',
          sections: [
            '创建并修改Lua环境',
            'Lua环境协作组件',
            'EVAL命令的实现',
            'EVALSHA命令的实现',
            '脚本管理命令的实现',
            '脚本复制',
            '重点回顾',
            '参考资料',
          ],
        },
        {
          number: 21,
          title: '排序',
          sections: [
            'SORT <key> 命令的实现',
            'ALPHA选项的实现',
            'ASC选项和DESC选项的实现',
            'BY选项的实现',
            '带有ALPHA选项的BY选项的实现',
            'LIMIT选项的实现',
            'GET选项的实现',
            'STORE选项的实现',
            '多个选项的执行顺序',
            '重点回顾',
          ],
        },
        {
          number: 22,
          title: '二进制位数组',
          sections: ['位数组的表示', 'GETBIT命令的实现', 'SETBIT命令的实现', 'BITCOUNT命令的实现', 'BITOP命令的实现', '重点回顾', '参考资料'],
        },
        {
          number: 23,
          title: '慢查询日志',
          sections: ['慢查询记录的保存', '慢查询日志的阅览和删除', '添加新日志', '重点回顾'],
        },
        {
          number: 24,
          title: '监视器',
          sections: ['成为监视器', '向监视器发送命令信息', '重点回顾'],
        },
      ],
    },
  ],
};

function sectionOutline(chapter) {
  const prefix = `${chapter.number}.`;
  return chapter.sections
    .map((s, i) => `- ${prefix}${i + 1} ${s}`)
    .join('\n');
}

function buildSkeletonNodes(articleIdPrefix, rootTreeId, toc) {
  const nodes = [];
  let index = 0;

  function nodeId() {
    index += 1;
    return `${articleIdPrefix}_s${index}`;
  }

  nodes.push({
    id: articleIdPrefix,
    label: toc.title,
    parentId: null,
    treeId: rootTreeId,
    treeName: toc.title,
    tags: [cleanKeyword(toc.title), 'redis', 'book'],
    card: {
      nodeId: articleIdPrefix,
      title: toc.title,
      rootContent: toc.summary,
      tabs: [],
    },
  });

  const introId = nodeId();
  nodes.push({
    id: introId,
    label: `第${toc.intro.number}章 ${toc.intro.title}`,
    parentId: articleIdPrefix,
    treeId: `${rootTreeId}_s${index}`,
    treeName: `第${toc.intro.number}章 ${toc.intro.title}`,
    tags: ['redis', cleanKeyword(toc.intro.title)],
    card: {
      nodeId: introId,
      title: `第${toc.intro.number}章 ${toc.intro.title}`,
      rootContent: sectionOutline(toc.intro),
      tabs: [],
    },
  });

  for (const part of toc.parts) {
    const partId = nodeId();
    const partTreeId = `${rootTreeId}_s${index}`;
    const partDesc = toc.summary
      .split('。')
      .find((s) => s.includes(part.title));
    nodes.push({
      id: partId,
      label: part.title,
      parentId: articleIdPrefix,
      treeId: partTreeId,
      treeName: part.title,
      tags: ['redis', cleanKeyword(part.title)],
      card: {
        nodeId: partId,
        title: part.title,
        rootContent: partDesc ? `${partDesc}。` : '',
        tabs: [],
      },
    });

    for (const chapter of part.chapters) {
      const chapterId = nodeId();
      nodes.push({
        id: chapterId,
        label: `第${chapter.number}章 ${chapter.title}`,
        parentId: partId,
        treeId: `${partTreeId}_s${index - 1}`,
        treeName: `第${chapter.number}章 ${chapter.title}`,
        tags: ['redis', cleanKeyword(chapter.title)],
        card: {
          nodeId: chapterId,
          title: `第${chapter.number}章 ${chapter.title}`,
          rootContent: sectionOutline(chapter),
          tabs: [],
        },
      });
    }
  }

  return nodes;
}

function buildTocMarkdown(toc) {
  const lines = [`# ${toc.title}`, '', toc.summary, '', `作者：${toc.author}`, ''];
  lines.push(`## 第${toc.intro.number}章 ${toc.intro.title}`);
  for (const s of toc.intro.sections) lines.push(`### ${s}`);
  lines.push('');
  for (const part of toc.parts) {
    lines.push(`## ${part.title}`);
    for (const ch of part.chapters) {
      lines.push(`### 第${ch.number}章 ${ch.title}`);
      for (const s of ch.sections) lines.push(`#### ${s}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildNotesMarkdown(toc, contentHash, nodeCount) {
  const date = new Date().toISOString().slice(0, 10);
  const keywordLines = [
    '  - "Redis设计与实现"',
    '  - "redis"',
    '  - "book"',
  ].join('\n');
  const frontMatter = [
    '---',
    `title: ${JSON.stringify(toc.title)}`,
    `source_file: ${JSON.stringify(toc.fileName)}`,
    'source_type: "pdf"',
    `source_sha256: ${JSON.stringify(contentHash)}`,
    'source_pages: 406',
    'source_language: "zh"',
    'translated_to: null',
    `imported_at: ${JSON.stringify(date)}`,
    'import_standard_version: 1',
    'import_profile: "article"',
    `section_count: ${nodeCount - 1}`,
    'question_count: 0',
    'keywords:',
    keywordLines,
    'categories:',
    '  - "redis"',
    '---',
  ].join('\n');
  return `${frontMatter}\n\n${buildTocMarkdown(toc)}\n`;
}

export async function importRedisSkeleton(options = {}) {
  const projectRoot = options.projectRoot ?? PROJECT_ROOT;
  const parentTreeNodeId = options.parentTreeNodeId ?? PARENT_TREE_NODE_ID;
  const buffer = await fs.readFile(PDF_FILE);
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const sourceId = `document:${contentHash}`;
  const articleIdPrefix = `k_document_${sourceHash(sourceId)}`;
  const rootTreeId = `tree_document_${sourceHash(sourceId)}`;

  const nodes = buildSkeletonNodes(articleIdPrefix, rootTreeId, toc);
  const markdown = buildTocMarkdown(toc);
  validateDocumentDraft({
    profile: DOCUMENT_PROFILE.Article,
    title: toc.title,
    markdown,
    nodes,
    questions: [],
  });

  const poolPath = path.join(projectRoot, 'data', 'node-pool.json');
  const treePath = path.join(projectRoot, 'data', 'tree-data.json');
  const [pool, tree] = await Promise.all([
    fs.readFile(poolPath, 'utf8').then(JSON.parse),
    fs.readFile(treePath, 'utf8').then(JSON.parse),
  ]);

  applyImportAtTreeNode(
    pool,
    tree,
    nodes,
    parentTreeNodeId,
    articleIdPrefix,
    [toc.title, 'redis', 'book'],
  );

  const notesDirectory = path.join(projectRoot, 'docs', 'notes');
  await fs.mkdir(notesDirectory, { recursive: true });
  const shortHash = sourceHash(sourceId).slice(0, 6);
  const notesPath = path.join(notesDirectory, `document-${slugify(toc.title)}-${shortHash}.md`);

  await Promise.all([
    writeFileAtomically(poolPath, `${JSON.stringify(pool, null, 2)}\n`),
    writeFileAtomically(treePath, `${JSON.stringify(tree, null, 2)}\n`),
    writeFileAtomically(notesPath, buildNotesMarkdown(toc, contentHash, nodes.length)),
  ]);

  return {
    ok: true,
    articleIdPrefix,
    rootTreeId,
    nodeId: articleIdPrefix,
    title: toc.title,
    nodeCount: nodes.length,
    sectionCount: nodes.length - 1,
    markdownPath: path.relative(projectRoot, notesPath).replace(/\\/g, '/'),
  };
}

async function main() {
  const result = await importRedisSkeleton();
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
