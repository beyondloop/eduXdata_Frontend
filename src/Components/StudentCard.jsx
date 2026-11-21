import { Pencil } from "lucide-react";
import UserAvatar from "./UserAvatar";

export default function StudentCard({ student = {}, onEditProfile }) {
  const name = student.displayName || "Student";

  return <div className="relative overflow-hidden rounded-xl bg-[#1C2241] px-5 py-4 text-white shadow-md">
    <div className="absolute right-0 top-0 h-20 w-20" aria-hidden="true"><div className="absolute right-2 top-2 h-4 w-4 rotate-45 border-2 border-blue-400"/><div className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-red-500"/><div className="absolute left-6 top-6 h-3 w-3 rotate-45 border-l-4 border-t-4 border-cyan-300"/></div>
    <div className="relative flex flex-col gap-4"><div className="flex items-start gap-4"><UserAvatar user={student} role="STUDENT" size="large" className="!h-16 !w-16 rounded-md border-2 border-white"/><div className="flex flex-col"><span className="w-fit rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-blue-700">{student.userId || student.userCode || "Student"}</span><h2 className="mt-1 text-lg font-bold">{name}</h2><div className="mt-0.5 text-sm text-gray-300">Class: {student.className || "—"}<span className="mx-2 text-white">|</span>Roll No: {student.rollNumber || student.rollNo || "—"}</div></div></div><hr className="border-gray-500"/><div className="flex flex-wrap items-center justify-between gap-4"><span className="text-sm">{student.sectionName || "Student profile"}</span><button type="button" onClick={onEditProfile} className="flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"><Pencil size={14}/>Edit Profile</button></div></div>
  </div>;
}
