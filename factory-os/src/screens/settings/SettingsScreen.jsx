import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sendEmail } from '../../lib/emailNotifications';
import {
  Settings, Users, Shield, Factory, Warehouse,
  Plus, Search, X, Check, Loader2, RefreshCw,
  UserCheck, UserX, Edit2, ChevronDown, Building2,
  Key, AlertTriangle,
} from 'lucide-react';

/* ─── Helpers ──────────────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid var(--bg-border)', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box',
};
const TABS = [
  { key: 'users',       icon: Users,     label: 'المستخدمون' },
  { key: 'roles',       icon: Shield,    label: 'الأدوار' },
  { key: 'lines',       icon: Factory,   label: 'خطوط الإنتاج' },
  { key: 'warehouses',  icon: Warehouse, label: 'المستودعات' },
  { key: 'branding',    icon: Shield,    label: 'الهوية البصرية' },
];
function Spinner() { return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />; }

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
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

/* ═══════════════════════════════════════════════
   TAB 1 — USERS
═══════════════════════════════════════════════ */
function InviteUserModal({ roles, onClose, onDone }) {
  const [form, setForm] = useState({ email: '', name_ar: '', name_en: '', role_id: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.name_ar || !form.role_id || !form.password) {
      setError('يرجى ملء جميع الحقول المطلوبة'); return;
    }
    setSaving(true); setError('');
    try {
      // Sign up with email/password
      const { data: created, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name_ar: form.name_ar, name_en: form.name_en } },
      });
      if (authErr) throw authErr;

      // Upsert profile with role
      if (created?.user) {
        await supabase.from('user_profiles').upsert({
          id: created.user.id,
          name_ar: form.name_ar,
          name_en: form.name_en || form.name_ar,
          role_id: form.role_id,
        });
      }

      onDone(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="➕ دعوة مستخدم جديد" onClose={onClose}>
      <FormField label="البريد الإلكتروني" required>
        <input type="email" style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@factory.com" />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="الاسم بالعربية" required>
          <input type="text" style={inputStyle} value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="محمد أحمد" />
        </FormField>
        <FormField label="الاسم بالإنجليزية">
          <input type="text" style={inputStyle} value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Mohamed Ahmed" />
        </FormField>
      </div>
      <FormField label="الدور الوظيفي" required>
        <select style={inputStyle} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
          <option value="">— اختر الدور —</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name_ar} ({r.code})</option>)}
        </select>
      </FormField>
      <FormField label="كلمة المرور المؤقتة" required>
        <input type="password" style={inputStyle} value={form.password} onChange={e => set('password', e.target.value)} placeholder="8 أحرف على الأقل" />
      </FormField>
      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? .7 : 1 }}>
          {saving ? <Spinner /> : <Check size={14} />} {saving ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
        </button>
      </div>
    </Modal>
  );
}

function EditUserRoleModal({ user: u, roles, onClose, onDone }) {
  const [roleId, setRoleId] = useState(u.role_id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('user_profiles').update({ role_id: roleId }).eq('id', u.id);
    onDone(); onClose();
    setSaving(false);
  };

  return (
    <Modal title={`✏️ تعديل دور — ${u.name_ar}`} onClose={onClose}>
      <FormField label="الدور الوظيفي" required>
        <select style={inputStyle} value={roleId} onChange={e => setRoleId(e.target.value)}>
          <option value="">— بدون دور —</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name_ar} ({r.code})</option>)}
        </select>
      </FormField>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
          {saving ? <Spinner /> : <Check size={14} />} حفظ
        </button>
      </div>
    </Modal>
  );
}

