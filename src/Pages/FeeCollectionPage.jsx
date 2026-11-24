import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleDollarSign, Printer, Search, X } from "lucide-react";
import { collectFeeReceipt, getFeeCollections, getFeeReceiptHistory, getFeeReceiptOptions, getStudents, getTenantContext } from "../lib/api";
import "./FeeCollectionPage.css";

const periodDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const field = (row, camel, snake) => row?.[camel] ?? row?.[snake] ?? "";
export default function FeeCollectionPage({ user }) {
  const [records, setRecords] = useState([]), [query, setQuery] = useState(""), [classFilter, setClassFilter] = useState("All classes"), [sectionFilter, setSectionFilter] = useState("All sections"), [academicYear, setAcademicYear] = useState(""), [error, setError] = useState(""), [refreshKey, setRefreshKey] = useState(0);
  const [savedYears, setSavedYears] = useState([]), [schoolName, setSchoolName] = useState("");
  const [collectOpen, setCollectOpen] = useState(false), [studentSearch, setStudentSearch] = useState(""), [collectClass, setCollectClass] = useState(""), [collectSection, setCollectSection] = useState(""), [appliedStudentFilters, setAppliedStudentFilters] = useState({ search: "", className: "", section: "" }), [studentDirectory, setStudentDirectory] = useState([]), [studentId, setStudentId] = useState(""), [options, setOptions] = useState(null), [selectedFees, setSelectedFees] = useState([]), [paymentMethod, setPaymentMethod] = useState("CASH"), [collecting, setCollecting] = useState(false), [collectError, setCollectError] = useState("");
  const [receipt, setReceipt] = useState(null), [periodStart, setPeriodStart] = useState(""), [periodEnd, setPeriodEnd] = useState("");
  const [historyStudent, setHistoryStudent] = useState(null), [receiptHistory, setReceiptHistory] = useState([]), [paymentHistory, setPaymentHistory] = useState([]), [historyLoading, setHistoryLoading] = useState(false), [historyError, setHistoryError] = useState("");
  const printedReceipt = useRef(null);

  useEffect(() => {
    getTenantContext().then((context) => {
      setSchoolName(context.name || "School");
      setSavedYears((context.academicYears || []).map((year) => year.name));
      setAcademicYear((context.academicYears || []).find((year) => year.active)?.name || context.academicYears?.[0]?.name || "");
    }).catch((failure) => setError(failure.message || "Unable to load school settings."));
  }, []);
  useEffect(() => {
    if (!academicYear) { setRecords([]); return undefined; }
    let live = true;
    getFeeCollections(academicYear).then((rows) => { if (live) { setRecords(rows); setError(""); } }).catch((failure) => { if (live) { setRecords([]); setError(failure.message || "Unable to load fee collection."); } });
    return () => { live = false; };
  }, [academicYear, refreshKey]);
  useEffect(() => {
    if (!receipt || printedReceipt.current === receipt.id) return undefined;
    printedReceipt.current = receipt.id;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  const classes = useMemo(() => [...new Set(records.map((row) => field(row, "className", "class_name")).filter(Boolean))], [records]);
  const sections = useMemo(() => [...new Set(records.filter((row) => classFilter === "All classes" || field(row, "className", "class_name") === classFilter).map((row) => field(row, "sectionName", "section_name")).filter(Boolean))], [records, classFilter]);
  const visible = useMemo(() => records.filter((row) => {
    const className = field(row, "className", "class_name"), section = field(row, "sectionName", "section_name");
    return (classFilter === "All classes" || className === classFilter) && (sectionFilter === "All sections" || section === sectionFilter) && `${field(row, "studentName", "student_name")} ${field(row, "studentUserId", "student_user_id")} ${field(row, "rollNumber", "roll_number")} ${className} ${section}`.toLowerCase().includes(query.toLowerCase());
  }), [records, query, classFilter, sectionFilter]);
  const totals = useMemo(() => ({
    collected: records.reduce((sum, row) => sum + Number(field(row, "paidAmount", "paid_amount")) + Number(field(row, "receiptCollectedAmount", "receipt_collected_amount")), 0),
    pending: records.reduce((sum, row) => sum + Number(field(row, "pendingAmount", "pending_amount")), 0),
    students: records.length,
  }), [records]);
  const yearOptions = [...new Set(savedYears)];
  const collectClasses = [...new Set(studentDirectory.map((student) => field(student, "className", "class_name")).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const collectSections = [...new Set(studentDirectory.filter((student) => !collectClass || field(student, "className", "class_name") === collectClass).map((student) => field(student, "sectionName", "section_name")).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const matchingStudents = studentDirectory.filter((student) => {
    const className = field(student, "className", "class_name"), sectionName = field(student, "sectionName", "section_name");
    const searchText = `${field(student, "name", "display_name")} ${field(student, "rollNumber", "roll_number")}`.toLowerCase();
    return (!appliedStudentFilters.search || searchText.includes(appliedStudentFilters.search)) && (!appliedStudentFilters.className || className === appliedStudentFilters.className) && (!appliedStudentFilters.section || sectionName === appliedStudentFilters.section);
  });
  const selectedTotal = (options?.items || []).filter((item) => selectedFees.includes(item.feeType)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const historyItems = [...receiptHistory.map((data) => ({ kind: "receipt", date: data.collectedAt, data })), ...paymentHistory.map((data) => ({ kind: "payment", date: data.paidAt, data }))].sort((a, b) => new Date(b.date) - new Date(a.date));

  const openCollect = async () => { setCollectOpen(true); setStudentSearch(""); setCollectClass(""); setCollectSection(""); setAppliedStudentFilters({ search: "", className: "", section: "" }); setStudentId(""); setOptions(null); setSelectedFees([]); setPeriodStart(""); setPeriodEnd(""); setCollectError(""); try { setStudentDirectory(await getStudents()); } catch (failure) { setStudentDirectory([]); setCollectError(failure.message || "Unable to load students."); } };
  const chooseStudent = async (id) => {
    setStudentId(id); setOptions(null); setSelectedFees([]); setCollectError("");
    if (!id) return;
    try { setOptions(await getFeeReceiptOptions(id, academicYear)); }
    catch (failure) { setCollectError(failure.message || "Unable to load this student's fee structure."); }
  };
  const toggleFee = (feeType) => setSelectedFees((current) => current.includes(feeType) ? current.filter((item) => item !== feeType) : [...current, feeType]);
  const done = async () => {
    if (!studentId || !selectedFees.length) return;
    setCollecting(true); setCollectError("");
    try {
      const saved = await collectFeeReceipt({ studentId, academicYear, feeTypes: selectedFees, paymentMethod, periodStart, periodEnd });
      setReceipt({ ...saved, collectingOfficer: user?.displayName || user?.name || saved.collectingOfficer || "School Office" });
      setRefreshKey((current) => current + 1);
      setCollectOpen(false);
    } catch (failure) { setCollectError(failure.message || "Unable to collect these fees."); }
    finally { setCollecting(false); }
  };
  const openStudentHistory = async (row) => {
    setHistoryStudent(row); setReceiptHistory([]); setPaymentHistory([]); setHistoryError(""); setHistoryLoading(true);
    try { const history = await getFeeReceiptHistory(field(row, "studentId", "student_id")); setReceiptHistory(history.receipts || []); setPaymentHistory(history.payments || []); }
    catch (failure) { setHistoryError(failure.message || "Unable to load payment history."); }
    finally { setHistoryLoading(false); }
  };
  const previewHistoricalReceipt = (historicalReceipt) => { printedReceipt.current = historicalReceipt.id; setReceipt(historicalReceipt); };

  return <div className="module-page fee-collection-page"><div className="module-title"><div className="module-icon"><CircleDollarSign size={24}/></div><div><p className="eyebrow">STUDENT FINANCE</p><h1>Fee Collection</h1><p className="subtle">Track fee payments and issue printed receipts.</p></div><div className="fee-collection-actions"><select aria-label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>{!yearOptions.length && <option value="">No academic years configured</option>}{yearOptions.map((year) => <option key={year}>{year}</option>)}</select><button type="button" className="primary-btn" onClick={openCollect} disabled={!academicYear}><CircleDollarSign size={16}/> Collect fees</button></div></div>{error && <p className="auth-error">{error}</p>}
    <section className="fee-summary-grid"><Summary tone="emerald" label="Total collected" value={money(totals.collected)}/><Summary tone="amber" label="Pending invoice amount" value={money(totals.pending)}/><Summary tone="indigo" label="Students" value={totals.students}/></section>
    <section className="panel table-panel fee-collection-table"><div className="fee-collection-filters"><label className="fee-search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, roll number, ID, class or section"/></label><select aria-label="Filter by class" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setSectionFilter("All sections"); }}><option>All classes</option>{classes.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by section" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}><option>All sections</option>{sections.map((item) => <option key={item}>{item}</option>)}</select></div><table><thead><tr><th>Student name</th><th>Roll number</th><th>Class / section</th><th>Invoice total</th><th>Collected</th><th>Pending</th><th>Status</th></tr></thead><tbody>{visible.map((row) => { const pending = Number(field(row, "pendingAmount", "pending_amount")), paid = Number(field(row, "paidAmount", "paid_amount")) + Number(field(row, "receiptCollectedAmount", "receipt_collected_amount")); return <tr key={field(row, "studentId", "student_id")} className="fee-student-row" tabIndex={0} aria-label={`Open payment history for ${field(row, "studentName", "student_name")}`} onClick={() => openStudentHistory(row)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openStudentHistory(row); } }}><td><div className="person"><div className="avatar avatar-indigo">{String(field(row, "studentName", "student_name")).split(" ").map((word) => word[0]).join("")}</div><div><button type="button" className="fee-student-history-link" onClick={(event) => { event.stopPropagation(); openStudentHistory(row); }}>{field(row, "studentName", "student_name")}</button><small className="block text-slate-400">{field(row, "studentUserId", "student_user_id")}</small></div></div></td><td>{field(row, "rollNumber", "roll_number") || "—"}</td><td>{field(row, "className", "class_name") || "—"} · {field(row, "sectionName", "section_name") || "—"}</td><td>{money(field(row, "totalAmount", "total_amount"))}</td><td className="text-emerald-600">{money(paid)}</td><td className={pending ? "font-bold text-rose-600" : "text-slate-400"}>{money(pending)}</td><td><span className={`fee-list-status ${pending ? "pending" : "paid"}`}>{!Number(row.invoice_count) ? "Not configured" : pending ? "Payment due" : "Paid"}</span></td></tr>; })}{!visible.length && <tr><td colSpan="7" className="empty-students">No students match these filters.</td></tr>}</tbody></table></section>

    {collectOpen && <div className="fee-collect-overlay" role="presentation"><section className="fee-collect-modal" role="dialog" aria-modal="true" aria-labelledby="fee-collect-title"><header><div><p className="eyebrow">RECEIPT COLLECTION</p><h2 id="fee-collect-title">Collect fees</h2><span>{academicYear}</span></div><button type="button" className="fee-modal-close" aria-label="Close" onClick={() => setCollectOpen(false)}><X size={19}/></button></header><div className="fee-collect-body"><div className="fee-student-filters"><label className="fee-student-search"><span>Student name or roll number</span><div><Search size={16}/><input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Enter student name or roll number"/></div></label><label className="fee-student-select"><span>Class</span><select value={collectClass} onChange={(e) => { setCollectClass(e.target.value); setCollectSection(""); }}><option value="">All classes</option>{collectClasses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="fee-student-select"><span>Section</span><select value={collectSection} onChange={(e) => setCollectSection(e.target.value)}><option value="">All sections</option>{collectSections.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button type="button" className="fee-student-search-button" onClick={() => { setAppliedStudentFilters({ search: studentSearch.trim().toLowerCase(), className: collectClass, section: collectSection }); setStudentId(""); setOptions(null); setSelectedFees([]); }}>Search</button></div><label className="fee-student-select"><span>Matching students ({matchingStudents.length})</span><select value={studentId} onChange={(e) => chooseStudent(e.target.value)}><option value="">Select student</option>{matchingStudents.map((student) => <option key={field(student, "id", "id")} value={field(student, "id", "id")}>{field(student, "name", "display_name")} · Roll {field(student, "rollNumber", "roll_number") || "—"} · {field(student, "className", "class_name")}{field(student, "sectionName", "section_name") ? ` - ${field(student, "sectionName", "section_name")}` : ""}</option>)}</select></label>{options && <><div className="fee-selected-student"><b>{options.student.name}</b><span>{options.student.className}{options.student.sectionName ? ` · ${options.student.sectionName}` : ""} {options.student.rollNumber ? `· Roll ${options.student.rollNumber}` : ""}</span></div><div className="fee-checklist-heading"><b>Select fee items</b><small>Amounts are taken from the class fee structure</small></div><div className="fee-checklist">{options.items.map((item) => { const isPaid = item.paid === true; return <label key={item.feeType} className={`${Number(item.amount) ? "" : "disabled"}${isPaid ? " paid" : ""}`}><input type="checkbox" disabled={!Number(item.amount) || isPaid} checked={isPaid || selectedFees.includes(item.feeType)} onChange={() => toggleFee(item.feeType)}/><span className="fee-checkmark"><Check size={13}/></span><span className="fee-option-label">{item.feeType}{isPaid ? " · Paid" : ""}</span><b>{Number(item.amount) ? money(item.amount) : "—"}</b></label>; })}</div>{!options.items.some((item) => Number(item.amount) > 0 && !item.paid) && <p className="fee-no-structure">All configured fee items have already been collected for this academic year.</p>}<div className="fee-period-fields"><label><span>Period from</span><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required/></label><label><span>Period to</span><input type="date" value={periodEnd} min={periodStart || undefined} onChange={(e) => setPeriodEnd(e.target.value)} required/></label></div><label className="fee-payment-method"><span>Payment method</span><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CHEQUE">Cheque</option><option value="CARD">Card</option></select></label><div className="fee-selection-total"><span>Receipt total</span><b>{money(selectedTotal)}</b></div></>}{collectError && <p className="auth-error" role="alert">{collectError}</p>}</div><footer><button type="button" className="fee-cancel-btn" onClick={() => setCollectOpen(false)}>Cancel</button><button type="button" className="primary-btn" disabled={!selectedFees.length || !periodStart || !periodEnd || periodStart > periodEnd || collecting} onClick={done}>{collecting ? "Saving…" : "Done and generate receipt"}</button></footer></section></div>}

    {historyStudent && <div className="fee-history-overlay" onClick={() => setHistoryStudent(null)}><section className="fee-history-modal" role="dialog" aria-modal="true" aria-labelledby="fee-history-title" onClick={(event) => event.stopPropagation()}><header><div><p className="eyebrow">STUDENT FINANCE</p><h2 id="fee-history-title">Payment history</h2><p>{field(historyStudent, "studentName", "student_name")} · {field(historyStudent, "className", "class_name")} {field(historyStudent, "sectionName", "section_name")}</p></div><button type="button" className="fee-modal-close" aria-label="Close history" onClick={() => setHistoryStudent(null)}><X size={19}/></button></header><div className="fee-history-body">{historyLoading && <p className="fee-history-message">Loading payment history…</p>}{historyError && <p className="fee-history-error">{historyError}</p>}{!historyLoading && !historyError && !historyItems.length && <p className="fee-history-message">No payments or receipts have been recorded for this student.</p>}{historyItems.length > 0 && <div className="fee-history-list">{historyItems.map(({ kind, data: item }) => <article className="fee-history-item" key={`${kind}-${item.id}`}><div className="fee-history-date"><b>{new Date(kind === "receipt" ? item.collectedAt : item.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b><small>{new Date(kind === "receipt" ? item.collectedAt : item.paidAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small></div><div className="fee-history-detail"><b>{kind === "receipt" ? item.receiptNumber : "Fee payment"}</b><span>{kind === "receipt" ? item.items.map((fee) => fee.feeType).join(", ") : `${item.feeType}${item.monthLabel ? ` · ${item.monthLabel}` : ""}`}</span><small>{item.paymentMethod} · {item.academicYear}{kind === "payment" && item.reference ? ` · ${item.reference}` : ""}</small></div><strong>{money(kind === "receipt" ? item.totalAmount : item.amount)}</strong>{kind === "receipt" ? <button type="button" className="fee-history-pdf" onClick={() => previewHistoricalReceipt(item)}><Printer size={14}/> View / PDF</button> : <span className="fee-history-payment-tag">Paid</span>}</article>)}</div>}</div></section></div>}
    {receipt && <div className="fee-receipt-overlay"><div className="fee-receipt-actions"><button type="button" onClick={() => window.print()}><Printer size={16}/> Print / Save PDF</button><button type="button" aria-label="Close receipt" onClick={() => setReceipt(null)}><X size={18}/></button></div><ReceiptDocument receipt={receipt} schoolName={schoolName} onClose={() => setReceipt(null)}/></div>}
  </div>;
}

function Summary({ tone, label, value }) { const colors = { emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", indigo: "bg-indigo-50 text-indigo-700" }; return <article className={`rounded-2xl p-5 shadow-[4px_6px_0_#e1e3f2] ${colors[tone]}`}><small className="block text-[11px] font-bold opacity-70">{label}</small><b className="mt-2 block text-2xl">{value}</b></article>; }

function ReceiptDocument({ receipt, schoolName, onClose }) {
  const selected = new Map(receipt.items.map((item) => [item.feeType, Number(item.amount)]));
  const date = new Date(receipt.collectedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const account = receipt.items.map((item) => item.feeType).join(", ");
  return <article className="fee-receipt-print"><div className="fee-receipt-header"><div className="fee-receipt-seal">{schoolName.slice(0, 1).toUpperCase()}</div><div><div className="fee-receipt-title">FEE RECEIPT</div><div className="fee-receipt-school">{schoolName || receipt.schoolName}</div><div className="fee-receipt-location">SCHOOL FEE COLLECTION</div></div></div><div className="fee-receipt-meta"><span>Date <b>{date}</b></span><span>Sl. No. <b>{receipt.receiptNumber}</b></span></div>{receipt.periodStart && receipt.periodEnd && <div className="fee-receipt-period"><span>Period covered</span><b>{periodDate(receipt.periodStart)} to {periodDate(receipt.periodEnd)}</b></div>}<div className="fee-receipt-line"><span>Received from</span><b>{receipt.student.name}</b></div><div className="fee-receipt-line"><span>Class</span><b>{receipt.student.className}{receipt.student.sectionName ? ` · ${receipt.student.sectionName}` : ""}</b><span>Roll No.</span><b>{receipt.student.rollNumber || receipt.student.admissionNumber}</b></div><div className="fee-receipt-line"><span>Rupees</span><b>{money(receipt.totalAmount)}</b><span>on account of</span></div><div className="fee-receipt-account">{account}</div><table className="fee-receipt-table"><thead><tr><th>PARTICULARS</th><th>Amount (₹)</th></tr></thead><tbody>{receipt.items.map((item, index) => <tr key={item.feeType}><td>{index + 1}. {item.feeType}</td><td>{money(item.amount)}</td></tr>)}</tbody><tfoot><tr><th>TOTAL</th><th>{money(receipt.totalAmount)}</th></tr></tfoot></table><div className="fee-receipt-words"><span>In words Rupees -</span><b>{numberToIndianWords(receipt.totalAmount)} only</b></div><div className="fee-receipt-payment">Payment mode: {receipt.paymentMethod}</div><div className="fee-receipt-officer"><span>{receipt.collectingOfficer || "School Office"}</span><b>Collecting Officer</b></div><button type="button" className="fee-receipt-close" onClick={onClose}>Close receipt</button></article>;
}

function numberToIndianWords(amount) {
  const value = Math.round(Number(amount || 0) * 100) / 100;
  const rupees = Math.floor(value), paise = Math.round((value - rupees) * 100);
  const words = (number) => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if (number < 20) return ones[number];
    if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ""}`;
    if (number < 1000) return `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${words(number % 100)}` : ""}`;
    for (const [unit, size] of [["Crore", 10000000], ["Lakh", 100000], ["Thousand", 1000]]) if (number >= size) return `${words(Math.floor(number / size))} ${unit}${number % size ? ` ${words(number % size)}` : ""}`;
    return "";
  };
  return `${words(rupees) || "Zero"} Rupees${paise ? ` and ${words(paise)} Paise` : ""}`;
}
