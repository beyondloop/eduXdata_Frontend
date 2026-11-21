export function summarizePerformance(topics) {
  const completed = topics.filter(t => t.completed_at);
  const onTime = completed.filter(t => t.completion_status === 'ON_TIME').length;
  const percent = completed.length ? onTime / completed.length * 100 : 0;
  return { total: topics.length, completed: completed.length, pending: topics.length - completed.length,
    onTime, late: completed.length - onTime, points: completed.reduce((sum, t) => sum + Number(t.points || 0), 0),
    percent: Math.round(percent), rating: completed.length ? (percent / 20).toFixed(1) : '—' };
}
export function performanceGroups(topics, key) {
  const groups = new Map();
  topics.forEach(t => { const id = key(t); groups.set(id, [...(groups.get(id) || []), t]); });
  return [...groups].map(([id, rows]) => ({ id, topics: rows, ...summarizePerformance(rows) }));
}
