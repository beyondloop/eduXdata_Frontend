import { Bell, Megaphone, MessageSquare } from "lucide-react";
import TeacherNavGroup from "./TeacherNavGroup";

const group = { label: "Communication", items: [{ label: "Communication", value: "Communication", icon: Megaphone, children: [{ label: "Announcements", value: "Announcements", icon: Megaphone }, { label: "Messages", value: "Messages", icon: MessageSquare }, { label: "Notifications", value: "Notifications", icon: Bell }] }] };
export default function CommunicationMenu(props) { return <TeacherNavGroup {...props} group={group} />; }
