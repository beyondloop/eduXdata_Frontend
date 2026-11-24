import { createElement, useEffect, useMemo, useRef, useState } from "react";
import DisciplinePage from "./Pages/DisciplinePage";
import TeacherAdjustmentsPage from "./Pages/TeacherAdjustmentsPage";
import SyllabusPage from "./Pages/SyllabusPage";
import TeacherPerformancePage from "./Pages/TeacherPerformancePage";
import { useLocation, useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import {
  Bell, BookOpen, BrainCircuit, CalendarDays, ChevronDown, CircleDollarSign,
  ClipboardCheck, GraduationCap, LayoutDashboard, Menu, MessageSquare,
  Search, Settings, Users, X, Zap, FileText, UserRound, LogOut, ArrowRight,
  BookMarked, CalendarCheck2, CheckCircle2, Clock3, Heart, Sparkles, Target,
  TrendingUp, Trophy, WalletCards, BusFront, MoreHorizontal, Megaphone, Camera, ShieldCheck,
} from "lucide-react";
import "./App.css";
import "./admin.css";
import "./Components/PortalNavigation.css";
import { clearSession, getAnnouncements, getDashboardSummary, getNotifications, getStudents, getStudentProfile, saveStudentProfile, getTeachers, getTeacherWorkloads } from "./lib/api";
import AuthPage from "./Components/AuthPage";
import UserAvatar from "./Components/UserAvatar";
import StudentProfilePage from "./Pages/ProfilePage";
import StudentAttendancePage from "./Pages/AttendancePage";
import AssignmentsPage from "./Pages/AssignmentsPage";
import ClassAssignmentsPage from "./Pages/ClassAssignmentsPage";
import ExaminationsPage from "./Pages/ExaminationsPage";
import TeacherExamPage from "./Pages/TeacherExamPage";
import StudyMaterialsPage from "./Pages/StudyMaterialsPage";
import FeesPage from "./Pages/FeesPage";
import MyClassesPage from "./Pages/MyClassesPage";
import TeacherProfilePage from "./Pages/TeacherProfilePage";
import AdminProfilePage from "./Pages/AdminProfilePage";
import TeacherAvatar from "./Components/TeacherAvatar";
import AdminClassesSectionsPage from "./Pages/AdminClassesSectionsPage";
import AdminStudentsPage from "./Pages/AdminStudentsPage";
import TeacherStudentsPage from "./Pages/TeacherStudentsPage";
import TeacherAttendancePage from "./Pages/TeacherAttendancePage";
import LeaveManagementPage from "./Pages/LeaveManagementPage";
import StudentLeavePage from "./Pages/StudentLeavePage";
import TeacherNotificationBell from "./Components/TeacherNotificationBell";
import StaffAttendancePage, { AdminNotificationBell } from "./Pages/StaffAttendancePage";
import AdminAddStudentPage from "./Pages/AdminAddStudentPage";
import Student360ProfilePage from "./Pages/Student360ProfilePage";
import AdminTeachersPage from "./Pages/AdminTeachersPage";
import Teacher360ProfilePage from "./Pages/Teacher360ProfilePage";
import TeacherWorkloadPage from "./Pages/TeacherWorkloadPage";
import { FeeStructurePage } from "./Pages/FinancialStructuresPage";
import PayrollPage from "./Pages/PayrollPage";
import FeeCollectionPage from "./Pages/FeeCollectionPage";
import FeesCollectionReportPage from "./Pages/FeesCollectionReportPage";
import FacilityReportPage from "./Pages/FacilityReportPage";
import ExpenseReportPage from "./Pages/ExpenseReportPage";
import AdminApplicationFormPage from "./Pages/AdminApplicationFormPage";
import StudentAdmissionPage from "./Pages/StudentAdmissionPage";
import AdmissionEnquiryPage from "./Pages/AdmissionEnquiryPage";
import SeparationPortalPage from "./Pages/SeparationPortalPage";
import HolidayListPage from "./Pages/HolidayListPage";
import CommunicationPage from "./Pages/CommunicationPage";
import AdminOverviewPage from "./Pages/AdminOverviewPage";
import AdminRecordsPage from "./Pages/AdminRecordsPage";
import FacilityPage from "./Pages/FacilityPage";
import TransportPage from "./Pages/TransportPage";
import { adminDatasets } from "./lib/adminDatasets";
import { getAdminProfile, getTenantContext, saveAdminProfile } from "./lib/api";
import { compressProfileImage } from "./lib/profileImage";
import AdminPermissionsPage, { getVisiblePortalFeatures } from "./Pages/AdminPermissionsPage";
import { getMyPortalPermissions } from "./lib/api";
import PortalModuleLauncher, { modulesForPortalRole } from "./Components/PortalModuleLauncher";

const navGroups = [
  { label: "Workspace", items: [
    ["Overview", LayoutDashboard], ["Students", Users], ["Teachers", UserRound],
    ["Academics", BookOpen], ["Attendance", ClipboardCheck],
  ]},
  { label: "Operations", items: [
    ["Homework", FileText], ["Exams & results", GraduationCap],
    ["Fees & payments", CircleDollarSign], ["Timetable", CalendarDays],
  ]},
  { label: "Engagement", items: [
    ["Announcements", MessageSquare], ["Notifications", Bell], ["AI assistant", BrainCircuit],
  ]},
];

const studentNavGroups = [
  { label: "Student portal", items: [
    ["Overview", LayoutDashboard], ["Profile", UserRound], ["Attendance", ClipboardCheck],
    ["Timetable", CalendarDays], ["Assignments", FileText], ["Examinations", GraduationCap],
    ["Syllabus", BookOpen], ["Discipline Points", ClipboardCheck], ["Study Materials", BookOpen], ["Fees", CircleDollarSign],
  ]},
  { label: "Student services", items: [
    ["Announcements", MessageSquare], ["Notifications", Bell], ["Leave Management", CalendarCheck2], ["Library", BookMarked],
    ["Certificates", FileText], ["Events", Sparkles], ["Holiday List", CalendarDays],
  ]},
];
const NO_PORTAL_FEATURES = [];
const SUB_ADMIN_DEFAULT_FEATURES = ["Overview", "All Students", "Classes", "Sections", "Student Performance", "Student Documents", "Admission Enquiry", "Student Admission", "Identity Card", "Documents", "Reports", "Fees Collection Report", "Facility Report", "Expense Report"];

const stats = [
  { label: "Total students", value: "2,486", change: "+8.2%", tone: "blue", icon: Users },
  { label: "Attendance today", value: "94.6%", change: "+2.4%", tone: "green", icon: ClipboardCheck },
  { label: "Fee collection", value: "₹18.4L", change: "72.8% collected", tone: "violet", icon: CircleDollarSign },
  { label: "Open tasks", value: "24", change: "8 need attention", tone: "orange", icon: Zap },
];

const students = [
  ["Aarav Sharma", "Class 10 · A", "Present", "AS"],
  ["Ananya Iyer", "Class 9 · B", "Present", "AI"],
  ["Vihaan Gupta", "Class 8 · A", "Late", "VG"],
  ["Sara Khan", "Class 10 · C", "Absent", "SK"],
];

function roleLabel(role) {
  return role === "ADMIN" ? "Admin" : role === "SUB_ADMIN" ? "SubAdmin" : role === "TEACHER" ? "Teacher" : "Student";
}

function normalizeAdminStudent(student) {
  return {
    id: student.id,
    disciplinePoints: Number(student.discipline_points || 0),
    name: student.display_name || student.displayName || "N/A",
    email: student.email || "N/A",
    userId: student.user_id || student.userId || "N/A",
    rollNumber: student.roll_number || student.rollNumber || "",
    className: student.class_name || student.className || "",
    sectionName: student.section_name || student.sectionName || "",
    parentContactNumber: student.parent_contact_number || student.parentContactNumber || student.phone || "",
    paidFeeAmount: Number(student.paid_fee_amount || student.paidFeeAmount || 0),
    pendingFeeAmount: Number(student.pending_fee_amount || student.pendingFeeAmount || 0),
    monthlyFeeCount: Number(student.monthly_fee_count || student.monthlyFeeCount || 0),
    registrationType: student.registration_type || student.registrationType || "OLD",
  };
}

function normalizeAdminTeacher(teacher) {
  return {
    id: teacher.id,
    active: teacher.active === true,
    name: teacher.display_name || teacher.displayName || "N/A",
    email: teacher.email || "N/A",
    teacherId: teacher.teacher_id || teacher.teacherId || "N/A",
    userId: teacher.user_id || teacher.userId || "N/A",
    registrationType: teacher.registration_type || teacher.registrationType || "OLD",
  };
}

function App() {
  useEffect(() => {
    const seen = new WeakMap();
    const observer = new MutationObserver(() => {
      const alerts = [...document.querySelectorAll('[role="alert"]')].filter(node => node.getClientRects().length && node.textContent.trim());
      const fresh = alerts.find(node => seen.get(node) !== node.textContent);
      alerts.forEach(node => seen.set(node,node.textContent));
      if (!fresh) return;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      document.querySelector('.topbar')?.scrollIntoView({behavior,block:'start'});
      window.scrollTo({top:0,behavior});
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    return () => observer.disconnect();
  }, []);
  const location = useLocation();
  const routeNavigate = useNavigate();
  const pageForPath = path => path === '/admin/teacher-performance' ? 'Teacher Performance' : path === '/admin/syllabus-management' ? 'Syllabus Management' : 'Overview';
  const [active, setActive] = useState(() => pageForPath(location.pathname));
  const [moduleSelection, setModuleSelection] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [communicationCounts, setCommunicationCounts] = useState({ Announcements: 0, Notifications: 0 });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const calendarAnchorRef = useRef(null);
  const [applicationFormKey, setApplicationFormKey] = useState(0);
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    const mobileOpen = mobileNavOpen && Boolean(moduleSelection) && isMobile;
    document.body.classList.toggle("mobile-nav-open", mobileOpen || (profileOpen && isMobile));
    const closeOnEscape = (event) => { if (event.key === "Escape") { setMobileNavOpen(false); setSearchOpen(false); setProfileOpen(false); } };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.classList.remove("mobile-nav-open"); window.removeEventListener("keydown", closeOnEscape); };
  }, [mobileNavOpen, moduleSelection, profileOpen]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [disciplineStudentId, setDisciplineStudentId] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [adminStudents, setAdminStudents] = useState([]);
  const [adminStudentError, setAdminStudentError] = useState("");
  const [adminTeachers, setAdminTeachers] = useState([]);
  const [adminTeacherError, setAdminTeacherError] = useState("");
  const [teacherWorkloads, setTeacherWorkloads] = useState([]);
  const [teacherWorkloadError, setTeacherWorkloadError] = useState("");
  const [portalRole, setPortalRole] = useState(() => { try { return roleLabel(JSON.parse(localStorage.getItem("edura_user"))?.role); } catch { return "Admin"; } });
  const [dashboardData, setDashboardData] = useState(null);
  const [school, setSchool] = useState(null);
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("edura_access_token")));
  const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem("edura_user")) || null; } catch { return null; } });
  const [permissionVersion, setPermissionVersion] = useState(0);
  const [portalPermissionFeatures, setPortalPermissionFeatures] = useState(undefined);
  useEffect(() => {
    const refresh = () => setPermissionVersion((version) => version + 1);
    window.addEventListener("edura-permissions-updated", refresh);
    return () => window.removeEventListener("edura-permissions-updated", refresh);
  }, []);
  useEffect(() => {
    if (!authenticated || !currentUser?.userId) { setPortalPermissionFeatures(null); return undefined; }
    let live = true;
    getMyPortalPermissions().then((result) => { if (live) setPortalPermissionFeatures(result.assigned ? result.features.map((feature) => feature === "Admit Cards" ? "Identity Card" : feature) : currentUser.role === "SUB_ADMIN" ? SUB_ADMIN_DEFAULT_FEATURES : null); })
      .catch(() => { if (live) setPortalPermissionFeatures(getVisiblePortalFeatures(currentUser) ?? (currentUser.role === "SUB_ADMIN" ? SUB_ADMIN_DEFAULT_FEATURES : null)); });
    return () => { live = false; };
  }, [authenticated, currentUser?.userId, portalRole, permissionVersion]);
  const permissionLoading = portalPermissionFeatures === undefined;
  const visiblePortalFeatures = permissionLoading ? NO_PORTAL_FEATURES : portalPermissionFeatures;
  const visibleAdminFeatures = portalRole === "Admin" ? visiblePortalFeatures : null;
  const roleNavGroups = portalRole === "Student" ? studentNavGroups : navGroups;
  const visibleNavGroups = useMemo(() => roleNavGroups.map((group) => ({ ...group, items: group.items.filter(([label]) => !visiblePortalFeatures || visiblePortalFeatures.includes(label)) })).filter((group) => group.items.length), [roleNavGroups, visiblePortalFeatures]);
  const launcherModules = useMemo(() => modulesForPortalRole(portalRole).map((module) => ({ ...module, items: module.items.filter((item) => portalPermissionFeatures == null || item === "Settings" && portalRole === "Admin" || portalPermissionFeatures.includes(({ Homework: "Assignments", "Exams & results": "Examinations", "Fees & payments": "Fees" })[item] || item)) })).filter((module) => module.items.length), [portalRole, portalPermissionFeatures]);
  useEffect(() => {
    const legacyRoutes = { "/admin/teacher-performance": "Teacher Performance", "/admin/syllabus-management": "Syllabus Management", "/overview": "Overview" };
    const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) || "overview");
    const candidates = [...navGroups, ...studentNavGroups].flatMap((group) => group.items.map(([label]) => label));
    candidates.push(...launcherModules.flatMap((module) => [module.label, ...module.items]));
    const resolved = legacyRoutes[location.pathname] || candidates.find((label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === slug.toLowerCase()) || slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    const studentAliases = { Homework: "Assignments", "Exams & results": "Examinations", "Fees & payments": "Fees" };
    setActive(location.state?.module || (portalRole === "Student" ? studentAliases[resolved] || resolved : resolved));
  }, [location.pathname, location.state, portalRole, launcherModules]);
  useEffect(() => {
    if (permissionLoading) return;
    if (!visiblePortalFeatures || (portalRole === "Admin" && active === "Settings") || visiblePortalFeatures.includes(active)) return;
    const fallback = visiblePortalFeatures.includes("Overview") ? "Overview" : visiblePortalFeatures[0] || (portalRole === "Admin" ? "Settings" : "");
    if (fallback) setActive(fallback);
  }, [visiblePortalFeatures, active, portalRole, permissionLoading]);
  useEffect(() => {
    if (!authenticated) { setSchool(null); return; }
    let live = true;
    getTenantContext().then((value) => { if (live) setSchool(value); }).catch(() => { if (live) setSchool(null); });
    return () => { live = false; };
  }, [authenticated, currentUser?.tenantId]);
  useEffect(() => {
    if (!authenticated || portalRole !== "Admin") return;
    let live = true;
    getAdminProfile().then((profile) => {
      if (!live) return;
      setCurrentUser((user) => { const next = { ...user, ...profile }; localStorage.setItem("edura_user", JSON.stringify(next)); return next; });
    }).catch(() => {});
    return () => { live = false; };
  }, [authenticated, portalRole]);
  useEffect(() => {
    if (!authenticated || portalRole !== "Student") return;
    let live = true;
    getStudentProfile().then((profile) => {
      if (!live) return;
      setCurrentUser((user) => { const next = { ...user, ...profile }; localStorage.setItem("edura_user", JSON.stringify({ ...next, profileImage: undefined })); return next; });
    }).catch(() => {});
    return () => { live = false; };
  }, [authenticated, portalRole]);
  const activeMeta = useMemo(() => {
    return visibleNavGroups.flatMap(g => g.items).find(i => i[0] === active);
  }, [active, visibleNavGroups]);

  const navigate = (item, context = {}) => {
    setMobileNavOpen(false);
    setSearchOpen(false);
    setProfileOpen(false);
    const studentAliases = { Homework: "Assignments", "Exams & results": "Examinations", "Fees & payments": "Fees" };
    const permissionFeature = portalRole === "Student" ? studentAliases[item] || item : portalRole === "Admin" && ["Student Admission", "Identity Card"].includes(item) && visiblePortalFeatures?.includes("Student Application Form") ? "Student Application Form" : item;
    if (!permissionLoading && visiblePortalFeatures && !(portalRole === "Admin" && permissionFeature === "Settings") && !visiblePortalFeatures.includes(permissionFeature)) return;
    const retiredAdminPages = ["Teacher Assignment", "Class Teacher", "Subject Teacher", "Parents", "Users & Roles", "School Settings"];
    if (portalRole === "Admin" && retiredAdminPages.includes(item)) item = "Overview";
    const legacyPaths = { "Teacher Performance": "/admin/teacher-performance", "Syllabus Management": "/admin/syllabus-management", Overview: "/overview" };
    const rolePath = portalRole.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const slug = item.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const path = portalRole === "Admin" && legacyPaths[item] ? legacyPaths[item] : `/${rolePath}/${slug}`;
    if (location.pathname !== path) routeNavigate(path, { state: { module: item } });
    setDisciplineStudentId(item === 'Discipline Points' ? context.studentId || '' : '');
    if (["Student Application Form", "Teacher Application Form"].includes(item)) setApplicationFormKey((current) => current + 1);
    setSelectedStudent(null);
    setSelectedTeacher(null);
    setActive(portalRole === "Student" ? (studentAliases[item] || item) : item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openModule = (module) => {
    setModuleSelection(module);
    navigate(module.items[0]);
    setMobileNavOpen(window.matchMedia("(max-width: 720px)").matches);
  };
  const updateProfile = async (changes) => {
    const saved = portalRole === "Admin" ? await saveAdminProfile(changes) : portalRole === "Student" && Object.hasOwn(changes, "profileImage") ? await saveStudentProfile({ profileImage: changes.profileImage }) : changes;
    const nextUser = { ...currentUser, ...saved };
    setCurrentUser(nextUser);
    try { localStorage.setItem("edura_user", JSON.stringify(portalRole === "Student" ? { ...nextUser, profileImage: undefined } : nextUser)); }
    catch { /* Keep the updated profile available for this session if storage is full. */ }
    return nextUser;
  };
  const uploadProfilePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
      const profileImage = await compressProfileImage(file);
      setCurrentUser((user) => {
        const next = { ...user, profileImage };
        try { localStorage.setItem("edura_user", JSON.stringify(next)); } catch { /* Keep it visible for this session if browser storage is full. */ }
        return next;
      });
      window.dispatchEvent(new Event("edura-profile-image-changed"));
      window.dispatchEvent(new Event("edura-teacher-image-changed"));
      window.dispatchEvent(new Event("edura-admin-image-changed"));
    } catch (error) {
      window.alert(error.message || "Unable to upload this image.");
    } finally { event.target.value = ""; }
  };

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      try {
        if (!localStorage.getItem("edura_access_token")) return;
        const summary = await getDashboardSummary();
        if (!cancelled) setDashboardData(summary);
      } catch {
        // The local UI remains available while the API/database is starting up.
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    const visibleCount = (rows, type) => { const visible = portalRole === "Admin" ? rows : rows.filter((row) => ["ALL", portalRole.toUpperCase()].includes(String(row.audience || "").toUpperCase())); const seen = localStorage.getItem(`edura_seen_${type}`); return seen ? visible.filter((row) => new Date(row.published_at || row.publishedAt || 0) > new Date(seen)).length : visible.length; };
    let live = true;
    const refresh = () => Promise.all([getAnnouncements(), getNotifications()]).then(([announcements, notifications]) => { if (live) setCommunicationCounts({ Announcements: visibleCount(announcements, "Announcements"), Notifications: visibleCount(notifications, "Notifications") }); }).catch(() => {});
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => { live = false; clearInterval(interval); };
  }, [authenticated, portalRole]);
  useEffect(() => {
    const refreshDate = window.setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => window.clearInterval(refreshDate);
  }, []);
  useEffect(() => {
    if (!calendarOpen) return undefined;
    const closeCalendar = (event) => {
      if (!calendarAnchorRef.current?.contains(event.target)) setCalendarOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") setCalendarOpen(false); };
    document.addEventListener("pointerdown", closeCalendar);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeCalendar);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [calendarOpen]);
  useEffect(() => {
    if (!authenticated) return;
    if (["Admin", "SubAdmin", "Teacher"].includes(portalRole)) {
      getStudents().then((records) => { setAdminStudents(records.map(normalizeAdminStudent)); setAdminStudentError(""); }).catch((error) => { setAdminStudents([]); setAdminStudentError(error.message || "The student API is unavailable."); });
    }
    if (portalRole === "Admin") {
      getTeachers().then((records) => { setAdminTeachers(records.map(normalizeAdminTeacher)); setAdminTeacherError(""); }).catch((error) => { setAdminTeachers([]); setAdminTeacherError(error.message || "The teacher API is unavailable."); });
    }
    const loadTeacherWorkloads = () => getTeacherWorkloads()
      .then((records) => { setTeacherWorkloads(records); setTeacherWorkloadError(""); })
      .catch((error) => { setTeacherWorkloads([]); setTeacherWorkloadError(error.message || "The workload API is unavailable."); });
    loadTeacherWorkloads();
    window.addEventListener("teacher-workloads-updated", loadTeacherWorkloads);
    const refreshOnFocus = () => { if (document.visibilityState === "visible") loadTeacherWorkloads(); };
    const refreshTimer = window.setInterval(refreshOnFocus, 15000);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("teacher-workloads-updated", loadTeacherWorkloads);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [authenticated, portalRole, active]);

  const handleAuthenticated = (session) => { setCurrentUser(session); setPortalPermissionFeatures(undefined); setPortalRole(roleLabel(session.role)); setActive(session.role === "ADMIN" ? pageForPath(location.pathname) : "Overview"); setSelectedStudent(null); setSelectedTeacher(null); setAuthenticated(true); };
  const handleLogout = () => { setProfileOpen(false); clearSession(); setCurrentUser(null); setAuthenticated(false); setDashboardData(null); };
  const addAdminStudent = (student) => { setAdminStudents((current) => [...current, student]); setActive("All Students"); };
  const addTeacherWorkload = (workload, editedId) => setTeacherWorkloads((current) => editedId
    ? [...current.filter((item) => String(item.id) !== String(editedId)), workload]
    : [...current, workload]);
  const removeTeacherWorkload = (id) => setTeacherWorkloads((current) => current.filter((item) => String(item.id) !== String(id)));
  const applicationComplete = (role, details) => {
    if (role === "STUDENT") setAdminStudents((current) => [...current, { name: details.name, email: details.email, userId: details.userId, rollNumber: details.rollNumber, className: details.className, sectionName: details.section, registrationType: details.registrationType }]);
    else if (role === "TEACHER") setAdminTeachers((current) => [...current, { name: details.name, email: details.email, userId: details.userId, teacherId: details.teacherId, registrationType: details.registrationType }]);
  };

  if (!authenticated) return <AuthPage onAuthenticated={handleAuthenticated} />;

  return (
    <div className="erp-app">
      {profileOpen && <button type="button" className="profile-modal-backdrop" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} />}
      {moduleSelection && <button type="button" className={`module-nav-backdrop ${mobileNavOpen ? "visible" : ""}`} aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      {moduleSelection && <PortalModuleLauncher modules={launcherModules} selection={{ ...moduleSelection, active }} mobileOpen={mobileNavOpen} schoolName={school?.name} role={portalRole} personName={currentUser?.displayName} onNavigate={navigate} onBack={() => { setModuleSelection(null); setMobileNavOpen(false); }} settingsAvailable={portalRole === "Admin" || !visiblePortalFeatures || visiblePortalFeatures.includes("Settings")} />}

      <main className="main-area">
        <header className="topbar"><button className="module-home-button" aria-label={moduleSelection && window.matchMedia("(max-width: 720px)").matches ? "Toggle navigation menu" : "All modules"} aria-expanded={Boolean(moduleSelection && mobileNavOpen)} onClick={() => { if (moduleSelection && window.matchMedia("(max-width: 720px)").matches) setMobileNavOpen((open) => !open); else { setModuleSelection(null); setMobileNavOpen(false); } }}><Menu size={18}/><span>All modules</span></button><div className="crumb"><span>{portalRole} space</span><b>/</b><strong>{active}</strong></div><div className="top-actions">{portalRole === "Admin" && (!visibleAdminFeatures || visibleAdminFeatures.includes("Notifications")) && <AdminNotificationBell onNavigate={navigate} />}{portalRole === "Admin" && <><div className="mobile-search-control"><div className="header-search-control"><button type="button" className="icon-btn header-icon search-toggle" aria-label="Search portal" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}><Search size={18}/></button>{searchOpen && <div className="search header-search search-popover"><Search size={16}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your portal..."/><button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={16}/></button></div>}</div></div></>}<div className="calendar-anchor" ref={calendarAnchorRef}><button className="header-date" onClick={() => setCalendarOpen((open) => !open)} aria-expanded={calendarOpen}><CalendarDays size={15}/><span>{currentDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span><ChevronDown size={13}/></button>{calendarOpen && <div className="calendar-popover"><Calendar value={currentDate} onChange={() => setCalendarOpen(false)} /></div>}</div><div className="search header-search desktop-header-search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your portal..."/><kbd>⌘ K</kbd></div>{portalRole !== "Admin" && <>{(!visiblePortalFeatures || visiblePortalFeatures.includes("Announcements")) && <button className="icon-btn header-icon communication-header-icon" onClick={() => navigate("Announcements")} aria-label="Open announcements"><Megaphone size={19}/>{communicationCounts.Announcements > 0 && <i>{communicationCounts.Announcements}</i>}</button>}{portalRole === "Teacher" ? (!visiblePortalFeatures || visiblePortalFeatures.includes("Notifications")) && <TeacherNotificationBell onNavigate={navigate} /> : (!visiblePortalFeatures || visiblePortalFeatures.includes("Notifications")) && <button className="icon-btn header-icon communication-header-icon" onClick={() => navigate("Notifications")} aria-label="Open notifications"><Bell size={19}/>{communicationCounts.Notifications > 0 && <i>{communicationCounts.Notifications}</i>}</button>}</>}{portalRole !== "Admin" && <><div className="mobile-search-control"><div className="header-search-control"><button type="button" className="icon-btn header-icon search-toggle" aria-label="Search portal" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}><Search size={18}/></button>{searchOpen && <div className="search header-search search-popover"><Search size={16}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your portal..."/><button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={16}/></button></div>}</div></div></>}<div className={`profile-anchor ${active === "Profile" ? "profile-page-active" : ""} ${profileOpen ? "profile-open" : ""}`}><button className="top-profile" aria-label="Open portal profile" aria-expanded={profileOpen} aria-controls="portal-profile-panel" onClick={() => setProfileOpen((open) => !open)}>{portalRole === "Teacher" ? <TeacherAvatar user={currentUser} size="mini" /> : <StudentAvatar user={currentUser} size="mini"/>}<ChevronDown size={15}/></button><label className="profile-photo-upload" title="Upload profile picture" aria-label="Upload profile picture"><Camera size={13}/><input type="file" accept="image/*" onChange={uploadProfilePhoto} /></label><ProfilePopover user={currentUser} role={portalRole} onNavigate={navigate} onLogout={handleLogout} /></div></div></header>
        <div className={`page-content ${moduleSelection ? "module-page-open" : ""}`}>
          {!moduleSelection ? <PortalModuleLauncher modules={launcherModules} onOpen={openModule} schoolName={school?.name} role={portalRole} personName={currentUser?.displayName} /> : !permissionLoading && visiblePortalFeatures && !visiblePortalFeatures.includes(active) && !(portalRole === "Admin" && (active === "Settings" || ["Student Admission", "Identity Card"].includes(active) && visiblePortalFeatures.includes("Student Application Form"))) ? <div className="permission-denied panel"><ShieldCheck size={25}/><h2>This section isn’t available</h2><p>Your account has not been granted access to this portal feature. Ask an administrator to update your permissions.</p></div> : <>
          {selectedStudent && ["Admin", "SubAdmin"].includes(portalRole) ? <Student360ProfilePage student={selectedStudent} onBack={() => setSelectedStudent(null)} /> : selectedTeacher && portalRole === "Admin" ? <Teacher360ProfilePage workloads={teacherWorkloads} teacher={selectedTeacher} onBack={() => setSelectedTeacher(null)} /> : portalRole === "Admin" && active === "Settings" ? <AdminPermissionsPage students={adminStudents} teachers={adminTeachers} adminUser={currentUser} /> : ["Admin", "SubAdmin"].includes(portalRole) && active === "Admission Enquiry" ? <AdmissionEnquiryPage /> : ["Admin", "SubAdmin"].includes(portalRole) && active === "Student Admission" ? <StudentAdmissionPage key="student-admission"/> : ["Admin", "SubAdmin"].includes(portalRole) && active === "Identity Card" ? <StudentAdmissionPage key="identity-card" view="cards"/> : portalRole === "Admin" && active === "Student Application Form" ? <AdminApplicationFormPage key={`student-${applicationFormKey}`} role="STUDENT" schoolName={school?.name} tenantId={school?.tenantId || currentUser?.tenantId} onComplete={applicationComplete}/> : portalRole === "Admin" && active === "Teacher Application Form" ? <AdminApplicationFormPage key={`teacher-${applicationFormKey}`} role="TEACHER" schoolName={school?.name} tenantId={school?.tenantId || currentUser?.tenantId} onComplete={applicationComplete}/>  : ["Announcements", "Notifications"].includes(active) ? <CommunicationPage type={active} role={portalRole} onNavigate={navigate} onCountChange={(type, count) => setCommunicationCounts((current) => ({ ...current, [type]: count }))} /> : active === "Discipline Points" ? <DisciplinePage key={disciplineStudentId} role={portalRole} initialStudentId={disciplineStudentId} /> : active === "Holiday List" ? <HolidayListPage role={portalRole} /> : active === "Overview" ? <Dashboard role={portalRole} features={visiblePortalFeatures} onNavigate={navigate} onSelect={setSelectedStudent} data={dashboardData} currentUser={currentUser} students={adminStudents} /> : portalRole === "Teacher" && active === "My Classes" ? <MyClassesPage workloads={teacherWorkloads} /> : <ModulePage title={active} role={portalRole} icon={activeMeta?.icon || activeMeta?.[1] || Settings} search={search} onNavigate={navigate} user={currentUser} onUpdateProfile={updateProfile} onSelect={setSelectedStudent} onSelectTeacher={setSelectedTeacher} students={adminStudents} studentError={adminStudentError} teachers={adminTeachers} teacherError={adminTeacherError} teacherWorkloads={teacherWorkloads} teacherWorkloadError={teacherWorkloadError} onCreated={addAdminStudent} onWorkloadCreated={addTeacherWorkload} onWorkloadDeleted={removeTeacherWorkload} />}
          </>}
        </div>
      </main>
    </div>
  );
}

