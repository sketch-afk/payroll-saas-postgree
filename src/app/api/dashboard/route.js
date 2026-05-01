import { NextResponse } from "next/server";
import { requireCompany, unauthorized, serverError } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const cid = await requireCompany();

    const [empStats, payStats, deptStats, leaveStats, recentPay, trendStats] =
      await Promise.all([
        // FIX: Cast COUNT and SUM to integers (::int) so frontend gets numbers, not strings
        query(
          `SELECT 
              COUNT(*)::int AS total,
              SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END)::int AS active,
              SUM(CASE WHEN status='INACTIVE' THEN 1 ELSE 0 END)::int AS inactive,
              SUM(CASE WHEN status='ON_LEAVE' THEN 1 ELSE 0 END)::int AS on_leave
           FROM employees WHERE company_id=:cid`,
          { cid }
        ),
        // FIX: Cast financial SUMs to numeric/floats
        query(
          `SELECT 
              COALESCE(SUM(gross_salary), 0)::numeric AS total_gross,
              COALESCE(SUM(net_salary), 0)::numeric   AS total_net,
              COALESCE(SUM(pf_deduction), 0)::numeric AS total_pf,
              COALESCE(SUM(tax_deduction), 0)::numeric AS total_tax,
              COUNT(*)::int AS count
           FROM payroll
           WHERE company_id=:cid
             AND pay_month = EXTRACT(MONTH FROM CURRENT_DATE)
             AND pay_year  = EXTRACT(YEAR  FROM CURRENT_DATE)`,
          { cid }
        ),
        // FIX: Cast COUNT to integer
        query(
          `SELECT dept_name, COUNT(e.emp_id)::int AS headcount
           FROM departments d
           LEFT JOIN employees e ON e.dept_id=d.dept_id AND e.status='ACTIVE'
           WHERE d.company_id=:cid
           GROUP BY dept_name 
           ORDER BY headcount DESC`,
          { cid }
        ),
        // FIX: Cast COUNT to integer
        query(
          `SELECT COUNT(*)::int AS pending 
           FROM leaves
           WHERE company_id=:cid AND status='PENDING'`,
          { cid }
        ),
        // FIX: Postgres conventionally uses LIMIT instead of FETCH FIRST
        query(
          `SELECT full_name, dept_name, net_salary, pay_month, pay_year, status
           FROM vw_payroll WHERE company_id=:cid
           ORDER BY processed_at DESC NULLS LAST 
           LIMIT 6`,
          { cid }
        ),
        // FIX: Cast financial trend data to numeric
        query(
          `SELECT pay_month,
              COALESCE(SUM(gross_salary), 0)::numeric AS total_gross,
              COALESCE(SUM(net_salary), 0)::numeric   AS total_net
           FROM payroll
           WHERE company_id=:cid
             AND pay_year = EXTRACT(YEAR FROM CURRENT_DATE)
           GROUP BY pay_month
           ORDER BY pay_month ASC`,
          { cid }
        ),
      ]);

    return NextResponse.json({
      employees: empStats.rows[0],
      payroll: payStats.rows[0],
      departments: deptStats.rows,
      leaves: leaveStats.rows[0],
      recentPayroll: recentPay.rows,
      payrollTrend: trendStats.rows,
    });
  } catch (e) {
    // FIX: Updated to match your exact auth helper error string
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return serverError(e);
  }
}