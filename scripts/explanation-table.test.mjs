import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

async function loadTableModule() {
  const source = fs.readFileSync(path.resolve('src/knowledge/explanationTable.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

function deterministicIdFactory() {
  let next = 0;
  return (prefix) => `${prefix}-${next++}`;
}

test('table helpers preserve keyed cell data while changing structure', async () => {
  const {
    addExplanationTableColumn,
    addExplanationTableRow,
    createExplanationTable,
    removeExplanationTableColumn,
    removeExplanationTableRow,
    updateExplanationTableCell,
  } = await loadTableModule();
  const createId = deterministicIdFactory();
  let table = createExplanationTable(createId);
  const firstColumnId = table.columns[0].id;
  const firstRowId = table.rows[0].id;

  table = updateExplanationTableCell(table, firstRowId, firstColumnId, 'NEW');
  table = addExplanationTableColumn(table, createId);
  assert.equal(table.columns.length, 3);
  assert.equal(table.rows[0].cells[firstColumnId], 'NEW');

  const addedColumnId = table.columns[2].id;
  table = removeExplanationTableColumn(table, addedColumnId);
  assert.equal(table.columns.length, 2);
  assert.equal(Object.hasOwn(table.rows[0].cells, addedColumnId), false);

  table = addExplanationTableRow(table, createId);
  assert.equal(table.rows.length, 3);
  table = removeExplanationTableRow(table, table.rows[2].id);
  assert.equal(table.rows.length, 2);
});

test('table helpers keep at least one row and one column', async () => {
  const {
    createExplanationTable,
    removeExplanationTableColumn,
    removeExplanationTableRow,
  } = await loadTableModule();
  const table = createExplanationTable(deterministicIdFactory());
  const oneColumnTable = removeExplanationTableColumn(table, table.columns[0].id);
  const oneRowTable = removeExplanationTableRow(table, table.rows[0].id);

  assert.equal(oneColumnTable.columns.length, 1);
  assert.equal(oneRowTable.rows.length, 1);
});
