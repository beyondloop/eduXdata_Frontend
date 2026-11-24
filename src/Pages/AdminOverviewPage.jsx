import { createElement, useEffect, useState } from "react";
import { ClipboardCheck, CircleDollarSign, GraduationCap, MessageSquare, RefreshCw, Users, Zap } from "lucide-react";
import { getAdminOverview } from "../lib/api";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
const percent = (present, marked) => marked ? `${(100 * present / marked).toFixed(1)}%` : "Not marked";

export default function AdminOverviewPage({ role = "Admin", features = null, currentUser, onNavigate, onSelect, students = [] }) {
  const [data, setData] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const [period, setPeriod] = useState("12");
  useEffect(() => {
    let live = true;
    const load = () => getAdminOverview().then((value) => { if (live) { setData(value); setError(""); } })
      .catch((failure) => { if (live) { setError(failure.message); setData(null); } }).finally(() => { if (live) setLoading(false); });
    setLoading(true); load();
    const interval = window.setInterval(load, 30000);
    const focus = () => load();
    window.addEventListener("focus", focus);
    return () => { live = false; clearInterval(interval); window.removeEventListener("focus", focus); };
  }, [refresh]);
  const day = data?.date ? new Date(`${data.date}T12:00:00`) : new Date();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const cards = data ? [
    ["Total students", Number(data.students).toLocaleString("en-IN"), `${data.teachers} active teachers`, Users, "blue"],
    ["Attendance today", percent(data.attendance.present, data.attendance.marked), `${data.attendance.marked} of ${data.students} students marked`, ClipboardCheck, "green"],
    ["Fee collection", money(data.fees.collected), `${money(data.fees.pending)} outstanding · all invoices`, CircleDollarSign, "violet"],
    ["Pending approvals", data.pendingApprovals, "Leave, attendance, adjustments and discipline", Zap, "orange"],
  ] : [];
  const months = Array.from({ length: period === "year" ? day.getMonth() + 1 : 12 }, (_, index) => {
    const date = new Date(day.getFullYear(), period === "year" ? index : day.getMonth() - 11 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const row = data?.attendanceTrend.find((item) => String(item.month).startsWith(key));
    return { key, label: date.toLocaleDateString("en-IN", { month: "short" }), row, value: row ? 100 * row.present / row.marked : null };
  });
  return <>
    <div className="welcome-row"><div><p className="eyebrow">{role} portal · {day.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p><h1>{greeting}, {currentUser?.displayName || "there"}</h1><p className="subtle">Live attendance, finances and activity from your school.</p></div><div className="admin-live-actions"><button className="filter-btn" onClick={() => setRefresh((value) => value + 1)} disabled={loading}><RefreshCw size={15}/> Refresh</button>{role === "Admin" && <button className="primary-btn" onClick={() => onNavigate("Announcements")}><MessageSquare size={16}/> New announcement</button>}</div></div>
    {error && <p role="alert" className="auth-error">{error} <button type="button" onClick={() => setRefresh((value) => value + 1)}>Try again</button></p>}
    {loading && <p role="status">Loading dashboard from the database…</p>}
    {data && <>
      <div className="stat-grid">{cards.map(([label, value, detail, icon, tone]) => <div className="stat-card" key={label}><div className={`stat-icon ${tone}`}>{createElement(icon, { size: 21 })}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>)}</div>
      <div className="content-grid"><section className="panel"><div className="panel-head"><div><h2>Attendance overview</h2><p>Present as a percentage of marked records</p></div><select aria-label="Attendance chart period" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="12">Last 12 months</option><option value="year">This year</option></select></div><div className="admin-attendance-chart">{months.map(({ key, label, row, value }) => <div className="admin-chart-column" key={key} title={row ? `${label}: ${percent(row.present, row.marked)} (${row.marked} records)` : `${label}: No attendance recorded`}><span>{value === null ? "—" : `${value.toFixed(0)}%`}</span><div className="admin-chart-track">{value !== null && <i style={{ height: `${value}%` }}/>}</div><small>{label}</small></div>)}</div>{!data.attendanceTrend.length && <p className="subtle">No attendance recorded in this period.</p>}</section>
      <section className="panel quick-panel"><div className="panel-head"><div><h2>Quick actions</h2><p>{role === "SubAdmin" ? "Your permitted school modules" : "Manage your school"}</p></div><Zap size={18}/></div><div className="quick-actions">{(role === "SubAdmin" ? [["Student admission", Users, "Student Admission"], ["Admission enquiries", GraduationCap, "Admission Enquiry"], ["Student records", ClipboardCheck, "All Students"], ["Reports", CircleDollarSign, "Reports"]] : [["Add student", Users, "Student Admission"], ["Mark attendance", ClipboardCheck, "Manual Correction"], ["Record payment", CircleDollarSign, "Fee Collection"], ["View results", GraduationCap, "Results"]]).filter(([, , target]) => !features || features.includes(target)).map(([label, icon, target]) => <button key={label} onClick={() => onNavigate(target)}>{createElement(icon, { size: 19 })}<span>{label}</span><b>↗</b></button>)}</div></section></div>
      <div className="content-grid lower-grid"><section className="panel table-panel"><div className="panel-head"><div><h2>Today’s attendance</h2><p>{data.attendance.marked} marked out of {data.students} active students</p></div><button className="text-btn" onClick={() => onNavigate("Today's Attendance")}>View all →</button></div><div className="admin-table-scroll"><table><thead><tr><th>Student</th><th>Class / section</th><th>Status</th></tr></thead><tbody>{data.recentAttendance.map((row) => {
        const student = students.find((item) => item.id === row.student_id);
        return <tr key={row.id}><td>{student ? <button className="text-btn" onClick={() => onSelect(student)}>{row.display_name}</button> : row.display_name}</td><td>{[row.class_name, row.section_name].filter(Boolean).join(" · ") || "Not assigned"}</td><td><span className={`status ${row.status.toLowerCase()}`}>{row.status}</span></td></tr>;
      })}{!data.recentAttendance.length && <tr><td colSpan="3">No attendance marked today.</td></tr>}</tbody></table></div></section>
      <section className="panel activity-panel"><div className="panel-head"><div><h2>School activity</h2><p>Latest recorded updates</p></div></div><div className="activity">{data.activity.map((event, index) => <div className="activity-line" key={`${event.occurred_at}-${index}`}><div className="activity-dot blue-dot"><MessageSquare size={13}/></div><div><b>{event.title}</b><p>{event.detail}</p><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString("en-IN")}</time></div></div>)}{!data.activity.length && <p className="subtle">No activity recorded yet.</p>}</div></section></div>
    </>}
  </>;
}
