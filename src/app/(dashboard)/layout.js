import Providers from '@/app/providers';
import Sidebar from '@/components/layout/Sidebar';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

export default async function DashboardLayout({ children }) {
  // 1. Check if the user is logged in
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  // 2. Fetch company details using your custom db.js wrapper format!
  // Notice we use company_id and the :cid binding syntax
  const result = await query(
    `SELECT name, industry, country FROM companies WHERE company_id = :cid`, 
    { cid: session.user.companyId }
  );
  
  // Safely extract the company row
  const company = result?.rows?.[0];

  // 3. The Interceptor
  // If the name is missing, or industry is missing, force onboarding
  if (!company?.name || company.name === 'New Company' || !company?.industry) {
    redirect("/onboarding");
  }

  // 4. If all details exist, render the dashboard!
  return (
    <Providers>
      <div className="flex min-h-screen bg-grid">
        <Sidebar companyName={company?.name} />
        <main className="flex-1 overflow-auto" style={{ marginLeft: '240px' }}>
          <div className="p-7 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </Providers>
  );
}