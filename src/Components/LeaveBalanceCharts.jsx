import { leaveBalances } from "../lib/leavePolicy";

export default function LeaveBalanceCharts({ entries, year, loading, error }) {
  return <aside className="leave-balance-charts" aria-label="Annual leave balances">
    <p className="staff-kicker">YOUR LEAVE BALANCE</p><h2>Time for you</h2><p className="leave-balance-year">January – December {year}</p>
    <div className="leave-balance-rings">{leaveBalances(entries, year).map(({ type, used, remaining, extra }) => <section className={`leave-ring-card ${type.toLowerCase()}`} key={type}>
      <h3>{type === "SICK" ? "Sick leave" : "Casual leave"}</h3>
      <div className="leave-ring" role="img" aria-label={loading ? "Loading balance" : error ? "Balance unavailable" : `${remaining} of 5 days remaining; ${used} days used`}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="leave-ring-track" cx="60" cy="60" r="49"/><circle className="leave-ring-value" cx="60" cy="60" r="49" pathLength="100" strokeDasharray={`${loading || error ? 0 : remaining * 20} 100`} transform="rotate(-90 60 60)"/></svg>
        <div><strong>{loading ? "…" : error ? "—" : remaining}</strong><span>of 5 days left</span></div>
      </div>
      <p>{loading ? "Checking usage…" : error ? "Balance unavailable" : `${used} ${used === 1 ? "day" : "days"} used`}</p>{extra > 0 && !error && !loading && <small>{extra} {extra === 1 ? "day" : "days"} leave without pay (pending or approved)</small>}
    </section>)}</div>
    <p className="leave-balance-note">Balances reduce when you apply. Pending and approved days count; rejected days are restored.</p>
  </aside>;
}
