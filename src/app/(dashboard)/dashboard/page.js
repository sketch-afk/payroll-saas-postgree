'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#C9963A','#3DBF82','#E05A5A','#5C5C85','#E0A03A'];

function StatCard({ label, value, sub, color, icon, delay }) {
  return (
    <div className={`stat-card anim-up delay-${delay}`}>
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-5 -mr-6 -mt-6 pointer-events-none"
           style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className="font-mono text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${color}18`, color }}>
          {sub}
        </span>
      </div>
      <div className="font-display font-extrabold text-3xl mb-1" style={{ color: '#EEEEF5' }}>{value}</div>
      <div className="text-sm" style={{ color: '#5C5C85' }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); 
    
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);


  const barData = useMemo(() => {
    if (!stats?.payrollTrend || stats.payrollTrend.length === 0) {
      return [];
    }

    return stats.payrollTrend.map(pt => ({
      month: MONTHS[(pt.pay_month) - 1], 
      gross: Number(pt.total_gross || 0),
      net:   Number(pt.total_net || 0),
    }));
  }, [stats?.payrollTrend]);

  if (!isMounted || loading) {
    return (
      <div className="flex items-center justify-center h-64 ">
        <div className="spinner" />
      </div>
    );
  }

  const now = new Date();
  const emp   = stats?.employees;
  const pay   = stats?.payroll;
  const depts = stats?.departments || [];

  const pieData = depts.length
    ? depts.map(d => ({ name: d.dept_name, value: Number(d.headcount) }))
    : [];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="anim-up">
        <div className="font-mono text-xs mb-2" style={{ color: '#3A3A5C' }}>
          {now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
        <h1 className="page-title">
          Welcome, <span style={{ color: '#C9963A' }}>{stats?.companyName || session?.user?.name}</span>
        </h1>
        <p className="page-subtitle">Here's your payroll snapshot for {MONTHS[now.getMonth()]} {now.getFullYear()}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 ">
        <StatCard delay="1" icon="👥" label="Total Employees"  color="#C9963A"
          
          value={emp?.total ?? '—'} sub={`${emp?.active ?? 0} active`} />
        <StatCard delay="2" icon="💰" label="Gross Payroll" color="#3DBF82"
          value={pay?.total_gross ? `₹${(Number(pay.total_gross)/1000).toFixed(0)}k` : '—'}
          sub={MONTHS[now.getMonth()]} />
        <StatCard delay="3" icon="🏦" label="Net Disbursed" color="#C9963A"
          value={pay?.total_net ? `₹${(Number(pay.total_net)/1000).toFixed(0)}k` : '—'}
          sub={`${pay?.count ?? 0} processed`} />
        <StatCard delay="4" icon="📋" label="Pending Leaves" color="#E0A03A"
          value={stats?.leaves?.pending ?? '—'} sub="awaiting approval" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 anim-up delay-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-lg" style={{ color: '#EEEEF5' }}>Payroll Trend</h2>
              <p className="text-xs mt-0.5" style={{ color: '#5C5C85' }}>Gross vs Net — {now.getFullYear()}</p>
            </div>
            <div className="flex gap-4 text-xs font-mono" style={{ color: '#5C5C85' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#C9963A' }} /> Gross
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#3DBF82' }} /> Net
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} barGap={3} barSize={12} >
              <XAxis dataKey="month" tick={{ fill:'#3A3A5C', fontSize:11, fontFamily:'Syne' }}
                     axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#3A3A5C', fontSize:10 }} axisLine={false} tickLine={false}
                     tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                contentStyle={{ background:'#0F0F1E', border:'1px solid rgba(201,150,58,0.2)', borderRadius:10, fontFamily:'Outfit' }}
                labelStyle={{ color:'#C9963A', fontFamily:'Syne', fontWeight:700 }}
                formatter={(v, n) => [`₹${Number(v).toLocaleString('en-IN')}`, n === 'gross' ? 'Gross' : 'Net']}
              />
              <Bar dataKey="gross" fill="#C9963A" radius={[4,4,0,0]} fillOpacity={0.8} />
              <Bar dataKey="net"   fill="#3DBF82" radius={[4,4,0,0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="glass rounded-2xl p-6 anim-up delay-4">
          <h2 className="font-display font-bold text-lg mb-0.5" style={{ color: '#EEEEF5' }}>Headcount</h2>
          <p className="text-xs mb-4" style={{ color: '#5C5C85' }}>By department</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65}
                       dataKey="value" paddingAngle={4}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background:'white',fontSize: '13px' , border:'1px solid rgba(201,150,58,0.2)', borderRadius:6, fontFamily:'Outfit', }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ color: '#8E8EAD' }}>{d.name}</span>
                    </span>
                    <span className="font-mono" style={{ color: '#5C5C85' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-center" style={{ color: '#3A3A5C' }}>
                Add departments &amp; employees to see data here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent payroll table */}
      <div className="glass rounded-2xl overflow-hidden anim-up delay-5">
        <div className="px-6 py-4 flex items-center justify-between border-b"
             style={{ borderColor: 'rgba(201,150,58,0.07)' }}>
          <h2 className="font-display font-bold text-base" style={{ color: '#EEEEF5' }}>Recent Payroll</h2>
          <a href="/payroll" className="text-xs font-display font-bold" style={{ color: '#C9963A' }}>
            View all →
          </a>
        </div>
        <table className="w-full tbl">
          <thead>
            <tr>
              <th className="text-left pl-6">Employee</th>
              <th className="text-left">Department</th>
              <th className="text-left">Period</th>
              <th className="text-right">Net Pay</th>
              <th className="text-left pr-6">Status</th>
            </tr>
          </thead>
          <tbody>
            {stats?.recentPayroll?.length ? stats.recentPayroll.map((r, i) => (
              <tr key={i}>
                <td className="pl-6 font-medium" style={{ color: '#EEEEF5' }}>{r.full_name}</td>
                <td style={{ color: '#5C5C85' }}>{r.dept_name || '—'}</td>
                <td className="font-mono text-xs" style={{ color: '#5C5C85' }}>
                  {MONTHS[(r.pay_month||1)-1]} {r.pay_year}
                </td>
                <td className="text-right font-mono font-bold" style={{ color: '#3DBF82' }}>
                  ₹{Number(r.net_salary||0).toLocaleString('en-IN')}
                </td>
                <td className="pr-6">
                  <span className={`badge badge-${(r.status||'').toLowerCase()}`}>{r.status}</span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="text-center py-12" style={{ color: '#3A3A5C' }}>
                  No payroll records yet — add employees and process payroll to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick deductions */}
      {pay && (Number(pay.total_gross) > 0) && (
        <div className="grid grid-cols-2 gap-4 anim-up delay-6">
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                 style={{ background: 'rgba(224,90,90,0.1)' }}>📊</div>
            <div>
              <div className="label">PF Deductions</div>
              <div className="font-mono font-bold text-xl" style={{ color: '#EEEEF5' }}>
                ₹{Number(pay.total_pf||0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                 style={{ background: 'rgba(201,150,58,0.1)' }}>🧾</div>
            <div>
              <div className="label">Tax Deductions</div>
              <div className="font-mono font-bold text-xl" style={{ color: '#EEEEF5' }}>
                ₹{Number(pay.total_tax||0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}