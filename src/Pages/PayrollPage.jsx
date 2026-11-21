import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, WalletCards, RefreshCw, Plus, Pencil, Eye, X } from "lucide-react";
import { deleteSalarySlip, deleteMonthlySalarySlips, getPayrollDays, generateSalarySlips, getPayrollEmployees, getPayrollStructures, getSalarySlips, savePayrollStructure } from "../lib/api";
import { downloadSalaryPdf } from "../lib/salaryPdf";
import "./PayrollPage.css";

const money = (value) => Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR" });
const monthLabel = (month) => new Date(`${month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const currentMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date());
const fields = [["basicSalary", "Basic salary"], ["allowances", "Allowances"], ["pfDeduction", "Employee PF deduction"], ["otherDeductions", "Other deductions"]];

function PayrollModal({ title, busy, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return createPortal(<dialog ref={dialog} className="payroll-page payroll-modal" aria-label={title}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (!busy && event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onClose();
    }}>
    <div className="payroll-modal-heading"><h2>{title}</h2><button type="button" className="filter-btn" disabled={busy} onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>
    {children}
  </dialog>, document.body);
}

function SalarySlip({ slip }) {
  return <article className="salary-breakup" aria-label={`Salary slip for ${monthLabel(slip.salary_month)}`}>
    <header className="breakup-header"><div className="breakup-school"><span/><b>{slip.school_name}</b></div><p>Payslip for <strong>{monthLabel(slip.salary_month)}</strong></p></header>
    <dl className="breakup-details"><div><dt>Emp No.</dt><dd>{slip.employee_code}</dd></div><div><dt>Designation</dt><dd>Teacher</dd></div><div><dt>Name</dt><dd>{slip.employee_name}</dd></div><div><dt>PF number</dt><dd>{slip.pf_number || "Not applicable"}</dd></div></dl>
    <div className="breakup-days"><span>Total days <b>{slip.total_days}</b></span><span>Payable days <b>{slip.paid_days}</b></span><span>{slip.attendance_based ? "Unpaid days" : "LWP days"} <b>{slip.lwp_days}</b></span></div>
    <div className="breakup-table-wrap"><table className="breakup-table"><thead><tr><th className="breakup-earnings">Earnings</th><th>Per month</th><th className="breakup-deductions">Deductions</th><th>Per month</th></tr></thead><tbody>
      <tr><th>Basic</th><td>{money(slip.basic_salary)}</td><th>PF</th><td>{money(slip.pf_deduction)}</td></tr>
      <tr><th>Allowances</th><td>{money(slip.allowances)}</td><th>Other deductions</th><td>{money(slip.other_deductions)}</td></tr>
      <tr><th></th><td></td><th>{slip.attendance_based ? "Unpaid days" : "Leave without pay"} ({slip.lwp_days} days)</th><td>{money(slip.lwp_deduction)}</td></tr>
    </tbody><tfoot><tr><th className="breakup-earnings">Gross earnings (A)</th><td className="breakup-earnings">{money(slip.gross_salary)}</td><th className="breakup-deductions">Gross deductions (B)</th><td className="breakup-deductions">{money(slip.total_deductions)}</td></tr><tr className="breakup-net"><th colSpan={2}>Net salary payable (A - B)</th><td colSpan={2}>{money(slip.net_salary)}</td></tr></tfoot></table></div>
    <p className="breakup-formula">{slip.attendance_based ? "Basic unpaid-day deduction: " : "LWP deduction: "}{money(slip.attendance_based ? slip.basic_salary : slip.gross_salary)} / {slip.total_days} days x {slip.lwp_days} unpaid days = {money(slip.lwp_deduction)}.</p>
    <footer>Generated {new Date(slip.generated_at).toLocaleDateString("en-IN")} | Slip ID: {slip.id}</footer>
  </article>;
}

export default function PayrollPage({ admin = false }) {
  const [slips, setSlips] = useState([]), [employees, setEmployees] = useState([]), [payrolls, setPayrolls] = useState([]);
  const [draft, setDraft] = useState(null), [editing, setEditing] = useState(false);
  const [month, setMonth] = useState(currentMonth), [filter, setFilter] = useState(""), [teacherId, setTeacherId] = useState("");
  const [selected, setSelected] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [revision, setRevision] = useState(0);
  const [dayRows, setDayRows] = useState([]), [dayOverrides, setDayOverrides] = useState({});
  const [daysLoading, setDaysLoading] = useState(true), [daysError, setDaysError] = useState("");
  const calendarDays = month ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate() : 0;
  useEffect(() => {
    if (!admin || !month) return;
    let live = true;
    setDaysLoading(true); setDaysError(""); setDayOverrides({});
    getPayrollDays(month).then(rows => { if (live) setDayRows(rows); })
      .catch(failure => { if (live) setDaysError(failure.message); })
      .finally(() => { if (live) setDaysLoading(false); });
    return () => { live = false; };
  }, [admin, month, payrolls, revision]);
  const [editorLoading, setEditorLoading] = useState(false);
  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    Promise.all([getSalarySlips(), ...(admin ? [getPayrollStructures(), getPayrollEmployees()] : [])]).then(([rows, saved, staff]) => {
      if (!live) return;
      setSlips(rows); setSelected((id) => rows.some((row) => row.id === id) ? id : "");
      if (admin) { setEmployees(staff); setPayrolls(saved); }
    }).catch((failure) => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [admin, revision]);
  useEffect(() => {
    if (admin) return;
    const refresh = () => setRevision((value) => value + 1);
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [admin]);
  const action = async (work) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (failure) { setError(failure.message || "Unable to complete this action."); }
    finally { setBusy(false); }
  };
  const available = employees.filter((employee) => !payrolls.some((payroll) => payroll.teacher_id === employee.id));
  const edit = async (row) => {
    setEditing(!!row); setError("");
    setDraft(row ? { teacherId: row.teacher_id, pfNumber: row.pf_number, basicSalary: row.basic_salary, allowances: row.allowances, pfDeduction: row.pf_deduction, otherDeductions: row.other_deductions }
      : { teacherId: "", pfNumber: "", basicSalary: "", allowances: "0", pfDeduction: "0", otherDeductions: "0" });
    setEditorLoading(true);
    try { const [staff, saved] = await Promise.all([getPayrollEmployees(), getPayrollStructures()]); setEmployees(staff); setPayrolls(saved); }
    catch (failure) { setError(failure.message); }
    finally { setEditorLoading(false); }

  };
  const save = (event) => {
    event.preventDefault();
    action(async () => {
      const salary = Object.fromEntries(fields.map(([key]) => [key, Number(draft[key])]));
      await savePayrollStructure({ teacherId: draft.teacherId, pfNumber: draft.pfNumber, salary }, editing);
      setDraft(null); setMessage(editing ? "Teacher payroll updated." : "Teacher payroll added.");
      const [saved, staff] = await Promise.all([getPayrollStructures(), getPayrollEmployees()]); setPayrolls(saved); setEmployees(staff);
    });
  };
  const generate = (event) => {
    event.preventDefault();
    action(async () => {
      const result = await generateSalarySlips(month, teacherId || null, Object.fromEntries(Object.entries(dayOverrides).filter(([id]) => !teacherId || id === teacherId).map(([id, days]) => [id, Number(days)])));
      setMessage(`${result.generated} salary slips generated for ${monthLabel(month)}. ${result.skipped} existing slips kept unchanged.`);
      const rows = await getSalarySlips(); setSlips(rows); setFilter(month); setSelected("");
    });
  };
  const remove = (row) => action(async () => {
    await deleteSalarySlip(row.id);
    setSlips(previous => previous.filter(item => item.id !== row.id));
    setSelected(previous => previous === row.id ? "" : previous);
    setMonth(row.salary_month.slice(0, 7)); setTeacherId(row.teacher_id);
    setMessage(`Salary slip for ${row.employee_name}, ${monthLabel(row.salary_month)}, removed. You can generate it again above.`);
  });
  const removeMonth = () => action(async () => {
    const removedMonth = filter;
    const result = await deleteMonthlySalarySlips(removedMonth);
    setSlips(previous => previous.filter(row => !row.salary_month.startsWith(removedMonth)));
    setSelected(""); setMonth(removedMonth); setTeacherId("");
    setMessage(`${result.deleted} salary slips removed for ${monthLabel(removedMonth)}. You can regenerate this month above.`);
  });
  const visible = slips.filter((slip) => !filter || slip.salary_month.startsWith(filter));
  const slip = slips.find((row) => row.id === selected);
  const view = (id) => { setError(""); setSelected(id); };
  return <div className="module-page payroll-page">
    <div className="module-title"><div className="module-icon"><WalletCards size={25}/></div><div><p className="eyebrow">FINANCE</p><h1>{admin ? "Teacher payroll" : "My salary slips"}</h1><p className="subtle">{admin ? "Individual salary structures and monthly slips for your teachers." : "Browse your monthly salary cards, view your slip or download a PDF."}</p></div><button className="filter-btn" disabled={busy || loading || !!draft} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15}/>Refresh</button></div>
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="payroll-success" role="status">{message}</p>}
    {loading && <p role="status">Loading payroll...</p>}
    {!loading && admin && <>
      <section className="panel payroll-employees"><div className="payroll-record-heading"><div><p className="payroll-kicker">INDIVIDUAL PAYROLL</p><h2>Teacher salary structures</h2><p>{payrolls.length} configured · {available.length} teachers need payroll setup</p></div><button className="primary-btn" disabled={busy || !!draft} onClick={() => edit(null)}><Plus size={16}/>Add Payroll</button></div>
        {!payrolls.length ? <p>Add payroll to set a teacher's salary and deductions.</p> : <div className="payroll-table-scroll"><table><thead><tr><th>Teacher / Employee ID</th><th>Basic</th><th>Allowances</th><th>PF deduction</th><th>Other deductions</th><th>Action</th></tr></thead><tbody>{payrolls.map((row) => <tr key={row.teacher_id}><td><b>{row.teacher_name}</b><br/>{row.employee_code}</td><td>{money(row.basic_salary)}</td><td>{money(row.allowances)}</td><td>{money(row.pf_deduction)}</td><td>{money(row.other_deductions)}</td><td><button className="filter-btn" disabled={busy || !!draft} onClick={() => edit(row)}><Pencil size={14}/>Edit payroll</button></td></tr>)}</tbody></table></div>}
        {!available.length && <p>All active teachers have payroll. Register a new teacher, then refresh to add their payroll.</p>}
      </section>
      {draft && <PayrollModal title={editing ? "Edit payroll" : "Add Payroll"} busy={busy || editorLoading} onClose={() => { setDraft(null); setError(""); }}><form className="payroll-structure" onSubmit={save}>{error && <p className="auth-error" role="alert">{error}</p>}{editorLoading && <p role="status">Refreshing teacher list...</p>}<p>Set this teacher's individual monthly amounts in INR. PF is a fixed monthly deduction.</p><fieldset disabled={busy || editorLoading}><div className="payroll-fields"><label>Teacher<select required disabled={editing} value={draft.teacherId} onChange={(event) => { const employee = employees.find((row) => row.id === event.target.value); const existing = payrolls.find((row) => row.teacher_id === event.target.value); if (existing) { setEditing(true); setDraft({ teacherId: existing.teacher_id, pfNumber: existing.pf_number, basicSalary: existing.basic_salary, allowances: existing.allowances, pfDeduction: existing.pf_deduction, otherDeductions: existing.other_deductions }); } else { setDraft({ ...draft, teacherId: event.target.value, pfNumber: employee?.pf_number || "" }); } }}><option value="">Select a teacher</option>{employees.map((row) => <option key={row.id} value={row.id}>{row.display_name} ({row.employee_code}){!editing && payrolls.some((payroll) => payroll.teacher_id === row.id) ? " - edit existing payroll" : ""}</option>)}</select></label><label>PF number<input maxLength={60} required={Number(draft.pfDeduction) > 0} value={draft.pfNumber} onChange={(event) => setDraft({ ...draft, pfNumber: event.target.value })}/></label>{fields.map(([key, label]) => <label key={key}>{label}<input type="number" min={key === "basicSalary" ? "0.01" : "0"} max="999999999.99" step="0.01" required value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}/></label>)}</div><div className="payroll-form-footer"><span>Monthly gross: <b>{money(Number(draft.basicSalary) + Number(draft.allowances))}</b></span><div className="payroll-card-actions"><button className="filter-btn" type="button" onClick={() => setDraft(null)}>Cancel</button><button className="primary-btn" type="submit" disabled={!draft.teacherId}>{busy ? "Saving..." : "Save payroll"}</button></div></div></fieldset>{!editing && !available.length && !editorLoading && <p role="status">{employees.length ? "All teachers have payroll. Select a teacher to edit it. Register a new teacher first to add a separate payroll." : "No active teachers found. Register a teacher before adding payroll."}</p>}</form></PayrollModal>}
      <form className="panel payroll-generate" onSubmit={generate}><div><h2>Generate monthly slips</h2><p>Uses each teacher's saved payroll. Review pending leave in the salary year first.</p></div><label>Generate for<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">All configured teachers</option>{payrolls.map((row) => <option key={row.teacher_id} value={row.teacher_id}>{row.teacher_name} ({row.employee_code})</option>)}</select></label><label>Salary month<input type="month" required max={currentMonth()} value={month} onChange={(event) => setMonth(event.target.value)}/></label><div className="payroll-attendance-days"><p>Basic pay = monthly basic / {calendarDays} calendar days ? payable days. Payable days include attendance and approved paid leave for {month}. Each calendar year allows 5 casual and 5 sick days; excess approved leave is LWP. Approved emergency leave is paid. With no attendance or paid leave, the full month is used minus approved LWP.</p>
    {daysLoading ? <p>Loading attendance...</p> : daysError ? <p role="alert">{daysError}</p> : payrolls.filter(row => !teacherId || row.teacher_id === teacherId).map(row => {
      const attendance = dayRows.find(item => item.teacher_id === row.teacher_id);
      const days = dayOverrides[row.teacher_id] ?? attendance?.paid_days ?? calendarDays;
      return <label key={row.teacher_id}>{row.teacher_name} ? No. of days (present: {attendance?.present_days ?? 0}, paid casual/sick: {attendance?.paid_leave_days ?? 0}, approved emergency: {attendance?.emergency_days ?? 0}, leave LWP: {attendance?.leave_lwp_days ?? 0}, calendar: {calendarDays})<input type="number" min="0" max={calendarDays} step="1" required disabled={busy} value={days} onChange={event => setDayOverrides(previous => ({ ...previous, [row.teacher_id]: event.target.value }))}/><span>Basic payable: {money(Number(row.basic_salary) * Number(days) / (calendarDays || 1))}</span></label>;
    })}</div><button type="submit" className="primary-btn" disabled={busy || !month || daysLoading || !!daysError || !payrolls.length || !!draft}><FileText size={16}/>{busy ? "Please wait..." : "Generate salary slips"}</button></form>
    </>}
    <div className="payroll-history-heading"><div><p className="payroll-kicker">MONTHLY RECORDS</p><h2>{admin ? "Generated salary slips" : "Salary history"}</h2></div><label>Filter by month<input type="month" value={filter} onChange={(event) => setFilter(event.target.value)}/></label>{filter && <button className="filter-btn" onClick={() => setFilter("")}>All months</button>}{admin && <button type="button" className="filter-btn payroll-remove" disabled={busy || loading || !filter || !visible.length} onClick={removeMonth} title={filter ? "Remove all salary slips for " + monthLabel(filter) : "Select a month first"}><X size={16}/>Remove all for month</button>}</div>
    {!loading && !visible.length && <div className="panel payroll-empty"><FileText size={34}/><h2>No salary slips {filter ? "for this month" : "yet"}</h2><p>{admin ? "Add a teacher's payroll and generate a month to get started." : "Your salary slip will appear here after your admin generates it."}</p></div>}
    {!!visible.length && <>
      <div className="payroll-month-cards" aria-label="Monthly salary slips">{visible.map((row) => <article key={row.id} className={`payroll-month-card ${slip?.id === row.id ? "selected" : ""}`}><div className="payroll-card-heading"><FileText size={22}/><div><h3>{monthLabel(row.salary_month)}</h3>{admin && <p>{row.employee_name} · {row.employee_code}</p>}</div><span className="salary-generated">Generated</span>{admin && <button type="button" className="filter-btn payroll-remove payroll-remove-icon" disabled={busy || loading} onClick={() => remove(row)} aria-label={"Remove " + monthLabel(row.salary_month) + " salary slip for " + row.employee_name} title="Remove salary slip to regenerate"><X size={18}/></button>}</div><strong>{money(row.net_salary)}</strong><p>{row.paid_days} payable days · {row.lwp_days} {row.attendance_based ? "unpaid days" : "LWP days"}</p><div className="payroll-card-actions"><button className="filter-btn" aria-label={`View ${monthLabel(row.salary_month)} salary slip${admin ? ` for ${row.employee_name}` : ""}`} aria-pressed={slip?.id === row.id} onClick={() => view(row.id)}><Eye size={15}/>View</button><button className="primary-btn" disabled={busy} aria-label={`Download ${monthLabel(row.salary_month)} PDF${admin ? ` for ${row.employee_name}` : ""}`} onClick={() => action(() => downloadSalaryPdf(row))}><Download size={15}/>Download PDF</button></div></article>)}</div>

    </>}
    {slip && <PayrollModal title={`${monthLabel(slip.salary_month)} salary slip`} busy={busy} onClose={() => { setSelected(""); setError(""); }}>{error && <p className="auth-error" role="alert">{error}</p>}<div className="payroll-modal-download"><button className="primary-btn" disabled={busy} onClick={() => action(() => downloadSalaryPdf(slip))}><Download size={16}/>Download PDF</button></div><SalarySlip slip={slip}/></PayrollModal>}
  </div>;
}
