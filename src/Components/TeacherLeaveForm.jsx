import LeaveBalanceCharts from "./LeaveBalanceCharts";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, FileText, Paperclip, UploadCloud, X } from "lucide-react";
import { applyTeacherLeave, getTeacherLeave } from "../lib/api";
import { emergencyLeaveAvailable, leavePolicy } from "../lib/leavePolicy";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function TeacherLeaveForm() {
  const [type, setType] = useState("SICK"), [from, setFrom] = useState(today), [to, setTo] = useState(today);
  const [reason, setReason] = useState(""), [proof, setProof] = useState(null);
  const [entries, setEntries] = useState([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [fileError, setFileError] = useState(""), [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const fileInput = useRef(null);
  useEffect(() => {
    let live = true;
    const load = () => getTeacherLeave().then((rows) => { if (live) { setEntries(rows); setLoadError(""); } }).catch((failure) => { if (live) setLoadError(failure.message.includes("No static resource") ? "The leave service is unavailable. Please restart the backend and retry." : failure.message); }).finally(() => { if (live) setLoading(false); });
    load(); const interval = setInterval(load, 30000);
    return () => { live = false; clearInterval(interval); };
  }, [revision]);
  const emergencyAvailable = !loading && !loadError && emergencyLeaveAvailable(entries, from, to);
  const selectedType = type === "EMERGENCY" && !emergencyAvailable ? "SICK" : type;
  const policy = leavePolicy(entries, selectedType, from, to);
  const selectProof = (event) => {
    const file = event.target.files?.[0];
    setFileError(""); setProof(null);
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) {
      setFileError("Choose a non-empty PDF, JPG or PNG file, up to 5 MB."); event.target.value = ""; return;
    }
    setProof(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy || loading || loadError || !policy.valid) return;
    if (!reason.trim()) { setError("Please enter a reason for your leave."); return; }
    if (policy.proofRequired && !proof) { setError("Please attach the required supporting document."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await applyTeacherLeave({ leaveType: selectedType, fromDate: from, toDate: to, reason: reason.trim() }, proof);
      setEntries((rows) => [...rows, { id: result.id, leave_type: selectedType, from_date: from, to_date: to, status: "PENDING" }]);
      window.dispatchEvent(new Event("teacher-leave-updated"));
      setMessage("Leave application submitted. Check My Attendance for your dates and approval status.");
      setReason(""); setProof(null); if (fileInput.current) fileInput.current.value = "";
      setRevision((value) => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="leave-application-layout">
    <form className="panel leave-application-form" onSubmit={submit}>
      <div className="leave-form-title"><span className="staff-section-icon"><FileText size={22}/></span><div><p className="staff-kicker">YOUR TIME AWAY</p><h2>Leave application</h2><p>A few details, and your request is ready for review.</p></div></div>
      {message && <p className="leave-success" role="status"><CheckCircle2 size={18}/>{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loadError && <div className="auth-error" role="alert">Unable to check leave usage: {loadError} <button className="filter-btn" type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></div>}
      <fieldset disabled={busy} className="leave-fields">
        <label className="leave-full">Leave type<select value={selectedType} onChange={(event) => setType(event.target.value)}><option value="SICK">Sick leave</option><option value="CASUAL">Casual leave</option>{emergencyAvailable && <option value="EMERGENCY">Emergency leave</option>}</select><small>5 sick days and 5 casual days per calendar year. Emergency leave appears when both balances are exhausted; it counts toward payable days after admin approval and requires supporting proof.</small></label>
        <label>From date<input type="date" required value={from} onChange={(event) => { setFrom(event.target.value); if (event.target.value > to) setTo(event.target.value); }}/></label>
        <label>To date<input type="date" required min={from} value={to} onChange={(event) => setTo(event.target.value)}/></label>
        <div className="leave-duration-note leave-full"><CalendarDays size={16}/>{policy.valid ? `${policy.days} ${policy.days === 1 ? "day" : "days"} requested · Both dates included` : "Choose a valid start and end date."}<span>For one day, use the same date in both fields.</span></div>
        {!loading && !loadError && policy.valid && <div className="leave-full leave-unpaid" role="status">{policy.paidDays} paid days ? {policy.unpaidDays} days leave without pay if approved. Pending requests reserve your balance; rejected requests release it.</div>}
        <label className="leave-full">Reason for leave<textarea required maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Briefly explain why you need time away…"/><small className="leave-character-count">{reason.length}/1000</small></label>
        <details open={policy.proofRequired || !!proof || undefined} className={`leave-support leave-full ${policy.proofRequired ? "required" : ""}`} aria-labelledby="supporting-documents-title">
          <summary className="leave-support-heading"><Paperclip size={18}/><h3 id="supporting-documents-title">Supporting documents</h3><span>{loading || loadError ? "Checking…" : policy.proofRequired ? "Required" : "Optional - expand"}</span></summary>
          <div className="leave-proof-explanation" aria-live="polite">{!loading && !loadError && policy.proofRequired ? <><p>Please attach proof so your admin can review this request.</p><ul>{policy.exceedsAllowance && <li>{selectedType === "EMERGENCY" ? "Emergency leave requires supporting proof and counts toward payable days only after approval." : <>This request exceeds your 5-day {selectedType === "SICK" ? "sick" : "casual"} leave allowance.</>}</li>}{policy.consecutiveDays > 2 && <li>Your leave covers {policy.consecutiveDays} consecutive days{policy.consecutiveDays > policy.days ? ", including adjacent pending or approved requests" : ""}.</li>}</ul></> : <p>Add a medical certificate or other relevant document. Proof is required for more than 2 consecutive days or requests beyond the annual allowance.</p>}</div>
          <label className="leave-upload"><UploadCloud size={26}/><b>{proof ? "Replace attachment" : "Choose a supporting document"}</b><span>PDF, JPG or PNG · Maximum 5 MB</span><input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required={policy.proofRequired} onChange={selectProof} aria-label="Upload supporting proof"/></label>
          {proof && <div className="leave-file"><FileText size={18}/><span><b>{proof.name}</b><small>{(proof.size / 1024).toFixed(0)} KB · Ready to submit</small></span><button type="button" onClick={() => { setProof(null); if (fileInput.current) fileInput.current.value = ""; }} aria-label="Remove attachment"><X size={17}/></button></div>}
          {fileError && <p className="auth-error" role="alert">{fileError}</p>}
        </details>
      </fieldset>
      <div className="leave-submit-footer"><p>{loadError ? "Submission is unavailable until the leave service reconnects." : loading ? "Checking your leave balance..." : <>Your admin reviews every request.<br/>Follow its status in <b>My Attendance</b>.</>}</p><button type="submit" className="primary-btn" disabled={busy || loading || !!loadError || !policy.valid}>{busy ? "Submitting…" : "Submit application"}<ArrowRight size={16}/></button></div>
    </form>
    <LeaveBalanceCharts entries={entries} year={from.slice(0, 4) || today().slice(0, 4)} loading={loading} error={loadError}/>

  </div>;
}
