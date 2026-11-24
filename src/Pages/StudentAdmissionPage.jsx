import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, GraduationCap, Printer, Upload, UserPlus } from "lucide-react";
import { createAdmission, downloadAdmissionTemplate, getAdmissions, importAdmissions } from "../lib/api";

const empty = { name: "", fatherName: "", motherName: "", dateOfBirth: "", parentContactNumber: "", rollNumber: "", fatherOccupation: "", motherOccupation: "", parentEmail: "", address: "", className: "", sectionName: "", bloodGroup: "", aadhaarNumber: "", transportAvailable: false, photo: "", aadhaarAttachment: "", registrationType: "NEW" };

export default function StudentAdmissionPage({ view = "form" }) {
  const [form, setForm] = useState(empty), [students, setStudents] = useState([]), [tab, setTab] = useState(view), [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const refresh = () => getAdmissions().then(setStudents).catch((e) => setError(e.message || "Unable to load admission records."));
  useEffect(() => { refresh(); }, []);
  useEffect(() => setTab(view), [view]);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const uploadData = async (event, key) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 4_000_000) { setError("Choose an attachment smaller than 4 MB."); event.target.value = ""; return; }
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    setForm((current) => ({ ...current, [key]: data })); setError("");
  };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try { const result = await createAdmission(form); setSuccess(`Admission created. Student ID: ${result.userId}. Default password: ${form.dateOfBirth.split("-").reverse().join("")}`); setForm(empty); await refresh(); }
    catch (e) { setError(e.message || "Unable to create admission."); } finally { setBusy(false); }
  };
  const template = async () => { try { const blob = await downloadAdmissionTemplate(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "student-admission-template.xlsx"; link.click(); URL.revokeObjectURL(url); } catch (e) { setError(e.message || "Unable to download template."); } };
  const uploadWorkbook = async (event) => { const file = event.target.files?.[0]; if (!file) return; setBusy(true); setError(""); setSuccess(""); try { const result = await importAdmissions(file); const skipped = result.skipped || 0; setSuccess(`${result.created} student profile${result.created === 1 ? "" : "s"} created${skipped ? `; ${skipped} duplicate row${skipped === 1 ? "" : "s"} skipped` : ""}.`); await refresh(); } catch (e) { setError(e.message || "Unable to import workbook."); } finally { setBusy(false); event.target.value = ""; } };

  return <div className="module-page student-admission-page">
    <div className="module-title"><div className="module-icon"><UserPlus size={24}/></div><div><p className="eyebrow">STUDENT RECORDS</p><h1>Student Admission</h1><p className="subtle">Create student profiles, import existing students, and prepare admit cards.</p></div></div>
    <div className="admission-tabs"><button className={tab === "form" ? "active" : ""} onClick={() => setTab("form")}><UserPlus size={16}/> Admission form</button><button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}><GraduationCap size={16}/> Admit cards <b>{students.length}</b></button></div>
    {error && <p className="auth-error" role="alert">{error}</p>}{success && <p className="auth-success"><CheckCircle2 size={16}/>{success}</p>}
    {tab === "form" ? <>
      <form className="panel admin-application-form admission-form" onSubmit={submit}>
        <div className="admission-form-top"><fieldset className="registration-type-toggle"><legend>Student status <em>Required</em></legend><div><label className={form.registrationType === "NEW" ? "active new" : ""}><input type="radio" name="registrationType" checked={form.registrationType === "NEW"} onChange={() => setForm({ ...form, registrationType: "NEW" })}/><span>New admission</span></label><label className={form.registrationType === "OLD" ? "active old" : ""}><input type="radio" name="registrationType" checked={form.registrationType === "OLD"} onChange={() => setForm({ ...form, registrationType: "OLD" })}/><span>Existing student</span></label></div></fieldset><p>Student login ID is generated automatically. Initial password uses date of birth in DDMMYYYY format.</p></div>
        <AdmissionSection number="01" title="Student details" description="Basic information and identification">
          <Field label="Student name" name="name" value={form.name} onChange={update} required/><Field label="Date of birth" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={update} required/><Field label="Blood group" name="bloodGroup" value={form.bloodGroup} onChange={update}/><Field label="Aadhaar number" name="aadhaarNumber" value={form.aadhaarNumber} onChange={update}/>
          <label className="admin-form-field admission-address"><span>Address</span><textarea name="address" value={form.address} onChange={update} rows="2" placeholder="House, street, city and postal code"/></label>
        </AdmissionSection>
        <AdmissionSection number="02" title="Parent / guardian" description="Contact information for school communication">
          <Field label="Father name" name="fatherName" value={form.fatherName} onChange={update}/><Field label="Mother name" name="motherName" value={form.motherName} onChange={update}/><Field label="Parent contact number" name="parentContactNumber" value={form.parentContactNumber} onChange={update} required/><Field label="Father occupation" name="fatherOccupation" value={form.fatherOccupation} onChange={update}/><Field label="Mother occupation" name="motherOccupation" value={form.motherOccupation} onChange={update}/><Field label="Parent email" type="email" name="parentEmail" value={form.parentEmail} onChange={update}/>
        </AdmissionSection>
        <AdmissionSection number="03" title="School placement" description="Class assignment and supporting documents">
          <Field label="Roll number" name="rollNumber" value={form.rollNumber} onChange={update} required/><Field label="Class" name="className" value={form.className} onChange={update} required/><Field label="Section (optional)" name="sectionName" value={form.sectionName} onChange={update}/>
          <label className="admin-form-field"><span>Passport size photo</span><input type="file" accept="image/*" onChange={(e) => uploadData(e, "photo")}/></label><label className="admin-form-field"><span>Aadhaar card attachment</span><input type="file" accept="image/*,.pdf,application/pdf" onChange={(e) => uploadData(e, "aadhaarAttachment")}/></label>
          <label className="admission-transport"><input type="checkbox" name="transportAvailable" checked={form.transportAvailable} onChange={update}/> Transport available</label>
        </AdmissionSection>
        <div className="admin-form-actions"><button type="button" onClick={() => setForm(empty)}>Clear form</button><button className="primary-btn" disabled={busy}>{busy ? "Creating profile…" : "Create student profile"}</button></div>
      </form>
      <section className="panel admission-import">
        <header className="admission-import-heading"><span className="admission-import-icon"><FileSpreadsheet size={21}/></span><div><p className="eyebrow">BULK ONBOARDING</p><h2>Import existing students</h2><p>Use the Class 1–10 worksheets to add multiple student records. Each sheet has the same columns; the selected sheet sets the student’s class. Enter DOB and Date of Admission as DD-MM-YYYY, or double-click a date cell for the calendar in Excel for the web.</p></div></header>
        <div className="admission-import-actions">
          <button type="button" className="admission-import-action admission-template-action" onClick={template}><span className="admission-import-action-icon"><Download size={18}/></span><span><b>Download Excel template</b><small>Get the .xlsx file with required columns</small></span><span className="admission-import-action-arrow">↓</span></button>
          <label className={`admission-import-action admission-upload-action ${busy ? "disabled" : ""}`}><span className="admission-import-action-icon"><Upload size={18}/></span><span><b>{busy ? "Importing students…" : "Upload completed Excel"}</b><small>{busy ? "Please wait while records are added" : "Choose your completed .xlsx workbook"}</small></span><span className="admission-import-action-arrow">↑</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={uploadWorkbook} disabled={busy}/></label>
        </div>
      </section>
      <div className="admission-footer"><span>Student profiles appear in Identity Card after they are created.</span><button type="button" onClick={() => setTab("cards")}><GraduationCap size={16}/> View identity cards <b>{students.length}</b></button></div>
    </> : <section className="admit-card-grid">{students.map((student) => <article className="admit-card" key={student.id}><div className="admit-card-head"><span>STUDENT ADMIT CARD</span><button type="button" onClick={() => window.print()} aria-label={`Print admit card for ${student.display_name}`}><Printer size={15}/> Print</button></div><div className="admit-card-content">{student.profile_image ? <img src={student.profile_image} alt="Student"/> : <div className="admit-card-avatar">{String(student.display_name || "S").split(" ").map((word) => word[0]).join("")}</div>}<div><h2>{student.display_name}</h2><p>{student.class_name || "Class not set"}{student.section_name ? ` · ${student.section_name}` : ""}</p><small>{student.registration_type === "NEW" ? "New admission" : "Existing student"}</small></div></div><dl><div><dt>Student ID</dt><dd>{student.user_id}</dd></div><div><dt>Roll number</dt><dd>{student.roll_number || "—"}</dd></div><div><dt>Date of birth</dt><dd>{student.date_of_birth || "—"}</dd></div><div><dt>Parent contact</dt><dd>{student.parent_contact_number || "—"}</dd></div></dl></article>)}{students.length === 0 && <div className="panel admission-empty">No student admission profiles yet. Complete the admission form to see admit cards here.</div>}</section>}
  </div>;
}

function AdmissionSection({ number, title, description, children }) { return <section className="admission-detail-section"><div className="admission-section-heading"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div><div className="admin-form-grid">{children}</div></section>; }
function Field({ label, ...props }) { return <label className="admin-form-field"><span>{label}</span><input {...props}/></label>; }
