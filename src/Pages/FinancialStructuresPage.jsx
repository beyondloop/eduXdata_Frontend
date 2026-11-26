import { useEffect, useState } from "react";
import { BriefcaseBusiness, GraduationCap, Pencil, Plus, Save, X } from "lucide-react";
import { createClass, getClasses, getStudentFeeStructures, getTeacherSalaryStructures, saveStudentFeeStructure, saveTeacherSalaryStructure } from "../lib/api";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const standardClasses = ["Nursery", "LKG", "UKG", ...Array.from({ length: 10 }, (_, index) => `Class ${index + 1}`)];
const imageFees = {
  Nursery: { admissionFee: 5000, tuitionFee: 500 }, LKG: { admissionFee: 5500, readmissionFee: 2800, tuitionFee: 550 }, UKG: { admissionFee: 5500, readmissionFee: 2800, tuitionFee: 550 },
  "Class 1": { admissionFee: 6000, readmissionFee: 3300, tuitionFee: 600 }, "Class 2": { admissionFee: 6000, readmissionFee: 3300, tuitionFee: 600 },
  "Class 3": { admissionFee: 7000, readmissionFee: 3800, tuitionFee: 700 }, "Class 4": { admissionFee: 7000, readmissionFee: 3800, tuitionFee: 700 },
  "Class 5": { admissionFee: 7000, readmissionFee: 4300, tuitionFee: 800 }, "Class 6": { admissionFee: 8000, readmissionFee: 4300, tuitionFee: 800 },
  "Class 7": { admissionFee: 8000, readmissionFee: 4800, tuitionFee: 900 }, "Class 8": { admissionFee: 8000, readmissionFee: 4800, tuitionFee: 1200 },
  "Class 9": { tuitionFee: 1600 }, "Class 10": { tuitionFee: 1800 },
};
const feeFields = [
  { key: "admissionFee", column: "admission_fee", label: "Admission Fee", detail: "One-time, new admission" },
  { key: "readmissionFee", column: "readmission_fee", label: "Readmission Fee", detail: "Annual readmission" },
  { key: "tuitionFee", column: "tuition_fee", legacyColumn: "academic_fee", label: "Tuition Fee", detail: "Monthly fee" },
  { key: "libraryFee", column: "library_fee", label: "Library Fee", detail: "Monthly fee" },
  { key: "developmentFee", column: "development_fee", label: "Development Fee", detail: "Annual fee" },
  { key: "examinationFee", column: "examination_fee", label: "Examination Fee", detail: "Annual fee" },
  { key: "gameFee", column: "game_fee", label: "Game Fee", detail: "Annual fee" },
  { key: "magazineFee", column: "magazine_fee", label: "Magazine Fee", detail: "Annual fee" },
  { key: "banaviharFee", column: "banavihar_fee", label: "Banavihar Fee", detail: "Annual fee" },
  { key: "medicineFee", column: "medicine_fee", label: "Medicine Fee", detail: "Annual fee" },
  { key: "annualFunctionFee", column: "annual_function_fee", label: "Annual Function Fee", detail: "Annual fee" },
  { key: "pujaFestivalFee", column: "puja_festival_fee", label: "Puja & Festival Fee", detail: "Annual fee" },
  { key: "prantiyaNidhiFee", column: "prantiya_nidhi_fee", label: "Prantiya Nidhi Fee", detail: "Annual fee" },
  { key: "sanskarKendraFee", column: "sanskar_kendra_fee", label: "Sanskar Kendra Fee", detail: "Annual fee" },
  { key: "lateFee", column: "late_fee", label: "Late Fee", detail: "As applicable" },
  { key: "miscFee", column: "misc_fee", label: "Miscellaneous Fee", detail: "As applicable" },
  { key: "transportFee", column: "transport_fee", label: "Transport Fee", detail: "Monthly fee" },
];
const emptyFee = { className: "", ...Object.fromEntries(feeFields.map(({ key }) => [key, 0])) };
const classNumber = (name) => String(name || "").match(/(?:class|std\.?)[\s.-]*(\d+)/i)?.[1];
const canonicalClass = (name) => classNumber(name) ? `Class ${classNumber(name)}` : name;
const defaultsFor = (className) => ({ ...emptyFee, className, ...imageFees[className], transportFee: 0 });
const valueFor = (item, field) => Number(item?.[field.column] ?? (field.legacyColumn ? item?.[field.legacyColumn] : 0) ?? 0);

