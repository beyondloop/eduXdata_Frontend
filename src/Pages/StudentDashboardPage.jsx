import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Sparkles,
  Trophy,
} from "lucide-react";

export default function StudentDashboardPage({ user, onNavigate }) {
  const name = user?.displayName || "there";
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 p-8 text-white shadow-xl">
        <Sparkles className="absolute right-10 top-8 text-yellow-200" />
        <p className="text-xs font-bold tracking-widest text-indigo-100">
          THURSDAY · 06 AUGUST 2026
        </p>
        <h1 className="mt-3 text-3xl font-black">Good morning, {name} ☀️</h1>
        <p className="mt-2 text-indigo-100">
          You’re having a great week. Let’s make today count.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3">
          <span className="text-2xl">🔥</span>
          <span>
            <b className="block">4 day streak</b>
            <small className="text-indigo-100">
              Keep showing up — you’re on a roll!
            </small>
          </span>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-indigo-500">
            TODAY
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-800">
            Your next class
          </h2>
          <div className="mt-6 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BookOpen />
            </div>
            <div>
              <b className="block text-slate-700">Mathematics</b>
              <span className="text-xs text-slate-400">
                Room 204 · with Mr. Thomas
              </span>
              <strong className="mt-2 flex items-center gap-1 text-sm text-indigo-600">
                <Clock3 size={14} /> 10:30 AM
              </strong>
            </div>
          </div>
          <button
            onClick={() => onNavigate("Timetable")}
            className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600"
          >
            View full schedule <ArrowRight size={15} />
          </button>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-orange-500">
            UP NEXT
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-800">
            Don’t forget these
          </h2>
          {[
            "Finish science worksheet",
            "Read chapter 6 — The Giver",
            "Practice 10 algebra sums",
          ].map((task, index) => (
            <button
              key={task}
              className="mt-4 flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-100 text-indigo-600">
                <FileText size={16} />
              </span>
              <span className="flex-1 text-sm font-bold text-slate-600">
                {task}
              </span>
              <CheckCircle2
                className={index === 2 ? "text-emerald-500" : "text-slate-300"}
                size={18}
              />
            </button>
          ))}
        </section>
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-emerald-50 p-6">
          <Trophy className="text-emerald-600" />
          <b className="mt-4 block text-2xl text-slate-800">82%</b>
          <span className="text-xs text-slate-500">Term progress</span>
        </div>
        <div className="rounded-2xl bg-sky-50 p-6">
          <CalendarDays className="text-sky-600" />
          <b className="mt-4 block text-2xl text-slate-800">96%</b>
          <span className="text-xs text-slate-500">Attendance</span>
        </div>
        <div className="rounded-2xl bg-amber-50 p-6">
          <Clock3 className="text-amber-600" />
          <b className="mt-4 block text-2xl text-slate-800">3</b>
          <span className="text-xs text-slate-500">Assignments due</span>
        </div>
      </section>
    </div>
  );
}
