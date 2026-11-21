import { ClipboardCheck, History } from "lucide-react";
import TeacherNavGroup from "./TeacherNavGroup";

const group = { label: "Leave Management", items: [{ label: "Leave Management", value: "Leave Management", icon: ClipboardCheck, children: [{ label: "Student Leave Approvals", value: "Student Leave Approvals", icon: ClipboardCheck }, { label: "Apply Leave", value: "Apply Leave", icon: ClipboardCheck }, { label: "Mark Attendance", value: "Mark Attendance", icon: ClipboardCheck }, { label: "My Attendance", value: "My Attendance", icon: History }] }] };
export default function AttendanceMenu(props) { return <TeacherNavGroup {...props} group={group} />; }
