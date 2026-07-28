import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  DOCUMENT_KIND,
  documentKindForFile,
  importDocument,
  parseMarkdownDocument,
  parsePdfDocument,
} from './import/document-importer.mjs';

function createTextPdf(lines) {
  const escapedLines = lines.map((line) => line.replace(/([\\()])/g, '\\$1'));
  const textCommands = escapedLines
    .map((line, index) => `${index === 0 ? '' : '0 -24 Td\n'}(${line}) Tj`)
    .join('\n');
  const stream = `BT\n/F1 16 Tf\n72 720 Td\n${textCommands}\nET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  pdf += offsets.slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

test('document kinds are explicit and unsupported extensions are rejected', () => {
  assert.equal(documentKindForFile('notes.pdf'), DOCUMENT_KIND.Pdf);
  assert.equal(documentKindForFile('notes.MARKDOWN'), DOCUMENT_KIND.Markdown);
  assert.throws(() => documentKindForFile('notes.docx'), /PDF.*MD.*Markdown/);
  assert.throws(() => documentKindForFile('../notes.md'), /文件名无效/);
});

test('Markdown documents remove front matter and the primary heading', () => {
  const parsed = parseMarkdownDocument({
    fileName: 'fallback-name.md',
    buffer: Buffer.from([
      '---',
      'author: Knowledge OS',
      '---',
      '',
      '# Spring Container',
      '',
      'The application context manages beans and their lifecycle.',
      '',
      '## Bean scopes',
      '',
      'Singleton and prototype are common scopes.',
    ].join('\n')),
  });

  assert.equal(parsed.kind, DOCUMENT_KIND.Markdown);
  assert.equal(parsed.title, 'Spring Container');
  assert.equal(parsed.pageCount, null);
  assert.match(parsed.markdown, /## Bean scopes/);
  assert.doesNotMatch(parsed.markdown, /author:|# Spring Container/);
});

test('PDF documents extract page text and reject image-only documents', async () => {
  const parsed = await parsePdfDocument({
    fileName: 'Spring interview.pdf',
    buffer: createTextPdf([
      'Spring Interview Notes',
      'Application context manages beans and their lifecycle.',
    ]),
  });
  assert.equal(parsed.kind, DOCUMENT_KIND.Pdf);
  assert.equal(parsed.title, 'Spring interview');
  assert.equal(parsed.pageCount, 1);
  assert.match(parsed.markdown, /Spring Interview Notes/);
  assert.match(parsed.markdown, /Application context manages beans/);

  let destroyed = false;
  await assert.rejects(
    parsePdfDocument({
      fileName: 'scan.pdf',
      buffer: Buffer.from('%PDF-empty'),
      parserFactory: () => ({
        getText: async () => ({ total: 1, pages: [{ num: 1, text: '' }] }),
        destroy: async () => { destroyed = true; },
      }),
    }),
    /OCR/,
  );
  assert.equal(destroyed, true);
});

test('PDF documents promote compact numbered steps to sections', async () => {
  const parsed = await parsePdfDocument({
    fileName: 'numbered-sections.pdf',
    buffer: Buffer.from('%PDF-numbered-sections'),
    parserFactory: () => ({
      getText: async () => ({
        total: 1,
        pages: [{
          num: 1,
          text: [
            'SpringBoot 自动装配',
            '1、创建应用上下文',
            '准备环境并创建 ApplicationContext。',
            '2、加载配置源',
            '通过 BeanDefinitionLoader 加载配置。',
          ].join('\n'),
        }],
      }),
      destroy: async () => {},
    }),
  });

  assert.match(parsed.markdown, /## 1 创建应用上下文/);
  assert.match(parsed.markdown, /## 2 加载配置源/);
  assert.equal(parsed.language, 'zh');
});

test('importDocument writes canonical Markdown and mounts at the selected directory', async (context) => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-document-import-'));
  context.after(() => fs.rm(projectRoot, { recursive: true, force: true }));
  await fs.mkdir(path.join(projectRoot, 'data'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'data', 'node-pool.json'), '{}\n');
  await fs.writeFile(path.join(projectRoot, 'data', 'questions.json'), '[]\n');
  await fs.writeFile(path.join(projectRoot, 'data', 'tree-data.json'), JSON.stringify({
    id: 'root-tree',
    name: 'Root',
    nodeRef: 'root-node',
    children: [
      { id: 'spring-tree', name: 'Spring', nodeRef: 'spring-node', children: [] },
    ],
  }, null, 2));

  const buffer = Buffer.from([
    '# Spring Interview Notes',
    '',
    'Spring provides dependency injection and lifecycle management.',
    '',
    '## Application context',
    '',
    'The application context owns bean creation.',
    '',
    '### Bean lifecycle',
    '',
    'Post processors run around initialization callbacks.',
  ].join('\n'));
  const result = await importDocument({
    projectRoot,
    fileName: 'spring-notes.md',
    buffer,
    parentTreeNodeId: 'spring-tree',
    useAi: false,
  });

  const tree = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'tree-data.json'), 'utf8'));
  const pool = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'node-pool.json'), 'utf8'));
  assert.equal(result.documentKind, DOCUMENT_KIND.Markdown);
  assert.match(result.nodeId, /^k_document_/);
  assert.equal(tree.children[0].children[0].id, result.treeNodeId);
  assert.equal(pool[result.nodeId].label, 'Spring Interview Notes');
  assert.equal(result.nodeCount, 3);
  assert.equal(result.sectionCount, 2);

  const markdown = await fs.readFile(path.join(projectRoot, result.markdownPath), 'utf8');
  assert.match(markdown, /^---\ntitle: "Spring Interview Notes"/);
  assert.match(markdown, /source_file: "spring-notes.md"/);
  assert.match(markdown, /source_type: "markdown"/);
  assert.match(markdown, /source_sha256: "[a-f0-9]{64}"/);
  assert.match(markdown, /## Application context/);
});
