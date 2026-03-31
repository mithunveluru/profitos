import { useState, useEffect } from "react";
import { procurementApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency, formatDate } from "../../utils/formatters";
import PODetail from "./PODetail";

const STATUS_FLOW = {
  draft:    { next: "approved", label: "Approve",  color: "brand"   },
  approved: { next: "sent",     label: "Mark Sent", color: "brand"   },
  sent:     { next: "received", label: "Mark Received ✅", color: "success" },
  received: { next: null,       label: null,        color: null      },
  cancelled:{ next: null,       label: null,        color: null      },
};

const FILTER_TABS = ["all", "draft", "approved", "sent", "received", "cancelled"];

export default function POList({ onRefresh }) {
  const [pos, setPos]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [selected, setSelected] = useState(null);
  const [advancing, setAdvancing] = useState(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const data = await procurementApi.listPOs(filter !== "all" ? { status: filter } : {});
      setPos(data);
    } catch {}
    finally { setLoading(false); }
  }

  async function advanceStatus(po) {
    const flow = STATUS_FLOW[po.status];
    if (!flow?.next) return;
    setAdvancing(po.id);
    try {
      await procurementApi.updatePOStatus(po.id, { status: flow.next });
      await load();
      onRefresh?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {FILTER_TABS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors capitalize ${
              filter === f ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-white"
            }`}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {/* PO Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />)}
        </div>
      ) : pos.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted">No purchase orders found.</p>
          <p className="text-xs text-muted mt-1">Create one from the Reorder Suggestions tab.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pos.map((po) => {
            const flow = STATUS_FLOW[po.status];
            return (
              <div key={po.id}
                className="flex items-center justify-between px-5 py-4 rounded-xl bg-surface-1 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelected(po)}>
                  <div>
                    <p className="text-sm font-medium text-white">{po.po_number}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {po.supplier?.name ?? "—"} · {po.expected_date ? `Expected ${formatDate(po.expected_date)}` : "No date set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(po.total_amount)}</p>
                    <p className="text-xs text-muted">{formatDate(po.created_at)}</p>
                  </div>
                  <Badge status={po.status} label={po.status.charAt(0).toUpperCase() + po.status.slice(1)} />
                  {flow?.next && (
                    <Button
                      size="sm"
                      variant={flow.color === "success" ? "primary" : "secondary"}
                      loading={advancing === po.id}
                      onClick={() => advanceStatus(po)}
                    >
                      {flow.label}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PO Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.po_number ?? ""} size="lg">
        {selected && <PODetail poId={selected.id} />}
      </Modal>
    </>
  );
}