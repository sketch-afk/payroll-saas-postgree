# Payroll SaaS

A modern payroll management SaaS built with Next.js, Tailwind CSS, NextAuth, and PostgreSQL (Neon). This app supports company registration, employee and department management, attendance tracking, leave requests, payroll processing, and a dashboard for HR administrators.

## Features

- Multi-tenant company support via `companies` table
- Email/password login plus Google OAuth sign-in
- Employee management and department assignment
- Attendance tracking with present/absent/half-day/leave statuses
- Leave application workflow with pending/approved/rejected states
- Payroll generation and reporting with automated prorated salary math
- Employee payslip generation (PDF) for monthly salary and attendance details
- Download or share generated payslips directly from the payroll UI
- Dashboard UI for companies, employees, departments, payroll, attendance, and leaves
- PostgreSQL integration using a connection pool for fast, serverless-friendly queries

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- NextAuth.js
- PostgreSQL (Neon / `pg`)
- bcryptjs
- jsPDF (Payslip generation)
- Recharts (Dashboard visualizations)

## Repository Structure

- `src/app/` — Next.js App Router pages, layouts, and frontend logic
- `src/app/api/` — API route handlers for auth, companies, employees, departments, attendance, leaves, payroll, dashboard
- `src/components/` — UI components, modals, and layout helpers
- `src/lib/` — Database connection pools and NextAuth configuration
- `schema.sql` — PostgreSQL database schema, including tables, indexes, generated columns (e.g., `gross_salary`), and views (`vw_employees`, `vw_payroll`)

## Environment Variables

Create a `.env.local` at the project root for local development and set the following values:
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# Google OAuth (get from console.cloud.google.com)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Database Setup

This project uses PostgreSQL (optimized for Neon). The schema is defined in schema.sql and includes:

- `companies`
- `departments`
- `employees`
- `salary_structures`
- `attendance`
- `leaves`
- `payroll`
- views: `vw_employees`, `vw_payroll`
- stored procedure: `process_payroll`

Run the SQL script against your PostgreSQL database before starting the app. Note: Database logic utilizes advanced PostgreSQL features like GENERATED ALWAYS AS columns for dynamic math and ON CONFLICT DO UPDATE for idempotent payroll processing.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Production Build

Build the app:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Authentication

Authentication is handled by NextAuth:

- Credentials provider for email/password login
- Google provider for OAuth sign-in
- Custom sign-in callback upserts company records on Google login

The API uses session-based authorization with companyId attached to the JWT token.

## Database Helpers

`src/lib/db.js` includes:

- `getPool()` — creates and caches an Oracle connection pool
- `query()` — executes SQL with bindings

## Notes

- Ensure PostgreSQL is reachable from the running app
- The app expects numeric company IDs attached to the authenticated session
- Use the provided SQL schema to create the database objects before using the frontend

## License

This project is provided as-is for internal use and development.
