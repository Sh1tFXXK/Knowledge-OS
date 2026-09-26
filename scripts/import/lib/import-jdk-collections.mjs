import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createTranslationService, decodeHtmlEntities } from '../translation.mjs';

export const TYPE_RELATION_KIND = Object.freeze({
  Extends: 'extends',
  Implements: 'implements',
});

export const MEMBER_KIND = Object.freeze({
  Constructor: 'constructor',
  Method: 'method',
});

const TYPE_KIND = Object.freeze({
  Interface: 'interface',
  AbstractClass: 'abstract_class',
  Class: 'class',
  Enum: 'enum',
  Record: 'record',
  Annotation: 'annotation',
});

const VISIBILITY = Object.freeze({
  Public: 'public',
  Protected: 'protected',
  PackagePrivate: 'package-private',
  Private: 'private',
});

const DATA_FILE = Object.freeze({
  Tree: 'tree-data.json',
  NodePool: 'node-pool.json',
  Edges: 'knowledge-edges.json',
});

const DEFAULT_COLLECTION_TREE_NAME = '集合框架';
const MANAGED_API_TAB_PREFIX = 'jdk_collection_api_';
const DOCUMENTATION_MARKER_PREFIX = '<!-- jdk-doc-v2-sha256:';
const TRANSLATION_CACHE_VERSION = 5;
const TRANSLATION_CACHE_PATH = path.join(
  os.tmpdir(),
  `knowledge-os-jdk-comments-v${TRANSLATION_CACHE_VERSION}.json`,
);
const SUPPLEMENTAL_GROUP_ID = 'tree_jdk_collection_referenced_types';
const SUPPLEMENTAL_GROUP_NODE_ID = 'k_jdk_collection_referenced_types';
const JAVA_SIMPLE_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function stableId(prefix, value) {
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 16);
  return `${prefix}_${digest}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomically(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function findTreeNode(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children ?? []) {
    const match = findTreeNode(child, predicate);
    if (match) return match;
  }
  return null;
}

export function collectTreeBindings(root) {
  const bindings = [];
  const visit = (node, parent = null) => {
    bindings.push({ node, parent });
    for (const child of node.children ?? []) visit(child, node);
  };
  visit(root);
  return bindings;
}

function candidateTypeNames(collectionRoot) {
  return [...new Set(
    collectTreeBindings(collectionRoot)
      .map(({ node }) => String(node.name ?? '').trim())
      .filter((name) => JAVA_SIMPLE_NAME.test(name)),
  )].sort((left, right) => left.localeCompare(right));
}

function sourceLocation(sourceOption) {
  const source = sourceOption || process.env.JAVA_HOME || '';
  if (!source) {
    throw new Error('Missing JDK source. Pass --source <jdk-root-or-idea-jrt-path>.');
  }

  const ideaSeparator = source.indexOf('!');
  const sourcePrefix = ideaSeparator >= 0 ? source.slice(0, ideaSeparator) : source;
  const normalized = path.resolve(sourcePrefix);
  const jdkRoot = normalized.toLowerCase().endsWith('src.zip')
    ? path.dirname(path.dirname(normalized))
    : normalized;
  const javaExecutable = process.platform === 'win32'
    ? path.join(jdkRoot, 'bin', 'java.exe')
    : path.join(jdkRoot, 'bin', 'java');
  const sourceArchive = path.join(jdkRoot, 'lib', 'src.zip');

  if (!fs.existsSync(javaExecutable)) {
    throw new Error(`Java executable not found: ${javaExecutable}`);
  }
  if (!fs.existsSync(sourceArchive)) {
    throw new Error(`JDK source archive not found: ${sourceArchive}`);
  }

  return {
    displayPath: source,
    javaExecutable,
    jdkRoot,
    sourceArchive,
  };
}

export function runIntrospector({ javaExecutable, sourceArchive, requestedNames }) {
  const helperPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'JdkCollectionIntrospector.java',
  );
  const result = spawnSync(javaExecutable, [
    '--add-modules',
    'jdk.compiler',
    helperPath,
    '--source-archive',
    sourceArchive,
    ...requestedNames,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `JDK introspector exited with ${result.status}.`);
  }
  return JSON.parse(result.stdout.replace(/^\uFEFF/, ''));
}

function typeKindLabel(kind) {
  switch (kind) {
    case TYPE_KIND.Interface:
      return '接口';
    case TYPE_KIND.AbstractClass:
      return '抽象类';
    case TYPE_KIND.Class:
      return '类';
    case TYPE_KIND.Enum:
      return '枚举';
    case TYPE_KIND.Record:
      return '记录类';
    case TYPE_KIND.Annotation:
      return '注解类型';
    default:
      throw new Error(`Unsupported Java type kind: ${kind}`);
  }
}

function compactTypeName(typeName) {
  return typeName
    .replaceAll('java.lang.', '')
    .replaceAll('java.util.concurrent.', '')
    .replaceAll('java.util.function.', '')
    .replaceAll('java.util.', '')
    .replaceAll('java.io.', '');
}

function memberLabel(member) {
  const parameters = member.parameterTypes.map(compactTypeName).join(', ');
  const label = `${member.name}(${parameters})`;
  return label.length <= 120 ? label : `${label.slice(0, 117)}...`;
}

function memberPageId(type, member, namespace = 'jdk') {
  return stableId(
    `${namespace}_member`,
    `${type.className}:${member.kind}:${member.signature}`,
  );
}

function javadocLink(value) {
  const trimmed = value.trim();
  const separator = trimmed.search(/\s/);
  const reference = separator < 0 ? trimmed : trimmed.slice(0, separator);
  const label = separator < 0 ? reference : trimmed.slice(separator).trim();
  return label ? `\`${label}\`` : '';
}

