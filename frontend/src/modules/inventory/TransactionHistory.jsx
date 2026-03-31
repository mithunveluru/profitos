import { useState, useEffect } from "react";
import { inventoryApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../utils/formatters";

const TYPE_CONFIG = {
  grn:        { label: "GRN",        color: "approved" },
  sale:       { label: "Sale",       color: "pending"  },
  adjustment: { label: "Adjustment", color: "draft"    },
  return:     { label: "Return",     color: "received" },
};

export default function TransactionHistory({ productId }) {
  const [txns, setTxns]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.listTransactions(productId ? { product_id: productId } : {})
      .then(setTxns).catch(() => {}).finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <p className="text-muted text-sm">Loading...</p>;
  if (!txns.length) return <p className="text-muted text-sm">No transactions yet.</p>;

  return (
    <div className="space-y-2">
      {txns.map((t) => {
        const cfg = TYPE_CONFIG[t.type] ?? { label: t.type, color: "draft" };
        const isPositive = t.quantity > 0;
        return (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
            <div className="flex items-center gap-3">
              <Badge status={cfg.color} label={cfg.label} />
              <div>
                <p className="text-sm text-white">{t.notes || t.reference_id || "—"}</p>
                <p className="text-xs text-muted">{formatDate(t.created_at)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${isPositive ? "text-success" : "text-danger"}`}>
                {isPositive ? "+" : ""}{t.quantity}
              </p>
              <p className="text-xs text-muted">{formatCurrency(t.unit_cost)} / unit</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}