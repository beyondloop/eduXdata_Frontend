import { BookMarked, BookOpen, BookOpenCheck, CalendarClock, ClipboardList, Users } from "lucide-react";
import TeacherNavGroup from "./TeacherNavGroup";

const group = { label: "Academic", items: [{ label: "Academic", value: "Academic", icon: BookOpen, children: [{ label: "My Classes", value: "My Classes", icon: Users }, { label: "Teacher Adjustments", value: "Teacher Adjustments", icon: CalendarClock }, { label: "Lesson Planner", value: "Lesson Planner", icon: BookOpenCheck }, { label: "Classwork", value: "Classwork", icon: ClipboardList }, { label: "Study Materials", value: "Study Materials", icon: BookMarked }] }] };
export default function AcademicMenu(props) { return <TeacherNavGroup {...props} group={group} />; }