export function javadocTextToMarkdown(value) {
  const protectedValues = [];
  const protect = (content) => {
    const token = `ZXQJDKRAW${String(protectedValues.length).padStart(4, '0')}QXZ`;
    protectedValues.push(content);
    return token;
  };
  const protectedText = decodeHtmlEntities(String(value ?? ''))
    .replace(/<pre>\s*\{@code\s+([\s\S]*?)\}\s*<\/pre>/gi, (_, code) => protect(
      `\n\n\`\`\`java\n${code.trim()}\n\`\`\`\n\n`,
    ))
    .replace(/\{@code\s+([\s\S]*?)\}/g, (_, code) => protect(`\`${code.trim()}\``))
    .replace(/\{@literal\s+([\s\S]*?)\}/g, (_, literal) => protect(`\`${literal.trim()}\``))
    .replace(/\{@(?:link|linkplain)\s+([\s\S]*?)\}/g, (_, link) => protect(javadocLink(link)))
    .replace(/\{@inheritDoc\}/g, '继承父类型对应成员的文档说明。')
    .replace(/<p\s*\/?>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\s*>/gi, '\n- ')
    .replace(/<\/(?:li|ul|ol)>/gi, '\n')
    .replace(/<a\s+[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return protectedValues.reduce(
    (text, protectedValue, index) => text.replaceAll(
      `ZXQJDKRAW${String(index).padStart(4, '0')}QXZ`,
      protectedValue,
    ),
    protectedText,
  ).trim();
}

function translationField(value, translate = true) {
  const markdown = javadocTextToMarkdown(value);
  const prose = markdown
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .filter((segment) => segment && !segment.startsWith('`'))
    .join('');
  if (!translate || !/[A-Za-z]/.test(prose)) {
    return { kind: 'literal', value: markdown };
  }
  return {
    kind: 'translated',
    key: createHash('sha256').update(markdown).digest('hex'),
    value: markdown,
  };
}

function renderTranslationField(field, fieldTranslations) {
  const rendered = field.kind === 'literal'
    ? field.value
    : fieldTranslations[field.key];
  if (rendered === undefined) {
    throw new Error(`Missing translated Javadoc field ${field.key}.`);
  }
  return rendered
    .replace(/（(`[^`\n]+`)\)/g, '（$1）')
    .replace(/\((`[^`\n]+`)）/g, '（$1）')
    .trim();
}

function documentationTranslationTemplate(documentation) {
  return {
    description: translationField(documentation.description),
    tags: documentation.tags.map((tag) => ({
      ...tag,
      field: translationField(tag.text, tag.kind !== 'since' && tag.kind !== 'see'),
    })),
  };
}

function renderDocumentationTranslation(template, fieldTranslations) {
  return {
    description: renderTranslationField(template.description, fieldTranslations),
    tags: template.tags.map(({ field, ...tag }) => ({
      ...tag,
      text: renderTranslationField(field, fieldTranslations),
    })),
  };
}

function collectTranslationFields(template, fields) {
  const collect = (field) => {
    if (field.kind !== 'translated') return;
    if (!fields.has(field.key)) fields.set(field.key, field.value);
  };
  collect(template.description);
  for (const tag of template.tags) collect(tag.field);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function translatableFieldHtml(markdown) {
  const codeValues = [];
  const html = markdown
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (!segment.startsWith('`')) return escapeHtml(segment);
      const index = codeValues.length;
      codeValues.push(segment);
      return `<span data-code="${index}">${String(index).padStart(4, '0')}</span>`;
    })
    .join('');
  return { html, codeValues };
}

function restoreTranslatedField(element, codeValues) {
  const codeElements = [...element.querySelectorAll('[data-code]')];
  if (codeElements.length !== codeValues.length) {
    throw new Error('Google changed the number of protected code nodes.');
  }
  const restoredIndexes = new Set();
  for (const codeElement of codeElements) {
    const index = Number.parseInt(codeElement.getAttribute('data-code') ?? '', 10);
    if (!Number.isInteger(index) || !codeValues[index] || restoredIndexes.has(index)) {
      throw new Error('Google changed a protected code node identifier.');
    }
    restoredIndexes.add(index);
    codeElement.replaceWith(codeValues[index]);
  }
  const translated = element.textContent?.trim() ?? '';
  if (!translated) throw new Error('Google returned an empty translation.');
  return translated;
}

function translationBatches(entries, maxCharacters = 1_800, maxItems = 16) {
  const batches = [];
  let current = [];
  let currentCharacters = 0;
  for (const entry of entries) {
    const nextCharacters = currentCharacters + entry.text.length;
    if (current.length > 0 && (current.length >= maxItems || nextCharacters > maxCharacters)) {
      batches.push(current);
      current = [];
      currentCharacters = 0;
    }
    current.push(entry);
    currentCharacters += entry.text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function translateFieldByFragments(markdown) {
  const translationService = createTranslationService({ engine: 'google' });
  const translated = [];
  for (const segment of markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/g)) {
    if (!segment || segment.startsWith('`') || !/[A-Za-z]/.test(segment)) {
      translated.push(segment);
      continue;
    }
    translated.push(await translationService.translate(segment, 'en'));
  }
  return translated.join('')
    .replace(/（(`[^`\n]+`)\)/g, '（$1）')
    .replace(/\((`[^`\n]+`)）/g, '（$1）')
    .trim();
}

async function translateGoogleHtmlBatch(batch, fetchImpl = fetch) {
  const prepared = batch.map((entry) => ({
    ...entry,
    ...translatableFieldHtml(entry.text),
  }));
  const html = `<div>${prepared.map((entry, index) => (
    `<p data-jdk="${index}">${entry.html}</p>`
  )).join('')}</div>`;
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', 'zh-CN');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', html);

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeOS-Importer/3.0)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload?.[0])) throw new Error('Unexpected Google response.');
      const translatedHtml = payload[0].map((item) => item?.[0] ?? '').join('');
      const fragment = JSDOM.fragment(translatedHtml);
      const translated = prepared.map((entry, index) => {
        const element = fragment.querySelector(`[data-jdk="${index}"]`)
          ?? (prepared.length === 1 ? fragment.firstElementChild : null);
        if (!element) throw new Error(`Missing translated segment ${index}.`);
        return [entry.key, restoreTranslatedField(element, entry.codeValues)];
      });
      return translated;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await wait(1_000 * (2 ** attempt));
    }
  }
  if (batch.length > 1) {
    const midpoint = Math.ceil(batch.length / 2);
    const left = await translateGoogleHtmlBatch(batch.slice(0, midpoint), fetchImpl);
    const right = await translateGoogleHtmlBatch(batch.slice(midpoint), fetchImpl);
    return [...left, ...right];
  }
  try {
    return [[batch[0].key, await translateFieldByFragments(batch[0].text)]];
  } catch (fallbackError) {
    throw new Error(
      `Google translation failed: ${lastError?.message ?? lastError}; `
      + `fragment fallback failed: ${fallbackError?.message ?? fallbackError}`,
    );
  }
}

