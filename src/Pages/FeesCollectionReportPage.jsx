import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, Download, RefreshCw, Search, Users, WalletCards } from "lucide-react";
import { getFeeCollections, getFeeReceiptHistory, getTenantContext } from "../lib/api";
import "./FeesCollectionReportPage.css";

const field = (row, camel, snake) => row?.[camel] ?? row?.[snake] ?? "";
const money = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateKey = (value) => value ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) : "";
const paymentDate = (item) => item.collectedAt || item.collected_at || item.paidAt || item.paid_at || item.createdAt || item.created_at;
const paymentAmount = (item) => Number(item.totalAmount ?? item.total_amount ?? item.amount ?? 0);
const dateTimeLabel = (value) => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "Date not recorded";
const pdfText = (value) => String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/[\\()]/g, "\\$&");
const fixedText = (value, length) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, Math.max(0, length - 3))}...` : text.padEnd(length, " ");
};
function createPdf(lines) {
  const reportHeader = lines.slice(0, 7);
  const reportFooter = lines.slice(-3);
  const reportRows = lines.slice(7, -3);
  const rowsPerPage = 31;
  const pages = Array.from({ length: Math.max(1, Math.ceil(reportRows.length / rowsPerPage)) }, (_, index) => {
    const pageHeader = index ? [reportHeader[0], "FEES COLLECTION REPORT - CONTINUED", reportHeader[2], "", reportHeader[4], reportHeader[5], reportHeader[6]] : reportHeader;
    const pageRows = reportRows.slice(index * rowsPerPage, (index + 1) * rowsPerPage);
    return index === Math.max(0, Math.ceil(reportRows.length / rowsPerPage) - 1) ? [...pageHeader, ...pageRows, ...reportFooter] : [...pageHeader, ...pageRows];
  });
  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
  pages.forEach((page, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const header = "q 0.27 0.20 0.67 rg 0 470 842 125 re f Q\nq 0.39 0.31 0.84 rg 0 470 842 9 re f Q\n";
    const content = header + page.map((line, lineIndex) => {
      const y = 555 - lineIndex * 12;
      if (/^-+$/.test(line)) return `0.82 0.84 0.92 RG 42 ${y} m 800 ${y} l S`;
      if (lineIndex === 5) return `q 0.93 0.92 1 rg 34 ${y - 5} 774 16 re f Q\n0.25 0.21 0.52 rg BT /F1 8 Tf 42 ${y} Td (${pdfText(line)}) Tj ET`;
      const isTitle = lineIndex < 3;
      const isData = lineIndex > 6 && lineIndex < page.length - 3;
      const rowFill = isData && lineIndex % 2 ? `q 0.97 0.97 1 rg 34 ${y - 5} 774 12 re f Q\n` : "";
      const colour = isTitle ? "1 1 1 rg" : line.startsWith("Total ") ? "0.07 0.45 0.30 rg" : "0.19 0.23 0.36 rg";
      const size = lineIndex === 0 ? 18 : lineIndex === 1 ? 12 : lineIndex === 2 ? 8 : line.startsWith("Total ") ? 10 : 8;
      return `${rowFill}${colour} BT /F1 ${size} Tf 42 ${y} Td (${pdfText(line)}) Tj ET`;
    }).join("\n");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) { offsets[index] = pdf.length; pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
function rangeFor(mode, value) {
  if (mode === "custom") return value;
  if (!value) return { from: "", to: "" };
  if (mode === "day") return { from: value, to: value };
  if (mode === "year") return { from: `${value}-01-01`, to: `${value}-12-31` };
  const [year, month] = value.split("-").map(Number);
  const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
  return { from: `${value}-01`, to: `${value}-${lastDay}` };
}

export default function FeesCollectionReportPage() {
  const today = todayKey();
  const [academicYear, setAcademicYear] = useState("");
  const [years, setYears] = useState([]);
  const [schoolName, setSchoolName] = useState("School");
  const [records, setRecords] = useState([]);
  const [histories, setHistories] = useState({});
  const [mode, setMode] = useState("month");
  const [period, setPeriod] = useState(today.slice(0, 7));
  const [customRange, setCustomRange] = useState({ from: today, to: today });
  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTenantContext().then((context) => {
      const available = (context.academicYears || []).map((item) => item.name);
      setSchoolName(context.name || "School");
      setYears(available);
      setAcademicYear((context.academicYears || []).find((item) => item.active)?.name || available[0] || "");
    }).catch((failure) => setError(failure.message || "Unable to load academic years."));
  }, []);
  const load = () => {
    if (!academicYear) return;
    setLoading(true); setError(""); setHistories({});
    getFeeCollections(academicYear).then(setRecords).catch((failure) => { setRecords([]); setError(failure.message || "Unable to load fee collection data."); }).finally(() => setLoading(false));
  };
  useEffect(load, [academicYear]);
  useEffect(() => {
    if (!records.length) return;
    let live = true; setHistoryLoading(true);
    Promise.all(records.map(async (record) => {
      const id = field(record, "studentId", "student_id");
      try { const data = await getFeeReceiptHistory(id); return [id, [...(data.receipts || []), ...(data.payments || [])]]; }
      catch { return [id, []]; }
    })).then((entries) => { if (live) setHistories(Object.fromEntries(entries)); }).finally(() => { if (live) setHistoryLoading(false); });
    return () => { live = false; };
  }, [records]);

  const range = useMemo(() => rangeFor(mode, mode === "custom" ? customRange : period), [mode, period, customRange]);
  const students = useMemo(() => records.map((row) => ({ id: String(field(row, "studentId", "student_id")), name: field(row, "studentName", "student_name"), roll: field(row, "rollNumber", "roll_number"), className: field(row, "className", "class_name"), section: field(row, "sectionName", "section_name") })).sort((a, b) => a.name.localeCompare(b.name)), [records]);
  const selectedRecords = useMemo(() => records.filter((row) => !studentId || String(field(row, "studentId", "student_id")) === studentId), [records, studentId]);
  const reportRows = useMemo(() => selectedRecords.map((row) => {
    const id = String(field(row, "studentId", "student_id"));
    const receipts = histories[id] || [];
    const periodCollections = receipts.filter((item) => { const date = dateKey(paymentDate(item)); return (!range.from || date >= range.from) && (!range.to || date <= range.to); }).sort((a, b) => new Date(paymentDate(b)) - new Date(paymentDate(a)));
    const collected = periodCollections.reduce((sum, item) => sum + paymentAmount(item), 0);
    const total = Number(field(row, "totalAmount", "total_amount"));
    const paidUntilPeriodEnd = receipts.filter((item) => !range.to || dateKey(paymentDate(item)) <= range.to).reduce((sum, item) => sum + paymentAmount(item), 0);
    return { id, name: field(row, "studentName", "student_name"), roll: field(row, "rollNumber", "roll_number"), className: field(row, "className", "class_name"), section: field(row, "sectionName", "section_name"), collected, pending: Math.max(0, total - paidUntilPeriodEnd), total, periodCollections };
  }), [selectedRecords, histories, range]);
  const visibleRows = useMemo(() => reportRows.filter((row) => `${row.name} ${row.roll} ${row.className} ${row.section}`.toLowerCase().includes(query.toLowerCase())), [reportRows, query]);
  const totals = useMemo(() => visibleRows.reduce((sum, row) => ({ collected: sum.collected + row.collected, pending: sum.pending + row.pending, invoiced: sum.invoiced + row.total }), { collected: 0, pending: 0, invoiced: 0 }), [visibleRows]);
  const periodLabel = range.from && range.to ? range.from === range.to ? new Date(`${range.from}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : `${new Date(`${range.from}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(`${range.to}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Choose a period";
  const changeMode = (next) => { setMode(next); setPeriod(next === "day" ? today : next === "month" ? today.slice(0, 7) : next === "year" ? today.slice(0, 4) : ""); };
  const downloadReport = () => {
    const divider = "-".repeat(126);
    const reportLines = visibleRows.flatMap((row) => row.periodCollections.length ? row.periodCollections.map((item) => [fixedText(row.name, 20), fixedText(row.roll || "-", 10), fixedText(`${row.className}${row.section ? `-${row.section}` : ""}`, 14), fixedText(dateTimeLabel(paymentDate(item)), 24), fixedText(`INR ${paymentAmount(item).toFixed(2)}`, 16), fixedText(`INR ${row.total.toFixed(2)}`, 16), `INR ${row.pending.toFixed(2)}`].join(" ")) : [[fixedText(row.name, 20), fixedText(row.roll || "-", 10), fixedText(`${row.className}${row.section ? `-${row.section}` : ""}`, 14), fixedText("No collection in period", 24), fixedText("INR 0.00", 16), fixedText(`INR ${row.total.toFixed(2)}`, 16), `INR ${row.pending.toFixed(2)}`].join(" ")]);
    const pdf = createPdf([schoolName.toUpperCase(), "FEES COLLECTION REPORT", `Period: ${periodLabel} | Academic year: ${academicYear} | ${studentId ? "Student-wise report" : "All students report"}`, "", divider, "Student              Roll       Class / Section  Collection date & time   Collection amount  Invoice total      Pending", divider, ...reportLines, divider, `Total collection: INR ${totals.collected.toFixed(2)}`, `Total pending: INR ${totals.pending.toFixed(2)}`]);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a"); link.href = url; link.download = `fees-collection-${range.from || "report"}-to-${range.to || "report"}.pdf`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="module-page fees-report-page"><div className="module-title"><div className="module-icon"><CircleDollarSign size={24}/></div><div><p className="eyebrow">REPORTS · STUDENT FINANCE</p><h1>Fees Collection Report</h1><p className="subtle">Review collected fees and outstanding balances by day, month, year or student.</p></div><div className="fees-report-actions"><button type="button" className="fees-report-download" onClick={downloadReport} disabled={loading || historyLoading}><Download size={15}/> Download report</button><button type="button" className="fees-report-refresh" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh</button></div></div>
    {error && <p className="auth-error">{error}</p>}
    <section className="fees-report-filters"><label><span>Academic year</span><select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>{years.map((year) => <option key={year}>{year}</option>)}</select></label><div className="fees-report-period"><span>Report period</span><div role="group" aria-label="Report period"><button type="button" className={mode === "day" ? "active" : ""} onClick={() => changeMode("day")}>Day</button><button type="button" className={mode === "month" ? "active" : ""} onClick={() => changeMode("month")}>Month</button><button type="button" className={mode === "year" ? "active" : ""} onClick={() => changeMode("year")}>Year</button><button type="button" className={mode === "custom" ? "active" : ""} onClick={() => changeMode("custom")}>Custom</button></div></div>{mode === "custom" ? <><label><span>From</span><input type="date" value={customRange.from} onChange={(event) => setCustomRange((value) => ({ ...value, from: event.target.value }))}/></label><label><span>To</span><input type="date" min={customRange.from || undefined} value={customRange.to} onChange={(event) => setCustomRange((value) => ({ ...value, to: event.target.value }))}/></label></> : <label><span>Select {mode}</span><input type={mode === "month" ? "month" : mode === "year" ? "number" : "date"} min={mode === "year" ? "2000" : undefined} max={mode === "year" ? "2100" : undefined} value={period} onChange={(event) => setPeriod(event.target.value)}/></label>}<label className="fees-report-student"><span>Student-wise report</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">All students</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.roll || "No roll"} · {student.className}{student.section ? `-${student.section}` : ""}</option>)}</select></label></section>
    <p className="fees-report-caption"><CalendarDays size={15}/>{periodLabel}{studentId ? " · Student-wise view" : " · All students"}</p>
    <section className="fees-report-summary"><article className="collected"><CircleDollarSign size={20}/><div><span>Total collection</span><b>{money(totals.collected)}</b><small>Payments received in this period</small></div></article><article className="pending"><WalletCards size={20}/><div><span>Total pending</span><b>{money(totals.pending)}</b><small>Outstanding as of period end</small></div></article><article className="students"><Users size={20}/><div><span>Students included</span><b>{visibleRows.length}</b><small>{money(totals.invoiced)} invoice value</small></div></article></section>
    <section className="panel fees-report-table"><header><div><h2>Student collection details</h2><p>{historyLoading ? "Loading payment history to calculate the selected period…" : "Collection date and time are shown in IST."}</p></div><label className="fees-report-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search within report"/></label></header><div className="fees-report-table-scroll"><table><thead><tr><th>Student</th><th>Class / section</th><th>Collection date & time</th><th>Invoice total</th><th>Collected in period</th><th>Pending as of period end</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><b>{row.name}</b><small>{row.roll || "No roll number"}</small></td><td>{row.className || "—"}{row.section ? ` · ${row.section}` : ""}</td><td className="collection-date">{row.periodCollections.length ? <>{row.periodCollections.slice(0, 2).map((item, index) => <span key={`${paymentDate(item)}-${index}`}>{dateTimeLabel(paymentDate(item))} · {money(paymentAmount(item))}</span>)}{row.periodCollections.length > 2 && <small>+{row.periodCollections.length - 2} more collection(s) in download</small>}</> : <span>No collection in period</span>}</td><td>{money(row.total)}</td><td className="amount-collected">{money(row.collected)}</td><td className={row.pending ? "amount-pending" : "amount-clear"}>{money(row.pending)}</td></tr>)}{!loading && !visibleRows.length && <tr><td colSpan="6" className="fees-report-empty">No students match the selected filters.</td></tr>}</tbody></table></div></section>
  </div>;
}
