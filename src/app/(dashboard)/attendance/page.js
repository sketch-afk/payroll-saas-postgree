'use client';
import { useState, useEffect } from 'react';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const STATUS_OPTIONS = ['PRESENT','ABSENT','HALF_DAY','LEAVE'];
const STATUS_COLORS  = { PRESENT:'#3DBF82', ABSENT:'#E05A5A', HALF_DAY:'#C9963A', LEAVE:'#5C5C85' };

export default function AttendancePage() {
  const [isMounted, setIsMounted] = useState(false);
  
  const [employees, setEmployees]   = useState([]);
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState('');
  
  const [month, setMonth]           = useState(1); 
  const [year, setYear]             = useState(2026); 
  const [selectedDate, setSelectedDate] = useState(''); 
  const [bulkStatus, setBulkStatus]     = useState('PRESENT');

  const [dayMap, setDayMap] = useState({});

  useEffect(() => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    
    setSelectedDate(now.toLocaleDateString('en-CA')); 
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(d => setEmployees(d.data || []));
  }, []);

  useEffect(() => {
    if (!isMounted || !selectedDate) return;
    
    setLoading(true);
    fetch(`/api/attendance?month=${month}&year=${year}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.data || []);
        
        const map = {};
        (d.data || []).forEach(r => {
          // POSTGRES FIX: lowercase att_date, emp_id, and status
          const dt = new Date(r.att_date).toLocaleDateString('en-CA');
          if (dt === selectedDate) map[r.emp_id] = r.status;
        });
        
        setDayMap(map);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [month, year, selectedDate, isMounted]);

  function setStatus(empId, status) {
    setDayMap(m => ({ ...m, [empId]: status }));
  }

  function applyBulk() {
    const newMap = {};
    // POSTGRES FIX: lowercase emp_id
    employees.forEach(e => { newMap[e.emp_id] = bulkStatus; });
    setDayMap(newMap);
  }

  async function saveAttendance() {
    setSaving(true); setSuccess('');
    const records = employees.map(e => ({
      // POSTGRES FIX: lowercase emp_id
      emp_id:   e.emp_id,
      att_date: selectedDate,
      status:   dayMap[e.emp_id] || 'PRESENT',
    }));
    
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess(data.message);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  if (!isMounted) return null;

  const summary = {};
  employees.forEach(e => {
    // POSTGRES FIX: lowercase emp_id
    summary[e.emp_id] = { PRESENT:0, ABSENT:0, HALF_DAY:0, LEAVE:0 };
  });
  records.forEach(r => {
    // POSTGRES FIX: lowercase emp_id and status
    if (summary[r.emp_id]) summary[r.emp_id][r.status] = (summary[r.emp_id][r.status]||0) + 1;
  });

  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="anim-up">
          <div className="font-mono text-xs mb-1" style={{ color:'#3A3A5C' }}>◈ Attendance</div>
          <h1 className="page-title">Attendance <span style={{ color:'#C9963A' }}>Tracker</span></h1>
          <p className="page-subtitle">Mark and manage daily attendance for your team</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 anim-up delay-1">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="label">Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="field" style={{ width: 180 }} max={todayStr} />
          </div>
          <div>
            <label className="label">Month (for summary)</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="field" style={{ width:160 }}>
              {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              className="field" style={{ width:100 }} min="2020" max="2030" />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm" style={{ color:'#5C5C85' }}>Bulk mark all:</span>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setBulkStatus(s)}
              className="text-xs font-display font-bold px-3 py-1.5 rounded-lg border transition-all"
              style={{
                borderColor: bulkStatus === s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.06)',
                color: STATUS_COLORS[s],
                background: bulkStatus === s ? `${STATUS_COLORS[s]}15` : 'transparent',
              }}>
              {s}
            </button>
          ))}
          <button onClick={applyBulk} className="btn-ghost text-xs">Apply to All</button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden anim-up delay-2">
        <div className="px-6 py-4 flex items-center justify-between border-b"
             style={{ borderColor:'rgba(201,150,58,0.07)' }}>
          <div>
            <h2 className="font-display font-bold" style={{ color:'#EEEEF5' }}>
              {selectedDate} — {employees.length} employees
            </h2>
          </div>
          <div className="flex gap-3 items-center">
            {success && <span className="text-xs font-display" style={{ color:'#3DBF82' }}>✓ {success}</span>}
            <button onClick={saveAttendance} disabled={saving || employees.length === 0} className="btn-primary">
              {saving ? 'Saving…' : '💾 Save Attendance'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="spinner" /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16" style={{ color:'#3A3A5C' }}>
            <p className="font-display">No employees yet — add employees first</p>
          </div>
        ) : (
          <table className="w-full tbl">
            <thead>
              <tr>
                <th className="text-left pl-6">Employee</th>
                <th className="text-left">Department</th>
                <th className="text-center">{MONTHS[month-1]} Summary</th>
                <th className="text-center" style={{ minWidth: 280 }}>Status for {selectedDate}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                // POSTGRES FIX: lowercase emp_id
                const s = summary[emp.emp_id] || {};
                const current = dayMap[emp.emp_id] || 'PRESENT';
                return (
                  <tr key={emp.emp_id}>
                    <td className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                             style={{ background:'rgba(201,150,58,0.12)', color:'#C9963A' }}>
                          {/* POSTGRES FIX: lowercase full_name */}
                          {emp.full_name?.[0]}
                        </div>
                        <div>
                          {/* POSTGRES FIX: lowercase full_name and job_title */}
                          <div className="font-medium text-sm" style={{ color:'#EEEEF5' }}>{emp.full_name}</div>
                          <div className="text-xs" style={{ color:'#3A3A5C' }}>{emp.job_title||'—'}</div>
                        </div>
                      </div>
                    </td>
                    {/* POSTGRES FIX: lowercase dept_name */}
                    <td className="text-sm" style={{ color:'#5C5C85' }}>{emp.dept_name||'—'}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-mono">
                        <span style={{ color:'#3DBF82' }}>P:{s.PRESENT||0}</span>
                        <span style={{ color:'#E05A5A' }}>A:{s.ABSENT||0}</span>
                        <span style={{ color:'#C9963A' }}>H:{s.HALF_DAY||0}</span>
                        <span style={{ color:'#5C5C85' }}>L:{s.LEAVE||0}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {STATUS_OPTIONS.map(st => (
                          <button key={st} onClick={() => setStatus(emp.emp_id, st)}
                            className="text-xs font-display font-bold px-2.5 py-1 rounded-lg border transition-all"
                            style={{
                              borderColor: current === st ? STATUS_COLORS[st] : 'rgba(255,255,255,0.06)',
                              color: current === st ? STATUS_COLORS[st] : '#3A3A5C',
                              background: current === st ? `${STATUS_COLORS[st]}15` : 'transparent',
                            }}>
                            {st === 'HALF_DAY' ? 'Half' : st === 'LEAVE' ? 'Leave' : st.slice(0,3)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}