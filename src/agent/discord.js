import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';

let client = null;
let _onMessage = null;

export const DISCORD_STATE = { running: false, username: null };

// Per-user rate limit: ignore messages within 2s of the last one
const _lastMsg = new Map();
const RATE_MS = 2000;

function isRateLimited(userId) {
  const now = Date.now();
  const last = _lastMsg.get(userId) || 0;
  if (now - last < RATE_MS) return true;
  _lastMsg.set(userId, now);
  return false;
}

export async function startDiscord(token, onMessage) {
  if (client) await stopDiscord();

  _onMessage = onMessage;

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  await new Promise((resolve, reject) => {
    client.once(Events.ClientReady, (c) => {
      DISCORD_STATE.running = true;
      DISCORD_STATE.username = c.user.tag;
      resolve();
    });
    client.once(Events.Error, reject);
    client.login(token).catch(reject);
  });

  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;
    if (msg.guild) return;
    if (!_onMessage) return;
    if (isRateLimited(msg.author.id)) return;
    await _onMessage(msg);
  });
}

export async function stopDiscord() {
  if (!client) return;
  _onMessage = null;
  try { await client.destroy(); } catch {}
  client = null;
  DISCORD_STATE.running = false;
  DISCORD_STATE.username = null;
}

export async function sendTyping(channelOrMsg) {
  if (!client) return;
  try { await (channelOrMsg.channel ?? channelOrMsg).sendTyping(); } catch {}
}

export async function sendDM(channelOrMsg, text) {
  if (!client) throw new Error('Discord bot not running');
  const channel = channelOrMsg.channel ?? channelOrMsg;
  const LIMIT = 1900; // stay under 2000 with a margin
  if (text.length <= LIMIT) {
    await channel.send(text);
    return;
  }
  // Split on newlines where possible to avoid cutting mid-word or mid-codeblock
  const chunks = [];
  let remaining = text;
  while (remaining.length > LIMIT) {
    let cut = remaining.lastIndexOf('\n', LIMIT);
    if (cut < LIMIT / 2) cut = LIMIT; // no good newline, hard cut
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  for (const chunk of chunks) await channel.send(chunk);
}