export function FeeStructurePage({ canEdit = true }) {
  const [classNames, setClassNames] = useState([]);
  const [items, setItems] = useState([]), [draft, setDraft] = useState(emptyFee), [open, setOpen] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(""), [modalError, setModalError] = useState("");
  const classes = [...standardClasses, ...classNames.map(canonicalClass).filter((name) => name && !standardClasses.includes(name))];
  const apiClassName = (displayName) => classNames.find((name) => canonicalClass(name) === displayName) || displayName;
  const load = () => Promise.all([getStudentFeeStructures(), getClasses()]).then(([savedItems, records]) => { setItems(savedItems); setClassNames(records.map((row) => row.name)); setError(""); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const saved = new Map(items.map((item) => [canonicalClass(item.class_name), item]));
  const edit = (className, item) => { if (!canEdit) return; const defaults = defaultsFor(className); setModalError(""); setDraft({ className: item?.class_name || apiClassName(className), ...Object.fromEntries(feeFields.map((field) => [field.key, item ? valueFor(item, field) : defaults[field.key]])) }); setOpen(true); };
  const save = async (event) => {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setModalError("");
    try {
      const targetClassName = draft.className.trim();
      if (!classNames.some((name) => name.trim().toLowerCase() === targetClassName.toLowerCase())) {
        await createClass({ name: targetClassName });
      }
      const values = Object.fromEntries(feeFields.map(({ key }) => [key, Number(draft[key] || 0)]));
      const { tuitionFee, ...otherFees } = values;
      await saveStudentFeeStructure({ className: targetClassName, ...otherFees, academicFee: tuitionFee });
      setOpen(false);
      await load();
    } catch (e) { setModalError(e.message || "Unable to save fee structure."); }
    finally { setSaving(false); }
  };
  return <div className="module-page financial-page">
    <div className="module-title"><div className="module-icon"><GraduationCap size={24}/></div><div><p className="eyebrow">STUDENT FINANCE · 2026–27</p><h1>Fee Structure</h1><p className="subtle">Nursery–UKG and Classes 1–10 · admission, readmission, monthly tuition and transport fees.</p></div>{canEdit && <button type="button" className="primary-btn module-action" onClick={() => { setModalError(""); setDraft({ ...defaultsFor("Nursery"), className: apiClassName("Nursery") }); setOpen(true); }}><Plus size={15}/> Set class fee</button>}</div>
    {error && <p className="auth-error">{error}</p>}
    <section className="fee-structure-cards">{classes.map((className, index) => { const item = saved.get(className); const defaults = defaultsFor(className); const values = Object.fromEntries(feeFields.map((field) => [field.key, item ? valueFor(item, field) : defaults[field.key]])); const total = feeFields.reduce((sum, field) => sum + values[field.key], 0); return <article className={`fee-structure-card tone-${index % 5}`} key={className}><div className="fee-card-head"><div><span>{className}</span><small>{item ? "Active structure" : "2026–27 suggested structure"}</small></div>{canEdit && <button type="button" className="structure-edit" onClick={() => edit(className, item)}><Pencil size={13}/>Edit</button>}</div><div className="fee-lines">{feeFields.map((field) => <p key={field.key}><span><b>{field.label}</b><small>{field.detail}</small></span><b>{money(values[field.key])}</b></p>)}</div><div className="fee-card-total"><span>Combined fee total</span><b>{money(total)}</b><small>Transport is set to ₹0. Tuition and transport are monthly; admission and readmission are one-time.</small></div></article>; })}</section>
    {canEdit && open && <FeeModal classes={classes} apiClassName={apiClassName} draft={draft} setDraft={setDraft} error={modalError} onClose={() => { setModalError(""); setOpen(false); }} onSubmit={save} saving={saving}/>}</div>;
}
function FeeModal({ classes, apiClassName, draft, setDraft, error, onClose, onSubmit, saving }) { return <Modal title="Class fee structure" error={error} onClose={onClose} onSubmit={onSubmit} saving={saving}><label><span>Class</span><select required value={canonicalClass(draft.className)} onChange={(e) => setDraft({ ...defaultsFor(e.target.value), className: apiClassName(e.target.value) })}><option value="">Select class</option>{classes.map((item) => <option key={item}>{item}</option>)}</select></label><div className="fee-structure-input-grid">{feeFields.map(({ key, label, detail }) => <label key={key}><span>{label} (₹)</span><input type="number" min="0" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}/><small>{detail}</small></label>)}</div></Modal>; }
export function SalaryStructurePage() { const [items, setItems] = useState([]), [draft, setDraft] = useState(null), [error, setError] = useState(""); const load = () => getTeacherSalaryStructures().then(setItems).catch((e) => setError(e.message)); useEffect(() => { load(); }, []); const save = async (event) => { event.preventDefault(); await saveTeacherSalaryStructure({ ...draft, basicSalary: Number(draft.basicSalary), allowances: Number(draft.allowances), deductions: Number(draft.deductions) }); setDraft(null); load(); }; return <div className="module-page financial-page"><div className="module-title"><div className="module-icon"><BriefcaseBusiness size={24}/></div><div><p className="eyebrow">TEACHER PAYROLL</p><h1>Salary Structure</h1></div></div>{error && <p className="auth-error">{error}</p>}<section className="panel table-panel"><table><thead><tr><th>Teacher</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.teacher_id}><td><b>{item.teacher_name}</b></td><td>{money(item.basic_salary)}</td><td>{money(item.allowances)}</td><td>{money(item.deductions)}</td><td><button className="structure-edit" onClick={() => setDraft({ teacherId: item.teacher_id, basicSalary: item.basic_salary, allowances: item.allowances, deductions: item.deductions })}><Pencil size={13}/> Edit</button></td></tr>)}</tbody></table></section>{draft && <Modal title="Teacher salary" onClose={() => setDraft(null)} onSubmit={save}><label><span>Basic salary</span><input type="number" value={draft.basicSalary} onChange={(e) => setDraft({ ...draft, basicSalary: e.target.value })}/></label><label><span>Allowances</span><input type="number" value={draft.allowances} onChange={(e) => setDraft({ ...draft, allowances: e.target.value })}/></label><label><span>Deductions</span><input type="number" value={draft.deductions} onChange={(e) => setDraft({ ...draft, deductions: e.target.value })}/></label></Modal>}</div>; }
function Modal({ title, error, children, onClose, onSubmit, saving }) { return <div className="structure-overlay"><form className="structure-modal" onSubmit={onSubmit}><button type="button" className="workload-close" onClick={onClose}><X size={18}/></button><p className="eyebrow">ADMIN FINANCE</p><h2>{title}</h2><div className="structure-form">{children}</div>{error && <p className="auth-error">{error}</p>}<div className="workload-modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}><Save size={14}/>{saving ? "Saving…" : "Save changes"}</button></div></form></div>; }