function documentationHash(documentation) {
  return createHash('sha256')
    .update(JSON.stringify(documentation))
    .digest('hex');
}

export function documentationMarker(hash) {
  return `${DOCUMENTATION_MARKER_PREFIX}${hash} -->`;
}

function existingMemberContent(nodePool, managedTabPrefixes) {
  const result = new Map();
  const visitPages = (pages) => {
    for (const page of pages ?? []) {
      if (String(page.id ?? '').startsWith('jdk_member_') && typeof page.content === 'string') {
        result.set(page.id, page.content);
      }
      visitPages(page.pages);
    }
  };
  for (const node of Object.values(nodePool)) {
    for (const tab of node.card?.tabs ?? []) {
      if (!managedTabPrefixes.some((prefix) => String(tab.id ?? '').startsWith(prefix))) {
        continue;
      }
      visitPages(tab.pages);
    }
  }
  return result;
}

function readTranslationCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(TRANSLATION_CACHE_PATH, 'utf8'));
    if (parsed.version !== TRANSLATION_CACHE_VERSION || !parsed.translations) {
      return { version: TRANSLATION_CACHE_VERSION, translations: {}, fields: {} };
    }
    return { ...parsed, fields: parsed.fields ?? {} };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { version: TRANSLATION_CACHE_VERSION, translations: {}, fields: {} };
    }
    throw error;
  }
}

