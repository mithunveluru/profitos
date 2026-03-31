import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import {
  DollarSign, Package, TrendingUp, AlertCircle,
  TrendingDown, RefreshCw, AlertTriangle,
} from "lucide-react";
import { dashboardApi } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatCurrency } from "../../utils/formatters";

// ── Animated Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, loading, trend }) {
  const colors = {
    success: { bg: "bg-success/10", border: "border-success/20", icon: "text-success", text: "text-success" },
    brand:   { bg: "bg-brand/10",   border: "border-brand/20",   icon: "text-brand-light", text: "text-white" },
    warning: { bg: "bg-warning/10", border: "border-warning/20", icon: "text-warning", text: "text-warning" },
    danger:  { bg: "bg-danger/10",  border: "border-danger/20",  icon: "text-danger",  text: "text-danger"  },
  }[color] ?? { bg: "bg-white/5", border: "border-white/10", icon: "text-muted", text: "text-white" };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-28 rounded-lg bg-white/5 animate-pulse" />
      ) : (
        <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </motion.div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-0 border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs space-y-1">
      <p className="text-muted font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted capitalize">{p.name}</span>
          </span>
          <span className="font-semibold text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [summary,  setSummary]  = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [kpis,     setKpis]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, k] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getCashflow(),
        dashboardApi.getKpis(),
      ]);
      setSummary(s);
      setCashflow(c);
      setKpis(k);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const cashflowChartData = cashflow ? [
    { name: "0–30 days",  ar: cashflow.projection["0_30"].ar_inflow,  ap: cashflow.projection["0_30"].ap_outflow,  net: cashflow.projection["0_30"].net  },
    { name: "31–60 days", ar: cashflow.projection["31_60"].ar_inflow, ap: cashflow.projection["31_60"].ap_outflow, net: cashflow.projection["31_60"].net },
    { name: "61–90 days", ar: cashflow.projection["61_90"].ar_inflow, ap: cashflow.projection["61_90"].ap_outflow, net: cashflow.projection["61_90"].net },
  ] : [];

  const kpiBarData = kpis ? [
    { name: "Revenue",  value: kpis.revenue_30d,      color: "#10B981" },
    { name: "Spend",    value: kpis.spend_30d,         color: "#EF4444" },
    { name: "Margin",   value: kpis.gross_margin_30d,  color: "#6366F1" },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Overview</h1>
          {lastUpdated && <p className="text-xs text-muted mt-0.5">Last updated {lastUpdated}</p>}
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-white/5 text-xs text-muted hover:text-white transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Cash Risk Banner */}
      {cashflow?.has_cash_risk && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Cash flow risk — net position <strong>{formatCurrency(cashflow.total_net_90d)}</strong> over next 90 days.
            AP outflows exceed AR inflows.
          </span>
        </motion.div>
      )}

      {/* Low Stock Banner */}
      {summary?.low_stock_count > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{summary.low_stock_count} product{summary.low_stock_count > 1 ? "s" : ""}</strong> below reorder point.
          </span>
          <a href="/inventory" className="ml-auto text-xs underline underline-offset-2 hover:no-underline">
            View inventory →
          </a>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Cash Position"    loading={loading}
          value={formatCurrency(summary?.cash_position)}
          sub={summary?.cash_position >= 0 ? "AR minus AP" : "Net negative — monitor closely"}
          icon={DollarSign}
          color={summary?.cash_position >= 0 ? "success" : "danger"}
        />
        <StatCard label="Inventory Value"  loading={loading}
          value={formatCurrency(summary?.inventory_value)}
          sub={summary?.low_stock_count > 0 ? `${summary.low_stock_count} items low` : "All stocked"}
          icon={Package}
          color="brand"
        />
        <StatCard label="AR Outstanding"   loading={loading}
          value={formatCurrency(summary?.ar_outstanding)}
          sub="Expected inflows"
          icon={TrendingUp}
          color="warning"
        />
        <StatCard label="AP Due"           loading={loading}
          value={formatCurrency(summary?.ap_due)}
          sub="Approved invoices"
          icon={TrendingDown}
          color="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Cashflow Chart — takes 2 cols */}
        <div className="xl:col-span-2 bg-surface-1 rounded-xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-white">90-Day Cash Flow Projection</h2>
            {cashflow && (
              <span className={`text-xs px-2 py-1 rounded-full border ${
                cashflow.has_cash_risk
                  ? "bg-danger/10 border-danger/20 text-danger"
                  : "bg-success/10 border-success/20 text-success"
              }`}>
                Net {formatCurrency(cashflow.total_net_90d)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mb-5">AR inflows vs AP outflows by period</p>
          {loading ? (
            <div className="h-52 rounded-xl bg-white/5 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cashflowChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#6B7280" }} />
                <Line type="monotone" dataKey="ar"  name="AR Inflow"   stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: "#10B981" }} />
                <Line type="monotone" dataKey="ap"  name="AP Outflow"  stroke="#EF4444" strokeWidth={2} dot={{ r: 4, fill: "#EF4444" }} />
                <Line type="monotone" dataKey="net" name="Net"         stroke="#6366F1" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 4, fill: "#6366F1" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 30-Day KPI Bar */}
        <div className="bg-surface-1 rounded-xl border border-white/5 p-6">
          <h2 className="text-sm font-medium text-white mb-1">30-Day P&L</h2>
          <p className="text-xs text-muted mb-5">Revenue vs spend vs margin</p>
          {loading ? (
            <div className="h-52 rounded-xl bg-white/5 animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={kpiBarData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                  <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {kpiBarData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Gross margin % pill */}
              {kpis && (
                <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
                  <p className="text-xs text-muted">Gross Margin</p>
                  <p className={`text-sm font-bold ${kpis.gross_margin_pct >= 0 ? "text-success" : "text-danger"}`}>
                    {kpis.gross_margin_pct}%
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Low Stock Alerts Table */}
      {summary?.low_stock_alerts?.length > 0 && (
        <div className="bg-surface-1 rounded-xl border border-white/5">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Low Stock Alerts
            </h2>
            <a href="/inventory?filter=low_stock"
              className="text-xs text-brand-light hover:text-brand transition-colors">
              View all →
            </a>
          </div>
          <div className="divide-y divide-white/5">
            {summary.low_stock_alerts.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-white">{item.name}</p>
                  <p className="text-xs text-muted">{item.sku}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-muted">Current</p>
                    <p className="text-danger font-semibold">{item.current_stock} {item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Reorder At</p>
                    <p className="text-white">{item.reorder_point} {item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Deficit</p>
                    <p className="text-warning font-semibold">-{item.deficit} {item.unit}</p>
                  </div>
                  <Badge status="overdue" label="Low Stock" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}