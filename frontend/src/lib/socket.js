import { io } from "socket.io-client";

const defaultBase = typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL
  : "https://convoia-nest.onrender.com";

let socket = null;
let chatSocket = null;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getSocket() {
  const token = getToken();
  if (!token) {
    console.warn("No token found for socket connection");
    return null;
  }

  if (!socket) {
    socket = io(defaultBase, {
      auth: { token }, // Recommended: send token in auth object
      autoConnect: true,
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      if (error.message?.includes("token") || error.message?.includes("Authentication")) {
        // Token expired or invalid - disconnect and clear
        localStorage.removeItem("token");
        socket.disconnect();
      }
    });
  } else if (socket.disconnected) {
    // Update token if reconnecting
    socket.auth = { token };
    socket.connect();
  }
  return socket;
}

/** Chat namespace: connect with JWT token */
export function getChatSocket() {
  const token = getToken();
  if (!token) {
    console.warn("No token found for chat socket connection");
    return null;
  }

  const base = defaultBase.replace(/\/$/, "");
  const url = `${base}/chat`;

  if (!chatSocket) {
    chatSocket = io(url, {
      auth: { token }, // Recommended: send token in auth object
      autoConnect: true,
    });

    chatSocket.on("error", (error) => {
      console.error("Chat socket error:", error);
      if (error.message?.includes("token") || error.message?.includes("Authentication")) {
        // Token expired or invalid - disconnect and clear
        localStorage.removeItem("token");
        chatSocket.disconnect();
      }
    });
  } else if (chatSocket.disconnected) {
    // Update token if reconnecting
    chatSocket.auth = { token };
    chatSocket.connect();
  }
  return chatSocket;
}
