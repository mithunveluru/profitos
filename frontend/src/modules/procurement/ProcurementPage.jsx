import { useState } from "react";
import ReorderSuggestions from "./ReorderSuggestions";
import POList from "./POList";
import CreatePOModal from "./CreatePOModal";
import { Button } from "../../components/ui/Button";
import { Plus, Lightbulb, ClipboardList } from "lucide-react";

const TABS = [
  { id: "pos",         label: "Purchase Orders",    icon: ClipboardList },
  { id: "suggestions", label: "Reorder Suggestions", icon: Lightbulb },
];

export default function ProcurementPage() {
  const [tab,         setTab]         = useState("pos");
  const [showCreate,  setShowCreate]  = useState(false);
  const [refresh,     setRefresh]     = useState(0);
  const [prefill,     setPrefill]     = useState([]);

  function handleCreateFromSuggestions(items) {
    setPrefill(items);
    setShowCreate(true);
  }

  function handleClose() {
    setShowCreate(false);
    setPrefill([]);
  }

  function onCreated() {
    setShowCreate(false);
    setPrefill([]);
    setTab("pos");
    setRefresh((r) => r + 1);
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
                tab === id ? "bg-brand text-white" : "bg-surface-1 text-muted hover:text-white"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Purchase Order
        </Button>
      </div>

      {/* Content */}
      {tab === "pos"
        ? <POList key={refresh} onRefresh={() => setRefresh((r) => r + 1)} />
        : <ReorderSuggestions onCreatePO={handleCreateFromSuggestions} />
      }

      {/* Create PO Modal */}
      <CreatePOModal
        open={showCreate}
        onClose={handleClose}
        onSuccess={onCreated}
        prefillItems={prefill}
      />
    </div>
  );
}