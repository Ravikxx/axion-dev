import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSchedule, isDue } from '../src/scheduler.js';

// ── parseSchedule ─────────────────────────────────────────────────────────────

test('interval: every Nm', () => {
  assert.deepEqual(parseSchedule('every 30m'), { type: 'interval', minutes: 30 });
  assert.deepEqual(parseSchedule('every 1m'),  { type: 'interval', minutes: 1  });
  assert.deepEqual(parseSchedule('every 0m'),  { type: 'interval', minutes: 0  });
});

test('interval: every Nh', () => {
  assert.deepEqual(parseSchedule('every 2h'),  { type: 'interval', minutes: 120 });
  assert.deepEqual(parseSchedule('every 1h'),  { type: 'interval', minutes: 60  });
  assert.deepEqual(parseSchedule('every 24h'), { type: 'interval', minutes: 1440 });
});

test('daily HH:MM', () => {
  assert.deepEqual(parseSchedule('daily 09:00'), { type: 'daily', hour: 9,  minute: 0  });
  assert.deepEqual(parseSchedule('daily 00:00'), { type: 'daily', hour: 0,  minute: 0  });
  assert.deepEqual(parseSchedule('daily 23:59'), { type: 'daily', hour: 23, minute: 59 });
  assert.deepEqual(parseSchedule('daily 9:05'),  { type: 'daily', hour: 9,  minute: 5  });
});

test('weekly <day> HH:MM', () => {
  assert.deepEqual(parseSchedule('weekly mon 09:00'), { type: 'weekly', day: 1, hour: 9,  minute: 0  });
  assert.deepEqual(parseSchedule('weekly sun 00:00'), { type: 'weekly', day: 0, hour: 0,  minute: 0  });
  assert.deepEqual(parseSchedule('weekly sat 23:59'), { type: 'weekly', day: 6, hour: 23, minute: 59 });
  assert.deepEqual(parseSchedule('weekly fri 12:30'), { type: 'weekly', day: 5, hour: 12, minute: 30 });
});

test('case-insensitive input', () => {
  assert.deepEqual(parseSchedule('EVERY 30M'),        { type: 'interval', minutes: 30 });
  assert.deepEqual(parseSchedule('Daily 09:00'),      { type: 'daily', hour: 9, minute: 0 });
  assert.deepEqual(parseSchedule('Weekly MON 09:00'), { type: 'weekly', day: 1, hour: 9, minute: 0 });
});

test('trims whitespace', () => {
  assert.deepEqual(parseSchedule('  every 5m  '), { type: 'interval', minutes: 5 });
});

test('invalid expressions return null', () => {
  assert.equal(parseSchedule(''),             null);
  assert.equal(parseSchedule('every'),        null);
  assert.equal(parseSchedule('every 5'),      null);
  assert.equal(parseSchedule('every 5s'),     null);
  assert.equal(parseSchedule('daily'),        null);
  assert.equal(parseSchedule('daily 9'),      null);
  assert.equal(parseSchedule('weekly mon'),   null);
  assert.equal(parseSchedule('random text'),  null);
});

// ── isDue ─────────────────────────────────────────────────────────────────────

test('interval: no lastRun → always due', () => {
  assert.equal(isDue({ type: 'interval', minutes: 30 }, null), true);
});

test('interval: ran recently → not due', () => {
  const lastRun = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5m ago
  assert.equal(isDue({ type: 'interval', minutes: 30 }, lastRun), false);
});

test('interval: ran long ago → due', () => {
  const lastRun = new Date(Date.now() - 31 * 60 * 1000).toISOString(); // 31m ago
  assert.equal(isDue({ type: 'interval', minutes: 30 }, lastRun), true);
});

test('isDue accepts a string schedule expression', () => {
  assert.equal(isDue('every 30m', null), true);
});

test('isDue returns false for null/invalid schedule', () => {
  assert.equal(isDue(null, null), false);
  assert.equal(isDue('garbage', null), false);
});
