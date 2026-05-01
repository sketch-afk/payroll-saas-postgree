'use client';
import { useState, useEffect } from 'react';

const LEAVE_TYPES = ['CASUAL','SICK','EARNED','MATERNITY','PATERNITY'];
const TYPE_COLORS = { CASUAL:'#C9963A', SICK:'#E05A5A', EARNED:'#3DBF82', MATERNITY:'#8E8EAD', PATERNITY:'#5C5C85' };

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function LeavesPage() {
  const [leaves, setLeaves]       = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({
    emp_id:'', leave_type:'CASUAL', from_date:'', to_date:'', reason:'',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function fetchLeaves(status) {
    setLoading(true);
    const s = status ?? filterStatus;
    const url = s ? `/api/leaves?status=${s}` : '/api/leaves';
    fetch(url).then(r => r.json())
      .then(d => { setLeaves(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(d => setEmployees(d.data || []));
  }, []);

  useEffect(() => { fetchLeaves(); }, [filterStatus]);

  async function applyLeave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModal(false); setForm({ emp_id:'', leave_type:'CASUAL', from_date:'', to_date:'', reason:'' });
      fetchLeaves();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function updateStatus(leave_id, status) {
    await fetch('/api/leaves', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leave_id, status }),
    });
    fetchLeaves();
  }

  // POSTGRES FIX: lowercase status
  const pending  = leaves.filter(l => l.status === 'PENDING').length;
  const approved = leaves.filter(l => l.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="anim-up">
          <div className="font-mono text-xs mb-1" style={{ color:'#3A3A5C' }}>◐ Leaves</div>
          <h1 className="page-title">Leave <span style={{ color:'#C9963A' }}>Management</span></h1>
          <p className="page-subtitle">{pending} pending · {approved} approved this period</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary anim-up">＋ Apply Leave</button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 anim-up delay-1">
        {[
          { label:'Pending',  val:'PENDING',  color:'#E0A03A' },
          { label:'Approved', val:'APPROVED', color:'#3DBF82' },
          { label:'Rejected', val:'REJECTED', color:'#E05A5A' },
          { label:'All',      val:'',         color:'#5C5C85' },
        ].map(t => (
          <button key={t.val} onClick={() => setFilterStatus(t.val)}
            className="font-display font-bold text-sm px-4 py-2 rounded-xl border transition-all"
            style={{
              borderColor: filterStatus === t.val ? t.color : 'rgba(255,255,255,0.06)',
              color:  filterStatus === t.val ? t.color : '#5C5C85',
              background: filterStatus === t.val ? `${t.color}12` : 'transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden anim-up delay-2">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-20">
            <div style={{ fontSize:48 }} className="mb-3">🗓️</div>
            <p className="font-display font-bold" style={{ color:'#5C5C85' }}>No leave records</p>
            <p className="text-sm mt-1 mb-5" style={{ color:'#3A3A5C' }}>
              {filterStatus ? `No ${filterStatus.toLowerCase()} leaves` : 'Apply a leave to get started'}
            </p>
            <button onClick={() => setModal(true)} className="btn-primary">＋ Apply Leave</button>
          </div>
        ) : (
          <table className="w-full tbl">
            <thead>
              <tr>
                <th className="text-left pl-6">Employee</th>
                <th className="text-left">Type</th>
                <th className="text-left">Period</th>
                <th className="text-center">Days</th>
                <th className="text-left">Reason</th>
                <th className="text-left">Applied</th>
                <th className="text-left">Status</th>
                <th className="text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.leave_id}> {/* POSTGRES FIX: lowercase */}
                  <td className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                           style={{ background:'rgba(201,150,58,0.12)', color:'#C9963A' }}>
                        {/* POSTGRES FIX: lowercase full_name */}
                        {l.full_name?.[0]}
                      </div>
                      <div>
                        {/* POSTGRES FIX: lowercase full_name and dept_name */}
                        <div className="font-medium text-sm" style={{ color:'#EEEEF5' }}>{l.full_name}</div>
                        <div className="text-xs" style={{ color:'#3A3A5C' }}>{l.dept_name||'—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs font-display font-bold px-2.5 py-1 rounded-full"
                          style={{
                            // POSTGRES FIX: lowercase leave_type
                            background: `${TYPE_COLORS[l.leave_type]||'#5C5C85'}15`,
                            color: TYPE_COLORS[l.leave_type]||'#5C5C85',
                          }}>
                      {l.leave_type}
                    </span>
                  </td>
                  <td className="font-mono text-xs" style={{ color:'#5C5C85' }}>
                    {/* POSTGRES FIX: lowercase from_date and to_date */}
                    {new Date(l.from_date).toLocaleDateString('en-IN')} →{' '}
                    {new Date(l.to_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="text-center font-mono font-bold" style={{ color:'#C9963A' }}>{l.days}</td> {/* POSTGRES FIX: lowercase */}
                  <td className="text-sm" style={{ color:'#5C5C85', maxWidth:200 }}>
                    {/* POSTGRES FIX: lowercase reason */}
                    <span className="truncate block" style={{ maxWidth:180 }}>{l.reason||'—'}</span>
                  </td>
                  <td className="font-mono text-xs" style={{ color:'#3A3A5C' }}>
                    {/* POSTGRES FIX: lowercase applied_at */}
                    {l.applied_at ? new Date(l.applied_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    {/* POSTGRES FIX: lowercase status */}
                    <span className={`badge badge-${(l.status||'').toLowerCase()}`}>{l.status}</span>
                  </td>
                  <td className="text-right pr-6">
                    {/* POSTGRES FIX: lowercase status and leave_id */}
                    {l.status === 'PENDING' && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => updateStatus(l.leave_id,'APPROVED')}
                          className="text-xs font-display font-bold px-2.5 py-1 rounded-lg border transition-all"
                          style={{ color:'#3DBF82', borderColor:'rgba(61,191,130,0.2)', background:'rgba(61,191,130,0.05)' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(61,191,130,0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background='rgba(61,191,130,0.05)'}>
                          ✓ Approve
                        </button>
                        <button onClick={() => updateStatus(l.leave_id,'REJECTED')}
                          className="btn-danger">
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}>
        <form onSubmit={applyLeave}>
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b"
               style={{ borderColor:'rgba(201,150,58,0.1)' }}>
            <h2 className="font-display font-bold text-xl" style={{ color:'#C9963A' }}>Apply Leave</h2>
            <button type="button" onClick={() => setModal(false)}
              className="text-2xl leading-none" style={{ color:'#3A3A5C' }}>×</button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Employee *</label>
              <select value={form.emp_id} onChange={set('emp_id')} required className="field">
                <option value="">Select Employee</option>
                {/* POSTGRES FIX: lowercase emp_id and full_name */}
                {employees.map(e => <option key={e.emp_id} value={e.emp_id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Leave Type</label>
              <select value={form.leave_type} onChange={set('leave_type')} className="field">
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">From Date *</label>
                <input type="date" value={form.from_date} onChange={set('from_date')} required className="field" />
              </div>
              <div>
                <label className="label">To Date *</label>
                <input type="date" value={form.to_date} onChange={set('to_date')} required className="field" />
              </div>
            </div>
            <div>
              <label className="label">Reason</label>
              <textarea value={form.reason} onChange={set('reason')} rows={3}
                placeholder="Optional reason…" className="field" style={{ resize:'vertical' }} />
            </div>
            {error && <div className="banner-error">{error}</div>}
          </div>
          <div className="px-6 pb-6 flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Submitting…' : 'Apply Leave'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}