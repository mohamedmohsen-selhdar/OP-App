import { Bell, Moon, Sun, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LangContext';
import { useNotifications } from '../../hooks/useNotifications';

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();

  return (
    <header className="topbar">
      {/* Left: page title placeholder (each screen sets its own via context or h1) */}
      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        {t('app_name')}
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Notifications */}
        <button
          className="btn btn-ghost btn-sm"
          id="topbar-notifications"
          style={{ position: 'relative', padding: '8px' }}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, insetInlineEnd: 2,
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--danger)', color: '#fff',
              fontSize: '0.62rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Lang toggle */}
        <button
          className="btn btn-ghost btn-sm"
          id="topbar-lang"
          onClick={toggleLang}
          style={{ fontWeight: 700, padding: '6px 10px' }}
        >
          <Globe size={16} />
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>

        {/* Theme toggle */}
        <button
          className="btn btn-ghost btn-sm"
          id="topbar-theme"
          onClick={toggleTheme}
          style={{ padding: '8px' }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
