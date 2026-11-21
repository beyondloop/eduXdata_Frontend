import { useEffect, useRef, useState } from 'react';
import { getDiscipline, getDisciplineTypes, submitDiscipline, getDisciplineRequests, decideDiscipline } from '../lib/api';
import './SchoolRecords.css';
import StaffDisciplineView from './StaffDisciplineView';
import StudentDisciplineView from './StudentDisciplineView';

export default function DisciplinePage({ role, initialStudentId = '' }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(initialStudentId);
  const [approvalFilter, setApprovalFilter] = useState(initialStudentId);
  const [confirmation, setConfirmation] = useState(null);
  const confirmationDialog = useRef(null);
  useEffect(() => { if (confirmation) confirmationDialog.current?.showModal(); }, [confirmation]);
  const [incidents, setIncidents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const points = types.filter(type => incidents.includes(type.incident)).reduce((sum, type) => sum + type.points, 0);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const load = async () => { const [data, pending] = await Promise.all([getDiscipline(), role === 'Admin' ? getDisciplineRequests() : Promise.resolve([])]); setStudents(data); setRequests(pending); };
  useEffect(() => { let alive = true; Promise.all([getDiscipline(), getDisciplineTypes(), role === 'Admin' ? getDisciplineRequests() : Promise.resolve([])]).then(([data, catalog, pending]) => { if (alive) { setStudents(data); setTypes(catalog); setRequests(pending); } }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [role]);
  const student = students.find(s => s.id === selected) || (role === 'Student' ? students[0] : null);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { const submitted = await submitDiscipline({ studentId: selected, incidents, incidentDate: date, notes }); setConfirmation({ name: student?.display_name || 'Student', count: submitted.length, points: submitted.reduce((sum, entry) => sum + entry.points, 0) }); setMessage('Selected incidents submitted for admin approval. Points will count after approval.'); setNotes(''); setIncidents([]); window.dispatchEvent(new Event('edura-notifications-changed')); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function review(id, approve) {
    setBusy(true); setError(''); setMessage('');
    try { await decideDiscipline(id, approve); setMessage(approve ? 'Incident approved. Student points updated.' : 'Incident rejected. No points added.'); window.dispatchEvent(new Event('edura-notifications-changed')); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (role === 'Student') return <StudentDisciplineView student={student} types={types} loading={loading} error={error} />;
  return <StaffDisciplineView {...{ role, students, student, selected, setSelected, requests, approvalFilter, setApprovalFilter, types, incidents, setIncidents, points, date, setDate, notes, setNotes, query, setQuery, loading, busy, error, message, submit, review, confirmation, setConfirmation, confirmationDialog }} />;
}