function writeTranslationCache(cache) {
  const tempPath = `${TRANSLATION_CACHE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, TRANSLATION_CACHE_PATH);
}

async function mapWithConcurrency(items, concurrency, worker) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        await worker(items[index], index);
      }
    },
  );
  await Promise.all(workers);
}

export async function translateMemberDocumentation({
  types,
  nodePool,
  engine = 'google',
  concurrency = 4,
  memberIdNamespace = 'jdk',
  managedTabPrefixes = [MANAGED_API_TAB_PREFIX],
  onProgress = () => {},
}) {
  if (engine !== 'google') {
    throw new Error('JDK comment translation currently supports the google engine only.');
  }
  const existingContent = existingMemberContent(nodePool, managedTabPrefixes);
  const translationCache = readTranslationCache();
  const pendingByHash = new Map();
  let documentedMembers = 0;
  let documentedTypes = 0;
  let reusedMemberTranslations = 0;
  let reusedTypeTranslations = 0;

  const queueDocumentation = (owner, existing) => {
    const hash = documentationHash(owner.documentation);
    if (existing?.includes(documentationMarker(hash))) {
      owner.renderedContent = existing;
      return 'existing';
    }
    const cached = translationCache.translations[hash];
    if (cached) {
      owner.translatedDocumentation = cached;
      owner.documentationHash = hash;
      return 'cached';
    }
    const pending = pendingByHash.get(hash) ?? {
      documentation: owner.documentation,
      owners: [],
      template: documentationTranslationTemplate(owner.documentation),
    };
    pending.owners.push(owner);
    pendingByHash.set(hash, pending);
    return 'pending';
  };

  for (const type of types) {
    if (type.documentation) {
      documentedTypes += 1;
      if (queueDocumentation(type, null) !== 'pending') reusedTypeTranslations += 1;
    }
    for (const member of type.members) {
      if (!member.documentation) continue;
      documentedMembers += 1;
      const existing = existingContent.get(memberPageId(type, member, memberIdNamespace));
      if (queueDocumentation(member, existing) !== 'pending') reusedMemberTranslations += 1;
    }
  }

  const pending = [...pendingByHash.entries()];
  const fields = new Map();
  for (const [, item] of pending) collectTranslationFields(item.template, fields);
  const missingFields = [...fields.entries()]
    .filter(([key]) => !translationCache.fields?.[key])
    .map(([key, text]) => ({ key, text }));
  const batches = translationBatches(missingFields, 1_800, 1);
  let completedBatches = 0;
  await mapWithConcurrency(batches, concurrency, async (batch) => {
    const translatedSegments = await translateGoogleHtmlBatch(batch);
    for (const [key, translated] of translatedSegments) {
      translationCache.fields[key] = translated;
    }
    completedBatches += 1;
    if (completedBatches % 5 === 0) writeTranslationCache(translationCache);
    if (completedBatches === batches.length || completedBatches % 25 === 0) {
      onProgress(completedBatches, batches.length);
    }
  });

  for (const [hash, item] of pending) {
    const translated = renderDocumentationTranslation(
      item.template,
      translationCache.fields,
    );
    for (const owner of item.owners) {
      owner.translatedDocumentation = translated;
      owner.documentationHash = hash;
    }
    translationCache.translations[hash] = translated;
  }
  if (pending.length > 0 || completedBatches > 0) writeTranslationCache(translationCache);

  return {
    documentedMembers,
    documentedTypes,
    reusedTranslations: reusedMemberTranslations + reusedTypeTranslations,
    reusedMemberTranslations,
    reusedTypeTranslations,
    translatedMembers: documentedMembers - reusedMemberTranslations,
    translatedTypes: documentedTypes - reusedTypeTranslations,
    uniqueTranslations: pending.length,
    translatedFields: missingFields.length,
    translationBatches: batches.length,
  };
}

export function renderDocumentationSection(documentation) {
  if (!documentation) return '';
  const lines = ['### 源码注释（中文）'];
  if (documentation.description) lines.push('', documentation.description);

  const appendNamedTags = (kind, heading) => {
    const tags = documentation.tags.filter((tag) => tag.kind === kind);
    if (tags.length === 0) return;
    lines.push('', `#### ${heading}`);
    for (const tag of tags) {
      lines.push(`- \`${tag.name}\`：${tag.text || '未提供补充说明。'}`);
    }
  };
  const appendTextTags = (kind, heading) => {
    const tags = documentation.tags.filter((tag) => tag.kind === kind);
    if (tags.length === 0) return;
    lines.push('', `#### ${heading}`);
    for (const tag of tags) lines.push(tag.text);
  };

  appendNamedTags('param', '参数');
  appendTextTags('return', '返回值');
  appendNamedTags('throws', '异常');
  appendTextTags('apiNote', 'API 说明');
  appendTextTags('implSpec', '实现规范');
  appendTextTags('implNote', '实现说明');
  appendTextTags('deprecated', '已弃用');
  appendTextTags('since', '自版本');
  appendTextTags('see', '参见');

  const knownKinds = new Set([
    'param',
    'return',
    'throws',
    'apiNote',
    'implSpec',
    'implNote',
    'deprecated',
    'since',
    'see',
  ]);
  for (const tag of documentation.tags.filter((item) => !knownKinds.has(item.kind))) {
    lines.push('', `#### @${tag.kind}`, tag.text);
  }
  return lines.join('\n').trim();
}

