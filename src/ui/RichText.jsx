import React from 'react';
import { Box, Text } from 'ink';

// Parse inline markup within a single line of text
export function parseInline(text) {
  const tokens = [];
  // Order matters: ** before * so bold isn't consumed as two italics
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`\n]+)`/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'plain', text: text.slice(last, m.index) });
    if      (m[1] != null) tokens.push({ type: 'bold',   text: m[1] });
    else if (m[2] != null) tokens.push({ type: 'italic', text: m[2] });
    else if (m[3] != null) tokens.push({ type: 'code',   text: m[3] });
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push({ type: 'plain', text: text.slice(last) });
  return tokens;
}

function InlineTokens({ tokens }) {
  return tokens.map((tok, i) => {
    switch (tok.type) {
      case 'bold':   return <Text key={i} bold>{tok.text}</Text>;
      case 'italic': return <Text key={i} italic>{tok.text}</Text>;
      case 'code':   return <Text key={i} color="cyan">{tok.text}</Text>;
      default:       return <Text key={i}>{tok.text}</Text>;
    }
  });
}

// Split raw text into blocks before splitting by line (handles ``` fences)
export function parseBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || null;
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code-block', lang, text: codeLines.join('\n') });
      i++;
      continue;
    }

    blocks.push({ type: 'line', text: line });
    i++;
  }

  return blocks;
}

function RichLine({ text }) {
  // Blank line — small spacer
  if (text.trim() === '') return <Text> </Text>;

  // Headings
  if (text.startsWith('### ')) {
    return <Text bold color="greenBright"><InlineTokens tokens={parseInline(text.slice(4))} /></Text>;
  }
  if (text.startsWith('## ')) {
    return <Text bold color="cyan"><InlineTokens tokens={parseInline(text.slice(3))} /></Text>;
  }
  if (text.startsWith('# ')) {
    return <Text bold color="blueBright"><InlineTokens tokens={parseInline(text.slice(2))} /></Text>;
  }

  // Horizontal rule
  if (/^[-*_]{3,}$/.test(text.trim())) {
    return <Text color="gray" dimColor>{'─'.repeat(40)}</Text>;
  }

  // Unordered list
  if (/^(\s*)[*\-+] /.test(text)) {
    const indent = text.match(/^(\s*)/)[1].length;
    const content = text.replace(/^\s*[*\-+] /, '');
    return (
      <Text>
        <Text color="gray">{'  '.repeat(Math.floor(indent / 2))}{'• '}</Text>
        <InlineTokens tokens={parseInline(content)} />
      </Text>
    );
  }

  // Ordered list
  const orderedMatch = text.match(/^(\s*)(\d+)\. (.*)/);
  if (orderedMatch) {
    const indent = orderedMatch[1].length;
    return (
      <Text>
        <Text color="gray">{'  '.repeat(Math.floor(indent / 2))}{orderedMatch[2]}. </Text>
        <InlineTokens tokens={parseInline(orderedMatch[3])} />
      </Text>
    );
  }

  // Blockquote
  if (text.startsWith('> ')) {
    return (
      <Text>
        <Text color="gray" dimColor>│ </Text>
        <Text color="gray"><InlineTokens tokens={parseInline(text.slice(2))} /></Text>
      </Text>
    );
  }

  // Plain paragraph line
  return <Text><InlineTokens tokens={parseInline(text)} /></Text>;
}

export function RichText({ children }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const blocks = parseBlocks(text);

  return (
    <Box flexDirection="column">
      {blocks.map((block, i) => {
        if (block.type === 'code-block') {
          return (
            <Box key={i} flexDirection="column" marginY={0} paddingX={1} borderStyle="single" borderColor="gray">
              {block.lang && (
                <Text color="gray" dimColor>{block.lang}</Text>
              )}
              <Text color="greenBright">{block.text}</Text>
            </Box>
          );
        }
        return <RichLine key={i} text={block.text} />;
      })}
    </Box>
  );
}
