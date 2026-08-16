import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const pool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));
const governance = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-governance.json'), 'utf8'));
const mysqlView = pool['n_8s66vwo1'].viewDimensions.find((view) => view.id === 'mysql_glossary_structure');
const ids = new Set(mysqlView.sections.flatMap((section) => section.atoms.map((atom) => atom.nodeId)));
const redirectPairs = [
  ['mysql_glossary_java_uspy11', 'k_1782746457581_30q8ao'],
  ['mysql_glossary_servlet_12jp4v', 'k_1784340526295_skm8iw'],
  ['mysql_glossary_tomcat_10qwey', 'k_1786353277269_msn0ma9ap'],
];
const legacyContextPairs = [...redirectPairs, ['k_dict_qttpkbhf', 'k_dict_qttpkbhf']];

test('旧版 MySQL 知识结构的主题成员与合并正文均被保全', () => {
  assert.equal(mysqlView.sections.length, 15);
  assert.ok(ids.has('k_dict_qttpkbhf'), 'Python 仍须在连接器、API 与客户端主题可见');
  assert.ok(ids.has('k_1782746457581_30q8ao'), 'Java 应保留为规范实体的主题入口');
  assert.ok(ids.has('k_1784340526295_skm8iw'), 'Servlet 应保留为规范实体的主题入口');
  assert.ok(ids.has('k_1786353277269_msn0ma9ap'), 'Tomcat 应保留为规范实体的主题入口');
  for (const [legacyId, canonicalId] of redirectPairs) {
    assert.ok(governance.redirects.some((entry) => entry.id === `redirect:${legacyId}` && entry.from === legacyId && entry.to === canonicalId));
  }
  for (const [legacyId, canonicalId] of legacyContextPairs) {
    assert.ok(pool[canonicalId].card.tabs.some((tab) => tab.id === `legacy-mysql-glossary-${legacyId}`));
  }
});
