import { useState } from 'react';
import { downloadSyllabusTemplate, previewSyllabusExcel, confirmSyllabusExcel } from '../lib/api';

export default function SyllabusExcelImport({ onImported, autoImport = false }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [period, setPeriod] = useState('FULL_YEAR');
  const [page, setPage] = useState(1);
  async function download() {
    setBusy(true); setError('');
    try {
      const url = URL.createObjectURL(await downloadSyllabusTemplate());
      const link = document.createElement('a'); link.href = url; link.download = 'syllabus-template.xlsx'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function upload(file) {
    setPreview(null); setPage(1); setError(''); setMessage('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5 * 1024 * 1024) { setError('Choose a .xlsx file up to 5 MB.'); return; }
    setBusy(true);
    try {
      const validation = await previewSyllabusExcel(file, period);
      if (autoImport && validation.previewId && validation.errors.length === 0) {
        const result = await confirmSyllabusExcel(validation.previewId);
        setMessage(`Imported ${result.topics} topics across ${result.plans} plans.`);
        await onImported(result);
      } else {
        setPreview(validation);
      }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError('');
    try {
      const result = await confirmSyllabusExcel(preview.previewId);
      setPreview(null); setMessage(`Imported ${result.topics} topics across ${result.plans} plans.`);
      await onImported(result);
    } catch (e) { setError(e.message); setPreview(null); } finally { setBusy(false); }
  }
  return <section className="syllabus-create"><h2>Class-wise Excel import</h2>
    <label>Term<select disabled={busy} value={period} onChange={e => { setPeriod(e.target.value); setPreview(null); }}><option value="FULL_YEAR">Full year</option><option value="TERM_1">Term 1</option><option value="TERM_2">Term 2</option><option value="FINAL">Final</option></select></label>
    <p>Download the template and use the dropdowns for the current academic year, section, subject, teacher employee ID, teacher name, priority and Term. Subject and teacher options follow each class's active workloads. Enter a matching assignment and your topic details, then upload to assign topics.</p>
    <p>StartDate and DueDate are date cells. In Excel for the web, double-click a date cell to select from its calendar. If your Excel version has no date picker, enter YYYY-MM-DD.</p>
    <button className="syllabus-secondary" disabled={busy} onClick={download}>Download Excel template</button>
    {autoImport && <p>Valid workbooks are imported automatically and their topics appear in Assign topics. If there are errors, correct the workbook and upload again.</p>}
    <label className="syllabus-upload">Upload workbook<input type="file" accept=".xlsx" disabled={busy} onChange={e => { upload(e.target.files[0]); e.target.value = ''; }} /></label>
    {busy && <p role="status">Processing workbook...</p>}{error && <p role="alert" className="syllabus-form-error">{error}</p>}{message && <p role="status">{message}</p>}
    {preview && <><h3>Preview: {preview.rows.length} valid topics  /  {preview.errors.length} errors</h3>
      {preview.errors.length > 0 && <div role="alert"><p>Correct these rows and upload again. Nothing has been imported.</p><ul>{preview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
      <div className="syllabus-table-scroll"><table><thead><tr>{['Sheet / row', 'Year', 'Term', 'Section', 'Code', 'Subject', 'Chapter', 'Topic', 'Description', 'Employee', 'Teacher name', 'Start', 'Due', 'Priority'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{preview.rows.slice((page-1)*25,page*25).map(r => <tr key={`${r.sheet}-${r.row}`}>{[`${r.sheet} / ${r.row}`, r.academicYear, r.term || period, r.section, r.subjectCode, r.subjectName, r.chapter, r.topic, r.topicDescription, r.teacherEmployeeId, r.teacherName, r.startDate, r.dueDate, r.priority].map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody></table></div>
      <div className="asd-actions"><button disabled={page===1 || busy} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page} of {Math.max(1,Math.ceil(preview.rows.length/25))}</span><button disabled={page*25>=preview.rows.length || busy} onClick={()=>setPage(page+1)}>Next</button></div>
      <p>Preview expires in 30 minutes. Confirmation imports all valid rows together.</p>
      <button className="syllabus-primary" disabled={busy || !preview.previewId || preview.errors.length > 0} onClick={confirm}>Confirm import</button>{' '}
      <button className="syllabus-secondary" disabled={busy} onClick={() => setPreview(null)}>Cancel preview</button>
    </>}
  </section>;
}

export function SyllabusProgressSummary({ plans }) {
  const classes = new Map(), teachers = new Map();
  function add(map, key, topic) {
    const row = map.get(key) || { total: 0, completed: 0, late: 0, points: 0 };
    row.total++; if (topic.completed_at) row.completed++; if (topic.completion_status === 'LATE') row.late++;
    row.points += Number(topic.points || 0); map.set(key, row);
  }
  for (const plan of plans) for (const topic of plan.topics) {
    add(classes, `${plan.academic_year || plan.year_start || 'General'}  /  Class ${plan.class_name} / ${plan.section_name}`, topic);
    add(teachers, topic.completed_by ? `${topic.completed_by_name} (${topic.completed_by})` : plan.assigned_teacher ? `${plan.teacher_names || plan.assigned_teacher} (${plan.assigned_teacher})` : plan.teacher_names || 'Unassigned', topic);
  }
  return <section className="syllabus-list"><h2>Progress & points dashboard</h2>{[['Class-wise', classes], ['Teacher-wise', teachers]].map(([label, rows]) => <div key={label}><h3>{label}</h3><div className="syllabus-table-scroll"><table><thead><tr><th>{label}</th><th>Completed</th><th>Progress</th><th>Late</th><th>Points</th></tr></thead><tbody>{[...rows].map(([key, row]) => <tr key={key}><td>{key}</td><td>{row.completed}/{row.total}</td><td>{Math.round(row.completed / row.total * 100)}%</td><td>{row.late}</td><td>{row.points}</td></tr>)}</tbody></table></div></div>)}</section>;
}
