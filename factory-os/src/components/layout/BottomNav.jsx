import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import {
  LayoutDashboard, Factory, Package, ShieldCheck,
  Wrench, ShoppingCart, TrendingUp, Settings,
} from 'lucide-react';

const BOTTOM_NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, key: 'dashboard',   module: null },
  { to: '/production',  icon: Factory,          key: 'production',  module: 'production' },
  { to: '/inventory',   icon: Package,          key: 'inventory',   module: 'inventory' },
  { to: '/quality',     icon: ShieldCheck,      key: 'quality',     module: 'quality' },
  { to: '/maintenance', icon: Wrench,           key: 'maintenance', module: 'maintenance' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  const { can } = usePermissions();

  return (
    <nav className="bottom-nav" id="bottom-nav">
      <div className="bottom-nav-inner">
        {BOTTOM_NAV.map(({ to, icon: Icon, key, module }) => {
          if (module && !can(module, 'view')) return null;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
              id={`bottom-nav-${key}`}
            >
              <Icon />
              <span>{t(key)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
