import { useEffect, useMemo, useState } from "react";
import { getPortalPermissions, getPortalPermissionUsers, savePortalPermissions } from "../lib/api";
import { Check, CheckSquare, CircleDollarSign, ClipboardCheck, FileText, GraduationCap, Megaphone, Settings, Users, UsersRound, Clock3, BookOpenCheck, CalendarDays, FolderOpen, Bell, LayoutDashboard, ShieldCheck, UserRoundMinus, UserPlus, Package, BusFront } from "lucide-react";

const adminPermissionModules = [
  { name: "Dashboard", icon: LayoutDashboard, features: ["Overview"] },
  { name: "Students", icon: Users, features: ["All Students", "Classes", "Sections", "Discipline Points", "Fee Structure", "Student Performance", "Student Documents"] },
  { name: "Facility", icon: Package, features: ["Facility", "Inventory"] },
  { name: "Transport", icon: BusFront, features: ["Transport"] },
  { name: "Teachers", icon: UsersRound, features: ["All Teachers", "Teacher Adjustments", "Teacher Performance"] },
  { name: "Admissions", icon: UserPlus, features: ["Admission Enquiry", "Student Admission", "Identity Card", "Teacher Application Form", "Fee Collection"] },
  { name: "Teacher Workload", icon: Clock3, features: ["Teacher Workload"] },
  { name: "Leave Management", icon: ClipboardCheck, features: ["Leave Approvals", "Today's Attendance", "Attendance Analytics", "Student Attendance", "Teachers Attendance", "Manual Correction", "Attendance Reports"] },
  { name: "Exams & Marks", icon: GraduationCap, features: ["Exams", "Marks", "Results"] },
  { name: "Syllabus Management", icon: BookOpenCheck, features: ["Assigned Syllabus", "Pending", "Completed"] },
  { name: "Announcements", icon: Megaphone, features: ["Announcements"] },
  { name: "Holiday List", icon: CalendarDays, features: ["Holiday List"] },
  { name: "Documents", icon: FolderOpen, features: ["Documents"] },
  { name: "Reports", icon: FileText, features: ["Reports"] },
  { name: "Payroll", icon: CircleDollarSign, features: ["Salary"] },
  { name: "Notifications", icon: Bell, features: ["Notifications"] },
  { name: "Separation Portal", icon: UserRoundMinus, features: ["Separation Portal"] },
  { name: "Account", icon: Settings, features: ["Profile"] },
];
const teacherPermissionModules = [
  { name: "Dashboard", icon: LayoutDashboard, features: ["Overview"] },
  { name: "Academic", icon: BookOpenCheck, features: ["My Classes", "Teacher Adjustments", "Lesson Planner", "Classwork", "Study Materials"] },
  { name: "Assignments & Tasks", icon: FileText, features: ["Assignments"] },
  { name: "Leave Management", icon: ClipboardCheck, features: ["Student Leave Approvals", "Apply Leave", "Mark Attendance", "My Attendance"] },
  { name: "Finance", icon: CircleDollarSign, features: ["Salary Slips"] },
  { name: "Exams & Results", icon: GraduationCap, features: ["Exams", "Enter Marks & Results"] },
  { name: "Students", icon: Users, features: ["Student List", "Discipline Points", "Performance", "Remarks", "Achievements"] },
  { name: "Communication", icon: Megaphone, features: ["Announcements", "Messages", "Notifications"] },
  { name: "Other", icon: CalendarDays, features: ["Reports", "Calendar", "Holiday List", "Settings", "Profile"] },
];
const studentPermissionModules = [
  { name: "Student portal", icon: LayoutDashboard, features: ["Overview", "Profile", "Attendance", "Timetable", "Assignments", "Examinations", "Syllabus", "Discipline Points", "Study Materials", "Fees"] },
  { name: "Student services", icon: BookOpenCheck, features: ["Announcements", "Notifications", "Leave Management", "Library", "Certificates", "Events", "Holiday List"] },
];
const subAdminDefaultFeatures = ["Overview", "All Students", "Classes", "Sections", "Student Performance", "Student Documents", "Admission Enquiry", "Student Admission", "Identity Card", "Documents", "Reports"];
const modulesForRole = (role) => role === "TEACHER" ? teacherPermissionModules : role === "STUDENT" ? studentPermissionModules : adminPermissionModules;
const defaultFeaturesForRole = (role) => role === "SUB_ADMIN" ? subAdminDefaultFeatures : role === "TEACHER" || role === "STUDENT"
  ? modulesForRole(role).flatMap((module) => module.features)
  : [];
const STORAGE_KEY = "edura_admin_permissions";
const readAssignments = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };

export function getAdminPermissionAssignments() { return readAssignments(); }
export function saveAdminPermissionAssignments(assignments) { localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments)); window.dispatchEvent(new Event("edura-permissions-updated")); }
export function getVisiblePortalFeatures(user) {
  if (!user?.userId) return null;
  const match = readAssignments().find((item) => item.role === String(user.role || "").toUpperCase() && item.userId === String(user.userId));
  return match ? match.features.map((feature) => feature === "Admit Cards" ? "Identity Card" : feature) : null;
}

