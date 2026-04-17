import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp, Plus, Search, RefreshCw, X, Check,
  Loader2, Package, Truck, FileText, Clock,
  CheckCircle2, Building2, ChevronDown, DollarSign,
} from 'lucide-react';

/* ─── Helpers ───────────────────────────────────────────── */
const fmt    = (n) => (+(n ?? 0)).toLocaleString('ar-EG');
const fmtCur = (n) => `${(+(n ?? 0)).toLocaleString('ar-EG')} ج.م`;
const today  = () => new Date().toISOString().slice(0, 10);
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--bg-border)', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box',
};
const SO_STATUS = {
  draft:     { label: 'مسودة',        color: 'var(--text-muted)',  bg: '#ffffff12' },
  confirmed: { label: 'مؤكد',         color: 'var(--info)',        bg: 'var(--info)18' },
  shipped:   { label: 'تم الشحن',     color: 'var(--accent)',      bg: 'var(--accent)18' },
  delivered: { label: 'مسلّم',         color: 'var(--success)',     bg: 'var(--success)18' },
  cancelled: { label: 'ملغي',         color: 'var(--danger)',      bg: 'var(--danger)18' },
};

function Spinner() { return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />; }
function StatusBadge({ status }) {
  const m = SO_STATUS[status] || { label: status, color: 'var(--text-muted)', bg: '#ffffff12' };
  return <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, color: m.color, background: m.bg, whiteSpace: 'nowrap' }}>{m.label}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: wide ? 620 : 500, maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--bg-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{title}</h2>
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

