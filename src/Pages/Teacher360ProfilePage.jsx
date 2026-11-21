import { Download, FileText, TrendingUp } from "lucide-react";

export default function Teacher360ProfilePage({ teacher, onBack, workloads = [] }) {
  const profile = teacher || { name: "Teacher", email: "—", teacherId: "—", userId: "—" };
  const assignments = workloads.filter((row) => (row.teacher_user_id || row.teacherUserId) === profile.userId && (row.status || "ACTIVE") === "ACTIVE");
  const exportReport = () => {
    const previousTitle = document.title;
    document.title = `${profile.name} - Teacher Report`;
    document.body.classList.add("printing-teacher-report");
    const cleanup = () => { document.title = previousTitle; document.body.classList.remove("printing-teacher-report"); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };
  return <div className="student-360 teacher-360"><button type="button" className="student-360-back" onClick={onBack}>← Back to all teachers</button><section className="student-360-hero"><div className="student-360-avatar">{profile.name.split(" ").map((word) => word[0]).join("")}</div><div><p className="eyebrow">TEACHER 360° PROFILE · {profile.teacherId}</p><h1>{profile.name}</h1><p>{profile.email}</p></div></section><section className="student-360-stats"><Metric label="Teacher ID" value={profile.teacherId} tone="indigo"/><Metric label="User ID" value={profile.userId} tone="green"/><Metric label="Status" value={profile.active ? "Active" : "Inactive"} tone="orange"/></section><div className="student-360-grid"><section className="student-360-card"><h2>Teacher details</h2><div className="teacher-detail-row"><span>Email address</span><b>{profile.email || "—"}</b></div><div className="teacher-detail-row"><span>Teacher ID</span><b>{profile.teacherId || "—"}</b></div><div className="teacher-detail-row"><span>Portal user ID</span><b>{profile.userId || "—"}</b></div></section><section className="student-360-card"><h2>Teaching summary</h2><div className="teacher-summary"><TrendingUp size={19}/><div><b>{assignments.length} active teaching assignments</b>{assignments.map((row) => <p key={row.id}>{row.subject} · {row.class_name || row.className} · {row.section_name || row.sectionName} · {row.day_of_week || row.dayOfWeek}</p>)}{!assignments.length && <p>No teaching assignments recorded.</p>}</div></div></section></div><div className="student-360-actions"><button type="button" onClick={exportReport}><FileText size={15}/> View Full Report</button><button type="button" className="primary-btn" onClick={exportReport} title="Open the print dialog to save this report as a PDF"><Download size={15}/> Export PDF</button></div></div>;
}

function Metric({ label, value, tone }) { return <div className={`student-metric ${tone}`}><small>{label}</small><b>{value}</b><span><TrendingUp size={13}/> Current</span></div>; }
