import "./globals.css";

export const metadata = {
  title: "PayCore — Company Payroll Management",
  description: "Multi-tenant payroll SaaS built with Next.js + PostgreSQL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
