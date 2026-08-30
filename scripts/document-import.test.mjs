import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  DOCUMENT_KIND,
  documentKindForFile,
  importDocument,
  parseDocxDocument,
  parseHtmlDocument,
  parseMarkdownDocument,
  parsePdfDocument,
  parseTextDocument,
  prepareDocumentImport,
} from './import/document-importer.mjs';
import {
  validateDocumentRequest,
  validateJavaSourceRequest,
} from './import/link-import-api.mjs';
import { DOCUMENT_PROFILE_MODE } from './import/import-standard.mjs';

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

test('document kinds are explicit and arbitrary files fall back to text', () => {
  assert.equal(documentKindForFile('notes.pdf'), DOCUMENT_KIND.Pdf);
  assert.equal(documentKindForFile('notes.MARKDOWN'), DOCUMENT_KIND.Markdown);
  assert.equal(documentKindForFile('notes.docx'), DOCUMENT_KIND.Docx);
  assert.equal(documentKindForFile('notes.txt'), DOCUMENT_KIND.Text);
  assert.equal(documentKindForFile('archive.tar.gz'), DOCUMENT_KIND.Text);
  assert.throws(() => documentKindForFile('../notes.md'), /文件名无效/);
});

test('document API accepts arbitrary file names and defaults translation on', () => {
  const requestUrl = '/api/import-document?fileName=notes.xyz&parentTreeNodeId=root';
  assert.deepEqual(
    validateDocumentRequest({ url: requestUrl, headers: { host: 'localhost' } }),
    {
      fileName: 'notes.xyz',
      parentTreeNodeId: 'root',
      translate: true,
      useAi: false,
      profileMode: 'auto',
    },
  );
  const translated = validateDocumentRequest({
    url: `${requestUrl}&translate=false&useAi=true`,
    headers: { host: 'localhost' },
  });
  assert.equal(translated.translate, false);
  assert.equal(translated.useAi, true);
  assert.equal(translated.profileMode, 'auto');

  const questionBank = validateDocumentRequest({
    url: `${requestUrl}&profileMode=question-bank`,
    headers: { host: 'localhost' },
  });
  assert.equal(questionBank.profileMode, 'question-bank');
  assert.throws(
    () => validateDocumentRequest({
      url: `${requestUrl}&profileMode=invalid`,
      headers: { host: 'localhost' },
    }),
    /结构/,
  );
});

