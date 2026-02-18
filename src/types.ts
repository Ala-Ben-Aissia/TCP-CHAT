type ClientMessage =
  | { type: 'join'; username: string }
  | { type: 'chat'; message: string }
  | { type: 'typing_start' }
  | { type: 'typing_stop' }
  | { type: 'request_stats' };

type ServerMessage =
  | { type: 'user_joined'; username: string }
  | { type: 'user_left'; username: string }
  | { type: 'chat'; username: string; message: string }
  | { type: 'typing'; username: string; isTyping: boolean };

type ClientData = {
  username: string | null;
  buffer: string;
};

export { ClientData, ClientMessage, ServerMessage };
