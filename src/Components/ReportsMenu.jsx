import { BarChart3 } from "lucide-react";
import TeacherNavItem from "./TeacherNavItem";

const item = { label: "Reports", value: "Reports", icon: BarChart3 };
export default function ReportsMenu({ active, onNavigate }) { return <TeacherNavItem item={item} active={active} onNavigate={onNavigate} />; }
