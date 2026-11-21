import { LayoutDashboard } from "lucide-react";
import TeacherNavItem from "./TeacherNavItem";

const item = { label: "Dashboard", value: "Overview", icon: LayoutDashboard };
export default function DashboardMenu({ active, onNavigate }) { return <TeacherNavItem item={item} active={active} onNavigate={onNavigate} />; }
