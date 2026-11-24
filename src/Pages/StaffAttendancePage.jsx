import LeavePaySummary from "../Components/LeavePaySummary";
import LeaveProofDownload from "../Components/LeaveProofDownload";
import { useEffect, useRef, useState } from "react";
import { Bell, CalendarDays, CheckCircle2, Clock3, RefreshCw, ClipboardCheck } from "lucide-react";
import { getTeacherAttendance, getAttendanceApprovers, submitTeacherAttendance, getAttendanceRequests, decideTeacherAttendance, getTeacherLeave, getNotifications, getClasses, getSyllabusDocuments, getAdjustments } from "../lib/api";
import "./StaffAttendancePage.css";
import "./LeaveManagementPage.css";

const schoolToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateKey = (date) => date.toISOString().slice(0, 10);
const leaveLabels = { SICK: "Sick leave", CASUAL: "Casual leave", EMERGENCY: "Emergency leave", PENDING: "Pending approval", APPROVED: "Approved", REJECTED: "Rejected" };

export function AdminNotificationBell({ onNavigate }) {
  const [adjustments,setAdjustments]=useState([]);
  const [missingPdfs,setMissingPdfs]=useState([]);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const notificationAnchorRef = useRef(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (!notificationAnchorRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const [attendance, notices, syllabus, adjustmentRequests] = await Promise.allSettled([getAttendanceRequests(), getNotifications(), Promise.all([getClasses(),getSyllabusDocuments()]), getAdjustments()]);
      if (!live) return;
      if(adjustmentRequests.status==='fulfilled') setAdjustments(adjustmentRequests.value.filter(r=>r.status==='PENDING'));
      if (attendance.status === "fulfilled") setCount(attendance.value.length);
      if(syllabus.status==='fulfilled'){const [classes,docs]=syllabus.value;const date=schoolToday();const y=Number(date.slice(0,4))-(Number(date.slice(5,7))<4?1:0);const academicYear=y+'-'+String((y+1)%100).padStart(2,'0');const missing=classes.filter(c=>!docs.some(d=>d.class_name===c.name&&d.academic_year===academicYear&&d.period==='FULL_YEAR')).map(c=>c.name);setMissingPdfs(missing);}
      if (notices.status === "fulfilled") setNotifications(notices.value);
      setError(attendance.status === "rejected" || notices.status === "rejected" || syllabus.status === "rejected" || adjustmentRequests.status === "rejected");

    };
    refresh();
    const interval = setInterval(refresh, 10000);
    window.addEventListener("staff-attendance-updated", refresh);
    window.addEventListener("teacher-leave-updated", refresh);
    window.addEventListener("edura-notifications-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => { live = false; clearInterval(interval); window.removeEventListener("staff-attendance-updated", refresh); window.removeEventListener("teacher-leave-updated", refresh); window.removeEventListener("edura-notifications-changed", refresh); window.removeEventListener("focus", refresh); };
  }, [open]);
  const navigate = (page, context) => { setOpen(false); onNavigate(page, context); };
  const total = count + notifications.length + missingPdfs.length + adjustments.length;
  return <div ref={notificationAnchorRef} className="approval-notification-anchor" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <button className="icon-btn header-icon communication-header-icon" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`${total} notifications`} title="Notifications"><Bell size={19}/>{(total > 0 || error) && <i>{error ? "!" : total}</i>}</button>
    {open && <section className="approval-notification-panel" aria-label="All notifications">
      <div className="approval-notification-heading"><b>Notifications</b><button type="button" onClick={() => setOpen(false)} aria-label="Close notifications">Close</button></div>
      {error && <p role="alert">Some notifications could not be refreshed. Reopen to retry.</p>}
      {missingPdfs.map(c=><button key={'syllabus-'+c} type="button" onClick={()=>navigate('Syllabus Management')}><b>Missing syllabus ? Class {c}</b><span>Upload the whole class syllabus PDF for the current academic year.</span></button>)}
      {adjustments.map(request=><button type="button" key={'adjustment-'+request.id} onClick={()=>navigate('Teacher Adjustments')}><b>Teacher adjustment awaiting approval</b><span>{request.subject} - Class {request.class_name} / {request.section_name}</span><span>{request.requester_name} to {request.replacement_name} - {request.day_of_week} {String(request.start_time).slice(0,5)}</span></button>)}
      {count > 0 && <button type="button" onClick={() => navigate("Teachers Attendance")}>{count} attendance requests awaiting approval</button>}
      {notifications.map((notice) => <button type="button" key={notice.id} onClick={() => navigate(notice.destination || "Notifications", { studentId: notice.student_id })}><b>{notice.title}</b><span>{notice.body}</span></button>)}
      {!total && !error && <p>No notifications.</p>}
      <button type="button" onClick={() => navigate("Notifications")}>View notification history</button>
    </section>}
  </div>;
}

