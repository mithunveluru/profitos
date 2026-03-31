import { useState, useEffect } from "react";
import { invoiceApi } from "../../services/api";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency, formatDate } from "../../utils/formatters";
import InvoiceDetail from "./InvoiceDetail";

const STATUS_FILTERS = ["all", "pending", "approved", "duplicate_review", "rejected", "paid"];

const COLUMNS = [
  { key: "invoice_number", label: "Invoice #" },
  { key: "vendor_name",    label: "Vendor"    },
  { key: "invoice_date",   label: "Date",   render: (v) => formatDate(v) },
  { key: "due_date",       label: "Due",    render: (v) => v ? formatDate(v) : "—" },
  { key: "amount",         label: "Amount", render: (v) => formatCurrency(v) },
  {
    key: "is_duplicate", label: "",
    render: (v) => v ? (
      <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
        ⚠ Possible Duplicate
      </span>
    ) : null,
  },
  {
    key: "status", label: "Status",
    render: (v) => <Badge status={v} label={v.replace("_", " ")} />,
  },
];

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const data = await invoiceApi.list(filter !== "all" ? { status: filter } : {});
      setInvoices(data);
    } catch {}
    finally { setLoading(false); }
  }

  const columnsWithAction = [
    ...COLUMNS,
    {
      key: "actions", label: "",
      render: (_, row) => (
        <button onClick={() => setSelected(row)}
          className="text-xs text-brand-light hover:text-brand px-2 py-1 rounded hover:bg-brand/10 transition-colors">
          View
        </button>
      ),
    },
  ];

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
              filter === f ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-white"
            }`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total",    value: invoices.length,                                       color: "text-white"   },
          { label: "Pending",  value: invoices.filter((i) => i.status === "pending").length,  color: "text-warning" },
          { label: "Approved", value: invoices.filter((i) => i.status === "approved").length, color: "text-success" },
          { label: "Duplicates", value: invoices.filter((i) => i.is_duplicate).length,        color: "text-danger"  },
        ].map(({ label, value, color }) => (
          <Card key={label} className="py-4">
            <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table columns={columnsWithAction} data={invoices} loading={loading}
          emptyMessage="No invoices found. Upload or create one." />
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={`Invoice — ${selected?.invoice_number}`} size="lg">
        {selected && (
          <InvoiceDetail
            invoice={selected}
            onAction={() => { setSelected(null); load(); }}
          />
        )}
      </Modal>
    </>
  );
}
