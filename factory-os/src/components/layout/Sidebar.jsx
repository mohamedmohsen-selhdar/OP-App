import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  LayoutDashboard, Factory, Package, ShieldCheck,
  Wrench, ShoppingCart, TrendingUp, Settings, LogOut,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, key: 'dashboard',   module: null },
  { to: '/production',  icon: Factory,          key: 'production',  module: 'production' },
  { to: '/inventory',   icon: Package,          key: 'inventory',   module: 'inventory' },
  { to: '/quality',     icon: ShieldCheck,      key: 'quality',     module: 'quality' },
  { to: '/maintenance', icon: Wrench,           key: 'maintenance', module: 'maintenance' },
  { to: '/procurement', icon: ShoppingCart,     key: 'procurement', module: 'procurement' },
  { to: '/sales',       icon: TrendingUp,       key: 'sales',       module: 'sales' },
  { to: '/settings',    icon: Settings,         key: 'settings',    module: 'settings' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo" style={{ gap: 0, paddingBlock: '12px' }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.8rem',
          fontWeight: 900,
          letterSpacing: '-1px',
        }}>
          <span style={{ color: 'var(--text-primary)' }}>FL</span><span style={{ color: '#b91c1c' }}>APP</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, key, module }) => {
          // Show all items if role not loaded yet, or if user has access
          if (module && profile?.role && !can(module, 'view')) return null;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              id={`nav-${key}`}
            >
              <Icon size={18} />
              <span>{t(key)}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Profile + Logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--bg-border)' }}>
        {profile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', marginBottom: 4,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem', color: '#1c1917', flexShrink: 0,
            }}>
              {(profile.full_name_ar ?? profile.full_name_en ?? 'U')[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.full_name_ar ?? profile.full_name_en}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {profile.role?.name_ar ?? profile.role?.name_en}
              </div>
            </div>
          </div>
        )}
        <button
          className="nav-item btn-ghost"
          onClick={handleLogout}
          id="sidebar-logout"
          style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--danger)' }}
        >
          <LogOut size={18} />
          <span style={{ fontSize: '0.9rem' }}>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
