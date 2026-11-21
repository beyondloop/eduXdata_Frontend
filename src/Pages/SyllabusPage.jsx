import SyllabusExcelImport from "../Components/SyllabusExcelImport";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, Download, Plus, RefreshCw, Send, Upload, X } from "lucide-react";
import { addSyllabusNote, createSyllabus, downloadSyllabus, extractSyllabusSubjects, getSyllabuses, getTeacherWorkloads, updateSyllabusTopic, setSyllabusTopicStatus } from "../lib/api";
import "./SyllabusPage.css";
import AnnualSyllabusForm from "../Components/AnnualSyllabusForm";
import AdminSyllabusDashboard from "./AdminSyllabusDashboard";
import { getSyllabusDocuments, downloadSyllabusDocument } from '../lib/api';

const workflow = topic => topic.workflow_status || (topic.completed_at ? "DONE" : topic.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TODO");
const workflowLabel = topic => ({TODO:"TODO", IN_PROGRESS:"In progress", DONE:"Done"}[workflow(topic)]);
const workflowClass = topic => ({TODO:"pending", IN_PROGRESS:"in_progress", DONE:"completed"}[workflow(topic)]);
const completed = (topic) => Boolean(topic.completed_at);
const dateLabel = (date) => new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timestampLabel = (date) => new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const assignmentKey = (row) => JSON.stringify([row.class_name, row.section_name, row.subject]);
const periodLabel = period => period === "TERM_1" ? "Term 1" : period === "TERM_2" ? "Term 2" : period === "FINAL" ? "Final" : "Full year";

export default function SyllabusPage({ role, view }) {
  if (role === "Admin" && !["Pending", "Completed"].includes(view)) return <AdminSyllabusDashboard />;
  return <ExistingSyllabusPage role={role} view={view} />;
}

function ExistingSyllabusPage({ role, view }) {
  const admin = role === "Admin";
  const student = role === "Student";
  const teacher = role === "Teacher";
  const pageMode = admin && view === "Pending" ? "pending" : admin && view === "Completed" ? "completed" : "assigned";
  const pageInfo = {
    assigned: { title: "Assigned syllabus", description: "Plan the academic year. Keep every class, subject and teaching assignment in one place.", heading: "Syllabus library", label: "ASSIGN & ORGANISE", icon: BookOpen },
    pending: { title: "Pending syllabus", description: "See what needs attention, review upcoming deadlines and keep teaching on track.", heading: "Teaching work queue", label: "REVIEW & FOLLOW UP", icon: Clock3 },
    completed: { title: "Completed syllabus", description: "Explore completed topics, review teaching records and celebrate classroom progress.", heading: "Completion records", label: "PROGRESS & ACHIEVEMENT", icon: CheckCircle2 },
  }[pageMode];
  const PageIcon = pageInfo.icon;
  const canAssign = admin && pageMode === "assigned";
  const [plans, setPlans] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [planMode, setPlanMode] = useState("single");
  const [yearFilter, setYearFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(view === "Pending" ? "PENDING" : view === "Completed" ? "COMPLETED" : "ALL");
  const mounted = useRef(false);

  const load = useCallback(async () => {
    const [syllabuses, workloads, pdfs] = await Promise.all([getSyllabuses(), canAssign ? getTeacherWorkloads() : Promise.resolve([]), getSyllabusDocuments()]);
    if (!mounted.current) return;
    setPlans(syllabuses);
    setDocuments(pdfs);
    setAssignments([...new Map(workloads.filter(w => w.status === "ACTIVE" && w.teacher_user_id).map(w => [assignmentKey(w), w])).values()]);
  }, [canAssign]);
  useEffect(() => {
    mounted.current = true;
    load().catch(e => { if (mounted.current) setError(e.message); }).finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [load]);

  // Pick up completion updates made in another portal while this page is open.
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== "visible" || busy) return;
      load().catch(e => { if (mounted.current) setError(e.message); });
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    const timer = window.setInterval(sync, 30000);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(timer);
    };
  }, [load, busy]);

  async function act(action, message) {
    setBusy(true); setError(""); setSuccess("");
    try {
      await action();
      if (!mounted.current) return true;
      setSuccess(message);
      try { await load(); } catch (e) { setError(`Saved, but the list could not refresh: ${e.message}`); }
      return true;
    } catch (e) { if (mounted.current) setError(e.message); return false; }
    finally { if (mounted.current) setBusy(false); }
  }

  async function refresh() {
    setBusy(true); setError("");
    try { await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function download(plan) {
    setBusy(true); setError("");
    try {
      const blob = await (plan.classDocument ? downloadSyllabusDocument(plan.id) : downloadSyllabus(plan.id));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = plan.file_name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const topics = plans.flatMap(p => p.topics);
  const classOptions = [...new Set(plans.map(p => `${p.class_name} / ${p.section_name}`))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const yearOptions = [...new Set(plans.map(p => p.year_start).filter(Boolean))].sort();
  const subjectOptions = [...new Set(plans.map(p => p.subject))].sort();
  const clearFilters = () => { setYearFilter(""); setSubjectFilter(""); setMonthFilter(""); setPeriodFilter(""); setClassFilter(""); setQuery(""); setStatus("ALL"); };
  const hasFilters = yearFilter || subjectFilter || monthFilter || periodFilter || classFilter || query || status !== "ALL";
  const visible = plans.filter(p => (!classFilter || `${p.class_name} / ${p.section_name}` === classFilter) && (!yearFilter || p.year_start === yearFilter) && (!subjectFilter || p.subject === subjectFilter) && (!periodFilter || (p.period || "FULL_YEAR") === periodFilter)).map(p => ({ ...p, visibleTopics: p.topics.filter(t => {
    const matchesStatus = status === "ALL" || (status === "UPCOMING" ? !completed(t) && t.status !== "OVERDUE" && String(t.deadline).slice(0,10) > new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()) : status === "NOT_STARTED" ? t.status === "PENDING" : status === "PENDING" ? !completed(t) : status === "COMPLETED" ? completed(t) : t.status === status);
    const matchesView = pageMode === "pending" ? !completed(t) : pageMode === "completed" ? completed(t) : true;
    return matchesView && matchesStatus && (!monthFilter || String(t.deadline).startsWith(monthFilter)) && `${p.title} ${p.subject} ${p.teacher_names || ""} ${t.title}`.toLowerCase().includes(query.trim().toLowerCase());
  }) })).filter(p => p.visibleTopics.length).map(p => ({ ...p, visibleTopics: pageMode === "pending" ? [...p.visibleTopics].sort((a, b) => String(a.deadline).localeCompare(String(b.deadline))) : pageMode === "completed" ? [...p.visibleTopics].sort((a, b) => String(b.completed_at || "").localeCompare(String(a.completed_at || ""))) : p.visibleTopics }));
  if (pageMode === "pending") visible.sort((a, b) => String(a.visibleTopics[0].deadline).localeCompare(String(b.visibleTopics[0].deadline)));
  const filteredTopics = visible.flatMap(p => p.visibleTopics);
  const doneCount = topics.filter(completed).length;
  const summaryItems = pageMode === "pending"
    ? [["Topics to finish", filteredTopics.length], ["Overdue topics", filteredTopics.filter(t => t.status === "OVERDUE").length], ["In progress", filteredTopics.filter(t => t.status === "IN_PROGRESS").length], ["Classes affected", new Set(visible.map(p => `${p.class_name}/${p.section_name}`)).size]]
    : pageMode === "completed"
      ? [["Completed topics", filteredTopics.length], ["Completed on time", filteredTopics.filter(t => t.status === "COMPLETED").length], ["Completed late", filteredTopics.filter(t => t.status === "COMPLETED_LATE").length], ["Subjects covered", new Set(visible.map(p => p.subject)).size]]
      : [["Assigned plans", plans.length], ["Subjects", subjectOptions.length], ["Total topics", topics.length], ["Overall completion", `${topics.length ? Math.round(doneCount / topics.length * 100) : 0}%`]];

  return <div className={`syllabus-page${admin ? ` syllabus-admin syllabus-view-${pageMode}` : teacher ? " syllabus-teacher" : student ? " syllabus-student" : ""}`}>
    <header className="syllabus-hero">
      <div><span className="syllabus-eyebrow"><PageIcon size={15} /> {admin ? pageInfo.label : student ? "YOUR CLASS PROGRESS" : "YOUR TEACHING PLAN"}</span><h1>{admin ? pageInfo.title : student ? "Syllabus & progress" : "Lesson Planner"}</h1><p>{admin ? pageInfo.description : student ? "Follow your class syllabus and subject progress." : "Your assigned syllabus, daily teaching notes and topic milestones."}</p></div>
      {canAssign && <button className="syllabus-primary" aria-expanded={showCreate} aria-controls="syllabus-assignment" disabled={loading || busy} onClick={() => setShowCreate(v => !v)}>{showCreate ? <X size={16} /> : <Upload size={16} />}{showCreate ? "Close form" : "Assign syllabus"}</button>}
    </header>
    {error && <div className="syllabus-alert error" role="alert">{error}</div>}
    {success && <div className="syllabus-alert success" role="status">{success}</div>}
    {loading ? <div className="syllabus-empty" role="status">Loading syllabus…</div> : <>
      {admin && <div className="syllabus-stats syllabus-view-stats">{summaryItems.map(([label, count], index) => <div key={label}><span className="syllabus-stat-index">0{index + 1}</span><small>{label}</small><strong>{count}</strong></div>)}</div>}
      {!admin && <div className="syllabus-stats">
        {[['Assigned topics', topics.length], ['Completed', topics.filter(completed).length], ['In progress', topics.filter(t => t.status === 'IN_PROGRESS').length], ['Overdue', topics.filter(t => t.status === 'OVERDUE').length]].map(([label, count]) => <div key={label}><small>{label}</small><strong>{count}</strong></div>)}
      </div>}
      {student && <section className="syllabus-card student-progress-card"><h2>Subject-wise progress</h2><p>Overall syllabus progress: {topics.length ? Math.round(doneCount / topics.length * 100) : 0}%</p>{!subjectOptions.length && <p className="student-progress-empty">Subject progress will appear when your class topics are assigned.</p>}{subjectOptions.map(subject => { const rows=plans.filter(p=>p.subject===subject).flatMap(p=>p.topics); const done=rows.filter(completed).length; return <div className="syllabus-progress" key={subject}><strong>{subject}  |  {rows.length ? Math.round(done/rows.length*100):0}% completed</strong><progress max={rows.length || 1} value={done}/></div>; })}<div className="student-progress-chips"><span className="done"><CheckCircle2 size={14}/> Done <b>{doneCount}</b></span><span className="todo"><BookOpen size={14}/> TODO <b>{topics.filter(t=>workflow(t)==='TODO').length}</b></span><span className="in-progress"><Clock3 size={14}/> In progress <b>{topics.filter(t=>workflow(t)==='IN_PROGRESS').length}</b></span></div></section>}
      {documents.length>0 && <section className="syllabus-card syllabus-documents-card"><h2>Complete class syllabus PDFs</h2><p>Published by Admin for your class. Documents are read-only.</p>{documents.map(doc=><div className="syllabus-card-heading" key={doc.id}><div><strong>Class {String(doc.class_name).replace(/^class\s*/i,'')} - {doc.academic_year} - {periodLabel(doc.period)}</strong><p>{doc.file_name}</p></div><button disabled={busy} className="syllabus-secondary" onClick={()=>download({...doc,classDocument:true})}><Download size={15}/> Download PDF</button></div>)}</section>}
      {teacher && <section className="lesson-classes" aria-label="Your assigned classes"><div className="lesson-section-heading"><div><h2>Your classes</h2><p>{classOptions.length} classes · {subjectOptions.length} subjects · {topics.length} topics</p></div><button type="button" className="syllabus-secondary" onClick={clearFilters}>Show all classes</button></div><div className="lesson-class-tabs">{classOptions.map(className => {
        const classPlans = plans.filter(p => `${p.class_name} / ${p.section_name}` === className);
        const classTopics = classPlans.flatMap(p => p.topics);
        return <button type="button" key={className} aria-pressed={classFilter === className} onClick={() => { clearFilters(); setClassFilter(classFilter === className ? "" : className); }}><strong>Class {className}</strong><span>{new Set(classPlans.map(p => p.subject)).size} subjects · {classTopics.length} topics</span></button>;
      })}</div></section>}
      {canAssign && <div id="syllabus-assignment" hidden={!showCreate}><div className="syllabus-plan-modes" role="group" aria-label="Syllabus plan type"><button type="button" aria-pressed={planMode === "annual"} onClick={() => setPlanMode("annual")}>Year / Term syllabus</button><button type="button" aria-pressed={planMode === "single"} onClick={() => setPlanMode("single")}>Single subject</button><button type="button" aria-pressed={planMode === "excel"} onClick={() => setPlanMode("excel")}>Import Excel</button></div><div hidden={planMode !== "annual"}><AnnualSyllabusForm assignments={assignments} busy={busy} onSubmit={(entry, file) => act(() => createSyllabus(entry, file), `${periodLabel(entry.period)} syllabus published for the selected subjects.`)} /></div><div hidden={planMode !== "single"}><CreateSyllabus assignments={assignments} busy={busy} onSubmit={(entry, file) => act(() => createSyllabus(entry, file), "Syllabus assigned. Teachers can now view it in Lesson Planner.")} /></div><div hidden={planMode !== "excel"}><SyllabusExcelImport onImported={load} /></div></div>}
      <section className="syllabus-list">
        <div className="syllabus-list-heading"><div><h2>{admin ? pageInfo.heading : teacher ? "Your lesson topics" : "My class syllabus"}</h2>{admin ? <p>{visible.length} plans shown{pageMode === "pending" ? " · Earliest deadlines first" : pageMode === "completed" ? " · Latest completions first within each plan" : " · Browse by class and subject"}</p> : teacher ? <p>{filteredTopics.length} of {topics.length} topics shown · Deadlines in IST</p> : <p>Explore your topics and the latest progress shared by your teachers.</p>}</div><button className="syllabus-secondary" disabled={busy} onClick={refresh}><RefreshCw size={14} /> Refresh</button></div>
        {teacher && hasFilters && <button type="button" className="lesson-clear-filters" onClick={clearFilters}><X size={14} /> Clear filters · Show all assigned topics</button>}
        <details className="syllabus-extra-filters" open={student ? true : undefined}><summary>More filters{(yearFilter || subjectFilter || monthFilter || periodFilter) ? " (active)" : ""}</summary><label className="syllabus-term-filter">Syllabus period<select aria-label="Filter syllabus term" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}><option value="">All periods</option><option value="FULL_YEAR">Full year</option><option value="TERM_1">Term 1</option><option value="TERM_2">Term 2</option><option value="FINAL">Final</option></select></label>
        <div className="syllabus-filters annual-filters"><select aria-label="Filter academic year" value={yearFilter} onChange={e => setYearFilter(e.target.value)}><option value="">All academic years</option>{yearOptions.map(year => <option key={year} value={year}>Year starting {dateLabel(year)}</option>)}</select><select aria-label="Filter subject" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}><option value="">All subjects</option>{subjectOptions.map(subject => <option key={subject}>{subject}</option>)}</select><label>Target month<input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} /></label>{monthFilter && <button className="syllabus-text-button" onClick={() => setMonthFilter("")}>Show all months</button>}</div></details>
        <div className="syllabus-filters"><input aria-label="Search syllabus and topics" placeholder="Search subject, topic or teacher…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by class" value={classFilter} onChange={e => setClassFilter(e.target.value)}><option value="">All classes</option>{classOptions.map(c => <option key={c} value={c}>Class {c}</option>)}</select><select aria-label="Filter topic status" value={status} onChange={e => setStatus(e.target.value)}>{(!admin || pageMode === "assigned") && <option value="ALL">All topics</option>}{(!admin || pageMode !== "completed") && <><option value="PENDING">All unfinished topics</option><option value="NOT_STARTED">Not Started</option><option value="UPCOMING">Upcoming topics</option><option value="IN_PROGRESS">In progress</option><option value="OVERDUE">Overdue</option></>}{(!admin || pageMode !== "pending") && <><option value="COMPLETED">All completed topics</option><option value="COMPLETED_LATE">Completed late</option></>}</select></div>
        {!visible.length && <div className="syllabus-empty"><BookOpen size={32} /><h3>{plans.length ? "No topics match these filters" : "No syllabus assigned yet"}</h3><p>{plans.length ? "Choose another class or status, or clear your search." : admin ? "Select Assign syllabus to choose a class, subject and topics." : "Syllabuses for your assigned classes and subjects will appear here."}</p></div>}
        <div className="syllabus-results">{teacher ? classOptions.filter(className => visible.some(p => `${p.class_name} / ${p.section_name}` === className)).map(className => <TeacherClassGroup key={className} className={className} plans={visible.filter(p => `${p.class_name} / ${p.section_name}` === className)} busy={busy} act={act} download={download} onMonth={setMonthFilter} />) : visible.map(plan => <article className="syllabus-card" key={plan.id}>
          <div className="syllabus-card-heading"><div><span className="syllabus-class">Class {plan.class_name} · {plan.section_name}{!teacher && ` · ${plan.subject}`} · {periodLabel(plan.period)}</span><h3>{teacher ? plan.subject : plan.title}</h3><p>{teacher ? `${plan.title} · ${plan.visibleTopics.length} topics shown` : `Teacher: ${plan.teacher_names || "No active teacher assigned"}`}</p></div>{plan.file_name && <button className="syllabus-secondary" disabled={busy} onClick={() => download(plan)}><Download size={15} /> Syllabus PDF</button>}</div>
          <div className="syllabus-progress"><progress max={plan.topics.length} value={plan.topics.filter(completed).length} aria-label={`${plan.title} completion`} /><span>{plan.topics.filter(completed).length}/{plan.topics.length} topics completed</span></div>
          {!admin && plan.year_start && (teacher ? <details className="lesson-monthly"><summary><CalendarDays size={15} /> Monthly targets</summary><MonthlyProgress plan={plan} onMonth={setMonthFilter} /></details> : <MonthlyProgress plan={plan} onMonth={setMonthFilter} />)}
          {admin && pageMode === "assigned" ? <details className="syllabus-topic-details"><summary>View topics & deadlines ({plan.visibleTopics.length})</summary><div className="syllabus-topics">{plan.visibleTopics.map(topic => <Topic key={topic.id} topic={topic} yearStart={plan.year_start} admin={admin} student={student} busy={busy} act={act} />)}</div></details> : <div className="syllabus-topics">{plan.visibleTopics.map(topic => <Topic key={topic.id} topic={topic} yearStart={plan.year_start} admin={admin} student={student} busy={busy} act={act} />)}</div>}
        </article>)}</div>
      </section>
    </>}
  </div>;
}

