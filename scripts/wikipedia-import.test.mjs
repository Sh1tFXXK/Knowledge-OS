import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyImport,
  buildSectionTree,
  extractExternalLinks,
  extractKeywords,
  isBlacklisted,
  parseWikiUrl,
  parseArgs,
  splitSections,
  validateLanguageCode,
  wikiUrl,
  wikitextToMarkdown,
} from './import-wikipedia.mjs';

test('Wikipedia URLs are parsed and normalized', () => {
  assert.deepEqual(
    parseWikiUrl('https://zh.m.wikipedia.org/wiki/%E6%95%B0%E6%8D%AE%E5%BA%93?oldformat=true#history'),
    { lang: 'zh', title: '数据库' },
  );
  assert.equal(wikiUrl('en', 'Database management system'), 'https://en.wikipedia.org/wiki/Database_management_system');
  assert.equal(parseWikiUrl('https://zh-min-nan.wikipedia.org/wiki/Chhim-chhoe').lang, 'zh-min-nan');
  assert.throws(() => parseWikiUrl('https://example.com/wiki/Database'), /不是维基百科文章链接/);
});

test('CLI options and language codes are validated without starting the wizard', () => {
  assert.equal(validateLanguageCode(' ZH-MIN-NAN '), 'zh-min-nan');
  assert.throws(() => validateLanguageCode('zh_CN'), /语言代码无效/);
  assert.deepEqual(
    parseArgs(['node', 'script', 'https://en.wikipedia.org/wiki/Database', '--parent=root', '--translate', '--interactive', '--translate-engine=google']),
    {
      url: 'https://en.wikipedia.org/wiki/Database',
      parentNodeRef: 'root',
      langOverride: null,
      dryRun: false,
      translate: true,
      interactive: true,
      translateEngine: 'google',
    },
  );
});

test('wikitext conversion preserves useful structure and removes references', () => {
  const markdown = wikitextToMarkdown(
    [
      "'''Database''' stores [[Data|data]].<ref>citation</ref>",
      '* First item',
      '# Second item',
      '{{main|Database model}}',
    ].join('\n'),
    'en',
  );

  assert.match(markdown, /\*\*Database\*\*/);
  assert.match(markdown, /\[data\]\(https:\/\/en\.wikipedia\.org\/wiki\/Data\)/);
  assert.match(markdown, /- First item/);
  assert.match(markdown, /1\. Second item/);
  assert.match(markdown, /主条目：\[Database model\]/);
  assert.doesNotMatch(markdown, /citation|<ref>/);
});

test('section parsing keeps hierarchy and recognizes skipped sections', () => {
  const tree = buildSectionTree(splitSections('Lead\n== Models ==\nOverview\n=== Relational ===\nRows\n== References ==\nSource'));

  assert.equal(tree.body.join('\n'), 'Lead');
  assert.equal(tree.children[0].title, 'Models');
  assert.equal(tree.children[0].children[0].title, 'Relational');
  assert.equal(tree.children[1].title, 'References');
  assert.equal(isBlacklisted('References'), true);
  assert.equal(isBlacklisted('參考文獻'), true);
  assert.equal(isBlacklisted('Models'), false);
});

test('reimport replaces the article subtree without duplicating or leaving stale nodes', () => {
  const prefix = 'k_wiki_en_database';
  const pool = {
    [`${prefix}_s99`]: { id: `${prefix}_s99`, label: 'Removed section' },
    k_manual: { id: 'k_manual', label: 'Manual node' },
  };
  const tree = {
    id: 'root',
    name: 'Root',
    nodeRef: 'root-node',
    children: [
      {
        id: 'parent-tree',
        name: 'Parent',
        nodeRef: 'parent-node',
        children: [],
      },
    ],
  };
  const nodes = [
    {
      id: prefix,
      label: 'Database',
      parentId: null,
      treeId: 'tree_wiki_en_database',
      treeName: 'Database',
      card: { nodeId: prefix, title: 'Database', tabs: [] },
    },
    {
      id: `${prefix}_s1`,
      label: 'Models',
      parentId: prefix,
      treeId: 'tree_wiki_en_database_s1',
      treeName: 'Models',
      card: { nodeId: `${prefix}_s1`, title: 'Models', tabs: [] },
    },
  ];

  applyImport(pool, tree, nodes, 'parent-node', prefix);
  applyImport(pool, tree, nodes, 'parent-node', prefix);

  const parent = tree.children[0];
  assert.equal(parent.children.length, 1);
  assert.equal(parent.children[0].children.length, 1);
  assert.equal(pool[`${prefix}_s99`], undefined);
  assert.equal(pool.k_manual.label, 'Manual node');
});

test('extractKeywords collects internal link targets as SuperTag candidates', () => {
  const wikitext = [
    'Lead with [[Database]] and [[ACID]] mention.',
    '== Types ==',
    '[[Relational model|relational]] and [[NoSQL]] here.',
    '[[Category:Databases]] should be skipped.',
    '[[File:db.png]] should be skipped too.',
  ].join('\n');
  const tree = buildSectionTree(splitSections(wikitext));
  const keywords = extractKeywords(tree);

  assert.ok(keywords.includes('Database'));
  assert.ok(keywords.includes('ACID'));
  assert.ok(keywords.includes('Relational model'));
  assert.ok(keywords.includes('NoSQL'));
  assert.ok(!keywords.some((k) => k.toLowerCase().startsWith('category:')));
  assert.ok(!keywords.some((k) => k.toLowerCase().startsWith('file:')));
  assert.ok(keywords.length <= 20);
});

test('extractExternalLinks collects unique external URLs with labels', () => {
  const wikitext = [
    'See [https://example.com Example Site] for details.',
    'Also [https://example.com duplicate URL] should not appear twice.',
    'And [https://other.org Other Resource].',
    'Internal [[Wiki Link]] is not an external link.',
  ].join('\n');
  const tree = buildSectionTree(splitSections(wikitext));
  const links = extractExternalLinks(tree);

  assert.equal(links.length, 2);
  assert.equal(links[0].url, 'https://example.com');
  assert.equal(links[0].label, 'Example Site');
  assert.equal(links[1].url, 'https://other.org');
  assert.equal(links[1].label, 'Other Resource');
});

test('applyImport sets content-derived keywords as SuperTags on root node', () => {
  const prefix = 'k_wiki_en_test';
  const pool = {};
  const tree = {
    id: 'root', name: 'Root', nodeRef: 'root-node',
    children: [{ id: 'parent', name: 'Parent', nodeRef: 'parent-node', children: [] }],
  };
  const nodes = [
    {
      id: prefix, label: 'Test', parentId: null,
      treeId: 'tree_wiki_en_test', treeName: 'Test',
      card: { nodeId: prefix, title: 'Test', tabs: [{ id: 'def', label: '定义', content: 'body' }] },
    },
    {
      id: `${prefix}_s1`, label: 'Section1', parentId: prefix,
      treeId: 'tree_wiki_en_test_s1', treeName: 'Section1',
      card: { nodeId: `${prefix}_s1`, title: 'Section1', tabs: [] },
    },
  ];
  const keywords = ['ACID', 'SQL', 'NoSQL'];

  applyImport(pool, tree, nodes, 'parent-node', prefix, keywords);

  assert.deepEqual(pool[prefix].tags, ['wikipedia', 'wikipedia-import', 'ACID', 'SQL', 'NoSQL']);
  assert.deepEqual(pool[`${prefix}_s1`].tags, ['wikipedia', 'wikipedia-import']);
});
