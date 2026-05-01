import { NextResponse } from "next/server";
import { requireCompany, unauthorized, serverError } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req) {
  try {
    const cid = await requireCompany();
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const month = monthParam ? parseInt(monthParam, 10) : null;
    const year = yearParam ? parseInt(yearParam, 10) : null;

    let sql = `SELECT * FROM vw_payroll WHERE company_id = :cid`;
    const binds = { cid };

    if (month && !isNaN(month)) {
      sql += ` AND pay_month = :month`;
      binds.month = month;
    }
    if (year && !isNaN(year)) {
      sql += ` AND pay_year = :year`;
      binds.year = year;
    }

    sql += ` ORDER BY pay_year DESC, pay_month DESC, full_name`;
    const result = await query(sql, binds);
    return NextResponse.json({ data: result.rows });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req) {
  try {
    const cid = await requireCompany();
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { month, year } = body;
    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    const pMonth = parseInt(month, 10);
    const pYear = parseInt(year, 10);
    const daysInMonth = new Date(pYear, pMonth, 0).getDate();

    // Pulling all necessary columns for math
    const empResult = await query(
      `SELECT emp_id, basic_salary, hra, da, ta, medical, pf_percent, tax_percent 
       FROM vw_employees 
       WHERE company_id = :cid AND status = 'ACTIVE'`, 
      { cid }
    );

    for (const emp of empResult.rows) {
      const attResult = await query(
        `SELECT 
            COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END), 0)::numeric AS present,
            COALESCE(SUM(CASE WHEN status = 'HALF_DAY' THEN 0.5 ELSE 0 END), 0)::numeric AS half_day
         FROM attendance
         WHERE company_id = :cid AND emp_id = :empId
           AND EXTRACT(MONTH FROM att_date) = :month
           AND EXTRACT(YEAR FROM att_date) = :year`,
        { cid, empId: emp.emp_id, month: pMonth, year: pYear }
      );

      const att = attResult.rows[0];
      const daysWorked = parseFloat(att.present) + parseFloat(att.half_day);
      const effectiveDays = daysWorked > 0 ? daysWorked : daysInMonth;
      const ratio = effectiveDays / daysInMonth;

      // --- BULLETPROOF MATH BLOCK ---
      const rawBasic   = Number(emp.basic_salary || 0);
      const rawHra     = Number(emp.hra || 0);
      const rawDa      = Number(emp.da || 0);
      const rawTa      = Number(emp.ta || 0);
      const rawMedical = Number(emp.medical || 0);
      const pfPct      = Number(emp.pf_percent || 12);
      const taxPct     = Number(emp.tax_percent || 10);

      // 1. Calculate Prorated Basic (Basic changes based on attendance)
      const proratedBasic = Math.round((rawBasic * ratio) * 100) / 100;

      // 2. Calculate Gross (Note: Allowances are usually fixed per month)
      const currentGross = proratedBasic + rawHra + rawDa + rawTa + rawMedical;

      // 3. Calculate Deductions
      const pfDeduction  = Math.round((proratedBasic * (pfPct / 100)) * 100) / 100;
      const taxDeduction = Math.round((currentGross * (taxPct / 100)) * 100) / 100;
      const otherDed     = 0;

      // 4. Final Net
      const netSalary = currentGross - (pfDeduction + taxDeduction + otherDed);

      await query(
        `INSERT INTO payroll (
          company_id, emp_id, pay_month, pay_year, basic_salary, hra, da, ta, medical,
          pf_deduction, tax_deduction, other_deductions, net_salary,
          days_worked, days_in_month, status, processed_at
        ) VALUES (
          :cid, :empId, :month, :year, :basic, :hra, :da, :ta, :medical,
          :pf, :tax, :otherDed, :net,
          :daysWorked, :daysInMonth, 'PROCESSED', CURRENT_TIMESTAMP
        )
        ON CONFLICT (company_id, emp_id, pay_month, pay_year)
        DO UPDATE SET
          basic_salary = EXCLUDED.basic_salary,
          hra = EXCLUDED.hra,
          da = EXCLUDED.da,
          ta = EXCLUDED.ta,
          medical = EXCLUDED.medical,
          pf_deduction = EXCLUDED.pf_deduction,
          tax_deduction = EXCLUDED.tax_deduction,
          other_deductions = EXCLUDED.other_deductions,
          net_salary = EXCLUDED.net_salary,
          days_worked = EXCLUDED.days_worked,
          days_in_month = EXCLUDED.days_in_month,
          status = 'PROCESSED',
          processed_at = CURRENT_TIMESTAMP`,
        {
          cid, empId: emp.emp_id, month: pMonth, year: pYear,
          basic: proratedBasic, 
          hra: rawHra, 
          da: rawDa, 
          ta: rawTa, 
          medical: rawMedical, 
          pf: pfDeduction, 
          tax: taxDeduction, 
          otherDed, 
          net: netSalary,
          daysWorked: effectiveDays, daysInMonth
        }
      );
    }

    return NextResponse.json(
      { message: `Payroll processed successfully for ${month}/${year}` },
      { status: 201 }
    );
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return serverError(e);
  }
}

export async function PUT(req) {
  try {
    const cid = await requireCompany();
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { month, year, employeeId } = body;
    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    let sql = `UPDATE payroll SET status = 'PAID' WHERE company_id = :cid AND pay_month = :month AND pay_year = :year AND status = 'PROCESSED'`;
    const binds = {
      cid,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
    };

    if (employeeId) {
      sql += ` AND emp_id = :employeeId`;
      binds.employeeId = Number(employeeId);
    }

    await query(sql, binds);
    return NextResponse.json({ message: `Payroll updated successfully` });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return serverError(e);
  }
}