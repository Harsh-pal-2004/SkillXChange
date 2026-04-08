import { io } from "socket.io-client";
import { API_BASE_URL } from "@/config/env";

const SOCKET_URL = API_BASE_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

export const connectSocket = (userId) => {
  const nextAuth = userId ? { userId } : {};
  const currentUserId = socket.auth?.userId;

  if (socket.connected && currentUserId !== nextAuth.userId) {
    socket.disconnect();
  }

  socket.auth = nextAuth;

  if (!socket.connected) {
    socket.connect();
  }
};

export const connectPublicSocket = () => {
  connectSocket(null);
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
