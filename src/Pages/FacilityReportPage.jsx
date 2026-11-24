import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Package, RefreshCw, Users, WalletCards } from "lucide-react";
import { getFacilityProducts, getFacilityProductStudents } from "../lib/api";
import "./FacilityReportPage.css";

const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateKey = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) : "";
};
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentDate = (row) => row?.paidAt || row?.paid_at || row?.paymentAt || row?.payment_at || row?.paymentDate || row?.payment_date || row?.payment_updated_at || row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at;
const isPaid = (row) => row?.paid === true || row?.paid === 1 || row?.paid === "true" || row?.payment_status === "PAID";
const productPrice = (row) => Number(row?.price ?? row?.unitPrice ?? row?.unit_price ?? row?.amount ?? 0) || 0;
const rangeFor = (mode, value) => {
  if (!value) return { from: "", to: "" };
  if (mode === "day") return { from: value, to: value };
  if (mode === "year") return { from: `${value}-01-01`, to: `${value}-12-31` };
  const [year, month] = value.split("-").map(Number);
  return { from: `${value}-01`, to: `${value}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}` };
};
const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "Not recorded";

export default function FacilityReportPage() {
  const today = todayKey();
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState({});
  const [mode, setMode] = useState("month");
  const [period, setPeriod] = useState(today.slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => rangeFor(mode, period), [mode, period]);
  const load = () => {
    setLoading(true); setError("");
    getFacilityProducts().then(async (items) => {
      const productList = Array.isArray(items) ? items : items?.products || [];
      setProducts(productList);
      const entries = await Promise.all(productList.map(async (item) => {
        try { return [item.id, await getFacilityProductStudents(item.id)]; } catch { return [item.id, []]; }
      }));
      setPayments(Object.fromEntries(entries));
    }).catch((failure) => { setProducts([]); setPayments({}); setError(failure.message || "Unable to load facility report data."); }).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const rows = useMemo(() => products.map((product) => {
    const students = Array.isArray(payments[product.id]) ? payments[product.id] : [];
    const paidStudents = students.filter(isPaid);
    const periodPayments = paidStudents.filter((student) => { const date = dateKey(paymentDate(student)); return date && (!range.from || date >= range.from) && (!range.to || date <= range.to); });
    const rate = productPrice(product);
    const due = students.filter((student) => !isPaid(student)).length;
    return { id: product.id, name: product.name || "Unnamed facility", category: product.category || "Other", rate, paid: paidStudents.length, due, collected: periodPayments.length * rate, pending: due * rate, latestPayment: periodPayments.sort((a, b) => new Date(paymentDate(b)) - new Date(paymentDate(a)))[0] };
  }), [payments, products, range]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({ collected: sum.collected + row.collected, pending: sum.pending + row.pending, paid: sum.paid + row.paid, due: sum.due + row.due }), { collected: 0, pending: 0, paid: 0, due: 0 }), [rows]);
  const periodLabel = !range.from || !range.to ? "All available records" : range.from === range.to ? new Date(`${range.from}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : `${new Date(`${range.from}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(`${range.to}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  const changeMode = (next) => { setMode(next); setPeriod(next === "day" ? today : next === "month" ? today.slice(0, 7) : today.slice(0, 4)); };
  const download = () => {
    const report = [["Facility Collection Report"], [`Period: ${periodLabel}`], [], ["Facility", "Category", "Unit price", "Paid students", "Pending students", "Collected in period", "Pending amount", "Latest payment (IST)"], ...rows.map((row) => [row.name, row.category, row.rate.toFixed(2), row.paid, row.due, row.collected.toFixed(2), row.pending.toFixed(2), dateTime(paymentDate(row.latestPayment))]), [], ["Total collected", totals.collected.toFixed(2)], ["Total pending", totals.pending.toFixed(2)]].map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/csv;charset=utf-8;" })); const link = document.createElement("a"); link.href = url; link.download = `facility-report-${range.from}-to-${range.to}.csv`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="module-page facility-report-page"><div className="module-title"><div className="module-icon"><Package size={24}/></div><div><p className="eyebrow">REPORTS · SCHOOL FACILITIES</p><h1>Facility Report</h1><p className="subtle">Track facility payments, pending balances and student allocations by period.</p></div><div className="facility-report-actions"><button type="button" className="facility-report-download" disabled={loading} onClick={download}><Download size={15}/> Download CSV</button><button type="button" className="facility-report-refresh" disabled={loading} onClick={load}><RefreshCw size={15}/> Refresh</button></div></div>
    {error && <p className="auth-error">{error}</p>}<section className="facility-report-filters"><div><span>Report period</span><div className="facility-report-modes"><button type="button" className={mode === "day" ? "active" : ""} onClick={() => changeMode("day")}>Day</button><button type="button" className={mode === "month" ? "active" : ""} onClick={() => changeMode("month")}>Month</button><button type="button" className={mode === "year" ? "active" : ""} onClick={() => changeMode("year")}>Year</button></div></div><label><span>Select {mode}</span><input type={mode === "day" ? "date" : mode === "month" ? "month" : "number"} min={mode === "year" ? "2000" : undefined} max={mode === "year" ? "2100" : undefined} value={period} onChange={(event) => setPeriod(event.target.value)}/></label></section>
    <p className="facility-report-caption"><CalendarDays size={15}/> {periodLabel} · Payment timestamps are shown in IST.</p><section className="facility-report-summary"><article className="collected"><WalletCards size={20}/><div><span>Collected in period</span><b>{money(totals.collected)}</b><small>{totals.paid} paid student allocation(s)</small></div></article><article className="pending"><WalletCards size={20}/><div><span>Pending amount</span><b>{money(totals.pending)}</b><small>{totals.due} student allocation(s) pending</small></div></article><article className="products"><Users size={20}/><div><span>Facility items</span><b>{rows.length}</b><small>Products currently tracked</small></div></article></section>
    <section className="panel facility-report-table"><header><div><h2>Facility collection details</h2><p>Set a unit price and retain payment timestamps in the facility API for monetary tracking.</p></div></header><div><table><thead><tr><th>Facility</th><th>Category</th><th>Unit price</th><th>Paid</th><th>Pending</th><th>Collected in period</th><th>Pending amount</th><th>Latest payment</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.name}</b></td><td>{row.category}</td><td>{money(row.rate)}</td><td className="facility-paid">{row.paid}</td><td className="facility-due">{row.due}</td><td className="facility-paid">{money(row.collected)}</td><td className="facility-due">{money(row.pending)}</td><td>{dateTime(paymentDate(row.latestPayment))}</td></tr>)}{!loading && !rows.length && <tr><td colSpan="8" className="facility-report-empty">No facility products are available to report.</td></tr>}</tbody></table></div></section></div>;
}
