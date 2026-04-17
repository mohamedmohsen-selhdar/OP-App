import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from 'react-i18next';

/** Redirects to /login if not authenticated */
export function AuthGuard() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span className="spinner lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Shows "not authorized" if user lacks module permission */
export function PermissionGuard({ module }) {
  const { profile, isLoading } = useAuth();
  const { can } = usePermissions();
  const { t } = useTranslation();

  // Still loading profile from Supabase — show spinner, never block prematurely
  if (isLoading || !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span className="spinner lg" />
      </div>
    );
  }

  // Owner wildcard — always allow regardless of module
  if (profile?.role?.permissions?.['*']) return <Outlet />;

  // Role loaded but no permission for this module
  if (!can(module, 'view')) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🚫</p>
        <p style={{ color: 'var(--text-secondary)' }}>{t('unauthorized')}</p>
      </div>
    );
  }

  return <Outlet />;
}