/* ─── Create SO Modal ───────────────────────────────────── */
function CreateSOModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [items, setItems]         = useState([]);
  const [lines, setLines]         = useState([{ item_id: '', qty: '', unit_price: '' }]);
  const [form, setForm] = useState({ customer_id: '', expected_delivery: '', payment_terms: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('id, code, name_ar, name_en').eq('is_active', true),
      supabase.from('items').select('id, code, name_ar, unit').in('type', ['finished_good', 'semi_finished']),
    ]).then(([c, i]) => { setCustomers(c.data ?? []); setItems(i.data ?? []); });
  }, []);

  const setLine = (i, k, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines(ls => [...ls, { item_id: '', qty: '', unit_price: '' }]);
  const remLine = (i) => setLines(ls => ls.filter((_, idx) => idx !== i));
  const total = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0), 0);

  const handleSubmit = async () => {
    if (!form.customer_id || lines.some(l => !l.item_id || !l.qty || !l.unit_price)) {
      setError('أكمل بيانات العميل وبنود الأمر'); return;
    }
    setSaving(true); setError('');
    try {
      const code = `SO-${today().replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: so, error: err } = await supabase.from('sales_orders').insert({
        code, customer_id: form.customer_id,
        expected_delivery: form.expected_delivery || null,
        payment_terms: form.payment_terms,
        notes: form.notes, status: 'draft',
        total_amount: total, created_by: user.id,
      }).select().single();
      if (err) throw err;
      await supabase.from('sales_order_lines').insert(
        lines.map(l => ({
          so_id: so.id, item_id: l.item_id,
          qty_ordered: parseFloat(l.qty),
          unit_price: parseFloat(l.unit_price),
          total_price: parseFloat(l.qty) * parseFloat(l.unit_price),
        }))
      );
      onCreated(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="🛒 أمر بيع جديد" onClose={onClose} wide>
      <FormField label="العميل" required>
        <select style={inputStyle} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
          <option value="">— اختر العميل —</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name_ar || c.name_en} ({c.code})</option>)}
        </select>
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="تاريخ التسليم">
          <input type="date" style={inputStyle} value={form.expected_delivery} onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} />
        </FormField>
        <FormField label="شروط الدفع">
          <select style={inputStyle} value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
            <option value="cash">نقدي</option>
            <option value="credit_15">آجل 15 يوم</option>
            <option value="credit_30">آجل 30 يوم</option>
            <option value="credit_60">آجل 60 يوم</option>
          </select>
        </FormField>
      </div>

      {/* Lines */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>المنتجات <span style={{ color: 'var(--danger)' }}>*</span></label>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select style={inputStyle} value={line.item_id} onChange={e => setLine(i, 'item_id', e.target.value)}>
              <option value="">— منتج —</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.name_ar} ({it.unit})</option>)}
            </select>
            <input type="number" placeholder="كمية" min="1" style={inputStyle} value={line.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
            <input type="number" placeholder="سعر" min="0" style={inputStyle} value={line.unit_price} onChange={e => setLine(i, 'unit_price', e.target.value)} />
            <button onClick={() => remLine(i)} disabled={lines.length === 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: lines.length === 1 ? .3 : 1 }}><X size={16} /></button>
          </div>
        ))}
        <button onClick={addLine} style={{ padding: '7px 14px', borderRadius: 9, border: '1px dashed var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> إضافة منتج
        </button>
      </div>

      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--success)11', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>إجمالي الأمر</span>
        <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.05rem' }}>{fmtCur(total)}</span>
      </div>

      <FormField label="ملاحظات">
        <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="تعليمات للتوصيل أو الفاتورة..." />
      </FormField>

      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--success)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? .7 : 1 }}>
          {saving ? <Spinner /> : <Check size={14} />} {saving ? 'جارٍ الحفظ...' : 'إنشاء الأمر'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── SO Card ───────────────────────────────────────────── */
function SOCard({ so, onRefresh }) {
  const [acting, setActing]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  const FLOW = { draft: 'confirmed', confirmed: 'shipped', shipped: 'delivered' };
  const FLOW_LABEL = { draft: 'تأكيد الأمر', confirmed: 'تسجيل الشحن', shipped: 'تأكيد التسليم' };
  const FLOW_COLOR = { draft: 'var(--info)', confirmed: 'var(--accent)', shipped: 'var(--success)' };

  const advance = async () => {
    const next = FLOW[so.status];
    if (!next) return;
    setActing(true);
    await supabase.from('sales_orders').update({ status: next }).eq('id', so.id);
    if (next === 'shipped') {
      // Deduct from inventory
      for (const line of so.lines ?? []) {
        await supabase.from('stock_movements').insert({ item_id: line.item_id, type: 'sales_out', qty: line.qty_ordered, notes: `شحن SO: ${so.code}` });
      }
    }
    onRefresh();
    setActing(false);
  };

  const payTermLabel = { cash: 'نقدي', credit_15: 'آجل 15 يوم', credit_30: 'آجل 30 يوم', credit_60: 'آجل 60 يوم' };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 16, overflow: 'hidden', transition: 'box-shadow .2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{so.code}</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Building2 size={11} /> {so.customer?.name_ar || '—'}
            </p>
          </div>
          <StatusBadge status={so.status} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.05rem' }}>{fmtCur(so.total_amount)}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <DollarSign size={10} /> {payTermLabel[so.payment_terms] || so.payment_terms}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {FLOW[so.status] && (
            <button onClick={advance} disabled={acting}
              style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', background: FLOW_COLOR[so.status], color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {acting ? <Spinner /> : <TrendingUp size={13} />} {FLOW_LABEL[so.status]}
            </button>
          )}
          {so.status === 'draft' && (
            <button onClick={async () => { await supabase.from('sales_orders').update({ status: 'cancelled' }).eq('id', so.id); onRefresh(); }}
              style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
              <X size={13} />
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : '', transition: 'transform .2s' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--bg-border)', padding: '12px 18px', background: 'var(--bg-secondary)' }}>
          {(so.lines ?? []).map((line, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bg-border)', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-primary)' }}>{line.item?.name_ar || '—'}</span>
              <span style={{ color: 'var(--text-muted)' }}>{fmt(line.qty_ordered)} × {fmtCur(line.unit_price)} = <strong style={{ color: 'var(--success)' }}>{fmtCur(line.total_price)}</strong></span>
            </div>
          ))}
          {so.expected_delivery && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>📅 التسليم المتوقع: {so.expected_delivery}</p>}
        </div>
      )}
    </div>
  );
}

/* ─── Main Screen ───────────────────────────────────────── */
export default function SalesScreen() {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [showCreate, setCreate]   = useState(false);
  const [refreshing, setRefresh]  = useState(false);

  const load = useCallback(async () => {
    setRefresh(true);
    try {
      const { data } = await supabase.from('sales_orders')
        .select(`id, code, status, total_amount, expected_delivery, payment_terms, notes, created_at,
                 customer:customers(id, name_ar, code),
                 lines:sales_order_lines(id, qty_ordered, unit_price, total_price, item_id, item:items(name_ar, unit))`)
        .eq('is_deleted', false).order('created_at', { ascending: false });
      setOrders(data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => !search || o.code.toLowerCase().includes(search.toLowerCase()) || (o.customer?.name_ar || '').includes(search));

  const totalRevenue = orders.filter(o => ['shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={22} color="var(--success)" /> المبيعات
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>{orders.length} أمر بيع · إيرادات: {fmtCur(totalRevenue)}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => setCreate(true)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--success)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem', fontWeight: 600 }}>
            <Plus size={16} /> أمر بيع جديد
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[{ label: 'إجمالي الأوامر', value: orders.length, color: 'var(--accent)', icon: FileText },
          { label: 'مؤكد/شحن', value: orders.filter(o => ['confirmed','shipped'].includes(o.status)).length, color: 'var(--warning)', icon: Truck },
          { label: 'مُسلَّم',   value: orders.filter(o => o.status === 'delivered').length, color: 'var(--success)', icon: CheckCircle2 },
          { label: 'الإيرادات', value: fmtCur(totalRevenue), color: 'var(--success)', icon: DollarSign },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <k.icon size={15} color={k.color} />
            </div>
            <p style={{ fontSize: typeof k.value === 'string' ? '0.9rem' : '1.35rem', fontWeight: 700, color: k.color }}>{k.value}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" placeholder="ابحث..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingInlineStart: 34 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 150 }}>
          <option value="all">كل الحالات</option>
          {Object.entries(SO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 160, borderRadius: 16, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <TrendingUp size={48} style={{ opacity: .3, marginBottom: 16 }} />
          <p style={{ fontWeight: 600 }}>لا توجد أوامر بيع بعد</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(so => <SOCard key={so.id} so={so} onRefresh={load} />)}
        </div>
      )}

      {showCreate && <CreateSOModal onClose={() => setCreate(false)} onCreated={load} />}
      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:.9}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
