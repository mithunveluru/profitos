import { useState } from "react";
import { invoiceApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { CheckCircle, XCircle, FileText, AlertTriangle } from "lucide-react";

export default function InvoiceDetail({ invoice, onAction }) {
  const [loading, setLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  async function approve() {
    setLoading("approve");
    try { await invoiceApi.approve(invoice.id); onAction(); }
    catch (e) { alert(e.message); }
    finally { setLoading(null); }
  }

  async function reject() {
    if (!rejectReason.trim()) { setShowRejectInput(true); return; }
    setLoading("reject");
    try { await invoiceApi.reject(invoice.id, rejectReason); onAction(); }
    catch (e) { alert(e.message); }
    finally { setLoading(null); }
  }

  const canAct = ["pending", "duplicate_review"].includes(invoice.status);

  return (
    <div className="space-y-5">

      {/* Duplicate warning */}
      {invoice.is_duplicate && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Possible Duplicate Invoice</p>
            <p className="text-xs mt-0.5 text-danger/80">
              Same vendor, amount, and date within {7} days of invoice ID: {invoice.duplicate_of_id?.slice(0, 8)}...
            </p>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Invoice Number", value: invoice.invoice_number },
          { label: "Vendor",         value: invoice.vendor_name ?? "—" },
          { label: "Amount",         value: formatCurrency(invoice.amount) },
          { label: "Invoice Date",   value: formatDate(invoice.invoice_date) },
          { label: "Due Date",       value: invoice.due_date ? formatDate(invoice.due_date) : "—" },
          { label: "PO Matched",     value: invoice.po_id ? `PO-${invoice.po_id.slice(0,8)}...` : "None" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-2 rounded-lg p-3">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-sm text-white font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3">
        <Badge status={invoice.status} label={invoice.status.replace("_", " ")} />
        {invoice.approved_by && (
          <span className="text-xs text-muted">Approved by user {invoice.approved_by.slice(0, 8)}...</span>
        )}
      </div>

      {/* File attachment */}
      {invoice.file_url && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
          <FileText className="w-4 h-4 text-brand-light" />
          <span className="text-sm text-white flex-1">Attached document</span>
          <a href={invoice.file_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-brand-light hover:text-brand transition-colors">
            View →
          </a>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
          <p className="text-xs text-muted mb-1">Notes</p>
          <p className="text-sm text-white">{invoice.notes}</p>
        </div>
      )}

      {/* Reject reason input */}
      {showRejectInput && (
        <div>
          <label className="block text-xs text-muted mb-1.5">Rejection Reason *</label>
          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            className="w-full px-3 py-2 bg-surface-2 border border-danger/30 rounded-lg text-sm text-white focus:outline-none focus:border-danger transition-colors" />
        </div>
      )}

      {/* Action buttons */}
      {canAct && (
        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
          <Button variant="danger" loading={loading === "reject"} onClick={reject}>
            <XCircle className="w-4 h-4" />
            {showRejectInput ? "Confirm Reject" : "Reject"}
          </Button>
          <Button loading={loading === "approve"} onClick={approve}>
            <CheckCircle className="w-4 h-4" /> Approve
          </Button>
        </div>
      )}
    </div>
  );
}
