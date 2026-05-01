"use client";
import { useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MO = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function ProcessModal({ open, onClose, onDone }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setRunning(true);
    setMsg("");
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
      setTimeout(() => {
        onDone();
        onClose();
        setMsg("");
      }, 1400);
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 pt-6 pb-4 flex items-center justify-between border-b"
          style={{ borderColor: "rgba(201,150,58,0.1)" }}
        >
          <h2
            className="font-display font-bold text-xl"
            style={{ color: "#C9963A" }}
          >
            Process Payroll
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: "#3A3A5C" }}
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm" style={{ color: "#5C5C85" }}>
            Runs the{" "}
            <code
              className="font-mono px-1.5 py-0.5 rounded text-xs"
              style={{ background: "rgba(201,150,58,0.1)", color: "#C9963A" }}
            >
              payroll calculation
            </code>{" "}
            for all active employees in your company.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="field"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="field"
                min="2020"
                max="2030"
              />
            </div>
          </div>
          {msg && (
            <div
              className={
                msg.startsWith("Error") ? "banner-error" : "banner-success"
              }
            >
              {msg}
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={run} disabled={running} className="btn-primary">
            {running ? (
              <>
                <span
                  className="spinner"
                  style={{ width: 14, height: 14, borderWidth: 2 }}
                />{" "}
                Running…
              </>
            ) : (
              "⚡ Run Payroll"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const now = new Date();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [payslipMessage, setPayslipMessage] = useState("");
  const [busyPayslipId, setBusyPayslipId] = useState(null);
  const [busyMarkPaidId, setBusyMarkPaidId] = useState(null);

  const fetchPayroll = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterMonth) p.set("month", filterMonth);
    if (filterYear) p.set("year", filterYear);
    fetch(`/api/payroll?${p}`)
      .then((r) => r.json())
      .then((d) => {
        setRecords(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterMonth, filterYear]);

  function formatDate(value) {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  async function getPayslipData(empId, month, year) {
    const res = await fetch(
      `/api/payroll/payslip?empId=${empId}&month=${month}&year=${year}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not generate payslip");
    return data.data;
  }

  function buildPayslipPDF(data) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 40;
    const right = 300;
    let y = 60;

    // POSTGRES FIX: Lowercase keys for the entire PDF generator
    const monthLabel = MO[(data.pay_month || 1) - 1] || "Unknown";
    const employeeName =
      `${data.first_name || ""} ${data.last_name || ""}`.trim();

    doc
      .setFont("helvetica", "bold")
      .setFontSize(26)
      .text("Payslip", pageWidth / 2, y, {
        align: "center",
      });
    y += 30;
    doc
      .setFont("helvetica", "normal")
      .setFontSize(11)
      .setTextColor(79, 88, 104);
    doc.text(
      `${data.company_name || "Payroll SaaS"} • ${monthLabel} ${data.pay_year}`,
      pageWidth / 2,
      y,
      {
        align: "center",
      },
    );
    y += 30;

    doc.setDrawColor(226, 232, 240).setLineWidth(1);
    doc.line(left, y, pageWidth - left, y);
    y += 24;

    function row(label, value, x = left, width = 220) {
      doc
        .setFont("helvetica", "bold")
        .setFontSize(10)
        .setTextColor(30, 41, 59)
        .text(`${label}`, x, y);
      doc
        .setFont("helvetica", "normal")
        .setFontSize(10)
        .setTextColor(55, 65, 81)
        .text(`${value}`, x + 120, y, { maxWidth: width });
      y += 18;
    }

    doc
      .setFont("helvetica", "bold")
      .setFontSize(12)
      .setTextColor(15, 23, 42)
      .text("Employee Details", left, y);
    y += 18;
    row("Name:", employeeName || "—");
    row("Employee ID:", data.emp_id || "—");
    row("Department:", data.dept_name || "—");
    row("Job Title:", data.job_title || "—");
    row("Email:", data.email || "—");
    row("Phone:", data.phone || "—");
    row("Hire Date:", formatDate(data.hire_date));

    y += 10;
    doc.setDrawColor(226, 232, 240).line(left, y, pageWidth - left, y);
    y += 20;

    doc
      .setFont("helvetica", "bold")
      .setFontSize(12)
      .text("Salary Summary", left, y);
    y += 18;
    row("Basic Salary:", `₹${formatValue(data.basic_salary)}`);
    row("HRA:", `₹${formatValue(data.hra)}`);
    row("DA:", `₹${formatValue(data.da)}`);
    row("TA:", `₹${formatValue(data.ta)}`);
    row("Medical:", `₹${formatValue(data.medical)}`);
    doc.setFont("helvetica", "bold").setTextColor(15, 23, 42);
    row("Gross Salary:", `₹${formatValue(data.gross_salary)}`);
    doc.setFont("helvetica", "normal").setTextColor(55, 65, 81);

    y += 10;
    doc.setDrawColor(226, 232, 240).line(left, y, pageWidth - left, y);
    y += 20;

    doc
      .setFont("helvetica", "bold")
      .setFontSize(12)
      .text("Deductions", left, y);
    y += 18;
    row("PF Deduction:", `₹${formatValue(data.pf_deduction)}`);
    row("Tax Deduction:", `₹${formatValue(data.tax_deduction)}`);
    row("Other Deductions:", `₹${formatValue(data.other_deductions)}`);
    doc.setFont("helvetica", "bold").setTextColor(15, 23, 42);
    row("Net Salary:", `₹${formatValue(data.net_salary)}`);
    doc.setFont("helvetica", "normal").setTextColor(55, 65, 81);

    y += 10;
    doc.setDrawColor(226, 232, 240).line(left, y, pageWidth - left, y);
    y += 20;

    doc
      .setFont("helvetica", "bold")
      .setFontSize(12)
      .text("Attendance", left, y);
    y += 18;
    row("Present:", data.present_days ?? 0);
    row("Absent:", data.absent_days ?? 0);
    row("Half Days:", data.half_day_count ?? 0);
    row("Leave Days:", data.leave_days ?? 0);
    row("Days Worked:", `${data.days_worked ?? 0}/${data.days_in_month ?? 0}`);

    y += 24;
    doc
      .setFont("helvetica", "italic")
      .setFontSize(9)
      .setTextColor(107, 114, 128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-IN")}. Status: ${data.status || "—"}.`,
      left,
      y,
    );

    return doc.output("blob");
  }

  function formatValue(value) {
    return Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function downloadFile(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPayslip(record) {
    setBusyPayslipId(record.emp_id);
    setPayslipMessage("");
    try {
      const payload = await getPayslipData(
        record.emp_id,
        record.pay_month,
        record.pay_year,
      );
      const blob = buildPayslipPDF(payload);
      const filename = `payslip-${payload.first_name || "employee"}-${payload.pay_month}-${payload.pay_year}.pdf`;
      downloadFile(filename, blob);
      setPayslipMessage("Payslip downloaded successfully.");
    } catch (err) {
      setPayslipMessage(err.message);
    } finally {
      setBusyPayslipId(null);
    }
  }

  async function handleSharePayslip(record) {
    setBusyPayslipId(record.emp_id);
    setPayslipMessage("");
    try {
      const payload = await getPayslipData(
        record.emp_id,
        record.pay_month,
        record.pay_year,
      );
      const blob = buildPayslipPDF(payload);
      const filename = `payslip-${payload.first_name || "employee"}-${payload.pay_month}-${payload.pay_year}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.share) {
        const shareData = {
          title: `Payslip for ${payload.first_name} ${payload.last_name}`,
          text: `Payslip for ${payload.first_name} ${payload.last_name} — ${MO[(payload.pay_month || 1) - 1]} ${payload.pay_year}`,
        };
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
        await navigator.share(shareData);
        setPayslipMessage("Payslip shared successfully.");
      } else {
        downloadFile(filename, blob);
        setPayslipMessage(
          "Sharing is not supported in this browser. The PDF was downloaded instead.",
        );
      }
    } catch (err) {
      setPayslipMessage(err.message);
    } finally {
      setBusyPayslipId(null);
    }
  }

  async function handleMarkPaidEmployee(record) {
    setBusyMarkPaidId(record.emp_id);
    setPayslipMessage("");
    try {
      if (!record.pay_month || !record.pay_year) {
        throw new Error("Cannot mark this payroll entry as paid.");
      }
      await fetch("/api/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: record.pay_month,
          year: record.pay_year,
          employeeId: record.emp_id,
        }),
      });
      setPayslipMessage(`Marked payroll paid for ${record.full_name}.`);
      fetchPayroll();
    } catch (err) {
      setPayslipMessage(err.message);
    } finally {
      setBusyMarkPaidId(null);
    }
  }

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  async function markPaid() {
    if (!filterMonth || !filterYear) {
      alert("Select a specific month and year first");
      return;
    }
    await fetch("/api/payroll", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: filterMonth, year: filterYear }),
    });
    fetchPayroll();
  }

  // POSTGRES FIX: lowercase properties in reducers
  const totalGross = records.reduce((s, r) => s + Number(r.gross_salary || 0), 0);
  const totalNet = records.reduce((s, r) => s + Number(r.net_salary || 0), 0);
  const totalPF = records.reduce((s, r) => s + Number(r.pf_deduction || 0), 0);
  const totalTax = records.reduce((s, r) => s + Number(r.tax_deduction || 0), 0);
  const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="anim-up">
          <div className="font-mono text-xs mb-1" style={{ color: "#3A3A5C" }}>
            ◎ Payroll
          </div>
          <h1 className="page-title">
            Payroll <span style={{ color: "#C9963A" }}>Records</span>
          </h1>
          <p className="page-subtitle">{records.length} records found</p>
        </div>
        <div className="flex gap-3 anim-up">
          {filterMonth &&
            filterYear &&
            records.some((r) => r.status === "PROCESSED") && ( // POSTGRES FIX
              <button onClick={markPaid} className="btn-ghost">
                ✓ Mark Paid
              </button>
            )}
          <button onClick={() => setModal(true)} className="btn-primary">
            ⚡ Process Payroll
          </button>
        </div>
      </div>

      {payslipMessage && (
        <div
          className="glass rounded-2xl p-4 text-sm font-medium anim-up delay-1"
          style={{ color: "#3A3A5C", background: "rgba(255,255,255,0.18)" }}
        >
          {payslipMessage}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 anim-up delay-1">
        {[
          { label: "Total Gross", value: fmt(totalGross), color: "#C9963A" },
          { label: "Total Net", value: fmt(totalNet), color: "#3DBF82" },
          { label: "PF Total", value: fmt(totalPF), color: "#E05A5A" },
          { label: "Tax Total", value: fmt(totalTax), color: "#5C5C85" },
        ].map((c, i) => (
          <div key={i} className="stat-card">
            <div className="label" style={{ color: c.color }}>
              {c.label}
            </div>
            <div
              className="font-mono font-extrabold text-xl mt-1"
              style={{ color: "#EEEEF5" }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 anim-up delay-2">
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="field"
          style={{ width: 170 }}
        >
          <option value="">All Months</option>
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          placeholder="Year"
          className="field"
          style={{ width: 110 }}
          min="2020"
          max="2030"
        />
        <button
          onClick={() => {
            setFilterMonth("");
            setFilterYear(String(now.getFullYear()));
          }}
          className="btn-ghost"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden anim-up delay-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <div style={{ fontSize: 48 }} className="mb-3">
              💸
            </div>
            <p className="font-display font-bold" style={{ color: "#5C5C85" }}>
              No payroll records
            </p>
            <p className="text-sm mt-1 mb-5" style={{ color: "#3A3A5C" }}>
              Add employees and click "Process Payroll" to generate records
            </p>
            <button onClick={() => setModal(true)} className="btn-primary">
              ⚡ Process Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full tbl">
              <thead>
                <tr>
                  <th className="text-left pl-6">Employee</th>
                  <th className="text-left">Dept</th>
                  <th className="text-center">Period</th>
                  <th className="text-right">Basic</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">PF</th>
                  <th className="text-right">Tax</th>
                  <th className="text-right">Net Pay</th>
                  <th className="text-center">Days</th>
                  <th className="text-left">Actions</th>
                  <th className="text-left pr-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td className="pl-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            background: "rgba(201,150,58,0.15)",
                            color: "#C9963A",
                          }}
                        >
                          {/* POSTGRES FIX: lowercase full_name */}
                          {r.full_name?.[0]}
                        </div>
                        <div>
                          <div
                            className="font-medium text-sm"
                            style={{ color: "#EEEEF5" }}
                          >
                            {/* POSTGRES FIX: lowercase full_name */}
                            {r.full_name}
                          </div>
                          <div className="text-xs" style={{ color: "#3A3A5C" }}>
                            {/* POSTGRES FIX: lowercase job_title */}
                            {r.job_title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm" style={{ color: "#5C5C85" }}>
                      {/* POSTGRES FIX: lowercase dept_name */}
                      {r.dept_name || "—"}
                    </td>
                    <td
                      className="text-center font-mono text-xs"
                      style={{ color: "#5C5C85" }}
                    >
                      {/* POSTGRES FIX: lowercase pay_month and pay_year */}
                      {MO[(r.pay_month || 1) - 1]} {r.pay_year}
                    </td>
                    <td
                      className="text-right font-mono text-sm"
                      style={{ color: "#8E8EAD" }}
                    >
                      {/* POSTGRES FIX: lowercase basic_salary */}
                      {fmt(r.basic_salary)}
                    </td>
                    <td
                      className="text-right font-mono text-sm"
                      style={{ color: "#C4C4DA" }}
                    >
                      {/* POSTGRES FIX: lowercase gross_salary */}
                      {fmt(r.gross_salary)}
                    </td>
                    <td
                      className="text-right font-mono text-sm"
                      style={{ color: "#E05A5A" }}
                    >
                      {/* POSTGRES FIX: lowercase pf_deduction */}
                      {fmt(r.pf_deduction)}
                    </td>
                    <td
                      className="text-right font-mono text-sm"
                      style={{ color: "#E05A5A" }}
                    >
                      {/* POSTGRES FIX: lowercase tax_deduction */}
                      {fmt(r.tax_deduction)}
                    </td>
                    <td
                      className="text-right font-mono font-bold text-sm"
                      style={{ color: "#3DBF82" }}
                    >
                      {/* POSTGRES FIX: lowercase net_salary */}
                      {fmt(r.net_salary)}
                    </td>
                    <td
                      className="text-center font-mono text-xs"
                      style={{ color: "#5C5C85" }}
                    >
                      {/* POSTGRES FIX: lowercase days_worked and days_in_month */}
                      {/* {r.days_worked}/{r.days_in_month} */}
                      {Number(r.days_worked)}/{r.days_in_month}
                    </td>
                    <td className="space-x-2">
                      {r.status === "PROCESSED" ? ( // POSTGRES FIX
                        <button
                          disabled={busyMarkPaidId === r.emp_id} // POSTGRES FIX
                          onClick={() => handleMarkPaidEmployee(r)}
                          className="btn-ghost"
                        >
                          {busyMarkPaidId === r.emp_id
                            ? "Marking…"
                            : "Mark Paid"}
                        </button>
                      ) : null}
                      <button
                        disabled={busyPayslipId === r.emp_id} // POSTGRES FIX
                        onClick={() => handleDownloadPayslip(r)}
                        className="btn-ghost"
                      >
                        {busyPayslipId === r.emp_id
                          ? "Downloading…"
                          : "Download"}
                      </button>
                      <button
                        disabled={busyPayslipId === r.emp_id} // POSTGRES FIX
                        onClick={() => handleSharePayslip(r)}
                        className="btn-ghost"
                      >
                        {busyPayslipId === r.emp_id ? "Sharing…" : "Share"}
                      </button>
                    </td>
                    <td className="pr-6">
                      <span
                        // POSTGRES FIX: lowercase status
                        className={`badge badge-${(r.status || "").toLowerCase()}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProcessModal
        open={modal}
        onClose={() => setModal(false)}
        onDone={fetchPayroll}
      />
    </div>
  );
}