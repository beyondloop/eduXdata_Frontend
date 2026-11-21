import { BookOpen, CalendarDays, Clock3 } from "lucide-react";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const slots = [
  ["10:00", "10 AM - 11 AM"], ["11:00", "11 AM - 12 PM"], ["12:00", "12 PM - 1 PM"],
  ["14:00", "2 PM - 3 PM"], ["15:00", "3 PM - 4 PM"],
];
const field = (record, camel, snake) => record?.[camel] ?? record?.[snake] ?? "";
const timeValue = (value) => String(value || "").slice(0, 5);
const formatDay = (value) => String(value || "").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export default function MyClassesPage({ workloads = [] }) {
  const classes = new Set(workloads.map((item) => `Class ${field(item, "className", "class_name")}-${field(item, "sectionName", "section_name")}`));
  const subjects = new Set(workloads.map((item) => field(item, "subject", "subject")));
  return <div className="mx-auto max-w-[1160px]">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Academic · My Classes</p><h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-slate-800">My weekly classes</h1><p className="mt-2 text-xs text-slate-400">Your administrator-assigned classes for the complete school week.</p></div><div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-[11px] font-bold text-indigo-700"><CalendarDays size={16}/> 10 AM - 4 PM</div></div>
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3"><Summary icon={BookOpen} label="Assigned subjects" value={subjects.size}/><Summary icon={Clock3} label="Weekly periods" value={workloads.length}/><Summary icon={CalendarDays} label="Classes / sections" value={classes.size}/></div>
    <section className="workload-board teacher-classes-board"><div className="workload-board-head"><div><p className="eyebrow">WEEKLY SCHEDULE</p><h2>My assigned timetable</h2><p>Green boxes are classes assigned by the administrator. The 1–2 PM recess is fixed.</p></div></div><div className="weekly-schedule teacher-weekly-schedule"><div className="weekly-head weekly-day-head">Day</div>{slots.slice(0, 3).map(([, label]) => <div className="weekly-head" key={label}>{label}</div>)}<div className="weekly-recess-head">Recess<br/><small>1 PM - 2 PM</small></div>{slots.slice(3).map(([, label]) => <div className="weekly-head" key={label}>{label}</div>)}{days.map((day) => <div className="weekly-row" key={day}><div className="weekly-day">{day}</div>{slots.slice(0, 3).map(([start], index) => <ClassCell key={start} assignments={workloads.filter((item) => formatDay(field(item, "dayOfWeek", "day_of_week")) === day && timeValue(field(item, "startTime", "start_time")) === start)} />)}<div className="weekly-recess">Break</div>{slots.slice(3).map(([start]) => <ClassCell key={start} assignments={workloads.filter((item) => formatDay(field(item, "dayOfWeek", "day_of_week")) === day && timeValue(field(item, "startTime", "start_time")) === start)} />)}</div>)}</div></section>
  </div>;
}

function ClassCell({ assignments }) {
  if (!assignments.length) return <article className="teacher-weekly-slot empty"><span>No class assigned</span></article>;
  return <article className="teacher-weekly-slot assigned">{assignments.map((item) => <div key={field(item, "id", "id")}><b>{field(item, "subject", "subject")}</b><span>Class {field(item, "className", "class_name")}-{field(item, "sectionName", "section_name")}</span><small>1 hour</small></div>)}</article>;
}

function Summary({ icon: Icon, label, value }) { return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={18}/></div><div><p className="text-[10px] text-slate-400">{label}</p><strong className="mt-1 block font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-slate-700">{value}</strong></div></div>; }
