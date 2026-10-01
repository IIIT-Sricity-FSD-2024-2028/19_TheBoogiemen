import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import { EmptyState } from './StatusViews';

/**
 * Table with search, column sort, pagination and CSV export.
 *
 * columns: [{ key, header, render?(row), value?(row), sortable?, align?, csv?(row) }]
 *           A column keyed 'action' or 'actions' stays pinned to the right edge
 *           while a wide table scrolls sideways, so its buttons are always reachable.
 *   value(row) is what sorting, searching and CSV use (defaults to row[key]).
 * rows:     array of records (already loaded; loading/error states are the caller's)
 * rowKey:   (row) => stable id
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  csvName,
  emptyTitle = 'No records',
  emptyMessage,
  toolbar,
  caption,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);

  const valueOf = (col, row) => (col.value ? col.value(row) : row[col.key]);
  const cellClass = (col) => [col.align === 'right' ? 'sp-num' : '', /^actions?$/.test(col.key) ? 'sp-col-pinned' : ''].filter(Boolean).join(' ') || undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const v = valueOf(col, row);
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, columns]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = valueOf(col, a);
      const vb = valueOf(col, b);
      if (va === vb) return 0;
      if (va === null || va === undefined || va === '') return 1;
      if (vb === null || vb === undefined || vb === '') return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  const exportCsv = () => {
    const escape = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map((c) => escape(c.header)).join(',');
    const lines = sorted.map((row) => columns.map((c) => escape(c.csv ? c.csv(row) : valueOf(c, row))).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${csvName || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div>
      <div className="sp-table-toolbar">
        <input
          type="search"
          className="sp-input"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        {toolbar}
        <div style={{ flex: 1 }} />
        {csvName && (
          <button type="button" className="sp-btn is-secondary is-small" onClick={exportCsv} disabled={sorted.length === 0}>
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="sp-card"><EmptyState title={emptyTitle} message={emptyMessage} /></div>
      ) : sorted.length === 0 ? (
        <div className="sp-card"><EmptyState title="No matches" message="Try a different search." /></div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            {caption && <caption className="sp-visually-hidden">{caption}</caption>}
            <thead>
              <tr>
                {columns.map((col) => {
                  const active = sort.key === col.key;
                  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={cellClass(col)}
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {col.sortable === false ? (
                        col.header
                      ) : (
                        <button type="button" className="sp-sort-btn" onClick={() => toggleSort(col.key)}>
                          {col.header} <Icon size={12} aria-hidden="true" />
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className={cellClass(col)}>
                      {col.render ? col.render(row) : valueOf(col, row) ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="sp-table-footer">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
            {sorted.length !== rows.length ? ` (filtered from ${rows.length})` : ''}
          </span>
          {pageCount > 1 && (
            <div className="sp-btn-row">
              <button type="button" className="sp-btn is-secondary is-small" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </button>
              <span style={{ alignSelf: 'center' }}>Page {currentPage} of {pageCount}</span>
              <button type="button" className="sp-btn is-secondary is-small" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
