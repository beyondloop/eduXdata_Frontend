import { useEffect, useState } from "react";
import { Camera, CheckCircle2, ShieldCheck } from "lucide-react";
import UserAvatar, { getUserName } from "../Components/UserAvatar";
import { compressProfileImage } from "../lib/profileImage";

export default function AdminProfilePage({ user, onUpdateProfile }) {
  const [draft, setDraft] = useState(user || {});
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);
  useEffect(() => { if (!editing) setDraft(user || {}); }, [user, editing]);
  const name = getUserName(draft);

  const changePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) { setError("Choose a PNG, JPEG or WebP image up to 15 MB."); return; }
    setSaving(true); setError("");
    compressProfileImage(file).then(async profileImage => setDraft(await onUpdateProfile({ ...draft, profileImage })))
      .catch(failure => setError(failure.message || "Unable to save this profile photo."))
      .finally(() => setSaving(false));
  };

  const save = async () => {
    setSaving(true); setError("");
    try { await onUpdateProfile(draft); setEditing(false); }
    catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto w-full max-w-[900px]">
    {error && <p className="auth-error" role="alert">{error}</p>}
    <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-sky-500 p-7 text-white shadow-xl shadow-indigo-200">
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative"><UserAvatar user={draft} role="ADMIN" size="large" /><label className="absolute -bottom-2 -right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white text-indigo-600 shadow-lg" aria-label="Change admin photo"><Camera size={15}/><input type="file" accept="image/*" onChange={changePhoto} hidden /></label></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100">Administrator profile</p><h1 className="mt-2 truncate font-['Plus_Jakarta_Sans'] text-3xl font-extrabold">{name}</h1><p className="mt-1 text-xs text-indigo-100">{draft.email || "School administrator"} · {draft.userId || "Admin account"}</p></div>
      </div>
    </section>
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Account details</p><h2 className="mt-1 text-xl font-extrabold text-slate-800">Admin account</h2></div><button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-indigo-50 px-4 py-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">Edit details</button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Full name" value={name}/><Info label="Email" value={draft.email || "Not added yet"}/><Info label="User ID" value={draft.userId || "Not available"}/><Info label="Role" value="Administrator"/></div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-indigo-50 p-4 text-xs text-indigo-700"><ShieldCheck size={18}/><span>This account can manage school operations and user access.</span></div>
    </section>
    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-800">Edit admin profile</h2><button type="button" onClick={() => setEditing(false)} className="text-xl text-slate-400">×</button></div><label className="mt-5 block text-[11px] font-bold text-slate-500">Full name<input value={draft.displayName || ""} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700" /></label><label className="mt-3 block text-[11px] font-bold text-slate-500">Email<input type="email" value={draft.email || ""} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700" /></label><button type="button" onClick={save} disabled={saving} className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-[11px] font-bold text-white"><CheckCircle2 size={15}/> Save changes</button></div></div>}
  </div>;
}

function Info({ label, value }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><small className="text-[10px] text-slate-400">{label}</small><b className="mt-1 block truncate text-sm text-slate-700">{value}</b></div>;
}
