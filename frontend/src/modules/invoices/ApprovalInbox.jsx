import { useState, useEffect } from "react";
import { invoiceApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import InvoiceDetail from "./InvoiceDetail";

export default function ApprovalInbox({ onAction }) {
  const [inbox, setInbox]     = useState({ pending_approval: [], duplicate_review: [], total_pending: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const data = await invoiceApi.getInbox(); setInbox(data); }
    catch {} finally { setLoading(false); }
  }

  function handleAction() {
    setSelected(null);
    load();
    onAction?.();
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />)}
    </div>
  );

  const hasItems = inbox.pending_approval.length > 0 || inbox.duplicate_review.length > 0;

  if (!hasItems) return (
    <Card className="text-center py-12">
      <p className="text-success font-medium">✅ Inbox is clear</p>
      <p className="text-xs text-muted mt-1">No invoices pending approval or review.</p>
    </Card>
  );

  return (
    <div className="space-y-6">

      {/* Pending Approval Section */}
      {inbox.pending_approval.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-medium text-white">
              Pending Approval
              <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs">
                {inbox.pending_approval.length}
              </span>
            </h3>
          </div>
          {inbox.pending_approval.map((inv) => (
            <InboxCard key={inv.id} inv={inv} onView={() => setSelected(inv)}
              onApprove={async () => {
                await invoiceApi.approve(inv.id);
                handleAction();
              }}
            />
          ))}
        </div>
      )}

      {/* Duplicate Review Section */}
      {inbox.duplicate_review.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <h3 className="text-sm font-medium text-white">
              Duplicate Review
              <span className="ml-2 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs">
                {inbox.duplicate_review.length}
              </span>
            </h3>
          </div>
          <p className="text-xs text-muted">
            These invoices match another invoice within 7 days. Approve only if intentional.
          </p>
          {inbox.duplicate_review.map((inv) => (
            <InboxCard key={inv.id} inv={inv} isDuplicate onView={() => setSelected(inv)}
              onApprove={async () => {
                await invoiceApi.approve(inv.id);
                handleAction();
              }}
            />
          ))}
        </div>
      )}

      {/* Invoice detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={`Invoice — ${selected?.invoice_number}`} size="lg">
        {selected && <InvoiceDetail invoice={selected} onAction={handleAction} />}
      </Modal>
    </div>
  );
}

function InboxCard({ inv, isDuplicate, onView, onApprove }) {
  const [approving, setApproving] = useState(false);

  async function handleApprove(e) {
    e.stopPropagation();
    setApproving(true);
    try { await onApprove(); } catch (e) { alert(e.message); }
    finally { setApproving(false); }
  }

  return (
    <div
      onClick={onView}
      className={`flex items-center justify-between px-5 py-4 rounded-xl border cursor-pointer transition-all ${
        isDuplicate
          ? "bg-danger/5 border-danger/20 hover:border-danger/40"
          : "bg-surface-1 border-white/5 hover:border-white/15"
      }`}
    >
      <div className="flex items-center gap-4">
        {isDuplicate && <AlertTriangle className="w-4 h-4 text-danger shrink-0" />}
        <div>
          <p className="text-sm font-medium text-white">{inv.invoice_number}</p>
          <p className="text-xs text-muted mt-0.5">
            {inv.vendor_name ?? "Unknown vendor"} · {inv.invoice_date ? formatDate(inv.invoice_date) : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <p className={`text-base font-semibold ${isDuplicate ? "text-danger" : "text-white"}`}>
          {formatCurrency(inv.amount)}
        </p>
        <Button size="sm" loading={approving} onClick={handleApprove}
          variant={isDuplicate ? "secondary" : "primary"}>
          <CheckCircle className="w-3.5 h-3.5" /> Approve
        </Button>
      </div>
    </div>
  );
}