export default function StaffAttendancePage({ admin = false, teachers = [], teacherError = "" }) {
  const today = schoolToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState("9");
  const [teacherId, setTeacherId] = useState("");
  const [approverId, setApproverId] = useState("");
  const [approvers, setApprovers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveEntries, setLeaveEntries] = useState([]);
  const [leaveError, setLeaveError] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const from = `${month}-01`, to = `${month}-${days}`;
  const cutoff = new Date(`${today}T00:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  const late = date < dateKey(cutoff);
  const selectedTeacher = teacherId || teachers[0]?.id || "";
  useEffect(() => {
    let live = true;
    const refresh = () => Promise.all([getTeacherAttendance(from, to), admin ? getAttendanceRequests() : getAttendanceApprovers()]).then(([rows, extra]) => {
      if (!live) return;
      setEntries(rows); if (admin) setRequests(extra); else setApprovers(extra); setError("");
    }).catch((failure) => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); });
    setLoading(true); setEntries([]); refresh();
    const interval = setInterval(refresh, 30000);
    return () => { live = false; clearInterval(interval); };
  }, [from, to, admin, revision]);
  useEffect(() => {
    let live = true;
    const refreshLeave = () => getTeacherLeave().then((rows) => {
      if (live) { setLeaveEntries(rows); setLeaveError(""); }
    }).catch((failure) => { if (live) setLeaveError(failure.message); })
      .finally(() => { if (live) setLeaveLoading(false); });
    refreshLeave();
    const interval = setInterval(refreshLeave, 30000);
    return () => { live = false; clearInterval(interval); };
  }, [admin, revision]);
  const visible = entries.filter((entry) => !admin || entry.teacher_id === selectedTeacher);
  const byDate = Object.fromEntries(visible.map((entry) => [entry.attendance_date, entry]));
  const approvedEmergencyDays = new Set();
  for (const leave of leaveEntries.filter(row => row.status === "APPROVED" && row.leave_type === "EMERGENCY" && (!admin || row.teacher_id === selectedTeacher))) {
    for (let day = 1; day <= days; day++) {
      const key = month + "-" + String(day).padStart(2, "0");
      if (leave.from_date <= key && leave.to_date >= key && byDate[key]?.status !== "PRESENT") approvedEmergencyDays.add(key);
    }
  }
  const presentDays = visible.filter(entry => entry.status === "PRESENT").length;
  const selectedEntry = byDate[date];
  const locked = selectedEntry && selectedEntry.status !== "REJECTED";
  const refresh = () => { setRevision((value) => value + 1); window.dispatchEvent(new Event("staff-attendance-updated")); };
  const submit = async () => {
    setBusy(true); setError("");
    try { const result = await submitTeacherAttendance({ date, hours: Number(hours), approverId: late ? approverId : null }); setConfirm(false); setMessage(result.status === "PENDING" ? "Attendance submitted for admin approval." : "Attendance submitted."); refresh(); }
    catch (failure) { setConfirm(false); setError(failure.message); } finally { setBusy(false); }
  };
  const decide = async (id, approve) => {
    setBusy(true); setError("");
    try { await decideTeacherAttendance(id, approve); refresh(); setMessage(approve ? "Attendance approved." : "Attendance rejected."); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  return <div className="module-page staff-attendance">
    <div className="module-title staff-hero"><div className="staff-hero-icon"><CalendarDays size={28} aria-hidden="true"/></div><div><p className="eyebrow">{admin ? "ADMIN PORTAL" : "TEACHER PORTAL"}</p><h1>{admin ? "Teachers Attendance" : "My Attendance"}</h1><p className="subtle">{admin ? "Track monthly hours and review attendance requests assigned to you." : "Submit today or the previous two days. Older dates need admin approval."}</p></div></div>
    {(error || teacherError) && <p className="auth-error" role="alert">{error || teacherError}</p>}
    <div className="staff-controls"><label>Month<input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }}/></label>{admin && <label>Teacher name<select value={selectedTeacher} onChange={(event) => setTeacherId(event.target.value)}>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.display_name || teacher.displayName} ({teacher.userId || teacher.user_id})</option>)}</select></label>}<button type="button" className="filter-btn" onClick={refresh}><RefreshCw size={15} aria-hidden="true"/>Refresh</button></div>
    {admin && teachers.length === 0 && <p className="staff-empty">No teachers available.</p>}
    {!admin && <form className="panel staff-form" onSubmit={(event) => { event.preventDefault(); setConfirm(true); }}>
      <div className="staff-form-heading"><span className="staff-section-icon"><ClipboardCheck size={20} aria-hidden="true"/></span><div><h2>Record your attendance</h2><p>A little check-in for your working day.</p></div></div>
      <label>Attendance date<input required type="date" max={today} value={date} disabled={busy} onChange={(event) => { setDate(event.target.value); if (event.target.value) setMonth(event.target.value.slice(0, 7)); }}/></label>
      <label>Hours worked<input required type="number" min="0.01" max="24" step="0.01" value={hours} disabled={busy || !!locked} onChange={(event) => setHours(event.target.value)}/></label>
      {late && <label>Admin approver<select required value={approverId} disabled={busy || !!locked} onChange={(event) => setApproverId(event.target.value)}><option value="">Select approver name</option>{approvers.map((person) => <option key={person.id} value={person.id}>{person.display_name} ({person.user_id})</option>)}</select></label>}
      <button className="primary-btn" disabled={busy || loading || !!error || !!locked || !date || date > today}>{locked ? selectedEntry.status === "PENDING" ? "Awaiting approval" : "Already submitted" : "Submit attendance"}</button>
      {late && <p>Dates older than two days become present only after your selected admin approves.</p>}
      {selectedEntry?.status === "REJECTED" && <p>Your request was rejected. You can correct the hours and submit again.</p>}
    </form>}
    <section className="panel staff-calendar" aria-label="Monthly teacher attendance">
      <div className="staff-calendar-heading"><div><p className="staff-kicker">MONTHLY OVERVIEW</p><h2><CalendarDays size={20} aria-hidden="true"/>{new Date(from + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</h2></div><span className="staff-calendar-caption">{admin ? "Teacher attendance record" : "Your month at a glance"}</span></div>
      <div className="staff-summary">
        <div className="staff-metric"><span className="staff-metric-icon present"><CheckCircle2 size={21} aria-hidden="true"/></span><div><span>Days present</span><strong>{visible.filter((entry) => entry.status === "PRESENT").length}<small> days this month</small></strong></div></div>
        <div className="staff-metric"><div><span>Approved emergency leave</span><strong>{approvedEmergencyDays.size}<small> additional payable days</small></strong></div></div><div className="staff-metric"><div><span>Payable attendance days</span><strong>{presentDays + approvedEmergencyDays.size}<small> present + approved emergency</small></strong></div></div><div className="staff-metric"><span className="staff-metric-icon hours"><Clock3 size={21} aria-hidden="true"/></span><div><span>Total hours</span><strong>{visible.filter((entry) => entry.status === "PRESENT").reduce((sum, entry) => sum + Number(entry.hours), 0).toFixed(2)}<small> hr recorded</small></strong></div></div>
      </div>
      <div className="staff-legend" aria-label="Attendance status legend"><span><i className="present"/>Present</span><span><i className="pending"/>Pending approval</span><span><i className="rejected"/>Rejected</span><span><i/>Not submitted</span></div>
      {loading ? <p role="status">Loading attendance...</p> : <div className="staff-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <b key={day}>{day}</b>)}{Array.from({ length: new Date(`${from}T00:00:00Z`).getUTCDay() }, (_, index) => <span key={`blank-${index}`}/>)}{Array.from({ length: days }, (_, index) => {
        const key = `${month}-${String(index + 1).padStart(2, "0")}`, entry = byDate[key];
        const dayLeave = leaveEntries.filter((leave) => (!admin || leave.teacher_id === selectedTeacher) && leave.from_date <= key && leave.to_date >= key);
        return <button type="button" key={key} className={`staff-day leave-day ${entry?.status.toLowerCase() || ""} ${date === key && !admin ? "selected" : ""}`} disabled={admin || key > today || busy} onClick={() => setDate(key)}><b>{index + 1}</b>{(entry || dayLeave.length === 0) && <span>{entry ? entry.status === "PRESENT" ? "Present" : entry.status === "PENDING" ? "Pending" : "Rejected" : key > today ? "Future" : "Not submitted"}</span>}{entry && <strong>{Number(entry.hours)} hr</strong>}{dayLeave.map((leave) => <span key={leave.id} className={`leave-status ${leave.status.toLowerCase()}`}>{leaveLabels[leave.leave_type]}<small>{leaveLabels[leave.status]}</small></span>)}</button>;
      })}</div>}
    </section>
    {!admin && <section className="panel staff-requests" aria-label="My leave approval status"><div className="staff-requests-heading"><div><h2>My leave approval status</h2><p>All submitted leave applications, including upcoming dates. Decisions update automatically.</p></div></div>
      {leaveError && <p className="auth-error" role="alert">{leaveError}</p>}
      {leaveLoading ? <p role="status">Loading leave applications...</p> : !leaveError && leaveEntries.length === 0 ? <div className="staff-empty">No leave applications yet. Submit a request from Apply Leave.</div> : leaveEntries.map((leave) => <article className="leave-request" key={leave.id}><div className="leave-request-copy"><b>{leaveLabels[leave.leave_type]}</b><p>{leave.from_date}{leave.to_date !== leave.from_date && ` to ${leave.to_date}`}</p><LeavePaySummary entry={leave}/>{leave.reason && <p className="leave-reason">{leave.reason}</p>}</div><span className={`leave-status ${leave.status.toLowerCase()}`}>{leaveLabels[leave.status]}</span><LeaveProofDownload entry={leave}/></article>)}
    </section>}
    {admin && <section className="panel staff-requests"><div className="staff-requests-heading"><span className="staff-section-icon"><Bell size={20} aria-hidden="true"/></span><div><h2>Attendance approvals <span className="staff-count">{requests.length}</span></h2><p>Review attendance requests assigned to you.</p></div></div>{requests.length === 0 && <div className="staff-empty"><CheckCircle2 size={26} aria-hidden="true"/><div><strong>All caught up</strong><p>No pending requests assigned to you.</p></div></div>}{requests.map((entry) => <article key={entry.id}><div><b>{entry.teacher_name}</b><p>{entry.attendance_date} · {Number(entry.hours)} hr · Pending approval</p></div><div><button className="primary-btn" disabled={busy} onClick={() => decide(entry.id, true)}>Approve</button><button className="filter-btn" disabled={busy} onClick={() => decide(entry.id, false)}>Reject</button></div></article>)}</section>}
    {(confirm || message) && <div className="staff-modal-overlay"><section className="panel staff-modal" role="dialog" aria-modal="true" aria-labelledby="attendance-dialog-title"><h2 id="attendance-dialog-title">{confirm ? "Submit attendance?" : message}</h2>{confirm ? <><p>Submit {hours} hr for {date}{late ? " for admin approval" : ""}?</p><button autoFocus className="filter-btn" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button><button className="primary-btn" disabled={busy} onClick={submit}>{busy ? "Submitting..." : "Yes, submit"}</button></> : <button autoFocus className="primary-btn" onClick={() => setMessage("")}>OK</button>}</section></div>}
  </div>;
}