function UsersTab({ roles }) {
  const { profile: me } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showInvite, setInvite] = useState(false);
  const [editUser, setEdit]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('user_profiles')
      .select('id, name_ar, name_en, role_id, created_at, role:roles(id, code, name_ar)')
      .order('created_at');
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => !search || (u.name_ar || '').includes(search) || (u.name_en || '').toLowerCase().includes(search.toLowerCase()));

  const roleColors = {
    owner: 'var(--warning)', factory_manager: 'var(--accent)',
    production_supervisor: 'var(--info)', quality_inspector: 'var(--success)',
    warehouse_keeper: 'var(--text-muted)', maintenance_tech: 'var(--danger)',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" placeholder="ابحث عن مستخدم..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingInlineStart: 34 }} />
        </div>
        <button onClick={() => setInvite(true)} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> مستخدم جديد
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 68, borderRadius: 14, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => {
            const isMe = u.id === me?.id;
            const roleColor = roleColors[u.role?.code] || 'var(--text-muted)';
            return (
              <div key={u.id} style={{ background: 'var(--bg-card)', border: `1px solid ${isMe ? 'var(--accent)44' : 'var(--bg-border)'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '1rem', flexShrink: 0 }}>
                  {(u.name_ar || u.name_en || 'U')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {u.name_ar || u.name_en} {isMe && <span style={{ fontSize: '0.68rem', color: 'var(--accent)', background: 'var(--accent)18', padding: '1px 7px', borderRadius: 99 }}>أنت</span>}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {u.name_en}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {u.role ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, color: roleColor, background: `${roleColor}18` }}>
                      {u.role.name_ar}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--danger)', background: 'var(--danger)18', padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={10} /> بدون دور
                    </span>
                  )}
                  <button onClick={() => setEdit(u)}
                    style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showInvite && <InviteUserModal roles={roles} onClose={() => setInvite(false)} onDone={load} />}
      {editUser   && <EditUserRoleModal user={editUser} roles={roles} onClose={() => setEdit(null)} onDone={load} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 2 — ROLES
═══════════════════════════════════════════════ */
const MODULE_LABELS = {
  production: 'الإنتاج', inventory: 'المخزون', quality: 'الجودة',
  maintenance: 'الصيانة', procurement: 'المشتريات', sales: 'المبيعات', settings: 'الإعدادات',
};
const ACTION_LABELS = { view: 'عرض', create: 'إنشاء', edit: 'تعديل', delete: 'حذف', approve: 'اعتماد' };

function RolesTab() {
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpand] = useState(null);

  useEffect(() => {
    supabase.from('roles').select('*').then(({ data }) => { setRoles(data ?? []); setLoading(false); });
  }, []);

  return (
    <div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16, padding: '10px 14px', background: 'var(--info)11', borderRadius: 10, border: '1px solid var(--info)33' }}>
        ℹ️ هذه الأدوار معرّفة مسبقاً. كل دور يتحكم في الوصول لكل وحدة في النظام.
      </p>
      {loading ? <div style={{ height: 200, borderRadius: 14, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roles.map(role => {
            const perms = role.permissions || {};
            const isOwner = perms['*'];
            const isOpen = expanded === role.id;
            const roleColor = { owner: 'var(--warning)', factory_manager: 'var(--accent)', production_supervisor: 'var(--info)', quality_inspector: 'var(--success)', warehouse_keeper: 'var(--text-muted)', maintenance_tech: 'var(--danger)' }[role.code] || 'var(--text-muted)';

            return (
              <div key={role.id} style={{ background: 'var(--bg-card)', border: `1px solid ${isOwner ? 'var(--warning)44' : 'var(--bg-border)'}`, borderRadius: 14, overflow: 'hidden' }}>
                <button onClick={() => setExpand(isOpen ? null : role.id)}
                  style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${roleColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Shield size={16} color={roleColor} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{role.name_ar}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{role.code}</p>
                  </div>
                  {isOwner && <span style={{ fontSize: '0.7rem', color: 'var(--warning)', background: 'var(--warning)18', padding: '2px 9px', borderRadius: 99, fontWeight: 700 }}>صلاحيات كاملة</span>}
                  <ChevronDown size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform .2s', flexShrink: 0 }} />
                </button>

                {isOpen && !isOwner && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--bg-border)' }}>
                    <div style={{ overflowX: 'auto', marginTop: 14 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'start', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>الوحدة</th>
                            {Object.keys(ACTION_LABELS).map(a => <th key={a} style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{ACTION_LABELS[a]}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(MODULE_LABELS).map(([mod, label]) => (
                            <tr key={mod} style={{ borderTop: '1px solid var(--bg-border)' }}>
                              <td style={{ padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{label}</td>
                              {Object.keys(ACTION_LABELS).map(action => {
                                const val = perms[mod]?.[action];
                                return (
                                  <td key={action} style={{ padding: '8px', textAlign: 'center' }}>
                                    {val === true ? <span style={{ color: 'var(--success)', fontSize: '1rem' }}>✓</span>
                                      : val === false ? <span style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>✕</span>
                                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>—</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {isOpen && isOwner && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid var(--bg-border)', color: 'var(--warning)', fontSize: '0.82rem' }}>
                    ⭐ هذا الدور لديه وصول كامل لجميع وحدات النظام دون قيود.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 3 — PRODUCTION LINES
═══════════════════════════════════════════════ */
function AddLineModal({ onClose, onDone }) {
  const [form, setForm] = useState({ code: '', name_ar: '', name_en: '', capacity_per_hour: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.code || !form.name_ar) { setError('الكود والاسم مطلوبان'); return; }
    setSaving(true); setError('');
    try {
      await supabase.from('production_lines').insert({
        code: form.code, name_ar: form.name_ar, name_en: form.name_en,
        capacity_per_hour: parseFloat(form.capacity_per_hour) || null,
        is_active: true,
      });
      onDone(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="➕ إضافة خط إنتاج" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="الكود" required>
          <input type="text" style={inputStyle} value={form.code} onChange={e => set('code', e.target.value)} placeholder="LINE-04" />
        </FormField>
        <FormField label="الطاقة/ساعة">
          <input type="number" style={inputStyle} value={form.capacity_per_hour} onChange={e => set('capacity_per_hour', e.target.value)} placeholder="500" />
        </FormField>
      </div>
      <FormField label="الاسم بالعربية" required>
        <input type="text" style={inputStyle} value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="خط الإنتاج الرابع" />
      </FormField>
      <FormField label="الاسم بالإنجليزية">
        <input type="text" style={inputStyle} value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Production Line 4" />
      </FormField>
      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
          {saving ? <Spinner /> : <Check size={14} />} {saving ? 'جارٍ الحفظ...' : 'إضافة'}
        </button>
      </div>
    </Modal>
  );
}

function LinesTab() {
  const [lines, setLines]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setAdd]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('production_lines').select('*').order('code');
    setLines(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id, val) => {
    await supabase.from('production_lines').update({ is_active: !val }).eq('id', id);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setAdd(true)} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem' }}>
          <Plus size={16} /> خط إنتاج جديد
        </button>
      </div>
      {loading ? <div style={{ height: 200, borderRadius: 14, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lines.map(line => (
            <div key={line.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: line.is_active ? 'var(--success)18' : 'var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Factory size={16} color={line.is_active ? 'var(--success)' : 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{line.name_ar}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{line.code} {line.capacity_per_hour ? `· طاقة: ${line.capacity_per_hour}/ساعة` : ''}</p>
              </div>
              <button onClick={() => toggle(line.id, line.is_active)}
                style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${line.is_active ? 'var(--success)' : 'var(--bg-border)'}`, background: line.is_active ? 'var(--success)18' : 'none', color: line.is_active ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                {line.is_active ? 'نشط' : 'معطّل'}
              </button>
            </div>
          ))}
        </div>
      }
      {showAdd && <AddLineModal onClose={() => setAdd(false)} onDone={load} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 4 — WAREHOUSES
═══════════════════════════════════════════════ */
function AddWarehouseModal({ onClose, onDone }) {
  const [form, setForm] = useState({ code: '', name_ar: '', name_en: '', type: 'raw_material', location: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.code || !form.name_ar) { setError('الكود والاسم مطلوبان'); return; }
    setSaving(true); setError('');
    try {
      await supabase.from('warehouses').insert({
        code: form.code, name_ar: form.name_ar, name_en: form.name_en,
        type: form.type, location: form.location, is_active: true,
      });
      onDone(); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="➕ إضافة مستودع" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="الكود" required>
          <input type="text" style={inputStyle} value={form.code} onChange={e => set('code', e.target.value)} placeholder="WH-03" />
        </FormField>
        <FormField label="النوع" required>
          <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="raw_material">مواد خام</option>
            <option value="finished_good">منتجات تامة</option>
            <option value="semi_finished">نصف مصنعة</option>
            <option value="general">عام</option>
          </select>
        </FormField>
      </div>
      <FormField label="الاسم بالعربية" required>
        <input type="text" style={inputStyle} value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="مستودع المواد الخام 2" />
      </FormField>
      <FormField label="الموقع">
        <input type="text" style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="المبنى A - الطابق الأرضي" />
      </FormField>
      {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger)18', color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 14 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--bg-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
          {saving ? <Spinner /> : <Check size={14} />} {saving ? 'جارٍ الحفظ...' : 'إضافة'}
        </button>
      </div>
    </Modal>
  );
}

function WarehousesTab() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setAdd]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('warehouses').select('*').order('code');
    setWarehouses(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const typeLabel = { raw_material: 'مواد خام', finished_good: 'منتجات تامة', semi_finished: 'نصف مصنعة', general: 'عام' };
  const typeColor = { raw_material: 'var(--info)', finished_good: 'var(--success)', semi_finished: 'var(--warning)', general: 'var(--text-muted)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setAdd(true)} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem' }}>
          <Plus size={16} /> مستودع جديد
        </button>
      </div>
      {loading ? <div style={{ height: 200, borderRadius: 14, background: 'var(--bg-border)', animation: 'pulse 1.5s infinite' }} /> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {warehouses.map(wh => (
            <div key={wh.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${typeColor[wh.type] || 'var(--accent)'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Warehouse size={16} color={typeColor[wh.type] || 'var(--accent)'} />
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, color: typeColor[wh.type], background: `${typeColor[wh.type]}18` }}>
                  {typeLabel[wh.type] || wh.type}
                </span>
              </div>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: 4 }}>{wh.name_ar}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wh.code}</p>
              {wh.location && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>📍 {wh.location}</p>}
            </div>
          ))}
        </div>
      }
      {showAdd && <AddWarehouseModal onClose={() => setAdd(false)} onDone={load} />}
    </div>
  );
}

