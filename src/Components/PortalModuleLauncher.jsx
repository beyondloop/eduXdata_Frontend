import { BookOpen, BookOpenCheck, CalendarDays, ClipboardCheck, Clock3, FileText, FolderOpen, GraduationCap, LayoutDashboard, Megaphone, Bell, CircleDollarSign, Settings, Users, UsersRound, UserRoundMinus, UserPlus, ChevronRight, Package, BusFront } from "lucide-react";

const adminModules = [
  { label: "Dashboard", icon: LayoutDashboard, items: ["Overview"] },
  { label: "Students", icon: Users, items: ["All Students", "Classes", "Sections", "Discipline Points", "Fee Structure", "Student Performance", "Student Documents"] },
  { label: "Facility", icon: Package, items: ["Facility", "Inventory"] },
  { label: "Transport", icon: BusFront, items: ["Transport"] },
  { label: "Teachers", icon: UsersRound, items: ["All Teachers", "Teacher Adjustments", "Teacher Performance"] },
  { label: "Admissions", icon: UserPlus, items: ["Admission Enquiry", "Student Admission", "Identity Card", "Teacher Application Form", "Fee Collection"] },
  { label: "Teacher Workload", icon: Clock3, items: ["Teacher Workload"] },
  { label: "Attendance", icon: ClipboardCheck, items: ["Leave Approvals", "Today's Attendance", "Attendance Analytics", "Student Attendance", "Teachers Attendance", "Manual Correction", "Attendance Reports"] },
  { label: "Exams & Marks", icon: GraduationCap, items: ["Exams", "Marks", "Results"] },
  { label: "Syllabus Management", icon: BookOpenCheck, items: ["Assigned Syllabus", "Pending", "Completed"] },
  { label: "Announcements", icon: Megaphone, items: ["Announcements"] },
  { label: "Holiday List", icon: CalendarDays, items: ["Holiday List"] },
  { label: "Documents", icon: FolderOpen, items: ["Documents"] },
<<<<<<< HEAD
  { label: "Reports", icon: FileText, items: ["Fees Collection Report", "Facility Report", "Expense Report"] },
=======
  { label: "Reports", icon: FileText, items: ["Reports"] },
>>>>>>> 1ab38baeb130a8a02d3b672b9f0e39888dab1fc9
  { label: "Payroll", icon: CircleDollarSign, items: ["Salary"] },
  { label: "Notifications", icon: Bell, items: ["Notifications"] },
  { label: "Separation Portal", icon: UserRoundMinus, items: ["Separation Portal"] },
];
const teacherModules = [
  { label: "Dashboard", icon: LayoutDashboard, items: ["Overview"] },
  { label: "Academic", icon: BookOpenCheck, items: ["My Classes", "Teacher Adjustments", "Lesson Planner", "Classwork", "Study Materials"] },
  { label: "Assignments & Tasks", icon: FileText, items: ["Assignments"] },
  { label: "Leave Management", icon: ClipboardCheck, items: ["Student Leave Approvals", "Apply Leave", "Mark Attendance", "My Attendance"] },
  { label: "Finance", icon: CircleDollarSign, items: ["Salary Slips"] },
  { label: "Exams & Results", icon: GraduationCap, items: ["Exams", "Enter Marks & Results"] },
  { label: "Students", icon: Users, items: ["Student List", "Discipline Points", "Performance", "Remarks", "Achievements"] },
  { label: "Communication", icon: Megaphone, items: ["Announcements", "Messages", "Notifications"] },
  { label: "Other", icon: CalendarDays, items: ["Reports", "Calendar", "Holiday List", "Settings", "Profile"] },
];
const studentModules = [
  { label: "Student portal", icon: LayoutDashboard, items: ["Overview", "Profile", "Attendance", "Timetable", "Assignments", "Examinations", "Syllabus", "Discipline Points", "Study Materials", "Fees"] },
  { label: "Student services", icon: BookOpen, items: ["Announcements", "Notifications", "Leave Management", "Library", "Certificates", "Events", "Holiday List"] },
];

export function modulesForPortalRole(role) {
  return role === "Admin" || role === "SubAdmin" ? adminModules : role === "Teacher" ? teacherModules : studentModules;
}

export default function PortalModuleLauncher({ modules, onOpen, schoolName, role, personName, onBack, onNavigate, selection, settingsAvailable, mobileOpen = false }) {
  if (selection) return <aside className={`module-context-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
    <button type="button" className="module-context-back" onClick={onBack}>← <span>All modules</span></button>
    <div className="module-context-title"><span><selection.icon size={21}/></span><div><small>{schoolName || "School portal"}</small><b>{selection.label}</b></div></div>
    <nav aria-label={`${selection.label} modules`}>{selection.items.map((item) => <button key={item} type="button" className={selection.active === item ? "active" : ""} onClick={() => onNavigate(item)}><span className="module-context-dot"/>{item === "Admission Enquiry" ? "Student Application Form" : item}<ChevronRight size={15}/></button>)}</nav>
    <div className="module-context-bottom">
      {settingsAvailable && <button type="button" className={`module-context-settings ${selection.active === "Settings" ? "active" : ""}`} onClick={() => onNavigate("Settings")}><Settings size={18}/><span>{role === "Admin" ? "Settings & permissions" : "Settings"}</span><ChevronRight size={15}/></button>}
      <div className="module-context-person"><span className="module-context-avatar">{(personName || role || "U").slice(0, 1).toUpperCase()}</span><div><b>{personName || role}</b><small>{role} portal</small></div></div>
    </div>
  </aside>;
  return <section className="portal-launcher">
    <header><p>YOUR WORKSPACE</p><h1>What would you like to do?</h1><span>Choose a module to get started.</span></header>
    <div className="portal-module-grid">{modules.map(({ label, icon: Icon, items }) => <button type="button" className="portal-module-card" key={label} onClick={() => onOpen({ label, icon: Icon, items })}>
      <span className="portal-module-icon"><Icon size={28}/></span><b>{label}</b><small>{items.length} {items.length === 1 ? "page" : "pages"}</small><ChevronRight className="portal-module-arrow" size={17}/>
    </button>)}</div>
  </section>;
}
