# Payroll SaaS

A modern payroll management SaaS built with Next.js, Tailwind CSS, NextAuth, and Oracle Database. This app supports company registration, employee and department management, attendance tracking, leave requests, payroll processing, and a dashboard for HR administrators.

## Features

- Multi-tenant company support via `companies` table
- Email/password login plus Google OAuth sign-in
- Employee management and department assignment
- Attendance tracking with present/absent/half-day/leave statuses
- Leave application workflow with pending/approved/rejected states
- Payroll generation and reporting with salary structure support
- Employee payslip generation for monthly salary and attendance details
- Download or share generated payslips directly from the payroll UI
- Dashboard UI for companies, employees, departments, payroll, attendance, and leaves
- Oracle DB integration using `oracledb` and query helpers

## Tech Stack

- Next.js 14
- React 18
- Tailwind CSS
- NextAuth.js
- OracleDB (`oracledb`)
- bcryptjs
- Recharts for charts
- ESLint

## Repository Structure

- `src/app/` — Next.js App Router pages and layouts
- `src/app/api/` — API route handlers for auth, companies, employees, departments, attendance, leaves, payroll, dashboard
- `src/components/` — UI components and layout helpers
- `src/lib/` — database and auth utilities
- `schema.sql` — Oracle database schema, indexes, views, and payroll procedure

## Environment Variables

Create a `.env.local` at the project root and set the following values:

```env
ORACLE_USER=<your-oracle-username>
ORACLE_PASSWORD=<your-oracle-password>
ORACLE_CONNECT_STRING=<your-oracle-connect-string>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXTAUTH_URL=http://localhost:3000
```

## Database Setup

This project uses Oracle Database. The schema is defined in `schema.sql` and includes:

- `companies`
- `departments`
- `employees`
- `salary_structures`
- `attendance`
- `leaves`
- `payroll`
- views: `vw_employees`, `vw_payroll`
- stored procedure: `process_payroll`

Run the SQL script against your Oracle database before starting the app.

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

The API uses session-based authorization with `companyId` attached to the token.

## Database Helpers

`src/lib/db.js` includes:

- `getPool()` — creates and caches an Oracle connection pool
- `query()` — executes SQL with bindings
- `queryOne()` — returns a single row or `null`

## Notes

- Ensure Oracle DB is reachable from the running app
- The app expects numeric company IDs attached to the authenticated session
- Use the provided SQL schema to create the database objects before using the frontend

## License

This project is provided as-is for internal use and development.
