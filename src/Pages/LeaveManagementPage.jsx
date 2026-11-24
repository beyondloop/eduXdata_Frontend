import LeavePaySummary from "../Components/LeavePaySummary";
import TeacherLeaveForm from "../Components/TeacherLeaveForm";
import LeaveProofDownload from "../Components/LeaveProofDownload";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, HeartPulse, Palmtree, RefreshCw } from "lucide-react";
import { decideTeacherLeave, getTeacherLeave } from "../lib/api";
import "./StaffAttendancePage.css";
import "./LeaveManagementPage.css";

const schoolToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const labels = { SICK: "Sick leave", CASUAL: "Casual leave", EMERGENCY: "Emergency leave", PENDING: "Pending approval", APPROVED: "Approved", REJECTED: "Rejected" };
const formatDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function LeaveManagementPage({ admin = false }) {
  const [month, setMonth] = useState(() => schoolToday().slice(0, 7));
  const [entries, setEntries] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(admin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!admin) return;
    let live = true;
    const refresh = () => getTeacherLeave().then((rows) => { if (live) { setEntries(rows); setError(""); } }).catch((failure) => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); });
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => { live = false; clearInterval(interval); };
  }, [admin, revision]);
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const first = `${month}-01`, last = `${month}-${days}`;
  const teachers = [...new Map(entries.map((entry) => [entry.teacher_id, entry.teacher_name])).entries()];
  const visible = entries.filter((entry) => !admin || !teacherId || entry.teacher_id === teacherId);
  const monthly = visible.filter((entry) => entry.from_date <= last && entry.to_date >= first);
  const pending = visible.filter((entry) => entry.status === "PENDING");
  const decide = async (id, approve) => {
    setBusy(true); setError(""); setMessage("");
    try { await decideTeacherLeave(id, approve); window.dispatchEvent(new Event("teacher-leave-updated")); setMessage(approve ? "Leave approved." : "Leave rejected."); setRevision((value) => value + 1); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const renderRequest = (entry, review = false) => <article className="leave-request" key={entry.id}>
    <div className={`leave-request-icon ${entry.leave_type.toLowerCase()}`}>{entry.leave_type === "SICK" ? <HeartPulse size={20}/> : <Palmtree size={20}/>}</div>
    <div className="leave-request-copy"><b>{admin ? `${entry.teacher_name} · ` : ""}{labels[entry.leave_type]}</b><p>{formatDate(entry.from_date)}{entry.to_date !== entry.from_date && ` – ${formatDate(entry.to_date)}`}</p><LeavePaySummary entry={entry}/>{entry.reason && <p className="leave-reason">{entry.reason}</p>}</div>
    <span className={`leave-status ${entry.status.toLowerCase()}`}>{labels[entry.status]}</span>
    <LeaveProofDownload entry={entry} />
    {review && <div className="leave-actions"><button type="button" className="primary-btn" disabled={busy} onClick={() => decide(entry.id, true)}>Approve</button><button type="button" className="filter-btn" disabled={busy} onClick={() => decide(entry.id, false)}>Reject</button></div>}
  </article>;
  return <div className="module-page staff-attendance leave-management">
    <div className="module-title staff-hero"><div className="staff-hero-icon"><CalendarDays size={28}/></div><div><p className="eyebrow">{admin ? "ADMIN PORTAL" : "TEACHER PORTAL"}</p><h1>{admin ? "Leave Management" : "Apply Leave"}</h1><p className="subtle">{admin ? "Review teacher requests and keep track of your team's leave." : "Apply for time away and track approval in My Attendance."}</p></div></div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {message && <p className="leave-success" role="status"><CheckCircle2 size={18}/>{message}</p>}
    {!admin && <TeacherLeaveForm />}
    {admin && <>
    <div className="staff-controls"><label>Calendar month<input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }}/></label>{admin && <label>Teacher<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}><option value="">All teachers</option>{teachers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}<button type="button" className="filter-btn" onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15}/>Refresh</button></div>
    <section className="panel staff-calendar" aria-label="Leave calendar"><div className="staff-calendar-heading"><div><p className="staff-kicker">LEAVE CALENDAR</p><h2><CalendarDays size={20}/>{new Date(`${first}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</h2></div><span className="staff-calendar-caption">{monthly.length} applications this month</span></div>
      <div className="staff-legend"><span><i className="present"/>Approved</span><span><i className="pending"/>Pending approval</span><span><i className="rejected"/>Rejected</span></div>
      {loading ? <p role="status">Loading leave calendar…</p> : <div className="staff-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <b key={day}>{day}</b>)}{Array.from({ length: new Date(`${first}T00:00:00Z`).getUTCDay() }, (_, i) => <span key={`blank-${i}`}/>)}{Array.from({ length: days }, (_, i) => {
        const key = `${month}-${String(i + 1).padStart(2, "0")}`;
        const onDay = monthly.filter((entry) => entry.from_date <= key && entry.to_date >= key);
        return <button type="button" key={key} className="staff-day leave-day" disabled aria-label={`${formatDate(key)}${onDay.length ? `: ${onDay.map((entry) => `${labels[entry.leave_type]}, ${labels[entry.status]}`).join("; ")}` : ""}`}><b>{i + 1}</b>{onDay.map((entry) => <span key={entry.id} className={`leave-status ${entry.status.toLowerCase()}`}>{admin && <em>{entry.teacher_name}</em>}{labels[entry.leave_type]}<small>{labels[entry.status]}</small></span>)}</button>;
      })}</div>}
    </section>
    {admin && <section className="panel staff-requests"><div className="staff-requests-heading"><div><h2>Awaiting your approval <span className="staff-count">{pending.length}</span></h2><p>Pending applications across all months.</p></div></div>{loading ? <p role="status">Loading requests…</p> : error ? <p>Unable to refresh requests. Please try again.</p> : pending.length ? pending.map((entry) => renderRequest(entry, true)) : <div className="staff-empty"><CheckCircle2 size={24}/>No pending leave requests.</div>}</section>}
    <section className="panel staff-requests"><div className="staff-requests-heading"><div><h2>{admin ? "Leave history" : "My leave approval status"}</h2><p>{admin ? "Applications for the selected calendar month." : "Track your applications and admin decisions below."}</p></div></div>{loading ? <p role="status">Loading applications…</p> : error ? <p>Unable to refresh applications. Please try again.</p> : (admin ? monthly : visible).length ? (admin ? monthly : visible).map((entry) => renderRequest(entry)) : <div className="staff-empty"><CalendarDays size={24}/>{admin ? "No applications for this month." : "Your leave applications and approval status will appear here."}</div>}</section>
    </>}
  </div>;
}
