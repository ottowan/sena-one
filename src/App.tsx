import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { ColorModeProvider } from './components/ui/color-mode';
import { system } from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages
import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { RoomsPage } from './pages/admin/RoomsPage';
import { TenantsPage } from './pages/admin/TenantsPage';
import { ContractsPage } from './pages/admin/ContractsPage';
import { InvoicesPage } from './pages/admin/InvoicesPage';
import { MaintenancePage } from './pages/admin/MaintenancePage';
import ReportsPage from './pages/admin/ReportsPage';
import SettingsPage from './pages/admin/SettingsPage';
import { MeterManagementPage } from './pages/admin/MeterManagementPage';

// Tenant Pages
import { TenantLayout } from './components/layout/TenantLayout';
import { TenantDashboardPage } from './pages/tenant/TenantDashboardPage';
import { MyBillsPage } from './pages/tenant/MyBillsPage';
import { MyMaintenancePage } from './pages/tenant/MyMaintenancePage';
import { MyContractPage } from './pages/tenant/MyContractPage';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Root redirect component
const RootRedirect = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === UserRole.TENANT) {
    return <Navigate to="/tenant" replace />;
  }

  return <Navigate to="/admin" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <ChakraProvider value={system}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Root */}
                <Route path="/" element={<RootRedirect />} />

                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.OWNER]}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="rooms" element={<RoomsPage />} />
                  <Route path="tenants" element={<TenantsPage />} />
                  <Route path="contracts" element={<ContractsPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="maintenance" element={<MaintenancePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="meters" element={<MeterManagementPage />} />
                </Route>

                {/* Tenant Routes */}
                <Route
                  path="/tenant"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.TENANT]}>
                      <TenantLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<TenantDashboardPage />} />
                  <Route path="bills" element={<MyBillsPage />} />
                  <Route path="maintenance" element={<MyMaintenancePage />} />
                  <Route path="contract" element={<MyContractPage />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<div>404 - ไม่พบหน้าที่คุณต้องการ</div>} />
              </Routes>
            </BrowserRouter>
            <Toaster />
          </AuthProvider>
        </ChakraProvider>
      </ColorModeProvider>
    </QueryClientProvider>
  );
}

export default App;
