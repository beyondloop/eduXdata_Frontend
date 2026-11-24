import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, FilePenLine, GraduationCap, LockKeyhole, Mail, UserRound } from "lucide-react";
import { getClasses, getSections, registerAccount } from "../lib/api";

export default function AdminApplicationFormPage({ role, onComplete, schoolName, tenantId }) {
  const [classRecords, setClassRecords] = useState([]), [sectionRecords, setSectionRecords] = useState([]);
  const classes = classRecords.filter((row) => row.active !== false).map((row) => row.name);
  const isStudent = role === "STUDENT";
  const roleLabel = role === "SUB_ADMIN" ? "SubAdmin" : isStudent ? "Student" : "Teacher";
  const [form, setForm] = useState({ name: "", email: "", password: "", className: "", section: "", rollNumber: "", teacherId: "" });
  const sections = sectionRecords.filter((row) => row.active !== false && (row.class_name === form.className || classRecords.some((item) => item.name === form.className && item.id === row.class_id))).map((row) => row.name);
  useEffect(() => { if (isStudent) Promise.all([getClasses(), getSections()]).then(([classes, sections]) => { setClassRecords(classes); setSectionRecords(sections); }).catch((error) => setStatus({ busy: false, error: error.message, success: "" })); }, [isStudent]);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ busy: false, error: "", success: "" });

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value, ...(event.target.name === "className" ? { section: "" } : {}) }));
  const clearForm = () => {
    setForm({ name: "", email: "", password: "", className: "", section: "", rollNumber: "", teacherId: "" });
    setShowPassword(false);
    setStatus({ busy: false, error: "", success: "" });
  };
  const submit = async (event) => {
    event.preventDefault();
    setStatus({ busy: true, error: "", success: "" });
    try {
      const result = await registerAccount({
        tenantId,
        displayName: form.name,
        email: form.email,
        password: form.password,
        role,
        className: form.className,
        sectionName: form.section,
        rollNumber: form.rollNumber,
        teacherId: form.teacherId,
      });
      const userId = result.userId || result.userCode;
      if (!userId) throw new Error("The backend is running an old authentication build. Restart the backend and try again.");
      setStatus({ busy: false, error: "", success: `${roleLabel} account created successfully. User ID: ${userId}` });
      setForm({ name: "", email: "", password: "", className: "", section: "", rollNumber: "", teacherId: "" });
      onComplete(role, { ...form, userId });
    } catch (error) {
      setStatus({ busy: false, error: error.message || `Unable to create the ${roleLabel.toLowerCase()} account.`, success: "" });
    }
  };

  return <div className="module-page admin-application-page">
    <div className="module-title"><div className="module-icon"><FilePenLine size={24}/></div><div><p className="eyebrow">Account applications</p><h1>{roleLabel} Application Form</h1><p className="subtle">Create a {roleLabel.toLowerCase()} account for {schoolName || "your school"}.</p></div></div>
    <form className="panel admin-application-form" onSubmit={submit} autoComplete="off">
      {isStudent && <p className="subtle">Choose New or Old student admission from the Student Admission section.</p>}
      <div className="application-form-heading"><GraduationCap size={20}/><div><b>{roleLabel} details</b><small>Required fields are used to create the account.</small></div></div>
      <div className="admin-form-grid">
        <label className="admin-form-field"><span>Full name</span><div className="application-input"><UserRound size={16}/><input name="name" value={form.name} onChange={update} placeholder={`${roleLabel} name`} required/></div></label>
        <label className="admin-form-field"><span>Email address</span><div className="application-input"><Mail size={16}/><input name="email" type="email" value={form.email} onChange={update} placeholder={`${roleLabel.toLowerCase()}@school.edu`} required/></div></label>
        <label className="admin-form-field"><span>Password</span><div className="application-input"><LockKeyhole size={16}/><input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} placeholder="At least 6 characters" minLength={6} required/><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Show or hide password">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
        {isStudent ? <><Select label="Class" name="className" value={form.className} onChange={update} options={classes}/><Select label="Section" name="section" value={form.section} onChange={update} options={sections}/><Field label="Roll number" name="rollNumber" value={form.rollNumber} onChange={update} placeholder="Enter roll number"/></> : role === "TEACHER" && <Field label="Teacher ID" name="teacherId" value={form.teacherId} onChange={update} placeholder="Enter teacher ID"/>}
      </div>
      {status.error && <p className="auth-error">{status.error}</p>}
      {status.success && <p className="auth-success"><CheckCircle2 size={15}/> {status.success}</p>}
      <div className="admin-form-actions"><button type="reset" onClick={clearForm}>Clear form</button><button className="primary-btn" disabled={status.busy}>{status.busy ? "Creating account..." : "Submit application"}</button></div>
    </form>
  </div>;
}

function Field({ label, ...props }) { return <label className="admin-form-field"><span>{label}</span><input {...props} required/></label>; }
function Select({ label, options, ...props }) { return <label className="admin-form-field"><span>{label}</span><select {...props} required><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
