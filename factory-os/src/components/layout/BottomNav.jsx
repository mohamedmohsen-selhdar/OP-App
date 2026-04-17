import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Factory, Package, ShieldCheck,
  Wrench, ShoppingCart, TrendingUp, Settings, Menu, X, LogOut
} from 'lucide-react';

const ALL_MODULES = [
  { to: '/dashboard',   icon: LayoutDashboard, key: 'dashboard',   module: null },
  { to: '/production',  icon: Factory,          key: 'production',  module: 'production' },
  { to: '/inventory',   icon: Package,          key: 'inventory',   module: 'inventory' },
  { to: '/quality',     icon: ShieldCheck,      key: 'quality',     module: 'quality' },
  { to: '/maintenance', icon: Wrench,           key: 'maintenance', module: 'maintenance' },
  { to: '/procurement', icon: ShoppingCart,     key: 'procurement', module: 'procurement' },
  { to: '/sales',       icon: TrendingUp,       key: 'sales',       module: 'sales' },
  { to: '/settings',    icon: Settings,         key: 'settings',    module: 'settings' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Filter accessible modules
  const accessible = ALL_MODULES.filter(m => !m.module || can(m.module, 'view'));
  
  // Show first 4 in the bottom bar, the rest inside the menu
  const primaryNav = accessible.slice(0, 4);
  const overflowNav = accessible.slice(4);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="bottom-nav" id="bottom-nav">
        <div className="bottom-nav-inner">
          {primaryNav.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <Icon strokeWidth={2.5} />
              <span>{t(key)}</span>
            </NavLink>
          ))}

          {/* Menu Toggle */}
          <button 
            className={`bottom-nav-item ${isOpen ? 'active' : ''}`} 
            onClick={() => setIsOpen(p => !p)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Menu strokeWidth={2.5} />
            <span>{t('more')}</span>
          </button>
        </div>
      </nav>

      {/* Overflow Menu Bottom Sheet */}
      <div className={`mobile-menu-sheet ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-backdrop" onClick={() => setIsOpen(false)} />
        <div className="mobile-menu-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t('more')}</h3>
            <button onClick={() => setIsOpen(false)} className="btn-ghost" style={{ padding: 8, borderRadius: '50%' }}>
              <X size={24} />
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {overflowNav.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `nav-item glass-card ${isActive ? 'active' : ''}`}
                style={{ padding: '16px', flexDirection: 'column', gap: 8, justifyContent: 'center' }}
              >
                <Icon size={28} />
                <span style={{ fontSize: '0.95rem' }}>{t(key)}</span>
              </NavLink>
            ))}
          </div>

          <button 
            onClick={handleLogout}
            className="btn btn-danger" 
            style={{ marginTop: 12, padding: 14 }}
          >
            <LogOut size={20} />
            {t('sidebar-logout') || 'تسجيل الخروج'}
          </button>
        </div>
      </div>
    </>
  );
}
