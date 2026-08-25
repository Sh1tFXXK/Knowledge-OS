import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));
const governance = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-governance.json'), 'utf8'));

function rootsOf(value) {
  return Array.isArray(value) ? value : [value];
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function treeRefs() {
  return new Set(rootsOf(tree).flatMap(collectTreeNodes).map((node) => node.nodeRef).filter(Boolean));
}

const redirectPairs = [
  ['mysql_glossary_java_uspy11', 'k_1782746457581_30q8ao'],
  ['mysql_glossary_servlet_12jp4v', 'k_1784340526295_skm8iw'],
  ['mysql_glossary_tomcat_10qwey', 'k_1786353277269_msn0ma9ap'],
];
const legacyContextPairs = [...redirectPairs, ['k_dict_qttpkbhf', 'k_dict_qttpkbhf']];

test('旧版 MySQL 来源正文和合并 redirect 被保全', () => {
  for (const [legacyId, canonicalId] of redirectPairs) {
    assert.ok(governance.redirects.some((entry) => (
      entry.id === `redirect:${legacyId}`
      && entry.from === legacyId
      && entry.to === canonicalId
    )));
  }

  for (const [legacyId, canonicalId] of legacyContextPairs) {
    assert.ok(
      pool[canonicalId].card.tabs.some((tab) => tab.id === `legacy-mysql-glossary-${legacyId}`),
      `${canonicalId} must preserve legacy MySQL source tab ${legacyId}`,
    );
  }
});

test('旧版来源对应的规范实体仍可通过导航树抵达', () => {
  const refs = treeRefs();
  for (const [, canonicalId] of redirectPairs) {
    assert.ok(refs.has(canonicalId), `${canonicalId} must remain reachable in the tree`);
  }
  assert.ok(refs.has('k_dict_qttpkbhf'), 'Python 仍须在导航树中可见');
});
