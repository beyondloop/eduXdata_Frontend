import { useEffect, useState } from "react";
import { Bell, BookOpenCheck, ClipboardCheck, Clock3, FileText, FolderOpen, GraduationCap, LayoutDashboard, LogOut, Megaphone, Users, UsersRound, ChevronDown, UserRoundMinus, CalendarDays, CircleDollarSign, Settings, Package, BusFront } from "lucide-react";

const sections = [
  { label: "Dashboard", value: "Overview", icon: LayoutDashboard },
  { label: "Students", icon: Users, children: ["All Students", "Classes", "Sections", "Discipline Points", "Fee Structure", "Student Performance", "Student Documents"] },
  { label: "Facility", icon: Package, children: ["Facility", "Inventory"] },
  { label: "Transport", icon: BusFront },
  { label: "Teachers", icon: UsersRound, children: ["All Teachers", "Teacher Adjustments", "Teacher Performance"] },
  { label: "Admissions", icon: UserRoundMinus, children: ["Admission Enquiry", "Student Admission", "Identity Card", "Teacher Application Form", "Fee Collection"] },
  { label: "Teacher Workload", icon: Clock3 },
  { label: "Leave Management", icon: ClipboardCheck, children: ["Leave Approvals", "Today's Attendance", "Attendance Analytics", "Student Attendance", "Teachers Attendance", "Manual Correction", "Attendance Reports"] },
  { label: "Exams & Marks", icon: GraduationCap, children: ["Exams", "Marks", "Results"] },
  { label: "Syllabus Management", icon: BookOpenCheck, children: ["Assigned Syllabus", "Pending", "Completed"] },
  { label: "Set Announcement", value: "Announcements", icon: Megaphone },
  { label: "Holiday List", icon: CalendarDays },
  { label: "Documents", icon: FolderOpen },
  { label: "Reports", icon: FileText, children: ["Fees Collection Report", "Facility Report", "Expense Report"] },
  { label: "Payroll", icon: CircleDollarSign, children: ["Salary"] },
  { label: "Set Notifications", value: "Notifications", icon: Bell },
];

export default function AdminSidebar({ active, onNavigate, onLogout, mobileOpen, onClose, schoolName, visibleFeatures }) {
  const permittedSections = sections.map((section) => ({ ...section, children: section.children?.filter((child) => !visibleFeatures || visibleFeatures.includes(child)) })).filter((section) => !visibleFeatures || (section.children ? section.children.length > 0 : visibleFeatures.includes(section.value || section.label)));
  const [open, setOpen] = useState(() => Object.fromEntries(permittedSections.filter((section) => section.children?.includes(active)).map((section) => [section.label, true])));
  useEffect(() => {
    const parent = permittedSections.find((section) => section.children?.includes(active));
    if (parent) setOpen((items) => ({ ...items, [parent.label]: true }));
  }, [active]);
  return <aside id="portal-navigation" className={`sidebar admin-sidebar ${mobileOpen ? "open" : ""}`}>
    <div className="brand"><div className="brand-mark"><GraduationCap size={21}/></div><div><strong>edura</strong><span>admin portal</span></div><button className="mobile-close" onClick={onClose}>×</button></div>
    <div className="school-switcher colourful-switcher"><div className="school-logo">S</div><div><small>Welcome to</small><b>{schoolName || "School portal"}</b></div></div>
    <nav className="nav-scroll admin-nav" aria-label="Admin navigation">{permittedSections.map(({ label, value = label, icon: Icon, children }) => <div key={label} className="admin-nav-section"><button type="button" className={`nav-item ${(active === value || children?.includes(active) || (children && open[label])) ? "active" : ""}`} onClick={() => children ? setOpen((items) => ({ ...items, [label]: !items[label] })) : onNavigate(value)}><Icon size={17}/><span>{label}</span>{children && <ChevronDown size={15} className={`admin-nav-chevron ${open[label] ? "open" : ""}`}/>}</button>{children && open[label] && <div className="admin-submenu">{children.map((child) => <button type="button" key={child} className={active === child ? "active" : ""} onClick={() => onNavigate(child)}>{child}</button>)}</div>}</div>)}</nav>
    <div className="sidebar-bottom"><button type="button" className={`nav-item ${active === "Settings" ? "active" : ""}`} onClick={() => onNavigate("Settings")}><Settings size={17}/><span>Settings & permissions</span></button><button className="nav-item logout-btn" onClick={onLogout}><LogOut size={17}/><span>Sign out</span></button>{(!visibleFeatures || visibleFeatures.includes("Separation Portal")) && <button type="button" className={`nav-item separation-nav-item ${active === "Separation Portal" ? "active" : ""}`} onClick={() => onNavigate("Separation Portal")}><UserRoundMinus size={17}/><span>Separation Portal</span></button>}</div>
  </aside>;
}
