import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Factory } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { lang, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail]       = useState(localStorage.getItem('factoryos_last_email') ?? '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError(t('required_field')); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      localStorage.setItem('factoryos_last_email', email);
      navigate('/dashboard');
    } catch (err) {
      setError(t('wrong_credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.10) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      {/* Top bar: lang + theme toggles */}
      <div style={{ position: 'absolute', top: '20px', insetInlineEnd: '20px', display: 'flex', gap: '10px' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleLang}
          id="login-lang-toggle"
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleTheme}
          id="login-theme-toggle"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Login card */}
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px 36px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '3.5rem',
            fontWeight: 900,
            letterSpacing: '-2px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            lineHeight: 1
          }}>
            <span style={{ color: 'var(--text-primary)' }}>FL</span><span style={{ color: '#b91c1c' }}>APP</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {lang === 'ar' ? 'نظام إدارة التصنيع' : 'Manufacturing ERP'}
          </p>
        </div>

        {/* Welcome */}
        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>
          {t('welcome_back')} 👋
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div className="form-group">
            <label className="field-label" htmlFor="login-email">
              {t('email')}
            </label>
            <input
              id="login-email"
              type="email"
              className={`field-base ${error ? 'error' : ''}`}
              placeholder={t('email_placeholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="field-label" htmlFor="login-password">
              {t('password_placeholder')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                className={`field-base ${error ? 'error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingInlineEnd: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                style={{
                  position: 'absolute', insetInlineEnd: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}
                id="login-show-password"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--danger)', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            id="login-submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? <span className="spinner" style={{ borderTopColor: '#1c1917' }} /> : null}
            {loading
              ? (lang === 'ar' ? 'جارٍ التحميل...' : 'Signing in...')
              : t('sign_in')}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        FactoryOS v1.0 · مصر
      </p>
    </div>
  );
}
