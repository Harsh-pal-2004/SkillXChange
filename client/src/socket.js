import { io } from "socket.io-client";

// Use backend URL from .env
const URL = import.meta.env.VITE_API_URL;

// Create socket instance (do NOT auto connect)
export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
});

// Connect with user (for private chats)
export const connectSocket = (userId) => {
  const nextAuth = userId ? { userId } : {};
  const currentUserId = socket.auth?.userId;

  // If user changed, disconnect first
  if (socket.connected && currentUserId !== nextAuth.userId) {
    socket.disconnect();
  }

  socket.auth = nextAuth;

  if (!socket.connected) {
    socket.connect();
  }
};

// Public connection (no user)
export const connectPublicSocket = () => {
  connectSocket(null);
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
