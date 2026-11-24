import { FileText, ListTodo } from "lucide-react";
import TeacherNavGroup from "./TeacherNavGroup";

const group = { label: "Assignments & Tasks", items: [{ label: "Assignments & Tasks", value: "Assignments & Tasks", icon: ListTodo, children: [{ label: "Assignments", value: "Assignments", icon: FileText }] }] };
export default function AssignmentsMenu(props) { return <TeacherNavGroup {...props} group={group} />; }
