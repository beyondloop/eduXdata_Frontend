import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Download, FileText, MessageCircle, Plus, Search, Send, Upload, X } from "lucide-react";
import {
  addClassAssignmentComment, createClassAssignment, downloadClassAssignmentFile,
  getAssignmentClasses, getClassAssignmentComments, getClassAssignments,
  reviewClassAssignment, saveClassAssignmentFeedback, updateClassAssignmentStatus,
  updateTeacherClassAssignmentStatus,
} from "../lib/api";

const field = (row, camel, snake) => row?.[camel] ?? row?.[snake] ?? "";
const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "COMPLETED"];
const statusName = (status) => ({ TODO: "To do", IN_PROGRESS: "In progress", DONE: "Review / checking", COMPLETED: "Completed" }[status] || status);
const statusTone = (status) => ({ TODO: "bg-amber-100 text-amber-800", IN_PROGRESS: "bg-sky-100 text-sky-800", DONE: "bg-violet-100 text-violet-800", COMPLETED: "bg-emerald-100 text-emerald-800" }[status] || "bg-slate-100 text-slate-700");
const ticketCode = (task) => `EDU-${String(field(task, "ticketNumber", "ticket_number") ?? task.id).padStart(6, "0")}`;

export default function ClassAssignmentsPage({ role }) {
  const teacher = role === "Teacher";
  const [items, setItems] = useState([]), [classes, setClasses] = useState([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false), [compose, setCompose] = useState(false);
  const [classKey, setClassKey] = useState(""), [search, setSearch] = useState(""), [subjectFilter, setSubjectFilter] = useState(""), [expanded, setExpanded] = useState({});
  const [subject, setSubject] = useState(""), [title, setTitle] = useState(""), [instructions, setInstructions] = useState(""), [file, setFile] = useState(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState({}), [threads, setThreads] = useState({}), [threadOpen, setThreadOpen] = useState({}), [commentDrafts, setCommentDrafts] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try { setItems(await getClassAssignments()); }
    catch (failure) {
      const message = failure.message || "Unable to load assignments.";
      setError(message.toLowerCase().includes("no static resource") ? "The backend serving this portal has not loaded the class assignments API yet. Restart it from the backend folder with: .\\start.ps1 -Restart" : message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    refresh();
    if (teacher) getAssignmentClasses().then(setClasses).catch((failure) => setError(failure.message || "Unable to load your assigned classes."));
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh({ quiet: true }); }, 10000);
    return () => window.clearInterval(timer);
  }, [refresh, teacher]);

  const classOptions = useMemo(() => [...new Map(classes.map((row) => [`${row.class_name}|${row.section_name}`, { value: `${row.class_name}|${row.section_name}`, label: `Class ${row.class_name} · ${row.section_name}` }])).values()], [classes]);
  const selectedClassKey = classKey || classOptions[0]?.value || "";
  const selectedClass = classOptions.find((option) => option.value === selectedClassKey);
  const subjects = useMemo(() => [...new Set(classes.filter((row) => `${row.class_name}|${row.section_name}` === selectedClassKey).map((row) => row.subject))], [classes, selectedClassKey]);
  const tasks = useMemo(() => {
    const map = new Map();
    items.forEach((row) => { const id = field(row, "id", "id"); if (!map.has(id)) map.set(id, { ...row, students: [] }); if (teacher && row.student_id) map.get(id).students.push(row); });
    return [...map.values()];
  }, [items, teacher]);
  const classTasks = useMemo(() => teacher ? tasks.filter((task) => `${field(task,"className","class_name")}|${field(task,"sectionName","section_name")}` === selectedClassKey) : tasks, [tasks, teacher, selectedClassKey]);
  const visibleStudents = (task) => {
    const query = search.trim().toLowerCase();
    if (!query) return task.students || [];
    return (task.students || []).filter((student) => {
      const name = student.student_name ?? student.studentName ?? "";
      const roll = student.roll_number ?? student.rollNumber ?? "";
      return `${name} ${roll}`.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    });
  };
  const visibleTasks = useMemo(() => {
    const scope = teacher && search.trim() ? tasks : classTasks;
    return teacher && search.trim() ? scope.filter((task) => visibleStudents(task).length) : scope;
  }, [tasks, classTasks, teacher, search]);
  const boardTasks = useMemo(() => visibleTasks.filter((task) => !subjectFilter || task.subject === subjectFilter), [visibleTasks, subjectFilter]);
  const boardSubjects = useMemo(() => [...new Set(classTasks.map((task) => task.subject).filter(Boolean))].sort(), [classTasks]);
  const selectedTask = tasks.find((task) => String(task.id) === String(selectedTaskId));
  const selectedStudent = selectedTask?.students.find((student) => String(student.student_id) === String(selectedStudentId));
  const detailStatus = teacher ? selectedStudent?.status || selectedTaskStatus : selectedTask?.status;
  const assignedAt = teacher ? selectedStudent?.assigned_at || selectedTask?.created_at : selectedTask?.assigned_at || selectedTask?.created_at;
  const completedAt = teacher ? selectedStudent?.completed_at || selectedTask?.students.filter((student)=>student.status === "COMPLETED").map((student)=>student.completed_at).filter(Boolean).sort().at(-1) : selectedTask?.completed_at;
  const reviewFeedback = teacher ? selectedStudent?.feedback : selectedTask?.feedback;
  const openTaskDetails = (task,status=task.status,student=null) => { setSelectedTaskId(task.id); setSelectedStudentId(student?.student_id || null); setSelectedTaskStatus(student?.status || status); };

  const submitTask = async (event) => {
    event.preventDefault(); if (!selectedClass || !subject || !title.trim()) return;
    if (file && file.type !== "application/pdf" && !file.type.startsWith("image/")) { setError("Choose an image or PDF file."); return; }
    setSaving(true); setError("");
    try {
      const [className, sectionName] = selectedClass.value.split("|");
      await createClassAssignment({ className, sectionName, subject, title: title.trim(), instructions: instructions.trim(), file });
      setCompose(false); setTitle(""); setInstructions(""); setSubject(""); setFile(null); await refresh();
    } catch (failure) { setError(failure.message || "Unable to publish this task."); }
    finally { setSaving(false); }
  };
  const moveCard = async (taskId, studentId, status) => {
    setError("");
    try {
      if (teacher) await updateTeacherClassAssignmentStatus(taskId, studentId, status);
      else await updateClassAssignmentStatus(taskId, status);
      await refresh({ quiet: true });
    } catch (failure) { setError(failure.message || "That task cannot move to this column."); }
  };
  const handleDrop = (event, status) => {
    event.preventDefault();
    try { const payload = JSON.parse(event.dataTransfer.getData("application/json")); if (payload.status !== status) moveCard(payload.taskId, payload.studentId, status); }
    catch { setError("This card could not be moved."); }
  };
  const dragProps = (task, student = null) => ({ draggable: true, onDragStart: (event) => event.dataTransfer.setData("application/json", JSON.stringify({ taskId: task.id, studentId: student?.student_id || "", status: student?.status || task.status })) });
  const submitTaskReview = async (task, student) => {
    const key = `${task.id}:${student.student_id}`;
    setSaving(true); setError("");
    try { await reviewClassAssignment(task.id, student.student_id, feedbackDrafts[key] || ""); setFeedbackDrafts((drafts) => ({ ...drafts, [key]: "" })); await refresh({ quiet: true }); }
    catch (failure) { setError(failure.message || "Unable to complete the review."); }
    finally { setSaving(false); }
  };
  const sendFeedback = async (task, student) => {
    const key = `${task.id}:${student.student_id}`, message = feedbackDrafts[key]?.trim(); if (!message) return;
    setSaving(true); setError("");
    try { await saveClassAssignmentFeedback(task.id, student.student_id, message); setFeedbackDrafts((drafts) => ({ ...drafts, [key]: "" })); await refresh({ quiet: true }); }
    catch (failure) { setError(failure.message || "Unable to save feedback."); }
    finally { setSaving(false); }
  };
  const toggleThread = async (task, student = null) => {
    const threadKey = student?.student_id ? `${task.id}:${student.student_id}` : task.id;
    if (!threadOpen[threadKey] && !threads[threadKey]) {
      try { const comments = await getClassAssignmentComments(task.id, student?.student_id); setThreads((all) => ({ ...all, [threadKey]: comments })); }
      catch (failure) { setError(failure.message || "Unable to load comments."); return; }
    }
    setThreadOpen((open) => ({ ...open, [threadKey]: !open[threadKey] }));
  };
  const postComment = async (task, student = null) => {
    const threadKey = student?.student_id ? `${task.id}:${student.student_id}` : task.id;
    const body = commentDrafts[threadKey]?.trim(); if (!body) return;
    setSaving(true); setError("");
    try { await addClassAssignmentComment(task.id, body, student?.student_id); setCommentDrafts((drafts) => ({ ...drafts, [threadKey]: "" })); const comments = await getClassAssignmentComments(task.id, student?.student_id); setThreads((all) => ({ ...all, [threadKey]: comments })); setThreadOpen((open) => ({ ...open, [threadKey]: true })); }
    catch (failure) { setError(failure.message || "Unable to post comment."); }
    finally { setSaving(false); }
  };
  const download = async (id, name) => { try { const blob = await downloadClassAssignmentFile(id); const href = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = href; anchor.download = name || "assignment-file"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(href), 1000); } catch (failure) { setError(failure.message || "Unable to download the attachment."); } };

  const renderCommentThread = (task, student = null) => {
    const threadKey = student?.student_id ? `${task.id}:${student.student_id}` : task.id;
    return <div className="mt-2"><button type="button" onClick={() => toggleThread(task,student)} className="inline-flex items-center gap-1 border-t border-slate-100 pt-2 text-[10px] font-extrabold text-indigo-600"><MessageCircle size={12}/>{threadOpen[threadKey] ? "Hide comments" : "Comments"}{threads[threadKey]?.length > 0 ? ` · ${threads[threadKey].length}` : ""}</button>
      {threadOpen[threadKey] && <div className="mt-2 space-y-2">{(threads[threadKey] || []).map((comment) => <div key={comment.id} className="rounded-lg bg-slate-50 p-2"><p className="text-[9px] font-extrabold text-slate-600">{comment.author_name} · {comment.author_role === "TEACHER" ? "Teacher" : "Student"}</p><p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-700">{comment.body}</p></div>)}<textarea value={commentDrafts[threadKey] || ""} onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [threadKey]: event.target.value }))} maxLength={4000} rows={2} placeholder={teacher ? `Comment for ${student?.student_name || "this student"}` : "Add a comment to this task"} className="w-full rounded-lg border border-slate-200 p-2 text-xs"/><button type="button" disabled={saving || !commentDrafts[threadKey]?.trim()} onClick={() => postComment(task,student)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"><Send size={12}/> Comment</button></div>}
    </div>;
  };

  const renderCard = (task, teacherLane = null) => {
    const matches = teacher ? visibleStudents(task).filter((student) => student.status === teacherLane) : [];
    const lane = teacher ? teacherLane : task.status;
    const expandedKey = `${task.id}:${lane}`;
    return <article key={`${task.id}-${lane}`} {...(!teacher ? dragProps(task) : {})} onClick={(event)=>{if(!event.target.closest("button,textarea,input,select,a"))openTaskDetails(task,lane);}} onKeyDown={(event)=>{if((event.key==="Enter"||event.key===" ")&&!event.target.closest("button,textarea,input,select,a")){event.preventDefault();openTaskDetails(task,lane);}}} tabIndex={0} role="button" aria-label={`Open ${task.title} details`} className={`assignment-ticket assignment-ticket-open ${teacher && (expanded[expandedKey] || search.trim()) ? "expanded" : ""}`}>
      <div className="flex items-start gap-2"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><FileText size={16}/></div><div className="min-w-0 flex-1"><span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-500">{task.subject}</span><button type="button" onClick={()=>openTaskDetails(task,lane)} className="mt-1 block text-left text-sm font-extrabold text-slate-800 hover:text-indigo-600">{task.title}</button><p className="mt-1 text-[10px] text-slate-500">{teacher ? `Class ${field(task,"className","class_name")} · ${field(task,"sectionName","section_name")}` : `Assigned by ${task.teacher_name || "your teacher"}`}</p></div>{!teacher && <span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${statusTone(lane)}`}>{statusName(lane)}</span>}</div>
      {teacher && <div className="mt-3 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusTone(lane)}`}>{statusName(lane)} · {matches.length}</span></div>}
      {teacher && matches.length > 0 && <button type="button" onClick={()=>setExpanded((state)=>({...state,[expandedKey]:!state[expandedKey]}))} className="mt-2 text-[10px] font-extrabold text-indigo-600">{expanded[expandedKey] ? "Hide student tickets" : `View student tickets · ${matches.length}`}</button>}
      {teacher && (expanded[expandedKey] || search.trim()) && <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">{matches.map((student)=>{
        const key=`${task.id}:${student.student_id}`, studentStatus=student.status;
        return <div key={key} {...(studentStatus === "DONE" ? dragProps(task,student) : {})} onClick={(event)=>{if(!event.target.closest("button,textarea,input,select,a")){event.stopPropagation();openTaskDetails(task,studentStatus,student);}}} className={`assignment-student-ticket ${studentStatus === "DONE" ? "ready-for-review" : ""}`} title="Open this student's ticket details">
          <div className="flex flex-wrap items-center gap-2"><div className="mr-auto min-w-0"><b className="block text-[11px] text-slate-800">{student.student_name}</b><small className="text-[9px] text-slate-500">Roll no. {student.roll_number || "—"}</small></div><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${statusTone(studentStatus)}`}>{statusName(studentStatus)}</span></div>
        </div>;
      })}</div>}
      <div className="assignment-ticket-key">{ticketCode(task)}</div>
    </article>;
  };

  return <div className="assignment-board-page mx-auto w-full max-w-[1700px] space-y-4 text-slate-700">
    <div className="assignment-board-titlebar"><div><p>Assignments <span>/</span> {teacher ? "Teacher board" : "My board"}</p><h1>Board</h1></div>{teacher && <label>Class<select value={selectedClassKey} onChange={(event)=>setClassKey(event.target.value)}>{classOptions.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}</div>
    {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
    <div className="assignment-board-toolbar"><div className="assignment-board-filter"><span>{teacher ? classOptions.find((option)=>option.value===selectedClassKey)?.label || "Assigned classes" : classTasks[0] ? `Class ${field(classTasks[0],"className","class_name")} · ${field(classTasks[0],"sectionName","section_name")}` : "Your class"}</span><label className="assignment-quick-filter">Quick filters<select value={subjectFilter} onChange={(event)=>setSubjectFilter(event.target.value)}><option value="">All subjects</option>{boardSubjects.map((name)=><option key={name}>{name}</option>)}</select></label><span className="assignment-board-drag-hint">Drag cards between columns to update status</span></div>{teacher && <label className="assignment-board-search"><Search size={17}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search by student name or roll number"/></label>}</div>
    {loading ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading assignment board…</p> : <div className="assignment-board-columns">{STATUSES.map((status)=>{
      const cards = boardTasks.filter((task)=> teacher ? task.students.some((student)=>student.status===status && (!search.trim() || visibleStudents(task).includes(student))) : task.status===status);
      return <section key={status} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>handleDrop(event,status)} className={`assignment-board-column ${status=== "DONE" ? "review-column" : ""}`}>
        <div className="assignment-column-heading"><h2>{statusName(status)}</h2><div><span className="assignment-column-count">{cards.length}</span>{teacher && status==="TODO" && <button type="button" disabled={!classOptions.length} onClick={()=>{setClassKey(selectedClassKey);setCompose(true);}} aria-label="Add task to To do" className="assignment-add-button"><Plus size={16}/></button>}</div></div>
        <div className="assignment-column-cards">{cards.length ? cards.map((task)=>renderCard(task,status)) : <p className="assignment-column-empty">{status==="TODO"&&teacher?"Add a task here":"Drop a card here"}</p>}</div>
      </section>;
    })}</div>}
    {compose && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="assignment-compose-title"><form onSubmit={submitTask} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="text-[10px] font-extrabold tracking-widest text-indigo-500">NEW CLASS TASK</span><h2 id="assignment-compose-title" className="mt-1 text-xl font-black">Add to To do</h2></div><button type="button" onClick={()=>setCompose(false)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
      <label className="block text-xs font-bold">Assignee class<select required value={selectedClassKey} onChange={(event)=>{setClassKey(event.target.value);setSubject("");}} className="mt-1 block w-full rounded-lg border border-slate-200 p-3">{classOptions.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="block text-xs font-bold">Subject<select required value={subject} onChange={(event)=>setSubject(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-3"><option value="">Select subject</option>{subjects.map((name)=><option key={name}>{name}</option>)}</select></label>
      <label className="block text-xs font-bold">Task title<input required maxLength={200} value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="For example: Chapter 4 practice" className="mt-1 block w-full rounded-lg border border-slate-200 p-3"/></label>
      <label className="block text-xs font-bold">Task details<textarea value={instructions} onChange={(event)=>setInstructions(event.target.value)} rows={5} maxLength={10000} placeholder="Write the assignment details or attach a file below." className="mt-1 block w-full rounded-lg border border-slate-200 p-3"/></label>
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm font-bold text-indigo-700"><Upload size={17}/><span>{file?file.name:"Attach an image or PDF (optional, up to 10 MB)"}</span><input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event)=>setFile(event.target.files?.[0]||null)}/></label>{file&&<button type="button" onClick={()=>setFile(null)} className="text-xs text-rose-600">Remove attachment</button>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={()=>setCompose(false)} className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving||!classOptions.length} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{saving?"Publishing…":"Add to To do"}</button></div>
    </form></div>}
    {selectedTask && <div className="assignment-detail-backdrop" role="dialog" aria-modal="true" aria-labelledby="assignment-detail-title" onMouseDown={(event)=>{if(event.target===event.currentTarget)setSelectedTaskId(null);}}><section className="assignment-detail-page"><div className="assignment-detail-header"><div className="assignment-detail-crumb">Assignments <span>/</span> {selectedTask.subject} <span>/</span> {ticketCode(selectedTask)}{selectedStudent ? ` / ${selectedStudent.student_name}` : ""}</div><h2 id="assignment-detail-title">{selectedTask.title}</h2><div className="assignment-detail-actions"><span className="assignment-detail-static-action"><FileText size={14}/> Task</span>{!teacher ? <label className={`assignment-detail-status ${statusTone(selectedTask.status)}`}>Status<select aria-label="Update task status" value={selectedTask.status} disabled={saving || ["DONE","COMPLETED"].includes(selectedTask.status)} onChange={(event)=>moveCard(selectedTask.id,null,event.target.value)}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Review / checking</option><option value="COMPLETED">Completed</option></select></label> : <span className="assignment-detail-static-action">{field(selectedTask,"className","class_name")} · {field(selectedTask,"sectionName","section_name")}</span>}<button type="button" onClick={()=>setSelectedTaskId(null)} className="assignment-detail-close"><X size={15}/> Close</button></div></div><div className="assignment-detail-grid"><main className="assignment-detail-main"><section className="assignment-detail-section"><h3><span>⌄</span> Details</h3><dl><dt>Subject</dt><dd>{selectedTask.subject}</dd><dt>Class / section</dt><dd>{field(selectedTask,"className","class_name")} · {field(selectedTask,"sectionName","section_name")}</dd><dt>Task ID</dt><dd>{ticketCode(selectedTask)}</dd></dl></section><section className="assignment-detail-section"><h3><span>⌄</span> Description</h3><p>{selectedTask.instructions || "No task description provided."}</p></section>{selectedTask.file_name && <section className="assignment-detail-section"><h3><span>⌄</span> Attachments</h3><button type="button" onClick={()=>download(selectedTask.id,selectedTask.file_name)} className="assignment-detail-attachment"><Download size={14}/>{selectedTask.file_name}</button></section>}<section className="assignment-detail-section assignment-detail-activity"><h3><span>⌄</span> Activity</h3><div className="assignment-detail-tabs"><span className="selected">Comments</span></div>{teacher ? (selectedStudent ? renderCommentThread(selectedTask,selectedStudent) : <p className="text-xs text-slate-500">Select a student ticket to view its comments.</p>) : renderCommentThread(selectedTask)}</section></main><aside className="assignment-detail-side">{teacher && <section className="assignment-detail-section"><h3><span>⌄</span> Work status</h3><div className="assignment-detail-students">{selectedTask.students.filter((student)=>String(student.student_id)===String(selectedStudentId)).map((student)=><div key={student.student_id}><span><b>{student.student_name}</b><small>Roll no. {student.roll_number || "—"}</small></span><span className={`assignment-detail-pill ${statusTone(student.status)}`}>{statusName(student.status)}</span>{student.status==="DONE"&&<div className="mt-2 w-full space-y-2"><textarea value={feedbackDrafts[`${selectedTask.id}:${student.student_id}`]||""} onChange={(event)=>setFeedbackDrafts((drafts)=>({...drafts,[`${selectedTask.id}:${student.student_id}`]:event.target.value}))} rows={2} maxLength={4000} placeholder="Review comments (optional)" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"/><button type="button" disabled={saving} className="assignment-detail-review" onClick={()=>submitTaskReview(selectedTask,student)}>{saving?"Saving…":"Review & complete"}</button></div>}{student.status==="COMPLETED"&&!student.feedback&&<div className="mt-2 w-full space-y-2"><textarea value={feedbackDrafts[`${selectedTask.id}:${student.student_id}`]||""} onChange={(event)=>setFeedbackDrafts((drafts)=>({...drafts,[`${selectedTask.id}:${student.student_id}`]:event.target.value}))} rows={2} maxLength={4000} placeholder="Add review comments" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"/><button type="button" disabled={saving||!feedbackDrafts[`${selectedTask.id}:${student.student_id}`]?.trim()} className="assignment-detail-review" onClick={()=>sendFeedback(selectedTask,student)}>Send comments</button></div>}</div>)}{!selectedStudent&&<span className={`assignment-detail-pill ${statusTone(detailStatus)}`}>{statusName(detailStatus)}</span>}</div></section>}{!teacher && <section className="assignment-detail-section"><h3><span>⌄</span> People</h3><dl><dt>Assigned by</dt><dd>{selectedTask.teacher_name || "Your teacher"}</dd><dt>Your status</dt><dd><span className={`assignment-detail-pill ${statusTone(selectedTask.status)}`}>{statusName(selectedTask.status)}</span></dd></dl></section>}<section className="assignment-detail-section"><h3><span>⌄</span> Dates</h3><dl><dt>Assigned</dt><dd>{assignedAt ? new Date(assignedAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}) : "—"}</dd>{detailStatus === "COMPLETED" && <><dt>Completed</dt><dd>{completedAt ? new Date(completedAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}) : "—"}</dd></>}</dl></section>{reviewFeedback && detailStatus === "COMPLETED" && <section className="assignment-detail-section"><h3><span>⌄</span> Teacher review comments</h3><p>{reviewFeedback}</p></section>}</aside></div></section></div>}
  </div>;
}
