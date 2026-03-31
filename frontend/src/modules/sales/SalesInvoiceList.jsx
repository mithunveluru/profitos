import { useState, useEffect } from "react";
import { salesApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency, formatDate } from "../../utils/formatters";
import SalesInvoiceDetail from "./SalesInvoiceDetail";

const STATUS_FILTERS = ["all", "unpaid", "partial", "paid", "overdue"];

const COLUMNS = [
  { key: "invoice_number", label: "Invoice #" },
  { key: "customer_name",  label: "Customer", render: (v) => v ?? "—" },
  { key: "invoice_date",   label: "Date",     render: (v) => formatDate(v) },
  { key: "due_date",       label: "Due",      render: (v) => v ? formatDate(v) : "—" },
  { key: "total_amount",   label: "Total",    render: (v) => formatCurrency(v) },
  { key: "amount_paid",    label: "Paid",     render: (v) => formatCurrency(v) },
  { key: "outstanding",    label: "Outstanding",
    render: (v) => <span className={parseFloat(v) > 0 ? "text-warning font-medium" : "text-success"}>{formatCurrency(v)}</span>
  },
  { key: "payment_status", label: "Status",
    render: (v) => <Badge status={v} label={v} />,
  },
];

export default function SalesInvoiceList({ onRefresh }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const data = await salesApi.listInvoices(filter !== "all" ? { status: filter } : {});
      setInvoices(data);
    } catch {}
    finally { setLoading(false); }
  }

  const cols = [
    ...COLUMNS,
    {
      key: "actions", label: "",
      render: (_, row) => (
        <button onClick={() => setSelected(row)}
          className="text-xs text-brand-light hover:text-brand px-2 py-1 rounded hover:bg-brand/10 transition-colors">
          View / Pay
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
              filter === f ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-white"
            }`}>
            {f}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table columns={cols} data={invoices} loading={loading}
          emptyMessage="No sales invoices found." />
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={`Sales Invoice — ${selected?.invoice_number}`} size="lg">
        {selected && (
          <SalesInvoiceDetail invoiceId={selected.id}
            onPaymentRecorded={() => { setSelected(null); load(); onRefresh?.(); }} />
        )}
      </Modal>
    </>
  );
}