test('document import validates the local Java source mode', () => {
  assert.deepEqual(
    validateJavaSourceRequest({
      source: '  C:\\Users\\Administrator\\.jdks\\openjdk-26.0.1!\\java.base\\java\\util  ',
      parentTreeNodeId: '  root  ',
    }),
    {
      source: 'C:\\Users\\Administrator\\.jdks\\openjdk-26.0.1!\\java.base\\java\\util',
      parentTreeNodeId: 'root',
      translate: true,
    },
  );
  assert.deepEqual(
    validateJavaSourceRequest({
      source: 'C:\\project\\src',
      parentTreeNodeId: 'root',
      translate: false,
    }),
    {
      source: 'C:\\project\\src',
      parentTreeNodeId: 'root',
      translate: false,
    },
  );
  assert.throws(
    () => validateJavaSourceRequest({ source: '   ', parentTreeNodeId: 'root' }),
    /Java/,
  );
  assert.throws(
    () => validateJavaSourceRequest({ source: 'C:\\project\\src', parentTreeNodeId: '' }),
    /目录/,
  );
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

test('PDF documents extract native text and use MinerU only for image-only documents', async () => {
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

  let structuredMethod = null;
  const structured = await parsePdfDocument({
    fileName: 'Spring interview.pdf',
    buffer: createTextPdf(['Native text that should be replaced in explicit question-bank mode.']),
    profileMode: DOCUMENT_PROFILE_MODE.QuestionBank,
    ocrExtractor: async ({ method }) => {
      structuredMethod = method;
      return {
        provider: 'mineru',
        markdown: '1. 什么是 Spring？\n\nSpring 是一个应用框架。',
      };
    },
  });
  assert.equal(structuredMethod, 'auto');
  assert.equal(structured.ocrProvider, 'mineru');
  assert.match(structured.markdown, /什么是 Spring/);
  assert.doesNotMatch(structured.markdown, /Native text/);

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

  let ocrRequest = null;
  const scanned = await parsePdfDocument({
    fileName: 'scan.pdf',
    buffer: Buffer.from('%PDF-empty'),
    parserFactory: () => ({
      getText: async () => ({ total: 2, pages: [{ num: 1, text: '' }, { num: 2, text: '' }] }),
      destroy: async () => {},
    }),
    ocrExtractor: async (request) => {
      ocrRequest = request;
      return {
        provider: 'mineru',
        markdown: '## 第一章\n\nMinerU 识别出的扫描文档正文，包含足够内容。',
      };
    },
  });
  assert.equal(ocrRequest.fileName, 'scan.pdf');
  assert.equal(ocrRequest.pageCount, 2);
  assert.equal(scanned.ocrProvider, 'mineru');
  assert.match(scanned.markdown, /MinerU/);
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

test('plain text documents promote compact numbered lines to sections', () => {
  const parsed = parseTextDocument({
    fileName: 'arbitrary-notes.xyz',
    buffer: Buffer.from([
      '# Arbitrary notes',
      '',
      '1. First section',
      'Body for the first section.',
      '2. Second section',
      'Body for the second section.',
    ].join('\n')),
  });

  assert.equal(parsed.kind, DOCUMENT_KIND.Text);
  assert.equal(parsed.title, 'Arbitrary notes');
  assert.match(parsed.markdown, /## 1 First section/);
  assert.match(parsed.markdown, /## 2 Second section/);
});

test('HTML documents are converted to structured Markdown', () => {
  const parsed = parseHtmlDocument({
    fileName: 'storage.html',
    buffer: Buffer.from([
      '<!doctype html>',
      '<html lang="en"><head><title>Storage engines</title></head><body><article>',
      '<h1>Storage engines</h1>',
      '<p>A storage engine manages durable files and coordinates recovery after a crash.</p>',
      '<h2>Architecture</h2>',
      '<p>Engines coordinate buffer pools, ordered indexes, and durable files.</p>',
      '<h2>Recovery</h2>',
      '<p>Write-ahead logging restores committed changes after a crash.</p>',
      '</article></body></html>',
    ].join('\n')),
  });

  assert.equal(parsed.kind, DOCUMENT_KIND.Html);
  assert.equal(parsed.title, 'Storage engines');
  assert.match(parsed.markdown, /## Architecture/);
  assert.match(parsed.markdown, /## Recovery/);
});

test('DOCX documents extract raw text through the configured extractor', async () => {
  const parsed = await parseDocxDocument({
    fileName: 'word-notes.docx',
    buffer: Buffer.from('PK\u0003\u0004not-a-real-zip'),
    extractRawText: async () => ({
      value: 'Word notes\n\n1. First section\nBody for the first section.',
    }),
  });
  assert.equal(parsed.kind, DOCUMENT_KIND.Docx);
  assert.equal(parsed.title, 'word-notes');
  assert.match(parsed.markdown, /Word notes/);

  await assert.rejects(
    parseDocxDocument({
      fileName: 'broken.docx',
      buffer: Buffer.from('not a zip'),
    }),
    /DOCX/,
  );
});

test('prepareDocumentImport translates non-Chinese documents before structuring', async () => {
  const result = await prepareDocumentImport({
    fileName: 'storage.txt',
    buffer: Buffer.from([
      '# Storage engines',
      '',
      '## Architecture',
      '',
      'A storage engine coordinates durable files and buffer pools.',
      '',
      '## Recovery',
      '',
      'Write-ahead logging restores committed changes after a crash.',
    ].join('\n')),
    useAi: false,
    translate: true,
    translationService: {
      translate: async (text) => text
        .replace(/Storage engines/g, '存储引擎')
        .replace(/Architecture/g, '架构')
        .replace(/Recovery/g, '恢复')
        .replace('A storage engine coordinates durable files and buffer pools.', '存储引擎协调持久化文件与缓冲池。')
        .replace('Write-ahead logging restores committed changes after a crash.', '预写日志在崩溃后恢复已提交的更改。'),
    },
  });

  assert.equal(result.translated, true);
  assert.equal(result.language, 'en');
  assert.equal(result.title, '存储引擎');
  assert.match(result.markdown, /translated_to: "zh-CN"/);
  assert.match(result.markdown, /## 架构/);
  assert.match(result.markdown, /## 恢复/);
  assert.doesNotMatch(result.markdown, /Storage engines|Architecture|Recovery/);
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
