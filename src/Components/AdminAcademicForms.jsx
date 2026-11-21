import { useEffect, useState } from "react";
import { createAcademicSubject, createExam, getAcademicOptions, saveAcademicYear, saveExamResult } from "../lib/api";

const emptyResult = { studentId: "", examId: "", subjectId: "", marks: "", grade: "" };
export default function AdminAcademicForms({ title, students, editing, onSaved, onCancel }) {
  const [options, setOptions] = useState({ years: [], exams: [], subjects: [] }), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [examName, setExamName] = useState(""), [yearId, setYearId] = useState(""), [examDate, setExamDate] = useState(""), [subject, setSubject] = useState("");
  const [year, setYear] = useState({ name: "", startsOn: "", endsOn: "", active: false }), [result, setResult] = useState(emptyResult);
  useEffect(() => { let live = true; getAcademicOptions().then(data => { if (live) setOptions(data); }).catch(failure => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, []);
  useEffect(() => { setResult(editing ? { studentId: editing.student_id, examId: editing.exam_id, subjectId: editing.subject_id || "", marks: editing.marks, grade: editing.grade || "" } : emptyResult); setMessage(""); }, [editing]);
  const run = async action => {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setOptions(await getAcademicOptions()); onSaved(); setMessage("Saved to the database."); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const update = event => setResult(current => ({ ...current, [event.target.name]: event.target.value }));
  return <section className="panel admin-academic-forms">
    {error && <p className="auth-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}{loading && <p role="status">Loading academic options…</p>}
    {title === "Exams" ? <><h2>Create exam</h2><form className="admin-record-controls" onSubmit={event => { event.preventDefault(); run(async () => { await createExam({ name: examName, academicYearId: yearId, examDate }); setExamName(""); setExamDate(""); }); }}><label>Exam name<input required maxLength={160} value={examName} onChange={event => setExamName(event.target.value)}/></label><label>Academic year<select required value={yearId} onChange={event => setYearId(event.target.value)}><option value="">Select year</option>{options.years.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Exam date<input required type="date" value={examDate} onChange={event => setExamDate(event.target.value)}/></label><button className="primary-btn" disabled={busy || loading}>Save exam</button></form></>
    : <><h2>{editing ? "Edit marks" : "Record marks"}</h2><form className="admin-record-controls" onSubmit={event => { event.preventDefault(); run(async () => { await saveExamResult({ ...result, marks: Number(result.marks) }, editing?.id); setResult(emptyResult); onCancel(); }); }}>
      <label>Student<select name="studentId" required value={result.studentId} onChange={update}><option value="">Select student</option>{students.map(row => <option key={row.id} value={row.id}>{row.name} · {row.userId}</option>)}</select></label>
      <label>Exam<select name="examId" required value={result.examId} onChange={update}><option value="">Select exam</option>{options.exams.map(row => <option key={row.id} value={row.id}>{row.name} · {options.years.find(year => year.id === row.academic_year_id)?.name || "Year not assigned"}</option>)}</select></label>
      <label>Subject<select name="subjectId" required value={result.subjectId} onChange={update}><option value="">Select subject</option>{options.subjects.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>Marks<input required type="number" min="0" max="9999.99" step="0.01" name="marks" value={result.marks} onChange={update}/></label><label>Grade (optional)<input maxLength={8} name="grade" value={result.grade} onChange={update}/></label><button className="primary-btn" disabled={busy || loading}>{editing ? "Update marks" : "Save marks"}</button>{editing && <button type="button" className="filter-btn" onClick={onCancel}>Cancel edit</button>}
    </form><p className="subtle">Create exams and academic years in Exams. Add subjects below.</p></>}
    <details><summary>Manage academic years and subjects</summary>
      <form className="admin-record-controls" onSubmit={event => { event.preventDefault(); run(() => saveAcademicYear(year)); }}><label>Academic year<input required pattern="20[0-9]{2}-[0-9]{2}" placeholder="YYYY-YY" value={year.name} onChange={event => setYear(current => ({ ...current, name: event.target.value }))}/></label><label>Starts on<input required type="date" value={year.startsOn} onChange={event => setYear(current => ({ ...current, startsOn: event.target.value }))}/></label><label>Ends on<input required type="date" min={year.startsOn} value={year.endsOn} onChange={event => setYear(current => ({ ...current, endsOn: event.target.value }))}/></label><label className="admin-inline-check"><input type="checkbox" checked={year.active} onChange={event => setYear(current => ({ ...current, active: event.target.checked }))}/> Active year for fees</label><button className="filter-btn" disabled={busy || loading}>Save academic year</button></form>
      <div className="admin-record-controls">{options.years.map(row => <button key={row.id} type="button" className="filter-btn" disabled={busy} onClick={() => setYear({ name: row.name, startsOn: row.starts_on, endsOn: row.ends_on, active: row.active })}>{row.name}{row.active ? " · Active" : ""}</button>)}</div>
      <form className="admin-record-controls" onSubmit={event => { event.preventDefault(); run(async () => { await createAcademicSubject(subject); setSubject(""); }); }}><label>Subject name<input required maxLength={100} value={subject} onChange={event => setSubject(event.target.value)}/></label><button className="filter-btn" disabled={busy || loading}>Save subject</button></form>
    </details>
  </section>;
}
