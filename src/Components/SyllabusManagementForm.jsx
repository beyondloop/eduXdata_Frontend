import { useState } from 'react';
import { createSyllabus, addSyllabusTopic, updateSyllabusTopic, assignSyllabusTeacher, publishClassSyllabusPdf } from '../lib/api';

export default function SyllabusManagementForm({ plans, workloads, onSaved }) {
  const [className,setClass] = useState('');
  const [section,setSection] = useState('');
  const [subject,setSubject] = useState('');
  const [teacher,setTeacher] = useState('');
  const [year,setYear] = useState(new Date().getFullYear()-(new Date().getMonth()<3?1:0));
  const [period,setPeriod] = useState('TERM_1');
  const [month,setMonth] = useState('');
  const [planId,setPlanId] = useState('');
  const [topicId,setTopicId] = useState('');
  const [title,setTitle] = useState('');
  const [deadline,setDeadline] = useState('');
  const [deadlineTime,setDeadlineTime] = useState('23:59');
  const [file,setFile] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const available = workloads.filter(w=>w.class_name===className && w.section_name===section && w.subject===subject);
  const teachers = [...new Map(available.map(w=>[w.teacher_user_id,w])).values()];
  const matching = plans.filter(p=>p.class_name===className && p.section_name===section && p.subject===subject && p.year_start===`${year}-04-01` && p.period===period);
  const plan = matching.find(p=>p.id===planId);
  const options = (field,rows) => [...new Set(rows.map(w=>w[field]))].sort();
  function reset() {setPlanId('');setTopicId('');setTitle('');setDeadline('');setFile(null);setMessage('');}
  async function act(action,text) {setBusy(true);setError('');setMessage('');try {await action();await onSaved();setMessage(text);}catch(e){setError(e.message);}finally{setBusy(false);}}
  function topicEntry() {if(!title.trim() || !month || !deadline.startsWith(month)) throw new Error('Enter a topic and choose its due date within the assigned month.');return {title:title.trim(),deadline,deadlineTime};}
  return <section className="asd-panel"><h2>Manage syllabus topics</h2><p>Choose the academic year, teaching assignment and term. Select an existing plan to add or update topics. Publish a complete class PDF independently for the selected academic year and term.</p>{error && <p className="asd-error" role="alert">{error}</p>}{message && <p className="asd-success" role="status">{message}</p>}
    <fieldset disabled={busy}><div className="asd-filters"><label>Academic year<input required type="number" min="2000" max="2100" value={year} onChange={e=>{setYear(e.target.value);reset();}}/></label><label>Class<select value={className} onChange={e=>{setClass(e.target.value);setSection('');setSubject('');setTeacher('');reset();}}><option value="">Select class</option>{Array.from({length:10},(_,i)=>String(i+1)).concat(options('class_name',workloads).filter(c=>!Array.from({length:10},(_,i)=>String(i+1)).includes(c))).map(c=><option key={c}>{c}</option>)}</select></label><label>Section<select value={section} onChange={e=>{setSection(e.target.value);setSubject('');setTeacher('');reset();}}><option value="">Select section</option>{options('section_name',workloads.filter(w=>w.class_name===className)).map(s=><option key={s}>{s}</option>)}</select></label><label>Subject<select value={subject} onChange={e=>{setSubject(e.target.value);setTeacher('');reset();}}><option value="">Select subject</option>{options('subject',workloads.filter(w=>w.class_name===className && w.section_name===section)).map(s=><option key={s}>{s}</option>)}</select></label><label>Term<select value={period} onChange={e=>{setPeriod(e.target.value);reset();}}>{[['TERM_1','Term 1'],['TERM_2','Term 2'],['FINAL','Final'],['FULL_YEAR','Full year']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Teacher<select value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="">Select teacher</option>{teachers.map(w=><option key={w.teacher_user_id} value={w.teacher_user_id}>{w.teacher_name}</option>)}</select></label></div>
    <label>Plan<select value={planId} onChange={e=>{setPlanId(e.target.value);setTopicId('');setTitle('');setDeadline('');setFile(null);setTeacher(matching.find(p=>p.id===e.target.value)?.assigned_teacher || '');}}><option value="">Create a new plan</option>{matching.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    {plan && <><label>Topic<select value={topicId} onChange={e=>{setTopicId(e.target.value);const t=plan.topics.find(t=>t.id===e.target.value);setTitle(t?.title || '');setDeadline(String(t?.deadline || '').slice(0,10));setDeadlineTime(String(t?.deadline_time || '23:59').slice(0,5));setMonth(String(t?.deadline || '').slice(0,7));}}><option value="">Add a new topic</option>{plan.topics.map(t=><option disabled={Boolean(t.completed_at)} key={t.id} value={t.id}>{t.title}{t.completed_at?' (completed; locked)':''}</option>)}</select></label><button disabled={!teacher} onClick={()=>act(()=>assignSyllabusTeacher(plan.id,teacher),'Teacher assignment saved.')}>Save teacher assignment</button></>}
    <form onSubmit={e=>{e.preventDefault();act(async()=>{const topic=topicEntry();if(plan){if(topicId) await updateSyllabusTopic(topicId,topic);else await addSyllabusTopic(plan.id,topic);}else{if(!teacher)throw new Error('Select the concerned teacher.');await createSyllabus({title:`${subject} ${year}-${Number(year)+1}`,className,sectionName:section,yearStart:`${year}-04-01`,period,subjects:[{subject,teacherUserId:teacher,topics:[topic]}]},file);}setTopicId('');setTitle('');},'Syllabus topic saved.');}}><div className="asd-filters"><label>Month<input required type="month" min={`${year}-04`} max={`${Number(year)+1}-03`} value={month} onChange={e=>{setMonth(e.target.value);setDeadline('');}}/></label><label>Topic<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Due date<input required type="date" value={deadline} min={month?`${month}-01`:undefined} max={month?`${month}-${new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate()}`:undefined} onChange={e=>setDeadline(e.target.value)}/></label><label>Due time (IST)<input required type="time" value={deadlineTime} onChange={e=>setDeadlineTime(e.target.value)}/></label></div><label>Complete class syllabus PDF (up to 5 MB)<input type="file" accept=".pdf" onChange={e=>setFile(e.target.files[0] || null)}/></label><button className="asd-primary" disabled={!subject || busy}>Save topic</button></form>
    <button disabled={!file || !className || busy} onClick={()=>{if(window.confirm('Publish this PDF for every teacher and student in this class? The PDF for this year and term will be replaced.'))act(()=>publishClassSyllabusPdf(className,year+'-'+String((Number(year)+1)%100).padStart(2,'0'),period,file),'Class syllabus PDF published.');}}>Publish class PDF</button>
    </fieldset>
  </section>;
}
