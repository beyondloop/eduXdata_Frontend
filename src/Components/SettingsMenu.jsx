import { Settings } from "lucide-react";
import TeacherNavItem from "./TeacherNavItem";

const item = { label: "Settings", value: "Settings", icon: Settings };
export default function SettingsMenu({ active, onNavigate }) { return <TeacherNavItem item={item} active={active} onNavigate={onNavigate} />; }
