import { useState } from "react";
import { ChevronDown, GraduationCap, LogOut, X } from "lucide-react";
import AcademicMenu from "./AcademicMenu";
import AssignmentsMenu from "./AssignmentsMenu";
import AttendanceMenu from "./AttendanceMenu";
import ExamsResultsMenu from "./ExamsResultsMenu";
import StudentsMenu from "./StudentsMenu";
import CommunicationMenu from "./CommunicationMenu";
import DashboardMenu from "./DashboardMenu";
import ReportsMenu from "./ReportsMenu";
import CalendarMenu from "./CalendarMenu";
import SettingsMenu from "./SettingsMenu";
import HolidayMenu from "./HolidayMenu";
import TeacherAvatar from "./TeacherAvatar";
import FinanceMenu from "./FinanceMenu";

export default function TeacherSidebar({ mobileOpen, onClose, active, onNavigate, currentUser, onLogout, schoolName, allowedFeatures }) {
  const [open, setOpen] = useState({});
  const toggle = (key) => setOpen((current) => ({ ...current, [key]: !current[key] }));

  return (
    <aside id="portal-navigation" className={`sidebar teacher-sidebar ${mobileOpen ? "open" : ""} flex flex-col border-r border-indigo-100 bg-white`}>
      <div className="flex h-[82px] shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-200"><GraduationCap size={21} /></div>
        <div><strong className="block font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-tight text-slate-800">edura</strong><span className="block text-[9px] uppercase tracking-[0.16em] text-slate-400">teacher portal</span></div>
        <button type="button" className="ml-auto hidden text-slate-400 max-[720px]:block" onClick={onClose} aria-label="Close menu"><X size={19} /></button>
      </div>
      <div className="mx-4 mt-5 flex shrink-0 items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-sky-50 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">S</div>
        <div className="min-w-0"><small className="block text-[9px] text-slate-400">Welcome to</small><b className="block truncate text-[11px] text-slate-700">{schoolName || "School portal"}</b></div>
        <ChevronDown size={14} className="ml-auto shrink-0 text-indigo-400" />
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-3 space-y-1">
          {(!allowedFeatures || allowedFeatures.includes("Overview")) && <DashboardMenu active={active} onNavigate={onNavigate} />}
        </div>
        <AcademicMenu active={active} onNavigate={onNavigate} open={open} onToggle={toggle} allowedFeatures={allowedFeatures} />
        <AssignmentsMenu active={active} onNavigate={onNavigate} open={open} onToggle={toggle} allowedFeatures={allowedFeatures} />
        <AttendanceMenu active={active} onNavigate={onNavigate} open={open} onToggle={toggle} allowedFeatures={allowedFeatures} />
        <FinanceMenu active={active} onNavigate={onNavigate} open={open} onToggle={toggle} allowedFeatures={allowedFeatures} />
        <ExamsResultsMenu active={active} onNavigate={onNavigate} open={open} onToggle={toggle} allowedFeatures={allowedFeatures} />
        <StudentsMenu active={active} onNavigate={onNavigate} open={open} onToggle={toggle} allowedFeatures={allowedFeatures} />
        <CommunicationMenu active={active} onNavigate={onNavigate} open={open} onToggle={toggle} allowedFeatures={allowedFeatures} />
        <div className="space-y-1">{(!allowedFeatures || allowedFeatures.includes("Reports")) && <ReportsMenu active={active} onNavigate={onNavigate} />}{(!allowedFeatures || allowedFeatures.includes("Calendar")) && <CalendarMenu active={active} onNavigate={onNavigate} />}{(!allowedFeatures || allowedFeatures.includes("Holiday List")) && <HolidayMenu active={active} onNavigate={onNavigate} />}</div>
      </nav>
      <div className="shrink-0 border-t border-slate-100 p-3">
        {(!allowedFeatures || allowedFeatures.includes("Settings")) && <SettingsMenu active={active} onNavigate={onNavigate} />}
        <button type="button" onClick={onLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold text-rose-500 hover:bg-rose-50"><LogOut size={17} /><span>Sign out</span></button>
        <div className="mt-3 flex items-center gap-3 border-t border-slate-100 px-2 pt-3"><TeacherAvatar user={currentUser} size="normal" /><div className="min-w-0"><b className="block truncate text-[11px] text-slate-700">{currentUser?.displayName || "Teacher"}</b><small className="text-[9px] text-slate-400">Teacher</small></div></div>
      </div>
    </aside>
  );
}
