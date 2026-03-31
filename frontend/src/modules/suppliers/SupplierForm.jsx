import { useState } from "react";
import { suppliersApi } from "../../services/api";
import { Button } from "../../components/ui/Button";

const INITIAL = {
  name: "", contact_name: "", email: "", phone: "",
  address: "", payment_terms: "net30", avg_lead_time_days: 7,
};

export default function SupplierForm({ supplier, onSuccess }) {
  const [form, setForm]     = useState(supplier ?? INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const isEdit = !!supplier?.id;
  function set(f, v) { setForm((x) => ({ ...x, [f]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Supplier name is required."); return; }
    setLoading(true);
    try {
      isEdit
        ? await suppliersApi.update(supplier.id, form)
        : await suppliersApi.create(form);
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const cls = "w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-muted mb-1.5">Supplier Name *</label>
          <input className={cls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Supplies Ltd" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Contact Name</label>
          <input className={cls} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="John Doe" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Email</label>
          <input className={cls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="vendor@example.com" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Phone</label>
          <input className={cls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Payment Terms</label>
          <select className={cls} value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)}>
            {["immediate", "net7", "net15", "net30", "net60", "net90"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Avg Lead Time (days)</label>
          <input className={cls} type="number" min="1" value={form.avg_lead_time_days}
            onChange={(e) => set("avg_lead_time_days", parseInt(e.target.value))} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-muted mb-1.5">Address</label>
          <input className={cls} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Industrial Area..." />
        </div>
      </div>

      {error && (
        <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{error}</p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEdit ? "Save Changes" : "Create Supplier"}</Button>
      </div>
    </form>
  );
}
