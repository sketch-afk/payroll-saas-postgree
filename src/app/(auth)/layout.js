import Providers from '@/app/providers';

export default function AuthLayout({ children }) {
  return (
    <Providers>
      <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
             style={{ background: 'radial-gradient(circle, #C9963A, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-6 blur-3xl pointer-events-none"
             style={{ background: 'radial-gradient(circle, #3DBF82, transparent)' }} />
        {children}
      </div>
    </Providers>
  );
}
