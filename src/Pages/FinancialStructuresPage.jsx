import { useEffect, useState } from "react";
import { BriefcaseBusiness, GraduationCap, Pencil, Plus, Save, X } from "lucide-react";
import { getClasses, getStudentFeeStructures, getTeacherSalaryStructures, saveStudentFeeStructure, saveTeacherSalaryStructure } from "../lib/api";
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const feeFields = [
  { key: "readmissionFee", column: "readmission_fee", label: "Admission / Readmission Fee" },
  { key: "academicFee", column: "academic_fee", label: "Tuition Fee" },
  { key: "developmentFee", column: "development_fee", label: "Development Fee" },
  { key: "examinationFee", column: "examination_fee", label: "Examination Fee" },
  { key: "gameFee", column: "game_fee", label: "Game Fee" },
  { key: "libraryFee", column: "library_fee", label: "Library Fee" },
  { key: "magazineFee", column: "magazine_fee", label: "Magazine Fee" },
  { key: "banaviharFee", column: "banavihar_fee", label: "Banavihar Fee" },
  { key: "medicineFee", column: "medicine_fee", label: "Medicine Fee" },
  { key: "annualFunctionFee", column: "annual_function_fee", label: "Annual Function" },
  { key: "pujaFestivalFee", column: "puja_festival_fee", label: "Puja & Festival" },
  { key: "prantiyaNidhiFee", column: "prantiya_nidhi_fee", label: "Prantiya Nidhi" },
  { key: "sanskarKendraFee", column: "sanskar_kendra_fee", label: "Sanskar Kendra" },
  { key: "lateFee", column: "late_fee", label: "Late Fee" },
  { key: "miscFee", column: "misc_fee", label: "Misc. Fee" },
];
const emptyFee = { className: "", ...Object.fromEntries(feeFields.map(({ key }) => [key, 0])) };

export function FeeStructurePage({ canEdit = true }) {
  const [classNames, setClassNames] = useState([]);
  const [items, setItems] = useState([]), [draft, setDraft] = useState(emptyFee), [open, setOpen] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const classes = [...new Set([...classNames, ...items.map((item) => item.class_name)])];
  const load = () => Promise.all([getStudentFeeStructures(), getClasses()]).then(([items, records]) => { setItems(items); setClassNames(records.map((row) => row.name)); setError(""); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const saved = new Map(items.map((item) => [item.class_name, item]));
  const edit = (item) => { if (!canEdit) return; setDraft({ className: item.class_name, ...Object.fromEntries(feeFields.map(({ key, column }) => [key, item[column] || 0])) }); setOpen(true); };
  const save = async (event) => { event.preventDefault(); if (!canEdit) return; setSaving(true); try { await saveStudentFeeStructure(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, key === "className" ? value : Number(value)]))); setOpen(false); load(); } catch (e) { setError(e.message || "Unable to save fee structure."); } finally { setSaving(false); } };
  return <div className="module-page financial-page"><div className="module-title"><div className="module-icon"><GraduationCap size={24}/></div><div><p className="eyebrow">STUDENT FINANCE</p><h1>Fee Structure</h1><p className="subtle">{canEdit ? "Configure the fees available for collection by class." : "View the fee structure configured for each class."}</p></div>{canEdit && <button className="primary-btn module-action" onClick={() => { setDraft(emptyFee); setOpen(true); }}><Plus size={15}/> Set class fee</button>}</div>{error && <p className="auth-error">{error}</p>}<section className="fee-structure-cards">{classes.map((className, index) => { const item = saved.get(className); const configured = feeFields.filter(({ column }) => Number(item?.[column] || 0) > 0); const total = feeFields.reduce((sum, { column }) => sum + Number(item?.[column] || 0), 0); return <article className={`fee-structure-card tone-${index % 5}`} key={className}><div className="fee-card-head"><div><span>{className}</span><small>{item ? "Active structure" : "Not configured"}</small></div>{canEdit && <button className="structure-edit" onClick={() => edit(item || { ...emptyFee, class_name: className })}><Pencil size={13}/>{item ? "Edit" : "Set fee"}</button>}</div><div className="fee-lines">{configured.map(({ column, label }) => <p key={column}><span>{label}</span><b>{money(item[column])}</b></p>)}{!configured.length && <p><span>No fee amounts configured</span><b>—</b></p>}</div><div className="fee-card-total"><span>Configured total</span><b>{money(total)}</b><small>Fees are available as separate items on collection receipts.</small></div></article>; })}</section>{canEdit && open && <FeeModal classes={classes} draft={draft} setDraft={setDraft} onClose={() => setOpen(false)} onSubmit={save} saving={saving}/>}</div>;
}
function FeeModal({ classes, draft, setDraft, onClose, onSubmit, saving }) {
  return <Modal title="Class fee structure" onClose={onClose} onSubmit={onSubmit} saving={saving}>
    <label><span>Class</span><select required value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })}><option value="">Select class</option>{classes.map((item) => <option key={item}>{item}</option>)}</select></label>
    <div className="fee-structure-input-grid">{feeFields.map(({ key, label }) => <label key={key}><span>{label} (₹)</span><input type="number" min="0" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}/></label>)}</div>
  </Modal>;
}
export function SalaryStructurePage() { const [items, setItems] = useState([]), [draft, setDraft] = useState(null), [error, setError] = useState(""); const load = () => getTeacherSalaryStructures().then(setItems).catch((e) => setError(e.message)); useEffect(() => { load(); }, []); const save = async (event) => { event.preventDefault(); await saveTeacherSalaryStructure({ ...draft, basicSalary: Number(draft.basicSalary), allowances: Number(draft.allowances), deductions: Number(draft.deductions) }); setDraft(null); load(); }; return <div className="module-page financial-page"><div className="module-title"><div className="module-icon"><BriefcaseBusiness size={24}/></div><div><p className="eyebrow">TEACHER PAYROLL</p><h1>Salary Structure</h1></div></div>{error && <p className="auth-error">{error}</p>}<section className="panel table-panel"><table><thead><tr><th>Teacher</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.teacher_id}><td><b>{item.teacher_name}</b></td><td>{money(item.basic_salary)}</td><td>{money(item.allowances)}</td><td>{money(item.deductions)}</td><td><button className="structure-edit" onClick={() => setDraft({ teacherId: item.teacher_id, basicSalary: item.basic_salary, allowances: item.allowances, deductions: item.deductions })}><Pencil size={13}/> Edit</button></td></tr>)}</tbody></table></section>{draft && <Modal title="Teacher salary" onClose={() => setDraft(null)} onSubmit={save}><label><span>Basic salary</span><input type="number" value={draft.basicSalary} onChange={(e) => setDraft({ ...draft, basicSalary: e.target.value })}/></label><label><span>Allowances</span><input type="number" value={draft.allowances} onChange={(e) => setDraft({ ...draft, allowances: e.target.value })}/></label><label><span>Deductions</span><input type="number" value={draft.deductions} onChange={(e) => setDraft({ ...draft, deductions: e.target.value })}/></label></Modal>}</div>; }
function Modal({ title, children, onClose, onSubmit, saving }) { return <div className="structure-overlay"><form className="structure-modal" onSubmit={onSubmit}><button type="button" className="workload-close" onClick={onClose}><X size={18}/></button><p className="eyebrow">ADMIN FINANCE</p><h2>{title}</h2><div className="structure-form">{children}</div><div className="workload-modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}><Save size={14}/>{saving ? "Saving…" : "Save changes"}</button></div></form></div>; }
