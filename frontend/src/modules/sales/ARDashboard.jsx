import { useEffect, useState } from "react";
import { salesApi } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BUCKET_LABELS = {
  current: { label: "Current",  color: "#10B981" },
  "1_30":  { label: "1–30 days", color: "#F59E0B" },
  "31_60": { label: "31–60 days",color: "#F97316" },
  "61_90": { label: "61–90 days",color: "#EF4444" },
  "90_plus":{ label: "90+ days", color: "#7C3AED" },
};

export default function ARDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("current");

  useEffect(() => {
    salesApi.getARDashboard()
      .then(setData).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map((i) => <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />)}
    </div>
  );

  if (!data) return <p className="text-muted text-sm">Failed to load AR data.</p>;

  const chartData = Object.entries(BUCKET_LABELS).map(([key, meta]) => ({
    name: meta.label,
    amount: data.buckets[key]?.total ?? 0,
    color: meta.color,
    key,
  }));

  const selectedBucket = data.buckets[selected];

  return (
    <div className="space-y-5">

      {/* Cash Risk Banner */}
      {data.has_cash_risk && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>High AR exposure — <strong>{formatCurrency(data.total_outstanding)}</strong> outstanding across {data.overdue_count} overdue invoices.</span>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Total Outstanding</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(data.total_outstanding)}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">Overdue Invoices</p>
          <p className={`mt-1 text-2xl font-semibold ${data.overdue_count > 0 ? "text-danger" : "text-success"}`}>
            {data.overdue_count}
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs text-muted uppercase tracking-wider">90+ Days Overdue</p>
          <p className={`mt-1 text-2xl font-semibold ${data.buckets["90_plus"]?.total > 0 ? "text-danger" : "text-success"}`}>
            {formatCurrency(data.buckets["90_plus"]?.total ?? 0)}
          </p>
        </Card>
      </div>

      {/* Aging Bucket Chart */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-light" />
          AR Aging Buckets
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} onClick={(d) => d?.activePayload && setSelected(d.activePayload[0].payload.key)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
              formatter={(v) => [formatCurrency(v), "Outstanding"]}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} cursor="pointer">
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.color}
                  opacity={selected === entry.key ? 1 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted text-center mt-2">Click a bar to view invoices in that bucket</p>
      </Card>

      {/* Bucket Detail */}
      {selectedBucket && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: BUCKET_LABELS[selected].color }} />
              <h4 className="text-sm font-medium text-white">{BUCKET_LABELS[selected].label}</h4>
              <span className="text-xs text-muted">({selectedBucket.invoices.length} invoices)</span>
            </div>
            <p className="text-sm font-semibold text-white">{formatCurrency(selectedBucket.total)}</p>
          </div>

          {selectedBucket.invoices.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">No invoices in this bucket 🎉</p>
          ) : (
            <div className="divide-y divide-white/5">
              {selectedBucket.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-white font-medium">{inv.invoice_number}</p>
                    <p className="text-xs text-muted">{inv.customer_name} · Due: {inv.due_date ? formatDate(inv.due_date) : "—"}</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    {inv.days_overdue > 0 && (
                      <span className="text-xs text-danger">{inv.days_overdue}d overdue</span>
                    )}
                    <p className="text-sm font-semibold text-white">{formatCurrency(inv.outstanding)}</p>
                    <Badge status={inv.payment_status} label={inv.payment_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
