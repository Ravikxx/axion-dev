import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

export function InputBox({
  onSubmit, disabled, placeholder, onChange, tabCompletion,
  onToggleExpand, onToggleThinking, onCycleMode,
  onInterrupt, interruptActive,
}) {
  const [value, setValue] = useState('');
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [draft, setDraft] = useState(''); // preserves in-progress text while browsing history

  const isActive = process.stdin.isTTY !== false;

  // Notify parent of value changes for autocomplete
  useEffect(() => { onChange?.(value); }, [value]);

  const set = (v, c) => { setValue(v); setCursor(Math.max(0, Math.min(c, v.length))); };

  useInput(
    (input, key) => {
      // Esc interrupts a running agent turn even while "disabled" isn't set
      if (key.escape && interruptActive) { onInterrupt?.(); return; }

      if (disabled) return;

      if (key.return) {
        const trimmed = value.trim();
        if (!trimmed) return;
        setHistory((h) => [...h, trimmed]);
        setHistoryIdx(-1);
        setDraft('');
        set('', 0);
        onChange?.('');
        onSubmit(trimmed);
        return;
      }

      // Esc — clear the input (or exit history browsing back to a fresh line)
      if (key.escape) {
        setHistoryIdx(-1);
        setDraft('');
        set('', 0);
        return;
      }

      // Tab — complete the top suggestion
      if (key.tab && tabCompletion) {
        set(tabCompletion, tabCompletion.length);
        return;
      }

      if (key.leftArrow)  { setCursor((c) => Math.max(0, c - 1)); return; }
      if (key.rightArrow) { setCursor((c) => Math.min(value.length, c + 1)); return; }

      if (key.upArrow) {
        if (!history.length) return;
        if (historyIdx === -1) setDraft(value); // save what's being typed
        const newIdx = Math.min(historyIdx + 1, history.length - 1);
        const recalled = history[history.length - 1 - newIdx] || '';
        setHistoryIdx(newIdx);
        set(recalled, recalled.length);
        return;
      }

      if (key.downArrow) {
        if (historyIdx === -1) return;
        const newIdx = Math.max(historyIdx - 1, -1);
        const next = newIdx === -1 ? draft : history[history.length - 1 - newIdx] || '';
        setHistoryIdx(newIdx);
        set(next, next.length);
        return;
      }

      if (key.backspace || key.delete) {
        if (cursor === 0) return;
        set(value.slice(0, cursor - 1) + value.slice(cursor), cursor - 1);
        return;
      }

      if (key.ctrl) {
        switch (input) {
          case 'c': process.exit(0); return;
          case 'a': setCursor(0); return;                              // start of line
          case 'e': setCursor(value.length); return;                   // end of line
          case 'u': set('', 0); return;                                // clear line
          case 'k': set(value.slice(0, cursor), cursor); return;       // kill to end
          case 'w': {                                                  // delete word before cursor
            const left = value.slice(0, cursor).replace(/\S+\s*$/, '');
            set(left + value.slice(cursor), left.length);
            return;
          }
          case 'o': onToggleExpand?.();   return;
          case 't': onToggleThinking?.(); return;
          case 'p': onCycleMode?.();      return;
          default: return;
        }
      }

      if (!key.meta && input) {
        if (historyIdx !== -1) setHistoryIdx(-1); // editing a recalled entry starts a new draft
        set(value.slice(0, cursor) + input + value.slice(cursor), cursor + input.length);
      }
    },
    { isActive }
  );

  const isCmd = value.startsWith('/');
  const borderColor = disabled ? 'gray' : isCmd ? 'yellow' : 'blueBright';
  const promptColor = disabled ? 'gray' : isCmd ? 'yellow' : 'blueBright';

  return (
    <Box borderStyle="round" borderColor={borderColor} paddingX={1} marginX={1} marginTop={0}>
      <Text color={promptColor} bold>{'›'} </Text>
      {value ? (
        <Text>
          <Text color="white">{value.slice(0, cursor)}</Text>
          {!disabled && <Text inverse color="white">{value[cursor] ?? ' '}</Text>}
          <Text color="white">{value.slice(cursor + 1)}</Text>
        </Text>
      ) : (
        <Text>
          {!disabled && <Text inverse color="white"> </Text>}
          <Text color="gray" dimColor>{placeholder || ''}</Text>
        </Text>
      )}
    </Box>
  );
}

export function YesNoPrompt({ onAnswer }) {
  const isActive = process.stdin.isTTY !== false;
  useInput((input, key) => {
    const ch = input.toLowerCase();
    if (ch === 'y' || key.return) onAnswer(true);
    else if (ch === 'n' || key.escape) onAnswer(false);
  }, { isActive });
  return null;
}
