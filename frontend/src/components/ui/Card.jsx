import { motion } from "framer-motion";
import { clsx } from "clsx";

export function Card({ children, className, hover = false, glass = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={clsx(
        "rounded-xl border border-white/5 p-6",
        glass ? "bg-white/5 backdrop-blur-glass shadow-glass" : "bg-surface-1 shadow-card",
        hover && "hover:border-white/10 hover:bg-surface-2 transition-all duration-150 cursor-pointer",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, trend, color = "brand" }) {
  const colorMap = {
    brand: "text-brand-light bg-brand/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-danger bg-danger/10",
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
        </div>
        {Icon && (
          <div className={clsx("p-2.5 rounded-lg", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={clsx("mt-3 text-xs font-medium", trend >= 0 ? "text-success" : "text-danger")}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last month
        </div>
      )}
    </Card>
  );
}