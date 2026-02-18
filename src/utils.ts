import { faker } from '@faker-js/faker';
import { UniqueEnforcer } from 'enforce-unique';
import net from 'node:net';
import readline from 'node:readline';
import { COLORS, CONFIG, USER_EMOJIS } from './constants';
import { ClientMessage, ServerMessage } from './types';

const uniqueUsernameEnforcer = new UniqueEnforcer();

export function generateUsername() {
  return uniqueUsernameEnforcer.enforce(
    `${faker.person.firstName()}_${faker.person.lastName()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 20),
  );
}

export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getUserColor(name: string): string {
  const index = Math.abs(hashCode(name)) % COLORS.users.length;
  return COLORS.users[index];
}

function getUserEmoji(name: string): string {
  const index = Math.abs(hashCode(name)) % USER_EMOJIS.length;
  return USER_EMOJIS[index];
}

export function formatUsername(name: string, includeEmoji = true): string {
  const color = getUserColor(name);
  const emoji = includeEmoji ? ` ${getUserEmoji(name)}` : '';
  const displayText = `${name}${emoji}`;
  return `${color}${displayText}${COLORS.reset}`.padEnd(
    CONFIG.usernameColumnWidth,
    ' ',
  );
}

export function notifyServer(socket: net.Socket, msg: ClientMessage) {
  socket.write(JSON.stringify(msg) + '\n');
}

export function prepareForNewContent({
  typingStatusLine,
  columns,
}: {
  typingStatusLine: string;
  columns: number;
}) {
  // Always clear the prompt line first
  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 0);

  // If a typing indicator is rendered above the prompt, clear those lines too
  if (typingStatusLine) {
    const cleanText = typingStatusLine.replace(/\x1b\[[0-9;]*m/g, '');
    const estimatedLines = Math.ceil(cleanText.length / columns);

    for (let i = 0; i < estimatedLines; i++) {
      readline.moveCursor(process.stdout, 0, -1);
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
    }
  }
}

export function notifyClients(
  msg: ServerMessage,
  { typingUsers }: { typingUsers: Set<string> },
) {
  switch (msg.type) {
    case 'user_joined':
      console.log(
        `${COLORS.success}→${COLORS.reset} ${COLORS.dim}${formatUsername(msg.username)}${COLORS.reset}${COLORS.muted} has joined the chat${COLORS.reset}`,
      );
      break;

    case 'user_left':
      console.log(
        `${COLORS.subtle}←${COLORS.reset} ${COLORS.dim}${formatUsername(msg.username)}${COLORS.reset} ${COLORS.muted}has left the chat${COLORS.reset}`,
      );
      break;

    case 'chat':
      console.log(`${formatUsername(msg.username)} › ${msg.message}`);
      break;

    case 'typing':
      if (msg.isTyping) {
        typingUsers.add(msg.username);
      } else {
        typingUsers.delete(msg.username);
      }
      break;
  }
}
