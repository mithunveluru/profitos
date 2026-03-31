import { useState, useEffect } from "react";
import { procurementApi, inventoryApi, suppliersApi } from "../../services/api";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { formatCurrency } from "../../utils/formatters";
import { Plus, Trash2 } from "lucide-react";

const EMPTY_LINE = () => ({ product_id: "", quantity_ordered: 1, unit_price: "" });

export default function CreatePOModal({ open, onClose, onSuccess, prefillItems = [] }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [form,      setForm]      = useState({ supplier_id: "", expected_date: "", items: [EMPTY_LINE()] });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");

    // Load suppliers + products
    Promise.all([
      suppliersApi.list(),          // ✅ fixed — no more hardcoded fetch
      inventoryApi.getProducts(),
    ])
      .then(([s, p]) => {
        setSuppliers(s);
        setProducts(p);
      })
      .catch(() => {});

    // Prefill from reorder suggestions if provided
    if (prefillItems.length > 0) {
      setForm({
        supplier_id:   "",
        expected_date: "",
        items: prefillItems.map((s) => ({
          product_id:       s.product_id,
          quantity_ordered: s.suggested_qty,
          unit_price:       s.suggested_qty > 0
                              ? parseFloat((s.estimated_cost / s.suggested_qty).toFixed(2))
                              : "",
        })),
      });
    } else {
      setForm({ supplier_id: "", expected_date: "", items: [EMPTY_LINE()] });
    }
  }, [open]);

  function setField(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function setItem(index, field, value) {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) items[index].unit_price = product.cost_price;
    }
    setForm((f) => ({ ...f, items }));
  }

  function addLine()     { setForm((f) => ({ ...f, items: [...f.items, EMPTY_LINE()] })); }
  function removeLine(i) { setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }

  const total = form.items.reduce((sum, item) => {
    return sum + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity_ordered) || 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.supplier_id) { setError("Select a supplier."); return; }
    if (form.items.some((i) => !i.product_id || !i.unit_price)) {
      setError("All line items need a product and unit price."); return;
    }
    setLoading(true);
    try {
      await procurementApi.createPO({
        supplier_id:   form.supplier_id,
        expected_date: form.expected_date || undefined,
        items: form.items.map((i) => ({
          product_id:       i.product_id,
          quantity_ordered: parseInt(i.quantity_ordered),
          unit_price:       parseFloat(i.unit_price),
        })),
      });
      setForm({ supplier_id: "", expected_date: "", items: [EMPTY_LINE()] });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Purchase Order" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Supplier + Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Supplier *</label>
            <select value={form.supplier_id} onChange={(e) => setField("supplier_id", e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand transition-colors">
              <option value="">Select supplier...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Expected Date</label>
            <input type="date" value={form.expected_date}
              onChange={(e) => setField("expected_date", e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand transition-colors" />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted uppercase tracking-wider">
              Line Items {prefillItems.length > 0 && <span className="text-brand-light normal-case">(pre-filled from suggestions)</span>}
            </p>
            <button type="button" onClick={addLine}
              className="text-xs text-brand-light hover:text-brand flex items-center gap-1 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-white/5">
                <select value={item.product_id} onChange={(e) => setItem(i, "product_id", e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface-0 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand">
                  <option value="">Select product...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <div className="w-28">
                  <input type="number" min="1" value={item.quantity_ordered}
                    onChange={(e) => setItem(i, "quantity_ordered", e.target.value)}
                    placeholder="Qty"
                    className="w-full px-3 py-2 bg-surface-0 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand" />
                </div>
                <div className="w-36">
                  <input type="number" value={item.unit_price}
                    onChange={(e) => setItem(i, "unit_price", e.target.value)}
                    placeholder="Unit price"
                    className="w-full px-3 py-2 bg-surface-0 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand" />
                </div>
                <p className="text-sm text-white w-24 text-right font-medium">
                  {formatCurrency((parseFloat(item.unit_price) || 0) * (parseInt(item.quantity_ordered) || 0))}
                </p>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)}
                    className="text-muted hover:text-danger transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
          <p className="text-sm text-muted">Total Order Value</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(total)}</p>
        </div>

        {error && (
          <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Purchase Order</Button>
        </div>
      </form>
    </Modal>
  );
}