function memberContent(type, member) {
  if (member.renderedContent) return member.renderedContent;
  const characteristics = [
    member.staticMember ? '静态' : '实例',
    member.abstractMember ? '抽象' : null,
    member.defaultMethod ? '默认方法' : null,
    member.finalMember ? 'final' : null,
    member.synchronizedMember ? 'synchronized' : null,
    member.nativeMember ? 'native' : null,
    member.varArgs ? '可变参数' : null,
  ].filter(Boolean);
  const details = [
    `- 声明类型：\`${type.className}\``,
    `- 可见性：\`${member.visibility}\``,
    `- 特征：${characteristics.length > 0 ? characteristics.join('、') : '普通方法'}`,
  ];
  if (member.returnType) details.push(`- 返回类型：\`${member.returnType}\``);
  if (member.parameterTypes.length > 0) {
    details.push(`- 参数类型：${member.parameterTypes.map((value) => `\`${value}\``).join('、')}`);
  }
  if (member.exceptionTypes.length > 0) {
    details.push(`- 声明异常：${member.exceptionTypes.map((value) => `\`${value}\``).join('、')}`);
  }
  const translatedDocumentation = renderDocumentationSection(member.translatedDocumentation);
  const marker = member.documentationHash
    ? documentationMarker(member.documentationHash)
    : '';
  const signatureBlock = [
    '```java',
    member.signature,
    '```',
  ].join('\n');
  const declarationBlock = [
    '### 声明信息',
    '',
    ...details,
  ].join('\n');
  return [
    marker,
    signatureBlock,
    translatedDocumentation,
    declarationBlock,
  ].filter(Boolean).join('\n\n');
}

function memberPage(type, member, source) {
  return {
    id: memberPageId(type, member, source.memberIdNamespace ?? 'jdk'),
    label: memberLabel(member),
    content: memberContent(type, member),
    tags: [source.memberTag ?? 'JDK API', member.kind, member.visibility],
  };
}

function memberGroup(type, source, idSuffix, label, members) {
  if (members.length === 0) return null;
  return {
    id: stableId('jdk_member_group', `${type.className}:${idSuffix}`),
    label: `${label} (${members.length})`,
    content: `以下成员由 \`${type.className}\` 直接声明，不重复列出继承成员。`,
    pages: members.map((member) => memberPage(type, member, source)),
  };
}

export function buildApiTab(type, source) {
  const constructors = type.members.filter(
    (member) => member.kind === MEMBER_KIND.Constructor,
  );
  const methods = type.members.filter((member) => member.kind === MEMBER_KIND.Method);
  const groups = [
    memberGroup(type, source, 'constructors', '构造器', constructors),
    memberGroup(
      type,
      source,
      VISIBILITY.Public,
      '公开方法',
      methods.filter((member) => member.visibility === VISIBILITY.Public),
    ),
    memberGroup(
      type,
      source,
      VISIBILITY.Protected,
      '受保护方法',
      methods.filter((member) => member.visibility === VISIBILITY.Protected),
    ),
    memberGroup(
      type,
      source,
      VISIBILITY.PackagePrivate,
      '包内方法',
      methods.filter((member) => member.visibility === VISIBILITY.PackagePrivate),
    ),
    memberGroup(
      type,
      source,
      VISIBILITY.Private,
      '私有方法',
      methods.filter((member) => member.visibility === VISIBILITY.Private),
    ),
  ].filter(Boolean);

  const managedTabPrefix = source.managedTabPrefix ?? MANAGED_API_TAB_PREFIX;
  const tabLabel = source.apiLabel ?? `JDK ${source.featureVersion} API`;
  const tabContent = source.apiDescription ?? [
    `\`${type.className}\` 是 ${typeKindLabel(type.kind)}。`,
    '',
    `本页列出本机 OpenJDK ${source.runtimeVersion} 中该类型直接声明的 ${constructors.length} 个构造器和 ${methods.length} 个方法。继承成员通过类型关系图追踪。`,
    '',
    `来源：\`${source.displayPath}\``,
  ].join('\n');

  return {
    id: `${managedTabPrefix}${stableId('type', `${source.memberIdNamespace ?? 'jdk'}:${type.className}`)}`,
    label: tabLabel,
    content: tabContent,
    pages: groups,
    tags: source.apiTags ?? ['Java', `JDK ${source.featureVersion}`, '集合框架'],
  };
}

