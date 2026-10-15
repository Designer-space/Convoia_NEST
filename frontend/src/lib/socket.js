import { io } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { getAccessToken } from "./authStore";

let socket = null;
let chatSocket = null;

function authPayload() {
  const token = getAccessToken();
  return token ? { auth: { token } } : null;
}

export function getSocket() {
  const auth = authPayload();
  if (!auth) return null;

  if (!socket) {
    socket = io(SOCKET_URL, { ...auth, autoConnect: true });
  } else {
    socket.auth = auth.auth;
    if (socket.disconnected) socket.connect();
  }
  return socket;
}

/** Chat namespace: connect with the current access token. */
export function getChatSocket() {
  const auth = authPayload();
  if (!auth) return null;

  if (!chatSocket) {
    chatSocket = io(`${SOCKET_URL}/chat`, { ...auth, autoConnect: true });
  } else {
    chatSocket.auth = auth.auth;
    if (chatSocket.disconnected) chatSocket.connect();
  }
  return chatSocket;
}

/**
 * Push a fresh access token into any live sockets. Called after a silent
 * refresh so realtime keeps working with the new token.
 */
export function updateSocketAuth() {
  const auth = authPayload();
  if (!auth) return;

  for (const s of [socket, chatSocket]) {
    if (!s) continue;
    s.auth = auth.auth;
    if (s.disconnected) s.connect();
  }
}

export function disconnectSockets() {
  for (const s of [socket, chatSocket]) {
    if (s) s.disconnect();
  }
}
