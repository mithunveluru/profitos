import { useState } from "react";
import SalesInvoiceList from "./SalesInvoiceList";
import ARDashboard from "./ARDashboard";
import CreateSalesInvoiceModal from "./CreateSalesInvoiceModal";
import { Button } from "../../components/ui/Button";
import { Plus, BarChart2, FileText } from "lucide-react";

const TABS = [
  { id: "ar",       label: "AR Dashboard",  icon: BarChart2 },
  { id: "invoices", label: "Sales Invoices", icon: FileText  },
];

export default function SalesPage() {
  const [tab, setTab]           = useState("ar");
  const [showCreate, setShowCreate] = useState(false);
  const [refresh, setRefresh]   = useState(0);

  function onCreated() {
    setShowCreate(false);
    setRefresh((r) => r + 1);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
                tab === id ? "bg-brand text-white" : "bg-surface-1 text-muted hover:text-white"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Sales Invoice
        </Button>
      </div>

      {tab === "ar"
        ? <ARDashboard key={refresh} />
        : <SalesInvoiceList key={refresh} onRefresh={() => setRefresh((r) => r + 1)} />
      }

      <CreateSalesInvoiceModal
        open={showCreate} onClose={() => setShowCreate(false)} onSuccess={onCreated}
      />
    </div>
  );
}
