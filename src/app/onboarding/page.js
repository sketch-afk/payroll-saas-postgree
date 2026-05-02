'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const INDUSTRIES = [
  'Technology','Finance','Healthcare','Manufacturing','Retail',
  'Education','Consulting','Media','Real Estate','Other',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', industry: '', country: 'India' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleCompleteSetup(e) {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) throw new Error('Failed to save company details');

      router.push('/dashboard');
      router.refresh(); 
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080810' }}>
      <div className="w-full max-w-md auth-glow rounded-2xl overflow-hidden anim-up" style={{ background: '#0F0F1E' }}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#3DBF82,#C9963A)' }} />

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-lg"
                 style={{ background: 'linear-gradient(135deg,#C9963A,#9B7020)', color: '#080810' }}>P</div>
            <div>
              <div className="font-display font-bold text-xl" style={{ color: '#C9963A' }}>PayCore</div>
              <div className="text-xs font-mono" style={{ color: '#3A3A5C' }}>Payroll Management</div>
            </div>
          </div>

          <h1 className="font-display font-bold text-2xl mb-1" style={{ color: '#EEEEF5' }}>Complete Setup</h1>
          <p className="text-sm mb-6" style={{ color: '#5C5C85' }}>Google didn't tell us your company details. Let's finish setting up your workspace.</p>

          <form onSubmit={handleCompleteSetup} className="space-y-4">
            <div>
              <label className="label text-sm text-gray-300 block mb-1">Company Name</label>
              <input type="text" value={form.name} onChange={set('name')}
                required placeholder="Acme Corp" className="field w-full p-2 rounded bg-gray-800 text-white border border-gray-700" />
            </div>
            <div>
              <label className="label text-sm text-gray-300 block mb-1">Industry</label>
              <select value={form.industry} onChange={set('industry')} required className="field w-full p-2 rounded bg-gray-800 text-white border border-gray-700">
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-sm text-gray-300 block mb-1">Country</label>
              <input type="text" value={form.country} onChange={set('country')}
                required placeholder="India" className="field w-full p-2 rounded bg-gray-800 text-white border border-gray-700" />
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-4 rounded font-bold" style={{ background: '#C9963A', color: '#080810' }}>
              {loading ? 'Saving...' : 'Go to Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}