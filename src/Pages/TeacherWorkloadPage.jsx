import { Clock3, Pencil, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createTeacherWorkload, createWeeklyTeacherWorkload, deleteTeacherWorkload, getAdminSubjects, getSections, updateTeacherWorkload } from "../lib/api";

const roles = ["Class teacher", "Teacher", "Subject teacher"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const wholeWeek = "Whole week";
const slots = [10, 11, 12, 14, 15].map((hour) => ({ startTime: `${String(hour).padStart(2, "0")}:00`, endTime: `${String(hour + 1).padStart(2, "0")}:00`, label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"} - ${hour + 1 > 12 ? hour + 1 - 12 : hour + 1}:00 ${hour + 1 >= 12 ? "PM" : "AM"}` }));
const emptyDraft = { teacherName: "", teacherUserId: "", teacherRole: "Teacher", subject: "", classSection: "", dayOfWeek: "", slot: "" };
const field = (record, camel, snake) => record?.[camel] ?? record?.[snake] ?? "";
const timeValue = (value) => String(value || "").slice(0, 5);
const formatDay = (value) => String(value || "").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function ScheduleCell({ assignment, day, slot, slotIndex, onAdd, onEdit, onDelete }) {
  return <article className={`weekly-slot ${assignment ? "assigned" : "unassigned"}`}>{assignment ? <><b>{field(assignment, "subject", "subject")}</b><span>{field(assignment, "teacherName", "teacher_name")}</span><small>{field(assignment, "teacherRole", "teacher_role")} · 1 hour</small><button type="button" className="weekly-slot-remove" onClick={() => onDelete(assignment)} aria-label={`Remove ${field(assignment, "teacherRole", "teacher_role")} assignment for ${day} ${slot.label}`} title="Remove assignment"><X size={13}/></button><button type="button" className="weekly-slot-edit" onClick={() => onEdit(assignment)} aria-label={`Edit ${day} ${slot.label}`}><Pencil size={13}/></button></> : <button type="button" className="weekly-slot-add" onClick={() => onAdd(day, String(slotIndex))} aria-label={`Assign ${day} ${slot.label}`}><Plus size={17}/><span>Assign</span></button>}</article>;
}

export default function TeacherWorkloadPage({ workloads = [], teachers = [], onCreated, onDeleted, error = "" }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [sections, setSections] = useState([]), [subjects, setSubjects] = useState([]), [catalogError, setCatalogError] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all([getSections(), getAdminSubjects()]).then(([sections, subjects]) => { if (live) { setSections(sections); setSubjects(subjects); } }).catch((failure) => { if (live) setCatalogError(failure.message); });
    return () => { live = false; };
  }, []);
  const classSections = [...new Map([...sections.map((row) => ({ className: String(row.class_name).replace(/^class\s*/i, ""), sectionName: row.name })), ...workloads.map((row) => ({ className: field(row, "className", "class_name"), sectionName: field(row, "sectionName", "section_name") }))].map((row) => [`${row.className}-${row.sectionName}`, { ...row, value: `${row.className}-${row.sectionName}`, label: `Class ${row.className} - ${row.sectionName}` }])).values()];
  const currentClass = classSections.some((row) => row.value === selectedClass) ? selectedClass : classSections[0]?.value || "";
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value, ...(key === "teacherName" ? { teacherUserId: teachers.find((teacher) => teacher.name === value)?.userId || "" } : {}) }));
  const close = (force = false) => { if (force || !saving) { setOpen(false); setEditingId(null); setFormError(""); setDraft(emptyDraft); } };
  const openCreate = (dayOfWeek = "", slot = "") => { setEditingId(null); setFormError(""); setDraft({ ...emptyDraft, classSection: currentClass, dayOfWeek, slot }); setOpen(true); };
  const edit = (item) => {
    const slotIndex = slots.findIndex((slot) => slot.startTime === timeValue(field(item, "startTime", "start_time")));
    setDraft({ teacherName: field(item, "teacherName", "teacher_name"), teacherUserId: field(item, "teacherUserId", "teacher_user_id"), teacherRole: field(item, "teacherRole", "teacher_role"), subject: field(item, "subject", "subject"), classSection: `${field(item, "className", "class_name")}-${field(item, "sectionName", "section_name")}`, dayOfWeek: formatDay(field(item, "dayOfWeek", "day_of_week")), slot: slotIndex >= 0 ? String(slotIndex) : "" });
    setEditingId(field(item, "id", "id")); setFormError(""); setOpen(true);
  };
  const remove = async (item) => {
    const id = field(item, "id", "id");
    const role = field(item, "teacherRole", "teacher_role");
    const teacherName = field(item, "teacherName", "teacher_name");
    if (!window.confirm(`Remove ${teacherName}'s ${role} assignment? This will also remove it from the teacher and student portals.`)) return;
    setSaving(true); setFormError("");
    try { await deleteTeacherWorkload(id); onDeleted(id); }
    catch (requestError) { setFormError(requestError.message || "Unable to remove this workload."); }
    finally { setSaving(false); }
  };
  const assign = async (event) => {
    event.preventDefault();
    if (!draft.teacherName || !draft.teacherUserId || !draft.subject || !draft.classSection || !draft.dayOfWeek || draft.slot === "") { setFormError("Please complete every field before assigning the workload."); return; }
    const section = classSections.find((item) => item.value === draft.classSection); const slot = slots[Number(draft.slot)];
    const selectedDays = draft.dayOfWeek === wholeWeek ? days : [draft.dayOfWeek];
    const duplicateAssignment = workloads.find((item) => String(field(item, "id", "id")) !== String(editingId || "") && field(item, "teacherUserId", "teacher_user_id") === draft.teacherUserId && formatDay(field(item, "dayOfWeek", "day_of_week")) === draft.dayOfWeek && timeValue(field(item, "startTime", "start_time")) === slot.startTime);
    if (duplicateAssignment) { const message = `${draft.teacherName} is already assigned to Class ${field(duplicateAssignment, "className", "class_name")}-${field(duplicateAssignment, "sectionName", "section_name")} on ${draft.dayOfWeek} at ${slot.label}.`; setFormError(message); window.alert(message); return; }
    const subjectAlreadyAssigned = workloads.find((item) => String(field(item, "id", "id")) !== String(editingId || "") && field(item, "className", "class_name") === section.className && field(item, "sectionName", "section_name") === section.sectionName && field(item, "subject", "subject").toLowerCase() === draft.subject.toLowerCase() && selectedDays.includes(formatDay(field(item, "dayOfWeek", "day_of_week"))));
    if (subjectAlreadyAssigned) { const assignedDay = formatDay(field(subjectAlreadyAssigned, "dayOfWeek", "day_of_week")); const message = `${draft.subject} is already assigned to Class ${section.className}-${section.sectionName} on ${assignedDay}. Choose another day.`; setFormError(message); window.alert(message); return; }
    const classSlotAlreadyAssigned = workloads.find((item) => String(field(item, "id", "id")) !== String(editingId || "") && field(item, "className", "class_name") === section.className && field(item, "sectionName", "section_name") === section.sectionName && selectedDays.includes(formatDay(field(item, "dayOfWeek", "day_of_week"))) && timeValue(field(item, "startTime", "start_time")) === slot.startTime);
    if (classSlotAlreadyAssigned) { const assignedDay = formatDay(field(classSlotAlreadyAssigned, "dayOfWeek", "day_of_week")); const message = `Class ${section.className}-${section.sectionName} already has a class on ${assignedDay} at ${slot.label}. Choose another time.`; setFormError(message); window.alert(message); return; }
    setSaving(true); setFormError("");
    try { const payload = { teacherName: draft.teacherName, teacherUserId: draft.teacherUserId, teacherRole: draft.teacherRole, subject: draft.subject, className: section.className, sectionName: section.sectionName, dayOfWeek: draft.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime, durationMinutes: 60 }; const saved = editingId ? await updateTeacherWorkload(editingId, payload) : draft.dayOfWeek === wholeWeek ? await createWeeklyTeacherWorkload(payload) : await createTeacherWorkload(payload); (Array.isArray(saved) ? saved : [saved]).forEach((item) => onCreated(item, editingId)); setSelectedClass(draft.classSection); close(true); }
    catch (requestError) { const message = requestError.message || "Unable to save this workload."; setFormError(message); if (message.toLowerCase().includes("already assigned") || message.toLowerCase().includes("already has")) window.alert(message); } finally { setSaving(false); }
  };
  return <div className="module-page teacher-workload-page">
    <div className="module-title"><div className="module-icon"><Clock3 size={24}/></div><div><p className="eyebrow">School management</p><h1>Teacher Workload</h1><p className="subtle">Assign teachers to one-hour class slots between 10 AM and 4 PM.</p></div><button className="primary-btn module-action" disabled={!classSections.length} onClick={() => openCreate()}><Plus size={15}/> Add new</button></div>
    <section className="workload-board panel"><div className="workload-board-head"><div><p className="eyebrow">WEEKLY CLASS SCHEDULE</p><h2>Assignment board</h2><p>See every assigned and open period at a glance. Recess is fixed from 1 PM to 2 PM.</p></div><div className="workload-board-filters"><label><span>Class / section</span><select value={currentClass} onChange={(event) => setSelectedClass(event.target.value)}>{classSections.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label></div></div><div className="weekly-schedule"><div className="weekly-head weekly-day-head">Day</div>{slots.slice(0, 3).map((slot) => <div className="weekly-head" key={slot.startTime}>{slot.label}</div>)}<div className="weekly-recess-head">Recess<br/><small>1 PM - 2 PM</small></div>{slots.slice(3).map((slot) => <div className="weekly-head" key={slot.startTime}>{slot.label}</div>)}{days.map((day) => <div className="weekly-row" key={day}><div className="weekly-day">{day}</div>{slots.slice(0, 3).map((slot, index) => <ScheduleCell key={slot.startTime} day={day} slot={slot} slotIndex={index} assignment={workloads.find((item) => `${field(item, "className", "class_name")}-${field(item, "sectionName", "section_name")}` === currentClass && formatDay(field(item, "dayOfWeek", "day_of_week")) === day && timeValue(field(item, "startTime", "start_time")) === slot.startTime)} onAdd={openCreate} onEdit={edit} onDelete={remove}/>) }<div className="weekly-recess">Break</div>{slots.slice(3).map((slot, index) => <ScheduleCell key={slot.startTime} day={day} slot={slot} slotIndex={index + 3} assignment={workloads.find((item) => `${field(item, "className", "class_name")}-${field(item, "sectionName", "section_name")}` === currentClass && formatDay(field(item, "dayOfWeek", "day_of_week")) === day && timeValue(field(item, "startTime", "start_time")) === slot.startTime)} onAdd={openCreate} onEdit={edit} onDelete={remove}/>)}</div>)}</div></section>
    {(error || catalogError) && <p className="auth-error" role="alert">{error || catalogError}</p>}{!classSections.length && <p className="subtle">No class sections are configured in the database.</p>}
    {open && <div className="workload-overlay" role="dialog" aria-modal="true"><form className="workload-modal" onSubmit={assign}><button type="button" className="workload-close" onClick={close} aria-label="Close"><X size={18}/></button><p className="eyebrow">TEACHER ASSIGNMENT</p><h2>{editingId ? "Update teacher workload" : "Add teacher workload"}</h2><p className="subtle">Create a one-hour teaching assignment for a class section.</p><div className="workload-form-grid"><label><span>Teacher name</span><select value={draft.teacherName} onChange={(event) => update("teacherName", event.target.value)} autoFocus><option value="">{teachers.length ? "Select teacher" : "No teachers available"}</option>{teachers.map((teacher) => <option value={teacher.name} key={teacher.teacherId || teacher.userId || teacher.name}>{teacher.name}</option>)}</select></label><label><span>Teacher role</span><select value={draft.teacherRole} onChange={(event) => update("teacherRole", event.target.value)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label><label><span>Subject</span><input list="workload-subjects" value={draft.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Enter or choose subject"/><datalist id="workload-subjects">{subjects.map((subject) => <option key={subject} value={subject}/>)}</datalist></label><label><span>Class / section</span><select value={draft.classSection} onChange={(event) => update("classSection", event.target.value)}><option value="">Select class and section</option>{classSections.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label><span>Day</span><select value={draft.dayOfWeek} onChange={(event) => update("dayOfWeek", event.target.value)}><option value="">Select day</option>{!editingId && <option value={wholeWeek}>Whole week (Mon-Sat)</option>}{days.map((day) => <option key={day}>{day}</option>)}</select></label><label className="workload-slot-field"><span>Time slot - 1 hour</span><select value={draft.slot} onChange={(event) => update("slot", event.target.value)}><option value="">Select class slot</option>{slots.map((slot, index) => <option value={index} key={slot.startTime}>{slot.label}</option>)}</select><small>School hours are 10 AM - 4 PM. Lunch is 1 PM - 2 PM.</small></label></div>{formError && <p className="auth-error">{formError}</p>}<div className="workload-modal-actions"><button type="button" onClick={close}>Cancel</button><button className="primary-btn" disabled={saving || !teachers.length}>{saving ? "Saving..." : editingId ? "Update workload" : "Assign workload"}</button></div></form></div>}
  </div>;
}
