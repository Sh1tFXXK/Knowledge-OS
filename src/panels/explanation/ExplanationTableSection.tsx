import { Plus, Table2, Trash2 } from 'lucide-react';
import type { ExplanationTable } from '../../types';
import {
  addExplanationTableColumn,
  addExplanationTableRow,
  createExplanationTable,
  removeExplanationTableColumn,
  removeExplanationTableRow,
  updateExplanationTableCell,
  updateExplanationTableColumn,
  updateExplanationTableTitle,
} from '../../knowledge/explanationTable';

interface ExplanationTableSectionProps {
  table: ExplanationTable | undefined;
  editing: boolean;
  onChange: (table: ExplanationTable | undefined) => void;
}

function ExplanationTablePreview({ table }: { table: ExplanationTable }) {
  return (
    <figure className="explanation-table-figure">
      {table.title?.trim() && <figcaption>{table.title}</figcaption>}
      <div className="explanation-table-scroll">
        <table className="explanation-table">
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th key={column.id} scope="col">
                  {column.label || '未命名列'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.id}>
                {table.columns.map((column) => (
                  <td key={column.id}>{row.cells[column.id] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function ExplanationTableEditor({
  table,
  onChange,
}: {
  table: ExplanationTable;
  onChange: (table: ExplanationTable | undefined) => void;
}) {
  return (
    <section className="explanation-table-editor" aria-label="表格数据编辑器">
      <header className="explanation-table-editor-header">
        <div className="explanation-table-editor-heading">
          <Table2 size={14} aria-hidden="true" />
          <span>表格数据</span>
        </div>
        <div className="explanation-table-editor-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onChange(addExplanationTableColumn(table))}
          >
            <Plus size={13} aria-hidden="true" />
            <span>添加列</span>
          </button>
          <button
            type="button"
            className="btn btn-sm explanation-table-delete"
            title="删除整个表格"
            aria-label="删除整个表格"
            onClick={() => onChange(undefined)}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      </header>

      <input
        className="input explanation-table-title-input"
        value={table.title ?? ''}
        placeholder="表格标题（可选）"
        aria-label="表格标题"
        onChange={(event) => onChange(updateExplanationTableTitle(table, event.target.value))}
      />

      <div className="explanation-table-scroll">
        <table className="explanation-table explanation-table--editing">
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th key={column.id} scope="col">
                  <div className="explanation-table-column-editor">
                    <input
                      value={column.label}
                      aria-label="列标题"
                      onChange={(event) =>
                        onChange(updateExplanationTableColumn(table, column.id, event.target.value))
                      }
                    />
                    <button
                      type="button"
                      title="删除列"
                      aria-label={`删除列 ${column.label || '未命名列'}`}
                      disabled={table.columns.length <= 1}
                      onClick={() => onChange(removeExplanationTableColumn(table, column.id))}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="explanation-table-row-action" aria-label="行操作" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                {table.columns.map((column) => (
                  <td key={column.id}>
                    <textarea
                      value={row.cells[column.id] ?? ''}
                      rows={2}
                      aria-label={`第 ${rowIndex + 1} 行，${column.label || '未命名列'}`}
                      onChange={(event) =>
                        onChange(
                          updateExplanationTableCell(
                            table,
                            row.id,
                            column.id,
                            event.target.value,
                          ),
                        )
                      }
                    />
                  </td>
                ))}
                <td className="explanation-table-row-action">
                  <button
                    type="button"
                    title="删除行"
                    aria-label={`删除第 ${rowIndex + 1} 行`}
                    disabled={table.rows.length <= 1}
                    onClick={() => onChange(removeExplanationTableRow(table, row.id))}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="btn btn-sm explanation-table-add-row"
        onClick={() => onChange(addExplanationTableRow(table))}
      >
        <Plus size={13} aria-hidden="true" />
        <span>添加行</span>
      </button>
    </section>
  );
}

export default function ExplanationTableSection({
  table,
  editing,
  onChange,
}: ExplanationTableSectionProps) {
  if (!editing) {
    return table ? <ExplanationTablePreview table={table} /> : null;
  }

  if (table) {
    return <ExplanationTableEditor table={table} onChange={onChange} />;
  }

  return (
    <button
      type="button"
      className="explanation-table-create"
      onClick={() => onChange(createExplanationTable())}
    >
      <Table2 size={15} aria-hidden="true" />
      <span>添加表格数据</span>
    </button>
  );
}
