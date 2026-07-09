import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourcePath = path.resolve('src/knowledge/treeUtils.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});

const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
  require,
}, { filename: sourcePath });

const { collectTreeReferencesByNodeRef } = module.exports;

const tree = {
  id: 'root',
  name: 'Knowledge',
  count: 0,
  nodeRef: 'k-root',
  children: [
    {
      id: 'ctx-java',
      name: 'Java',
      count: 0,
      nodeRef: 'k-domain-java',
      children: [
        {
          id: 'java-cache',
          name: '缓存',
          count: 0,
          nodeRef: 'k-cache',
          supplement: {
            tabs: [{ id: 'path', label: '路径补充', content: '对象生命周期内的复用。' }],
          },
        },
      ],
    },
    {
      id: 'ctx-db',
      name: '数据库',
      count: 0,
      nodeRef: 'k-domain-db',
      children: [
        {
          id: 'db-cache',
          name: '缓存',
          count: 0,
          nodeRef: 'k-cache',
          supplement: {
            tabs: [{ id: 'path', label: '路径补充', content: '减少磁盘 I/O 的热数据层。' }],
          },
        },
      ],
    },
  ],
};

const cacheReferences = collectTreeReferencesByNodeRef(tree, 'k-cache').map((reference) => ({
    treeNodeId: reference.treeNodeId,
    path: reference.path,
    content: reference.supplement?.tabs?.[0]?.content,
  }));

assert.deepEqual(
  JSON.parse(JSON.stringify(cacheReferences)),
  [
    {
      treeNodeId: 'java-cache',
      path: ['Knowledge', 'Java', '缓存'],
      content: '对象生命周期内的复用。',
    },
    {
      treeNodeId: 'db-cache',
      path: ['Knowledge', '数据库', '缓存'],
      content: '减少磁盘 I/O 的热数据层。',
    },
  ],
);

assert.deepEqual(JSON.parse(JSON.stringify(collectTreeReferencesByNodeRef(tree, 'k-missing'))), []);

console.log('tree reference context checks passed');
