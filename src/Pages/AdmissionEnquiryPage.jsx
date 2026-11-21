import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, UserRound } from "lucide-react";
import { createAdmissionEnquiry, getAdmissionEnquiries } from "../lib/api";

const empty = { studentName: "", parentName: "", phone: "", email: "", desiredClass: "", message: "" };

export default function AdmissionEnquiryPage() {
  const [form, setForm] = useState(empty);
  const [enquiries, setEnquiries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = () => getAdmissionEnquiries().then(setEnquiries).catch((e) => setError(e.message || "Unable to load enquiries."));
  useEffect(() => { refresh(); }, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      await createAdmissionEnquiry(form);
      setForm(empty); setSuccess("Admission enquiry saved. The student has not been added to school accounts.");
      await refresh();
    } catch (e) { setError(e.message || "Unable to save this enquiry."); }
    finally { setBusy(false); }
  };

  return <div className="module-page admin-application-page">
    <div className="module-title"><div className="module-icon"><ClipboardList size={24}/></div><div><p className="eyebrow">PROSPECTIVE STUDENTS</p><h1>Admission Enquiry</h1><p className="subtle">Record a family’s interest in admission and follow up with them later.</p></div></div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {success && <p className="auth-success"><CheckCircle2 size={16}/>{success}</p>}
    <form className="panel admin-application-form" onSubmit={submit}>
      <div className="application-form-heading"><UserRound size={20}/><div><b>Interested student and parent</b><small>Enter the contact details the school can use to follow up.</small></div></div>
      <div className="admin-form-grid">
        <Field label="Student name" name="studentName" value={form.studentName} onChange={update} required/>
        <Field label="Parent / guardian name" name="parentName" value={form.parentName} onChange={update} required/>
        <Field label="Contact number" name="phone" type="tel" value={form.phone} onChange={update} required/>
        <Field label="Email address" name="email" type="email" value={form.email} onChange={update}/>
        <Field label="Class interested in" name="desiredClass" value={form.desiredClass} onChange={update} required/>
        <label className="admin-form-field"><span>Enquiry notes</span><textarea name="message" value={form.message} onChange={update} rows="3" placeholder="Questions, preferred visit time, or other details"/></label>
      </div>
      <div className="admin-form-actions"><button type="button" onClick={() => { setForm(empty); setError(""); setSuccess(""); }}>Clear form</button><button className="primary-btn" disabled={busy}>{busy ? "Saving enquiry…" : "Save admission enquiry"}</button></div>
    </form>
    <section className="panel admission-enquiry-list"><div className="application-form-heading"><ClipboardList size={20}/><div><b>Recent enquiries</b><small>{enquiries.length} {enquiries.length === 1 ? "family" : "families"} recorded</small></div></div>
      {enquiries.length ? <div className="admin-record-list">{enquiries.map((item) => <article className="admin-record-row" key={item.id}><div><b>{item.student_name}</b><small>{item.parent_name} · Class {item.desired_class}</small></div><div><b>{item.phone}</b><small>{item.email || "No email provided"}</small></div><span>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "New"}</span>{item.message && <p>{item.message}</p>}</article>)}</div> : <p className="subtle">No admission enquiries have been recorded yet.</p>}
    </section>
  </div>;
}

function Field({ label, ...props }) { return <label className="admin-form-field"><span>{label}</span><input {...props}/></label>; }
