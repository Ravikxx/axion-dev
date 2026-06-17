import React from 'react';
import { Box, Text } from 'ink';
import { ToolBlock } from './ToolBlock.jsx';
import { RichText } from './RichText.jsx';

export function MessageRow({ msg, expanded = false, thinkingExpanded = false }) {
  switch (msg.type) {
    case 'user':
      return (
        <Box marginTop={1} gap={1} paddingX={1}>
          <Text color="blueBright" bold>you</Text>
          <Text color="gray">›</Text>
          <Text color="white">{msg.content}</Text>
        </Box>
      );

    case 'assistant':
      return (
        <Box marginTop={1} flexDirection="column" paddingX={1}>
          <Text color="greenBright" bold>Axion</Text>
          <Box marginLeft={2} flexDirection="column">
            <RichText>{msg.streaming ? msg.content + ' ▋' : msg.content}</RichText>
          </Box>
        </Box>
      );

    case 'thinking': {
      const content   = msg.content || '';
      const charCount = content.length;
      const sizeLabel = charCount > 500 ? `${(charCount / 1000).toFixed(1)}k chars` : `${charCount} chars`;
      // Expanded by default; Ctrl+T collapses. When collapsed show a one-line preview.
      const collapsed = !thinkingExpanded;
      const preview   = content.split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
      const previewTrunc = preview.length > 80 ? preview.slice(0, 80) + '…' : preview;
      return (
        <Box marginTop={1} flexDirection="column" paddingX={1} marginLeft={1}>
          {/* Header row */}
          <Box gap={1}>
            <Text color="magenta">◈</Text>
            <Text color="magenta" bold>thinking</Text>
            <Text color="gray">·</Text>
            <Text color="gray">{sizeLabel}</Text>
            <Text color="gray">·</Text>
            <Text color="gray">{collapsed ? 'Ctrl+T to expand' : 'Ctrl+T to collapse'}</Text>
          </Box>
          {/* Collapsed: one-line preview only */}
          {collapsed && previewTrunc && (
            <Box marginLeft={3}>
              <Text color="magenta" italic>{previewTrunc}</Text>
            </Box>
          )}
          {/* Expanded: full content rendered as markdown */}
          {!collapsed && (
            <Box
              marginLeft={2}
              marginTop={0}
              flexDirection="column"
              borderStyle="single"
              borderColor="magenta"
              borderLeft borderRight={false} borderTop={false} borderBottom={false}
              paddingLeft={1}
            >
              <RichText>{content}</RichText>
            </Box>
          )}
        </Box>
      );
    }

    case 'btw':
      return (
        <Box marginTop={1} flexDirection="column" marginX={1} borderStyle="round" borderColor="magenta" paddingX={1}>
          <Text color="magenta" bold>btw</Text>
          <RichText>{msg.content}</RichText>
        </Box>
      );

    case 'agent-msg':
      return (
        <Box marginTop={0} paddingX={1} gap={1}>
          <Text color="cyan">📨</Text>
          <Text color="cyan" bold>{msg.from}</Text>
          <Text color="gray">→</Text>
          <Text color="cyan" bold>{msg.to}</Text>
          <Text color="gray">  "{msg.content}"</Text>
        </Box>
      );

    case 'sub-agent':
      return (
        <Box marginTop={0} flexDirection="column" paddingX={1}>
          <Box gap={1}>
            <Text color="magenta">⟳</Text>
            <Text color="magenta" bold>{msg.label || 'agent'}</Text>
          </Box>
          <Box marginLeft={2} flexDirection="column">
            <RichText>{msg.content}</RichText>
          </Box>
        </Box>
      );

    case 'adviser':
      return (
        <Box marginTop={1} flexDirection="column" marginX={1}>
          <Box gap={1}>
            <Text color="yellow">◈</Text>
            <Text color="yellow" bold>Adviser</Text>
            <Text color="gray">{msg.label || ''}</Text>
          </Box>
          <Box marginLeft={2} flexDirection="column">
            <RichText>{msg.content}</RichText>
          </Box>
        </Box>
      );

    case 'plan':
      return (
        <Box marginTop={1} marginX={1} flexDirection="column">
          <Text color="yellowBright" bold>◈ Plan</Text>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="yellow"
            borderLeft borderRight={false} borderTop={false} borderBottom={false}
            paddingLeft={1}
          >
            <RichText>{msg.content}</RichText>
          </Box>
        </Box>
      );

    case 'tool':
      return (
        <Box marginTop={0}>
          <ToolBlock
            name={msg.name}
            input={msg.input}
            output={msg.output}
            success={msg.success}
            pending={msg.pending}
            diff={msg.diff || null}
            expanded={expanded}
          />
        </Box>
      );

    case 'error':
      return (
        <Box marginTop={1} gap={1} paddingX={1}>
          <Text color="red" bold>✖</Text>
          <Text color="red">{msg.content}</Text>
        </Box>
      );

    case 'info':
      return (
        <Box marginTop={0} paddingX={1}>
          <Text color="gray">{msg.content}</Text>
        </Box>
      );

    case 'donate-prompt':
      return (
        <Box marginTop={1} marginX={1} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} paddingY={0}>
          <Box gap={1}>
            <Text color="yellow" bold>⚡ Help improve Axion</Text>
          </Box>
          <Text color="gray">
            {'This session looks like great training data. Type '}
            <Text color="yellowBright" bold>/contribute</Text>
            {' to share it anonymously, or '}
            <Text color="gray" dimColor>/contribute skip</Text>
            {' to dismiss.'}
          </Text>
        </Box>
      );

    default:
      return null;
  }
}
