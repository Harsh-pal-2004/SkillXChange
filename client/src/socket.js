import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {
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
