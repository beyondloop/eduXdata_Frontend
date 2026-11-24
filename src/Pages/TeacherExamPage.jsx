import { useEffect, useRef, useState } from "react";
import { CalendarDays, Download, FileSpreadsheet } from "lucide-react";
import { downloadExamTimetable, getExamTimetable, getExamTimetableTemplate, getMyUpcomingExams, uploadExamTimetable } from "../lib/api";

const terms = ["Term 1", "Term 2", "Final"];
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function TeacherExamPage() {
  const [schedule, setSchedule] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [term, setTerm] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInput = useRef(null);

  const refresh = async () => {
    const [exams, documents] = await Promise.all([getMyUpcomingExams(), getExamTimetable()]);
    setSchedule(exams);
    setTimetables(documents);
  };
  useEffect(() => { refresh().catch(failure => setError(failure.message)); }, []);

  const downloadTemplate = async () => {
    setError("");
    try { saveBlob(await getExamTimetableTemplate(), "exam-timetable-template.xlsx"); }
    catch (failure) { setError(failure.message); }
  };

  const submit = async event => {
    event.preventDefault();
    if (!term || !file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await uploadExamTimetable(term, file);
      await refresh();
      setMessage(`${result.rows} exam subjects saved for ${term}. Students can now view or download the timetable.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  const download = async timetable => {
    setError("");
    try { saveBlob(await downloadExamTimetable(timetable.exam_term), `exam-${timetable.exam_term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-timetable.pdf`); }
    catch (failure) { setError(failure.message); }
  };

  return <div className="mx-auto w-full max-w-[1000px] space-y-5">
    <header><p className="text-[10px] font-extrabold tracking-[.18em] text-indigo-500">EXAMS &amp; RESULTS</p><h1 className="mt-1 text-2xl font-black text-slate-800">Exam schedule</h1><p className="mt-1 text-sm text-slate-500">Choose an exam term and upload its Excel schedule. Subjects, dates and times will appear in the student portal.</p></header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-800">Upload exam schedule</h2><p className="mt-1 text-xs text-slate-500">Excel columns: Date, Subject, Time. Uploading replaces the timetable for the selected term.</p></div><button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-600"><Download size={14}/> Download Excel format</button></div>
      <form onSubmit={submit} className="mt-5">
        <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Exam term<select required value={term} onChange={event => setTerm(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal"><option value="">Choose term</option>{terms.map(option => <option key={option}>{option}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">Excel timetable (.xlsx, up to 5 MB)<input ref={fileInput} required type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-normal"/></label>
        </div>
        {file && <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><FileSpreadsheet size={14} className="text-emerald-600"/>{file.name}</p>}
        <div className="mt-4 flex justify-end"><button type="submit" disabled={busy || !term || !file} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Uploading…" : "Done"}</button></div>
      </form>

      <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-bold text-slate-800">Published timetable</h3>{timetables.length ? <div className="mt-2 divide-y divide-slate-100">{timetables.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><b className="min-w-20 text-sm text-indigo-600">{item.exam_term}</b><span className="flex-1 text-xs text-slate-500">Uploaded source: {item.file_name}</span><button type="button" onClick={() => download(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><Download size={13}/> Download PDF</button></div>)}</div> : <p className="mt-2 text-xs text-slate-400">No timetable uploaded yet.</p>}</div>

      <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-bold text-slate-800">Extracted exam schedule</h3>{schedule.length ? <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2 pr-3">Term</th><th className="py-2 pr-3">Subject</th><th className="py-2 pr-3">Date</th><th className="py-2">Time</th></tr></thead><tbody className="divide-y divide-slate-100">{schedule.map(row => <tr key={row.id}><td className="py-3 pr-3 font-semibold text-indigo-600">{row.exam_term}</td><td className="py-3 pr-3 font-semibold text-slate-700">{row.name}</td><td className="py-3 pr-3 text-slate-600">{new Date(`${String(row.exam_date).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td className="py-3 text-slate-600">{row.exam_time}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-xs text-slate-400">Upload a timetable to populate this schedule.</p>}</div>
    </section>
  </div>;
}
