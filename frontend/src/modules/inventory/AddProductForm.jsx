import { useState } from "react";
import { inventoryApi } from "../../services/api";
import { Button } from "../../components/ui/Button";

const INITIAL = {
  sku: "", name: "", description: "",
  unit: "pcs", cost_price: "", selling_price: "",
  reorder_point: 10, lead_time_days: 7,
};

export default function AddProductForm({ onSuccess }) {
  const [form, setForm]     = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.sku || !form.name || !form.cost_price || !form.selling_price) {
      setError("SKU, name, cost price and selling price are required.");
      return;
    }
    setLoading(true);
    try {
      await inventoryApi.createProduct({
        ...form,
        cost_price: parseFloat(form.cost_price),
        selling_price: parseFloat(form.selling_price),
        reorder_point: parseInt(form.reorder_point),
        lead_time_days: parseInt(form.lead_time_days),
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="SKU *" value={form.sku} onChange={(v) => set("sku", v)} placeholder="e.g. PROD-001" />
        <Field label="Unit" value={form.unit} onChange={(v) => set("unit", v)} placeholder="pcs / kg / ltr" />
      </div>

      <Field label="Product Name *" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Widget A" />
      <Field label="Description" value={form.description} onChange={(v) => set("description", v)} placeholder="Optional description" />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cost Price (₹) *" type="number" value={form.cost_price} onChange={(v) => set("cost_price", v)} placeholder="0.00" />
        <Field label="Selling Price (₹) *" type="number" value={form.selling_price} onChange={(v) => set("selling_price", v)} placeholder="0.00" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Reorder Point" type="number" value={form.reorder_point} onChange={(v) => set("reorder_point", v)} />
        <Field label="Lead Time (days)" type="number" value={form.lead_time_days} onChange={(v) => set("lead_time_days", v)} />
      </div>

      {error && (
        <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>Create Product</Button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
      />
    </div>
  );
}