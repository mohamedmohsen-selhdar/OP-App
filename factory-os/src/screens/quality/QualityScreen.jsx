import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert, Wrench, Plus, Search, RefreshCw,
  X, Check, Loader2, AlertTriangle, CheckCircle2,
  Clock, Play, ChevronDown,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--bg-border)', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box',
};
const today = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
function Spinner() { return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />; }

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--bg-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status, type }) {
  const defectMeta = {
    open:     { label: 'مفتوح',      color: 'var(--danger)',  bg: 'var(--danger)18' },
    resolved: { label: 'محلول',      color: 'var(--success)', bg: 'var(--success)18' },
    closed:   { label: 'مغلق',       color: 'var(--text-muted)', bg: '#ffffff12' },
  };
  const downtimeMeta = {
    open:     { label: 'جارٍ الآن',  color: 'var(--warning)', bg: 'var(--warning)18' },
    resolved: { label: 'تم الإصلاح', color: 'var(--success)', bg: 'var(--success)18' },
    closed:   { label: 'مغلق',       color: 'var(--text-muted)', bg: '#ffffff12' },
  };
  const meta = (type === 'downtime' ? downtimeMeta : defectMeta)[status] || { label: status, color: 'var(--text-muted)', bg: '#ffffff12' };
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, color: meta.color, background: meta.bg, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  );
}

