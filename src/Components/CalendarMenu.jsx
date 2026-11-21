import { CalendarDays } from "lucide-react";
import TeacherNavItem from "./TeacherNavItem";

const item = { label: "Calendar", value: "Calendar", icon: CalendarDays };
export default function CalendarMenu({ active, onNavigate }) { return <TeacherNavItem item={item} active={active} onNavigate={onNavigate} />; }