export default function AdminPermissionsPage({ students = [], teachers = [], adminUser }) {
  const people = useMemo(() => [
    ...students.map((person) => ({ ...person, role: "STUDENT" })),
    ...teachers.map((person) => ({ ...person, role: "TEACHER" })),
    ...(adminUser?.userId ? [{ ...adminUser, role: "ADMIN" }] : []),
  ], [students, teachers, adminUser]);
  const [role, setRole] = useState("SUB_ADMIN");
  const permissionModules = modulesForRole(role);
  const [userId, setUserId] = useState("");
  const [features, setFeatures] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [directoryPeople, setDirectoryPeople] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const rolePeople = (directoryPeople.length ? directoryPeople : people).filter((person) => person.role === role && person.userId);
  useEffect(() => {
    let live = true;
    Promise.all([getPortalPermissions(), getPortalPermissionUsers()]).then(([rows, accounts]) => { if (live) { setAssignments(rows.map((assignment) => ({ ...assignment, features: assignment.features.map((feature) => feature === "Admit Cards" ? "Identity Card" : feature) }))); setDirectoryPeople(accounts); setLoadingAssignments(false); } }).catch((loadError) => { if (live) { setError(loadError.message || "Could not load users and saved permissions."); setLoadingAssignments(false); } });
    return () => { live = false; };
  }, []);
  const selectedPerson = rolePeople.find((person) => String(person.userId) === userId);
  const roleChange = (nextRole) => { setRole(nextRole); setUserId(""); setFeatures([]); setSaved(false); };
  const loadPerson = (nextId) => {
    setUserId(nextId);
    const existing = assignments.find((item) => item.role === role && item.userId === nextId);
    setFeatures(existing ? existing.features : defaultFeaturesForRole(role)); setSaved(false); setError("");
  };
  const toggle = (feature) => setFeatures((current) => current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]);
  const toggleModule = (module) => {
    const allSelected = module.features.every((feature) => features.includes(feature));
    setFeatures((current) => allSelected ? current.filter((feature) => !module.features.includes(feature)) : [...new Set([...current, ...module.features])]);
  };
  const save = async () => {
    if (!userId) { setError("Choose a user before saving permissions."); return; }
    setSaving(true);
    try {
      const assignment = await savePortalPermissions({ role, userId, features });
      const nextAssignments = [...assignments.filter((item) => !(item.role === role && item.userId === userId)), assignment];
      setAssignments(nextAssignments);
      saveAdminPermissionAssignments(nextAssignments);
      setSaved(true); setError("");
    } catch (saveError) { setError(saveError.message || "Could not save permissions."); }
    finally { setSaving(false); }
  };

  return <div className="admin-permissions-page">
    <header className="module-title"><div className="module-icon"><ShieldCheck size={24}/></div><div><p className="eyebrow">Access control</p><h1>Role based permissions</h1><p className="subtle">Choose which portal modules and features each person can see.</p></div></header>
    <section className="permission-target panel"><div className="permission-target-heading"><span><Settings size={17}/></span><div><h2>Permission assignment</h2><p>Select a role and account to manage access.</p></div></div><div className="permission-target-fields"><label><span>Role</span><select value={role} disabled={loadingAssignments} onChange={(event) => roleChange(event.target.value)}><option value="ADMIN">Admin</option><option value="SUB_ADMIN">SubAdmin</option><option value="TEACHER">Teacher</option><option value="STUDENT">Student</option></select></label><label><span>User ID</span><select value={userId} disabled={loadingAssignments} onChange={(event) => loadPerson(event.target.value)}><option value="">Select a {role.toLowerCase()} account</option>{rolePeople.map((person) => <option key={person.userId} value={person.userId}>{person.displayName || person.name || person.userId} · {person.userId}</option>)}</select></label></div>{selectedPerson && <p className="permission-person"><b>{selectedPerson.displayName || selectedPerson.name}</b><span>{selectedPerson.email || ""}</span><small>{selectedPerson.userId}</small></p>}{!rolePeople.length && <p className="permission-empty">No {role.toLowerCase()} accounts are available. Accounts appear here when they are registered in this school.</p>}</section>
    <div className="permission-list-heading"><div><h2>{role[0] + role.slice(1).toLowerCase()} portal modules and features</h2><p>Only checked options will be available to this account after you save.</p></div><span>{features.length} selected</span></div>
    <div className="permission-module-grid">{permissionModules.map((module) => { const Icon = module.icon; const checked = module.features.every((feature) => features.includes(feature)); return <section className="permission-module panel" key={module.name}><div className="permission-module-heading"><span className="permission-module-icon"><Icon size={18}/></span><div><h3>{module.name}</h3><small>{module.features.length} {module.features.length === 1 ? "feature" : "features"}</small></div><label className="permission-checkbox module-checkbox" title={`Select all ${module.name} features`}><input type="checkbox" checked={checked} onChange={() => toggleModule(module)}/><span><Check size={13}/></span></label></div><div className="permission-feature-list">{module.features.map((feature) => <label className="permission-checkbox" key={feature}><input type="checkbox" checked={features.includes(feature)} onChange={() => toggle(feature)}/><span><Check size={13}/></span><b>{feature}</b></label>)}</div></section>; })}</div>
    {error && <p className="permission-error" role="alert">{error}</p>}
    <div className="permission-save-bar"><span>{saved ? <><Check size={16}/> Permissions saved for {selectedPerson?.displayName || selectedPerson?.name || userId}</> : loadingAssignments ? "Loading saved assignments…" : "Saving replaces this account’s current feature list."}</span><button type="button" className="primary-btn" onClick={save} disabled={saving || loadingAssignments}><CheckSquare size={15}/> {saving ? "Saving…" : "Save permissions"}</button></div>
  </div>;
}
