import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { ToastProvider } from '../ui/Toast';
import { useOffline } from '../../hooks/useOffline';
import { useTranslation } from 'react-i18next';

export default function AppShell() {
  const { isOnline, queueLength } = useOffline();
  const { t } = useTranslation();

  return (
    <ToastProvider>
      {/* Offline / online banner */}
      {!isOnline && (
        <div className="offline-banner">
          📡 {t('offline')}{queueLength > 0 ? ` (${queueLength} ${t('pending')})` : ''}
        </div>
      )}

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar />
          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav />
    </ToastProvider>
  );
}
