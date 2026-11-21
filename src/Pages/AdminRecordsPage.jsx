import { useEffect, useMemo, useState } from "react";
import { Download, FileText, RefreshCw, Search, Upload } from "lucide-react";
import { downloadStudentDocument, downloadSyllabusDocument, getAdminRecords, uploadStudentDocument } from "../lib/api";
import { adminDatasets } from "../lib/adminDatasets";
import AdminAcademicForms from "../Components/AdminAcademicForms";
const fields = {
  attendance: ["student", "user_id", "class_name", "section_name", "attendance_date", "status"],
  "attendance-analytics": ["attendance_date", "marked", "present", "absent", "late", "present_percent"],
  performance: ["student", "user_id", "class_name", "section_name", "result_count", "average_marks", "attendance_percent"],
  exams: ["exam", "academic_year", "result_count"], results: ["student", "class_name", "section_name", "exam", "subject", "marks", "grade"],
  reports: ["class_name", "section_name", "students", "teaching_assignments"],
  documents: ["file_name", "class_name", "academic_year", "period", "updated_at"],
  "student-documents": ["file_name", "student", "user_id", "class_name", "section_name", "uploaded_at"],
};
const labels = { user_id: "User ID", present_percent: "Present %", attendance_percent: "Attendance %", average_marks: "Average marks", result_count: "Result records" };
const label = (key) => labels[key] || key.replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase());
const display = (value, key) => value === null || value === undefined || value === "" ? "—" : key.endsWith("_at") ? new Date(value).toLocaleString("en-IN") : String(value);
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export default function AdminRecordsPage({ title, students = [] }) {
  const type = adminDatasets[title], columns = fields[type];
  const [rows, setRows] = useState([]), [query, setQuery] = useState(""), [error, setError] = useState(""), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const [from, setFrom] = useState(() => title === "Today's Attendance" ? today() : `${today().slice(0, 7)}-01`), [to, setTo] = useState(today);
  const [studentId, setStudentId] = useState(""), [file, setFile] = useState(null), [saving, setSaving] = useState(false), [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const isAcademic = type === "exams" || type === "results";
  const isAttendance = type.startsWith("attendance"), isDocuments = type.endsWith("documents");
  useEffect(() => {
    let live = true; setLoading(true); setError(""); setRows([]);
    getAdminRecords(type, isAttendance ? from : "", isAttendance ? to : "")
      .then((value) => { if (live) setRows(value); }).catch((failure) => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [type, from, to, isAttendance, refresh]);
  const visible = useMemo(() => rows.filter((row) => columns.some((key) => display(row[key], key).toLowerCase().includes(query.toLowerCase()))), [rows, query, columns]);
  const exportCsv = () => {
    const cell = (value) => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    download(new Blob(["\uFEFF", [columns.map(label), ...visible.map((row) => columns.map((key) => display(row[key], key)))].map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `${title}.csv`);
  };
  const downloadFile = async (row) => {
    try { download(await (row.source === "SYLLABUS" ? downloadSyllabusDocument(row.id) : downloadStudentDocument(row.id)), row.file_name); }
    catch (failure) { setError(failure.message); }
  };
  const upload = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try { await uploadStudentDocument(studentId, file); setFile(null); event.target.reset(); setStudentId(""); setSuccess("Document saved."); setRefresh((value) => value + 1); }
    catch (failure) { setError(failure.message); } finally { setSaving(false); }
  };
  return <div className="module-page"><div className="module-title"><div className="module-icon"><FileText size={24}/></div><div><p className="eyebrow">School records</p><h1>{title}</h1><p className="subtle">{type === "performance" ? "Average marks use recorded marks as stored; no maximum score is assumed." : type === "documents" ? "School documents and published syllabus files." : "Records saved in your school’s database."}</p></div></div>
    {isAcademic && <AdminAcademicForms title={title} students={students} editing={editing} onCancel={() => setEditing(null)} onSaved={() => setRefresh(value => value + 1)}/>}
    <div className="admin-record-controls"><label className="search module-search"><Search size={16}/><input aria-label={`Search ${title}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records…"/></label>{isAttendance && <><label>From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)}/></label><label>To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)}/></label></>}<button className="filter-btn" disabled={loading} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={15}/> Refresh</button><button className="filter-btn" disabled={loading || !visible.length} onClick={exportCsv}><Download size={15}/> Export CSV</button></div>
    {error && <p className="auth-error" role="alert">{error}</p>}{success && <p role="status">{success}</p>}
    {isDocuments && <form className="panel admin-record-controls" onSubmit={upload}>{type === "student-documents" && <label>Student<select required value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.userId}</option>)}</select></label>}<label>Document (up to 15 MB)<input type="file" required onChange={(event) => setFile(event.target.files?.[0] || null)}/></label><button className="primary-btn" disabled={saving || !file || (type === "student-documents" && !studentId)}><Upload size={15}/>{saving ? "Uploading…" : "Upload document"}</button></form>}
    <section className="panel table-panel module-table"><table><thead><tr>{columns.map((key) => <th key={key}>{label(key)}</th>)}{isDocuments && <th>Download</th>}{type === "results" && <th>Action</th>}</tr></thead><tbody>{!loading && !error && visible.map((row, index) => <tr key={row.id || index}>{columns.map((key) => <td key={key}>{display(row[key], key)}</td>)}{isDocuments && <td><button className="filter-btn" onClick={() => downloadFile(row)}><Download size={14}/> Download</button></td>}{type === "results" && <td><button type="button" className="filter-btn" onClick={() => { setEditing(row); document.querySelector(".admin-academic-forms")?.scrollIntoView({ behavior: "smooth" }); }}>Edit</button></td>}</tr>)}{(loading || error || !visible.length) && <tr><td colSpan={columns.length + Number(isDocuments) + Number(type === "results")} className="empty-students">{loading ? "Loading records…" : error ? "Records unavailable. Try refreshing." : "No records found."}</td></tr>}</tbody></table></section>
  </div>;
}
