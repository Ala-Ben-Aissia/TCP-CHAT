import net from 'node:net';
import readline from 'node:readline';
import { COLORS, CONFIG } from './constants';
import { ServerMessage } from './types';
import {
  formatUsername,
  generateUsername,
  notifyClients,
  notifyServer,
  prepareForNewContent,
} from './utils';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let username = '';
let buffer = '';
let timer: NodeJS.Timeout | null = null;
let isTyping = false;
const typingUsers = new Set<string>();
let typingStatusLine = '';
let currentColumns = process.stdout.columns || 80;

/**
 * Redraws the typing indicator (if any) + prompt.
 * Handles window resize and potential line wrapping.
 */
function redrawUI() {
  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 0);

  if (typingStatusLine) {
    const cleanText = typingStatusLine.replace(/\x1b\[[0-9;]*m/g, '');
    const estimatedLines = Math.ceil(cleanText.length / currentColumns);

    for (let i = 0; i < estimatedLines; i++) {
      readline.moveCursor(process.stdout, 0, -1);
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
    }

    typingStatusLine = '';
  }

  if (typingUsers.size > 0) {
    let displayText: string;

    if (typingUsers.size === 1) {
      const [single] = typingUsers;
      displayText = `${formatUsername(single, false)} is typing...`;
    } else if (typingUsers.size === 2) {
      const [first, last] = typingUsers;
      displayText = `${formatUsername(first, false)} and ${formatUsername(last, false)} are typing...`;
    } else {
      displayText = `${typingUsers.size} people are typing...`;
    }

    typingStatusLine = `${COLORS.muted}${displayText}${COLORS.reset}`;
    process.stdout.write(typingStatusLine + '\n');
  }

  rl.prompt(true);
}

process.stdin.on('data', (data) => {
  const input = data.toString('utf-8').trim();
  if (input && !isTyping) {
    isTyping = true;
    notifyServer(socket, { type: 'typing_start' });
  }

  if (isTyping) {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      notifyServer(socket, { type: 'typing_stop' });
      isTyping = false;
    }, 2000);
  }
});

process.stdout.on('resize', () => {
  currentColumns = process.stdout.columns || 80;
  redrawUI();
});

rl.on('line', (input) => {
  const trimmed = input.trim();
  if (trimmed) {
    prepareForNewContent({ typingStatusLine, columns: currentColumns });
    typingStatusLine = '';
    notifyServer(socket, { type: 'chat', message: trimmed });
  }
  redrawUI();
});

const socket = net.createConnection(CONFIG.port, CONFIG.hostname, () => {
  console.log(`${COLORS.info}◆ Connecting...${COLORS.reset}`);
  username = generateUsername();

  notifyServer(socket, { type: 'join', username });

  console.log(
    `${COLORS.success}✓${COLORS.reset} Connected as ${formatUsername(username, true)}`,
  );

  rl.setPrompt(
    `${formatUsername(username, true)}${COLORS.subtle} ›${COLORS.reset} `,
  );
  rl.prompt();
});

socket.on('data', (data) => {
  buffer += data.toString('utf-8');

  let newlineIndex: number;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    const line = buffer.substring(0, newlineIndex);
    buffer = buffer.substring(newlineIndex + 1);

    if (!line.trim()) continue;

    try {
      const msg = JSON.parse(line) as ServerMessage;
      if (msg.type === 'chat') {
        typingUsers.delete(msg.username);
      }

      prepareForNewContent({ typingStatusLine, columns: currentColumns });
      typingStatusLine = '';

      notifyClients(msg, { typingUsers });

      // 5. Redraw indicator (now without this user) + prompt
      redrawUI();
    } catch {}
  }
});

socket.on('close', (hadError) => {
  console.log(
    `\n${COLORS.subtle}Connection closed ${hadError ? '(error)' : '(clean)'}${COLORS.reset}`,
  );
  rl.close();
  process.exit(0);
});

socket.on('error', (err) => {
  console.error(
    `${COLORS.error}✗ Connection error:${COLORS.reset} ${err.message}`,
  );
  rl.close();
  process.exit(1);
});

rl.on('SIGINT', () => {
  console.log(`\n${COLORS.subtle}👋 Disconnecting...${COLORS.reset}`);
  socket.end();
  setTimeout(() => process.exit(0), 300);
});
