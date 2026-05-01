'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const NAV = [
  { href: '/dashboard',    icon: '▣', label: 'Dashboard'   },
  { href: '/employees',    icon: '◉', label: 'Employees'   },
  { href: '/departments',  icon: '◍', label: 'Departments' },
  { href: '/payroll',      icon: '◎', label: 'Payroll'     },
  { href: '/attendance',   icon: '◈', label: 'Attendance'  },
  { href: '/leaves',       icon: '◐', label: 'Leaves'      },
];

export default function Sidebar() {
  const path    = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
           style={{ background: '#0A0A18', borderRight: '1px solid rgba(201,150,58,0.07)' }}>

      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(201,150,58,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-base"
               style={{ background: 'linear-gradient(135deg,#C9963A,#9B7020)', color: '#080810' }}>P</div>
          <div>
            <div className="font-display font-bold text-base" style={{ color: '#C9963A' }}>PayCore</div>
            <div className="font-mono text-xs truncate max-w-28" style={{ color: '#3A3A5C' }}>
              {session?.user?.name || 'Loading…'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 font-mono text-xs" style={{ color: '#25253F', letterSpacing: '0.1em' }}>MENU</p>
        {NAV.map(({ href, icon, label }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-link ${active ? 'active' : ''}`}>
              <span style={{ fontSize: '1rem', opacity: active ? 1 : 0.5 }}>{icon}</span>
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: '#C9963A', boxShadow: '0 0 6px #C9963A' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Signout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(201,150,58,0.07)' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl"
             style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#C9963A55,#3DBF8255)', color: '#C9963A' }}>
            {session?.user?.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-display font-bold truncate" style={{ color: '#C4C4DA' }}>
              {session?.user?.name || '—'}
            </div>
            <div className="text-xs truncate font-mono" style={{ color: '#3A3A5C' }}>
              {session?.user?.email || '—'}
            </div>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-link w-full" style={{ color: '#E05A5A' }}>
          <span style={{ opacity: 0.7 }}>⏻</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
