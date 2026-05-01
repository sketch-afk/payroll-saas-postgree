import { NextResponse } from "next/server";
import { requireCompany, unauthorized, serverError } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function GET(req) {
  try {
    const cid = await requireCompany();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const dept = searchParams.get("dept") || "";
    const status = searchParams.get("status") || "";

    // Make sure you have created the vw_employees view in Neon!
    let sql = `SELECT * FROM vw_employees WHERE company_id = :cid`;
    const binds = { cid };

    if (search) {
      // POSTGRES UPGRADE: ILIKE is Postgres's native case-insensitive search
      sql += ` AND (full_name ILIKE :s OR email ILIKE :s)`;
      binds.s = `%${search}%`;
    }
    if (dept) {
      sql += ` AND dept_id = :dept`;
      binds.dept = dept;
    }
    if (status) {
      sql += ` AND status  = :status`;
      binds.status = status;
    }

    sql += ` ORDER BY emp_id`;

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
      return NextResponse.json(
        { error: "Invalid or missing JSON body" },
        { status: 400 }
      );
    }

    const {
      first_name, last_name, email, phone, hire_date, job_title, dept_id,
      basic_salary, hra, da, ta, medical, pf_percent, tax_percent,
    } = body;

    if (!first_name || !last_name || !email || !hire_date || !basic_salary) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    // Check duplicate email within company
    const dup = await queryOne(
      `SELECT emp_id FROM employees WHERE company_id = :cid AND LOWER(email) = LOWER(:email)`,
      { cid, email }
    );
    
    if (dup) {
      return NextResponse.json({ error: "Employee with this email already exists" }, { status: 409 });
    }

    const insertEmployee = await query(
      `INSERT INTO employees
         (company_id, dept_id, first_name, last_name, email, phone, hire_date, job_title, status)
       VALUES
         (:cid, :dept_id, :fn, :ln, :email, :phone, CAST(:hire_date AS DATE), :jt, 'ACTIVE')
       RETURNING emp_id`,
      {
        cid,
        dept_id: dept_id || null,
        fn: first_name,
        ln: last_name,
        email,
        phone: phone || null,
        hire_date,
        jt: job_title || null,
      }
    );

    const emp_id = insertEmployee.rows[0].emp_id;

    // POSTGRES FIX: is_current = true
    await query(
      `INSERT INTO salary_structures
         (company_id, emp_id, basic_salary, hra, da, ta, medical, pf_percent, tax_percent, effective_from, is_current)
       VALUES
         (:cid, :emp_id, :bs, :hra, :da, :ta, :med, :pf, :tax, CURRENT_DATE, true)`,
      {
        cid,
        emp_id,
        bs: parseFloat(basic_salary) || 0,
        hra: parseFloat(hra) || 0,
        da: parseFloat(da) || 0,
        ta: parseFloat(ta) || 0,
        med: parseFloat(medical) || 0,
        pf: parseFloat(pf_percent) || 12,
        tax: parseFloat(tax_percent) || 10,
      }
    );

    return NextResponse.json(
      { message: "Employee added successfully", emp_id },
      { status: 201 }
    );
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();

    if (e.message && e.message.includes("invalid input syntax for type date")) {
      return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
    }

    return serverError(e);
  }
}