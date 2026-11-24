import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Plus, RefreshCw, X } from "lucide-react";
import { createSyllabus, getClasses, getSections, getSyllabuses, getSyllabusSubjects, getTeacherWorkloads, saveSyllabusSubjects } from "../lib/api";
import SyllabusExcelImport from "../Components/SyllabusExcelImport";

import { getSyllabusDocuments, downloadSyllabusDocument, publishClassSyllabusPdf, deleteSyllabusTopic } from '../lib/api';
import "./AdminSyllabusDashboard.css";
import { classKey, filterSyllabusPlans, syllabusSectionOptions, termKey } from "../lib/syllabusFilters";

const normal = value => { const name = String(value || "").trim().toLowerCase(); return ["mathematics", "maths"].includes(name) ? "math" : name; };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateLabel = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const sortNames = (a, b) => a.localeCompare(b, undefined, { numeric: true });

export default function AdminSyllabusDashboard() {
  const [data, setData] = useState({ plans: [], workloads: [], classes: [], sections: [], subjects: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [selectedClass, setSelectedClass] = useState("");
  const [yearFilter,setYearFilter]=useState('');
  const [sectionFilter,setSectionFilter]=useState('');
  const [termFilter,setTermFilter]=useState('');
  const [subjectFilter,setSubjectFilter]=useState('');
  const [tab, setTab] = useState("pdfs");
  const [subjectDraft, setSubjectDraft] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [checkedSelection, setCheckedSelection] = useState("");
  const [pdfFile,setPdfFile]=useState(null);
  const [pdfYear,setPdfYear]=useState(new Date().getFullYear()-(new Date().getMonth()<3?1:0));
  const dialog = useRef(null);
  const load = useCallback(async () => {
    const [plans, workloads, classes, sections, subjects, documents] = await Promise.all([getSyllabuses(), getTeacherWorkloads(), getClasses(), getSections(), getSyllabusSubjects(), getSyllabusDocuments()]);
    setData({ plans, workloads: workloads.filter(w => w.status === "ACTIVE" && w.teacher_user_id), classes, sections, subjects, documents });
  }, []);
  useEffect(() => { let live = true; load().catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [load]);
  useEffect(() => {
    let live = true;
    const sync = () => { if (live && !busy && document.visibilityState === 'visible') load().catch(e => { if(live) setError(e.message); }); };
    const timer = window.setInterval(sync, 30000);
    window.addEventListener('focus', sync);
    return () => {live=false;window.clearInterval(timer);window.removeEventListener('focus',sync);};
  }, [load,busy]);
  const classNames = [...new Set(data.classes.map(c => c.name))].sort(sortNames);
  const assignmentClasses = [...new Map([...data.classes.map(c=>c.name), ...data.plans.map(p=>p.class_name)].filter(Boolean).map(c=>[classKey(c),classKey(c)])).values()].sort(sortNames);
  const assignmentSections = syllabusSectionOptions(data.plans, selectedClass);
  const assignedPlans = filterSyllabusPlans(data.plans, {className:selectedClass, section:sectionFilter, term:termFilter});
  const assignedTopicCount = assignedPlans.reduce((total,plan)=>total+(plan.topics || []).length,0);
  const termLabel = value => ({TERM_1:'Term 1',TERM_2:'Term 2',FINAL:'Final',FULL_YEAR:'Full year'}[termKey(value)] || value);
  const subjectsFor = className => {
    const saved = data.subjects.filter(s => s.class_name === className).map(s => s.subject);
    const stored = saved.length ? saved : [
      ...data.workloads.filter(w => w.class_name === className).map(w => w.subject),
      ...data.plans.filter(p => p.class_name === className).map(p => p.subject),
    ];
    return [...new Map(stored.map(subject => [normal(subject), subject])).values()].sort(sortNames);
  };
  const sectionsFor = className => [...new Set([...data.sections.filter(s => s.class_name === className).map(s => s.name), ...data.workloads.filter(w => w.class_name === className).map(w => w.section_name), ...data.plans.filter(p => p.class_name === className).map(p => p.section_name)])].sort(sortNames);
  const monthTopics = data.plans.filter(p=>(!yearFilter || p.year_start===yearFilter) && (!sectionFilter || p.section_name===sectionFilter) && (!termFilter || p.period===termFilter) && (!subjectFilter || normal(p.subject)===normal(subjectFilter))).flatMap(plan => plan.topics.filter(t => String(t.deadline).startsWith(month)).map(topic => ({ ...topic, plan })));
  const visibleClasses = classNames.filter(c => c === selectedClass);
  const coverage = visibleClasses.flatMap(className => {
    const sections = sectionsFor(className).filter(s=>!sectionFilter || s===sectionFilter);
    return (sections.length ? sections : [""]).flatMap(section => subjectsFor(className).filter(s=>!subjectFilter || normal(s)===normal(subjectFilter)).map(subject => {
      const topics = monthTopics.filter(t => t.plan.class_name === className && t.plan.section_name === section && normal(t.plan.subject) === normal(subject));
      const workload = data.workloads.find(w => w.class_name === className && w.section_name === section && normal(w.subject) === normal(subject));
      return { className, section, subject, topics, workload };
    }));
  });
  const missing = coverage.filter(row => !row.topics.length);
  const missingKey = missing.map(row => `${row.className}/${row.section}/${row.subject}`).join("|");
  const selectionKey = selectedClass ? `${selectedClass}/${month}` : "";
  useEffect(() => {
    if (!loading && !error && selectionKey && checkedSelection !== selectionKey) {
      setCheckedSelection(selectionKey);
      if (tab === "dashboard" && missingKey) setShowMissing(true);
    }
  }, [loading, error, selectionKey, checkedSelection, missingKey, tab]);
  useEffect(() => {
    if (showMissing && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [showMissing]);

  async function refresh() { setBusy(true); setError(""); try { await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function removeTopic(topic) {
    if(!window.confirm('Remove "'+topic.title+'" from the admin, teacher and student syllabus?')) return;
    setBusy(true);setError('');setMessage('');
    try {
      await deleteSyllabusTopic(topic.id);
      setData(current=>({...current,plans:current.plans.map(plan=>({...plan,topics:plan.topics.filter(t=>t.id!==topic.id)}))}));
      setMessage('Topic removed from the admin, teacher and student syllabus.');
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function downloadDocument(doc) {
    setBusy(true); setError('');
    try { const url=URL.createObjectURL(await downloadSyllabusDocument(doc.id));const link=document.createElement('a');link.href=url;link.download=doc.file_name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function saveSubjects(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const subjects = subjectDraft.split(",").map(s => s.trim()).filter(Boolean);
    if (!subjects.length || subjects.length > 30 || subjects.some(s => s.length > 100)) { setError("Enter 1–30 subjects, up to 100 characters each."); setBusy(false); return; }
    try { await saveSyllabusSubjects({ className: selectedClass, subjects }); await load(); setMessage(`Subjects saved for Class ${selectedClass}.`); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const schedule = monthTopics.filter(t => visibleClasses.includes(t.plan.class_name)).sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)) || sortNames(a.plan.class_name, b.plan.class_name));
  return <div className="admin-syllabus-dashboard">
    <header className="asd-header"><div><h1>Syllabus Management</h1><p>Whole class syllabuses, Excel imports and topic progress.</p></div><button disabled={busy || loading} onClick={refresh}><RefreshCw size={16}/> Refresh</button></header>
    {error && <p className="asd-error" role="alert">{error}</p>}{message && <p className="asd-success" role="status">{message}</p>}
    <nav className="asd-tabs" aria-label="Syllabus views">{[["pdfs", "Class PDFs"], ["excel", "Import Excel"], ["assign", "Assign topics"]].map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => { setTab(value); if (value === "subjects") setSubjectDraft(subjectsFor(selectedClass).join(", ")); }}>{label}</button>)}</nav>
    {["dashboard","quick","subjects"].includes(tab) && <div className="asd-filters"><label>Class<select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSubjectDraft(subjectsFor(e.target.value).join(", ")); }}><option value="">Select a class</option>{classNames.map(c => <option key={c} value={c}>Class {c}</option>)}</select></label><label>Target month<input required type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }}/></label><span>Topics are grouped by due date · IST</span></div>}
    {tab==='dashboard' && <div className="asd-filters"><label>Academic Year<select value={yearFilter} onChange={e=>setYearFilter(e.target.value)}><option value="">All years</option>{[...new Set(data.plans.map(p=>p.year_start).filter(Boolean))].sort().map(y=><option key={y} value={y}>Year starting {y}</option>)}</select></label><label>Section<select value={sectionFilter} onChange={e=>setSectionFilter(e.target.value)}><option value="">All sections</option>{sectionsFor(selectedClass).map(s=><option key={s}>{s}</option>)}</select></label><label>Term<select value={termFilter} onChange={e=>setTermFilter(e.target.value)}><option value="">All terms</option><option value="TERM_1">Term 1</option><option value="TERM_2">Term 2</option><option value="FINAL">Final</option><option value="FULL_YEAR">Full year</option></select></label><label>Subject<select value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}><option value="">All subjects</option>{subjectsFor(selectedClass).map(s=><option key={s}>{s}</option>)}</select></label></div>}
    {loading ? <p role="status">Loading classes and syllabus...</p> : <>
      {tab === "subjects" && <form className="asd-panel" onSubmit={saveSubjects}><h2>Subjects for each class</h2><p>Subjects come from saved class subjects, teacher assignments and syllabus records. Select a class to save its subject list to the database. Existing assigned topics remain available.</p>{selectedClass ? <><label>Subjects, separated by commas<textarea required value={subjectDraft} onChange={e => setSubjectDraft(e.target.value)} rows={3}/></label><button className="asd-primary" disabled={busy}>Save class subjects</button></> : <p>Select a class above to change its subjects.</p>}</form>}
      {tab === "excel" && <SyllabusExcelImport autoImport onImported={async result=>{setSelectedClass('');setSectionFilter('');setTermFilter('');const plans=await getSyllabuses();setData(current=>({...current,plans}));setMessage(`Imported ${result.topics} topics across ${result.plans} plans. Topics are now listed below.`);setTab("assign");}}/>}
      {tab === 'pdfs' && <section className="asd-panel"><h2>Complete class syllabus PDFs</h2><p>Upload the whole syllabus for each class. Teachers can download it in Lesson Planner and students in their class Syllabus.</p><form className="asd-filters asd-pdf-upload" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await publishClassSyllabusPdf(selectedClass,pdfYear+'-'+String((Number(pdfYear)+1)%100).padStart(2,'0'),'FULL_YEAR',pdfFile);await load();window.dispatchEvent(new Event('edura-notifications-changed'));setMessage('Whole syllabus published for teachers and students.');}catch(e){setError(e.message);}finally{setBusy(false);}}}><label>Class<select required value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}><option value="">Select class</option>{classNames.map(c=><option key={c}>{c}</option>)}</select></label><label>Academic year starting<input required type="number" min="2000" max="2100" value={pdfYear} onChange={e=>setPdfYear(e.target.value)}/></label><label>Whole syllabus PDF<input required type="file" accept=".pdf,application/pdf" onChange={e=>setPdfFile(e.target.files[0]||null)}/></label><button className="asd-primary" disabled={busy||!pdfFile||!selectedClass}>Publish class PDF</button></form><div className="asd-table-scroll"><table><thead><tr><th>Class</th><th>Academic Year</th><th>Term</th><th>Document</th><th>Action</th></tr></thead><tbody>{data.documents.map(doc=><tr key={doc.id}><td>{doc.class_name}</td><td>{doc.academic_year}</td><td>{doc.period.replaceAll('_',' ')}</td><td>{doc.file_name}</td><td><button disabled={busy} onClick={()=>downloadDocument(doc)}>Download PDF</button></td></tr>)}{!data.documents.length && <tr><td colSpan={5}>No complete class PDFs published yet.</td></tr>}</tbody></table></div></section>}
      {tab === "assign" && <section className="asd-panel"><h2>Assigned topics</h2><p>View progress updated by the assigned teachers. Topics also appear in their Lesson Planner and the student class Syllabus.</p>
        <div className="asd-filters"><label>Class<select value={classKey(selectedClass)} onChange={e=>{setSelectedClass(e.target.value);setSectionFilter('');}}><option value="">All classes</option>{assignmentClasses.map(c=><option key={c} value={c}>Class {c}</option>)}</select></label>
          <label>Section<select value={sectionFilter} onChange={e=>setSectionFilter(e.target.value)}><option value="">All sections</option>{assignmentSections.map(section=><option key={section} value={section}>{section}</option>)}</select></label>
          <label>Term<select value={termFilter} onChange={e=>setTermFilter(e.target.value)}><option value="">All terms</option><option value="TERM_1">Term 1</option><option value="TERM_2">Term 2</option><option value="FINAL">Final</option><option value="FULL_YEAR">Full year</option></select></label>
          <button type="button" onClick={()=>{setSelectedClass('');setSectionFilter('');setTermFilter('');}}>Clear filters</button>
        </div><p role="status">{assignedTopicCount} {assignedTopicCount===1?'topic':'topics'} match your filters.</p>
        <div className="asd-topic-list">{assignedPlans.flatMap(plan=>(plan.topics || []).map(topic=>{const status=topic.workflow_status||(topic.completed_at?'DONE':topic.status==='IN_PROGRESS'?'IN_PROGRESS':'TODO');return <article className="asd-topic-row" key={topic.id}><div><strong>{topic.title}</strong><small>Class {classKey(plan.class_name)} / {plan.section_name} &middot; {plan.subject} &middot; {termLabel(plan.period)} &middot; {plan.academic_year||plan.year_start}</small><small>{plan.teacher_names||'Assigned teacher'} &middot; Due {dateLabel(topic.deadline)}</small>{topic.description&&<p>{topic.description}</p>}</div><div className="asd-topic-actions"><span className={'asd-status-select asd-status-badge '+status.toLowerCase()} aria-label={'Status of '+topic.title}>{status==='DONE'?'Done':status==='IN_PROGRESS'?'In progress':'TODO'}</span><button type="button" className="asd-remove-topic" disabled={busy} aria-label={'Remove topic '+topic.title} title="Remove topic" onClick={()=>removeTopic(topic)}><X size={17}/></button></div></article>;}))}
          {!assignedTopicCount && <p>{data.plans.length?'No topics match this class, section and term. Change or clear the filters.':'No topics yet. Import an Excel workbook to get started.'}</p>}
        </div></section>}
      {tab === "quick" && <MonthlyAssignment key={`${selectedClass}/${month}/${subjectsFor(selectedClass).join("|")}`} className={selectedClass} month={month} subjects={subjectsFor(selectedClass)} sections={sectionsFor(selectedClass)} workloads={data.workloads} onSaved={async () => { await load(); setMessage("Monthly topics assigned. Teachers can view them in Lesson Planner."); }} />}
      {tab === "dashboard" && !visibleClasses.length && <p className="asd-panel">{classNames.length ? "Select a class above to view its monthly syllabus." : "No active classes are available in the database."}</p>}
      {tab === "dashboard" && visibleClasses.length > 0 && <>
        <div className="asd-stats">{[["Classes", visibleClasses.length], ["Topics this month", schedule.length], ["Completed topics", schedule.filter(t => t.completed_at).length], ["Subjects missing a plan", missing.length]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        {missing.length > 0 && <div className="asd-warning"><span>{missing.length} class / section subjects have no topics assigned for {month}.</span><button onClick={() => setShowMissing(true)}>View missing subjects</button></div>}
        {!subjectsFor(selectedClass).length && <p className="asd-panel">No subjects are saved for this class. Add subjects in Class subjects or assign teachers in Teacher Workload.</p>}
        <section className="asd-class-grid">{visibleClasses.map(className => <article className="asd-panel" key={className}><h2>Class {className}</h2>{coverage.filter(row => row.className === className).map(row => <div className="asd-subject" key={`${row.section}/${row.subject}`}><div><strong>{row.subject}</strong><small>{row.section ? `Section ${row.section}` : "No section configured"}</small></div><span className={row.topics.length ? "asd-assigned" : "asd-unassigned"}>{row.topics.length ? `${row.topics.length} topics` : "Not assigned"}</span></div>)}<button onClick={() => { setSelectedClass(className); setTab("assign"); }}>Assign monthly topics</button></article>)}</section>
        <section className="asd-panel"><h2>Date-wise topic schedule</h2><div className="asd-table-scroll"><table><thead><tr><th>Due date (IST)</th><th>Class / section</th><th>Subject</th><th>Topic</th><th>Teacher</th><th>Status</th></tr></thead><tbody>{schedule.map(t => <tr key={t.id}><td>{dateLabel(t.deadline)}<small>{String(t.deadline_time || "23:59").slice(0, 5)}</small></td><td>{t.plan.class_name} / {t.plan.section_name}</td><td>{t.plan.subject}</td><td>{t.chapter && <small>{t.chapter}</small>}<strong>{t.title}</strong>{t.start_date && <small>Starts {dateLabel(t.start_date)}</small>}</td><td>{t.plan.teacher_names || "No active teacher"}</td><td>{t.status.replaceAll("_", " ").toLowerCase()}</td></tr>)}{!schedule.length && <tr><td colSpan={6}>No topics assigned for this month.</td></tr>}</tbody></table></div></section>
      </>}
    </>}
    {showMissing && <dialog ref={dialog} className="asd-dialog" onCancel={() => setShowMissing(false)} onClose={() => setShowMissing(false)}><div className="asd-header"><h2>Subjects not assigned · {month}</h2><button aria-label="Close missing subjects" onClick={() => setShowMissing(false)}><X size={18}/></button></div><p>These subjects have no topic due in the selected month.</p><ul>{missing.map(row => <li key={`${row.className}/${row.section}/${row.subject}`}><strong>Class {row.className}{row.section && ` / ${row.section}`}: {row.subject}</strong><span>{row.workload ? "Monthly syllabus not assigned" : "Assign a teacher in Teacher Workload first"}</span></li>)}</ul><button className="asd-primary" onClick={() => setShowMissing(false)}>Got it</button></dialog>}
  </div>;
}

function MonthlyAssignment({ className, month, subjects, sections, workloads, onSaved }) {
  const [section, setSection] = useState(sections[0] || "");
  const [rows, setRows] = useState([{ id: 0, subject: subjects[0], title: "", deadline: `${month}-01`, deadlineTime: "16:00" }]);
  const next = useRef(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const update = (id, field, value) => { setSaved(false); setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row)); };
  async function submit(event) {
    event.preventDefault(); setError("");
    const grouped = new Map();
    for (const row of rows) {
      const assignment = workloads.find(w => w.class_name === className && w.section_name === section && normal(w.subject) === normal(row.subject));
      if (!assignment) { setError(`Class ${className} / ${section}: ${row.subject} has no teacher assignment. Set it in Teacher Workload first.`); return; }
      if (!row.title.trim() || !row.deadline.startsWith(month)) { setError("Enter each topic and choose a due date within the selected month."); return; }
      const topics = grouped.get(assignment.subject) || [];
      topics.push({ title: row.title.trim(), deadline: row.deadline, deadlineTime: row.deadlineTime }); grouped.set(assignment.subject, topics);
    }
    if ([...grouped.values()].some(topics => topics.length > 100)) { setError("Use at most 100 topics per subject."); return; }
    const [year, targetMonth] = month.split("-").map(Number);
    setBusy(true);
    try {
      await createSyllabus({ title: `Monthly syllabus ${month}`, className, sectionName: section, yearStart: `${targetMonth < 4 ? year - 1 : year}-04-01`, period: "FULL_YEAR", subjects: [...grouped].map(([subject, topics]) => ({ subject, topics })) });
      setSaved(true); await onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const missingSubjects = subjects.filter(subject => !rows.some(row => normal(row.subject) === normal(subject) && row.title.trim()));
  if (!className) return <div className="asd-panel">Select a class above to assign monthly topics.</div>;
  if (!subjects.length) return <div className="asd-panel">No subjects are saved for this class. Add subjects in Class subjects or assign teachers in Teacher Workload first.</div>;
  const [y, m] = month.split("-").map(Number);
  const lastDay = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  return <form className="asd-panel asd-assignment" onSubmit={submit}><h2><BookOpen size={18}/> Class {className} · {month}</h2><p>Add subjects and topics for this month. Assignments use the teachers already set in Teacher Workload.</p>{error && <p className="asd-error" role="alert">{error}</p>}
    <fieldset disabled={busy || saved}><label>Section<select required value={section} onChange={e => setSection(e.target.value)}><option value="">Select section</option>{sections.map(s => <option key={s}>{s}</option>)}</select></label>
    {rows.map((row, index) => <div className="asd-topic-input" key={row.id}><label>Subject<select value={row.subject} onChange={e => update(row.id, "subject", e.target.value)}>{subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Topic<input required maxLength={200} placeholder="Enter topic" value={row.title} onChange={e => update(row.id, "title", e.target.value)}/></label><label>Due date<input required type="date" min={`${month}-01`} max={lastDay} value={row.deadline} onChange={e => update(row.id, "deadline", e.target.value)}/></label><label>Time (IST)<input required type="time" value={row.deadlineTime} onChange={e => update(row.id, "deadlineTime", e.target.value)}/></label><button type="button" aria-label={`Remove topic ${index + 1}`} disabled={rows.length === 1} onClick={() => setRows(current => current.filter(t => t.id !== row.id))}><X size={16}/></button></div>)}
    {missingSubjects.length > 0 && <p className="asd-warning">Subjects without topics in this draft: {missingSubjects.join(", ")}. Review monthly coverage after saving.</p>}
    <div className="asd-actions"><button type="button" onClick={() => setRows(current => [...current, { id: next.current++, subject: subjects[0], title: "", deadline: `${month}-01`, deadlineTime: "16:00" }])}><Plus size={16}/> Add topic</button><button className="asd-primary" disabled={!section}>{busy ? "Assigning..." : saved ? "Assigned" : "Assign monthly topics"}</button></div></fieldset>
    {saved && <button type="button" onClick={() => { setSaved(false); setRows([{ id: next.current++, subject: subjects[0], title: "", deadline: `${month}-01`, deadlineTime: "16:00" }]); }}>Start another assignment</button>}
  </form>;
}
