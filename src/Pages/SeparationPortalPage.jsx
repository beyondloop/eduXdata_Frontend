import { useEffect, useState } from "react";
import { UserRoundMinus } from "lucide-react";
import { addSeparationTemplate, completeSeparation, createSeparation, getSeparationTemplates, getSeparations, getStudents, getTeachers, updateSeparationItem } from "../lib/api";

export default function SeparationPortalPage() {
  const [requests, setRequests] = useState([]), [templates, setTemplates] = useState([]), [students, setStudents] = useState([]), [teachers, setTeachers] = useState([]);
  const [type, setType] = useState("STUDENT"), [personId, setPersonId] = useState(""), [lastDay, setLastDay] = useState(""), [reason, setReason] = useState(""), [checkLabel, setCheckLabel] = useState("");
  const [error, setError] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all([getSeparations(), getSeparationTemplates(), getStudents(), getTeachers()]).then(([requests, templates, students, teachers]) => {
      if (live) { setRequests(requests); setTemplates(templates); setStudents(students); setTeachers(teachers.filter(row => row.active)); setError(""); }
    }).catch(failure => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [revision]);
  const run = async action => {
    setBusy(true); setError("");
    try { await action(); setRevision(value => value + 1); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const start = event => { event.preventDefault(); run(async () => { await createSeparation({ personType: type, personId, lastDay, reason }); setPersonId(""); setLastDay(""); setReason(""); }); };
  const people = type === "STUDENT" ? students : teachers;
  return <div className="module-page separation-page">
    <div className="module-title"><div className="module-icon"><UserRoundMinus size={24}/></div><div><p className="eyebrow">Exit management</p><h1>Separation Portal</h1><p className="subtle">Save requests and track clearance checks for each school member.</p></div></div>
    {error && <p className="auth-error" role="alert">{error}</p>}{loading && <p role="status">Loading separation records…</p>}
    <section className="panel"><h2>Start a separation request</h2><form className="admin-record-controls" onSubmit={start}>
      <label>Type<select value={type} onChange={event => { setType(event.target.value); setPersonId(""); }}><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option></select></label>
      <label>School member<select required value={personId} onChange={event => setPersonId(event.target.value)}><option value="">Select person</option>{people.map(person => <option key={person.id} value={person.id}>{person.display_name} · {person.user_id}</option>)}</select></label>
      <label>Last day<input required type="date" value={lastDay} onChange={event => setLastDay(event.target.value)}/></label>
      <label>Reason<input required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)}/></label><button className="primary-btn" disabled={busy || loading || !templates.some(row => row.person_type === type)}>Save request</button>
    </form><details><summary>Clearance checklist configuration</summary><ul>{templates.filter(row => row.person_type === type).map(row => <li key={row.id}>{row.label}</li>)}</ul><form className="admin-record-controls" onSubmit={event => { event.preventDefault(); run(async () => { await addSeparationTemplate({ personType: type, label: checkLabel }); setCheckLabel(""); }); }}><label>New check for {type.toLowerCase()} requests<input required maxLength={500} value={checkLabel} onChange={event => setCheckLabel(event.target.value)}/></label><button className="filter-btn" disabled={busy}>Add clearance check</button></form></details></section>
    <section className="panel mt-5"><h2>Saved separation requests</h2>{!loading && !requests.length && <p>No separation requests recorded.</p>}{requests.map(request => <article className="admin-clearance-request" key={request.id}>
      <div className="panel-head"><div><h3>{request.person_name} · {request.user_id}</h3><p>{request.person_type} · Last day: {request.requested_last_day}</p><p>{request.reason}</p></div><span className="leave-status">{request.status.replaceAll("_", " ")}</span></div>
      <div className="admin-clearance-checks">{request.checklist.map(item => <label key={item.id}><input type="checkbox" checked={item.completed} disabled={busy || request.status === "COMPLETED"} onChange={event => run(() => updateSeparationItem(request.id, item.id, event.target.checked))}/><span>{item.label}</span></label>)}</div>
      {request.status === "IN_PROGRESS" ? <button className="primary-btn" disabled={busy || !request.checklist.every(item => item.completed)} onClick={() => run(() => completeSeparation(request.id))}>Complete clearance</button> : <p>Completed {new Date(request.completed_at).toLocaleString("en-IN")}</p>}
    </article>)}</section>
  </div>;
}
