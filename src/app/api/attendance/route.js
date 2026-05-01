import { NextResponse } from "next/server";
import { requireCompany, unauthorized, serverError } from "@/lib/auth";
// IMPORT FIX: We import 'pool' directly to use in the PUT transaction
import pool, { query } from "@/lib/db"; 

export async function GET(req) {
  try {
    const cid = await requireCompany();
    const { searchParams } = new URL(req.url);

    const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get("year")) || new Date().getFullYear();
    const emp = searchParams.get("emp");

    let sql = `
      SELECT a.att_id, a.att_date, a.status,
             e.emp_id, CONCAT_WS(' ', e.first_name, e.last_name) AS full_name,
             e.job_title, d.dept_name
      FROM attendance a
      JOIN employees e ON e.emp_id = a.emp_id
      LEFT JOIN departments d ON d.dept_id = e.dept_id
      WHERE a.company_id = :cid
        AND EXTRACT(MONTH FROM a.att_date) = :month
        AND EXTRACT(YEAR FROM a.att_date) = :year
    `;

    const binds = { cid, month, year };

    if (emp) {
      sql += ` AND a.emp_id = :emp`;
      binds.emp = emp;
    }

    sql += ` ORDER BY a.att_date DESC, full_name`;

    const result = await query(sql, binds);
    return NextResponse.json({ data: result.rows });
  } catch (e) {
    // FIX: Updated to match your exact auth helper error string
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

    const { emp_id, att_date, status } = body;

    if (!emp_id || !att_date) {
      return NextResponse.json({ error: "emp_id and att_date are required" }, { status: 400 });
    }

    // FIX: Used CAST(:dt AS DATE) instead of :dt::date to prevent regex confusion 
    // in your normalizeSql helper.
    await query(
      `INSERT INTO attendance (company_id, emp_id, att_date, status)
       VALUES (:cid, :eid, CAST(:dt AS DATE), :status)
       ON CONFLICT (company_id, emp_id, att_date)
       DO UPDATE SET status = EXCLUDED.status`,
      { cid, eid: emp_id, dt: att_date, status: status || "PRESENT" }
    );

    return NextResponse.json({ message: "Attendance saved successfully" });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
  }
}

// Bulk mark attendance for a date (OPTIMIZED FOR BATCH EXECUTION)
export async function PUT(req) {
  try {
    const cid = await requireCompany();
    let body;
    
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No valid records provided" }, { status: 400 });
    }

    let savedCount = 0;
    // FIX: We grab a client from the global pool for our transaction
    const client = await pool.connect(); 

    try {
      await client.query("BEGIN");

      for (const r of records) {
        if (!r.emp_id || !r.att_date) continue;

        // Using standard positional parameters here since we bypass the query() helper
        // to keep everything inside this specific transaction client.
        await client.query(
          `INSERT INTO attendance (company_id, emp_id, att_date, status)
           VALUES ($1, $2, CAST($3 AS DATE), $4)
           ON CONFLICT (company_id, emp_id, att_date)
           DO UPDATE SET status = EXCLUDED.status`,
          [cid, r.emp_id, r.att_date, r.status || "PRESENT"]
        );
        savedCount++;
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err; // Let the outer block catch and handle this
    } finally {
      client.release();
    }

    return NextResponse.json({ message: `${savedCount} records saved successfully` });
  } catch (e) {
    if (e.message === "UNAUTHORIZED_ACCESS") return unauthorized();
    return NextResponse.json({ error: "Invalid date format found in batch." }, { status: 400 });
  }
}