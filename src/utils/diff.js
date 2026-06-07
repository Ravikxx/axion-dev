const MAX_LINES = 400; // skip LCS for huge files

// Returns array of { type: 'add'|'remove'|'context', line, lineNo }
// lineNo is the new-file line number for add/context, old-file for remove
export function diffLines(oldText, newText) {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');

  // New file — everything added
  if (!oldText) {
    return newLines.map((line, i) => ({ type: 'add', line, lineNo: i + 1 }));
  }

  // Files identical
  if (oldText === newText) return [];

  // Too large for LCS — treat as full replacement
  if (oldLines.length > MAX_LINES || newLines.length > MAX_LINES) {
    const removed = oldLines.map((line, i) => ({ type: 'remove', line, lineNo: i + 1 }));
    const added   = newLines.map((line, i) => ({ type: 'add',    line, lineNo: i + 1 }));
    return [...removed, ...added];
  }

  return lcs(oldLines, newLines);
}

function lcs(oldLines, newLines) {
  const m = oldLines.length, n = newLines.length;

  // Build DP table using Int32Array for speed
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push(new Int32Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'context', line: oldLines[i - 1], lineNo: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', line: newLines[j - 1], lineNo: j });
      j--;
    } else {
      result.unshift({ type: 'remove', line: oldLines[i - 1], lineNo: i });
      i--;
    }
  }
  return result;
}

// Returns lines to display in collapsed mode: changed lines + N context around each hunk,
// with { type: 'gap', count } entries where context is elided.
export function collapseDiff(diff, contextLines = 2) {
  if (!diff.length) return [];

  const show = new Set();
  diff.forEach((d, i) => {
    if (d.type !== 'context') {
      for (let k = Math.max(0, i - contextLines); k <= Math.min(diff.length - 1, i + contextLines); k++) {
        show.add(k);
      }
    }
  });

  if (!show.size) return [];

  const indices = [...show].sort((a, b) => a - b);
  const out = [];
  let prev = -1;

  for (const idx of indices) {
    if (prev !== -1 && idx > prev + 1) {
      out.push({ type: 'gap', count: idx - prev - 1 });
    }
    out.push(diff[idx]);
    prev = idx;
  }

  return out;
}

export function diffStats(diff) {
  let added = 0, removed = 0;
  for (const d of diff) {
    if (d.type === 'add')    added++;
    if (d.type === 'remove') removed++;
  }
  return { added, removed };
}
