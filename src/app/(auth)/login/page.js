'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleCredentials(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await signIn('credentials', {
      email: form.email, password: form.password, redirect: false,
    });
    setLoading(false);
    if (res?.error) setError('Invalid email or password');
    else router.push('/dashboard');
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  }

  return (
    <div className="w-full max-w-md auth-glow rounded-2xl overflow-hidden anim-up" style={{ background: '#0F0F1E' }}>
      {/* Top bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#C9963A,#3DBF82)' }} />

      <div className="p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-ink-900 text-lg"
               style={{ background: 'linear-gradient(135deg,#C9963A,#9B7020)' }}>P</div>
          <div>
            <div className="font-display font-bold text-xl text-gold-DEFAULT" style={{ color: '#C9963A' }}>PayCore</div>
            <div className="text-xs font-mono" style={{ color: '#3A3A5C' }}>Payroll Management</div>
          </div>
        </div>

        <h1 className="font-display font-bold text-2xl mb-1" style={{ color: '#EEEEF5' }}>Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: '#5C5C85' }}>Sign in to your company account</p>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl mb-5 font-display font-600 text-sm transition-all duration-200 hover:opacity-90"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#C4C4DA' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(201,150,58,0.1)' }} />
          <span className="text-xs font-mono" style={{ color: '#3A3A5C' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(201,150,58,0.1)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={set('email')}
              required placeholder="company@example.com" className="field" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={form.password} onChange={set('password')}
              required placeholder="••••••••" className="field" />
          </div>

          {error && <div className="banner-error">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading
              ? <><span className="spinner" style={{ width:16, height:16, borderWidth:2 }} /> Signing in…</>
              : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: '#5C5C85' }}>
          No account?{' '}
          <Link href="/register" className="font-display font-bold" style={{ color: '#C9963A' }}>
            Register your company →
          </Link>
        </p>
      </div>
    </div>
  );
}
