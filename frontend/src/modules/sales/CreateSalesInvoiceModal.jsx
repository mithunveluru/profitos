import { useState, useEffect } from "react";
import { salesApi, inventoryApi } from "../../services/api";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { formatCurrency } from "../../utils/formatters";
import { Plus, Trash2 } from "lucide-react";

const EMPTY_LINE = () => ({ product_id: "", description: "", quantity: 1, unit_price: "" });

export default function CreateSalesInvoiceModal({ open, onClose, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [form, setForm]           = useState({
    customer_id: "", invoice_number: "", invoice_date: "", due_date: "", notes: "",
    items: [EMPTY_LINE()],
  });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([salesApi.listCustomers(), inventoryApi.getProducts()])
      .then(([c, p]) => { setCustomers(c); setProducts(p); })
      .catch(() => {});
  }, [open]);

  function setF(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function setItem(i, field, value) {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "product_id") {
      const p = products.find((p) => p.id === value);
      if (p) {
        items[i].description = p.name;
        items[i].unit_price  = p.selling_price;
      }
    }
    setForm((f) => ({ ...f, items }));
  }

  function addLine()    { setForm((f) => ({ ...f, items: [...f.items, EMPTY_LINE()] })); }
  function removeLine(i){ setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }

  const total = form.items.reduce((s, i) =>
    s + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.items.some((i) => !i.description || !i.unit_price || !i.quantity)) {
      setError("All line items need a description, quantity, and price."); return;
    }
    setLoading(true);
    try {
      await salesApi.createInvoice({
        ...form,
        customer_id:    form.customer_id    || undefined,
        invoice_number: form.invoice_number || undefined,
        invoice_date:   form.invoice_date   || undefined,
        due_date:       form.due_date       || undefined,
        items: form.items.map((i) => ({
          product_id:  i.product_id || undefined,
          description: i.description,
          quantity:    parseInt(i.quantity),
          unit_price:  parseFloat(i.unit_price),
        })),
      });
      setForm({ customer_id: "", invoice_number: "", invoice_date: "", due_date: "", notes: "", items: [EMPTY_LINE()] });
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const inputCls = "w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand transition-colors";

  return (
    <Modal open={open} onClose={onClose} title="New Sales Invoice" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Customer + Invoice # */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Customer</label>
            <select value={form.customer_id} onChange={(e) => setF("customer_id", e.target.value)}
              className={inputCls}>
              <option value="">Walk-in / Cash Sale</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Invoice # (auto if blank)</label>
            <input className={inputCls} placeholder="SINV-202603-XXXX"
              value={form.invoice_number} onChange={(e) => setF("invoice_number", e.target.value)} />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Invoice Date</label>
            <input className={inputCls} type="date" value={form.invoice_date}
              onChange={(e) => setF("invoice_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Due Date</label>
            <input className={inputCls} type="date" value={form.due_date}
              onChange={(e) => setF("due_date", e.target.value)} />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted uppercase tracking-wider">Line Items</p>
            <button type="button" onClick={addLine}
              className="text-xs text-brand-light hover:text-brand flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>

          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-3 bg-surface-2 rounded-lg border border-white/5">
                {/* Product picker */}
                <div className="col-span-3">
                  <select value={item.product_id} onChange={(e) => setItem(i, "product_id", e.target.value)}
                    className="w-full px-2 py-2 bg-surface-0 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand">
                    <option value="">No product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {/* Description */}
                <div className="col-span-4">
                  <input value={item.description} onChange={(e) => setItem(i, "description", e.target.value)}
                    placeholder="Description *"
                    className="w-full px-2 py-2 bg-surface-0 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand" />
                </div>
                {/* Qty */}
                <div className="col-span-1">
                  <input type="number" min="1" value={item.quantity}
                    onChange={(e) => setItem(i, "quantity", e.target.value)}
                    className="w-full px-2 py-2 bg-surface-0 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand" />
                </div>
                {/* Unit price */}
                <div className="col-span-2">
                  <input type="number" value={item.unit_price}
                    onChange={(e) => setItem(i, "unit_price", e.target.value)}
                    placeholder="Price"
                    className="w-full px-2 py-2 bg-surface-0 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand" />
                </div>
                {/* Line total */}
                <div className="col-span-1 flex items-center justify-end text-xs text-white font-medium">
                  {formatCurrency((parseFloat(item.unit_price)||0) * (parseInt(item.quantity)||0))}
                </div>
                {/* Remove */}
                <div className="col-span-1 flex items-center justify-center">
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)}
                      className="text-muted hover:text-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
          <p className="text-sm text-muted">Invoice Total</p>
          <p className="text-xl font-bold text-white">{formatCurrency(total)}</p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-muted mb-1.5">Notes</label>
          <input className={inputCls} placeholder="Optional payment terms, references..."
            value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
        </div>

        {error && (
          <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Sales Invoice</Button>
        </div>
      </form>
    </Modal>
  );
}
