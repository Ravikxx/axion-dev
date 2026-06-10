import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines, collapseDiff, diffStats } from '../src/utils/diff.js';

// ── diffLines ─────────────────────────────────────────────────────────────────

test('identical texts produce empty diff', () => {
  assert.deepEqual(diffLines('a\nb', 'a\nb'), []);
});

test('new file (empty oldText) — all lines are adds', () => {
  const result = diffLines('', 'foo\nbar');
  assert.equal(result.length, 2);
  assert.ok(result.every(d => d.type === 'add'));
  assert.equal(result[0].line, 'foo');
  assert.equal(result[1].line, 'bar');
  assert.equal(result[0].lineNo, 1);
  assert.equal(result[1].lineNo, 2);
});

test('null oldText treated as new file', () => {
  const result = diffLines(null, 'x');
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'add');
});

test('added line at end', () => {
  const result = diffLines('a', 'a\nb');
  const adds = result.filter(d => d.type === 'add');
  assert.equal(adds.length, 1);
  assert.equal(adds[0].line, 'b');
});

test('removed line', () => {
  const result = diffLines('a\nb', 'a');
  const removes = result.filter(d => d.type === 'remove');
  assert.equal(removes.length, 1);
  assert.equal(removes[0].line, 'b');
});

test('changed line appears as remove + add', () => {
  const result = diffLines('hello', 'world');
  assert.ok(result.some(d => d.type === 'remove' && d.line === 'hello'));
  assert.ok(result.some(d => d.type === 'add'    && d.line === 'world'));
});

test('context lines are present around changes', () => {
  const result = diffLines('a\nb\nc', 'a\nX\nc');
  assert.ok(result.some(d => d.type === 'context' && d.line === 'a'));
  assert.ok(result.some(d => d.type === 'context' && d.line === 'c'));
  assert.ok(result.some(d => d.type === 'remove'  && d.line === 'b'));
  assert.ok(result.some(d => d.type === 'add'     && d.line === 'X'));
});

// ── collapseDiff ──────────────────────────────────────────────────────────────

test('empty diff stays empty', () => {
  assert.deepEqual(collapseDiff([]), []);
});

test('all-context diff (no changes) collapses to empty', () => {
  const diff = [
    { type: 'context', line: 'a', lineNo: 1 },
    { type: 'context', line: 'b', lineNo: 2 },
  ];
  assert.deepEqual(collapseDiff(diff, 2), []);
});

test('leading context before first change is silently dropped (no leading gap)', () => {
  // 10 context lines followed by one add — no gap because nothing precedes the first shown index
  const diff = [];
  for (let i = 1; i <= 10; i++) diff.push({ type: 'context', line: `L${i}`, lineNo: i });
  diff.push({ type: 'add', line: 'new', lineNo: 11 });

  const collapsed = collapseDiff(diff, 2);
  assert.ok(!collapsed.find(d => d.type === 'gap'), 'no gap for leading context');
  // Only the 2 context lines immediately before the change + the add itself
  assert.equal(collapsed.length, 3);
  assert.equal(collapsed[2].type, 'add');
});

test('gap inserted between two separate change hunks', () => {
  // add at 0, 2 context (elided), add at 5 — with contextLines=1
  const diff = [
    { type: 'add',     line: 'A', lineNo: 1 },
    { type: 'context', line: 'C1', lineNo: 2 },
    { type: 'context', line: 'C2', lineNo: 3 },
    { type: 'context', line: 'C3', lineNo: 4 },
    { type: 'context', line: 'C4', lineNo: 5 },
    { type: 'add',     line: 'B', lineNo: 6 },
  ];
  const collapsed = collapseDiff(diff, 1);
  // show = {0,1,4,5}; gap between 1 and 4 → count = 4-1-1 = 2
  const gap = collapsed.find(d => d.type === 'gap');
  assert.ok(gap, 'gap entry must exist between two separate hunks');
  assert.equal(gap.count, 2);
});

// ── diffStats ─────────────────────────────────────────────────────────────────

test('counts adds and removes', () => {
  const diff = [
    { type: 'add',     line: 'x', lineNo: 1 },
    { type: 'add',     line: 'y', lineNo: 2 },
    { type: 'remove',  line: 'z', lineNo: 1 },
    { type: 'context', line: 'w', lineNo: 3 },
  ];
  assert.deepEqual(diffStats(diff), { added: 2, removed: 1 });
});

test('empty diff has zero stats', () => {
  assert.deepEqual(diffStats([]), { added: 0, removed: 0 });
});

test('all-context diff has zero stats', () => {
  const diff = [{ type: 'context', line: 'a', lineNo: 1 }];
  assert.deepEqual(diffStats(diff), { added: 0, removed: 0 });
});