/* ─── Report Defect Modal ────────────────────────────────── */
function DefectModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState({ order_id: '', machine_id: '', defect_type: '', qty_defective: '', severity: 'low', root_cause: '', corrective_action: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('production_orders').select('id, code').eq('status', 'in_progress'),
      supabase.from('machines').select('id, code, name_ar').eq('is_active', true),
    ]).then(([o, m]) => { setOrders(o.data ?? []); setMachines(m.data ?? []); });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.defect_type || !form.qty_defective) { setError('يرجى ملء الحقول المطلوبة'); return; }
    setSaving(true); setError('');
    try {
      await supabase.from('defect_logs').insert({
        order_id: form.order_id || null,
        machine_id: form.machine_id || null,
        inspector_id: user.id,
        defect_type: form.defect_type,
        qty_defective: parseFloat(form.qty_defective),
        severity: form.severity,
        root_cause: form.root_cause,
        corrective_action: form.corrective_action,
        status: 'open',
      });
      onCreated(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="🛡️ تقرير عيب جديد" onClose={onClose}>
      <FormField label="أمر الإنتاج">
        <select style={inputStyle} value={form.order_id} onChange={e => set('order_id', e.target.value)}>
          <option value="">— اختياري —</option>
          {orders.map(o => <option key={o.id} value={o.id}>{o.code}</option>)}
        </select>
      </FormField>
      <FormField label="الماكينة">
        <select style={inputStyle} value={form.machine_id} onChange={e => set('machine_id', e.target.value)}>
          <option value="">— اختياري —</option>
          {machines.map(m => <option key={m.id} value={m.id}>{m.name_ar} ({m.code})</option>)}
        </select>
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="نوع العيب" required>
          <input type="text" style={inputStyle} value={form.defect_type} onChange={e => set('defect_type', e.target.value)} placeholder="مثال: شرخ، لون، قياس..." />
        </FormField>
        <FormField label="الكمية المعيبة" required>
          <input type="number" min="1" style={inputStyle} value={form.qty_defective} onChange={e => set('qty_defective', e.target.value)} placeholder="0" />
        </FormField>
      </div>
      <FormField label="مستوى الخطورة" required>
        <select style={inputStyle} value={form.severity} onChange={e => set('severity', e.target.value)}>
          <option value="low">منخفض 🟢</option>
          <option value="medium">متوسط 🟡</option>
          <option value="high">عالٍ 🔴</option>
        </select>
      </FormField>
      <FormField label="السبب الجذري">
        <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.root_cause} onChange={e => set('root_cause', e.target.value)} placeholder="ما سبب العيب؟" />
      </FormField>
      <FormField label="الإجراء التصحيحي">
        <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.corrective_action} onChange={e => set('corrective_action', e.target.value)} placeholder="ما الخطوة التالية؟" />
      </FormField>
      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--danger)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? .7 : 1 }}>
          {saving ? <Spinner /> : <ShieldAlert size={14} />} {saving ? 'جارٍ الحفظ...' : 'تسجيل العيب'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Log Downtime Modal ─────────────────────────────────── */
function DowntimeModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState({ machine_id: '', reason: '', start_time: nowISO().slice(0, 16), notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    supabase.from('machines').select('id, code, name_ar').eq('is_active', true)
      .then(({ data }) => setMachines(data ?? []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.machine_id || !form.reason) { setError('حدد الماكينة وسبب التوقف'); return; }
    setSaving(true); setError('');
    try {
      await supabase.from('downtime_logs').insert({
        machine_id: form.machine_id,
        reported_by: user.id,
        reason: form.reason,
        start_time: new Date(form.start_time).toISOString(),
        notes: form.notes,
        status: 'open',
      });
      // Update machine status
      await supabase.from('machines').update({ status: 'down' }).eq('id', form.machine_id);
      onCreated(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="🔧 تسجيل توقف ماكينة" onClose={onClose}>
      <FormField label="الماكينة" required>
        <select style={inputStyle} value={form.machine_id} onChange={e => set('machine_id', e.target.value)}>
          <option value="">— اختر الماكينة —</option>
          {machines.map(m => <option key={m.id} value={m.id}>{m.name_ar} ({m.code})</option>)}
        </select>
      </FormField>
      <FormField label="سبب التوقف" required>
        <input type="text" style={inputStyle} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="مثال: عطل كهربائي، ميكانيكي..." />
      </FormField>
      <FormField label="وقت البدء" required>
        <input type="datetime-local" style={inputStyle} value={form.start_time} onChange={e => set('start_time', e.target.value)} />
      </FormField>
      <FormField label="ملاحظات">
        <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="تفاصيل إضافية..." />
      </FormField>
      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--warning)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? .7 : 1 }}>
          {saving ? <Spinner /> : <Wrench size={14} />} {saving ? 'جارٍ الحفظ...' : 'تسجيل التوقف'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Defect Card ────────────────────────────────────────── */
function DefectCard({ defect, onResolve }) {
  const [acting, setActing] = useState(false);
  const sevColor = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)' };
  const sevLabel = { low: 'منخفض', medium: 'متوسط', high: 'عالٍ' };

  const handleResolve = async () => {
    setActing(true);
    await supabase.from('defect_logs').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', defect.id);
    onResolve();
    setActing(false);
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{defect.defect_type}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
            أمر: {defect.order?.code ?? '—'} · ماكينة: {defect.machine?.name_ar ?? '—'}
          </p>
        </div>
        <StatusBadge status={defect.status} type="defect" />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ color: sevColor[defect.severity] || 'var(--text-muted)', background: `${sevColor[defect.severity]}18`, padding: '2px 9px', borderRadius: 99, fontWeight: 600 }}>
          خطورة: {sevLabel[defect.severity] || defect.severity}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>كمية: {defect.qty_defective}</span>
        <span style={{ color: 'var(--text-muted)' }}>{new Date(defect.created_at).toLocaleDateString('ar-EG')}</span>
      </div>
      {defect.root_cause && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-border)', borderRadius: 8, padding: '8px 10px' }}>سبب: {defect.root_cause}</p>}
      {defect.status === 'open' && (
        <button onClick={handleResolve} disabled={acting}
          style={{ padding: '8px 0', borderRadius: 10, border: 'none', background: 'var(--success)', color: '#fff', cursor: acting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: acting ? .7 : 1 }}>
          {acting ? <Spinner /> : <Check size={13} />} تم الحل
        </button>
      )}
    </div>
  );
}

/* ─── Downtime Card ──────────────────────────────────────── */
function DowntimeCard({ log, onResolve }) {
  const [acting, setActing] = useState(false);
  const duration = log.end_time
    ? Math.round((new Date(log.end_time) - new Date(log.start_time)) / 60000)
    : Math.round((Date.now() - new Date(log.start_time)) / 60000);

  const handleResolve = async () => {
    setActing(true);
    await supabase.from('downtime_logs').update({ status: 'resolved', end_time: new Date().toISOString() }).eq('id', log.id);
    if (log.machine_id) await supabase.from('machines').update({ status: 'running', last_maintenance: new Date().toISOString() }).eq('id', log.machine_id);
    onResolve();
    setActing(false);
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${log.status === 'open' ? 'var(--warning)44' : 'var(--bg-border)'}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{log.machine?.name_ar || log.machine?.code || 'ماكينة غير محددة'}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>{log.reason}</p>
        </div>
        <StatusBadge status={log.status} type="downtime" />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> {new Date(log.start_time).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
        </span>
        <span style={{ color: log.status === 'open' ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
          مدة التوقف: {duration} دقيقة
        </span>
      </div>
      {log.status === 'open' && (
        <button onClick={handleResolve} disabled={acting}
          style={{ padding: '8px 0', borderRadius: 10, border: 'none', background: 'var(--success)', color: '#fff', cursor: acting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: acting ? .7 : 1 }}>
          {acting ? <Spinner /> : <CheckCircle2 size={13} />} تم الإصلاح
        </button>
      )}
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────────── */
export default function QualityMaintenanceScreen() {
  const [activeTab,   setTab]       = useState('defects');
  const [defects,     setDefects]   = useState([]);
  const [downtimes,   setDowntimes] = useState([]);
  const [loading,     setLoading]   = useState(true);
  const [search,      setSearch]    = useState('');
  const [showDefect,  setShowDef]   = useState(false);
  const [showDowntime,setShowDown]  = useState(false);
  const [refreshing,  setRefreshing]= useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [{ data: d }, { data: dt }] = await Promise.all([
        supabase.from('defect_logs')
          .select('id, defect_type, qty_defective, severity, status, root_cause, corrective_action, created_at, resolved_at, order:production_orders(code), machine:machines(name_ar, code)')
          .eq('is_deleted', false).order('created_at', { ascending: false }),
        supabase.from('downtime_logs')
          .select('id, reason, status, start_time, end_time, duration_minutes, notes, machine_id, machine:machines(name_ar, code)')
          .eq('is_deleted', false).order('start_time', { ascending: false }),
      ]);
      setDefects(d ?? []);
      setDowntimes(dt ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredDefects   = defects.filter(d => !search || d.defect_type.toLowerCase().includes(search.toLowerCase()) || (d.order?.code || '').toLowerCase().includes(search.toLowerCase()));
  const filteredDowntimes = downtimes.filter(d => !search || d.reason.toLowerCase().includes(search.toLowerCase()) || (d.machine?.name_ar || '').includes(search));

  const openDefects   = defects.filter(d => d.status === 'open').length;
  const openDowntimes = downtimes.filter(d => d.status === 'open').length;
  const totalDownMin  = downtimes.filter(d => d.status === 'resolved').reduce((s, d) => s + (d.duration_minutes ?? 0), 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeTab === 'defects' ? <><ShieldAlert size={22} color="var(--danger)" /> الجودة والعيوب</> : <><Wrench size={22} color="var(--warning)" /> الصيانة والتوقف</>}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
            {activeTab === 'defects' ? `${openDefects} عيب مفتوح · ${defects.length} إجمالي` : `${openDowntimes} توقف حالي · إجمالي وقت توقف محلول: ${totalDownMin} دقيقة`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => activeTab === 'defects' ? setShowDef(true) : setShowDown(true)}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: activeTab === 'defects' ? 'var(--danger)' : 'var(--warning)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem', fontWeight: 600 }}>
            <Plus size={16} /> {activeTab === 'defects' ? 'تقرير عيب' : 'تسجيل توقف'}
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'عيوب مفتوحة',  value: openDefects,   color: 'var(--danger)',  icon: ShieldAlert },
          { label: 'إجمالي العيوب', value: defects.length, color: 'var(--text-primary)', icon: AlertTriangle },
          { label: 'توقفات حالية', value: openDowntimes,  color: 'var(--warning)', icon: Wrench },
          { label: 'وقت التوقف',   value: `${totalDownMin}د`, color: 'var(--info)', icon: Clock },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <k.icon size={15} color={k.color} />
            </div>
            <p style={{ fontSize: '1.35rem', fontWeight: 700, color: k.color }}>{k.value}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ key: 'defects', label: 'عيوب الجودة', icon: ShieldAlert, count: openDefects, color: 'var(--danger)' },
          { key: 'maintenance', label: 'توقف الماكينات', icon: Wrench, count: openDowntimes, color: 'var(--warning)' }].map(tab => (
          <button key={tab.key} onClick={() => setTab(tab.key)}
            style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${activeTab === tab.key ? tab.color : 'var(--bg-border)'}`, background: activeTab === tab.key ? `${tab.color}18` : 'none', color: activeTab === tab.key ? tab.color : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
            <tab.icon size={13} /> {tab.label}
            {tab.count > 0 && <span style={{ background: tab.color, color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 700 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input type="text" placeholder="ابحث..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingInlineStart: 34 }} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 150, borderRadius: 14, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : activeTab === 'defects' ? (
        filteredDefects.length === 0
          ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}><ShieldAlert size={48} style={{ opacity: .3, marginBottom: 16 }} /><p style={{ fontWeight: 600 }}>لا توجد عيوب مسجلة 🎉</p></div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {filteredDefects.map(d => <DefectCard key={d.id} defect={d} onResolve={load} />)}
            </div>
      ) : (
        filteredDowntimes.length === 0
          ? <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}><Wrench size={48} style={{ opacity: .3, marginBottom: 16 }} /><p style={{ fontWeight: 600 }}>لا توجد توقفات مسجلة ✅</p></div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {filteredDowntimes.map(d => <DowntimeCard key={d.id} log={d} onResolve={load} />)}
            </div>
      )}

      {showDefect   && <DefectModal   onClose={() => setShowDef(false)}  onCreated={load} />}
      {showDowntime && <DowntimeModal onClose={() => setShowDown(false)} onCreated={load} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.9} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
