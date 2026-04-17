import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthGuard, PermissionGuard } from './components/layout/AuthGuard';
import AppShell from './components/layout/AppShell';

// Lazy-loaded screens
const LoginScreen      = lazy(() => import('./screens/auth/LoginScreen'));
const DashboardScreen  = lazy(() => import('./screens/dashboard/DashboardScreen'));
const ProductionScreen = lazy(() => import('./screens/production/ProductionScreen'));
const InventoryScreen  = lazy(() => import('./screens/inventory/InventoryScreen'));
const QualityScreen    = lazy(() => import('./screens/quality/QualityScreen'));
const MaintenanceScreen= lazy(() => import('./screens/maintenance/MaintenanceScreen'));
const ProcurementScreen= lazy(() => import('./screens/procurement/ProcurementScreen'));
const SalesScreen      = lazy(() => import('./screens/sales/SalesScreen'));
const SettingsScreen   = lazy(() => import('./screens/settings/SettingsScreen'));

const Fallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <span className="spinner lg" />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<Fallback />}><LoginScreen /></Suspense>,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/',           element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard',  element: <Suspense fallback={<Fallback />}><DashboardScreen /></Suspense> },
          {
            element: <PermissionGuard module="production" />,
            children: [{ path: '/production/*', element: <Suspense fallback={<Fallback />}><ProductionScreen /></Suspense> }],
          },
          {
            element: <PermissionGuard module="inventory" />,
            children: [{ path: '/inventory/*', element: <Suspense fallback={<Fallback />}><InventoryScreen /></Suspense> }],
          },
          {
            element: <PermissionGuard module="quality" />,
            children: [{ path: '/quality/*', element: <Suspense fallback={<Fallback />}><QualityScreen /></Suspense> }],
          },
          {
            element: <PermissionGuard module="maintenance" />,
            children: [{ path: '/maintenance/*', element: <Suspense fallback={<Fallback />}><MaintenanceScreen /></Suspense> }],
          },
          {
            element: <PermissionGuard module="procurement" />,
            children: [{ path: '/procurement/*', element: <Suspense fallback={<Fallback />}><ProcurementScreen /></Suspense> }],
          },
          {
            element: <PermissionGuard module="sales" />,
            children: [{ path: '/sales/*', element: <Suspense fallback={<Fallback />}><SalesScreen /></Suspense> }],
          },
          {
            element: <PermissionGuard module="settings" />,
            children: [{ path: '/settings/*', element: <Suspense fallback={<Fallback />}><SettingsScreen /></Suspense> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
