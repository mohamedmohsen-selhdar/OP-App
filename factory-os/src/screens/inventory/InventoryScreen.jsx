import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Package, Search, Plus, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, RefreshCw, X, Check, Loader2,
  Warehouse, BarChart3, TrendingDown, Filter,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) => (+(n ?? 0)).toLocaleString('ar-EG');
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--bg-border)', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box',
};

function Spinner() {
  return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--bg-border)' }}>
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

/* ─── Adjust Stock Modal ──────────────────────────────────── */
function AdjustModal({ item, warehouse, currentQty, onClose, onDone }) {
  const { user } = useAuth();
  if (!item || !warehouse) return null;
  const [type, setType]       = useState('in');
  const [qty, setQty]         = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    const q = parseFloat(qty);
    if (!q || q <= 0) { setError('أدخل كمية صحيحة'); return; }
    if (type === 'out' && q > currentQty) { setError('الكمية المطلوبة أكبر من المخزون المتاح'); return; }
    setSaving(true); setError('');
    try {
      const delta = type === 'in' ? q : -q;

      // Insert stock movement
      await supabase.from('stock_movements').insert({
        item_id: item.id,
        warehouse_id: warehouse.id,
        type: type === 'in' ? 'manual_in' : 'manual_out',
        qty: q,
        notes,
        created_by: user.id,
      });

      // Upsert inventory
      const { data: existing } = await supabase
        .from('inventory').select('id, qty_on_hand').eq('item_id', item.id).eq('warehouse_id', warehouse.id).single();

      if (existing) {
        await supabase.from('inventory')
          .update({ qty_on_hand: Math.max(0, existing.qty_on_hand + delta), last_counted: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('inventory').insert({
          item_id: item.id, warehouse_id: warehouse.id,
          qty_on_hand: Math.max(0, delta), qty_reserved: 0,
        });
      }
      onDone(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`⚖️ تعديل مخزون — ${item.name_ar || item.name_en}`} onClose={onClose}>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--info)11', marginBottom: 16, fontSize: '0.82rem', color: 'var(--info)' }}>
        المخزون الحالي: <strong>{fmt(currentQty)}</strong> {item.unit} · {warehouse.name_ar}
      </div>

      <FormField label="نوع الحركة" required>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[{ k: 'in', label: 'إضافة مخزون', icon: ArrowUpCircle, color: 'var(--success)' },
            { k: 'out', label: 'سحب مخزون', icon: ArrowDownCircle, color: 'var(--danger)' }].map(t => (
            <button key={t.k} onClick={() => setType(t.k)}
              style={{ padding: '12px 8px', borderRadius: 10, border: `2px solid ${type === t.k ? t.color : 'var(--bg-border)'}`, background: type === t.k ? `${t.color}18` : 'none', color: type === t.k ? t.color : 'var(--text-muted)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, transition: 'all .2s' }}>
              <t.icon size={20} /> {t.label}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="الكمية" required>
        <input type="number" min="0.01" step="0.01" style={inputStyle} value={qty}
          onChange={e => setQty(e.target.value)} placeholder="أدخل الكمية..." />
      </FormField>

      <FormField label="ملاحظات">
        <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={notes}
          onChange={e => setNotes(e.target.value)} placeholder="سبب التعديل..." />
      </FormField>

      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={saving}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: type === 'in' ? 'var(--success)' : 'var(--danger)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? .7 : 1 }}>
          {saving ? <Spinner /> : <Check size={14} />} {saving ? 'جارٍ الحفظ...' : 'تأكيد التعديل'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Movement History Modal ──────────────────────────────── */
function HistoryModal({ item, onClose }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    supabase.from('stock_movements')
      .select('id, type, qty, notes, created_at, warehouse:warehouses(name_ar), by:user_profiles(name_en)')
      .eq('item_id', item.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setMovements(data ?? []); setLoading(false); });
  }, [item.id]);

  const typeLabel = {
    manual_in: { label: 'إضافة يدوية', color: 'var(--success)' },
    manual_out: { label: 'سحب يدوي', color: 'var(--danger)' },
    production_in: { label: 'إنتاج', color: 'var(--accent)' },
    production_out: { label: 'استهلاك إنتاج', color: 'var(--warning)' },
    purchase_in: { label: 'استلام مشتريات', color: 'var(--info)' },
  };

  return (
    <Modal title={`📦 حركات المخزون — ${item.name_ar}`} onClose={onClose}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
      ) : movements.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>لا توجد حركات مسجلة</p>
      ) : movements.map(m => {
        const meta = typeLabel[m.type] || { label: m.type, color: 'var(--text-muted)' };
        const isIn = m.type.includes('_in');
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--bg-border)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isIn ? <ArrowUpCircle size={14} color={meta.color} /> : <ArrowDownCircle size={14} color={meta.color} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{meta.label}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.warehouse?.name_ar} · {m.notes || '—'}</p>
            </div>
            <div style={{ textAlign: 'end' }}>
              <p style={{ fontWeight: 700, color: meta.color, fontSize: '0.9rem' }}>
                {isIn ? '+' : '-'}{fmt(m.qty)}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {new Date(m.created_at).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>
        );
      })}
    </Modal>
  );
}

