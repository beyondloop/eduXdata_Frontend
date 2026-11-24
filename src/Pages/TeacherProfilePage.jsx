import { createElement, useState } from "react";
import { Camera, CheckCircle2, Mail, Phone, UserRound } from "lucide-react";
import TeacherAvatar from "../Components/TeacherAvatar";

export default function TeacherProfilePage({ user, onUpdateProfile }) {
  const [draft, setDraft] = useState(user || {});
  const [editing, setEditing] = useState(false);
  const name = draft.displayName || "Teacher";
  const changePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { localStorage.setItem(`edura_teacher_profile_image_${user?.userId || user?.userCode || user?.id || "default"}`, reader.result); window.dispatchEvent(new Event("edura-teacher-image-changed")); };
    reader.readAsDataURL(file);
  };
  const save = () => { onUpdateProfile(draft); setEditing(false); };

  return <div className="mx-auto max-w-[1100px]">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-7 text-white shadow-xl shadow-indigo-200 sm:p-10">
      <div className="relative z-10 flex flex-wrap items-center gap-5"><div className="relative"><TeacherAvatar user={draft} size="large" /><label className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white text-indigo-600 shadow-lg" aria-label="Change profile photo"><Camera size={15} /><input type="file" accept="image/*" onChange={changePhoto} hidden /></label></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100">Teacher profile</p><h1 className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-extrabold">{name}</h1><p className="mt-1 text-xs text-indigo-100">{draft.subject || "Faculty member"} · {draft.userId || draft.userCode || "Teacher account"}</p></div></div>
    </section>
    <div className="mt-6 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Personal details</p><h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-slate-800">About {name.split(/\s+/)[0]}</h2></div><button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-indigo-50 px-4 py-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">Edit profile</button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info icon={UserRound} label="Full name" value={name} /><Info icon={Mail} label="Email" value={draft.email || "Not added yet"} /><Info icon={Phone} label="Phone" value={draft.phone || draft.contactNumber || "Not added yet"} /><Info icon={UserRound} label="Subject" value={draft.subject || "Not added yet"} /><Info icon={UserRound} label="Employee ID" value={draft.userId || draft.userCode || "Not added yet"} /></div>
    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-800">Edit teacher profile</h2><button type="button" onClick={() => setEditing(false)} className="text-xl text-slate-400">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Full name" value={draft.displayName} onChange={(value) => setDraft({ ...draft, displayName: value })} /><Field label="Email" value={draft.email} onChange={(value) => setDraft({ ...draft, email: value })} /><Field label="Phone" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} /><Field label="Subject" value={draft.subject} onChange={(value) => setDraft({ ...draft, subject: value })} /></div><button type="button" onClick={save} className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-[11px] font-bold text-white"><CheckCircle2 size={15} /> Save changes</button></div></div>}
  </div>;
}

function Info({ icon, label, value }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{createElement(icon, { size: 17, className: "text-indigo-500" })}<p className="mt-3 text-[10px] text-slate-400">{label}</p><strong className="mt-1 block truncate text-xs text-slate-700">{value}</strong></div>; }
function Field({ label, value, onChange }) { return <label className="text-[10px] font-bold text-slate-500">{label}<input value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400" /></label>; }
