import { NextResponse } from "next/server";
import { requireCompany, unauthorized, serverError } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const cid = await requireCompany();
    const { id } = params;

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // SCENARIO 1: Quick Status Toggle
    if (Object.keys(body).length === 1 && body.status) {
      await query(
        `UPDATE employees SET status = :status WHERE emp_id = :id AND company_id = :cid`,
        { status: body.status, id, cid }
      );
      return NextResponse.json({ message: `Employee marked as ${body.status}` });
    }

    // SCENARIO 2: Full Form Edit
    const {
      first_name, last_name, email, phone, hire_date, job_title, dept_id,
      basic_salary, hra, da, ta, medical, pf_percent, tax_percent, status,
    } = body;

    // 1. Update personal details
    // POSTGRES FIX: Safely cast :hd to DATE
    await query(
      `UPDATE employees
       SET first_name = :fn, last_name = :ln, email = :email, phone = :phone,
           hire_date = CAST(:hd AS DATE), job_title = :jt, dept_id = :dept,
           status = :status
       WHERE emp_id = :id AND company_id = :cid`,
      {
        fn: first_name, ln: last_name, email, phone: phone || null,
        hd: hire_date, jt: job_title || null, dept: dept_id || null,
        status: status || "ACTIVE", id, cid,
      }
    );

    // 2. Update salary structure
    // POSTGRES FIX: is_current = true
    await query(
      `UPDATE salary_structures
       SET basic_salary = :bs, hra = :hra, da = :da, ta = :ta, medical = :med,
           pf_percent = :pf, tax_percent = :tax
       WHERE emp_id = :id AND company_id = :cid AND is_current = true`,
      {
        bs: parseFloat(basic_salary) || 0,
        hra: parseFloat(hra) || 0,
        da: parseFloat(da) || 0,
        ta: parseFloat(ta) || 0,
        med: parseFloat(medical) || 0,
        pf: parseFloat(pf_percent) || 12,
        tax: parseFloat(tax_percent) || 10,
        id, cid,
      }
    );

    return NextResponse.json({ message: "Employee updated successfully" });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    if (e.message && e.message.includes("invalid input syntax for type date")) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }
    return serverError(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    const cid = await requireCompany();
    const { id } = params;

    await query(
      `DELETE FROM salary_structures WHERE emp_id = :id AND company_id = :cid`,
      { id, cid }
    );

    await query(
      `DELETE FROM employees WHERE emp_id = :id AND company_id = :cid`,
      { id, cid }
    );

    return NextResponse.json({ message: "Employee permanently deleted" });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();

    if (e.message && e.message.includes("violates foreign key constraint")) {
      return NextResponse.json(
        { error: "Cannot delete: This employee has linked payroll or attendance records. Deactivate them instead." },
        { status: 409 }
      );
    }

    return serverError(e);
  }
}