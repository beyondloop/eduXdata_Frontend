import { CalendarDays, Clock3 } from "lucide-react";
const periods = [
  ["08:00 – 08:45", "Mathematics", "Mr. Thomas"],
  ["08:45 – 09:30", "English", "Ms. Priya"],
  ["09:30 – 10:15", "Physics", "Dr. Meera"],
  ["10:15 – 10:35", "RECESS", "Snack · Friends · Fresh air"],
  ["10:35 – 11:20", "Computer science", "Mr. Arjun"],
  ["11:20 – 12:05", "Social studies", "Mrs. Nair"],
  ["12:05 – 12:45", "Lunch break", "Cafeteria"],
  ["12:45 – 01:30", "Art & design", "Ms. Kavya"],
  ["01:30 – 02:15", "Physical education", "Coach Rahul"],
];
export default function TimetablePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-600 to-sky-500 p-8 text-white">
        <CalendarDays size={28} />
        <p className="mt-5 text-xs font-bold tracking-widest text-indigo-100">
          YOUR WEEK, AT A GLANCE
        </p>
        <h1 className="mt-2 text-3xl font-black">Class timetable</h1>
        <p className="mt-2 text-indigo-100">
          Everything you need for a smooth school day.
        </p>
      </header>
      <div className="flex gap-2 overflow-auto">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
          <button
            key={day}
            className={`rounded-xl px-5 py-3 text-sm font-bold ${day === "Thursday" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 shadow-sm"}`}
          >
            {day}
          </button>
        ))}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {periods.map(([time, subject, teacher], i) => (
          <div
            key={time}
            className={`flex items-center gap-4 border-b border-slate-100 p-4 last:border-0 ${subject === "RECESS" ? "bg-amber-50" : ""}`}
          >
            <span className="w-28 text-xs font-bold text-slate-400">
              {time}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Clock3 size={16} />
            </span>
            <div>
              <b className="block text-sm text-slate-700">{subject}</b>
              <span className="text-xs text-slate-400">{teacher}</span>
            </div>
            <span className="ml-auto text-xs text-slate-400">
              Period {i + 1}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
