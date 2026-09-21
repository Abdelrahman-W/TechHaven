import React, { useState, useEffect } from 'react';

const DataTable = ({
  columns,
  data,
  onEdit,
  onDelete,
  loading,
  emptyMessage = 'لا توجد بيانات',
  onSelectionChange
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  const handleSelectAll = (e) => {
    if (e.target.checked && data) {
      const allIds = new Set(data.map((r, i) => r.id ?? i));
      setSelectedIds(allIds);
      onSelectionChange?.(data);
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (row, index) => {
    const rowId = row.id ?? index;
    const next = new Set(selectedIds);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    setSelectedIds(next);
    onSelectionChange?.(data.filter((r, i) => next.has(r.id ?? i)));
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>جاري التحميل...</div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{emptyMessage}</div>;
  }

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '12px', width: '40px' }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                aria-label="تحديد الكل"
              />
            </th>
            {columns.map((col, i) => (
              <th key={i} style={{ padding: '12px', color: 'var(--text-secondary)' }}>{col.label}</th>
            ))}
            {(onEdit || onDelete) && <th style={{ padding: '12px' }}>الإجراءات</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const rowId = row.id ?? rowIndex;
            const isSelected = selectedIds.has(rowId);
            return (
              <tr
                key={rowIndex}
                style={{
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: isSelected ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <td style={{ padding: '12px' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectRow(row, rowIndex)}
                    aria-label={`تحديد الصف ${rowIndex + 1}`}
                  />
                </td>
                {columns.map((col, colIndex) => (
                  <td key={colIndex} style={{ padding: '12px' }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                    {onEdit && <button className="btn" onClick={() => onEdit(row)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تعديل</button>}
                    {onDelete && <button className="btn" onClick={() => onDelete(row)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>حذف</button>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
