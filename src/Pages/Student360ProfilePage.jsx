import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Receipt, X } from "lucide-react";
import { getStudentFees, recordStudentFeePayment } from "../lib/api";

import StudentAcademicInsights from "../Components/StudentAcademicInsights";

export default function Student360ProfilePage({ student, onBack }) {
  const profile = Array.isArray(student) ? { name: student[0], className: student[1] } : student || { name: "Student" };
  const rollNumber = profile.rollNumber || profile.roll || "Not assigned";
  const classLabel = profile.className && profile.sectionName ? `${profile.className} · ${profile.sectionName}` : profile.className || "Class not assigned";
  const [fees, setFees] = useState([]);
  const [feeError, setFeeError] = useState("");
  const [payingFee, setPayingFee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!profile.id) return undefined;
    let cancelled = false;
    const loadFees = () => getStudentFees(profile.id).then((records) => { if (!cancelled) { setFees(records); setFeeError(""); } }).catch((error) => { if (!cancelled) setFeeError(error.message || "Unable to load fee records."); });
    loadFees();
    const refresh = window.setInterval(loadFees, 5000);
    const refreshOnFocus = () => { if (document.visibilityState === "visible") loadFees(); };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => { cancelled = true; window.clearInterval(refresh); document.removeEventListener("visibilitychange", refreshOnFocus); };
  }, [profile.id]);
  const feeSummary = useMemo(() => ({
    paid: fees.reduce((total, fee) => total + Number(fee.paid_amount ?? (fee.status === "PAID" ? fee.amount : 0)), 0),
    pending: fees.reduce((total, fee) => total + Number(fee.balance_amount ?? (fee.status === "PAID" ? 0 : fee.amount)), 0),
  }), [fees]);
  const submitPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await recordStudentFeePayment(profile.id, payingFee.id, { paymentMethod, reference, amount: Number(manualAmount || payingFee.balance_amount || payingFee.amount) });
      setFees((current) => current.map((fee) => fee.id === updated.id ? { ...fee, ...updated } : fee));
      setPayingFee(null); setReference(""); setManualAmount(""); setFeeError("");
    } catch (error) { setFeeError(error.message || "Unable to record payment."); }
    finally { setSaving(false); }
  };
  const exportReport = () => {
    const previousTitle = document.title;
    document.title = `${profile.name} - Student Report`;
    document.body.classList.add("printing-student-report");
    const cleanup = () => {
      document.title = previousTitle;
      document.body.classList.remove("printing-student-report");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };
  return <div className="student-360"><button type="button" className="student-360-back" onClick={onBack}>← Back to all students</button><section className="student-360-hero"><div className="student-360-avatar">{profile.name.split(" ").map((word) => word[0]).join("")}</div><div><p className="eyebrow">STUDENT 360° PROFILE · {rollNumber}</p><h1>{profile.name}</h1><p>{classLabel}</p></div></section><StudentAcademicInsights studentId={profile.id}/><AdminFees fees={fees} paid={feeSummary.paid} pending={feeSummary.pending} error={feeError} onPay={setPayingFee}/><div className="student-360-actions"><button type="button" onClick={exportReport}><FileText size={15}/> View Full Report</button><button type="button" className="primary-btn" onClick={exportReport} title="Open the print dialog to save this report as a PDF"><Download size={15}/> Export PDF</button></div>{payingFee && <div className="fee-payment-overlay"><form className="fee-payment-modal" onSubmit={submitPayment}><button type="button" className="fee-modal-close" onClick={() => setPayingFee(null)}><X size={17}/></button><span className="eyebrow">MANUAL PAYMENT</span><h2>Mark fee as paid</h2><p>{payingFee.month_label} · {payingFee.fee_type} · ₹{Number(payingFee.amount).toLocaleString("en-IN")}</p><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CHEQUE">Cheque</option></select></label><label>Receipt / reference (optional)<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. CASH-1042" /></label><button className="primary-btn" disabled={saving}>{saving ? <><Loader2 className="spin" size={15}/> Saving...</> : <><CheckCircle2 size={15}/> Confirm payment</>}</button></form></div>}</div>;
}

function AdminFees({ fees, paid, pending, error, onPay }) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const transportEnabled = Boolean(fees[0]?.transport_enabled);
  const transportBand = fees[0]?.transport_distance_band;
  const months = useMemo(() => Object.values(fees.reduce((result, fee) => {
    const month = result[fee.month_label] || { label: fee.month_label, fees: [], paid: 0, total: 0 };
    month.fees.push(fee); month.total += Number(fee.amount); month.paid += Number(fee.paid_amount ?? (fee.status === "PAID" ? fee.amount : 0));
    result[fee.month_label] = month; return result;
  }, {})), [fees]);
  useEffect(() => { if (months.length && !months.some((month) => month.label === selectedMonth)) setSelectedMonth(months[0].label); }, [months, selectedMonth]);
  const activeMonth = months.find((month) => month.label === selectedMonth) || months[0];
  return <section className="student-360-card student-fees-card"><div className="fee-card-heading"><div><p className="eyebrow">ADMIN ONLY · MONTHLY FEES</p><h2>Payment overview</h2><p>Student: {fees[0]?.student_name || "—"} · {fees[0]?.student_user_id || "—"}</p><p className={`transport-profile-status ${transportEnabled ? "enabled" : ""}`}>Transport: {transportEnabled ? `Enabled · ${transportBand} km slab` : "Not opted in"}</p></div><div className="fee-totals"><span>Paid <b>₹{paid.toLocaleString("en-IN")}</b></span><span>Pending <b>₹{pending.toLocaleString("en-IN")}</b></span></div></div>{error && <p className="fee-error">{error}</p>}{!fees.length && !error && <p className="fee-empty">No monthly fee records found.</p>}{months.length > 0 && <><div className="payment-chart-legend"><span><i className="paid-key"/> Paid</span><span><i className="pending-key"/> Pending</span><small>Select a month to view or record its fees.</small></div><div className="payment-month-chart">{months.map((month) => { const percent = month.total ? Math.round((month.paid / month.total) * 100) : 0; return <button type="button" key={month.label} onClick={() => setSelectedMonth(month.label)} className={`payment-month-bar ${month.label === activeMonth?.label ? "selected" : ""}`} title={`${month.label}: ₹${month.paid.toLocaleString("en-IN")} paid of ₹${month.total.toLocaleString("en-IN")}`}><span className="payment-bar-track"><i style={{ height: `${Math.max(percent, month.paid ? 8 : 0)}%` }}/></span><b>{percent}%</b><small>{month.label.slice(0, 3)}</small></button>; })}</div>{activeMonth && <div className="payment-month-detail"><div><span className="eyebrow">{activeMonth.label}</span><b>₹{activeMonth.paid.toLocaleString("en-IN")} / ₹{activeMonth.total.toLocaleString("en-IN")} paid</b></div><div className="payment-fee-chips">{activeMonth.fees.map((fee) => <div key={fee.id} className={`payment-fee-chip ${fee.status === "PAID" ? "done" : "pending"}`}><Receipt size={14}/><span>{fee.fee_type}<small>₹{Number(fee.amount).toLocaleString("en-IN")}</small></span>{fee.status === "PAID" ? <small title={fee.provider_reference || ""}><CheckCircle2 size={13}/> Done · {fee.payment_method}{fee.provider_reference ? ` · ${fee.provider_reference}` : ""}</small> : <button className="fee-pay-button" onClick={() => onPay(fee)}>Make payment</button>}</div>)}</div></div>}</>}</section>;
}