function TeacherClassGroup({ className, plans, busy, act, download, onMonth }) {
  const topics = plans.flatMap(p => p.visibleTopics);
  const subjects = [...new Set(plans.map(p => p.subject))].sort();
  return <section className="lesson-class-group" aria-label={`Class ${className} lessons`}>
    <header className="lesson-class-heading"><h3>Class {className}</h3><span>{subjects.length} subjects · {topics.length} topics · {topics.filter(completed).length} completed</span></header>
    {subjects.map(subject => <div key={subject} className="lesson-class-subject"><h4><BookOpen size={15} />{subject}</h4>{plans.filter(p => p.subject === subject).map(plan => <div className="lesson-compact-plan" key={plan.id}>
      <div className="lesson-plan-caption"><span>{plan.title} · {periodLabel(plan.period)} · {plan.academic_year || (plan.year_start ? dateLabel(plan.year_start) : "")}</span>{plan.file_name && <button type="button" className="syllabus-secondary" disabled={busy} onClick={() => download(plan)}><Download size={13} /> PDF</button>}</div>
      {plan.visibleTopics.map(topic => <details className="lesson-topic-row" key={topic.id}>
        <summary><span className="lesson-row-title">{completed(topic) ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}<span><strong>{topic.title}</strong>{topic.chapter && <small>{topic.chapter}</small>}</span></span><span className="lesson-row-deadline">Due {dateLabel(topic.deadline)}</span>{topic.priority && <span className={`lesson-row-priority priority-${topic.priority.toLowerCase()}`}>{topic.priority.toLowerCase()}</span>}<select className={`syllabus-status lesson-status-dropdown ${workflowClass(topic)}`} aria-label={'Status of '+topic.title} value={workflow(topic)} disabled={busy} onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} onChange={e=>act(()=>setSyllabusTopicStatus(topic.id,e.target.value),'Topic status updated.')}><option value="TODO">TODO</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select><span className="lesson-row-expand" aria-hidden="true">⌄</span></summary>
        <Topic topic={topic} yearStart={plan.year_start} admin={false} student={false} busy={busy} act={act} />
      </details>)}
      {plan.year_start && <details className="lesson-monthly"><summary><CalendarDays size={14} /> Monthly targets</summary><MonthlyProgress plan={plan} onMonth={onMonth} /></details>}
    </div>)}</div>)}
  </section>;
}

