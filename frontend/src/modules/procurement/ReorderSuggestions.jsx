import { useEffect, useState } from "react";
import { procurementApi } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { formatCurrency } from "../../utils/formatters";
import { ShoppingCart } from "lucide-react";

export default function ReorderSuggestions({ onCreatePO }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(new Set());

  useEffect(() => {
    procurementApi.getReorderSuggestions()
      .then(setSuggestions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(suggestions.map((s) => s.product_id)));
  }

  function handleCreatePO() {
    const items = suggestions.filter((s) => selected.has(s.product_id));
    onCreatePO(items);   // ✅ pass selected items — modal will prefill them
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />)}
    </div>
  );

  if (!suggestions.length) return (
    <Card className="text-center py-12">
      <p className="text-success text-sm font-medium">✅ All products are adequately stocked.</p>
      <p className="text-xs text-muted mt-1">No reorder suggestions at this time.</p>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          <span className="text-warning font-medium">{suggestions.length}</span> products need restocking
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={selectAll}>Select All</Button>
          <Button size="sm" onClick={handleCreatePO} disabled={selected.size === 0}>
            <ShoppingCart className="w-4 h-4" />
            Create PO ({selected.size})
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map((s) => {
          const isSelected = selected.has(s.product_id);
          return (
            <div
              key={s.product_id}
              onClick={() => toggleSelect(s.product_id)}
              className={`flex items-center justify-between px-5 py-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-brand/10 border-brand/30"
                  : "bg-surface-1 border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected ? "bg-brand border-brand" : "border-white/20"
                }`}>
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-muted">{s.sku}</p>
                </div>
              </div>

              <div className="flex items-center gap-8 text-sm">
                <div className="text-center">
                  <p className="text-xs text-muted">Current</p>
                  <p className="text-danger font-semibold">{s.current_stock} {s.unit}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted">Deficit</p>
                  <p className="text-warning font-semibold">-{s.deficit} {s.unit}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted">Daily Avg</p>
                  <p className="text-white">{s.daily_avg_sales}/day</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted">Suggested Qty</p>
                  <p className="text-success font-semibold">{s.suggested_qty} {s.unit}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted">Est. Cost</p>
                  <p className="text-white font-medium">{formatCurrency(s.estimated_cost)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-brand/10 border border-brand/20">
          <p className="text-sm text-brand-light">
            {selected.size} product{selected.size > 1 ? "s" : ""} selected —
            Est. total: <strong>
              {formatCurrency(
                suggestions
                  .filter((s) => selected.has(s.product_id))
                  .reduce((sum, s) => sum + s.estimated_cost, 0)
              )}
            </strong>
          </p>
          <Button size="sm" onClick={handleCreatePO}>
            <ShoppingCart className="w-4 h-4" /> Create Purchase Order
          </Button>
        </div>
      )}
    </div>
  );
}