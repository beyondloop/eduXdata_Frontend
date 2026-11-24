import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePerformance, performanceGroups } from './teacherPerformance.js';

test('performance separates pending topics, late completions and stored point awards', () => {
  const topics = [
    { completed_at: '2026-10-01', completion_status: 'ON_TIME', points: 7, month: '2026-10' },
    { completed_at: '2026-10-02', completion_status: 'LATE', points: 2, month: '2026-10' },
    { completed_at: null, points: 0, month: '2026-11' },
  ];
  assert.deepEqual(summarizePerformance(topics), { total: 3, completed: 2, pending: 1, onTime: 1, late: 1, points: 9, percent: 50, rating: '2.5' });
  const monthly = performanceGroups(topics, t => t.month);
  assert.equal(monthly[0].points, 9);
  assert.equal(monthly[1].pending, 1);
  assert.equal(monthly[1].rating, '—');
});

test('no completions produces no rating and no division by zero', () => {
  const result = summarizePerformance([]);
  assert.equal(result.percent, 0);
  assert.equal(result.rating, '—');
  assert.equal(result.points, 0);
});
