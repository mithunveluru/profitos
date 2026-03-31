import { useState, useEffect, useCallback } from "react";
import { Plus, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { inventoryApi } from "../../services/api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency } from "../../utils/formatters";
import AddProductForm from "./AddProductForm";
import AdjustStockForm from "./AdjustStockForm";

const COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Product Name" },
  {
    key: "current_stock", label: "Stock",
    render: (val, row) => (
      <span className={val <= row.reorder_point ? "text-danger font-semibold" : "text-gray-300"}>
        {val} <span className="text-muted text-xs">{row.unit}</span>
      </span>
    ),
  },
  { key: "reorder_point", label: "Reorder At",
    render: (v, row) => <span className="text-muted">{v} {row.unit}</span>
  },
  { key: "cost_price",    label: "Cost",    render: (v) => formatCurrency(v) },
  { key: "selling_price", label: "Selling", render: (v) => formatCurrency(v) },
  {
    key: "status", label: "Status",
    render: (_, row) => row.current_stock <= row.reorder_point
      ? <Badge status="overdue"  label="Low Stock" />
      : <Badge status="approved" label="In Stock"  />,
  },
  {
    key: "actions", label: "",
    render: (_, row) => <RowActions row={row} />,
  },
];

function RowActions({ row }) {
  const [showAdjust, setShowAdjust] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowAdjust(true)}
        className="text-xs text-brand-light hover:text-brand px-2 py-1 rounded hover:bg-brand/10 transition-colors"
      >
        Adjust Stock
      </button>
      <Modal open={showAdjust} onClose={() => setShowAdjust(false)} title={`Adjust Stock — ${row.name}`}>
        <AdjustStockForm product={row} onSuccess={() => { setShowAdjust(false); window.dispatchEvent(new Event("inventory:refresh")); }} />
      </Modal>
    </>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [alerts, setAlerts]     = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [filter, setFilter]     = useState("all"); // all | low_stock

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getProducts({
        search: search || undefined,
        low_stock: filter === "low_stock" ? true : undefined,
      });
      setProducts(data);
    } catch {}
    finally { setLoading(false); }
  }, [search, filter]);

  const loadAlerts = useCallback(async () => {
    try { const data = await inventoryApi.getLowStockAlerts(); setAlerts(data); } catch {}
  }, []);

  useEffect(() => { load(); loadAlerts(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Cross-component refresh event
  useEffect(() => {
    const handler = () => { load(); loadAlerts(); };
    window.addEventListener("inventory:refresh", handler);
    return () => window.removeEventListener("inventory:refresh", handler);
  }, [load, loadAlerts]);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Low Stock Alert Banner */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span><strong>{alerts.length} product{alerts.length > 1 ? "s" : ""}</strong> below reorder point</span>
          </div>
          <button onClick={() => setFilter(f => f === "low_stock" ? "all" : "low_stock")}
            className="text-xs underline underline-offset-2 hover:no-underline">
            {filter === "low_stock" ? "Show all" : "View only"}
          </button>
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full pl-9 pr-4 py-2 bg-surface-1 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
            {["all", "low_stock"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 transition-colors ${filter === f ? "bg-brand text-white" : "bg-surface-1 text-muted hover:text-white"}`}>
                {f === "all" ? "All Products" : "Low Stock"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { load(); loadAlerts(); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Total Products</p>
          <p className="mt-1 text-2xl font-semibold text-white">{products.length}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Low Stock</p>
          <p className={`mt-1 text-2xl font-semibold ${alerts.length > 0 ? "text-danger" : "text-success"}`}>
            {alerts.length}
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Inventory Value</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {formatCurrency(products.reduce((sum, p) => sum + parseFloat(p.cost_price) * p.current_stock, 0))}
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <Table columns={COLUMNS} data={products} loading={loading} emptyMessage="No products found. Add your first product." />
      </Card>

      {/* Add Product Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Product" size="lg">
        <AddProductForm onSuccess={() => { setShowAdd(false); load(); loadAlerts(); }} />
      </Modal>
    </div>
  );
}