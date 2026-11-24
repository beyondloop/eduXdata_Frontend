import UserAvatar from "./UserAvatar";

export default function TeacherAvatar({ user, size = "normal" }) {
  return <UserAvatar user={user} role="TEACHER" size={size} />;
}