function BrandingTab() {
  const { profile } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendTest = async () => {
    if (!profile?.email) return;
    setSending(true);
    setSent(false);
    setError('');
    try {
      await sendEmail({
        to: profile.email,
        subject_ar: 'اختبار الهوية الجديدة — FLAPP',
        subject_en: 'Branding Test — FLAPP',
        body_ar: 'هذا بريد إلكتروني تجريبي لاستعراض الهوية البصرية الجديدة لنظام FLAPP. تم تحديث الشعار والألوان بنجاح.',
        body_en: 'This is a test email to preview the new visual identity for FLAPP. The logo and colors have been successfully updated.',
        lang: 'ar'
      });
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ 
        fontFamily: "'Outfit', sans-serif", 
        fontSize: '3rem', 
        fontWeight: 900, 
        letterSpacing: '-2px',
        marginBottom: 20
      }}>
        <span style={{ color: 'var(--text-primary)' }}>FL</span><span style={{ color: '#b91c1c' }}>APP</span>
      </div>
      <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>اختبار التنبيهات</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto 24px' }}>
        اضغط على الزر أدناه لإرسال بريد إلكتروني تجريبي إلى بريدك المسجل ليتم استعراض الشعار الجديد والألوان على هاتفك.
      </p>
      
      <button 
        onClick={handleSendTest} 
        disabled={sending}
        style={{ 
          padding: '12px 24px', 
          borderRadius: 12, 
          border: 'none', 
          background: sent ? 'var(--success)' : 'var(--accent)', 
          color: '#fff', 
          fontWeight: 700, 
          cursor: sending ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '0 auto'
        }}
      >
        {sending ? <Spinner /> : sent ? <Check size={18} /> : <RefreshCw size={18} />}
        {sending ? 'جارٍ الإرسال...' : sent ? 'تم الإرسال بنجاح!' : 'إرسال بريد تجريبي'}
      </button>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 16 }}>
          ⚠️ فشل الإرسال: {error}
        </p>
      )}

      {sent && (
        <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: 16 }}>
          تحقق من بريدك الإلكتروني الآن (أو مجلد Junk/Spam)
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
export default function SettingsScreen() {
  const [activeTab, setTab] = useState('users');
  const [roles, setRoles]   = useState([]);

  useEffect(() => {
    supabase.from('roles').select('*').then(({ data }) => setRoles(data ?? []));
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={22} color="var(--accent)" /> الإعدادات
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
          إدارة المستخدمين، الأدوار، خطوط الإنتاج، والمستودعات
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setTab(tab.key)}
            style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--bg-border)'}`, background: activeTab === tab.key ? 'var(--accent)' : 'none', color: activeTab === tab.key ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: activeTab === tab.key ? 700 : 400, display: 'flex', alignItems: 'center', gap: 7, transition: 'all .2s' }}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 18, padding: 20 }}>
        {activeTab === 'users'      && <UsersTab roles={roles} />}
        {activeTab === 'roles'      && <RolesTab />}
        {activeTab === 'lines'      && <LinesTab />}
        {activeTab === 'warehouses' && <WarehousesTab />}
        {activeTab === 'branding'   && <BrandingTab />}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.9} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
