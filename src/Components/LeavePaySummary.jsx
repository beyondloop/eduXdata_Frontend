export default function LeavePaySummary({ entry }) {
  if (entry.status === "REJECTED") return <p>Rejected — no leave balance or pay impact.</p>;
  if (entry.paid_days == null || entry.unpaid_days == null) return null;
  return <p className={Number(entry.unpaid_days) > 0 ? "leave-unpaid" : ""}>
    {entry.paid_days} paid days · {entry.unpaid_days} days leave without pay
    {entry.status === "PENDING" && " (if approved)"}
  </p>;
}
