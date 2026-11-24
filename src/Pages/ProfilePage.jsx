import { useEffect, useState } from "react";
import UserAvatar from "../Components/UserAvatar";
import { CheckCircle2, Sparkles, ArrowRight, Pencil } from "lucide-react";


function profileValue(user, keys, fallback = "Not added yet") {
  const value = keys.map((key) => user?.[key]).find(Boolean);
  return value || fallback;
}

async function compressProfileImage(file) {
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read this image."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Choose a valid image file."));
    element.src = source;
  });
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Unable to prepare this image for upload.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to prepare this image for upload."));
    reader.readAsDataURL(blob);
  });
}function StudentAvatar({ user, size = "normal" }) { return <UserAvatar user={user} role="STUDENT" size={size} className={`student-avatar student-avatar-${size} ${size === "large" ? "!h-[142px] !w-[142px]" : ""}`} />; }  function ProfileShowcase({ user, onChangePhoto, onEditDetails }) {   const facts = [["Student name", ["displayName"], "School user"], ["User ID", ["userId", "userCode"]], ["School roll no.", ["rollNo", "schoolRollNo", "admissionNumber"]], ["Class", ["className", "class"], "Class 10 · A"], ["Class teacher", ["classTeacher", "classTeacherName"], "Not added yet"], ["Blood group", ["bloodGroup"]], ["Height", ["height"], "Not added yet"], ["Weight", ["weight"], "Not added yet"], ["Date of birth", ["dateOfBirth", "dob"]], ["Emergency contact", ["emergencyContact", "emergencyContactNumber"]], ["Mother’s name", ["motherName", "mothersName"]], ["Father’s name", ["fatherName", "fathersName"]]];   const name = profileValue(user, ["displayName"], "School user");   return <div className="profile-page playful-profile !mx-auto !w-full !max-w-[1200px]"><div className="profile-page-hero !min-h-[226px] !w-full"><button type="button" className="profile-edit-button student-edit-details" onClick={onEditDetails}><Pencil size={14} aria-hidden="true"/> Edit my details</button><div className="profile-hero-copy"><span className="eyebrow">YOUR LITTLE CORNER OF SCHOOL</span><h1>Hey, {name.split(" ")[0]}! <span>✦</span></h1><p>A snapshot of your school life, all in one happy place.</p><div className="profile-tags"><span>🌱 Growing every day</span><span>🎒 Class 10 · A</span></div></div><div className="profile-character"><div className="character-sun">✦</div><div className="student-profile-photo"><StudentAvatar user={user} size="large"/><label className="student-profile-photo-edit" title="Change profile photo"><Pencil size={14} aria-hidden="true"/><input type="file" accept="image/*" onChange={onChangePhoto} aria-label="Change profile photo" /></label></div><div className="character-speech">You’ve got this!</div></div></div><div className="profile-page-intro"><div><span className="eyebrow">YOUR STUDENT STORY</span><h2>Nice to meet you, {name.split(" ")[0]}!</h2><p>Here’s everything that makes your school profile uniquely yours.</p></div></div><div className="profile-highlight-row"><div className="profile-highlight purple-highlight"><span>🏆</span><div><small>THIS TERM</small><b>82% progress</b><em>+6.4% this term</em></div></div><div className="profile-highlight mint-highlight"><span>💚</span><div><small>ATTENDANCE</small><b>96% present</b><em>Great consistency</em></div></div><div className="profile-highlight yellow-highlight"><span>🔥</span><div><small>STREAK</small><b>4 days</b><em>Keep showing up</em></div></div></div><section className="profile-details-section"><div className="section-heading"><div><span className="eyebrow">THE IMPORTANT STUFF</span><h2>About {name.split(" ")[0]}</h2></div><span className="tiny-bubble">✨ private & safe</span></div><div className="profile-facts-grid">{facts.map(([label, keys, fallback]) => <div className="profile-fact" key={label}><div className="fact-dot"/><span>{label}</span><b>{profileValue(user, keys, fallback)}</b></div>)}</div></section><div className="profile-lower-row"><div className="profile-care-card"><div className="care-icon">♥</div><div><b>Your safe space</b><p>Your emergency details are kept private and used only when your safety matters.</p></div></div><div className="profile-quote-card"><span>“</span><p>Small steps every day add up to big, wonderful things.</p><b>— Your Edura buddy</b></div></div></div>; } function ProfilePage({ user, onUpdateProfile }) {   const [editing, setEditing] = useState(false); const [photoError, setPhotoError] = useState("");   const [draft, setDraft] = useState(user || {}); useEffect(() => setDraft(user || {}), [user]);   const fields = [["displayName", "Name"], ["className", "Class"], ["bloodGroup", "Blood group"], ["height", "Height"], ["weight", "Weight"], ["emergencyContact", "Emergency contact"], ["motherName", "Mother’s name"], ["fatherName", "Father’s name"]];   const save = () => { onUpdateProfile(draft); setEditing(false); };   const changePhoto = async event => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/")) { setPhotoError("Choose an image file."); return; } if (file.size > 15_000_000) { setPhotoError("Choose a profile photo under 15 MB."); event.target.value = ""; return; } try { const profileImage = await compressProfileImage(file); const saved = await onUpdateProfile({ profileImage }); setDraft(current => ({ ...current, ...saved })); setPhotoError(""); } catch (error) { setPhotoError(error.message || "Unable to save this profile photo. Restart the backend and try again."); } }; return <div className="profile-editor-shell"><ProfileShowcase user={draft} onChangePhoto={changePhoto} onEditDetails={() => setEditing(true)}/>{photoError && <p className="mx-auto mt-3 max-w-[1200px] text-sm text-rose-600" role="alert">{photoError}</p>}{editing && <div className="edit-profile-overlay"><div className="edit-profile-modal"><button className="edit-close" onClick={() => setEditing(false)}>×</button><span className="eyebrow">MAKE IT YOURS</span><h2>Edit your details</h2><p>Keep your school profile fresh and up to date.</p><div className="edit-form">{fields.map(([key, label]) => <label key={key}><span>{label}</span><input value={draft?.[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} placeholder={`Add ${label.toLowerCase()}`} /></label>)}</div><div className="edit-actions"><button onClick={() => setEditing(false)}>Cancel</button><button className="save-profile" onClick={save}>Save changes <CheckCircle2 size={15}/></button></div></div></div>}</div>; }
export default ProfilePage;


