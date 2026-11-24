import { useEffect, useRef, useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import { extractSyllabusSubjects } from "../lib/api";

const pad = n => String(n).padStart(2, "0");
const classKey = row => JSON.stringify([row.class_name, row.section_name]);
const monthName = value => new Date(`${value}-01T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const monthsFor = (year, start) => Array.from({ length: 12 }, (_, index) => {
  const date = new Date(Number(year), Number(start) - 1 + index, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
});

export default function AnnualSyllabusForm({ assignments, busy, onSubmit }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear() - (now.getMonth() < 3 ? 1 : 0));
  const [startMonth, setStartMonth] = useState("4");
  const [selectedClass, setSelectedClass] = useState("");
  const [title, setTitle] = useState("Annual syllabus");
  const [period, setPeriod] = useState("FULL_YEAR");
  const [selectedSubjects, setSelectedSubjects] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState("");
  const extractionRequest = useRef(0);
  useEffect(() => () => { extractionRequest.current++; }, []);
  const [targets, setTargets] = useState({});
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const fileInput = useRef(null);
  const nextId = useRef(0);
  const classes = [...new Map(assignments.map(row => [classKey(row), row])).values()];
  const availableSubjects = [...new Set(assignments.filter(row => classKey(row) === selectedClass).map(row => row.subject))];
  const subjects = availableSubjects.filter(subject => selectedSubjects === null || selectedSubjects.includes(subject));
  const yearMonths = monthsFor(year, startMonth);
  const months = period === "TERM_1" ? yearMonths.slice(0, 6) : period === "TERM_2" ? yearMonths.slice(6) : yearMonths;
  const periodLabel = period === "TERM_1" ? "Term 1" : period === "TERM_2" ? "Term 2" : "Full year";
  const keyFor = (subject, month) => JSON.stringify([selectedClass, subject, month, period]);
  const rowsFor = (subject, month) => targets[keyFor(subject, month)] || [];
  const setRows = (subject, month, update) => setTargets(current => {
    const key = keyFor(subject, month);
    return { ...current, [key]: update(current[key] || []) };
  });
  const subjectTopics = subject => months.flatMap(month => rowsFor(subject, month));
  const addTopic = (subject, month) => {
    const [y, m] = month.split("-").map(Number);
    const deadline = `${month}-${pad(new Date(y, m, 0).getDate())}`;
    const id = nextId.current++;
    setRows(subject, month, rows => [...rows, { id, title: "", deadline, deadlineTime: "16:00" }]);
  };
  async function uploadPdf(nextFile) {
    const requestId = ++extractionRequest.current;
    setFile(nextFile); setExtractionMessage(""); setError(""); setExtracting(false);
    if (!nextFile) { setSelectedSubjects(null); return; }
    if (nextFile.size > 5 * 1024 * 1024 || !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF of 5 MB or smaller."); return;
    }
    const assignment = classes.find(row => classKey(row) === selectedClass);
    if (!assignment) { setError("Select a class before uploading the PDF."); return; }
    setExtracting(true);
    try {
      const result = await extractSyllabusSubjects(nextFile, assignment.class_name, assignment.section_name);
      if (requestId !== extractionRequest.current) return;
      setSelectedSubjects(result.subjects); setExtractionMessage(result.message);
    } catch (e) {
      if (requestId === extractionRequest.current) { setSelectedSubjects([]); setExtractionMessage(`${e.message} You can select the subjects manually.`); }
    } finally { if (requestId === extractionRequest.current) setExtracting(false); }
  }
  async function submit(event) {
    event.preventDefault(); setError("");
    const assignment = classes.find(row => classKey(row) === selectedClass);
    if (!assignment || !subjects.length) { setError("Select a class with assigned subjects."); return; }
    const missing = subjects.filter(subject => !subjectTopics(subject).length);
    if (missing.length) { setError(`Add monthly targets for: ${missing.join(", ")}.`); return; }
    if (file && (file.size > 5 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf"))) { setError("Choose a PDF of 5 MB or smaller."); return; }
    const saved = await onSubmit({ title: title.trim(), className: assignment.class_name, sectionName: assignment.section_name,
      yearStart: `${year}-${pad(startMonth)}-01`, period, subjects: subjects.map(subject => ({ subject, topics: subjectTopics(subject).map(({ title, deadline, deadlineTime }) => ({ title: title.trim(), deadline, deadlineTime })) })) }, file);
    if (saved) {
      setTargets(current => Object.fromEntries(Object.entries(current).filter(([key]) => {
        const [classId, subject, month, savedPeriod] = JSON.parse(key);
        return classId !== selectedClass || savedPeriod !== period || !subjects.includes(subject) || !months.includes(month);
      })));
      setFile(null); fileInput.current.value = ""; setExtractionMessage(""); setSelectedSubjects(null);
    }
  }
  return <form className="syllabus-create annual-syllabus-form" onSubmit={submit}>
    <h2>Class syllabus · Year & terms</h2><p>Choose Full year, Term 1 or Term 2. Upload a PDF to detect its subjects, then add monthly topics and deadlines for the selected subjects.</p>
    {error && <p className="syllabus-form-error" role="alert">{error}</p>}
    {!classes.length && <p className="syllabus-form-error">Assign class subjects in Teacher Workload first.</p>}
    <fieldset disabled={busy || extracting || !classes.length}>
      <div className="syllabus-form-grid">
        <label>Plan title<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>Class / section<select required value={selectedClass} onChange={e => { extractionRequest.current++; setSelectedClass(e.target.value); setSelectedSubjects(null); setFile(null); fileInput.current.value = ""; setExtractionMessage(""); setError(""); }}><option value="">Select class</option>{classes.map(row => <option key={classKey(row)} value={classKey(row)}>Class {row.class_name} / {row.section_name}</option>)}</select></label>
        <label>Academic year starts in<input type="number" min="2000" max="2100" required value={year} onChange={e => setYear(e.target.value)} /></label>
        <label>First month<select value={startMonth} onChange={e => setStartMonth(e.target.value)}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{new Date(2026, index, 1).toLocaleDateString("en-IN", { month: "long" })}</option>)}</select></label>
        <label>Syllabus period<select value={period} onChange={e => { setPeriod(e.target.value); setError(""); }}><option value="FULL_YEAR">Full year</option><option value="TERM_1">Term 1 · First six months</option><option value="TERM_2">Term 2 · Last six months</option></select></label>
      </div>
      <div className="annual-period">{periodLabel} · {monthName(months[0])} – {monthName(months[months.length - 1])} · {subjects.length} subjects · {months.length}-month plan</div>
      <label className="syllabus-upload"><Upload size={20} /><span>{periodLabel} syllabus PDF<small>PDF up to 5 MB / 100 pages. Subjects are detected from readable text and matched to this class. Review the selection below.</small></span><input ref={fileInput} disabled={!selectedClass} type="file" accept=".pdf,application/pdf" aria-label="Annual syllabus PDF" onChange={e => uploadPdf(e.target.files[0] || null)} /></label>
      {extracting && <p role="status">Reading PDF and extracting subjects…</p>}
      {extractionMessage && <p className="annual-extraction-message" role="status">{extractionMessage}</p>}
      {availableSubjects.length > 0 && <div className="annual-subject-selection"><b>Subjects to include</b><div>{availableSubjects.map(subject => <label key={subject}><input type="checkbox" checked={subjects.includes(subject)} onChange={e => setSelectedSubjects(e.target.checked ? [...subjects, subject] : subjects.filter(s => s !== subject))} />{subject}</label>)}</div><small>{subjects.length} of {availableSubjects.length} assigned subjects selected. You can correct the PDF selection here.</small></div>}
      {subjects.length > 0 && <p className="annual-help">Expand a subject, then add its monthly topics. Months without teaching can remain empty. Draft targets are retained separately for each class, year and term.</p>}
      {subjects.map(subject => <details className="annual-subject" key={`${selectedClass}-${subject}`} open={subjects.length === 1 || undefined}>
        <summary><strong>{subject}</strong><span>{months.filter(month => rowsFor(subject, month).length).length}/{months.length} months planned · {subjectTopics(subject).length}/100 topics</span></summary>
        <div className="annual-months">{months.map(month => <section className="annual-month" key={month}>
          <div className="annual-month-heading"><h3>{monthName(month)}</h3><button type="button" className="syllabus-secondary" disabled={subjectTopics(subject).length >= 100} onClick={() => addTopic(subject, month)}><Plus size={13} /> Add topic</button></div>
          {!rowsFor(subject, month).length && <p className="annual-empty-month">No target set for this month.</p>}
          {rowsFor(subject, month).map(row => <div className="annual-target-row" key={row.id}>
            <label>Topic / monthly target<input required maxLength={200} value={row.title} placeholder="e.g. Fractions: chapters 3 and 4" onChange={e => setRows(subject, month, rows => rows.map(t => t.id === row.id ? { ...t, title: e.target.value } : t))} /></label>
            <label>Target date<input required type="date" value={row.deadline} min={`${month}-01`} max={`${month}-${pad(new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate())}`} onChange={e => setRows(subject, month, rows => rows.map(t => t.id === row.id ? { ...t, deadline: e.target.value } : t))} /></label>
            <label>Time (IST)<input required type="time" value={row.deadlineTime} onChange={e => setRows(subject, month, rows => rows.map(t => t.id === row.id ? { ...t, deadlineTime: e.target.value } : t))} /></label>
            <button type="button" className="syllabus-icon-button" aria-label={`Remove ${subject} ${monthName(month)} topic`} onClick={() => setRows(subject, month, rows => rows.filter(t => t.id !== row.id))}><X size={16} /></button>
          </div>)}
        </section>)}</div>
      </details>)}
      <div className="syllabus-form-footer"><small>Teachers receive only their assigned class and subject targets.</small><button className="syllabus-primary" disabled={!subjects.length || !title.trim() || subjects.some(subject => subjectTopics(subject).some(t => !t.title.trim()))}><Upload size={15} />{busy ? "Publishing…" : `Publish ${periodLabel.toLowerCase()} syllabus`}</button></div>
    </fieldset>
  </form>;
}