function profileValue(user, keys, fallback = "Not added yet") {
  const value = keys.map((key) => user?.[key]).find(Boolean);
  return value || fallback;
}

function ProfilePopover({ user, role, onNavigate, onLogout }) {
  const isTeacher = role === "Teacher";
  const details = [
    ["School roll no.", ["rollNo", "schoolRollNo", "admissionNumber"]],
    ["Class", ["className", "class"]],
    ["Class teacher", ["classTeacher", "classTeacherName"]],
    ["Blood group", ["bloodGroup"]],
    ["Emergency contact", ["emergencyContact", "emergencyContactNumber"]],
    ["Mother’s name", ["motherName", "mothersName"]],
    ["Father’s name", ["fatherName", "fathersName"]],
  ];
  return <div id="portal-profile-panel" role="dialog" aria-label="Profile and sign out" className="profile-popover"><div className="profile-popover-cover">{isTeacher ? <TeacherAvatar user={user} size="mini"/> : <StudentAvatar user={user} size="mini"/>}<div><span>{isTeacher ? "Teacher profile" : role === "Admin" ? "Admin profile" : "Student profile"}</span><h3>{profileValue(user, ["displayName"], "School user")}</h3><small className="profile-user-id">{profileValue(user, ["userId", "userCode"], "No user ID")}</small></div><Sparkles size={18}/></div><div className="profile-details">{details.map(([label, keys]) => <div key={label}><small>{label}</small><b>{profileValue(user, keys)}</b></div>)}</div><div className="profile-popover-footer"><span><CheckCircle2 size={14}/> Profile at a glance</span><button onClick={() => onNavigate("Profile")}>View full profile <ArrowRight size={13}/></button></div><button type="button" className="profile-signout" onClick={onLogout}><LogOut size={15}/> Sign out</button></div>;
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard({ role, features, onNavigate, onSelect, data, currentUser, students: adminStudents }) {
  if (["Admin", "SubAdmin"].includes(role)) return <AdminOverviewPage role={role} features={role === "SubAdmin" ? features : null} currentUser={currentUser} onNavigate={onNavigate} onSelect={onSelect} students={adminStudents} />;
  if (role === "Student") return <StudentHome onNavigate={onNavigate} currentUser={currentUser} />;
  const signedInName = profileValue(currentUser, ["displayName", "name", "fullName"], "there");
  const greeting = timeGreeting();
  const roleCopy = { Admin: ["Good morning, Riya", "Here’s what’s happening across your school today."], SubAdmin: ["Good morning", "Your school dashboard, student records and admissions."], Teacher: ["Good morning, Meera", "Your classes, attendance and assignments for today."], Student: ["Good morning, Aarav", "Your timetable, homework and progress at a glance."] }[role];
  roleCopy[0] = `${greeting}, ${signedInName}`;
  return <>
    <div className="welcome-row"><div><p className="eyebrow">{role} portal · Thursday, 06 August 2026</p><h1>{roleCopy[0]} <span>✦</span></h1><p className="subtle">{roleCopy[1]}</p></div><button className="primary-btn" onClick={() => onNavigate(role === "Student" ? "Homework" : role === "Teacher" ? "Attendance" : role === "SubAdmin" ? "Student Admission" : "Announcements")}><MessageSquare size={16}/> {role === "Student" ? "View homework" : role === "Teacher" ? "Mark attendance" : role === "SubAdmin" ? "Open admissions" : "New announcement"}</button></div>
    <div className="stat-grid">{stats.map(({ label, value, change, tone, icon: Icon }) => {
      const liveValue = label === "Total students" && data ? data.students.toLocaleString() : label === "Attendance today" && data && data.markedToday ? `${((data.presentToday / data.markedToday) * 100).toFixed(1)}%` : value;
      const liveChange = label === "Attendance today" && data ? `${data.markedToday} marked today` : change;
      return <div className="stat-card" key={label}><div className={`stat-icon ${tone}`}>{createElement(Icon, { size: 19 })}</div><div className="stat-copy"><span>{label}</span><strong>{liveValue}</strong><small className={liveChange.includes("attention") ? "orange-text" : "green-text"}>{liveChange.includes("collected") ? "● " : "↗ "}{liveChange}</small></div><span className="card-menu">•••</span></div>;
    })}</div>
    <div className="content-grid"><section className="panel chart-panel"><div className="panel-head"><div><h2>Attendance overview</h2><p>Average attendance across all classes</p></div><select><option>Last 12 months</option><option>This year</option></select></div><div className="chart"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart-body"><div className="grid-lines">{[1,2,3,4].map(x => <i key={x}/>)}</div><svg viewBox="0 0 600 180" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4f7cff" stopOpacity=".22"/><stop offset="1" stopColor="#4f7cff" stopOpacity="0"/></linearGradient></defs><path d="M0,87 L55,68 L110,75 L165,51 L220,60 L275,37 L330,48 L385,29 L440,41 L495,20 L550,34 L600,25 L600,180 L0,180Z" fill="url(#fill)"/><path d="M0,87 L55,68 L110,75 L165,51 L220,60 L275,37 L330,48 L385,29 L440,41 L495,20 L550,34 L600,25" fill="none" stroke="#4f7cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="chart-x">{["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"].map(x => <span key={x}>{x}</span>)}</div></div></div></section><section className="panel quick-panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div><Zap size={18} className="muted-icon"/></div><div className="quick-actions"><button onClick={() => onNavigate("Students")}><Users size={19}/><span>Add student</span><b>↗</b></button><button onClick={() => onNavigate("Attendance")}><ClipboardCheck size={19}/><span>Mark attendance</span><b>↗</b></button><button onClick={() => onNavigate("Fees & payments")}><CircleDollarSign size={19}/><span>Record payment</span><b>↗</b></button><button onClick={() => onNavigate("Exams & results")}><GraduationCap size={19}/><span>Enter results</span><b>↗</b></button></div></section></div>
    <div className="content-grid lower-grid"><section className="panel table-panel"><div className="panel-head"><div><h2>Recent attendance</h2><p>Today · 2,350 marked out of 2,486</p></div><button className="text-btn" onClick={() => onNavigate("Attendance")}>View all <span>→</span></button></div><table><thead><tr><th>Student</th><th>Class</th><th>Status</th><th>Marked at</th></tr></thead><tbody>{students.map((s, i) => <tr key={s[0]} onClick={() => onSelect(s)}><td><div className="person"><div className={`avatar avatar-${i}`}>{s[3]}</div><b>{s[0]}</b></div></td><td>{s[1]}</td><td><span className={`status ${s[2].toLowerCase()}`}>{s[2]}</span></td><td>{["08:42 AM", "08:45 AM", "09:10 AM", "—"][i]}</td></tr>)}</tbody></table></section><section className="panel activity-panel"><div className="panel-head"><div><h2>School activity</h2><p>Latest updates from your team</p></div><button className="dots">•••</button></div><div className="activity"><div className="activity-line"><div className="activity-dot blue-dot"><ClipboardCheck size={13}/></div><div><b>Attendance submitted</b><p>Class 10 · A · Meera Nair</p><time>12 min ago</time></div></div><div className="activity-line"><div className="activity-dot purple-dot"><FileText size={13}/></div><div><b>New homework posted</b><p>Mathematics · Class 8</p><time>38 min ago</time></div></div><div className="activity-line"><div className="activity-dot orange-dot"><CircleDollarSign size={13}/></div><div><b>Payment received</b><p>Invoice #INV-2048 · ₹12,500</p><time>1 hour ago</time></div></div><div className="activity-line"><div className="activity-dot green-dot"><MessageSquare size={13}/></div><div><b>Announcement published</b><p>Annual sports day 2026</p><time>2 hours ago</time></div></div></div></section></div>
  </>;
}

function StudentHome({ onNavigate, currentUser }) {
  const [done, setDone] = useState([false, false, true]);
  const greeting = timeGreeting();
  const toggleTask = (index) => setDone((items) => items.map((item, i) => i === index ? !item : item));
  const tasksDone = done.filter(Boolean).length;

  return <div className="student-home">
    <div className="student-hero">
      <div className="hero-copy">
        <span className="eyebrow student-eyebrow"><Sparkles size={13} /> THURSDAY · 06 AUGUST 2026</span>
        <h1>{greeting}, {profileValue(currentUser, ["displayName", "name", "fullName"], "there")} <span>☀️</span></h1>
        <p>You’re having a great week. Let’s make today count.</p>
        <div className="hero-streak"><span className="streak-fire">🔥</span><div><b>4 day streak</b><small>Keep showing up — you’re on a roll!</small></div></div>
      </div>
      <div className="hero-orbit"><div className="orbit-dot dot-one"/><div className="orbit-dot dot-two"/><div className="hero-medal"><Trophy size={25}/><b>82%</b><small>this term</small></div></div>
    </div>

    <div className="today-heading"><div><span className="eyebrow">YOUR DAY AT A GLANCE</span><h2>What do I need to do today?</h2></div><button className="soft-link" onClick={() => onNavigate("Timetable")}>View full schedule <ArrowRight size={15}/></button></div>

    <div className="student-top-grid">
      <section className="student-card today-card"><div className="student-card-head"><div><span className="card-kicker blue-kicker"><CalendarCheck2 size={14}/> TODAY</span><h3>Your next class</h3></div><span className="live-pill"><i/> Live day</span></div><div className="next-class"><div className="subject-art math-art"><BookOpen size={25}/></div><div className="next-class-copy"><b>Mathematics</b><span>Room 204 · with Mr. Thomas</span><strong><Clock3 size={15}/> 10:30 AM <em>in 42 min</em></strong></div><button className="round-arrow" onClick={() => onNavigate("Timetable")}><ArrowRight size={17}/></button></div><div className="class-progress"><span style={{width: "58%"}}/></div><div className="class-foot"><span>Now · English</span><span>Next · Mathematics</span></div></section>

      <section className="student-card focus-card"><div className="student-card-head"><div><span className="card-kicker orange-kicker"><Target size={14}/> FOCUS FOR TODAY</span><h3>A small step at a time</h3></div><MoreHorizontal size={17} className="card-more"/></div><div className="focus-progress"><div className="ring"><b>{tasksDone}/3</b><small>done</small></div><div><b>Daily checklist</b><p>Finish your little wins before you relax.</p><button className="soft-link" onClick={() => onNavigate("Homework")}>Open homework <ArrowRight size={14}/></button></div></div><div className="mini-task-row"><CheckCircle2 size={15} className="checked"/><span>Pack your school bag</span><small>Done</small></div></section>
    </div>

    <div className="student-main-grid">
      <section className="student-card tasks-card"><div className="student-card-head"><div><span className="card-kicker purple-kicker"><BookMarked size={14}/> UP NEXT</span><h3>Don’t forget these</h3></div><button className="soft-link" onClick={() => onNavigate("Homework")}>See all <ArrowRight size={14}/></button></div><div className="task-list">{[
        ["Finish science worksheet", "Due today · Science", "purple-task", 0],
        ["Read chapter 6 — The Giver", "Due tomorrow · English", "peach-task", 1],
        ["Practice 10 algebra sums", "Due Friday · Mathematics", "mint-task", 2],
      ].map(([title, meta, tone, index]) => <button className={`task-item ${done[index] ? "task-complete" : ""}`} key={title} onClick={() => toggleTask(index)}><div className={`task-icon ${tone}`}>{done[index] ? <CheckCircle2 size={17}/> : <FileText size={17}/>}</div><div><b>{title}</b><span>{meta}</span></div><CheckCircle2 size={18} className={done[index] ? "task-check active" : "task-check"}/></button>)}</div></section>

      <section className="student-card progress-card"><div className="student-card-head"><div><span className="card-kicker green-kicker"><TrendingUp size={14}/> MY PROGRESS</span><h3>Growing every week</h3></div><button className="dots">•••</button></div><div className="progress-summary"><div><strong>82%</strong><span><TrendingUp size={12}/> +6.4% this term</span></div><p>Your strongest subject is <b>Science</b>! Keep it up.</p></div><div className="bar-chart" aria-label="Weekly performance chart">{[38, 55, 47, 71, 63, 82, 76].map((height, index) => <div className="bar-column" key={index}><i style={{height: `${height}%`}} className={index === 5 ? "current" : ""}/><small>{["M", "T", "W", "T", "F", "S", "S"][index]}</small></div>)}</div></section>
    </div>

    <div className="student-bottom-grid">
      <section className="student-card attendance-card"><div className="student-card-head"><div><span className="card-kicker blue-kicker"><Heart size={14}/> WELLBEING CHECK</span><h3>How are you feeling today?</h3></div></div><div className="mood-row"><button>😊<span>Great</span></button><button className="selected-mood">🙂<span>Good</span></button><button>😐<span>Okay</span></button><button>😴<span>Tired</span></button></div><p className="mood-note">A quick check-in helps your teachers support you better.</p></section>
      <section className="student-card parent-card"><div className="parent-gradient"><div><span className="card-kicker white-kicker"><WalletCards size={14}/> FOR YOUR FAMILY</span><h3>Everything’s on track</h3><p>Attendance is <b>96%</b> and fees are paid through August.</p></div><div className="parent-visual"><div className="pie-donut"><span>96<small>%</small></span></div></div></div><button className="parent-link" onClick={() => onNavigate("Attendance")}>View my full report <ArrowRight size={14}/></button></section>
      <section className="student-card notice-card"><div className="student-card-head"><div><span className="card-kicker orange-kicker"><Bell size={14}/> FROM SCHOOL</span><h3>Latest note</h3></div><span className="new-badge">NEW</span></div><div className="notice-content"><div className="notice-icon"><BusFront size={18}/></div><div><b>Bus route 4 will leave 10 minutes early</b><span>Posted by School Office · 1h ago</span></div></div><button className="soft-link" onClick={() => onNavigate("Announcements")}>Read announcements <ArrowRight size={14}/></button></section>
    </div>
  </div>;
}


function PageBack({ onNavigate }) {
  return <button className="page-back" onClick={() => onNavigate("Overview")}><ArrowRight size={14} className="back-arrow"/> Back to overview</button>;
}

const schoolDayRows = [
  ["10:00 AM - 11:00 AM", "1", "Mathematics", "Mr. Thomas", "math-period"],
  ["11:00 AM - 12:00 PM", "2", "English", "Ms. Priya", "english-period"],
  ["12:00 PM - 1:00 PM", "3", "Physics", "Dr. Meera", "science-period"],
  ["1:00 PM - 2:00 PM", "", "LUNCH BREAK", "Cafeteria", "lunch-period"],
  ["2:00 PM - 3:00 PM", "4", "Computer science", "Mr. Arjun", "computer-period"],
  ["3:00 PM - 4:00 PM", "5", "Physical education", "Coach Rahul", "sport-period"],
];

const studentTimetableDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const studentTimetableSlots = [
  ["10:00", "10 AM - 11 AM"], ["11:00", "11 AM - 12 PM"], ["12:00", "12 PM - 1 PM"],
  ["14:00", "2 PM - 3 PM"], ["15:00", "3 PM - 4 PM"],
];
const workloadField = (item, camel, snake) => item?.[camel] ?? item?.[snake] ?? "";
const workloadTime = (value) => String(value || "").slice(0, 5);
const workloadDay = (value) => String(value || "").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const classNumber = (value) => String(value || "").replace(/^class\s*/i, "").trim();

function StudentTimetablePage({ workloads = [], user }) {
  const studentClass = classNumber(user?.className);
  const studentSection = user?.sectionName || "";
  const assignments = workloads.filter((item) => classNumber(workloadField(item, "className", "class_name")) === studentClass && workloadField(item, "sectionName", "section_name") === studentSection);
  const classLabel = studentClass && studentSection ? `Class ${studentClass} - ${studentSection}` : "Your class";
  return <div className="module-page student-timetable-page !mx-auto !max-w-[1200px]"><div className="module-title"><div className="module-icon"><CalendarDays size={24}/></div><div><p className="eyebrow">YOUR WEEKLY SCHEDULE</p><h1>Class timetable</h1><p className="subtle">{classLabel} · Your teacher assignments for every school day.</p></div></div><section className="workload-board student-timetable-board"><div className="workload-board-head"><div><p className="eyebrow">DAY-WISE TIMETABLE</p><h2>{classLabel}</h2><p>Each box shows the subject and the teacher assigned to your class. The 1–2 PM recess is fixed.</p></div></div><div className="weekly-schedule student-weekly-schedule"><div className="weekly-head weekly-day-head">Day</div>{studentTimetableSlots.slice(0, 3).map(([, label]) => <div className="weekly-head" key={label}>{label}</div>)}<div className="weekly-recess-head">Recess<br/><small>1 PM - 2 PM</small></div>{studentTimetableSlots.slice(3).map(([, label]) => <div className="weekly-head" key={label}>{label}</div>)}{studentTimetableDays.map((day) => <div className="weekly-row" key={day}><div className="weekly-day">{day}</div>{studentTimetableSlots.slice(0, 3).map(([start]) => <StudentTimetableCell key={start} assignment={assignments.find((item) => workloadDay(workloadField(item, "dayOfWeek", "day_of_week")) === day && workloadTime(workloadField(item, "startTime", "start_time")) === start)} />)}<div className="weekly-recess">Break</div>{studentTimetableSlots.slice(3).map(([start]) => <StudentTimetableCell key={start} assignment={assignments.find((item) => workloadDay(workloadField(item, "dayOfWeek", "day_of_week")) === day && workloadTime(workloadField(item, "startTime", "start_time")) === start)} />)}</div>)}</div>{!assignments.length && <p className="student-timetable-empty">No classes have been assigned to {classLabel} yet.</p>}</section></div>;
}

function StudentTimetableCell({ assignment }) {
  if (!assignment) return <article className="student-weekly-slot empty"><span>No class assigned</span></article>;
  const teacherName = workloadField(assignment, "teacherName", "teacher_name");
  const teacherRole = workloadField(assignment, "teacherRole", "teacher_role");
  const teacherLabel = teacherRole.toLowerCase() === "class teacher" ? "Class teacher" : "Teacher";
  return <article className="student-weekly-slot assigned"><b>{workloadField(assignment, "subject", "subject")}</b><span>{teacherLabel}: {teacherName}</span><small>{teacherRole || "Assigned faculty"}</small>{assignment.adjustment_status === "APPROVED" && <span className="timetable-adjustment-status">Adjustment approved</span>}</article>;
}

function TimetablePage({ workloads = [], role, user }) {
  if (role === "Student") return <StudentTimetablePage workloads={workloads} user={user} />;
  return <StaffTimetablePage workloads={workloads} role={role} />;
}
function StaffTimetablePage({ workloads = [], role }) {
  const today = new Date();
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDays = [0, 1, 2, 3, 4, 5].map(offset => { const date = new Date(monday); date.setDate(monday.getDate() + offset); return date; });
  const todayIndex = Math.min(5, (today.getDay() + 6) % 7);
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [viewMode, setViewMode] = useState("assigned");
  const selectedDate = weekDays[selectedDay];
  const dateLabel = date => date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const selectedDayName = selectedDate.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const scheduledRows = workloads.filter((item) => String(item.day_of_week || item.dayOfWeek || "").toUpperCase() === selectedDayName).sort((a, b) => String(a.start_time || a.startTime).localeCompare(String(b.start_time || b.startTime))).map((item, index) => [
    `${formatTimeValue(item.start_time || item.startTime)} – ${formatTimeValue(item.end_time || item.endTime)}`, index + 1,
    item.subject, `${item.teacher_name || item.teacherName} · Class ${item.class_name || item.className}-${item.section_name || item.sectionName}`, "science-period", item.adjustment_status
  ]);
  const scheduleRows = viewMode === "sample" ? schoolDayRows : scheduledRows;
  const showingAssignments = viewMode === "assigned";
  return <div className="timetable-page !mx-auto !max-w-[1200px]"><div className="timetable-hero !min-h-[226px] !rounded-[23px] !bg-gradient-to-r !from-[#5e58e5] !via-[#6e67e9] !to-[#4ba8d8] !px-[38px] !py-[34px] max-[800px]:!px-[22px] max-[800px]:!py-[25px]"><div><span className="eyebrow timetable-eyebrow">YOUR WEEK, AT A GLANCE</span><h1>Class timetable</h1><p>Everything you need for a smooth school day.</p></div><div className="timetable-hero-art"><CalendarDays size={26}/><b>{scheduleRows.length}</b><small>periods</small></div></div><div className="timetable-toolbar"><div className="day-tabs">{weekDays.map((date, index) => <button className={selectedDay === index ? "selected" : ""} key={date.toISOString()} onClick={() => setSelectedDay(index)}>{date.toLocaleDateString(undefined, { weekday: "short" })}<small>{dateLabel(date)}</small></button>)}</div><span className="timetable-note"><span className="status-dot"/> Today · {today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div><div className="timetable-view-switch" role="tablist" aria-label="Timetable view"><button type="button" className={viewMode === "sample" ? "active" : ""} onClick={() => setViewMode("sample")}>Sample timetable</button><button type="button" className={viewMode === "assigned" ? "active" : ""} onClick={() => setViewMode("assigned")}>Assigned teacher workload</button></div><section className="timetable-board"><div className="timetable-board-head"><div><span className="card-kicker blue-kicker"><CalendarCheck2 size={14}/> {selectedDayName}</span><h2>{showingAssignments ? "Assigned teacher workload" : "Sample timetable"}</h2></div><span className="board-room">{showingAssignments ? (scheduledRows.length ? role === "Admin" ? "Live class assignments" : "Only your assigned classes" : "No assignments for this day") : "All teachers · Full school day"}</span></div><div className="period-grid"><div className="period-labels"><span>TIME</span>{scheduleRows.map(([time], index) => <span key={`${time}-${index}`} className={index === 3 || index === 6 ? "break-label" : ""}>{time}</span>)}</div><div className="period-cards"><span className="period-heading">PERIOD</span>{scheduleRows.map(([time, period, subject, teacher, tone, adjustmentStatus]) => <div key={`${time}-${subject}`} className={`period-card ${tone}`}><div className="period-number">{period}</div><div><b>{subject}</b><span>{teacher}</span>{adjustmentStatus === "APPROVED" && <span className="timetable-adjustment-status">Adjustment approved</span>}</div><small>{time}</small></div>)}</div></div></section></div>;
}

function formatTimeValue(value) { const [hour, minute] = String(value || "").slice(0, 5).split(":").map(Number); return `${hour % 12 || 12}:${String(minute || 0).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`; }
function StudentAvatar({ user, size = "normal" }) {
  return <UserAvatar user={user} role={user?.role || "STUDENT"} size={size} />;
}

function ProfileShowcase({ user }) {
  const facts = [["Student name", ["displayName"], "School user"], ["User ID", ["userId", "userCode"]], ["School roll no.", ["rollNo", "schoolRollNo", "admissionNumber"]], ["Class", ["className", "class"], "Class 10 · A"], ["Class teacher", ["classTeacher", "classTeacherName"], "Not added yet"], ["Blood group", ["bloodGroup"]], ["Height", ["height"], "Not added yet"], ["Weight", ["weight"], "Not added yet"], ["Date of birth", ["dateOfBirth", "dob"]], ["Emergency contact", ["emergencyContact", "emergencyContactNumber"]], ["Mother’s name", ["motherName", "mothersName"]], ["Father’s name", ["fatherName", "fathersName"]]];
  const name = profileValue(user, ["displayName"], "School user");
  return <div className="profile-page playful-profile"><div className="profile-page-hero"><div className="profile-hero-copy"><span className="eyebrow">YOUR LITTLE CORNER OF SCHOOL</span><h1>Hey, {name.split(" ")[0]}! <span>✦</span></h1><p>A snapshot of your school life, all in one happy place.</p><div className="profile-tags"><span>🌱 Growing every day</span><span>🎒 Class 10 · A</span></div></div><div className="profile-character"><div className="character-sun">✦</div><StudentAvatar size="large"/><div className="character-speech">You’ve got this!</div></div></div><div className="profile-page-intro"><div><span className="eyebrow">YOUR STUDENT STORY</span><h2>Nice to meet you, {name.split(" ")[0]}!</h2><p>Here’s everything that makes your school profile uniquely yours.</p></div><button className="profile-edit-button">✦ Profile is personal</button></div><div className="profile-highlight-row"><div className="profile-highlight purple-highlight"><span>🏆</span><div><small>THIS TERM</small><b>82% progress</b><em>+6.4% this term</em></div></div><div className="profile-highlight mint-highlight"><span>💚</span><div><small>ATTENDANCE</small><b>96% present</b><em>Great consistency</em></div></div><div className="profile-highlight yellow-highlight"><span>🔥</span><div><small>STREAK</small><b>4 days</b><em>Keep showing up</em></div></div></div><section className="profile-details-section"><div className="section-heading"><div><span className="eyebrow">THE IMPORTANT STUFF</span><h2>About {name.split(" ")[0]}</h2></div><span className="tiny-bubble">✨ private & safe</span></div><div className="profile-facts-grid">{facts.map(([label, keys, fallback]) => <div className="profile-fact" key={label}><div className="fact-dot"/><span>{label}</span><b>{profileValue(user, keys, fallback)}</b></div>)}</div></section><div className="profile-lower-row"><div className="profile-care-card"><div className="care-icon">♥</div><div><b>Your safe space</b><p>Your emergency details are kept private and used only when your safety matters.</p></div></div><div className="profile-quote-card"><span>“</span><p>Small steps every day add up to big, wonderful things.</p><b>— Your Edura buddy</b></div></div></div>;
}

function AttendancePage({ user }) {
  const [month, setMonth] = useState("August 2026");
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const heat = ["present", "present", "present", "late", "present", "weekend", "weekend", "present", "present", "present", "present", "present", "absent", "weekend", "weekend", "present", "present", "present", "present", "present", "weekend", "weekend", "present", "present", "late", "present", "present", "present", "weekend", "weekend", "present", "present", "present", "holiday", "present", "present"];
  return <div className="attendance-page"><div className="attendance-hero"><div><span className="eyebrow attendance-eyebrow">YOUR SCHOOL RHYTHM</span><h1>Attendance that tells your story</h1><p>Showing up is a superpower. You’re doing wonderfully, {profileValue(user, ["displayName"], "student")}!</p><div className="attendance-hero-tags"><span>✨ Consistent learner</span><span>🔥 4 day streak</span></div></div><div className="attendance-ring"><div><b>96</b><small>%</small><span>present</span></div></div></div><div className="attendance-summary"><div className="attendance-stat present-stat"><span>💚</span><div><small>Present</small><b>144 days</b><em>Great consistency</em></div></div><div className="attendance-stat late-stat"><span>🌤️</span><div><small>Late arrivals</small><b>3 days</b><em>Almost on time</em></div></div><div className="attendance-stat absent-stat"><span>🌸</span><div><small>Absent</small><b>2 days</b><em>Hope you’re feeling okay</em></div></div></div><div className="attendance-content"><section className="attendance-calendar-card"><div className="attendance-card-head"><div><span className="eyebrow">MONTHLY VIEW</span><h2>{month}</h2></div><div className="month-switch"><button onClick={() => setMonth("July 2026")}>‹</button><button onClick={() => setMonth("August 2026")}>›</button></div></div><div className="attendance-weekdays">{days.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="attendance-heatmap">{heat.map((status, index) => <div key={index} className={`attendance-day ${status}`}>{index + 1}</div>)}</div><div className="attendance-legend"><span><i className="present"/> Present</span><span><i className="late"/> Late</span><span><i className="absent"/> Absent</span><span><i className="holiday"/> Holiday</span></div></section><section className="attendance-side-card"><div className="attendance-card-head"><div><span className="eyebrow">THIS WEEK</span><h2>Little wins</h2></div><span className="sparkle-badge">✦</span></div><div className="week-bars">{[92, 100, 96, 100, 88].map((value, index) => <div className="week-bar" key={index}><div className="bar-track"><i style={{height: `${value}%`}}/></div><small>{["M", "T", "W", "T", "F"][index]}</small></div>)}</div><div className="attendance-quote"><span>♥</span><p>“Every day you show up, you make future-you proud.”</p></div><button className="attendance-report-button">Share report with family <ArrowRight size={14}/></button></section></div></div>;
}

function ProfilePage({ user, onUpdateProfile }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user || {});
  const fields = [["displayName", "Name"], ["className", "Class"], ["bloodGroup", "Blood group"], ["height", "Height"], ["weight", "Weight"], ["emergencyContact", "Emergency contact"], ["motherName", "Mother’s name"], ["fatherName", "Father’s name"]];
  const save = () => { onUpdateProfile(draft); setEditing(false); };
  return <div className="profile-editor-shell"><button className="profile-edit-floating" onClick={() => setEditing(true)}>✎ Edit my details</button><ProfileShowcase user={draft}/>{editing && <div className="edit-profile-overlay"><div className="edit-profile-modal"><button className="edit-close" onClick={() => setEditing(false)}>×</button><span className="eyebrow">MAKE IT YOURS</span><h2>Edit your details</h2><p>Keep your school profile fresh and up to date.</p><div className="edit-form">{fields.map(([key, label]) => <label key={key}><span>{label}</span><input value={draft?.[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} placeholder={`Add ${label.toLowerCase()}`} /></label>)}</div><div className="edit-actions"><button onClick={() => setEditing(false)}>Cancel</button><button className="save-profile" onClick={save}>Save changes <CheckCircle2 size={15}/></button></div></div></div>}</div>;
}

function ModulePage({ title, role, icon: Icon, search, onNavigate, user, onUpdateProfile, onSelect, onSelectTeacher, students: adminStudents, studentError, teachers: adminTeachers, teacherError, teacherWorkloads, teacherWorkloadError, onCreated, onWorkloadCreated, onWorkloadDeleted }) {
  if (["Admin", "SubAdmin"].includes(role) && adminDatasets[title]) return <AdminRecordsPage key={title} title={title} students={adminStudents} />;
  if (role === "Admin" && title === "Manual Correction") return <TeacherAttendancePage students={adminStudents} error={studentError} portalRole="Admin" />;
  if (["Admin", "SubAdmin"].includes(role) && title === "Students") return <AdminStudentsPage students={adminStudents} error={studentError} onSelect={onSelect} />;
  if (["Admin", "SubAdmin"].includes(role) && ["Classes", "Sections"].includes(title)) return <AdminClassesSectionsPage key={title} mode={title} />;
  if (role === "Admin" && title === "Teacher Performance") return <TeacherPerformancePage />;
  if ((role === "Admin" && ["Syllabus Management", "Syllabus", "Assigned Syllabus", "Pending", "Completed"].includes(title)) || (role === "Teacher" && title === "Lesson Planner") || (role === "Student" && title === "Syllabus")) return <SyllabusPage key={`${role}-${title}`} role={role} view={title} />;
  if (title === "Discipline Points") return <DisciplinePage role={role} />;
  if (title === "Teacher Adjustments" && role !== "Student") return <TeacherAdjustmentsPage role={role} user={user} />;
  if (["Admin", "SubAdmin"].includes(role) && ["All Students", "Student Documents"].includes(title)) return title === "Student Documents" ? <AdminRecordsPage title="Student Documents" students={adminStudents} /> : <AdminStudentsPage students={adminStudents} error={studentError} onSelect={onSelect} />;
  if (role === "Teacher" && (title === "Students" || title === "Student List")) return <TeacherStudentsPage students={adminStudents} error={studentError} />;
  if (role === "Admin" && (title === "Teachers" || title === "All Teachers")) return <AdminTeachersPage teachers={adminTeachers} error={teacherError} onSelect={onSelectTeacher} />;
  if (role === "Admin" && title === "Add Student") return <AdminAddStudentPage onBack={() => onNavigate("All Students")} onCreated={onCreated} />;
  if (["Admin", "SubAdmin"].includes(role) && title === "Fee Structure") return <FeeStructurePage canEdit={role === "Admin"} />;
  if (["Admin", "SubAdmin"].includes(role) && (title === "Facility" || title === "Inventory")) return <FacilityPage inventoryOnly={title === "Inventory"} canDelete={role === "Admin"} />;
  if (["Admin", "SubAdmin"].includes(role) && title === "Transport") return <TransportPage />;
  if (["Admin", "SubAdmin"].includes(role) && title === "Fee Collection") return <FeeCollectionPage user={user} />;
  if (["Admin", "SubAdmin"].includes(role) && title === "Fees Collection Report") return <FeesCollectionReportPage />;
  if (["Admin", "SubAdmin"].includes(role) && title === "Facility Report") return <FacilityReportPage />;
  if (["Admin", "SubAdmin"].includes(role) && title === "Expense Report") return <ExpenseReportPage />;
  if (["Admin", "SubAdmin"].includes(role) && (title === "Salary Structure" || title === "Salary")) return <PayrollPage admin />;
  if (role === "Teacher" && title === "Salary Slips") return <PayrollPage />;
  if (role === "Admin" && title === "Separation Portal") return <SeparationPortalPage />;
  if (role === "Admin" && title === "Teacher Workload") return <TeacherWorkloadPage workloads={teacherWorkloads} teachers={adminTeachers} error={teacherWorkloadError} onCreated={onWorkloadCreated} onDeleted={onWorkloadDeleted} />;
  if (title === "Assignments") return <ClassAssignmentsPage role={role} />;
  if (role === "Teacher" && title === "Exams") return <TeacherExamPage />;
  if (title === "Examinations") return <ExaminationsPage onNavigate={onNavigate} />;
  if (title === "Study Materials") return <StudyMaterialsPage onNavigate={onNavigate} />;
  if (title === "Fees") return <FeesPage onNavigate={onNavigate} user={user} />;
  if (title === "Profile" && role === "Teacher") return <><div className="mx-auto w-full max-w-[1200px]"><PageBack onNavigate={onNavigate}/></div><TeacherProfilePage user={user} onUpdateProfile={onUpdateProfile} /></>;
  if (title === "Profile" && role === "Admin") return <><div className="mx-auto w-full max-w-[1200px]"><PageBack onNavigate={onNavigate}/></div><AdminProfilePage user={user} onUpdateProfile={onUpdateProfile} /></>;
  if (title === "Profile") return <><div className="mx-auto w-full max-w-[1200px]"><PageBack onNavigate={onNavigate}/></div><StudentProfilePage user={user} onUpdateProfile={onUpdateProfile} /></>;
  if (role === "Admin" && ["Leave Management", "Leave Approvals"].includes(title)) return <LeaveManagementPage admin />;
  if (role === "Student" && title === "Leave Management") return <StudentLeavePage />;
  if (role === "Teacher" && title === "Student Leave Approvals") return <StudentLeavePage teacher />;
  if (role === "Teacher" && ["Leave Management", "Apply Leave"].includes(title)) return <LeaveManagementPage />;
  if (role === "Admin" && title === "Teachers Attendance") return <StaffAttendancePage admin teachers={adminTeachers} teacherError={teacherError} />;
  if (role === "Teacher" && title === "My Attendance") return <StaffAttendancePage />;
  if (role === "Teacher" && (title === "Attendance" || title === "Mark Attendance")) return <TeacherAttendancePage students={adminStudents} error={studentError} readOnly={title === "My Attendance"} />;
  if (title === "Attendance") return <><div className="mx-auto w-full max-w-[1200px]"><PageBack onNavigate={onNavigate}/></div><StudentAttendancePage user={user} /></>;
  if (title === "Timetable") return <><div className="mx-auto w-full max-w-[1200px]"><PageBack onNavigate={onNavigate}/></div><TimetablePage workloads={teacherWorkloads} role={role} user={user} /></>;
  if (title === "Profile") return <><PageBack onNavigate={onNavigate}/><ProfilePage user={user} onUpdateProfile={onUpdateProfile} /></>;
  if (title === "Attendance") return <><PageBack onNavigate={onNavigate}/><AttendancePage user={user} /></>;
  const descriptions = { Students: "Manage student profiles, guardians and class assignments.", Teachers: "Staff directory, teaching assignments and availability.", Academics: "Classes, sections, subjects and teacher assignments.", Attendance: "Daily attendance, history, alerts and attendance analytics.", Homework: "Assignments, attachments, submissions, deadlines and reminders.", "Exams & results": "Exam setup, marks, grades, report cards and performance trends.", "Fees & payments": "Fee structures, invoices, UPI payments, receipts and reconciliation.", Timetable: "Class and teacher schedules with conflict validation.", Announcements: "Publish important updates to parents, students and teachers.", "AI assistant": "Generate worksheets, report remarks and early-warning insights.", Settings: "School settings, academic years, roles and branding." };
  const rows = title === "Students" ? students : [["Class 10 · A", "Mathematics", "Active", "24 students"], ["Class 9 · B", "Science", "Active", "31 students"], ["Class 8 · A", "English", "Review", "28 students"], ["Class 7 · C", "Social studies", "Active", "26 students"]];
  return <div className="module-page"><div className="module-title"><div className="module-icon">{createElement(Icon, { size: 24 })}</div><div><p className="eyebrow">School management</p><h1>{title}</h1><p className="subtle">{descriptions[title]}</p></div><button className="primary-btn module-action" onClick={() => onNavigate(title === "Announcements" ? "Overview" : "Announcements")}>+ {title === "AI assistant" ? "Create insight" : "Add new"}</button></div><div className="module-toolbar"><div className="search module-search"><Search size={16}/><input placeholder={`Search ${title.toLowerCase()}...`} defaultValue={search}/></div><button className="filter-btn">Filter <ChevronDown size={14}/></button><button className="filter-btn">Export <FileText size={14}/></button></div><section className="panel table-panel module-table"><table><thead><tr><th>{title === "Students" ? "Student" : "Name / group"}</th><th>{title === "Students" ? "Class" : "Subject"}</th><th>Status</th><th>Details</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td><div className="person">{title === "Students" && <div className={`avatar avatar-${i}`}>{r[3]}</div>}<b>{r[0]}</b></div></td><td>{r[1]}</td><td><span className="status present">{r[2]}</span></td><td>{r[3] || "Updated today"}</td></tr>)}</tbody></table></section></div>;
}

export default App;
