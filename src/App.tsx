/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppShell } from './components/layout/Shell';
import { Toaster, toast } from 'sonner';

// Lazy load pages for performance
const LoginPage = lazy(() => import('./pages/Login'));
const SetupPage = lazy(() => import('./pages/Setup'));
const OwnerDashboard = lazy(() => import('./components/dashboard/OwnerDashboard'));
const ManagerDashboard = lazy(() => import('./components/dashboard/ManagerDashboard'));
const RawMaterialsPage = lazy(() => import('./pages/RawMaterials'));
const PurchasesPage = lazy(() => import('./pages/Purchases'));
const ProductsPage = lazy(() => import('./pages/Products'));
const TransfersPage = lazy(() => import('./pages/Transfers'));
const POSPage = lazy(() => import('./pages/POS'));
const VendorsPage = lazy(() => import('./pages/Vendors'));
const PurchaseEntryPage = lazy(() => import('./pages/PurchaseEntry'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogs'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const StoresPage = lazy(() => import('./pages/Stores'));
const ConsumptionCalculatorPage = lazy(() => import('./pages/ConsumptionCalculator'));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [path, setPath] = React.useState(window.location.pathname);

  // Auto-logout: 30 minutes of inactivity
  React.useEffect(() => {
    if (!user) return;
    
    let timer: NodeJS.Timeout;
    const resetTimer = () => {
       clearTimeout(timer);
       timer = setTimeout(() => {
          signOut();
          toast.warning('Session expired due to inactivity');
       }, 30 * 60 * 1000); // 30 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    resetTimer();

    return () => {
       clearTimeout(timer);
       window.removeEventListener('mousemove', resetTimer);
       window.removeEventListener('keydown', resetTimer);
       window.removeEventListener('click', resetTimer);
       window.removeEventListener('scroll', resetTimer);
    };
  }, [user, signOut]);

  React.useEffect(() => {
    const handleLocationChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  React.useEffect(() => {
    const managerAllowedPaths = new Set(['/', '/inventory', '/products', '/reports', '/pos']);
    if (profile?.role === 'store_manager' && !managerAllowedPaths.has(path)) {
      window.history.replaceState({}, '', '/');
      setPath('/');
    }
  }, [path, profile?.role]);

  if (loading) return <LoadingScreen />;

  const renderContent = () => {
    const managerAllowedPaths = new Set(['/', '/inventory', '/products', '/reports', '/pos']);
    if (profile?.role === 'store_manager' && !managerAllowedPaths.has(path)) {
      return <ManagerDashboard />;
    }

    switch (path) {
      case '/inventory':
        return <RawMaterialsPage />;
      case '/vendors':
        return <VendorsPage />;
      case '/purchase-entry':
        return <PurchaseEntryPage />;
      case '/purchases':
        return <PurchasesPage />;
      case '/transfers':
        return <TransfersPage />;
      case '/products':
        return <ProductsPage />;
      case '/reports':
        return <ReportsPage />;
      case '/pos':
        return <POSPage />;
      case '/audit-logs':
        return <AuditLogsPage />;
      case '/settings':
        return <SettingsPage />;
      case '/stores':
        return <StoresPage />;
      case '/calculator':
        return <ConsumptionCalculatorPage />;
      case '/':
      default:
        return profile.role === 'owner' ? <OwnerDashboard /> : <ManagerDashboard />;
    }
  };

  return (
    <Suspense fallback={<LoadingScreen />}>
      {path === '/setup' ? (
        <SetupPage />
      ) : !user ? (
        <LoginPage />
      ) : !profile ? (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6 text-center">
          <div className="max-w-md space-y-4">
             <h1 className="text-2xl font-bold">Profile Pending</h1>
             <p className="text-neutral-500">Your account exists but your profile data hasn't been synced. Please contact the administrator.</p>
             <button onClick={() => window.location.reload()} className="text-orange-600 font-medium">Retry</button>
          </div>
        </div>
      ) : (
        <AppShell>
          {renderContent()}
        </AppShell>
      )}
    </Suspense>
  );
}

import { DataProvider } from './contexts/DataContext';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
        <Toaster position="top-center" richColors />
      </DataProvider>
    </AuthProvider>
  );
}
