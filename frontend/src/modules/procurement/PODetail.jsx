import { useEffect, useState } from "react";
import { procurementApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function PODetail({ poId }) {
  const [po, setPo]           = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    procurementApi.getPO(poId).then(setPo).catch(() => {}).finally(() => setLoading(false));
  }, [poId]);

  if (loading) return <p className="text-muted text-sm">Loading...</p>;
  if (!po) return <p className="text-danger text-sm">Failed to load PO.</p>;

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Supplier</p>
          <p className="text-white font-medium">{po.supplier?.name ?? "—"}</p>
        </div>
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Status</p>
          <Badge status={po.status} label={po.status} />
        </div>
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Total Value</p>
          <p className="text-white font-semibold">{formatCurrency(po.total_amount)}</p>
        </div>
        {po.expected_date && (
          <div className="bg-surface-2 rounded-lg p-3">
            <p className="text-xs text-muted mb-1">Expected Date</p>
            <p className="text-white">{formatDate(po.expected_date)}</p>
          </div>
        )}
        {po.received_date && (
          <div className="bg-surface-2 rounded-lg p-3">
            <p className="text-xs text-muted mb-1">Received Date</p>
            <p className="text-success">{formatDate(po.received_date)}</p>
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-3">Line Items</p>
        <div className="space-y-2">
          {po.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
              <div>
                <p className="text-sm text-white">{item.product_name}</p>
                <p className="text-xs text-muted">{item.product_sku}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted">Ordered</p>
                  <p className="text-white">{item.quantity_ordered}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Received</p>
                  <p className={item.quantity_received > 0 ? "text-success" : "text-muted"}>
                    {item.quantity_received}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Unit Price</p>
                  <p className="text-white">{formatCurrency(item.unit_price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Line Total</p>
                  <p className="text-white font-medium">{formatCurrency(item.line_total)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}