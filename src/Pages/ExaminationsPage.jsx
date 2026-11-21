import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Download, FileCheck2, GraduationCap, Trophy, X } from "lucide-react";
import { downloadExamTimetable, getExamTimetable, getMyUpcomingExams } from "../lib/api";

const examDate = value => {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};
const formatDate = value => examDate(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function ExaminationsPage({ onNavigate }) {
  const [exams, setExams] = useState(null);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.allSettled([getMyUpcomingExams(), getExamTimetable()])
      .then(([scheduleResult, timetableResult]) => {
        if (!live) return;
        if (scheduleResult.status === "fulfilled") setExams(scheduleResult.value);
        else setScheduleError(scheduleResult.reason.message);
        if (timetableResult.status === "fulfilled") setTimetables(timetableResult.value);
        else setError(timetableResult.reason.message);
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!guidelinesOpen) return undefined;
    const closeOnEscape = event => { if (event.key === "Escape") setGuidelinesOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [guidelinesOpen]);

  const downloadTimetable = async timetable => {
    setDownloading(true); setError("");
    try {
      const blob = await downloadExamTimetable(timetable.exam_term);
      const url = URL.createObjectURL(blob);
      const termName = String(timetable.exam_term || "exam").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const link = document.createElement("a"); link.href = url; link.download = `exam-${termName}-timetable.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure.message); }
    finally { setDownloading(false); }
  };

  const nextDate = exams?.length ? `${exams[0].exam_term ? `${exams[0].exam_term} · ` : ""}${exams[0].name} · ${formatDate(exams[0].exam_date)}${exams[0].exam_time ? ` · ${exams[0].exam_time}` : ""}` : null;

  return <div className="mx-auto w-full max-w-[1200px] space-y-6 text-slate-700">
    <button className="page-back" onClick={() => onNavigate?.("Overview")}><ArrowRight size={14} className="back-arrow"/> Back to overview</button>
    <header className="!mt-0 relative flex min-h-[226px] items-center justify-between overflow-hidden rounded-[23px] bg-gradient-to-r from-[#5e58e5] via-[#6e67e9] to-[#4ba8d8] px-[38px] py-[34px] text-white shadow-[7px_9px_0_#dfe0f4,0_17px_30px_#4d589323] max-[800px]:px-[22px] max-[800px]:py-[25px]">
      <div className="relative z-10"><span className="flex items-center gap-1 text-[10px] font-extrabold tracking-[.18em] text-violet-100"><Trophy size={13} className="text-yellow-200"/> PREPARE · PERFORM · PROGRESS</span><h1 className="mt-3 text-3xl font-black tracking-tight">Examinations <span className="text-yellow-200">✦</span></h1><p className="mt-2 text-xs text-violet-100">Your exam schedules, guidelines and results in one place.</p></div>
      <div className="relative z-10 grid h-28 w-28 place-content-center rounded-[28px] border border-white/20 bg-white/15 text-center shadow-[inset_3px_3px_7px_#fff4,0_9px_16px_#35408140]"><GraduationCap size={29} className="mx-auto"/><small className="mt-2 text-[9px] text-violet-100">EXAMS</small></div>
      <div className="absolute right-7 top-5 text-3xl tracking-widest text-white/20">✦ ✧ ✦</div>
    </header>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-[18px] border border-slate-100 bg-sky-50 p-5 shadow-[5px_6px_0_#e1e3f2,0_10px_18px_#4f5a9410]"><span className="text-2xl">📅</span><div><small className="block text-[10px] text-slate-400">Upcoming exams</small><b className="mt-1 block font-black text-slate-700">{loading ? "…" : exams === null ? "—" : exams.length}</b><em className="mt-1 block text-[9px] not-italic text-slate-500">{loading ? "Loading schedule" : scheduleError ? "Unable to load schedule" : nextDate ? `Next exam · ${nextDate}` : exams ? "There is no upcoming exam." : ""}</em></div></div>
      {[ ["Average score", "86%", "bg-emerald-50", "🏆", "Great progress"], ["Grade band", "A", "bg-amber-50", "✦", "Keep it up"] ].map(([label, value, tone, icon, note]) => <div className={`flex items-center gap-3 rounded-[18px] border border-slate-100 p-5 shadow-[5px_6px_0_#e1e3f2,0_10px_18px_#4f5a9410] ${tone}`} key={label}><span className="text-2xl">{icon}</span><div><small className="block text-[10px] text-slate-400">{label}</small><b className="mt-1 block font-black text-slate-700">{value}</b><em className="block text-[9px] not-italic text-slate-500">{note}</em></div></div> )}
    </div>

    {(error || scheduleError) && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{[scheduleError, error].filter(Boolean).join(" · ")}</p>}
    <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setGuidelinesOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[10px] font-extrabold text-indigo-600"><FileCheck2 size={15}/> Exam guidelines</button>{timetables.map(timetable => <button key={timetable.id} type="button" disabled={downloading} onClick={() => downloadTimetable(timetable)} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-600 px-4 py-3 text-[10px] font-extrabold text-white disabled:opacity-60"><Download size={15}/>{downloading ? "Preparing PDF…" : `Download ${timetable.exam_term} PDF`}</button>)}</div>

    <section className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[6px_8px_0_#e0e2f2,0_14px_26px_#4e589414]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#fbfaff] to-[#f3f8ff] p-6"><span className="text-[10px] font-extrabold tracking-[.18em] text-indigo-500">EXAM SCHEDULE</span><h2 className="mt-1 text-xl font-black text-slate-700">Upcoming examinations</h2></div>
      {loading ? <p className="px-6 py-12 text-center text-sm text-slate-400">Loading exam schedule…</p> : scheduleError ? <p className="px-6 py-12 text-center text-sm text-rose-500">Could not load the exam schedule.</p> : exams?.length ? <div className="divide-y divide-slate-100 px-5">{exams.map((exam, index) => <article className="flex flex-wrap items-center gap-3 py-5" key={exam.id}><span className="w-6 text-[11px] font-black text-slate-300">{String(index + 1).padStart(2, "0")}</span><div className="grid h-11 w-11 place-items-center rounded-[14px] bg-violet-50 text-violet-600"><GraduationCap size={20}/></div><div className="min-w-[180px] flex-1"><b className="block text-sm font-black text-slate-700">{exam.exam_term ? `${exam.exam_term} · ` : ""}{exam.name}</b><span className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarDays size={13}/> {formatDate(exam.exam_date)}{exam.exam_time ? ` · ${exam.exam_time}` : ""}</span></div></article>)}</div> : <p className="px-6 py-12 text-center text-sm text-slate-400">There is no upcoming exam. Your teacher will publish the schedule here.</p>}
    </section>

    {guidelinesOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setGuidelinesOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="exam-guidelines-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-sky-50 p-6"><div><span className="text-[10px] font-extrabold tracking-[.18em] text-indigo-500">BE PREPARED</span><h2 id="exam-guidelines-title" className="mt-1 text-xl font-black text-slate-800">Exam guidelines</h2><p className="mt-1 text-sm text-slate-500">Please follow these instructions for a smooth exam.</p></div><button type="button" onClick={() => setGuidelinesOpen(false)} aria-label="Close exam guidelines" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-800"><X size={18}/></button></header><ol className="space-y-4 p-6 text-sm leading-relaxed text-slate-600"><li><b className="text-slate-800">Arrive early.</b> Be at your exam room at least 15 minutes before the scheduled start.</li><li><b className="text-slate-800">Bring your school ID.</b> Keep it ready for verification and bring the stationery you need.</li><li><b className="text-slate-800">Keep devices away.</b> Phones, smart watches, and other electronic devices must be switched off and stored as instructed.</li><li><b className="text-slate-800">Follow invigilator instructions.</b> Do not communicate with other students or begin until told to do so.</li><li><b className="text-slate-800">Manage your time.</b> Read all questions carefully and check your answers before handing in your paper.</li></ol><footer className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4"><button type="button" onClick={() => setGuidelinesOpen(false)} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Got it</button></footer></section></div>}
  </div>;
}
