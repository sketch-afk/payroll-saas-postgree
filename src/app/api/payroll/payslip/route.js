import { NextResponse } from "next/server";
import { requireCompany, unauthorized, serverError } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET(req) {
  try {
    const cid = await requireCompany();
    const { searchParams } = new URL(req.url);

    const empId = searchParams.get("empId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!empId || !month || !year) {
      return NextResponse.json(
        { error: "empId, month, and year are required" },
        { status: 400 }
      );
    }

    const data = await queryOne(
      `SELECT
         c.name AS company_name,
         e.emp_id, e.first_name, e.last_name, e.email, e.phone, e.hire_date, e.job_title,
         d.dept_name,
         p.pay_month, p.pay_year, p.basic_salary, p.hra, p.da, p.ta, p.medical,
         p.gross_salary, p.pf_deduction, p.tax_deduction, p.other_deductions,
         p.net_salary, p.days_worked, p.days_in_month, p.status, p.processed_at,
         COALESCE(a.present, 0)::numeric AS present_days,
         COALESCE(a.absent, 0)::numeric AS absent_days,
         COALESCE(a.half_day, 0)::numeric AS half_day_count,
         COALESCE(a.leave_count, 0)::numeric AS leave_days
       FROM payroll p
       JOIN companies c ON p.company_id = c.company_id
       JOIN employees e ON p.emp_id = e.emp_id AND p.company_id = e.company_id
       LEFT JOIN departments d ON e.dept_id = d.dept_id
       LEFT JOIN (
         SELECT emp_id,
                SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
                SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent,
                SUM(CASE WHEN status = 'HALF_DAY' THEN 1 ELSE 0 END) AS half_day,
                SUM(CASE WHEN status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_count
         FROM attendance
         WHERE company_id = :cid
           AND EXTRACT(MONTH FROM att_date) = :month
           AND EXTRACT(YEAR FROM att_date) = :year
         GROUP BY emp_id
       ) a ON a.emp_id = p.emp_id
       WHERE p.company_id = :cid
         AND p.pay_month = :month
         AND p.pay_year = :year
         AND p.emp_id = :empId`,
      {
        cid,
        empId: Number(empId),
        month: Number(month),
        year: Number(year),
      }
    );

    if (!data) {
      return NextResponse.json({ error: "Payslip details not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return serverError(e);
  }
}