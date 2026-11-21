import { createElement, useEffect, useRef, useState } from 'react';
import { getAdjustments, getAvailableAdjustmentTeachers, getTeacherWorkloads, requestAdjustment, decideAdjustment } from '../lib/api';
import { ArrowRight, ArrowLeftRight, CalendarDays, Clock3, CheckCircle2, XCircle, Send, ShieldCheck, Search, BookOpen, Info } from 'lucide-react';
import './TeacherAdjustmentsPage.css';

export default function TeacherAdjustmentsPage({ role, user, onChanged }) {
  const feedbackRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [availabilityLoading,setAvailabilityLoading]=useState(false);
  const [availabilityPopup,setAvailabilityPopup]=useState('');
  const [teachers, setTeachers] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [workloadId, setWorkloadId] = useState('');
  const [replacementUserId, setReplacement] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  useEffect(() => { let alive = true; Promise.all([getAdjustments(), getTeacherWorkloads()]).then(([r,w]) => { if (alive) { setRequests(r); setWorkloads(w); } }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  useEffect(()=>{
    if(role!=='Teacher'||!workloadId){setTeachers([]);return;}
    let live=true;setError('');setTeachers([]);setReplacement('');setAvailabilityLoading(true);setAvailabilityPopup('');
    getAvailableAdjustmentTeachers(workloadId).then(rows=>{
      if(!live)return;setTeachers(rows);
      setAvailabilityPopup(rows.length ? rows.length+' available '+(rows.length===1?'teacher is':'teachers are')+' shown for this class period. Only teachers assigned to this subject who pass time-slot and class-teacher checks are listed. Availability is checked again on submission and approval.' : 'No replacement teachers are available for this class period. Choose another period or try again later.');
    }).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setAvailabilityLoading(false);});
    return ()=>{live=false;};
  },[role,workloadId]);
  useEffect(() => {
    if (!message && !error) return;
    const frame = window.requestAnimationFrame(() => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      feedbackRef.current?.scrollIntoView({behavior, block:'start', inline:'nearest'});
    });
    return () => window.cancelAnimationFrame(frame);
  }, [message, error]);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (busy || document.visibilityState !== 'visible') return;
      getAdjustments().then(rows => {if(live)setRequests(rows);}).catch(e=>{if(live)setError(e.message);});
    };
    const timer=window.setInterval(refresh,15000);
    window.addEventListener('focus',refresh);
    return ()=>{live=false;window.clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[busy]);
  async function act(action, success) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); setWorkloadId('');setReplacement('');setReason(''); window.dispatchEvent(new Event("edura-notifications-changed")); window.dispatchEvent(new Event("teacher-workloads-updated")); setMessage(success); try {const [rows,slots]=await Promise.all([getAdjustments(),getTeacherWorkloads()]);setRequests(rows);setWorkloads(slots);onChanged?.();}catch(refreshError){setError('The change was saved, but the list could not refresh: '+refreshError.message);} }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const requestableWorkloads = workloads.filter(w => w.status === 'ACTIVE' && !requests.some(r=>r.workload_id===w.id && r.status==='PENDING'));
  const selectedWorkload = workloads.find(w => w.id === workloadId);
  const visible = requests.filter(r => (filter === 'ALL' || r.status === filter) && `${r.subject} ${r.class_name} ${r.section_name} ${r.requester_name} ${r.replacement_name}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="adjustments-page">
    <header className="ta-hero"><div><span className="ta-eyebrow"><ArrowLeftRight size={15}/> FACULTY COORDINATION</span><h1>Teacher adjustments</h1><p>{role === 'Admin' ? 'Review workload transfers and keep teaching assignments running smoothly.' : 'Coordinate a workload transfer with a colleague, all in one place.'}</p><span className="ta-hero-note"><ShieldCheck size={14}/> Every adjustment requires admin approval</span></div><div className="ta-hero-art" aria-hidden="true"><ArrowLeftRight size={44}/></div></header>
    {error && <p ref={error ? feedbackRef : undefined} role="alert" className="ta-feedback error"><Info size={18}/>{error}</p>}{message && <p ref={!error ? feedbackRef : undefined} role="status" className="ta-feedback success"><CheckCircle2 size={18}/>{message}</p>}
    {loading ? <div className="ta-empty" role="status">Loading adjustment requests…</div> : <>
      <div className="ta-stats">{[['PENDING', 'Awaiting approval', Clock3], ['APPROVED', 'Approved adjustments', CheckCircle2], ['REJECTED', 'Rejected requests', XCircle]].map(([status, label, Icon]) => <article key={status}><span className={`ta-stat-icon ${status.toLowerCase()}`}>{createElement(Icon, { size: 21 })}</span><div><span>{label}</span><strong>{requests.filter(r => r.status === status).length}</strong></div></article>)}</div>
      {role === 'Teacher' && <div className="ta-compose"><form className="ta-panel ta-form" onSubmit={e => { e.preventDefault(); act(() => requestAdjustment({ workloadId, replacementUserId, reason }), 'Request sent for admin approval.'); }}><div className="ta-section-title"><span className="ta-title-icon"><Send size={19}/></span><div><h2>Request an adjustment</h2><p>Select a workload and the colleague who will take it over.</p></div></div><fieldset disabled={busy}><div className="ta-form-grid"><label>Your workload<select required value={workloadId} onChange={e => {setWorkloadId(e.target.value);setReplacement('');setError('');}}><option value="">Select class and period</option>{requestableWorkloads.map(w => <option key={w.id} value={w.id}>{w.day_of_week} {String(w.start_time).slice(0,5)} · {w.subject} · {w.class_name}-{w.section_name}</option>)}</select></label><label>Replacement teacher<select required disabled={!workloadId || availabilityLoading || !teachers.length} value={replacementUserId} onChange={e => setReplacement(e.target.value)}><option value="">{availabilityLoading ? 'Checking availability...' : !workloadId ? 'Select a class period first' : teachers.length ? 'Select an available teacher' : 'No teachers available'}</option>{teachers.filter(t => t.user_id !== (user?.userId || user?.userCode)).map(t => <option key={t.user_id} value={t.user_id}>{t.display_name} ({t.user_id})</option>)}</select></label></div>{selectedWorkload && <div className="ta-slot"><BookOpen size={16}/><b>{selectedWorkload.subject}</b><span>Class {selectedWorkload.class_name}-{selectedWorkload.section_name}</span><span>{selectedWorkload.day_of_week} · {String(selectedWorkload.start_time).slice(0,5)}</span></div>}<label className="ta-reason-label">Reason for adjustment<textarea required rows={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Share a brief reason for the workload transfer…"/></label><div className="ta-form-footer"><small>{reason.length}/2000 characters</small><button className="ta-primary" disabled={busy || availabilityLoading || !requestableWorkloads.length || !workloadId || !replacementUserId || !reason.trim()}><Send size={15}/>{busy ? 'Submitting…' : 'Send for approval'}</button></div></fieldset>{!requestableWorkloads.length && <p className="ta-form-note">No active class periods are available to request. Periods awaiting approval are excluded.</p>}</form><aside className="ta-panel ta-how"><span className="ta-eyebrow">HOW IT WORKS</span><h2>A clear approval process</h2><ol><li><span>1</span><div><b>Choose your workload</b><p>Select the recurring class and period to transfer.</p></div></li><li><span>2</span><div><b>Select a colleague</b><p>Choose a specific teacher and explain the reason.</p></div></li><li><span>3</span><div><b>Admin reviews the request</b><p>The assignment changes only after approval and schedule checks.</p></div></li></ol><div className="ta-policy"><ShieldCheck size={18}/><p>Your current assignment stays in place while the request is pending.</p></div></aside></div>}
      <section className="ta-panel ta-requests"><div className="ta-list-heading"><div><span className="ta-eyebrow">ADJUSTMENT ACTIVITY</span><h2>{role === 'Admin' ? 'Approval requests' : 'Your requests & replacement assignments'}</h2></div><label className="ta-search"><Search size={16}/><input aria-label="Search adjustment requests" placeholder="Search teacher, subject or class" value={query} onChange={e => setQuery(e.target.value)}/></label></div><div className="ta-tabs" role="group" aria-label="Filter adjustment requests">{[['ALL', 'All requests'], ['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{value === 'ALL' ? requests.length : requests.filter(r => r.status === value).length}</span></button>)}</div>
        {visible.length ? <div className="ta-request-grid">{visible.map(r => <article className="ta-request" key={r.id}><div className="ta-request-title"><span className="ta-subject-icon"><BookOpen size={19}/></span><div><h3>{r.subject}</h3><p>Class {r.class_name}-{r.section_name}</p></div><span className={`ta-status ${r.status.toLowerCase()}`}>{r.status === 'PENDING' ? 'Pending approval' : r.status === 'APPROVED' ? 'Approved' : 'Rejected'}</span></div><div className="ta-schedule"><CalendarDays size={14}/>{r.day_of_week}<span>·</span><Clock3 size={14}/>{String(r.start_time).slice(0,5)}</div><div className="ta-transfer"><div><small>REQUESTED BY</small><b>{r.requester_name}</b></div><ArrowRight size={18} aria-hidden="true"/><div><small>REPLACEMENT</small><b>{r.replacement_name}</b></div></div><div className="ta-request-reason"><small>REASON</small><p>{r.reason}</p></div><footer>{r.created_at && <time dateTime={r.created_at}>Submitted {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time>}{role === 'Admin' && r.status === 'PENDING' ? <div className="ta-decisions"><button className="ta-approve" disabled={busy} onClick={() => act(() => decideAdjustment(r.id, true), 'Adjustment approved and workload updated.')}><CheckCircle2 size={14}/>Approve</button><button className="ta-secondary" disabled={busy} onClick={() => act(() => decideAdjustment(r.id, false), 'Adjustment rejected.')}><XCircle size={14}/>Reject</button></div> : <span>{r.reviewed_by ? `Reviewed by ${r.reviewed_by}` : 'Awaiting admin review'}</span>}</footer></article>)}</div> : <div className="ta-empty"><ArrowLeftRight size={32}/><h3>{requests.length ? 'No matching requests' : 'No adjustment requests yet'}</h3><p>{requests.length ? 'Try another search or status filter.' : role === 'Admin' ? 'New teacher requests will appear here for review.' : 'Submit your first request using the form above.'}</p></div>}
      </section>
    </>}
    {availabilityPopup && <div className="ta-popup-overlay"><section className="ta-panel ta-availability-popup" role="dialog" aria-modal="true" aria-labelledby="availability-title" onKeyDown={e=>{if(e.key==='Escape')setAvailabilityPopup('');}}><h2 id="availability-title">Replacement teacher availability</h2><p>{availabilityPopup}</p><button autoFocus type="button" className="ta-primary" onClick={()=>setAvailabilityPopup('')}>OK</button></section></div>}
  </div>;
}
