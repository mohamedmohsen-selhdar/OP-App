import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Factory, AlertTriangle, Package, ClipboardList,
  TrendingUp, TrendingDown, Zap, CheckCircle2,
  ArrowRight, RefreshCw, Wrench, ShieldAlert,
} from 'lucide-react';

/* ─── tiny helpers ───────────────────────────────────────── */
const fmt = (n) => (n ?? 0).toLocaleString('ar-EG');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function KpiCard({ icon: Icon, label, value, sub, color = 'var(--accent)', trend, loading }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--bg-border)',
      borderRadius: 16,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform .2s, box-shadow .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: color, opacity: .12, filter: 'blur(20px)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: '0.72rem', color: trend >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3 }}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div>
        {loading
          ? <div style={{ height: 28, width: '60%', borderRadius: 8, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} />
          : <span style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
        }
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</p>
      </div>

      {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: 4, borderTop: '1px solid var(--bg-border)' }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, onRefresh, refreshing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
      {onRefresh && (
        <button onClick={onRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          تحديث
        </button>
      )}
    </div>
  );
}

function AlertItem({ icon: Icon, color, title, sub, time }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--bg-border)', alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</p>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 3 }}>{time}</span>
    </div>
  );
}

function ProgressBar({ label, value, max, color = 'var(--accent)' }) {
  const p = pct(value, max);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{p}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--bg-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fmt(value)} وحدة</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الهدف: {fmt(max)}</span>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────── */