function mergeTypeNode(existingNode, type, source, relationRootNodeId) {
  const existingTabs = existingNode?.card?.tabs ?? [];
  const preservedTabs = existingTabs.filter(
    (tab) => !String(tab.id ?? '').startsWith(MANAGED_API_TAB_PREFIX),
  );
  const tags = new Set([
    ...(existingNode?.tags ?? []),
    'Java',
    '集合框架',
    `JDK ${source.featureVersion}`,
    type.className,
    typeKindLabel(type.kind),
  ]);
  const rootContent = existingNode?.card?.rootContent?.trim()
    ? existingNode.card.rootContent
    : `\`${type.className}\` 是本机 OpenJDK ${source.runtimeVersion} 中的${typeKindLabel(type.kind)}。完整声明成员位于 JDK API 页签，直接继承和实现关系位于类型关系图。`;

  return {
    ...(existingNode ?? {}),
    id: existingNode?.id ?? relationRootNodeId,
    label: existingNode?.label ?? type.simpleName,
    tags: [...tags],
    role: existingNode?.role ?? 'plain',
    relationIndex: { rootNodeId: relationRootNodeId },
    card: {
      ...(existingNode?.card ?? {}),
      nodeId: existingNode?.card?.nodeId ?? relationRootNodeId,
      title: existingNode?.card?.title ?? type.simpleName,
      rootContent,
      tabs: [...preservedTabs, buildApiTab(type, source)],
    },
  };
}

function ensureSupplementalGroup(collectionRoot, nodePool) {
  let group = (collectionRoot.children ?? []).find(
    (child) => child.id === SUPPLEMENTAL_GROUP_ID,
  );
  if (!group) {
    group = {
      id: SUPPLEMENTAL_GROUP_ID,
      name: 'JDK 补充类型',
      count: 0,
      nodeRef: SUPPLEMENTAL_GROUP_NODE_ID,
      children: [],
    };
    collectionRoot.children = [...(collectionRoot.children ?? []), group];
  }
  if (!nodePool[SUPPLEMENTAL_GROUP_NODE_ID]) {
    nodePool[SUPPLEMENTAL_GROUP_NODE_ID] = {
      id: SUPPLEMENTAL_GROUP_NODE_ID,
      label: 'JDK 补充类型',
      tags: ['Java', '集合框架', 'JDK API'],
      role: 'plain',
      card: {
        nodeId: SUPPLEMENTAL_GROUP_NODE_ID,
        title: 'JDK 补充类型',
        rootContent: '当前集合框架目录中已有类型所直接依赖、但原目录尚未挂载的父类型和接口。',
        tabs: [],
      },
    };
  }
  return group;
}

function upsertTreeBindingEdge(edges, parent, child) {
  if (!parent.nodeRef || !child.nodeRef) return;
  const id = `treebind:${parent.id}:${child.id}`;
  const edge = {
    id,
    source: parent.nodeRef,
    target: child.nodeRef,
    type: 'belongs-to',
    label: 'contains',
  };
  const index = edges.findIndex((item) => item.id === id);
  if (index >= 0) edges[index] = edge;
  else edges.push(edge);
}

function bindingsBySimpleName(collectionRoot) {
  const result = new Map();
  for (const binding of collectTreeBindings(collectionRoot)) {
    const simpleName = String(binding.node.name ?? '').trim();
    if (!JAVA_SIMPLE_NAME.test(simpleName)) continue;
    const current = result.get(simpleName) ?? [];
    current.push(binding);
    result.set(simpleName, current);
  }
  return result;
}

function typeNodeId(className) {
  return stableId('k_jdk_type', className);
}

function typeTreeId(className) {
  return stableId('tree_jdk_type', className);
}

function canonicalNodeIds({ collectionRoot, nodePool, edges, types }) {
  const bindings = bindingsBySimpleName(collectionRoot);
  const canonicalByClassName = new Map();
  let supplementalGroup = null;

  for (const type of types) {
    let candidates = bindings.get(type.simpleName) ?? [];
    if (candidates.length === 0) {
      supplementalGroup ??= ensureSupplementalGroup(collectionRoot, nodePool);
      const treeNode = {
        id: typeTreeId(type.className),
        name: type.simpleName,
        count: 0,
        nodeRef: typeNodeId(type.className),
      };
      supplementalGroup.children = [...(supplementalGroup.children ?? []), treeNode];
      const binding = { node: treeNode, parent: supplementalGroup };
      candidates = [binding];
      bindings.set(type.simpleName, candidates);
      upsertTreeBindingEdge(edges, supplementalGroup, treeNode);
    }

    const canonicalBinding = candidates.find(({ node }) => node.nodeRef && nodePool[node.nodeRef])
      ?? candidates.find(({ node }) => node.nodeRef)
      ?? candidates[0];
    if (!canonicalBinding.node.nodeRef) {
      canonicalBinding.node.nodeRef = typeNodeId(type.className);
    }
    const canonicalNodeId = canonicalBinding.node.nodeRef;
    canonicalByClassName.set(type.className, canonicalNodeId);

    for (const binding of candidates) {
      if (!binding.node.nodeRef) binding.node.nodeRef = canonicalNodeId;
      if (binding.parent) upsertTreeBindingEdge(edges, binding.parent, binding.node);
    }
  }
  if (supplementalGroup) upsertTreeBindingEdge(edges, collectionRoot, supplementalGroup);
  return { bindings, canonicalByClassName };
}

