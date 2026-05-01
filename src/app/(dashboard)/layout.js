import Providers from '@/app/providers';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <Providers>
      <div className="flex min-h-screen bg-grid">
        <Sidebar />
        <main className="flex-1 overflow-auto" style={{ marginLeft: '240px' }}>
          <div className="p-7 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </Providers>
  );
}
