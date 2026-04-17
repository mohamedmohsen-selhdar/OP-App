import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Factory, Plus, Search, Filter, ChevronDown,
  Check, X, Play, ClipboardList, Eye,
  Calendar, AlertTriangle, Loader2, RefreshCw,
  CheckCircle2, Clock, Package,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────── */
const STATUS_META = {
  draft:       { label: 'مسودة',        color: 'var(--text-muted)',  bg: '#ffffff18' },
  approved:    { label: 'موافق عليه',   color: 'var(--info)',        bg: 'var(--info)18' },
  in_progress: { label: 'جارٍ الآن',   color: 'var(--accent)',      bg: 'var(--accent)18' },
  done:        { label: 'مكتمل',        color: 'var(--success)',     bg: 'var(--success)18' },
  cancelled:   { label: 'ملغي',         color: 'var(--danger)',      bg: 'var(--danger)18' },
};

const OWNER_ROLES   = ['owner', 'factory_manager'];
const APPROVE_ROLES = [...OWNER_ROLES, 'production_supervisor'];

/* ─── Tiny Helpers ──────────────────────────────────────── */
const fmt  = (n) => (n ?? 0).toLocaleString('ar-EG');
const pct  = (a, b) => b ? Math.min(100, Math.round((a / b) * 100)) : 0;
const today = () => new Date().toISOString().slice(0, 10);

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px',
      borderRadius: 99, color: m.color, background: m.bg,
      whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
}

function MiniProgress({ value, max }) {
  const p = pct(value, max);
  const color = p >= 100 ? 'var(--success)' : p > 50 ? 'var(--accent)' : 'var(--warning)';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 99, transition: 'width .6s ease' }} />
      </div>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
        {fmt(value)} / {fmt(max)} — {p}%
      </span>
    </div>
  );
}

function Spinner() {
  return <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />;
}

