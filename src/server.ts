import net from 'node:net';
import { CONFIG } from './constants';
import { ClientData, ClientMessage, ServerMessage } from './types';

function getRemoteSocketId(socket: net.Socket) {
  return `${socket.remoteAddress}:${socket.remotePort}`;
}

const clients = new Map<net.Socket, ClientData>();

function handleJoin(
  socket: net.Socket,
  clientData: ClientData,
  username: string,
) {
  clients.set(socket, clientData);
  clientData.username = username;
  const socketId = getRemoteSocketId(socket);
  console.log(`  → ${username} joined the chat`);
  console.log(`✔ Socket ${socketId} connected (${clients.size} total)`);
  const joinMsg: ServerMessage = {
    type: 'user_joined',
    username,
  };
  broadcast(JSON.stringify(joinMsg), socket);
}

function handleChat(
  socket: net.Socket,
  clientData: ClientData,
  message: string,
) {
  if (!clientData.username) {
    console.error('Client tried to chat before joining');
    return;
  }

  console.log(`  💬 ${clientData.username}: ${message}`);

  const chatMsg: ServerMessage = {
    type: 'chat',
    username: clientData.username,
    message,
  };

  broadcast(JSON.stringify(chatMsg), socket);
}

function handleTyping(
  socket: net.Socket,
  clientData: ClientData,
  isTyping: boolean,
) {
  if (!clientData.username) return;

  const typingMsg: ServerMessage = {
    type: 'typing',
    username: clientData.username,
    isTyping,
  };

  broadcast(JSON.stringify(typingMsg), socket);
}

function handleDisconnect(socket: net.Socket, clientData: ClientData) {
  clients.delete(socket);
  if (clientData.username) {
    console.log(`  ← ${clientData.username} left the chat`);
    const leaveMsg: ServerMessage = {
      type: 'user_left',
      username: clientData.username,
    };
    broadcast(JSON.stringify(leaveMsg));
  } else {
    console.log(
      `  ✗ Socket disconnected before joining (${clients.size} remaining)`,
    );
  }
}

function broadcast(data: string, excludeSocket?: net.Socket) {
  clients.forEach((_, socket) => {
    if (socket !== excludeSocket && !socket.destroyed) {
      socket.write(data + '\n');
    }
  });
}

const server = net.createServer((socket) => {
  const socketId = getRemoteSocketId(socket);
  const clientData: ClientData = {
    username: null,
    buffer: '',
  };
  let newlineIndex;
  socket.on('data', (chunk) => {
    clientData.buffer += chunk.toString('utf-8');
    while ((newlineIndex = clientData.buffer.indexOf('\n')) !== -1) {
      const line = clientData.buffer.substring(0, newlineIndex);
      clientData.buffer = clientData.buffer.substring(newlineIndex + 1);
      if (!line.trim()) continue;
      const msg: ClientMessage = JSON.parse(line);
      if (msg.type === 'join') {
        handleJoin(socket, clientData, msg.username);
      } else if (msg.type === 'chat') {
        handleChat(socket, clientData, msg.message);
      } else if (msg.type === 'typing_start') {
        handleTyping(socket, clientData, true);
      } else if (msg.type === 'typing_stop') {
        handleTyping(socket, clientData, false);
      }
    }
  });

  socket.on('end', () => {
    handleDisconnect(socket, clientData);
    console.log(
      `✗ Client ${socketId} disconnected (${clients.size} remaining)`,
    );
  });

  socket.on('error', (err) => {
    console.error(`Socket ${socketId} error: ${err.message}`);
    handleDisconnect(socket, clientData);
  });
});

server.listen(CONFIG.port, CONFIG.hostname, () => {
  const addr = server.address() as net.AddressInfo;
  console.log(`TCP server listening on ${addr.address}:${addr.port}\n-----`);
});

server.on('error', (err) => {
  if ('code' in err && err.code === 'EADDRINUSE') {
    console.error(`Port ${CONFIG.port} already in use`);
  } else {
    console.error(`Server error: ${err.message}`);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  for (const [socket] of clients) {
    socket.end();
    setTimeout(() => socket.destroy(), 5000); // force after timeout
  }
  server.close();
});
