'use client';
import { useState, useEffect, useCallback } from 'react';

function Avatar({ name, size = 8 }) {
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0`}
         style={{ background: 'linear-gradient(135deg,rgba(201,150,58,0.3),rgba(61,191,130,0.3))', color: '#C9963A' }}>
      {name?.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b"
             style={{ borderColor: 'rgba(201,150,58,0.1)' }}>
          <h2 className="font-display font-bold text-xl" style={{ color: '#C9963A' }}>{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none transition-colors"
                  style={{ color: '#3A3A5C' }} onMouseEnter={e => e.target.style.color='#EEEEF5'}
                  onMouseLeave={e => e.target.style.color='#3A3A5C'}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, type = 'text', required, step, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input 
        type={type} 
        step={step} 
        value={value ?? ''} 
        onChange={onChange}
        required={required} 
        placeholder={label} 
        className="field" 
      />
    </div>
  );
}

function EmployeeForm({ depts, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    first_name:'', last_name:'', email:'', phone:'', hire_date:'',
    job_title:'', dept_id:'', basic_salary:'', hra:'', da:'',
    ta:'', medical:'', pf_percent:'12', tax_percent:'10',
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const isEdit = !!initial?.emp_id;

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const url = isEdit ? `/api/employees/${initial.emp_id}` : '/api/employees';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: '65vh' }}>
        <div className="text-xs font-display uppercase tracking-widest mb-1"
             style={{ color: 'rgba(201,150,58,0.5)' }}>Personal Info</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" value={form.first_name} onChange={set('first_name')} required />
          <FormField label="Last Name"  value={form.last_name}  onChange={set('last_name')} required />
          <FormField label="Email"      value={form.email}      onChange={set('email')} type="email" required />
          <FormField label="Phone"      value={form.phone}      onChange={set('phone')} />
          <FormField label="Hire Date"  value={form.hire_date}  onChange={set('hire_date')} type="date" required />
          <FormField label="Job Title"  value={form.job_title}  onChange={set('job_title')} />
        </div>
        <div>
          <label className="label">Department</label>
          <select value={form.dept_id ?? ''} onChange={set('dept_id')} className="field">
            <option value="">Select Department</option>
            {/* POSTGRES FIX: lowercase dept_id and dept_name */}
            {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
          </select>
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'rgba(201,150,58,0.1)' }}>
          <div className="text-xs font-display uppercase tracking-widest mb-4"
               style={{ color: 'rgba(201,150,58,0.5)' }}>Salary Structure (₹/month)</div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Basic"   value={form.basic_salary} onChange={set('basic_salary')} type="number" step="0.01" required />
            <FormField label="HRA"     value={form.hra}          onChange={set('hra')} type="number" step="0.01" />
            <FormField label="DA"      value={form.da}           onChange={set('da')} type="number" step="0.01" />
            <FormField label="TA"      value={form.ta}           onChange={set('ta')} type="number" step="0.01" />
            <FormField label="Medical" value={form.medical}      onChange={set('medical')} type="number" step="0.01" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <FormField label="PF %"  value={form.pf_percent}  onChange={set('pf_percent')} type="number" step="0.01" />
            <FormField label="Tax %" value={form.tax_percent} onChange={set('tax_percent')} type="number" step="0.01" />
          </div>
        </div>
        {error && <div className="banner-error">{error}</div>}
      </div>
      <div className="px-6 pb-6 flex gap-3 justify-end">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Add Employee'}
        </button>
      </div>
    </form>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [depts, setDepts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);

  const fetchEmployees = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (filterDept)   p.set('dept',   filterDept);
    if (filterStatus) p.set('status', filterStatus);
    fetch(`/api/employees?${p}`)
      .then(r => r.json())
      .then(d => { setEmployees(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, filterDept, filterStatus]);

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(d => setDepts(d.data || []));
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  async function updateStatus(id, newStatus) {
    const action = newStatus === 'ACTIVE' ? 'reactivate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this employee?`)) return;
    
    await fetch(`/api/employees/${id}`, { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    fetchEmployees();
  }

  async function hardDelete(id) {
    if (!confirm('WARNING: Are you sure you want to completely delete this employee? This action cannot be undone.')) return;
    
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    const data = await res.json();
    
    if (!res.ok) {
      alert(data.error || 'Cannot delete employee. They likely have tied payroll or attendance records. Deactivate them instead.');
    } else {
      fetchEmployees();
    }
  }

  const statusColors = { ACTIVE:'#3DBF82', INACTIVE:'#E05A5A', ON_LEAVE:'#C9963A' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="anim-up">
          <div className="font-mono text-xs mb-1" style={{ color:'#3A3A5C' }}>◉ Employees</div>
          <h1 className="page-title">Team <span style={{ color:'#C9963A' }}>Members</span></h1>
          <p className="page-subtitle">{employees.length} employees in your company</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary anim-up">
          ＋ Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 anim-up delay-1">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search name or email…" className="field"
          style={{ maxWidth: 280, flex: '1 1 200px' }} />
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="field" style={{ width: 180 }}>
          <option value="">All Departments</option>
          {/* POSTGRES FIX: lowercase dept_id and dept_name */}
          {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="field" style={{ width: 150 }}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_LEAVE">On Leave</option>
        </select>
        <button onClick={() => { setSearch(''); setFilterDept(''); setFilterStatus(''); }}
          className="btn-ghost">Clear</button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden anim-up delay-2">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20">
            <div style={{ fontSize: 48 }} className="mb-3">👤</div>
            <p className="font-display font-bold" style={{ color:'#5C5C85' }}>No employees yet</p>
            <p className="text-sm mt-1 mb-5" style={{ color:'#3A3A5C' }}>
              Add your first employee to get started
            </p>
            <button onClick={() => setModal('add')} className="btn-primary">＋ Add Employee</button>
          </div>
        ) : (
          <table className="w-full tbl">
            <thead>
              <tr>
                <th className="text-left pl-6">Employee</th>
                <th className="text-left">Title &amp; Dept</th>
                <th className="text-left">Hire Date</th>
                <th className="text-right">Gross Salary</th>
                <th className="text-left">Status</th>
                <th className="text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.emp_id}> {/* POSTGRES FIX: lowercase */}
                  <td className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.full_name} /> {/* POSTGRES FIX: lowercase */}
                      <div>
                        <div className="font-medium text-sm" style={{ color:'#EEEEF5' }}>{emp.full_name}</div> {/* POSTGRES FIX: lowercase */}
                        <div className="text-xs font-mono" style={{ color:'#3A3A5C' }}>{emp.email}</div> {/* POSTGRES FIX: lowercase */}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm" style={{ color:'#C4C4DA' }}>{emp.job_title || '—'}</div> {/* POSTGRES FIX: lowercase */}
                    <div className="text-xs" style={{ color:'#3A3A5C' }}>{emp.dept_name || '—'}</div> {/* POSTGRES FIX: lowercase */}
                  </td>
                  <td className="font-mono text-xs" style={{ color:'#5C5C85' }}>
                    {/* POSTGRES FIX: lowercase */}
                    {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="text-right font-mono font-bold text-sm" style={{ color:'#3DBF82' }}>
                    {/* POSTGRES FIX: lowercase */}
                    {emp.gross_salary ? `₹${Number(emp.gross_salary).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td>
                    {/* POSTGRES FIX: lowercase */}
                    <span className={`badge badge-${(emp.status||'').toLowerCase()}`}>{emp.status}</span>
                  </td>
                  <td className="text-right pr-6">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal(emp)}
                        className="text-xs font-display font-bold px-3 py-1 rounded-lg transition-all"
                        style={{ color:'#C9963A', border:'1px solid rgba(201,150,58,0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(201,150,58,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        Edit
                      </button>

                      {/* Toggle Active / Inactive Status */}
                      {/* POSTGRES FIX: lowercase status */}
                      {emp.status === 'ACTIVE' ? (
                        <button 
                          onClick={() => updateStatus(emp.emp_id, 'INACTIVE')}  
                          className="text-xs font-display font-bold px-3 py-1 rounded-lg transition-all"
                          style={{ color:'#E05A5A', border:'1px solid rgba(224,90,90,0.2)' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(224,90,90,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          Deactivate
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateStatus(emp.emp_id, 'ACTIVE')}  
                          className="text-xs font-display font-bold px-3 py-1 rounded-lg transition-all"
                          style={{ color:'#3DBF82', border:'1px solid rgba(61,191,130,0.2)' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(61,191,130,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          Reactivate
                        </button>
                      )}

                      {/* True Delete for mistakes */}
                      <button 
                        onClick={() => hardDelete(emp.emp_id)}  
                        className="text-xs px-2 py-1 opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: '#5C5C85' }}
                        title="Permanently Delete">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Employee' : `Edit — ${modal?.full_name}`} // POSTGRES FIX: lowercase full_name
      >
        {modal && (
          <EmployeeForm
            depts={depts}
            initial={modal === 'add' ? null : {
              // POSTGRES FIX: Changed all mapping below to lowercase to match the DB
              emp_id: modal.emp_id,
              first_name: modal.first_name, last_name: modal.last_name,
              email: modal.email, phone: modal.phone, job_title: modal.job_title,
              dept_id: modal.dept_id, status: modal.status,
              
              hire_date: modal.hire_date ? new Date(modal.hire_date).toLocaleDateString('en-CA') : '',
              
              basic_salary: modal.basic_salary, hra: modal.hra, da: modal.da,
              ta: modal.ta, medical: modal.medical,
              pf_percent: modal.pf_percent, tax_percent: modal.tax_percent,
            }}
            onClose={() => setModal(null)}
            onSave={() => { setModal(null); fetchEmployees(); }}
          />
        )}
      </Modal>
    </div>
  );
}