'use client';
import { useState, useEffect } from 'react';

const ICONS = ['🏗️','🤝','💼','📢','⚙️','🔬','📦','🎨','🚀','📐'];

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const [depts, setDepts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ dept_name:'', location:'' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function fetchDepts() {
    setLoading(true);
    fetch('/api/departments').then(r => r.json())
      .then(d => { setDepts(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchDepts(); }, []);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/departments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModal(false); setForm({ dept_name:'', location:'' }); fetchDepts();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function deleteDept(id) {
    if (!confirm('Delete this department? Employees will be unassigned.')) return;
    await fetch('/api/departments', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dept_id: id }),
    });
    fetchDepts();
  }

  const totalHead  = depts.reduce((s, d) => s + Number(d.employee_count||0), 0);
  const totalPayrl = depts.reduce((s, d) => s + Number(d.total_payroll||0), 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="anim-up">
          <div className="font-mono text-xs mb-1" style={{ color:'#3A3A5C' }}>◍ Departments</div>
          <h1 className="page-title">Organisation <span style={{ color:'#C9963A' }}>Structure</span></h1>
          <p className="page-subtitle">{depts.length} departments · {totalHead} people</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary anim-up">＋ New Department</button>
      </div>

      {/* Summary */}
      <div className="glass rounded-2xl p-5 flex flex-wrap gap-8 anim-up delay-1">
        <div>
          <div className="label">Total Headcount</div>
          <div className="font-mono font-extrabold text-2xl" style={{ color:'#C9963A' }}>{totalHead}</div>
        </div>
        <div className="w-px" style={{ background:'rgba(201,150,58,0.1)' }} />
        <div>
          <div className="label">Monthly Payroll</div>
          <div className="font-mono font-extrabold text-2xl" style={{ color:'#3DBF82' }}>
            ₹{totalPayrl.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="w-px" style={{ background:'rgba(201,150,58,0.1)' }} />
        <div>
          <div className="label">Avg Size</div>
          <div className="font-mono font-extrabold text-2xl" style={{ color:'#EEEEF5' }}>
            {depts.length ? Math.round(totalHead / depts.length) : 0}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
      ) : depts.length === 0 ? (
        <div className="glass rounded-2xl text-center py-20">
          <div style={{ fontSize: 48 }} className="mb-3">🏢</div>
          <p className="font-display font-bold" style={{ color:'#5C5C85' }}>No departments yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color:'#3A3A5C' }}>Create your first department to organise your team</p>
          <button onClick={() => setModal(true)} className="btn-primary">＋ Create Department</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {depts.map((d, i) => {
            const pct = totalHead ? Math.round((d.employee_count / totalHead) * 100) : 0;
            return (
              <div key={d.dept_id} className={`glass rounded-2xl p-6 anim-up delay-${Math.min(i+2,6)} group`}
                   style={{ transition:'border-color 0.2s' }}
                   onMouseEnter={e => e.currentTarget.style.borderColor='rgba(201,150,58,0.2)'}
                   onMouseLeave={e => e.currentTarget.style.borderColor='rgba(201,150,58,0.08)'}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 28 }}>{ICONS[i % ICONS.length]}</span>
                    <div>
                      <h3 className="font-display font-bold text-lg" style={{ color:'#EEEEF5' }}>{d.dept_name}</h3>
                      <p className="text-xs" style={{ color:'#3A3A5C' }}>{d.location || 'No location set'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-extrabold text-2xl" style={{ color:'#C9963A' }}>{d.employee_count}</div>
                    <div className="text-xs" style={{ color:'#3A3A5C' }}>employees</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color:'#3A3A5C' }}>
                    <span>Team share</span><span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width:`${pct}%`, background:'linear-gradient(90deg,#C9963A,#E8B95A)' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <div className="label text-xs mb-0.5">Manager</div>
                    <div className="text-sm" style={{ color:'#C4C4DA' }}>{d.manager_name || 'Not set'}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.03)' }}>
                    <div className="label text-xs mb-0.5">Monthly Payroll</div>
                    <div className="text-sm font-mono font-bold" style={{ color:'#3DBF82' }}>
                      {d.total_payroll ? `₹${Number(d.total_payroll).toLocaleString('en-IN')}` : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => deleteDept(d.dept_id)} className="btn-danger text-xs">
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)}>
        <form onSubmit={submit}>
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b"
               style={{ borderColor:'rgba(201,150,58,0.1)' }}>
            <h2 className="font-display font-bold text-xl" style={{ color:'#C9963A' }}>New Department</h2>
            <button type="button" onClick={() => setModal(false)}
              className="text-2xl leading-none" style={{ color:'#3A3A5C' }}>×</button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Department Name *</label>
              <input value={form.dept_name} onChange={set('dept_name')} required
                placeholder="e.g. Engineering" className="field" />
            </div>
            <div>
              <label className="label">Location / Block</label>
              <input value={form.location} onChange={set('location')}
                placeholder="e.g. Block A, Floor 3" className="field" />
            </div>
            {error && <div className="banner-error">{error}</div>}
          </div>
          <div className="px-6 pb-6 flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}