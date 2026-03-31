import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingCart, FileText,
  TrendingUp, LogOut, ChevronLeft, Menu,
  Truck, Shield, Settings,
} from "lucide-react";
import { useAuthStore } from "../hooks/useAuth";
import { clsx } from "clsx";
import RoleGuard from "../components/ui/RoleGuard";

const NAV = [
  { path: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { path: "/inventory",   label: "Inventory",   icon: Package         },
  { path: "/procurement", label: "Procurement", icon: ShoppingCart    },
  { path: "/invoices",    label: "Invoices",     icon: FileText        },
  { path: "/sales",       label: "Sales & AR",  icon: TrendingUp      },
  { path: "/suppliers",   label: "Suppliers",   icon: Truck           },
  { path: "/audit",       label: "Audit Log",   icon: Shield,  roles: ["owner", "manager"] },
  { path: "/settings",    label: "Settings",    icon: Settings, roles: ["owner"] },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate("/login"); }

  return (
    <div className="flex h-screen bg-surface-0 text-white overflow-hidden">
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex flex-col border-r border-white/5 bg-surface-1 shrink-0 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5">
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-base font-bold text-white tracking-tight">
                Profit<span className="text-brand">OS</span>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-surface-3 text-muted hover:text-white transition-colors">
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(({ path, label, icon: Icon, roles }) => {
            const link = (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-brand/10 text-brand-light font-medium"
                    : "text-muted hover:bg-surface-2 hover:text-white",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap">
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );

            return roles
              ? <RoleGuard key={path} roles={roles}>{link}</RoleGuard>
              : <span key={path}>{link}</span>;
          })}
        </nav>

        {/* Sign out */}
        <div className="px-2 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:bg-danger/10 hover:text-danger transition-all duration-150">
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-1/50 backdrop-blur-sm">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.full_name}</p>
              <p className="text-xs text-muted capitalize">{user?.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand-light text-xs font-semibold">
              {user?.full_name?.[0]}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}