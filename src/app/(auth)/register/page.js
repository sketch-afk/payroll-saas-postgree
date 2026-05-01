'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const INDUSTRIES = [
  'Technology','Finance','Healthcare','Manufacturing','Retail',
  'Education','Consulting','Media','Real Estate','Other',
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]     = useState(1); // 2-step form
  const [form, setForm]     = useState({
    name:'', email:'', password:'', confirm:'', industry:'', country:'India',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email,
          password: form.password, industry: form.industry, country: form.country,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess('Company registered! Signing you in…');
      await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      router.push('/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="w-full max-w-md auth-glow rounded-2xl overflow-hidden anim-up" style={{ background: '#0F0F1E' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#3DBF82,#C9963A)' }} />

      <div className="p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-lg"
               style={{ background: 'linear-gradient(135deg,#C9963A,#9B7020)', color: '#080810' }}>P</div>
          <div>
            <div className="font-display font-bold text-xl" style={{ color: '#C9963A' }}>PayCore</div>
            <div className="text-xs font-mono" style={{ color: '#3A3A5C' }}>Payroll Management</div>
          </div>
        </div>

        <h1 className="font-display font-bold text-2xl mb-1" style={{ color: '#EEEEF5' }}>Register your company</h1>
        <p className="text-sm mb-6" style={{ color: '#5C5C85' }}>Set up your payroll workspace in minutes</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1,2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all"
                   style={{
                     background: step >= s ? '#C9963A' : 'rgba(201,150,58,0.1)',
                     color: step >= s ? '#080810' : '#5C5C85',
                   }}>{s}</div>
              {s < 2 && <div className="w-12 h-px" style={{ background: step > s ? '#C9963A' : 'rgba(201,150,58,0.15)' }} />}
            </div>
          ))}
          <span className="text-xs font-mono ml-2" style={{ color: '#5C5C85' }}>
            {step === 1 ? 'Account details' : 'Company info'}
          </span>
        </div>

        {/* Google */}
        {step === 1 && (
          <>
            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl mb-5 font-display text-sm transition-all hover:opacity-90"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#C4C4DA' }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Register with Google
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background:'rgba(201,150,58,0.1)' }} />
              <span className="text-xs font-mono" style={{ color:'#3A3A5C' }}>or email</span>
              <div className="flex-1 h-px" style={{ background:'rgba(201,150,58,0.1)' }} />
            </div>
          </>
        )}

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setError(''); setStep(2); } : handleRegister}
              className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="label">Work Email</label>
                <input type="email" value={form.email} onChange={set('email')}
                  required placeholder="you@company.com" className="field" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={form.password} onChange={set('password')}
                  required placeholder="Min. 6 characters" className="field" />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" value={form.confirm} onChange={set('confirm')}
                  required placeholder="Repeat password" className="field" />
              </div>
              {error && <div className="banner-error">{error}</div>}
              <button type="submit" className="btn-primary w-full py-3">Continue →</button>
            </>
          ) : (
            <>
              <div>
                <label className="label">Company Name</label>
                <input type="text" value={form.name} onChange={set('name')}
                  required placeholder="Acme Corp" className="field" />
              </div>
              <div>
                <label className="label">Industry</label>
                <select value={form.industry} onChange={set('industry')} className="field">
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Country</label>
                <input type="text" value={form.country} onChange={set('country')}
                  placeholder="India" className="field" />
              </div>
              {error   && <div className="banner-error">{error}</div>}
              {success && <div className="banner-success">{success}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">← Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                  {loading ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-sm mt-6" style={{ color:'#5C5C85' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-display font-bold" style={{ color:'#C9963A' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
