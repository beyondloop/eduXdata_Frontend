import { FileText, Search } from "lucide-react";
const rows = [
  ["Class 10 · A", "Mathematics", "Active", "24 students"],
  ["Class 9 · B", "Science", "Active", "31 students"],
  ["Class 8 · A", "English", "Review", "28 students"],
  ["Class 7 · C", "Social studies", "Active", "26 students"],
];
export default function ModulePage({ title, search, onNavigate }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-sky-500 p-8 text-white sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-widest text-indigo-100">
            SCHOOL MANAGEMENT
          </p>
          <h1 className="mt-2 text-3xl font-black">{title}</h1>
          <p className="mt-2 text-indigo-100">
            Manage your school workspace and keep everyone moving forward.
          </p>
        </div>
        <button
          onClick={() => onNavigate("Announcements")}
          className="rounded-xl bg-white/15 px-4 py-3 text-sm font-bold"
        >
          + Add new
        </button>
      </header>
      <div className="flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            placeholder={`Search ${title.toLowerCase()}...`}
            defaultValue={search}
          />
        </div>
        <button className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">
          <FileText size={15} />
        </button>
      </div>
      <section className="overflow-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-4">Name / group</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-slate-100 text-sm">
                <td className="p-4 font-bold text-slate-700">
                  {title === "Students" ? "Aarav Sharma" : row[0]}
                </td>
                <td className="text-slate-500">{row[1]}</td>
                <td>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                    {row[2]}
                  </span>
                </td>
                <td className="text-slate-500">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
