import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';

let client = null;
let _onMessage = null;

export const DISCORD_STATE = { running: false, username: null };

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
    // Only respond to DMs, not bot messages
    if (msg.author.bot) return;
    if (msg.guild) return;
    if (!_onMessage) return;
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

export async function sendDM(channelOrMsg, text) {
  if (!client) throw new Error('Discord bot not running');
  const channel = channelOrMsg.channel ?? channelOrMsg;
  await channel.send(text);
}