/* ─── Inventory Row ──────────────────────────────────────── */
function InventoryRow({ inv, onAdjust, onHistory }) {
  const qty    = inv.qty_on_hand ?? 0;
  const avail  = inv.qty_available ?? 0;
  const min    = inv.item?.min_stock ?? 0;
  const isLow  = avail <= min && min > 0;
  const isZero = avail <= 0;

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${isZero ? 'var(--danger)44' : isLow ? 'var(--warning)44' : 'var(--bg-border)'}`,
      borderRadius: 14, padding: '14px 16px',
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center',
      transition: 'transform .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = ''}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {inv.item?.name_ar || inv.item?.name_en}
          </span>
          {isZero && <span style={{ fontSize: '0.68rem', color: 'var(--danger)', background: 'var(--danger)18', padding: '2px 8px', borderRadius: 99 }}>نفد المخزون</span>}
          {!isZero && isLow && <span style={{ fontSize: '0.68rem', color: 'var(--warning)', background: 'var(--warning)18', padding: '2px 8px', borderRadius: 99 }}>مخزون منخفض</span>}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span><strong style={{ color: isZero ? 'var(--danger)' : 'var(--text-primary)' }}>{fmt(avail)}</strong> {inv.item?.unit} متاح</span>
          <span>محجوز: {fmt(inv.qty_reserved ?? 0)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Warehouse size={10} /> {inv.warehouse?.name_ar}</span>
          <span>الحد الأدنى: {fmt(min)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onHistory(inv.item)}
          style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
          <BarChart3 size={13} />
        </button>
        <button onClick={() => onAdjust(inv)}
          style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
          تعديل
        </button>
      </div>
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────────── */
export default function InventoryScreen() {
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [warehouseFilter, setWfilt] = useState('all');
  const [warehouses, setWarehouses] = useState([]);
  const [adjustTarget, setAdjust]   = useState(null); // { item, warehouse, currentQty }
  const [historyItem, setHistory]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLowOnly, setLowOnly]   = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [{ data: invData }, { data: whData }] = await Promise.all([
        supabase.from('inventory').select(`
          id, qty_on_hand, qty_reserved, qty_available, last_counted,
          item:items(id, code, name_ar, name_en, unit, min_stock, type),
          warehouse:warehouses(id, code, name_ar)
        `).order('qty_available'),
        supabase.from('warehouses').select('id, code, name_ar').eq('is_active', true),
      ]);
      setInventory(invData ?? []);
      setWarehouses(whData ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = inventory
    .filter(i => warehouseFilter === 'all' || i.warehouse?.id === warehouseFilter)
    .filter(i => !showLowOnly || (i.qty_available ?? 0) <= (i.item?.min_stock ?? 0))
    .filter(i => !search || (i.item?.name_ar || i.item?.name_en || '').toLowerCase().includes(search.toLowerCase()) || (i.item?.code || '').toLowerCase().includes(search.toLowerCase()));

  const totalItems  = inventory.length;
  const lowItems    = inventory.filter(i => (i.qty_available ?? 0) <= (i.item?.min_stock ?? 1) && (i.item?.min_stock ?? 0) > 0).length;
  const zeroItems   = inventory.filter(i => (i.qty_available ?? 0) <= 0).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={22} color="var(--accent)" /> إدارة المخزون
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
            {totalItems} صنف · <span style={{ color: 'var(--warning)' }}>{lowItems} منخفض</span> · <span style={{ color: 'var(--danger)' }}>{zeroItems} نفد</span>
          </p>
        </div>
        <button onClick={load} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'إجمالي الأصناف', value: totalItems, color: 'var(--accent)', icon: Package },
          { label: 'مخزون منخفض', value: lowItems, color: 'var(--warning)', icon: AlertTriangle },
          { label: 'نفد المخزون', value: zeroItems, color: 'var(--danger)', icon: TrendingDown },
          { label: 'المستودعات', value: warehouses.length, color: 'var(--info)', icon: Warehouse },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <k.icon size={16} color={k.color} />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: k.color }}>{k.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" placeholder="ابحث عن صنف..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingInlineStart: 34 }} />
        </div>
        <select value={warehouseFilter} onChange={e => setWfilt(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 150 }}>
          <option value="all">كل المستودعات</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar} ({w.code})</option>)}
        </select>
        <button onClick={() => setLowOnly(v => !v)}
          style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${showLowOnly ? 'var(--warning)' : 'var(--bg-border)'}`, background: showLowOnly ? 'var(--warning)18' : 'none', color: showLowOnly ? 'var(--warning)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
          <Filter size={13} /> المنخفض فقط
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ opacity: .3, marginBottom: 16 }} />
          <p style={{ fontWeight: 600 }}>لا توجد أصناف</p>
          <p style={{ fontSize: '0.82rem', marginTop: 6 }}>ابدأ بإضافة أصناف وتسجيل المخزون</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(inv => (
            <InventoryRow
              key={inv.id}
              inv={inv}
              onAdjust={inv => inv.item && inv.warehouse && setAdjust({ item: inv.item, warehouse: inv.warehouse, currentQty: inv.qty_available ?? 0, invId: inv.id })}
              onHistory={item => setHistory(item)}
            />
          ))}
        </div>
      )}

      {adjustTarget && (
        <AdjustModal
          item={adjustTarget.item}
          warehouse={adjustTarget.warehouse}
          currentQty={adjustTarget.currentQty}
          onClose={() => setAdjust(null)}
          onDone={load}
        />
      )}
      {historyItem && <HistoryModal item={historyItem} onClose={() => setHistory(null)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.9} }
        @keyframes spin  { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  );
}