function classNameByNodeId({ bindings, types, nodePool }) {
  const classNameBySimpleName = new Map(types.map((type) => [type.simpleName, type.className]));
  const result = new Map();
  for (const [simpleName, typeBindings] of bindings) {
    const className = classNameBySimpleName.get(simpleName);
    if (!className) continue;
    for (const { node } of typeBindings) {
      if (node.nodeRef) result.set(node.nodeRef, className);
    }
  }
  for (const [nodeId, node] of Object.entries(nodePool)) {
    const className = classNameBySimpleName.get(String(node.label ?? '').trim());
    if (className) result.set(nodeId, className);
  }
  return result;
}

function expectedRelations(types) {
  const result = new Map();
  for (const type of types) {
    result.set(
      type.className,
      new Map(type.relations.map((relation) => [relation.targetClassName, relation.kind])),
    );
  }
  return result;
}

export function reconcileTypeEdges({ edges, types, canonicalByClassName, classByNodeId }) {
  const expectedBySource = expectedRelations(types);
  const canonicalSourceIds = new Map(
    [...canonicalByClassName.entries()].map(([className, nodeId]) => [nodeId, className]),
  );
  const retained = [];
  const retainedRelationKeys = new Set();

  for (const edge of edges) {
    if (edge.type !== TYPE_RELATION_KIND.Extends && edge.type !== TYPE_RELATION_KIND.Implements) {
      retained.push(edge);
      continue;
    }
    const sourceClassName = canonicalSourceIds.get(edge.source);
    if (!sourceClassName) {
      retained.push(edge);
      continue;
    }
    const targetClassName = classByNodeId.get(edge.target);
    if (!targetClassName) {
      retained.push(edge);
      continue;
    }
    const expectedKind = expectedBySource.get(sourceClassName)?.get(targetClassName);
    if (!expectedKind) continue;

    const canonicalTarget = canonicalByClassName.get(targetClassName);
    if (!canonicalTarget) continue;
    const key = `${edge.source}:${canonicalTarget}:${expectedKind}`;
    if (retainedRelationKeys.has(key)) continue;
    retainedRelationKeys.add(key);
    retained.push({
      ...edge,
      target: canonicalTarget,
      type: expectedKind,
      label: expectedKind,
    });
  }

  for (const type of types) {
    const source = canonicalByClassName.get(type.className);
    if (!source) continue;
    for (const relation of type.relations) {
      const target = canonicalByClassName.get(relation.targetClassName);
      if (!target) continue;
      const key = `${source}:${target}:${relation.kind}`;
      if (retainedRelationKeys.has(key)) continue;
      retainedRelationKeys.add(key);
      retained.push({
        id: stableId('jdk_type_edge', key),
        source,
        target,
        type: relation.kind,
        label: relation.kind,
      });
    }
  }
  return retained;
}

function validateState(collectionRoot, nodePool, edges) {
  const treeBindings = collectTreeBindings(collectionRoot);
  const managedNodeIds = new Set();
  for (const { node } of treeBindings) {
    if (!node.nodeRef) {
      throw new Error(`Tree node ${node.id} is missing nodeRef after import.`);
    }
    if (!nodePool[node.nodeRef]) {
      throw new Error(`Tree node ${node.id} references missing knowledge node ${node.nodeRef}.`);
    }
    managedNodeIds.add(node.nodeRef);
  }
  for (const edge of edges) {
    if (!managedNodeIds.has(edge.source) && !managedNodeIds.has(edge.target)) continue;
    if (!nodePool[edge.source] || !nodePool[edge.target]) {
      throw new Error(`Edge ${edge.id} references a missing knowledge node.`);
    }
  }
}

