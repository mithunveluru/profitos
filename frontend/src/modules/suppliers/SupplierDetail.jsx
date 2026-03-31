import { useEffect, useState } from "react";
import { suppliersApi } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import RoleGuard from "../../components/ui/RoleGuard";
import SupplierForm from "./SupplierForm";
import { RefreshCw, Edit2, Trash2 } from "lucide-react";

export default function SupplierDetail({ supplierId, onUpdated }) {
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [scoring, setScoring]   = useState(false);

  useEffect(() => { load(); }, [supplierId]);

  async function load() {
    setLoading(true);
    try { const data = await suppliersApi.get(supplierId); setSupplier(data); }
    catch {} finally { setLoading(false); }
  }

  async function recalculate() {
    setScoring(true);
    try { await suppliersApi.recalculateScore(supplierId); await load(); }
    catch {} finally { setScoring(false); }
  }

  async function deactivate() {
    if (!confirm("Deactivate this supplier?")) return;
    await suppliersApi.deactivate(supplierId);
    onUpdated();
  }

  if (loading) return <p className="text-muted text-sm">Loading...</p>;
  if (!supplier) return <p className="text-danger text-sm">Failed to load supplier.</p>;

  const scoreColor = parseFloat(supplier.reliability_score) >= 8 ? "text-success"
    : parseFloat(supplier.reliability_score) >= 5 ? "text-warning" : "text-danger";

  return (
    <div className="space-y-5">

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <Badge status={supplier.is_active ? "approved" : "rejected"}
          label={supplier.is_active ? "Active" : "Inactive"} />
        <div className="flex gap-2">
          <RoleGuard managerOnly>
            <Button size="sm" variant="secondary" loading={scoring} onClick={recalculate}>
              <RefreshCw className="w-3.5 h-3.5" /> Recalc Score
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          </RoleGuard>
          <RoleGuard ownerOnly>
            <Button size="sm" variant="danger" onClick={deactivate}>
              <Trash2 className="w-3.5 h-3.5" /> Deactivate
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Contact",      value: supplier.contact_name ?? "—" },
          { label: "Email",        value: supplier.email ?? "—" },
          { label: "Phone",        value: supplier.phone ?? "—" },
          { label: "Payment Terms",value: supplier.payment_terms ?? "—" },
          { label: "Lead Time",    value: `${supplier.avg_lead_time_days} days` },
          { label: "Address",      value: supplier.address ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-2 rounded-lg p-3">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-sm text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Reliability Score */}
      <div className="bg-surface-2 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white">Reliability Score</p>
          <p className={`text-2xl font-bold ${scoreColor}`}>{supplier.reliability_score}/10</p>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            parseFloat(supplier.reliability_score) >= 8 ? "bg-success" :
            parseFloat(supplier.reliability_score) >= 5 ? "bg-warning" : "bg-danger"
          }`} style={{ width: `${parseFloat(supplier.reliability_score) * 10}%` }} />
        </div>
        <p className="text-xs text-muted mt-2">Based on PO fulfillment rate. Click Recalc to update.</p>
      </div>

      {/* PO Stats */}
      {supplier.stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total POs",       value: supplier.stats.total_pos },
            { label: "Fulfilled",        value: supplier.stats.received_pos },
            { label: "Fulfillment Rate", value: `${supplier.stats.fulfillment_rate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-2 rounded-lg p-3 text-center">
              <p className="text-xs text-muted mb-1">{label}</p>
              <p className="text-base font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Supplier">
        <SupplierForm supplier={supplier}
          onSuccess={() => { setShowEdit(false); load(); onUpdated(); }} />
      </Modal>
    </div>
  );
}
