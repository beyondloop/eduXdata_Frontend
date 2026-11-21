import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getHolidays, getMyAttendance } from "../lib/api";

function profileValue(user, keys, fallback = "student") { return keys.map((key) => user?.[key]).find(Boolean) || fallback; }
function localDateKey(year, month, day) { return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }

export default function AttendancePage({ user }) {
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [records, setRecords] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = new Date();
  const year = monthDate.getFullYear(); const monthIndex = monthDate.getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const from = localDateKey(year, monthIndex, 1); const to = localDateKey(year, monthIndex, totalDays);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    const refresh = () => Promise.all([getMyAttendance(from, to), getHolidays()]).then(([entries, holidayEntries]) => {
      if (!cancelled) setHolidays(holidayEntries);
      if (!cancelled) setRecords(Object.fromEntries(entries.map((entry) => [String(entry.attendanceDate || entry.attendance_date).slice(0, 10), entry.status])));
    }).catch((failure) => { if (!cancelled) setError(failure.message || "Unable to load attendance."); }).finally(() => { if (!cancelled) setLoading(false); });
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [from, to]);

  const holidaysByDate = useMemo(() => holidays.reduce((dates, holiday) => {
    const date = String(holiday.holidayDate ?? holiday.holiday_date ?? "").slice(0, 10);
    const name = holiday.eventName ?? holiday.event_name ?? "Holiday";
    dates[date] = dates[date] ? dates[date] + ", " + name : name;
    return dates;
  }, {}), [holidays]);

  const days = [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, index) => index + 1)];
  const statusFor = (day) => {
    const key = localDateKey(year, monthIndex, day); const current = new Date(year, monthIndex, day);
    if (holidaysByDate[key]) return "holiday";
    if (current.getDay() === 0 || current.getDay() === 6) return "weekend";
    if (records[key] === "PRESENT") return "present";
    if (records[key] === "ABSENT") return "absent";
    if (current > new Date(today.getFullYear(), today.getMonth(), today.getDate())) return "future";
    return "unmarked";
  };
  const totals = useMemo(() => Object.values(records).reduce((value, status) => ({ ...value, [status.toLowerCase()]: (value[status.toLowerCase()] || 0) + 1 }), { present: 0, absent: 0 }), [records]);
  const marked = totals.present + totals.absent; const attendanceRate = marked ? Math.round((totals.present / marked) * 100) : 0;
  const month = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }); const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  return <div className="attendance-page !mx-auto !w-full !max-w-[1200px]"><div className="attendance-hero !min-h-[226px] !w-full"><div><span className="eyebrow attendance-eyebrow">YOUR SCHOOL RHYTHM</span><h1>Attendance that tells your story</h1><p>Your teacher's marked attendance appears here, {profileValue(user, ["displayName"])}.</p><div className="attendance-hero-tags"><span>{today.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span></div></div><div className="attendance-ring" style={{ background: `conic-gradient(#ffe17b 0 ${attendanceRate}%, #ffffff2b ${attendanceRate}% 100%)` }}><div><b>{attendanceRate}</b><small>%</small><span>present</span></div></div></div><div className="attendance-summary"><div className="attendance-stat present-stat"><span>Present</span><div><small>Present this month</small><b>{totals.present} days</b><em>Marked by your teacher</em></div></div><div className="attendance-stat absent-stat"><span>Absent</span><div><small>Absent this month</small><b>{totals.absent} days</b><em>Marked by your teacher</em></div></div><div className="attendance-stat late-stat"><span>Records</span><div><small>Total marked</small><b>{marked} days</b><em>Stored for one year</em></div></div></div>{error && <p className="auth-error">{error}</p>}<div className="attendance-content"><section className="attendance-calendar-card"><div className="attendance-card-head"><div><span className="eyebrow">MONTHLY VIEW</span><h2>{month}</h2></div><div className="month-switch"><button aria-label="Previous month" onClick={() => setMonthDate(new Date(year, monthIndex - 1, 1))}>‹</button><button aria-label="Next month" onClick={() => setMonthDate(new Date(year, monthIndex + 1, 1))}>›</button></div></div><div className="attendance-weekdays">{weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="attendance-heatmap">{days.map((day, index) => day ? <div key={day} title={holidaysByDate[localDateKey(year, monthIndex, day)] || (statusFor(day) === "weekend" ? "Weekend" : records[localDateKey(year, monthIndex, day)] || "Not marked")} className={`attendance-day ${statusFor(day)}`}><span>{day}</span>{holidaysByDate[localDateKey(year, monthIndex, day)] && <small className="attendance-holiday-name">{holidaysByDate[localDateKey(year, monthIndex, day)]}</small>}</div> : <div key={`empty-${index}`} />)}</div><div className="attendance-legend"><span><i className="present"/> Present</span><span><i className="absent"/> Absent</span><span><i className="weekend"/> Weekend</span><span><i className="holiday"/> Holiday</span><span><i className="unmarked"/> Future</span><span><i className="unmarked"/> Not marked</span></div></section><section className="attendance-side-card"><div className="attendance-card-head"><div><span className="eyebrow">LIVE DATA</span><h2>{loading ? "Loading..." : "Attendance summary"}</h2></div><span className="sparkle-badge">✓</span></div><p className="attendance-quote">Green days are present and red days are absent. Weekends are purple. Holidays from the Holiday List are yellow and show the holiday name. Approved leave dates are also marked absent.</p><button className="attendance-report-button">Attendance report <ArrowRight size={14}/></button></section></div></div>;
}
