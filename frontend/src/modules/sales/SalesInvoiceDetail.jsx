import { useEffect, useState } from "react";
import { salesApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { DollarSign } from "lucide-react";

const PAYMENT_METHODS = ["bank_transfer", "cash", "cheque", "upi", "card"];

export default function SalesInvoiceDetail({ invoiceId, onPaymentRecorded }) {
  const [invoice, setInvoice]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm]         = useState({ amount: "", method: "bank_transfer", reference: "", notes: "" });
  const [paying, setPaying]           = useState(false);
  const [payError, setPayError]       = useState("");

  useEffect(() => {
    salesApi.getInvoice(invoiceId)
      .then(setInvoice).catch(() => {})
      .finally(() => setLoading(false));
  }, [invoiceId]);

  async function handlePay(e) {
    e.preventDefault();
    setPayError("");
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) {
      setPayError("Enter a valid amount."); return;
    }
    setPaying(true);
    try {
      await salesApi.recordPayment(invoiceId, {
        amount:    parseFloat(payForm.amount),
        method:    payForm.method,
        reference: payForm.reference || undefined,
        notes:     payForm.notes || undefined,
      });
      onPaymentRecorded();
    } catch (e) { setPayError(e.message); }
    finally { setPaying(false); }
  }

  if (loading) return <p className="text-muted text-sm">Loading...</p>;
  if (!invoice) return <p className="text-danger text-sm">Failed to load invoice.</p>;

  const outstanding = parseFloat(invoice.outstanding ?? (invoice.total_amount - invoice.amount_paid));
  const canPay = !["paid", "written_off"].includes(invoice.payment_status);

  return (
    <div className="space-y-5">

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",       value: formatCurrency(invoice.total_amount), color: "text-white"   },
          { label: "Paid",        value: formatCurrency(invoice.amount_paid),  color: "text-success" },
          { label: "Outstanding", value: formatCurrency(outstanding),           color: outstanding > 0 ? "text-warning" : "text-success" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-2 rounded-lg p-3">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className={`text-base font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Invoice info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { label: "Customer",     value: invoice.customer_name ?? "—" },
          { label: "Invoice Date", value: formatDate(invoice.invoice_date) },
          { label: "Due Date",     value: invoice.due_date ? formatDate(invoice.due_date) : "—" },
          { label: "Notes",        value: invoice.notes ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-2 rounded-lg p-3">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-white">{value}</p>
          </div>
        ))}
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Status</p>
          <Badge status={invoice.payment_status} label={invoice.payment_status} />
        </div>
      </div>

      {/* Line items */}
      {invoice.line_items?.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Line Items</p>
          <div className="space-y-1">
            {invoice.line_items.map((li) => (
              <div key={li.id}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface-2 border border-white/5">
                <div>
                  <p className="text-sm text-white">{li.description}</p>
                  {li.product_name && <p className="text-xs text-muted">{li.product_name}</p>}
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted">{li.quantity} × {formatCurrency(li.unit_price)}</span>
                  <span className="text-white font-medium">{formatCurrency(li.line_total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      {invoice.payments?.length > 0 && (
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Payments Received</p>
          <div className="space-y-1">
            {invoice.payments.map((p) => (
              <div key={p.id}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface-2 border border-white/5">
                <div>
                  <p className="text-sm text-white capitalize">{p.method.replace("_", " ")}</p>
                  <p className="text-xs text-muted">
                    {formatDate(p.payment_date)}{p.reference ? ` · Ref: ${p.reference}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-success">+{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Payment */}
      {canPay && (
        <div className="border-t border-white/5 pt-4">
          {!showPayForm ? (
            <Button onClick={() => setShowPayForm(true)} className="w-full justify-center">
              <DollarSign className="w-4 h-4" /> Record Payment
            </Button>
          ) : (
            <form onSubmit={handlePay} className="space-y-3">
              <p className="text-sm font-medium text-white">Record Payment</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1.5">
                    Amount (₹) · Outstanding: {formatCurrency(outstanding)}
                  </label>
                  <input type="number" max={outstanding} value={payForm.amount}
                    onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder={String(outstanding)}
                    className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Method</label>
                  <select value={payForm.method}
                    onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand">
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m.replace("_", " ").toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Reference</label>
                  <input value={payForm.reference}
                    onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="UTR / cheque number"
                    className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Notes</label>
                  <input value={payForm.notes}
                    onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand" />
                </div>
              </div>

              {payError && (
                <p className="text-danger text-sm px-3 py-2 rounded-lg bg-danger/10 border border-danger/20">{payError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => setShowPayForm(false)}>Cancel</Button>
                <Button type="submit" loading={paying}>
                  <DollarSign className="w-4 h-4" /> Confirm Payment
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
