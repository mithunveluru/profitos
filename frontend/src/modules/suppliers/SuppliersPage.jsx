import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Star, RefreshCw, TrendingUp, Search } from "lucide-react";
import { suppliersApi } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import RoleGuard from "../../components/ui/RoleGuard";
import SupplierForm from "./SupplierForm";
import SupplierDetail from "./SupplierDetail";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [selected, setSelected]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await suppliersApi.list(); setSuppliers(data); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  function reliabilityColor(score) {
    const n = parseFloat(score);
    if (n >= 8) return "text-success";
    if (n >= 5) return "text-warning";
    return "text-danger";
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers..."
            className="w-full pl-9 pr-4 py-2 bg-surface-1 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand transition-colors" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <RoleGuard managerOnly>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Supplier
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Total Suppliers</p>
          <p className="mt-1 text-2xl font-semibold text-white">{suppliers.length}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Avg Reliability</p>
          <p className={`mt-1 text-2xl font-semibold ${reliabilityColor(
            suppliers.length
              ? suppliers.reduce((s, x) => s + parseFloat(x.reliability_score), 0) / suppliers.length
              : 0
          )}`}>
            {suppliers.length
              ? (suppliers.reduce((s, x) => s + parseFloat(x.reliability_score), 0) / suppliers.length).toFixed(1)
              : "—"
            } / 10
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Avg Lead Time</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {suppliers.length
              ? Math.round(suppliers.reduce((s, x) => s + x.avg_lead_time_days, 0) / suppliers.length)
              : "—"
            } days
          </p>
        </Card>
      </div>

      {/* Supplier Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted">No suppliers found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <motion.div key={s.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(s)}
              className="group bg-surface-1 rounded-xl border border-white/5 hover:border-brand/30 p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-brand/5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-brand-light transition-colors">
                    {s.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{s.contact_name ?? "No contact"}</p>
                </div>
                <Badge status={s.is_active ? "approved" : "rejected"} label={s.is_active ? "Active" : "Inactive"} />
              </div>

              {/* Reliability Score */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    parseFloat(s.reliability_score) >= 8 ? "bg-success" :
                    parseFloat(s.reliability_score) >= 5 ? "bg-warning" : "bg-danger"
                  }`} style={{ width: `${parseFloat(s.reliability_score) * 10}%` }} />
                </div>
                <span className={`text-xs font-medium ${reliabilityColor(s.reliability_score)}`}>
                  {s.reliability_score}/10
                </span>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                <span>📧 {s.email ?? "—"}</span>
                <span>📞 {s.phone ?? "—"}</span>
                <span>⏱ {s.avg_lead_time_days}d lead time</span>
                <span>💳 {s.payment_terms ?? "—"}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier">
        <SupplierForm onSuccess={() => { setShowAdd(false); load(); }} />
      </Modal>

      {/* Supplier Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={selected?.name ?? ""} size="lg">
        {selected && (
          <SupplierDetail supplierId={selected.id}
            onUpdated={() => { setSelected(null); load(); }} />
        )}
      </Modal>
    </div>
  );
}
