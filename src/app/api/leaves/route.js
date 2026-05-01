import { NextResponse } from "next/server";
import { requireCompany, unauthorized, serverError } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req) {
  try {
    const cid = await requireCompany();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const emp = searchParams.get("emp");

    // POSTGRES FIX: Use CONCAT_WS for safe null-handling
    let sql = `
      SELECT l.leave_id, l.leave_type, l.from_date, l.to_date,
             l.days, l.reason, l.status, l.applied_at,
             e.emp_id, CONCAT_WS(' ', e.first_name, e.last_name) AS full_name,
             e.job_title, d.dept_name
      FROM leaves l
      JOIN employees e ON e.emp_id = l.emp_id
      LEFT JOIN departments d ON d.dept_id = e.dept_id
      WHERE l.company_id = :cid
    `;

    const binds = { cid };

    if (status) {
      sql += ` AND l.status = :status`;
      binds.status = status;
    }
    if (emp) {
      sql += ` AND l.emp_id = :emp`;
      binds.emp = emp;
    }

    sql += ` ORDER BY l.applied_at DESC`;

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

    const { emp_id, leave_type, from_date, to_date, reason } = body;

    if (!emp_id || !from_date || !to_date) {
      return NextResponse.json(
        { error: "emp_id, from_date, and to_date are required" },
        { status: 400 }
      );
    }

    // Validate that the end date is not before the start date
    if (new Date(from_date) > new Date(to_date)) {
      return NextResponse.json(
        { error: "to_date cannot be before from_date" },
        { status: 400 }
      );
    }

    // POSTGRES FIX: Use CAST() instead of ::date to protect the db.js regex
    await query(
      `INSERT INTO leaves (company_id, emp_id, leave_type, from_date, to_date, reason, status)
       VALUES (:cid, :eid, :type, CAST(:fd AS DATE), CAST(:td AS DATE), :reason, 'PENDING')`,
      {
        cid,
        eid: emp_id,
        type: leave_type || "CASUAL",
        fd: from_date,
        td: to_date,
        reason: reason || null,
      }
    );

    return NextResponse.json(
      { message: "Leave applied successfully" },
      { status: 201 }
    );
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();

    // BUG FIX: Wrapped this in an IF statement so it doesn't swallow real server errors
    if (e.message && e.message.includes("invalid input syntax for type date")) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Invalid or missing JSON body" },
        { status: 400 }
      );
    }

    const { leave_id, status } = body;

    if (!leave_id) {
      return NextResponse.json(
        { error: "leave_id is required" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    await query(
      `UPDATE leaves SET status = :status
       WHERE leave_id = :lid AND company_id = :cid`,
      { status, lid: leave_id, cid }
    );

    return NextResponse.json({
      message: `Leave ${status.toLowerCase()} successfully`,
    });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return serverError(e);
  }
}