const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / 86400000;
const daysWithin = (from, to, start, end) => Math.max(0, Math.min(dayNumber(to), dayNumber(end)) - Math.max(dayNumber(from), dayNumber(start)) + 1);

export function leaveBalances(entries, year) {
  return ["SICK", "CASUAL"].map((type) => {
    const used = entries.filter((entry) => entry.leave_type === type && ["PENDING", "APPROVED"].includes(entry.status))
      .reduce((total, entry) => total + daysWithin(entry.from_date, entry.to_date, `${year}-01-01`, `${year}-12-31`), 0);
    return { type, used, remaining: Math.max(0, 5 - used), extra: Math.max(0, used - 5) };
  });
}

export function emergencyLeaveAvailable(entries, from, to) {
  if (!from || !to || from > to) return false;
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    if (leaveBalances(entries, year).some(balance => balance.remaining > 0)) return false;
  }
  return Number.isFinite(dayNumber(from)) && Number.isFinite(dayNumber(to));
}

export function leavePolicy(entries, type, from, to) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && Number.isFinite(dayNumber(from)) && Number.isFinite(dayNumber(to)) && from <= to;
  if (!valid) return { valid: false, days: 0, years: [], proofRequired: false, consecutiveDays: 0, exceedsAllowance: false };
  const active = entries.filter((entry) => ["PENDING", "APPROVED"].includes(entry.status));
  const years = [];
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const used = active.filter((entry) => entry.leave_type === type).reduce((total, entry) => total + daysWithin(entry.from_date, entry.to_date, start, end), 0);
    const requested = daysWithin(from, to, start, end);
    years.push({ year, used, requested, remaining: type === "EMERGENCY" ? requested : Math.max(0, 5 - used), exceeds: type === "EMERGENCY" || used + requested > 5 });
  }
  let first = dayNumber(from), last = dayNumber(to), changed;
  do {
    changed = false;
    for (const entry of active) {
      const start = dayNumber(entry.from_date), end = dayNumber(entry.to_date);
      if (start <= last + 1 && end >= first - 1) {
        if (start < first) { first = start; changed = true; }
        if (end > last) { last = end; changed = true; }
      }
    }
  } while (changed);
  const consecutiveDays = last - first + 1;
  const exceedsAllowance = years.some((year) => year.exceeds);
  const unpaidDays = years.reduce((total, year) => total + Math.max(0, year.requested - year.remaining), 0);
  const days = dayNumber(to) - dayNumber(from) + 1;
  return { valid, days, paidDays: days - unpaidDays, unpaidDays, years, consecutiveDays, exceedsAllowance, proofRequired: consecutiveDays > 2 || exceedsAllowance };
}
