import { useState } from "react";
import { inventoryApi } from "../../services/api";
import { Button } from "../../components/ui/Button";

const TYPES = [
  { value: "grn",        label: "GRN — Goods Received",   sign: +1 },
  { value: "sale",       label: "Sale — Stock Out",        sign: -1 },
  { value: "adjustment", label: "Adjustment — Manual Fix", sign: 0  },
  { value: "return",     label: "Return — Customer Return",sign: +1 },
];

export default function AdjustStockForm({ product, onSuccess }) {
  const [type, setType]       = useState("grn");
  const [quantity, setQty]    = useState("");
  const [unitCost, setUnitCost] = useState(product.cost_price);
  const [notes, setNotes]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const selectedType = TYPES.find((t) => t.value === type);

  // For adjustment, let user pick direction
  const isAdjustment = type === "adjustment";
  const [adjDirection, setAdjDirection] = useState("add"); // add | remove

  function computeQuantity() {
    const q = parseInt(quantity);
    if (isNaN(q) || q <= 0) return null;
    if (isAdjustment) return adjDirection === "add" ? q : -q;
    return selectedType.sign >= 0 ? q : -q;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const finalQty = computeQuantity();
    if (!finalQty) { setError("Enter a valid quantity greater than 0."); return; }

    setLoading(true);
    try {
      await inventoryApi.recordTransaction({
        product_id: product.id,
        type,
        quantity: finalQty,
        unit_cost: parseFloat(unitCost) || parseFloat(product.cost_price),
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const newStock = quantity
    ? Math.max(0, product.current_stock + (computeQuantity() ?? 0))
    : product.current_stock;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Current stock badge */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2 border border-white/5">
        <div>
          <p className="text-xs text-muted">Current Stock</p>
          <p className="text-xl font-semibold text-white">{product.current_stock} <span className="text-sm text-muted">{product.unit}</span></p>
        </div>
        {quantity && (
          <div className="text-right">
            <p className="text-xs text-muted">After Adjustment</p>
            <p className={`text-xl font-semibold ${newStock <= product.reorder_point ? "text-danger" : "text-success"}`}>
              {newStock} <span className="text-sm text-muted">{product.unit}</span>
            </p>
          </div>
        )}
      </div>

      {/* Transaction type */}
      <div>
        <label className="block text-xs text-muted mb-1.5">Transaction Type</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`px-3 py-2.5 rounded-lg text-xs text-left transition-all border ${
                type === t.value
                  ? "bg-brand/10 border-brand/40 text-brand-light"
                  : "bg-surface-2 border-white/5 text-muted hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustment direction (only for adjustment type) */}
      {isAdjustment && (
        <div>
          <label className="block text-xs text-muted mb-1.5">Direction</label>
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
            {["add", "remove"].map((d) => (
              <button key={d} type="button" onClick={() => setAdjDirection(d)}
                className={`flex-1 py-2 transition-colors ${adjDirection === d ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-white"}`}>
                {d === "add" ? "➕ Add Stock" : "➖ Remove Stock"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Quantity *</label>
          <input type="number" min="1" value={quantity} onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand transition-colors" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Unit Cost (₹)</label>
          <input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)}
            className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand transition-colors" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. PO-202603-A1B2C3 or manual recount"
          className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand transition-colors" />
      </div>

      {error && (
        <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{error}</p>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>Confirm Transaction</Button>
      </div>
    </form>
  );
}