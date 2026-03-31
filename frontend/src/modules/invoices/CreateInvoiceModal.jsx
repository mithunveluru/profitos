import { useState, useEffect } from "react";
import { invoiceApi, suppliersApi } from "../../services/api";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Upload, FileText } from "lucide-react";

const TABS = [
  { id: "manual", label: "Manual Entry" },
  { id: "upload", label: "Upload PDF / Image" },
];

export default function CreateInvoiceModal({ open, onClose, onSuccess }) {
  const [tab, setTab]         = useState("manual");
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Manual form
  const [form, setForm] = useState({
    invoice_number: "", vendor_id: "", amount: "",
    invoice_date: "", due_date: "", notes: "",
  });

  // Upload form
  const [file, setFile]       = useState(null);
  const [uploadForm, setUploadForm] = useState({
    invoice_number: "", vendor_id: "", amount: "",
    invoice_date: "", due_date: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("http://localhost:8000/api/v1/suppliers",
      { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } })
      .then((r) => r.json()).then((d) => setSuppliers(d.data ?? [])).catch(() => {});
  }, [open]);

  function setF(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function setUF(field, value) { setUploadForm((f) => ({ ...f, [field]: value })); }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.vendor_id || !form.amount || !form.invoice_date || !form.invoice_number) {
      setError("Invoice #, vendor, amount, and date are required."); return;
    }
    setLoading(true);
    try {
      await invoiceApi.create({
        ...form,
        amount: parseFloat(form.amount),
        due_date: form.due_date || undefined,
      });
      setForm({ invoice_number: "", vendor_id: "", amount: "", invoice_date: "", due_date: "", notes: "" });
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleUploadSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) { setError("Select a file to upload."); return; }
    if (!uploadForm.vendor_id || !uploadForm.amount || !uploadForm.invoice_date || !uploadForm.invoice_number) {
      setError("All fields are required."); return;
    }
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(uploadForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
    setLoading(true);
    try {
      await invoiceApi.upload(fd);
      setFile(null);
      setUploadForm({ invoice_number: "", vendor_id: "", amount: "", invoice_date: "", due_date: "" });
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const supplierSelect = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand transition-colors">
      <option value="">Select vendor...</option>
      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );

  const inputCls = "w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand transition-colors";

  return (
    <Modal open={open} onClose={onClose} title="Add Invoice" size="lg">
      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs mb-5">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2.5 transition-colors ${tab === id ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Manual Entry */}
      {tab === "manual" && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Invoice Number *</label>
              <input className={inputCls} placeholder="INV-001" value={form.invoice_number}
                onChange={(e) => setF("invoice_number", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Vendor *</label>
              {supplierSelect(form.vendor_id, (v) => setF("vendor_id", v))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Amount (₹) *</label>
              <input className={inputCls} type="number" placeholder="0.00" value={form.amount}
                onChange={(e) => setF("amount", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Invoice Date *</label>
              <input className={inputCls} type="date" value={form.invoice_date}
                onChange={(e) => setF("invoice_date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Due Date</label>
              <input className={inputCls} type="date" value={form.due_date}
                onChange={(e) => setF("due_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Notes</label>
              <input className={inputCls} placeholder="Optional" value={form.notes}
                onChange={(e) => setF("notes", e.target.value)} />
            </div>
          </div>

          {/* Auto-approve hint */}
          {form.amount && (
            <p className={`text-xs px-3 py-2 rounded-lg border ${
              parseFloat(form.amount) < 5000
                ? "bg-success/10 border-success/20 text-success"
                : "bg-warning/10 border-warning/20 text-warning"
            }`}>
              {parseFloat(form.amount) < 5000
                ? "✅ Under ₹5,000 — will be auto-approved"
                : "⏳ Over ₹5,000 — requires manager approval"
              }
            </p>
          )}

          {error && <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Invoice</Button>
          </div>
        </form>
      )}

      {/* File Upload */}
      {tab === "upload" && (
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Drop zone */}
          <label className={`flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            file ? "border-brand/50 bg-brand/5" : "border-white/10 hover:border-white/20 bg-surface-2"
          }`}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <>
                <FileText className="w-8 h-8 text-brand-light mb-2" />
                <p className="text-sm text-white">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted mb-2" />
                <p className="text-sm text-muted">Drop PDF or image here, or click to browse</p>
                <p className="text-xs text-muted mt-1">PDF, JPG, PNG supported</p>
              </>
            )}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Invoice Number *</label>
              <input className={inputCls} placeholder="INV-001" value={uploadForm.invoice_number}
                onChange={(e) => setUF("invoice_number", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Vendor *</label>
              {supplierSelect(uploadForm.vendor_id, (v) => setUF("vendor_id", v))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Amount (₹) *</label>
              <input className={inputCls} type="number" placeholder="0.00" value={uploadForm.amount}
                onChange={(e) => setUF("amount", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Invoice Date *</label>
              <input className={inputCls} type="date" value={uploadForm.invoice_date}
                onChange={(e) => setUF("invoice_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Due Date</label>
              <input className={inputCls} type="date" value={uploadForm.due_date}
                onChange={(e) => setUF("due_date", e.target.value)} />
            </div>
          </div>

          {error && <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>
              <Upload className="w-4 h-4" /> Upload Invoice
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

