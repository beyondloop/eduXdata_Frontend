import { useEffect, useState } from "react";
import { applyStudentLeave, decideStudentLeave, getStudentLeave } from "../lib/api";
import "./StudentLeavePage.css";

const types = { SICK: "Sick leave", CASUAL: "Casual leave", EMERGENCY: "Emergency leave", OTHER: "Other" };
const initial = { leaveType: "", fromDate: "", toDate: "", comments: "" };
export default function StudentLeavePage({ teacher = false }) {
  const [form, setForm] = useState(initial);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    const refresh = () => getStudentLeave().then(data => { if (live) { setRows(data); setError(""); } }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { live = false; clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [revision]);
  const change = e => setForm(value => ({ ...value, [e.target.name]: e.target.value }));
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await applyStudentLeave(form); setForm(initial); setMessage("Leave request submitted to your class teacher for approval."); setRevision(v => v + 1); window.dispatchEvent(new Event("edura-notifications-changed")); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const decide = async (id, approve) => {
    setBusy(true); setError(""); setMessage("");
    try { await decideStudentLeave(id, approve); setMessage(approve ? "Leave approved. All requested dates are marked absent in student attendance." : "Leave rejected."); setRevision(v => v + 1); window.dispatchEvent(new Event("edura-notifications-changed")); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="module-page student-leave-page">
    <h1>{teacher ? "Student Leave Approvals" : "Leave Management"}</h1>
    <p>{teacher ? "Review leave requests from students assigned to you." : "Apply for leave and track your class teacher’s decision. Approved dates appear in red as absent in Attendance."}</p>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="student-leave-success" role="status">{message}</p>}
    {!teacher && <form className="panel student-leave-form" onSubmit={submit}>
      <label>Leave type<select name="leaveType" required value={form.leaveType} onChange={change}><option value="">Choose leave type</option>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Comments<textarea name="comments" required maxLength={1000} rows={4} value={form.comments} onChange={change} placeholder="Explain why you need leave" /></label>
      <div className="student-leave-dates"><label>From date<input type="date" name="fromDate" required value={form.fromDate} onChange={change}/></label><label>To date<input type="date" name="toDate" required min={form.fromDate || undefined} value={form.toDate} onChange={change}/></label></div>
      <button className="primary-btn" disabled={busy || !form.comments.trim()}>{busy ? "Submitting…" : "Submit request"}</button>
    </form>}
    <section className="panel"><div className="student-leave-heading"><h2>{teacher ? "Student requests" : "My leave requests"}</h2><button className="filter-btn" type="button" onClick={() => setRevision(v => v + 1)}>Refresh</button></div>
      {loading ? <p role="status">Loading requests…</p> : !rows.length && <p>No leave requests yet.</p>}
      {rows.map(row => <article className="student-leave-request" key={row.id}>
        <div><h3>{teacher && `${row.student_name} · ${row.class_name || ""} ${row.section_name || ""} · `}{types[row.leave_type]}</h3><p>{row.from_date} to {row.to_date} · {Math.round((Date.parse(row.to_date) - Date.parse(row.from_date)) / 86400000) + 1} days</p><p className="student-leave-comments">{row.comments}</p></div>
        <div><strong className={`student-leave-status ${row.status.toLowerCase()}`}>{row.status}</strong>{teacher && row.status === "PENDING" && <div className="student-leave-actions"><button type="button" className="primary-btn" disabled={busy} onClick={() => decide(row.id, true)}>Approve</button><button type="button" className="filter-btn" disabled={busy} onClick={() => decide(row.id, false)}>Reject</button></div>}</div>
      </article>)}
    </section>
  </div>;
}
