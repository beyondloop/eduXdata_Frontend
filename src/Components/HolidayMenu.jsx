import { CalendarHeart } from "lucide-react";
import TeacherNavItem from "./TeacherNavItem";

const item = { label: "Holiday List", value: "Holiday List", icon: CalendarHeart };
export default function HolidayMenu({ active, onNavigate }) { return <TeacherNavItem item={item} active={active} onNavigate={onNavigate} />; }
