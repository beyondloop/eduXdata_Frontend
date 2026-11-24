import { useEffect, useMemo, useState } from "react";
import { BusFront, Search } from "lucide-react";
import { getTransportStudents } from "../lib/api";

function transportPayment(student) {
  if (Number(student.invoice_count || 0) === 0) return { label: "Not billed", tone: "not-billed" };
  if (Number(student.balance_amount || 0) <= 0) return { label: "Paid", tone: "paid" };
  return { label: `Due · ₹${Number(student.balance_amount).toLocaleString("en-IN")}`, tone: "due" };
}

export default function TransportPage() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [bandFilter, setBandFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    getTransportStudents().then((rows) => { if (live) { setStudents(rows); setError(""); } })
      .catch((failure) => { if (live) setError(failure.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  const classes = useMemo(() => [...new Set(students.map((student) => student.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students]);
  const visibleStudents = useMemo(() => students.filter((student) => [student.display_name, student.user_id, student.roll_number, student.parent_contact_number].join(" ").toLowerCase().includes(query.trim().toLowerCase()) && (!classFilter || student.class_name === classFilter) && (!bandFilter || student.transport_distance_band === bandFilter)), [bandFilter, classFilter, query, students]);
  const paidCount = students.filter((student) => Number(student.invoice_count || 0) > 0 && Number(student.balance_amount || 0) <= 0).length;
  const dueCount = students.filter((student) => Number(student.balance_amount || 0) > 0).length;

  return <div className="module-page transport-page">
    <header className="module-title"><div className="module-icon"><BusFront size={24}/></div><div><p className="eyebrow">School transport</p><h1>Transport</h1><p className="subtle">Review transport enrollment, distance bands, and transport fee payment status.</p></div></header>
    {error && <p className="auth-error" role="alert">Unable to load transport students: {error}</p>}
    <div className="facility-summary transport-summary"><div><small>Enrolled students</small><b>{students.length}</b></div><div><small>Transport fee paid</small><b>{paidCount}</b></div><div><small>Balance due</small><b>{dueCount}</b></div></div>
    <section className="panel transport-roster"><div className="panel-head"><div><h2>Transport roster</h2><p>Students who are enrolled for transport service.</p></div></div><div className="transport-filters"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, roll number, or phone" /></label><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="">All classes</option>{classes.map((className) => <option key={className}>{className}</option>)}</select><select value={bandFilter} onChange={(event) => setBandFilter(event.target.value)}><option value="">All distance bands</option>{["0-5", "5-10", "10-15", "15-20", "20-above"].map((band) => <option key={band} value={band}>{band === "20-above" ? "20+ km" : `${band} km`}</option>)}</select></div><div className="facility-student-list transport-table-wrap"><table><thead><tr><th>Student</th><th>Class / section</th><th>Roll number</th><th>Parent phone</th><th>Distance band</th><th>Transport fee</th></tr></thead><tbody>{visibleStudents.map((student) => { const payment = transportPayment(student); return <tr key={student.id}><td><b>{student.display_name}</b><small>{student.user_id}</small></td><td>{student.class_name || "—"}{student.section_name ? ` · ${student.section_name}` : ""}</td><td>{student.roll_number || "—"}</td><td>{student.parent_contact_number || "—"}</td><td>{student.transport_distance_band ? `${student.transport_distance_band === "20-above" ? "20+" : student.transport_distance_band} km` : "—"}</td><td><span className={`transport-payment ${payment.tone}`}>{payment.label}</span></td></tr>; })}{!visibleStudents.length && <tr><td colSpan="6" className="facility-no-students">{loading ? "Loading transport students…" : "No transport students match these filters."}</td></tr>}</tbody></table></div></section>
  </div>;
}
