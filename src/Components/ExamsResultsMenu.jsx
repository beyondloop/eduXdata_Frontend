import { ClipboardPenLine, FlaskConical } from "lucide-react";
import TeacherNavGroup from "./TeacherNavGroup";

const group = { label: "Exams & Results", items: [{ label: "Exams & Results", value: "Exams & Results", icon: FlaskConical, children: [{ label: "Exam", value: "Exams", icon: FlaskConical }, { label: "Enter Marks & Results", value: "Enter Marks & Results", icon: ClipboardPenLine }] }] };
export default function ExamsResultsMenu(props) { return <TeacherNavGroup {...props} group={group} />; }
