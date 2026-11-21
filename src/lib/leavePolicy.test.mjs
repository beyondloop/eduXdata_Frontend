import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leavePolicy, leaveBalances, emergencyLeaveAvailable } from './leavePolicy.js';

const row = (type, from, to, status = 'PENDING') => ({ leave_type: type, from_date: from, to_date: to, status });
test('circular balances subtract pending and approved days, restore rejected days, and never go negative', () => {
  const result = leaveBalances([row('SICK', '2026-01-01', '2026-01-02'), row('SICK', '2026-02-01', '2026-02-01', 'REJECTED'), row('CASUAL', '2026-03-01', '2026-03-07', 'APPROVED')], 2026);
  assert.deepEqual(result, [{type:'SICK',used:2,remaining:3,extra:0},{type:'CASUAL',used:7,remaining:0,extra:2}]);
});
test('two days versus three days', () => {
  assert.equal(leavePolicy([], 'SICK', '2026-09-01', '2026-09-02').proofRequired, false);
  assert.equal(leavePolicy([], 'SICK', '2026-09-01', '2026-09-03').proofRequired, true);
});
test('fifth day is within allowance; sixth day requires proof', () => {
  const history = [row('SICK', '2026-01-01', '2026-01-04')];
  assert.equal(leavePolicy(history, 'SICK', '2026-09-01', '2026-09-01').proofRequired, false);
  assert.equal(leavePolicy(history, 'SICK', '2026-09-01', '2026-09-02').proofRequired, true);
  assert.equal(leavePolicy(history, 'CASUAL', '2026-09-01', '2026-09-02').proofRequired, false);
});
test('rejected requests do not consume balance', () => {
  assert.equal(leavePolicy([row('SICK', '2026-01-01', '2026-01-05', 'REJECTED')], 'SICK', '2026-09-01', '2026-09-01').years[0].remaining, 5);
});
test('adjacent requests form a continuous absence across types', () => {
  const result = leavePolicy([row('SICK', '2026-09-03', '2026-09-03'), row('CASUAL', '2026-09-02', '2026-09-02', 'APPROVED')], 'SICK', '2026-09-01', '2026-09-01');
  assert.equal(result.consecutiveDays, 3);
  assert.equal(result.proofRequired, true);
});
test('cross-year usage and requests are split between years', () => {
  const result = leavePolicy([row('SICK', '2025-12-30', '2026-01-02')], 'SICK', '2026-12-31', '2027-01-01');
  assert.deepEqual(result.years.map(({ remaining, requested }) => [remaining, requested]), [[3, 1], [5, 1]]);
});
test('invalid ranges do not produce a request summary', () => {
  assert.equal(leavePolicy([], 'SICK', '', '').valid, false);
  assert.equal(leavePolicy([], 'SICK', '2026-09-03', '2026-09-01').valid, false);
});

test('excess days are unpaid, including when both allowances are exhausted', () => {
  const history = [row('SICK', '2026-01-01', '2026-01-05'), row('CASUAL', '2026-02-01', '2026-02-05', 'APPROVED')];
  const result = leavePolicy(history, 'SICK', '2026-09-01', '2026-09-02');
  assert.equal(result.paidDays, 0);
  assert.equal(result.unpaidDays, 2);
  const mixed = leavePolicy([row('SICK', '2026-01-01', '2026-01-04')], 'SICK', '2026-09-01', '2026-09-03');
  assert.equal(mixed.paidDays, 1);
  assert.equal(mixed.unpaidDays, 2);
});
test('unpaid preview splits years and releases rejected requests', () => {
  const history = [row('SICK', '2026-01-01', '2026-01-05'), row('SICK', '2027-02-01', '2027-02-05', 'REJECTED')];
  const result = leavePolicy(history, 'SICK', '2026-12-31', '2027-01-02');
  assert.equal(result.paidDays, 2);
  assert.equal(result.unpaidDays, 1);
});

test('emergency requires both balances exhausted in every requested year', () => {
  const sick = row('SICK', '2026-01-01', '2026-01-05', 'APPROVED');
  const casual = row('CASUAL', '2026-02-01', '2026-02-05');
  assert.equal(emergencyLeaveAvailable([sick], '2026-09-01', '2026-09-01'), false);
  assert.equal(emergencyLeaveAvailable([sick, casual], '2026-09-01', '2026-09-01'), true);
  assert.equal(emergencyLeaveAvailable([sick, {...casual, status: 'REJECTED'}], '2026-09-01', '2026-09-01'), false);
  assert.equal(emergencyLeaveAvailable([sick, casual], '2026-12-31', '2027-01-01'), false);
  const policy = leavePolicy([sick, casual], 'EMERGENCY', '2026-09-01', '2026-09-02');
  assert.equal(policy.paidDays, 2);
  assert.equal(policy.unpaidDays, 0);
  assert.equal(policy.proofRequired, true);
});