export default function DashboardScreen() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();

  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [lines, setLines] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير ☀️';
    if (h < 17) return 'مساء الخير 🌤️';
    return 'مساء النور 🌙';
  };

  const load = async () => {
    try {
      // Parallel fetch all KPIs
      const [
        { count: prodToday },
        { count: openOrders },
        { count: defectsOpen },
        { count: downtimeOpen },
        { count: stockAlerts },
        { data: linesData },
        { data: ordersData },
        { data: downtimeData },
        { data: defectData },
      ] = await Promise.all([
        supabase.from('production_logs').select('*', { count: 'exact', head: true })
          .gte('logged_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('production_orders').select('*', { count: 'exact', head: true })
          .in('status', ['approved', 'in_progress']),
        supabase.from('defect_logs').select('*', { count: 'exact', head: true })
          .eq('status', 'open').eq('is_deleted', false),
        supabase.from('downtime_logs').select('*', { count: 'exact', head: true })
          .eq('status', 'open').eq('is_deleted', false),
        supabase.from('inventory').select('*', { count: 'exact', head: true })
          .filter('qty_available', 'lte', 0),
        supabase.from('production_lines').select('id, name_ar, name_en, code, capacity_per_shift').eq('is_active', true),
        supabase.from('production_orders').select('id, code, status, planned_qty, actual_qty, planned_end')
          .in('status', ['approved', 'in_progress']).order('planned_end').limit(4),
        supabase.from('downtime_logs').select('id, reason, start_time, machine:machines(name_ar, code)')
          .eq('status', 'open').order('start_time', { ascending: false }).limit(3),
        supabase.from('defect_logs').select('id, defect_type, severity, created_at, order:production_orders(code)')
          .eq('status', 'open').order('created_at', { ascending: false }).limit(3),
      ]);

      // Sum today's production across all logs
      const { data: prodSum } = await supabase.from('production_logs')
        .select('qty_produced')
        .gte('logged_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      const totalProduced = prodSum?.reduce((s, r) => s + (r.qty_produced || 0), 0) ?? 0;

      setKpis({
        prodToday: totalProduced,
        openOrders: openOrders ?? 0,
        defectsOpen: defectsOpen ?? 0,
        downtimeOpen: downtimeOpen ?? 0,
        stockAlerts: stockAlerts ?? 0,
        logCount: prodToday ?? 0,
      });

      setLines(linesData ?? []);
      setPendingOrders(ordersData ?? []);

      // Combine downtime + defect into unified alert feed
      const downtimeAlerts = (downtimeData ?? []).map(d => ({
        id: 'dt-' + d.id,
        type: 'downtime',
        icon: Wrench,
        color: 'var(--warning)',
        title: `توقف: ${d.machine?.name_ar ?? d.machine?.code ?? 'ماكينة'}`,
        sub: d.reason,
        time: new Date(d.start_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      }));
      const defectAlerts = (defectData ?? []).map(d => ({
        id: 'df-' + d.id,
        type: 'defect',
        icon: ShieldAlert,
        color: d.severity === 'high' ? 'var(--danger)' : 'var(--warning)',
        title: `عيب: ${d.defect_type}`,
        sub: `أمر إنتاج: ${d.order?.code ?? '—'} · خطورة: ${d.severity}`,
        time: new Date(d.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      }));
      setAlerts([...downtimeAlerts, ...defectAlerts].sort(() => Math.random() - 0.5).slice(0, 5));

    } catch (err) {
      console.error('[Dashboard] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = () => { setRefreshing(true); load(); };

  const statusColor = {
    draft: 'var(--text-muted)',
    approved: 'var(--info)',
    in_progress: 'var(--accent)',
    done: 'var(--success)',
  };
  const statusLabel = {
    draft: 'مسودة', approved: 'موافق عليه',
    in_progress: 'جارٍ', done: 'مكتمل',
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0 2px' }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {greeting()}، {profile?.name_en || user?.email?.split('@')[0] || 'مدير'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <SectionHeader title="المؤشرات الرئيسية" onRefresh={handleRefresh} refreshing={refreshing} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        <KpiCard icon={Factory}      label="الإنتاج اليوم"      value={fmt(kpis?.prodToday)}    color="var(--accent)"   sub={`${kpis?.logCount ?? 0} سجل إنتاج`}   loading={loading} />
        <KpiCard icon={ClipboardList} label="أوامر مفتوحة"       value={fmt(kpis?.openOrders)}    color="var(--info)"     sub="موافق / جارٍ"                         loading={loading} />
        <KpiCard icon={AlertTriangle} label="توقف ماكينات"       value={fmt(kpis?.downtimeOpen)}  color="var(--warning)"  sub="مفتوحة الآن"                          loading={loading} />
        <KpiCard icon={ShieldAlert}   label="عيوب الجودة"        value={fmt(kpis?.defectsOpen)}   color="var(--danger)"   sub="تحتاج مراجعة"                         loading={loading} />
        <KpiCard icon={Package}       label="تنبيهات المخزون"    value={fmt(kpis?.stockAlerts)}   color="var(--purple)"   sub="مخزون صفر"                            loading={loading} />
        <KpiCard icon={CheckCircle2}  label="خطوط الإنتاج"      value={fmt(lines.length)}         color="var(--success)"  sub="نشطة"                                 loading={loading} />
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>

        {/* Active Production Orders */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 20 }}>
          <SectionHeader title="أوامر الإنتاج النشطة" />
          {loading
            ? [1,2,3].map(i => <div key={i} style={{ height: 54, borderRadius: 10, background: 'var(--bg-border)', marginBottom: 10, animation: 'pulse 1.5s infinite' }} />)
            : pendingOrders.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 24 }}>لا توجد أوامر نشطة حالياً</p>
              : pendingOrders.map(order => (
                  <div key={order.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{order.code}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        التسليم: {order.planned_end ?? '—'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'end' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor[order.status] || 'var(--text-muted)', background: `${statusColor[order.status] || 'var(--text-muted)'}18`, padding: '3px 10px', borderRadius: 99 }}>
                        {statusLabel[order.status] || order.status}
                      </span>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {fmt(order.actual_qty)} / {fmt(order.planned_qty)}
                      </p>
                    </div>
                  </div>
              ))
          }
          <button style={{ marginTop: 14, width: '100%', padding: '9px 0', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            عرض كل الأوامر <ArrowRight size={13} />
          </button>
        </div>

        {/* Live Alerts Feed */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 20 }}>
          <SectionHeader title="التنبيهات الحية" onRefresh={handleRefresh} refreshing={refreshing} />
          {loading
            ? [1,2,3].map(i => <div key={i} style={{ height: 54, borderRadius: 10, background: 'var(--bg-border)', marginBottom: 10, animation: 'pulse 1.5s infinite' }} />)
            : alerts.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <CheckCircle2 size={36} color="var(--success)" style={{ marginBottom: 10, opacity: .6 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد تنبيهات — كل شيء يعمل بسلاسة ✅</p>
                </div>
              )
              : alerts.map(a => (
                <AlertItem key={a.id} icon={a.icon} color={a.color} title={a.title} sub={a.sub} time={a.time} />
              ))
          }
        </div>

        {/* Production Lines Progress */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 20 }}>
          <SectionHeader title="أداء خطوط الإنتاج اليوم" />
          {loading
            ? [1,2].map(i => <div key={i} style={{ height: 60, borderRadius: 10, background: 'var(--bg-border)', marginBottom: 14, animation: 'pulse 1.5s infinite' }} />)
            : lines.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 24 }}>لا توجد خطوط إنتاج مضافة</p>
              : lines.map(line => (
                <ProgressBar
                  key={line.id}
                  label={line.name_ar || line.name_en || line.code}
                  value={kpis?.prodToday ?? 0}
                  max={line.capacity_per_shift || 500}
                  color="var(--accent)"
                />
              ))
          }
          <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Zap size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />
            الطاقة الإنتاجية المجمّعة لهذا اليوم — تحديث مباشر عند تسجيل الإنتاج
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 16, padding: 20 }}>
          <SectionHeader title="إجراءات سريعة" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'أمر إنتاج جديد', icon: Factory, color: 'var(--accent)', path: '/production' },
              { label: 'تقرير عيب',       icon: ShieldAlert, color: 'var(--danger)',  path: '/quality' },
              { label: 'سجل توقف',        icon: Wrench,      color: 'var(--warning)', path: '/maintenance' },
              { label: 'طلب شراء',        icon: Package,     color: 'var(--info)',    path: '/procurement' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => window.location.hash = action.path}
                style={{
                  padding: '14px 10px',
                  borderRadius: 12,
                  border: `1px solid ${action.color}44`,
                  background: `${action.color}11`,
                  color: action.color,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'background .2s, transform .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${action.color}22`; e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${action.color}11`; e.currentTarget.style.transform = ''; }}
              >
                <action.icon size={22} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin  { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
