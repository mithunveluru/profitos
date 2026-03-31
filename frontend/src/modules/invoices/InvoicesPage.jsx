import { useState } from "react";
import InvoiceList from "./InvoiceList";
import ApprovalInbox from "./ApprovalInbox";
import CreateInvoiceModal from "./CreateInvoiceModal";
import { Button } from "../../components/ui/Button";
import { Plus, Inbox, List } from "lucide-react";

const TABS = [
  { id: "list",  label: "All Invoices", icon: List  },
  { id: "inbox", label: "Approval Inbox", icon: Inbox },
];

export default function InvoicesPage() {
  const [tab, setTab]           = useState("list");
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
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Add Invoice
          </Button>
        </div>
      </div>

      {tab === "list"
        ? <InvoiceList key={refresh} />
        : <ApprovalInbox key={refresh} onAction={() => setRefresh((r) => r + 1)} />
      }

      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={onCreated}
      />
    </div>
  );
}
