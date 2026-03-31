import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./modules/dashboard/DashboardPage";
import ProductsPage from "./modules/inventory/ProductsPage";
import LoginPage from "./pages/LoginPage";
import ProcurementPage from "./modules/procurement/ProcurementPage";
import InvoicesPage from "./modules/invoices/InvoicesPage";
import SalesPage from "./modules/sales/SalesPage";
import SuppliersPage from "./modules/suppliers/SuppliersPage";
import AuditPage     from "./modules/audit/AuditPage";
import SettingsPage  from "./modules/settings/SettingsPage";
import { useAuthStore } from "./hooks/useAuth";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="inventory" element={<ProductsPage />} />
          <Route path="procurement" element={<ProcurementPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="audit"     element={<AuditPage />} />
          <Route path="settings"  element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}