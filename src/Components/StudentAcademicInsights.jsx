import { useEffect, useState } from "react";
import { getStudentInsights } from "../lib/api";

export default function StudentAcademicInsights({ studentId }) {
  const [data, setData] = useState(null), [error, setError] = useState("");
  useEffect(() => {
    let live = true; setData(null); setError("");
    if (studentId) getStudentInsights(studentId).then((value) => { if (live) setData(value); }).catch((failure) => { if (live) setError(failure.message); });
    return () => { live = false; };
  }, [studentId]);
  if (error) return <p className="auth-error" role="alert">Unable to load student statistics: {error}</p>;
  if (!studentId) return <p className="subtle">Select a registered student to view academic records.</p>;
  if (!data) return <p role="status">Loading academic records…</p>;
  const { attendance, results, trend } = data;
  const percent = attendance.marked ? 100 * attendance.present / attendance.marked : null;
  const average = results.length ? results.reduce((sum, row) => sum + Number(row.marks), 0) / results.length : null;
  return <>
    <section className="student-360-stats">{[["Attendance", percent === null ? "Not recorded" : `${percent.toFixed(1)}%`, `${attendance.marked} marked days`], ["Average marks", average === null ? "Not recorded" : average.toFixed(2), "Recorded marks; no maximum assumed"], ["Result records", results.length, "Saved examination results"]].map(([label, value, detail]) => <div className="student-metric" key={label}><small>{label}</small><b>{value}</b><span>{detail}</span></div>)}</section>
    <div className="student-360-grid"><section className="student-360-card"><h2>Monthly attendance</h2><p>All recorded months</p>{trend.length ? <div className="admin-attendance-chart">{trend.map((row) => <div className="admin-chart-column" key={row.month}><span>{row.percent}%</span><div className="admin-chart-track"><i style={{ height: `${row.percent}%` }}/></div><small>{new Date(`${row.month}T12:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}</small></div>)}</div> : <p>No attendance recorded.</p>}</section>
    <section className="student-360-card"><h2>Examination results</h2><p>Marks as stored in the database</p><div className="admin-table-scroll"><table><thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead><tbody>{results.map((row) => <tr key={row.id}><td>{row.exam}</td><td>{row.subject || "—"}</td><td>{row.marks}</td><td>{row.grade || "—"}</td></tr>)}{!results.length && <tr><td colSpan="4">No results recorded.</td></tr>}</tbody></table></div></section></div>
    {percent !== null && percent < 75 && <section className="attention-card"><div><b>Attendance needs attention</b><p>Present on {attendance.present} of {attendance.marked} recorded days ({percent.toFixed(1)}%).</p></div></section>}
  </>;
}
