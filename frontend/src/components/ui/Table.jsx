import { clsx } from "clsx";

export function Table({ columns, data, loading, emptyMessage = "No records found" }) {
  if (loading) return <TableSkeleton cols={columns.length} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 bg-surface-2">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-muted">{emptyMessage}</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-white/5 hover:bg-surface-2 transition-colors duration-100">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-300">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton({ cols }) {
  return (
    <div className="rounded-xl border border-white/5 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-white/5">
          {[...Array(cols)].map((_, j) => (
            <div key={j} className="h-4 bg-surface-3 rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}