import { BarChart3, MessageSquare, ShieldCheck, Trophy, Users } from "lucide-react";
import TeacherNavGroup from "./TeacherNavGroup";

const group = { label: "Students", items: [{ label: "Students", value: "Students", icon: Users, children: [{ label: "Student List", value: "Student List", icon: Users }, { label: "Discipline Points", value: "Discipline Points", icon: ShieldCheck }, { label: "Performance", value: "Performance", icon: BarChart3 }, { label: "Remarks", value: "Remarks", icon: MessageSquare }, { label: "Achievements", value: "Achievements", icon: Trophy }] }] };
export default function StudentsMenu(props) { return <TeacherNavGroup {...props} group={group} />; }
