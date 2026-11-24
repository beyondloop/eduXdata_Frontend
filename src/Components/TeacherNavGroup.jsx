import TeacherNavItem from "./TeacherNavItem";

export default function TeacherNavGroup({ group, active, onNavigate, open, onToggle, allowedFeatures }) {
  const items = group.items.map((item) => ({ ...item, children: item.children?.filter((child) => !allowedFeatures || allowedFeatures.includes(child.value || child.label)) })).filter((item) => !allowedFeatures || (item.children ? item.children.length > 0 : allowedFeatures.includes(item.value || item.label)));
  if (!items.length) return null;
  return (
    <section className="mb-3">
      <div className="space-y-1">
        {items.map((item) => (
          <TeacherNavItem
            key={item.value}
            item={{ ...item, open: open[item.value], onToggle: () => onToggle(item.value) }}
            active={active}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}