function CreateSyllabus({ assignments, busy, onSubmit }) {
  const [title, setTitle] = useState("");
  const [assignment, setAssignment] = useState("");
  const [topics, setTopics] = useState([{ title: "", deadline: "", key: 0 }]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState("");
  const extractionRequest = useRef(0);
  useEffect(() => () => { extractionRequest.current++; }, []);
  const fileInput = useRef(null);
  const nextKey = useRef(1);
  const update = (key, field, value) => setTopics(rows => rows.map(t => t.key === key ? { ...t, [field]: value } : t));
  async function uploadPdf(nextFile) {
    const current = ++extractionRequest.current;
    setFile(nextFile); setExtractionMessage(""); setError("");
    if (!nextFile) return;
    const selected = assignments.find(w => assignmentKey(w) === assignment);
    if (!selected) return;
    setExtracting(true);
    try {
      const result = await extractSyllabusSubjects(nextFile, selected.class_name, selected.section_name);
      if (current !== extractionRequest.current) return;
      const subject = result.subjects.includes(selected.subject) ? selected.subject : result.subjects[0];
      if (subject) setAssignment(assignmentKey({ ...selected, subject }));
      setExtractionMessage(`${result.message}${result.subjects.length > 1 ? " For multiple subjects, use Year / Term syllabus." : ""}`);
    } catch (e) { if (current === extractionRequest.current) setExtractionMessage(`${e.message} Select the subject manually.`); }
    finally { if (current === extractionRequest.current) setExtracting(false); }
  }
  async function submit(e) {
    e.preventDefault(); setError("");
    const selected = assignments.find(w => assignmentKey(w) === assignment);
    if (!selected) { setError("Choose an assigned class and subject."); return; }
    if (file && (file.size > 5 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf"))) { setError("Choose a PDF of 5 MB or smaller."); return; }
    const saved = await onSubmit({ title: title.trim(), className: selected.class_name, sectionName: selected.section_name, subject: selected.subject, topics: topics.map(t => ({ title: t.title.trim(), deadline: t.deadline })) }, file);
    if (saved) { setTitle(""); setAssignment(""); setTopics([{ title: "", deadline: "", key: nextKey.current++ }]); setFile(null); fileInput.current.value = ""; }
  }
  return <form className="syllabus-create" onSubmit={submit}><h2>Assign a syllabus</h2><p>Select the class, section and subject from Teacher Workload. Add a PDF for reference and enter each topic’s deadline below.</p>
    {error && <p role="alert" className="syllabus-form-error">{error}</p>}
    {!assignments.length && <p className="syllabus-form-error">Create a teacher workload assignment before assigning a syllabus.</p>}
    <fieldset disabled={busy || extracting || !assignments.length}>
      <div className="syllabus-form-grid"><label>Syllabus title<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mathematics · Term 1" /></label><label>Class / section / subject<select required value={assignment} onChange={e => setAssignment(e.target.value)}><option value="">Select teaching assignment</option>{assignments.map(w => <option key={assignmentKey(w)} value={assignmentKey(w)}>Class {w.class_name} / {w.section_name} / {w.subject}</option>)}</select></label></div>
      <label className="syllabus-upload"><Upload size={20} /><span>Syllabus document <small>Choose a class above, then upload a PDF to detect its subject. Up to 5 MB.</small></span><input ref={fileInput} disabled={!assignment} aria-label="Syllabus PDF" type="file" accept=".pdf,application/pdf" onChange={e => uploadPdf(e.target.files[0] || null)} /></label>
      {extracting && <p role="status">Extracting subjects from PDF…</p>}
      {extractionMessage && <p className="annual-extraction-message" role="status">{extractionMessage}</p>}
      <div className="syllabus-topic-label"><h3>Topics & deadlines</h3><small>{topics.length}/100 topics</small></div>
      {topics.map((topic, index) => <div className="syllabus-topic-input" key={topic.key}><span>{index + 1}</span><label>Topic<input required maxLength={200} value={topic.title} onChange={e => update(topic.key, 'title', e.target.value)} placeholder="Topic title" /></label><label>Deadline<input type="date" required value={topic.deadline} onChange={e => update(topic.key, 'deadline', e.target.value)} /></label><button type="button" className="syllabus-icon-button" aria-label={`Remove topic ${index + 1}`} disabled={topics.length === 1} onClick={() => setTopics(rows => rows.filter(t => t.key !== topic.key))}><X size={16} /></button></div>)}
      <div className="syllabus-form-footer"><button type="button" className="syllabus-secondary" disabled={topics.length >= 100} onClick={() => setTopics(rows => [...rows, { title: "", deadline: "", key: nextKey.current++ }])}><Plus size={15} /> Add topic</button><button className="syllabus-primary" disabled={!title.trim() || topics.some(t => !t.title.trim())}><Upload size={15} />{busy ? "Saving…" : "Assign syllabus"}</button></div>
    </fieldset>
  </form>;
}

function MonthlyProgress({ plan, onMonth }) {
  const yearStart = new Date(`${String(plan.year_start).slice(0, 10)}T12:00:00`);
  const start = new Date(yearStart.getFullYear(), yearStart.getMonth() + (plan.period === "TERM_2" ? 6 : 0), 1);
  const count = plan.period === "TERM_1" || plan.period === "TERM_2" ? 6 : 12;
  const end = new Date(start.getFullYear(), start.getMonth() + count, 0);
  return <div className="annual-progress"><h4>{periodLabel(plan.period)} monthly targets · {start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – {end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</h4><div>{Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const targets = plan.topics.filter(t => String(t.deadline).startsWith(month));
    return <button key={month} disabled={!targets.length} type="button" onClick={() => onMonth(month)}><b>{date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</b><span>{targets.length ? `${targets.filter(completed).length}/${targets.length} completed` : "No targets"}</span>{targets.some(t => t.status === "OVERDUE") && <small>Overdue</small>}</button>;
  })}</div></div>;
}

function Topic({ topic, yearStart, admin, student, busy, act }) {
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(topic.title);
  const [deadline, setDeadline] = useState(String(topic.deadline).slice(0, 10));
  const [deadlineTime, setDeadlineTime] = useState(String(topic.deadline_time || "23:59").slice(0, 5));
  return <div className={`syllabus-topic${completed(topic) ? " topic-is-complete" : ""}`}>
    <div className="syllabus-topic-heading"><div>{topic.chapter && <span className="lesson-chapter">{topic.chapter}</span>}<h4>{completed(topic) && <CheckCircle2 size={17} />}{topic.title}</h4></div><span className={`syllabus-status ${workflowClass(topic)}`}>{workflowLabel(topic)}</span></div>
    {topic.description && <p className="lesson-topic-description">{topic.description}</p>}
    <div className="lesson-topic-meta"><div><span>Month</span><strong>{new Date(`${String(topic.deadline).slice(0,7)}-01T12:00:00`).toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</strong></div>{topic.start_date && <div><span><CalendarDays size={14} /> Start date</span><strong>{dateLabel(topic.start_date)}</strong></div>}<div><span><Clock3 size={14} /> Due date</span><strong>{dateLabel(topic.deadline)}</strong><small>{String(topic.deadline_time || "23:59").slice(0, 5)} IST</small></div>{topic.priority && <div><span>Priority</span><strong className={`lesson-priority priority-${topic.priority.toLowerCase()}`}>{topic.priority.toLowerCase()}</strong></div>}</div>
    {completed(topic) && <div className="lesson-completion-panel"><CheckCircle2 size={20} /><div><strong>Completed by {topic.completed_by_name || "teacher"}</strong><time dateTime={topic.completed_at}>{timestampLabel(topic.completed_at)} IST</time></div>{!admin && !student && <div className="lesson-completion-rewards">{topic.points != null && <span>{topic.points} points</span>}<span>{topic.completion_status === "ON_TIME" || topic.status === "COMPLETED" ? "On time" : `${topic.days_late || 0} days late`}</span></div>}</div>}
    {admin && !completed(topic) && (editing ? <form className="syllabus-edit" onSubmit={async e => { e.preventDefault(); if (await act(() => updateSyllabusTopic(topic.id, { title: title.trim(), deadline, deadlineTime }), "Topic and deadline updated.")) setEditing(false); }}><label>Topic<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Deadline<input required type="date" min={yearStart || undefined} value={deadline} onChange={e => setDeadline(e.target.value)} /></label><label>Time (IST)<input required type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} /></label><button className="syllabus-primary" disabled={busy || !title.trim()}>Save</button><button type="button" className="syllabus-secondary" onClick={() => setEditing(false)}>Cancel</button></form> : <button className="syllabus-text-button" onClick={() => { setTitle(topic.title); setDeadline(String(topic.deadline).slice(0, 10)); setDeadlineTime(String(topic.deadline_time || "23:59").slice(0, 5)); setEditing(true); }}>Edit topic / deadline</button>)}
    {!student && <details className="syllabus-notes"><summary>Daily notes <span>{topic.notes.length}</span>{topic.notes[0] && <small>Latest: {timestampLabel(topic.notes[0].created_at)} IST</small>}</summary>
      {topic.notes.length ? <ol>{topic.notes.map(n => <li key={n.id}><div><b>{n.author_name}</b><time dateTime={n.created_at}>{timestampLabel(n.created_at)} IST</time></div><p>{n.body}</p></li>)}</ol> : <p className="syllabus-no-notes">No daily notes yet.</p>}
    </details>}
    {!admin && !student && <details className="lesson-note-editor"><summary><Plus size={15} /> Add a teaching note</summary><form className="syllabus-note-form" onSubmit={async e => { e.preventDefault(); if (await act(() => addSyllabusNote(topic.id, note.trim()), "Daily note added.")) setNote(""); }}><label htmlFor={`note-${topic.id}`}>Today’s teaching note</label><textarea id={`note-${topic.id}`} rows={3} required maxLength={2000} disabled={busy} value={note} onChange={e => setNote(e.target.value)} placeholder="What did you cover today? Add progress, difficulties or next steps…" /><div><small>Automatically dated · {note.length}/2000 characters</small><button className="syllabus-primary" disabled={busy || !note.trim()}><Send size={14} /> Save daily note</button></div></form></details>}
  </div>;
}
