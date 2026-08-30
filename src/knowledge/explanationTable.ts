import type {
  ExplanationTable,
  ExplanationTableColumn,
  ExplanationTableRow,
} from '../types';

type CreateId = (prefix: string) => string;

const defaultCreateId: CreateId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function createColumn(index: number, createId: CreateId): ExplanationTableColumn {
  return {
    id: createId('column'),
    label: `列 ${index + 1}`,
  };
}

function createRow(columns: readonly ExplanationTableColumn[], createId: CreateId): ExplanationTableRow {
  return {
    id: createId('row'),
    cells: Object.fromEntries(columns.map((column) => [column.id, ''])),
  };
}

export function createExplanationTable(createId: CreateId = defaultCreateId): ExplanationTable {
  const columns = [createColumn(0, createId), createColumn(1, createId)];
  return {
    id: createId('table'),
    title: '',
    columns,
    rows: [createRow(columns, createId), createRow(columns, createId)],
  };
}

export function updateExplanationTableTitle(
  table: ExplanationTable,
  title: string,
): ExplanationTable {
  return { ...table, title };
}

export function updateExplanationTableColumn(
  table: ExplanationTable,
  columnId: string,
  label: string,
): ExplanationTable {
  return {
    ...table,
    columns: table.columns.map((column) =>
      column.id === columnId ? { ...column, label } : column,
    ),
  };
}

export function addExplanationTableColumn(
  table: ExplanationTable,
  createId: CreateId = defaultCreateId,
): ExplanationTable {
  const column = createColumn(table.columns.length, createId);
  return {
    ...table,
    columns: [...table.columns, column],
    rows: table.rows.map((row) => ({
      ...row,
      cells: { ...row.cells, [column.id]: '' },
    })),
  };
}

export function removeExplanationTableColumn(
  table: ExplanationTable,
  columnId: string,
): ExplanationTable {
  if (table.columns.length <= 1 || !table.columns.some((column) => column.id === columnId)) {
    return table;
  }

  return {
    ...table,
    columns: table.columns.filter((column) => column.id !== columnId),
    rows: table.rows.map((row) => {
      const { [columnId]: _removed, ...cells } = row.cells;
      return { ...row, cells };
    }),
  };
}

export function addExplanationTableRow(
  table: ExplanationTable,
  createId: CreateId = defaultCreateId,
): ExplanationTable {
  return {
    ...table,
    rows: [...table.rows, createRow(table.columns, createId)],
  };
}

export function removeExplanationTableRow(
  table: ExplanationTable,
  rowId: string,
): ExplanationTable {
  if (table.rows.length <= 1 || !table.rows.some((row) => row.id === rowId)) {
    return table;
  }
  return { ...table, rows: table.rows.filter((row) => row.id !== rowId) };
}

export function updateExplanationTableCell(
  table: ExplanationTable,
  rowId: string,
  columnId: string,
  value: string,
): ExplanationTable {
  if (!table.columns.some((column) => column.id === columnId)) return table;
  return {
    ...table,
    rows: table.rows.map((row) =>
      row.id === rowId
        ? { ...row, cells: { ...row.cells, [columnId]: value } }
        : row,
    ),
  };
}
