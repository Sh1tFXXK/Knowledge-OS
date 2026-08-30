import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureMysqlFunctionalTheoryReferences } from './mysql-functional-theory-references.mjs';

function node(id, label, viewDimensions = undefined) {
  return {
    id,
    label,
    card: { nodeId: id, title: label, tabs: [] },
    viewDimensions,
  };
}

test('theory references are added to MySQL topics without moving existing tree entries', () => {
  const tree = {
    id: 'universe',
    name: 'Universe',
    nodeRef: 'universe',
    children: [{
      id: 'demo_mysql',
      name: 'MySQL',
      nodeRef: 'mysql',
      children: [
        {
          id: 'mysql_topic_architecture',
          name: 'Architecture',
          nodeRef: 'mysql_topic_architecture',
          children: [],
        },
        {
          id: 'mysql_topic_sql_objects',
          name: 'SQL',
          nodeRef: 'mysql_topic_sql_objects',
          children: [{ id: 'existing-query', name: 'Query', nodeRef: 'query' }],
        },
        {
          id: 'mysql_topic_connectors_api',
          name: 'Connectors',
          nodeRef: 'mysql_topic_connectors_api',
          children: [],
        },
      ],
    }],
  };
  const nodePool = {
    universe: node('universe', 'Universe'),
    mysql: node('mysql', 'MySQL', [{
      id: 'mysql_glossary_structure',
      sections: [
        {
          id: 'mysql_glossary_structure_architecture',
          atoms: [{ nodeId: 'process' }],
        },
        {
          id: 'mysql_glossary_structure_sql_objects',
          atoms: [{ nodeId: 'query' }],
        },
      ],
    }]),
    mysql_topic_architecture: node('mysql_topic_architecture', 'Architecture'),
    mysql_topic_sql_objects: node('mysql_topic_sql_objects', 'SQL'),
    mysql_topic_connectors_api: node('mysql_topic_connectors_api', 'Connectors'),
    process: node('process', 'Process'),
    query: node('query', 'Query'),
    k_dict_qttpkbhf: node('k_dict_qttpkbhf', 'Python'),
    unknown: node('unknown', 'Unknown'),
  };
  const theoryItems = ['process', 'query', 'k_dict_qttpkbhf', 'unknown']
    .map((nodeId) => ({ nodeId, node: nodePool[nodeId] }));

  const first = ensureMysqlFunctionalTheoryReferences({ tree, nodePool, theoryItems });
  assert.equal(first.existingReferences, 1);
  assert.equal(first.referencesAdded, 2);
  assert.deepEqual(first.unmappedNodeIds, ['unknown']);
  assert.equal(tree.children[0].children[0].children[0].nodeRef, 'process');
  assert.equal(tree.children[0].children[1].children[0].id, 'existing-query');
  assert.equal(tree.children[0].children[2].children[0].nodeRef, 'k_dict_qttpkbhf');

  const second = ensureMysqlFunctionalTheoryReferences({ tree, nodePool, theoryItems });
  assert.equal(second.existingReferences, 3);
  assert.equal(second.referencesAdded, 0);
  assert.deepEqual(second.unmappedNodeIds, ['unknown']);
});
