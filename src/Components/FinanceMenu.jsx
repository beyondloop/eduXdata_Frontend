import { WalletCards, FileText } from "lucide-react";
import TeacherNavGroup from "./TeacherNavGroup";

const group = { items: [{ label: "Finance", value: "Finance", icon: WalletCards, children: [
  { label: "Monthly Salary Slips", value: "Salary Slips", icon: FileText },
] }] };
export default function FinanceMenu(props) { return <TeacherNavGroup {...props} group={group}/>; }
