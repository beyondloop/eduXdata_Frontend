import { useEffect, useState } from "react";

export function getUserName(user) {
  return user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "School user";
}

export function getUserInitials(user) {
  const parts = getUserName(user).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function imageKey(role, user) {
  const id = user?.userId || user?.userCode || user?.id || "default";
  return role === "TEACHER" ? `edura_teacher_profile_image_${id}` : role === "ADMIN" ? "edura_admin_profile_image" : `edura_profile_image_${id}`;
}

export default function UserAvatar({ user, role, size = "normal", className: extraClass = "" }) {
  const key = imageKey(role || user?.role, user);
  const isAdmin = (role || user?.role) === "ADMIN";
  const [photo, setPhoto] = useState(() => user?.profileImage || user?.profilePicture || (!isAdmin && localStorage.getItem(key)));

  useEffect(() => {
    const syncPhoto = () => setPhoto(user?.profileImage || user?.profilePicture || (!isAdmin && localStorage.getItem(key)));
    syncPhoto();
    window.addEventListener("edura-profile-image-changed", syncPhoto);
    window.addEventListener("edura-teacher-image-changed", syncPhoto);
    window.addEventListener("edura-admin-image-changed", syncPhoto);
    return () => {
      window.removeEventListener("edura-profile-image-changed", syncPhoto);
      window.removeEventListener("edura-teacher-image-changed", syncPhoto);
      window.removeEventListener("edura-admin-image-changed", syncPhoto);
    };
  }, [key, isAdmin, user?.profileImage, user?.profilePicture]);

  const name = getUserName(user);
  const classes = {
    mini: "h-8 w-8 text-[9px]",
    normal: "h-9 w-9 text-[10px]",
    large: "h-12 w-12 text-sm",
  };
  const className = `shrink-0 rounded-full object-cover ${classes[size] || classes.normal} ${extraClass}`;

  return photo
    ? <img src={photo} alt={`${name} avatar`} className={className} />
    : <div aria-label={`${name} avatar`} className={`grid place-items-center bg-gradient-to-br from-indigo-500 to-sky-500 font-extrabold text-white ${className}`}>{getUserInitials(user)}</div>;
}

