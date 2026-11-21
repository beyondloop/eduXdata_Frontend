import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { getNotifications } from "../lib/api";
import "../Pages/LeaveManagementPage.css";

export default function TeacherNotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const anchor = useRef(null);
  useEffect(() => {
    let live = true;
    const refresh = () => getNotifications().then(rows => {
      if (live) {
        setNotices(rows.filter(row => ["ALL", "TEACHER"].includes(String(row.audience).toUpperCase())));
        setError("");
      }
    }).catch(failure => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); });
    refresh();
    const interval = setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    window.addEventListener("edura-notifications-changed", refresh);
    return () => { live = false; clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("edura-notifications-changed", refresh); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = event => { if (!anchor.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  const seen = localStorage.getItem("edura_seen_Notifications");
  const count = notices.filter(notice => notice.source === "STUDENT_LEAVE" || !seen || new Date(notice.published_at || notice.publishedAt || 0) > new Date(seen)).length;
  const ordered = [...notices].sort((a, b) => Number(b.source === "STUDENT_LEAVE") - Number(a.source === "STUDENT_LEAVE"));
  const navigate = notice => { setOpen(false); onNavigate(notice.destination || "Notifications", { studentId: notice.student_id }); };
  return <div className="approval-notification-anchor" ref={anchor} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
    <button type="button" className="icon-btn header-icon communication-header-icon" aria-label={`Open notifications, ${count} alerts`} aria-expanded={open} aria-controls="teacher-notification-panel" onClick={() => setOpen(value => !value)} title="Notifications">
      <Bell size={19}/>{(count > 0 || error) && <i>{count || "!"}</i>}
    </button>
    {open && <section id="teacher-notification-panel" className="approval-notification-panel" aria-label="Teacher notifications">
      <div className="approval-notification-heading"><b>Notifications</b><button type="button" onClick={() => setOpen(false)} aria-label="Close notifications">Close</button></div>
      {error && <p role="alert">Unable to refresh notifications. {error}</p>}
      {loading && <p role="status">Loading notifications…</p>}
      {ordered.map(notice => <button type="button" key={notice.id} onClick={() => navigate(notice)}><b>{notice.title}</b><span>{notice.body}</span>{notice.source === "STUDENT_LEAVE" && <span>Review student leave request →</span>}</button>)}
      {!loading && !error && !ordered.length && <p>No notifications.</p>}
      <button type="button" onClick={() => navigate({ destination: "Notifications" })}>View notification history</button>
    </section>}
  </div>;
}