/* ─── Create / Log Modal ─────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--bg-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--bg-border)', background: 'var(--bg-input, var(--bg-secondary))',
  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box',
};

/* ─── Create Order Modal ─────────────────────────────────── */
function CreateOrderModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [boms, setBoms] = useState([]);
  const [lines, setLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    bom_id: '', line_id: '', planned_qty: '', planned_start: today(),
    planned_end: '', notes: '',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('bom_headers').select('id, code, finished_item:items(name_ar, name_en)').eq('is_active', true),
      supabase.from('production_lines').select('id, code, name_ar').eq('is_active', true),
    ]).then(([b, l]) => {
      setBoms(b.data ?? []);
      setLines(l.data ?? []);
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.bom_id || !form.line_id || !form.planned_qty || !form.planned_end) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Generate code: PO-YYYYMMDD-XXXX
      const code = `PO-${today().replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: err } = await supabase.from('production_orders').insert({
        code,
        bom_id: form.bom_id,
        line_id: form.line_id,
        planned_qty: parseFloat(form.planned_qty),
        planned_start: form.planned_start,
        planned_end: form.planned_end,
        notes: form.notes,
        status: 'draft',
        created_by: user.id,
      });
      if (err) throw err;
      onCreated();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="✦ أمر إنتاج جديد" onClose={onClose}>
      <FormField label="مواصفة الإنتاج (BOM)" required>
        <select style={inputStyle} value={form.bom_id} onChange={e => set('bom_id', e.target.value)}>
          <option value="">— اختر BOM —</option>
          {boms.map(b => (
            <option key={b.id} value={b.id}>
              {b.code} · {b.finished_item?.name_ar || b.finished_item?.name_en || '—'}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="خط الإنتاج" required>
        <select style={inputStyle} value={form.line_id} onChange={e => set('line_id', e.target.value)}>
          <option value="">— اختر الخط —</option>
          {lines.map(l => (
            <option key={l.id} value={l.id}>{l.name_ar} ({l.code})</option>
          ))}
        </select>
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="الكمية المطلوبة" required>
          <input type="number" min="1" style={inputStyle} value={form.planned_qty}
            onChange={e => set('planned_qty', e.target.value)} placeholder="مثال: 500" />
        </FormField>
        <FormField label="تاريخ البدء" required>
          <input type="date" style={inputStyle} value={form.planned_start}
            onChange={e => set('planned_start', e.target.value)} />
        </FormField>
      </div>

      <FormField label="تاريخ التسليم المخطط" required>
        <input type="date" style={inputStyle} value={form.planned_end}
          onChange={e => set('planned_end', e.target.value)} />
      </FormField>

      <FormField label="ملاحظات">
        <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="أي تعليمات أو ملاحظات..." />
      </FormField>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>
          إلغاء
        </button>
        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: submitting ? .7 : 1 }}>
          {submitting ? <Spinner /> : <Plus size={15} />}
          {submitting ? 'جارٍ الحفظ...' : 'حفظ الأمر'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Log Production Modal ───────────────────────────────── */
function LogModal({ order, onClose, onLogged }) {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState({ machine_id: '', shift: 'morning', qty_produced: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('machines').select('id, code, name_ar').eq('is_active', true)
      .then(({ data }) => setMachines(data ?? []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.qty_produced || parseFloat(form.qty_produced) <= 0) {
      setError('أدخل كمية صحيحة'); return;
    }
    setSubmitting(true); setError('');
    try {
      await supabase.from('production_logs').insert({
        order_id: order.id,
        machine_id: form.machine_id || null,
        worker_id: user.id,
        shift: form.shift,
        qty_produced: parseFloat(form.qty_produced),
        notes: form.notes,
      });
      // Update actual_qty on the order
      const newQty = (order.actual_qty || 0) + parseFloat(form.qty_produced);
      const newStatus = newQty >= order.planned_qty ? 'done' : 'in_progress';
      await supabase.from('production_orders').update({ actual_qty: newQty, status: newStatus })
        .eq('id', order.id);
      onLogged(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal title={`📋 تسجيل إنتاج — ${order.code}`} onClose={onClose}>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--accent)11', marginBottom: 18, fontSize: '0.82rem', color: 'var(--accent)' }}>
        التقدم الحالي: {fmt(order.actual_qty)} / {fmt(order.planned_qty)} وحدة ({pct(order.actual_qty, order.planned_qty)}%)
      </div>

      <FormField label="الماكينة">
        <select style={inputStyle} value={form.machine_id} onChange={e => set('machine_id', e.target.value)}>
          <option value="">— بدون تحديد ماكينة —</option>
          {machines.map(m => <option key={m.id} value={m.id}>{m.name_ar} ({m.code})</option>)}
        </select>
      </FormField>

      <FormField label="الوردية" required>
        <select style={inputStyle} value={form.shift} onChange={e => set('shift', e.target.value)}>
          <option value="morning">الوردية الصباحية ☀️</option>
          <option value="evening">الوردية المسائية 🌆</option>
          <option value="night">الوردية الليلية 🌙</option>
        </select>
      </FormField>

      <FormField label="الكمية المنتجة" required>
        <input type="number" min="1" style={inputStyle} value={form.qty_produced}
          onChange={e => set('qty_produced', e.target.value)} placeholder="أدخل الكمية..." />
      </FormField>

      <FormField label="ملاحظات">
        <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="أي ملاحظات على هذه الوردية..." />
      </FormField>

      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'var(--success)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: submitting ? .7 : 1 }}>
          {submitting ? <Spinner /> : <Check size={15} />}
          {submitting ? 'جارٍ الحفظ...' : 'تسجيل الكمية'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Order Card ─────────────────────────────────────────── */
function OrderCard({ order, canApprove, onApprove, onLog, onRefresh }) {
  const [acting, setActing] = useState(false);

  const handleApprove = async (newStatus) => {
    setActing(true);
    await supabase.from('production_orders').update({ status: newStatus }).eq('id', order.id);
    onRefresh();
    setActing(false);
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
      borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'transform .2s, box-shadow .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{order.code}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
            {order.bom?.finished_item?.name_ar || order.bom?.code || '—'}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <MiniProgress value={order.actual_qty ?? 0} max={order.planned_qty} />

      <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} /> {order.planned_end ?? '—'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Factory size={11} /> {order.line?.name_ar ?? order.line?.code ?? '—'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Package size={11} /> {fmt(order.planned_qty)} وحدة
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Approve/Reject — for draft orders */}
        {order.status === 'draft' && canApprove && (
          <>
            <button onClick={() => handleApprove('approved')} disabled={acting}
              style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: 'var(--success)', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {acting ? <Spinner /> : <Check size={13} />} موافقة
            </button>
            <button onClick={() => handleApprove('cancelled')} disabled={acting}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem' }}>
              <X size={13} />
            </button>
          </>
        )}
        {/* Start button — approved → in_progress */}
        {order.status === 'approved' && (
          <button onClick={() => handleApprove('in_progress')} disabled={acting}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {acting ? <Spinner /> : <Play size={13} />} بدء التنفيذ
          </button>
        )}
        {/* Log production — in_progress */}
        {order.status === 'in_progress' && (
          <button onClick={() => onLog(order)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: 'var(--info)', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ClipboardList size={13} /> تسجيل إنتاج
          </button>
        )}
        {order.status === 'done' && (
          <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', color: 'var(--success)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <CheckCircle2 size={13} /> مكتمل
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Screen ────────────────────────────────────────── */
export default function ProductionScreen() {
  const { profile } = useAuth();
  const roleCode = profile?.role?.code;
  const canCreate  = APPROVE_ROLES.includes(roleCode) || true; // all roles see
  const canApprove = APPROVE_ROLES.includes(roleCode);

  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatus]   = useState('all');
  const [search, setSearch]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [logOrder, setLogOrder]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      let q = supabase.from('production_orders')
        .select(`
          id, code, status, planned_qty, actual_qty, planned_start, planned_end, notes, created_at,
          bom:bom_headers(id, code, finished_item:items(name_ar, name_en)),
          line:production_lines(id, code, name_ar)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;

      const filtered = search
        ? (data ?? []).filter(o =>
            o.code.toLowerCase().includes(search.toLowerCase()) ||
            (o.bom?.finished_item?.name_ar || '').includes(search))
        : (data ?? []);

      setOrders(filtered);
    } catch (e) {
      console.error('[Production] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { key: 'all',         label: 'الكل',       icon: ClipboardList },
    { key: 'draft',       label: 'مسودة',      icon: Clock },
    { key: 'approved',    label: 'موافق',       icon: Check },
    { key: 'in_progress', label: 'جارٍ',       icon: Play },
    { key: 'done',        label: 'مكتمل',       icon: CheckCircle2 },
  ];

  const summaryCount = (s) => orders.filter(o => s === 'all' ? true : o.status === s).length;

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Factory size={22} color="var(--accent)" /> إدارة الإنتاج
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
            {orders.length} أمر إنتاج · تحديث مباشر
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem', fontWeight: 600 }}>
              <Plus size={16} /> أمر جديد
            </button>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="ابحث برقم الأمر أو اسم المنتج..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingInlineStart: 36 }}
        />
      </div>

      {/* ── Status Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setStatus(tab.key)}
            style={{
              padding: '7px 14px', borderRadius: 10, border: '1px solid',
              borderColor: statusFilter === tab.key ? 'var(--accent)' : 'var(--bg-border)',
              background: statusFilter === tab.key ? 'var(--accent)' : 'none',
              color: statusFilter === tab.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all .2s',
            }}>
            <tab.icon size={12} />
            {tab.label}
            <span style={{ background: statusFilter === tab.key ? 'rgba(255,255,255,.25)' : 'var(--bg-border)', borderRadius: 99, padding: '1px 6px', fontSize: '0.68rem' }}>
              {tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Orders Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 180, borderRadius: 16, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Factory size={48} style={{ opacity: .3, marginBottom: 16 }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>لا توجد أوامر إنتاج</p>
          <p style={{ fontSize: '0.82rem', marginTop: 6 }}>اضغط "أمر جديد" لإنشاء أول أمر إنتاج</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {(statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)).map(order => (
            <OrderCard
              key={order.id}
              order={order}
              canApprove={canApprove}
              onLog={setLogOrder}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {logOrder   && <LogModal order={logOrder} onClose={() => setLogOrder(null)} onLogged={load} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.9} }
        @keyframes spin  { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  );
}