function parseArguments(argv) {
  const options = {
    source: '',
    dataDir: path.resolve(process.cwd(), 'data'),
    collectionTreeId: '',
    dryRun: false,
    skipTranslation: false,
    translationEngine: 'google',
    translationConcurrency: 4,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--source':
        options.source = argv[++index] ?? '';
        break;
      case '--data-dir':
        options.dataDir = path.resolve(argv[++index] ?? '');
        break;
      case '--collection-tree-id':
        options.collectionTreeId = argv[++index] ?? '';
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-translation':
        options.skipTranslation = true;
        break;
      case '--translation-engine':
        options.translationEngine = argv[++index] ?? '';
        break;
      case '--translation-concurrency':
        options.translationConcurrency = Number.parseInt(argv[++index] ?? '', 10);
        if (!Number.isInteger(options.translationConcurrency) || options.translationConcurrency < 1) {
          throw new Error('--translation-concurrency must be a positive integer.');
        }
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

export async function importJdkCollections(options) {
  const treePath = path.join(options.dataDir, DATA_FILE.Tree);
  const nodePoolPath = path.join(options.dataDir, DATA_FILE.NodePool);
  const edgesPath = path.join(options.dataDir, DATA_FILE.Edges);
  const treeData = readJson(treePath);
  const nodePool = readJson(nodePoolPath);
  let edges = readJson(edgesPath);
  const collectionRoot = findTreeNode(
    treeData,
    (node) => options.collectionTreeId
      ? node.id === options.collectionTreeId
      : node.name === DEFAULT_COLLECTION_TREE_NAME,
  );
  if (!collectionRoot) {
    throw new Error('Collection framework tree node was not found.');
  }

  const requestedNames = candidateTypeNames(collectionRoot);
  const source = sourceLocation(options.source);
  const introspection = runIntrospector({
    javaExecutable: source.javaExecutable,
    sourceArchive: source.sourceArchive,
    requestedNames,
  });
  if (introspection.documentationErrors.length > 0) {
    throw new Error(
      `JDK source documentation extraction failed:\n${introspection.documentationErrors.join('\n')}`,
    );
  }
  const featureVersion = Number.parseInt(introspection.runtimeVersion, 10);
  const sourceMetadata = {
    ...source,
    runtimeVersion: introspection.runtimeVersion,
    featureVersion: Number.isFinite(featureVersion) ? featureVersion : introspection.runtimeVersion,
  };
  const types = introspection.types;
  const translationSummary = options.skipTranslation
    ? {
        documentedMembers: types.reduce(
          (count, type) => count + type.members.filter((member) => member.documentation).length,
          0,
        ),
        reusedTranslations: 0,
        translatedMembers: 0,
        uniqueTranslations: 0,
        translatedFields: 0,
        translationBatches: 0,
      }
    : await translateMemberDocumentation({
        types,
        nodePool,
        engine: options.translationEngine,
        concurrency: options.translationConcurrency,
        onProgress: (completed, total) => {
          process.stderr.write(`[jdk-comments] translated ${completed}/${total}\n`);
        },
      });
  const { bindings, canonicalByClassName } = canonicalNodeIds({
    collectionRoot,
    nodePool,
    edges,
    types,
  });

  for (const type of types) {
    const canonicalNodeId = canonicalByClassName.get(type.className);
    if (!canonicalNodeId) continue;
    const typeBindings = bindings.get(type.simpleName) ?? [];
    const nodeIds = new Set(typeBindings.map(({ node }) => node.nodeRef).filter(Boolean));
    nodeIds.add(canonicalNodeId);
    for (const nodeId of nodeIds) {
      nodePool[nodeId] = mergeTypeNode(
        nodePool[nodeId],
        type,
        sourceMetadata,
        canonicalNodeId,
      );
    }
  }

  const classByNodeId = classNameByNodeId({ bindings, types, nodePool });
  edges = reconcileTypeEdges({ edges, types, canonicalByClassName, classByNodeId });
  validateState(collectionRoot, nodePool, edges);

  const constructorCount = types.reduce(
    (count, type) => count + type.members.filter(
      (member) => member.kind === MEMBER_KIND.Constructor,
    ).length,
    0,
  );
  const methodCount = types.reduce(
    (count, type) => count + type.members.filter(
      (member) => member.kind === MEMBER_KIND.Method,
    ).length,
    0,
  );
  const relationCount = types.reduce((count, type) => count + type.relations.length, 0);
  const summary = {
    nodeId: collectionRoot.nodeRef,
    treeNodeId: collectionRoot.id,
    source: source.displayPath,
    runtimeVersion: introspection.runtimeVersion,
    requestedTypeNames: requestedNames.length,
    importedTypes: types.length,
    importedConstructors: constructorCount,
    importedMethods: methodCount,
    importedMembers: constructorCount + methodCount,
    documentedMembers: translationSummary.documentedMembers,
    translatedComments: translationSummary.translatedMembers,
    reusedTranslations: translationSummary.reusedTranslations,
    uniqueTranslations: translationSummary.uniqueTranslations,
    translatedFields: translationSummary.translatedFields,
    translationBatches: translationSummary.translationBatches,
    directTypeRelations: relationCount,
    unresolvedNames: introspection.unresolvedNames,
    dryRun: options.dryRun,
  };

  if (!options.dryRun) {
    writeJsonAtomically(treePath, treeData);
    writeJsonAtomically(nodePoolPath, nodePool);
    writeJsonAtomically(edgesPath, edges);
  }
  return summary;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const summary = await importJdkCollections(options);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main();
}
