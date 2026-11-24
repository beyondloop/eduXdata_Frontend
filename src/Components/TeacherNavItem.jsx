import { ChevronDown } from "lucide-react";

export default function TeacherNavItem({ item, active, onNavigate, level = 0 }) {
  const { label, value = label, icon: Icon, children, open, onToggle } = item;
  const isActive = active === value;
  const hasActiveChild = children?.some((child) => (child.value || child.label) === active);

  return (
    <div>
      <button
        type="button"
        onClick={() => (children ? onToggle() : onNavigate(value))}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={children ? open : undefined}
        className={`nav-item ${level ? "portal-submenu-item" : ""} ${isActive || hasActiveChild ? "active" : ""} group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition-colors ${
          level ? "pl-11 text-slate-500" : "text-slate-600"
        } ${isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 hover:text-indigo-700"}`}
      >
        {Icon && <Icon size={level ? 14 : 17} strokeWidth={isActive ? 2.4 : 2} />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {children && <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {children && open && (
        <div className="portal-submenu mt-1 space-y-0.5">
          {children.map((child) => (
            <TeacherNavItem key={child.value} item={child} active={active} onNavigate={onNavigate} level={1} />
          ))}
        </div>
      )}
    </div>
  );
}
