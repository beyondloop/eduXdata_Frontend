import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

export default function AdminStudentsPage({ onSelect, students = [], error = "" }) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const classes = useMemo(() => [...new Set(students.map((student) => student.className).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students]);
  const sections = useMemo(() => [...new Set(students.filter((student) => !classFilter || student.className === classFilter).map((student) => student.sectionName).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [classFilter, students]);
  const visibleStudents = useMemo(() => students.filter((student) => {
    const searchText = [student.name, student.email, student.userId, student.rollNumber, student.parentContactNumber, student.className, student.sectionName].join(" ").toLowerCase();
    return searchText.includes(query.trim().toLowerCase())
      && (!classFilter || student.className === classFilter)
      && (!sectionFilter || student.sectionName === sectionFilter);
  }), [classFilter, query, sectionFilter, students]);

  return <div className="module-page admin-students-page">
    <div className="module-title"><div className="module-icon"><Users size={24}/></div><div><p className="eyebrow">Student management</p><h1>All Students</h1><p className="subtle">Student accounts registered in your school.</p></div></div>
    <div className="student-filter-bar">
      <label className="student-search-filter"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by student name, email, user ID, roll number, or phone number" /></label>
      <label className="student-select-filter"><span>Class</span><select value={classFilter} onChange={(event) => { setClassFilter(event.target.value); setSectionFilter(""); }}><option value="">All classes</option>{classes.map((className) => <option key={className} value={className}>{className}</option>)}</select></label>
      <label className="student-select-filter"><span>Section</span><select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}><option value="">All sections</option>{sections.map((sectionName) => <option key={sectionName} value={sectionName}>{sectionName}</option>)}</select></label>
    </div>
    {error && <div className="auth-error">Unable to load students: {error}</div>}
    <section className="panel table-panel module-table"><table><thead><tr><th>Student</th><th>Email</th><th>User ID</th><th>Class</th><th>Fee status</th><th>Registration</th><th>Discipline</th><th>Roll number</th><th>Phone number</th></tr></thead><tbody>{visibleStudents.map((student) => <tr key={student.userId} onClick={() => onSelect(student)}><td><div className="person"><div className="avatar avatar-indigo">{(student.name || "N/A").split(" ").map((word) => word[0]).join("")}</div><b>{student.name || "N/A"}</b></div></td><td>{student.email || "—"}</td><td>{student.userId}</td><td>{student.className || "—"}{student.sectionName ? ` · ${student.sectionName}` : ""}</td><td><FeeStatus student={student}/></td><td><RegistrationBadge type={student.registrationType}/></td><td>{student.disciplinePoints || 0} points{student.disciplinePoints >= 100 && <strong> · Eligible for TC</strong>}</td><td>{student.rollNumber || "—"}</td><td>{student.parentContactNumber || "—"}</td></tr>)}{visibleStudents.length === 0 && <tr><td colSpan="9" className="empty-students">{error ? "Start the backend, then refresh this page." : "No student accounts match these filters."}</td></tr>}</tbody></table></section>
  </div>;
}

function FeeStatus({ student }) {
  if (!student.monthlyFeeCount) return <span className="fee-list-status not-started">Not started</span>;
  if (!student.pendingFeeAmount) return <span className="fee-list-status paid">Done · ₹{student.paidFeeAmount.toLocaleString("en-IN")}</span>;
  return <span className="fee-list-status pending">Pending · ₹{student.pendingFeeAmount.toLocaleString("en-IN")}</span>;
}
function RegistrationBadge({ type }) { const value = String(type || "OLD").toUpperCase() === "NEW" ? "NEW" : "OLD"; return <span className={`registration-badge ${value.toLowerCase()}`}>{value[0] + value.slice(1).toLowerCase()}</span>; }
