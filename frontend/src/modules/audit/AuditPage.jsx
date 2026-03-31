import { useState, useEffect, useCallback } from "react";
import { auditApi } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { formatDate } from "../../utils/formatters";
import { Search, Shield } from "lucide-react";

const ACTION_BADGE = {
  "STOCK_GRN":        "bg-success/10 text-success",
  "STOCK_SALE":       "bg-amber-400/10 text-amber-400",
  "STOCK_ADJUSTMENT": "bg-orange-400/10 text-orange-400",
  "invoice.approved": "bg-success/10 text-success",
  "invoice.rejected": "bg-danger/10 text-danger",
  "invoice.paid":     "bg-success/10 text-success",
};

export default function AuditPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditApi.list(
        debouncedSearch ? { action: debouncedSearch } : {}
      );
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-light" />
          <h1 className="text-base font-semibold text-white">Audit Log</h1>
          <span className="text-xs text-muted">
            — immutable record of all system actions
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by action..."
            className="pl-9 pr-4 py-2 bg-surface-1 border border-white/10 rounded-lg
              text-sm text-white placeholder:text-muted focus:outline-none
              focus:border-brand transition-colors w-64"
          />
        </div>
      </div>

      {/* Log timeline */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="text-muted text-sm">No audit logs found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">

            {/* Header row */}
            <div className="grid grid-cols-12 px-5 py-2.5 bg-surface-2">
              {["Timestamp", "Action", "Entity", "User", "Details"].map((h) => (
                <p key={h}
                  className="text-xs font-medium text-muted uppercase tracking-wider
                    first:col-span-2 [&:nth-child(2)]:col-span-3
                    [&:nth-child(3)]:col-span-3 [&:nth-child(4)]:col-span-2
                    last:col-span-2">
                  {h}
                </p>
              ))}
            </div>

            {logs.map((log) => (
              <div key={log.id}
                className="grid grid-cols-12 items-center px-5 py-3.5
                  hover:bg-white/[0.02] transition-colors">

                {/* Timestamp */}
                <p className="text-xs text-muted col-span-2">
                  {formatDate(log.created_at)}
                </p>

                {/* Action badge */}
                <div className="col-span-3">
                  <span className={`inline-block text-xs font-mono px-2 py-0.5
                    rounded-full ${ACTION_BADGE[log.action] ?? "bg-white/5 text-white"}`}>
                    {log.action}
                  </span>
                </div>

                {/* ✅ Entity name — was log.entity_id?.slice(0,16) */}
                <div className="col-span-3">
                  <p className="text-xs text-white truncate">
                    {log.entity_name ?? "—"}
                  </p>
                  {log.entity_sku && log.entity_sku !== "—" && (
                    <p className="text-xs text-muted font-mono">{log.entity_sku}</p>
                  )}
                </div>

                {/* ✅ User name — was log.user_id?.slice(0,8) */}
                <div className="col-span-2">
                  <p className="text-xs text-white truncate">
                    {log.performed_by ?? "Unknown"}
                  </p>
                  {log.user_email && (
                    <p className="text-xs text-muted truncate">{log.user_email}</p>
                  )}
                </div>

                {/* Details */}
                <div className="col-span-2">
                  {log.meta ? (
                    <details className="cursor-pointer">
                      <summary className="text-xs text-brand-light hover:text-brand
                        list-none select-none">
                        {log.meta.stock_before !== undefined
                          ? `${log.meta.stock_before} → ${log.meta.stock_after} units`
                          : "View meta →"}
                      </summary>
                      <pre className="mt-2 text-xs text-muted bg-surface-2 rounded
                        p-2 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-xs text-muted/40">—</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}